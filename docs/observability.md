# Observability Runbook

Status: production logging foundation. External Sentry, Logtail, or hosting log-drain setup still requires account credentials and should be completed during deployment.

## What the App Emits

The Django backend writes logs to stdout/stderr through `backend/nutrii/settings.py`:

- Root logger: `DJANGO_LOG_LEVEL`, default `INFO`.
- `django`: same `DJANGO_LOG_LEVEL`.
- `nutrii`: same `DJANGO_LOG_LEVEL`.
- `nutrii.analytics`: fixed at `INFO` so privacy-preserving aggregate events are emitted in production.

Analytics events are JSON payloads inside the log message and intentionally omit cookies, user IDs, raw queries, raw labels, IP addresses, and device fingerprints. The anonymized `bucket` is a daily hash used only for aggregate counting.

## Required Production Environment

Set these variables on the backend host:

```bash
DJANGO_DEBUG=False
DJANGO_LOG_LEVEL=INFO
```

`render.yaml` includes `DJANGO_LOG_LEVEL=INFO` so Render captures API logs by default. If the backend moves to Fly.io or another host, keep the same stdout/stderr logging behavior and attach the platform log drain to the chosen sink.

## External Sink Setup

Choose one external sink before public launch:

- Sentry for error grouping and alerting.
- Logtail or another log drain for raw application logs and aggregate analytics events.
- Hosting-provider logs only for a short beta, if retention and alerting are acceptable.

Do not add DSNs or log-drain tokens to the repository. Store them in the hosting provider secret manager.

## Verification

After deploy:

1. Run the deployed API smoke test:

   ```bash
   python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1
   ```

2. Trigger at least one search, food detail view, compare request, and scan request.
3. Confirm the production logs contain `nutrii.analytics` entries for `search`, `view`, `compare`, and `scan`.
4. Confirm no log entry contains raw search text, raw OCR label text, IP addresses, cookies, auth tokens, or user identifiers.
5. Configure an alert for backend error rate above 1% once the external sink is active.

Only mark the launch checklist analytics logging item complete after this verification is performed against the deployed backend.
