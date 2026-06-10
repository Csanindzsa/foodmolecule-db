# Query Plan Checks

Status: production/staging database runbook. This turns the launch checklist latency item into a repeatable Postgres `EXPLAIN ANALYZE` command.

## List Target Queries

This does not connect to Django or the database:

```bash
python scripts/check_query_plans.py --list
```

The target set covers the high-traffic read paths behind the public API:

- `GET /api/v1/foods/`
- `GET /api/v1/foods/search/?q=apple`
- `GET /api/v1/molecules/`
- `GET /api/v1/molecules/search/?q=water`
- `GET /api/v1/studies/recent/`
- `GET /api/v1/ban-list/`
- `POST /api/v1/scan/` food matching
- `POST /api/v1/scan/` molecule matching

Detail routes, compare routes, and guide routes still need runtime IDs and should be covered by the deployed API smoke test in `docs/api_smoke_test.md`.

## Run Against Production-Like Postgres

Run after migrations and seed data are loaded into staging or production:

```bash
DJANGO_DEBUG=False \
DJANGO_SECRET_KEY=launch-check-only \
DJANGO_ALLOWED_HOSTS=api.nutrii.fit \
DATABASE_URL=postgresql://... \
python scripts/check_query_plans.py --threshold-ms 200
```

The command fails if the active Django database is not PostgreSQL. SQLite plans are not launch evidence because production uses Postgres-specific indexes and query behavior.

## Interpreting Results

- `ok` means the query completed at or under the threshold.
- `FAIL` means the query exceeded the threshold and needs index, query, pagination, or caching work before launch.
- The threshold defaults to 200ms and can be adjusted with `--threshold-ms`.

Capture the command output with the database seed timestamp and deploy version. If any query fails, rerun after adding indexes or changing the query shape, then attach both before/after outputs to the launch notes.
