"""
Validate one or more JSON files against nutrii JSON Schemas.

Usage:
    python scripts/validate_schema.py food data/seed/foods/example.json
    python scripts/validate_schema.py food data/seed/foods
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = PROJECT_ROOT / "schema"
SCHEMA_FILES = {
    "ai_guide": "ai_guide.schema.json",
    "ban_list": "ban_list.schema.json",
    "food": "food.schema.json",
    "molecule": "molecule.schema.json",
    "study": "study.schema.json",
}


def _load_schema(entity: str) -> dict:
    schema_path = SCHEMA_DIR / SCHEMA_FILES[entity]
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def expand_json_paths(paths: list[Path]) -> list[Path]:
    expanded: list[Path] = []
    for path in paths:
        if path.is_dir():
            expanded.extend(sorted(path.rglob("*.json")))
        else:
            expanded.append(path)
    return expanded


def validate_files(entity: str, paths: list[Path]) -> dict[Path, list[str]]:
    schema = _load_schema(entity)
    validator = Draft7Validator(schema)
    failures: dict[Path, list[str]] = {}

    for path in paths:
        try:
            data = _load_json(path)
        except json.JSONDecodeError as exc:
            failures[path] = [f"Invalid JSON: {exc.msg} at line {exc.lineno}, column {exc.colno}"]
            continue
        except OSError as exc:
            failures[path] = [str(exc)]
            continue

        errors = sorted(validator.iter_errors(data), key=lambda error: list(error.path))
        if errors:
            failures[path] = [
                f"{'.'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
                for error in errors
            ]

    return failures


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate nutrii JSON files against repository schemas")
    parser.add_argument("entity", choices=sorted(SCHEMA_FILES), help="Schema entity to validate against")
    parser.add_argument("paths", nargs="+", type=Path, help="JSON file(s) or directories to validate")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    paths = expand_json_paths(args.paths)
    if not paths:
        print("No JSON files matched.", file=sys.stderr)
        return 1

    failures = validate_files(args.entity, paths)

    if failures:
        print(f"Validation failed for {len(failures)} file(s):", file=sys.stderr)
        for path, errors in failures.items():
            print(f"- {path}", file=sys.stderr)
            for error in errors[:10]:
                print(f"  - {error}", file=sys.stderr)
            if len(errors) > 10:
                print(f"  - ... and {len(errors) - 10} more", file=sys.stderr)
        return 1

    print(f"Validation passed for {len(paths)} {args.entity} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
