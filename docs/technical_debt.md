# Technical Debt Log — nutrii

> **Phase 0 Deliverable**  
> Anti-patterns from the Nutri/FoodMolecule-DB legacy. Each item has a mitigation strategy for nutrii.

---

## Checklist

### Security

- [x] **HARDCODED SECRET_KEY** — Legacy committed Django `SECRET_KEY` in `settings.py`.
  - **Mitigation:** Use `python-decouple`. Read from `.env`. `.env` in `.gitignore`. `.env.example` documents all required keys.

- [x] **CORS `*` wildcard** — Legacy allowed requests from any origin.
  - **Mitigation:** `CORS_ALLOWED_ORIGINS` is environment-driven and defaults only to localhost development origins.

- [x] **Exposed Supabase service role key** — Must never appear in client-side code.
  - **Mitigation:** Service role key is only referenced by server-side image enrichment tooling. Web and mobile clients call the Django API.

- [x] **No HTTPS enforcement** — Legacy had no SSL redirect.
  - **Mitigation:** `SECURE_SSL_REDIRECT`, HSTS, secure cookies, `X_FRAME_OPTIONS`, and nosniff headers are enabled automatically when `DJANGO_DEBUG=False`. The proxy must still forward `X-Forwarded-Proto`.

### Database

- [x] **SQLite in production** — Not suitable for concurrent writes or production workloads.
  - **Mitigation:** Production uses `DATABASE_URL` or Supabase-derived PostgreSQL settings. SQLite remains only as an offline test fallback when no database env is configured.

- [x] **No connection pooling** — Legacy made a new DB connection per request.
  - **Mitigation:** Django database parsing sets `conn_max_age=60` and health checks. Supabase pooler URLs can be supplied through `DATABASE_URL`.

- [x] **No migration history** — Legacy had no Django migrations, making schema changes destructive.
  - **Mitigation:** Django migrations from the first model. Never use `syncdb`/`migrate --run-syncdb` in production.

- [x] **No indexes on search fields** — Legacy had no indexes on text columns used for filtering.
  - **Mitigation:** Baseline Django indexes exist on high-traffic food and molecule fields. GIN/trigram indexes remain a launch performance upgrade if `EXPLAIN ANALYZE` shows the need.

### API

- [x] **No rate limiting** — Any client could exhaust the DB with unconstrained requests.
  - **Mitigation:** DRF anonymous throttling is enabled automatically when `DJANGO_DEBUG=False`. Set `RATE_LIMIT_REQUESTS_PER_MINUTE` per deployment; the default is `100/minute`.

- [x] **No caching** — Every request hit the DB cold.
  - **Mitigation:** Django cache wiring is present with a local-memory backend for zero-service deployments. Upgrade to Redis or another shared cache before multi-instance production traffic.

- [x] **No API versioning** — Breaking changes would silently break consumers.
  - **Mitigation:** All endpoints prefixed `/api/v1/`. Breaking changes bump to `/api/v2/` with a deprecation notice.

- [x] **No pagination** — List endpoints returned unbounded result sets.
  - **Mitigation:** DRF page-number pagination is enabled for list endpoints. Default `page_size = 50`; client-requested `page_size` is capped at 100.

### Testing & Quality

- [x] **Zero test coverage** — Legacy had no tests at all.
  - **Mitigation:** `pytest-django` covers backend models, API views, ingestion scripts, AI guide generation, PubMed fetchers, safety adjustment, OCR scanning, and pipeline behavior. Coverage gating is still a launch hardening item.

- [ ] **No linting / formatting** — Inconsistent code style.
  - **Mitigation:** `ruff` for linting, `black` for formatting, `mypy` for type checking. Run in CI via GitHub Actions.

- [x] **No CI/CD** — No automated checks on PRs.
  - **Mitigation:** GitHub Actions runs backend and web test/build checks on pull requests and pushes. Production deploy automation remains environment-specific.

### Data Quality

- [x] **No schema validation on insert** — Data was inserted without validation.
  - **Mitigation:** `jsonschema` validation runs before `run_pipeline.py` and direct `bulk_insert.py` writes.

- [x] **No deduplication logic** — Duplicate foods/molecules could be inserted under different names.
  - **Mitigation:** `deduplicator.py` transformer normalizes names and merges duplicates before insert.

- [x] **No data provenance** — No record of where data came from.
  - **Mitigation:** `metadata` JSONB field on all tables stores `source`, `source_url`, `ingested_at`, `confidence`.

---

*Created: May 2026 | Phase: 0*
