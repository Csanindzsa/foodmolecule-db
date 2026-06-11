# Launch Checklist — nutrii

## Domain
- Production domain purchased: `nutrii.fit`

## Launch Handoff
- [ ] Start with the ordered production launch path in [docs/HANDOFF_NEXT_STEPS.md](HANDOFF_NEXT_STEPS.md) before assigning live deployment, provider, DNS, mobile store, and monitoring work.

## Pre-Launch (Before Public Release)

### Backend
- [ ] Run local no-credential release audit with `python scripts/check_local_release.py` (`docs/local_release_audit.md`)
- [ ] Run launch environment preflight with `python scripts/check_launch_env.py --env-file .env.production` (`docs/launch_environment.md`)
- [ ] Run full `pytest-django` suite against live Supabase (needs Docker up or live DB)
- [ ] Verify all 17 API endpoints respond from the deployed API with `python scripts/smoke_api.py --require-full` (`docs/api_smoke_test.md`); separately confirm high-traffic queries are <200ms with `python scripts/check_query_plans.py --threshold-ms 200` (`docs/query_plan_checks.md`)
- [x] Add GIN indexes on `Food.name`, `Molecule.name`, `Study.title` if not present (`backend/core/migrations/0003_postgres_trigram_search_indexes.py`)
- [ ] Verify static backend release contract with `python scripts/check_backend_release.py` (`docs/backend_release_checks.md`), then configure Render/Fly.io `DATABASE_URL`; add `REDIS_URL` only if switching from local-memory cache to a shared cache
- [x] Set `DEBUG=False`, configure `ALLOWED_HOSTS` (`render.yaml`, `backend/core/tests/test_deploy_config.py`)
- [x] Verify production security settings with `python manage.py check --deploy`
- [x] Verify production throttling with `RATE_LIMIT_REQUESTS_PER_MINUTE` set for launch traffic (`backend/core/tests/test_production_settings.py`)
- [ ] Verify static observability contract with `python scripts/check_observability.py` (`docs/observability.md`), then set up Logtail / Sentry for error tracking
- [ ] Verify OpenRouter API key is configured by launch preflight, then confirm sufficient quota for launch traffic in the provider dashboard

### Frontend
- [ ] Install web dependencies with `cd web && bun install --frozen-lockfile`
- [ ] Build web (`cd web && bun run build`) and verify no Vite errors
- [ ] Point `nutrii.fit` DNS to the production frontend host
- [ ] Verify static web release contract with `python scripts/check_web_release.py` (`docs/web_release_checks.md`), then deploy to Vercel/Netlify with `VITE_API_URL=https://api.nutrii.fit/api/v1`
- [ ] Run Lighthouse audit: target >90 on Performance, Accessibility, SEO
- [ ] Verify static route contract with `python scripts/check_web_routes.py` (`docs/web_route_checks.md`), then test deployed routes: `/`, `/search`, `/foods/:id`, `/molecules/:id`, `/compare`, `/research`, `/ban-list`

### Mobile
- [ ] Verify static Expo release contract with `python scripts/check_mobile_release.py` (`docs/mobile_release_checks.md`); rerun with `--require-store-ids` after bundle/package IDs are chosen
- [ ] Install mobile dependencies with `cd mobile && bun install --frozen-lockfile`, then run `bun run typecheck`
- [ ] Build Expo app (`cd mobile && npx expo prebuild`)
- [ ] Test on physical iOS and Android devices
- [ ] Verify camera permission flow and OCR accuracy on real labels
- [ ] Submit to App Store / Google Play (or use Expo Go for beta)

### Data & AI
- [ ] Verify launch seed files with `python scripts/check_seed_readiness.py --min-foods 100 --min-molecules 4` (`docs/seed_readiness.md`), then seed the target database
- [ ] Verify static PubMed/AI research operations contract with `python scripts/check_research_ops.py` (`docs/research_ops_checks.md`), research surface contract with `python scripts/check_research_surface.py` (`docs/research_surface_checks.md`), and AI prompt/parser contract with `python scripts/check_ai_contract.py` (`docs/ai_contract_checks.md`), then verify the PubMed watcher cron job is running every 6 hours in production
- [ ] Run one full safety adjustment cycle end-to-end after provider keys and production data are available
- [ ] Verify image enrichment operations contract with `python scripts/check_image_ops.py` (`docs/image_ops_checks.md`) and image surface contract with `python scripts/check_image_surface.py` (`docs/image_surface_checks.md`), then run molecule and food image enrichment with production Brave/Supabase credentials
- [ ] Verify ban-list draft citation gate with `python scripts/check_ban_list_surface.py` (`docs/ban_list_surface_checks.md`), then confirm any verified production entries are surfaced correctly in the deployed UI

### Analytics (Phase 14)
- [ ] Verify privacy-preserving backend analytics logs are captured by production logging after `python scripts/check_observability.py` passes (`docs/observability.md`)
- [x] Verify aggregate events are emitted for searches, food detail views, scans, and comparisons (`backend/core/tests/test_analytics.py`)
- [x] Confirm analytics metadata remains aggregate-only and contains no raw queries, labels, IP addresses, or user identifiers (`backend/core/tests/test_analytics.py`)

## Post-Launch
- [ ] Monitor OpenRouter costs daily for first 2 weeks
- [ ] Set up alerting for API error rates >1%
- [ ] Weekly review of PubMed auto-ingested studies
- [ ] Monthly audit of safety score drift (NHI consistency check)
