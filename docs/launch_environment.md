# Launch Environment Check

Status: local preflight. This verifies required production environment variables are present and shaped correctly without printing secrets. It does not verify live credentials, OpenRouter quota, DNS, app-store accounts, or database connectivity.

## Command

Run before deploying the backend, web app, or Expo build:

```bash
python scripts/check_launch_env.py --env-file .env.production
```

To check only one surface:

```bash
python scripts/check_launch_env.py --component backend --env-file .env.production
python scripts/check_launch_env.py --component ai --env-file .env.production
python scripts/check_launch_env.py --component web --env-file .env.production
python scripts/check_launch_env.py --component mobile --env-file .env.production
```

Process environment variables override values loaded from `--env-file`, matching common deploy-provider behavior.

## Checks

Backend:

- `DJANGO_SECRET_KEY` is non-placeholder and at least 32 characters.
- `DJANGO_DEBUG=False`.
- `DJANGO_ALLOWED_HOSTS` includes `api.nutrii.fit`.
- `DATABASE_URL` is set, or `SUPABASE_URL` and `SUPABASE_DB_PASSWORD` are both set.
- `CORS_ALLOWED_ORIGINS` includes `https://nutrii.fit` and `https://www.nutrii.fit`.
- `RATE_LIMIT_REQUESTS_PER_MINUTE` is a positive integer.
- `DJANGO_LOG_LEVEL` is a valid Python log level.

AI:

- At least one `OPENROUTER_API_KEY` or `OPENROUTER_API_KEYS` value is configured.
- `OPENROUTER_BASE_URL` is an HTTPS URL.

Web and mobile:

- `VITE_API_URL` or `VITE_API_BASE_URL` points to an HTTPS `/api/v1` endpoint.
- `EXPO_PUBLIC_API_URL` points to an HTTPS `/api/v1` endpoint.

## Follow-Up Verification

After this preflight passes, still complete the live launch checks:

- Run migrations and backend pytest against the production database target.
- Run `python scripts/smoke_api.py --require-full` against the deployed API.
- Confirm OpenRouter quota in the provider dashboard.
- Confirm production logs in the selected external sink.
- Run web Lighthouse and mobile device OCR checks.
