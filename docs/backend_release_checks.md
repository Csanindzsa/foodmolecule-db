# Backend Release Checks

Status: static Django/Render release preflight. This validates deploy wiring without connecting to production services or reading credentials.

## Command

Run from the repository root:

```bash
python scripts/check_backend_release.py
```

CI and the local release audit run this command before backend tests.

## What It Verifies

- Render uses the same Python major/minor runtime as CI.
- Render installs `backend/requirements.txt`, starts Gunicorn, and exposes `/api/v1/health/`.
- Production host, CORS, logging, database, AI key, and Django secret settings are represented in `render.yaml`.
- Backend requirements include Django, Gunicorn, PostgreSQL, and database URL support.
- Django settings keep security middleware, `STATIC_ROOT`, and persistent PostgreSQL health checks.
- Scan API responses sanitize OCR ingredients, malformed raw-text previews, and confidence before returning mobile-facing data.
- Food and molecule search/list endpoints bound `q`, category, and dietary preference filter lengths before database filters.

## Live Launch Follow-Up

This check does not prove the hosted service can reach Supabase or that provider secrets are valid. After deploy, set `DATABASE_URL` or the Supabase password pair, run migrations against production, and execute `python scripts/smoke_api.py --require-full` against the deployed API.
