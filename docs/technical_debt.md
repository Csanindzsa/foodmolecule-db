# Technical Debt Log — nutrii

> **Phase 0 Deliverable**  
> Anti-patterns from the Nutri/FoodMolecule-DB legacy. Each item has a mitigation strategy for nutrii.

---

## Checklist

### Security

- [ ] **HARDCODED SECRET_KEY** — Legacy committed Django `SECRET_KEY` in `settings.py`.
  - **Mitigation:** Use `python-decouple`. Read from `.env`. `.env` in `.gitignore`. `.env.example` documents all required keys.

- [ ] **CORS `*` wildcard** — Legacy allowed requests from any origin.
  - **Mitigation:** `CORS_ALLOWED_ORIGINS` must list only known domains (`nutrii.app`, Vercel preview URLs, localhost for dev).

- [ ] **Exposed Supabase service role key** — Must never appear in client-side code.
  - **Mitigation:** Service role key used only in Django backend (server-side). Frontend uses `anon` read-only key or makes requests through the Django API.

- [ ] **No HTTPS enforcement** — Legacy had no SSL redirect.
  - **Mitigation:** `SECURE_SSL_REDIRECT = True` in production settings. Enforced at Nginx/Vercel level.

### Database

- [ ] **SQLite in production** — Not suitable for concurrent writes or production workloads.
  - **Mitigation:** Supabase PostgreSQL from day one. Local dev uses Docker PostgreSQL (same version).

- [ ] **No connection pooling** — Legacy made a new DB connection per request.
  - **Mitigation:** PgBouncer (Supabase built-in) + `CONN_MAX_AGE = 60` in Django settings.

- [ ] **No migration history** — Legacy had no Django migrations, making schema changes destructive.
  - **Mitigation:** Django migrations from the first model. Never use `syncdb`/`migrate --run-syncdb` in production.

- [ ] **No indexes on search fields** — Legacy had no indexes on text columns used for filtering.
  - **Mitigation:** GIN indexes on `aliases`, `harm_mechanisms`. Trigram indexes (`pg_trgm`) on `name`. Defined in Django migrations.

### API

- [ ] **No rate limiting** — Any client could exhaust the DB with unconstrained requests.
  - **Mitigation:** Django Ratelimit (100 req/min per IP). Redis as the counter store. Configured from Phase 1.

- [ ] **No caching** — Every request hit the DB cold.
  - **Mitigation:** Redis caching for food detail (1 hr TTL), health index (24 hr TTL), search autocomplete (6 hr TTL).

- [ ] **No API versioning** — Breaking changes would silently break consumers.
  - **Mitigation:** All endpoints prefixed `/api/v1/`. Breaking changes bump to `/api/v2/` with a deprecation notice.

- [ ] **No pagination** — List endpoints returned unbounded result sets.
  - **Mitigation:** Cursor pagination on all list endpoints. Max `page_size = 100`.

### Testing & Quality

- [ ] **Zero test coverage** — Legacy had no tests at all.
  - **Mitigation:** `pytest-django` for all models, serializers, and views. Minimum 80% coverage enforced in CI.

- [ ] **No linting / formatting** — Inconsistent code style.
  - **Mitigation:** `ruff` for linting, `black` for formatting, `mypy` for type checking. Run in CI via GitHub Actions.

- [ ] **No CI/CD** — No automated checks on PRs.
  - **Mitigation:** GitHub Actions workflows for test, lint, and deploy (see `.github/workflows/`).

### Data Quality

- [ ] **No schema validation on insert** — Data was inserted without validation.
  - **Mitigation:** `jsonschema` validation gate in all `loaders/` scripts before any DB insert.

- [ ] **No deduplication logic** — Duplicate foods/molecules could be inserted under different names.
  - **Mitigation:** `deduplicator.py` transformer normalizes names and merges duplicates before insert.

- [ ] **No data provenance** — No record of where data came from.
  - **Mitigation:** `metadata` JSONB field on all tables stores `source`, `source_url`, `ingested_at`, `confidence`.

---

*Created: May 2026 | Phase: 0*
