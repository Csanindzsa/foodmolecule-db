# Launch Checklist — nutrii

## Domain
- Production domain purchased: `nutrii.fit`

## Pre-Launch (Before Public Release)

### Backend
- [ ] Run launch environment preflight with `python scripts/check_launch_env.py --env-file .env.production` (`docs/launch_environment.md`)
- [ ] Run full `pytest-django` suite against live Supabase (needs Docker up or live DB)
- [ ] Verify all 17 API endpoints respond from the deployed API with `python scripts/smoke_api.py --require-full` (`docs/api_smoke_test.md`); separately confirm high-traffic queries are <200ms with `python scripts/check_query_plans.py --threshold-ms 200` (`docs/query_plan_checks.md`)
- [x] Add GIN indexes on `Food.name`, `Molecule.name`, `Study.title` if not present (`backend/core/migrations/0003_postgres_trigram_search_indexes.py`)
- [ ] Configure Render/Fly.io `DATABASE_URL`; add `REDIS_URL` only if switching from local-memory cache to a shared cache
- [x] Set `DEBUG=False`, configure `ALLOWED_HOSTS` (`render.yaml`, `backend/core/tests/test_deploy_config.py`)
- [x] Verify production security settings with `python manage.py check --deploy`
- [x] Verify production throttling with `RATE_LIMIT_REQUESTS_PER_MINUTE` set for launch traffic (`backend/core/tests/test_production_settings.py`)
- [ ] Set up Logtail / Sentry for error tracking; stdout logging and verification steps are documented in `docs/observability.md`
- [ ] Verify OpenRouter API key is configured by launch preflight, then confirm sufficient quota for launch traffic in the provider dashboard

### Frontend
- [ ] Install web dependencies with `cd web && bun install --frozen-lockfile`
- [ ] Build web (`cd web && bun run build`) and verify no Vite errors
- [ ] Point `nutrii.fit` DNS to the production frontend host
- [ ] Deploy to Vercel/Netlify with `VITE_API_URL` pointing to the production backend API; SPA fallback config is present in `web/vercel.json` and `web/public/_redirects`
- [ ] Run Lighthouse audit: target >90 on Performance, Accessibility, SEO
- [ ] Test all routes: `/`, `/search`, `/foods/:id`, `/molecules/:id`, `/compare`, `/ban-list`

### Mobile
- [ ] Build Expo app (`cd mobile && npx expo prebuild`)
- [ ] Test on physical iOS and Android devices
- [ ] Verify camera permission flow and OCR accuracy on real labels
- [ ] Submit to App Store / Google Play (or use Expo Go for beta)

### Data & AI
- [ ] Verify launch seed files with `python scripts/check_seed_readiness.py --min-foods 100 --min-molecules 4` (`docs/seed_readiness.md`), then seed the target database
- [ ] Verify PubMed watcher cron job is running every 6 hours
- [ ] Run one full safety adjustment cycle end-to-end
- [ ] Confirm verified ban list entries are surfaced correctly in UI

### Analytics (Phase 14)
- [ ] Verify privacy-preserving backend analytics logs are captured by production logging (`docs/observability.md`)
- [x] Verify aggregate events are emitted for searches, food detail views, scans, and comparisons (`backend/core/tests/test_analytics.py`)
- [x] Confirm analytics metadata remains aggregate-only and contains no raw queries, labels, IP addresses, or user identifiers (`backend/core/tests/test_analytics.py`)

## Post-Launch
- [ ] Monitor OpenRouter costs daily for first 2 weeks
- [ ] Set up alerting for API error rates >1%
- [ ] Weekly review of PubMed auto-ingested studies
- [ ] Monthly audit of safety score drift (NHI consistency check)
