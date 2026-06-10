"""Run Postgres EXPLAIN ANALYZE checks for launch-critical API queries."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
DEFAULT_THRESHOLD_MS = 200.0


@dataclass(frozen=True)
class QueryTarget:
    name: str
    endpoint: str
    sql: str
    params: tuple[str, ...] = ()


@dataclass(frozen=True)
class QueryResult:
    target: QueryTarget
    execution_time_ms: float
    threshold_ms: float

    @property
    def ok(self) -> bool:
        return self.execution_time_ms <= self.threshold_ms


TARGET_QUERIES = (
    QueryTarget(
        name="food-list",
        endpoint="GET /api/v1/foods/",
        sql="""
            SELECT f.id
            FROM core_food f
            LEFT JOIN core_foodmolecule fm ON fm.food_id = f.id
            LEFT JOIN core_molecule m ON m.id = fm.molecule_id
            GROUP BY f.id
            ORDER BY f.health_index DESC NULLS LAST, f.name ASC
            LIMIT 50
        """,
    ),
    QueryTarget(
        name="food-search",
        endpoint="GET /api/v1/foods/search/?q=apple",
        sql="""
            SELECT f.id
            FROM core_food f
            WHERE f.name ILIKE %s
               OR EXISTS (
                    SELECT 1
                    FROM unnest(f.aliases) alias
                    WHERE alias ILIKE %s
               )
            ORDER BY f.name ASC
            LIMIT 50
        """,
        params=("%apple%", "%apple%"),
    ),
    QueryTarget(
        name="molecule-list",
        endpoint="GET /api/v1/molecules/",
        sql="""
            SELECT m.id
            FROM core_molecule m
            LEFT JOIN core_foodmolecule fm ON fm.molecule_id = m.id
            GROUP BY m.id
            ORDER BY m.name ASC
            LIMIT 50
        """,
    ),
    QueryTarget(
        name="molecule-search",
        endpoint="GET /api/v1/molecules/search/?q=water",
        sql="""
            SELECT m.id
            FROM core_molecule m
            WHERE m.name ILIKE %s
               OR m.iupac_name ILIKE %s
               OR m.cas_number = %s
            ORDER BY m.name ASC
            LIMIT 20
        """,
        params=("%water%", "%water%", "water"),
    ),
    QueryTarget(
        name="recent-studies",
        endpoint="GET /api/v1/studies/recent/",
        sql="""
            SELECT s.id
            FROM core_study s
            WHERE s.ai_summary IS NOT NULL
              AND s.ai_summary <> ''
            ORDER BY s.analyzed_at DESC NULLS LAST, s.publication_year DESC, s.title ASC
            LIMIT 50
        """,
    ),
    QueryTarget(
        name="ban-list",
        endpoint="GET /api/v1/ban-list/",
        sql="""
            SELECT b.id
            FROM core_banlistentry b
            LEFT JOIN core_food f ON f.id = b.food_id
            ORDER BY f.name ASC, b.id ASC
            LIMIT 50
        """,
    ),
    QueryTarget(
        name="scan-food-match",
        endpoint="POST /api/v1/scan/",
        sql="""
            SELECT f.id
            FROM core_food f
            WHERE f.name ILIKE %s
               OR EXISTS (
                    SELECT 1
                    FROM unnest(f.aliases) alias
                    WHERE alias ILIKE %s
               )
            LIMIT 20
        """,
        params=("%apple%", "%apple%"),
    ),
    QueryTarget(
        name="scan-molecule-match",
        endpoint="POST /api/v1/scan/",
        sql="""
            SELECT m.id
            FROM core_molecule m
            WHERE m.name ILIKE %s
               OR m.iupac_name ILIKE %s
               OR m.cas_number = %s
            LIMIT 20
        """,
        params=("%water%", "%water%", "water"),
    ),
)


def normalize_sql(sql: str) -> str:
    return " ".join(line.strip() for line in sql.strip().splitlines())


def parse_execution_time_ms(explain_result) -> float:
    if isinstance(explain_result, str):
        explain_result = json.loads(explain_result)
    if isinstance(explain_result, tuple):
        explain_result = explain_result[0]
    if not isinstance(explain_result, list) or not explain_result:
        raise ValueError("EXPLAIN JSON result must be a non-empty list.")
    root = explain_result[0]
    try:
        return float(root["Execution Time"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("EXPLAIN JSON result missing numeric Execution Time.") from exc


def run_target(connection, target: QueryTarget, threshold_ms: float) -> QueryResult:
    explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {normalize_sql(target.sql)}"
    with connection.cursor() as cursor:
        cursor.execute(explain_sql, target.params)
        row = cursor.fetchone()
    execution_time_ms = parse_execution_time_ms(row)
    return QueryResult(target=target, execution_time_ms=execution_time_ms, threshold_ms=threshold_ms)


def run_targets(connection, targets: Iterable[QueryTarget], threshold_ms: float) -> tuple[QueryResult, ...]:
    return tuple(run_target(connection, target, threshold_ms) for target in targets)


def _setup_django():
    sys.path.insert(0, str(PROJECT_ROOT))
    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")
    import django
    from django.db import connection

    django.setup()
    return connection


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run launch query-plan checks against production-like Postgres.")
    parser.add_argument("--threshold-ms", type=float, default=DEFAULT_THRESHOLD_MS, help="Maximum execution time per query.")
    parser.add_argument("--list", action="store_true", help="List query targets without connecting to Django or the DB.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.threshold_ms <= 0:
        print("error: --threshold-ms must be positive", file=sys.stderr)
        return 2

    if args.list:
        for target in TARGET_QUERIES:
            print(f"{target.name}\t{target.endpoint}\t{normalize_sql(target.sql)}")
        return 0

    connection = _setup_django()
    if connection.vendor != "postgresql":
        print("error: query-plan checks must run against PostgreSQL production or staging data", file=sys.stderr)
        return 2

    results = run_targets(connection, TARGET_QUERIES, args.threshold_ms)
    for result in results:
        prefix = "ok" if result.ok else "FAIL"
        print(
            f"{prefix}\t{result.target.name}\t{result.execution_time_ms:.2f}ms"
            f"\tthreshold={result.threshold_ms:.2f}ms\t{result.target.endpoint}"
        )
    return 0 if all(result.ok for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
