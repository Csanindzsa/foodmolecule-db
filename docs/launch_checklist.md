# Launch Checklist — nutrii

## Domain
- Production domain purchased: `nutrii.fit`

## Pre-Launch (Before Public Release)

### Backend
- [ ] Run full `pytest-django` suite against live Supabase (needs Docker up or live DB)
- [ ] Verify all 16 API endpoints respond <200ms with `EXPLAIN ANALYZE`
- [x] Add GIN indexes on `Food.name`, `Molecule.name`, `Study.title` if not present (`backend/core/migrations/0003_postgres_trigram_search_indexes.py`)
- [ ] Configure Render/Fly.io `DATABASE_URL`; add `REDIS_URL` only if switching from local-memory cache to a shared cache
- [x] Set `DEBUG=False`, configure `ALLOWED_HOSTS` (`render.yaml`, `backend/core/tests/test_deploy_config.py`)
- [x] Verify production security settings with `python manage.py check --deploy`
- [x] Verify production throttling with `RATE_LIMIT_REQUESTS_PER_MINUTE` set for launch traffic (`backend/core/tests/test_production_settings.py`)
- [ ] Set up Logtail / Sentry for error tracking
- [ ] Verify OpenRouter API key has sufficient quota for launch traffic

### Frontend
- [ ] Install web dependencies with `cd web && bun install --frozen-lockfile`
- [ ] Build web (`cd web && bun run build`) and verify no Vite errors
- [ ] Point `nutrii.fit` DNS to the production frontend host
- [ ] Deploy to Vercel/Netlify with `VITE_API_URL` pointing to the production backend API
- [ ] Run Lighthouse audit: target >90 on Performance, Accessibility, SEO
- [ ] Test all routes: `/`, `/search`, `/foods/:id`, `/molecules/:id`, `/compare`, `/ban-list`

### Mobile
- [ ] Build Expo app (`cd mobile && npx expo prebuild`)
- [ ] Test on physical iOS and Android devices
- [ ] Verify camera permission flow and OCR accuracy on real labels
- [ ] Submit to App Store / Google Play (or use Expo Go for beta)

### Data & AI
- [ ] Seed database with top 100 most common food ingredients
- [ ] Verify PubMed watcher cron job is running every 6 hours
- [ ] Run one full safety adjustment cycle end-to-end
- [ ] Confirm ban list entries are surfaced correctly in UI

### Analytics (Phase 14)
- [ ] Verify privacy-preserving backend analytics logs are captured by production logging
- [x] Verify aggregate events are emitted for searches, food detail views, scans, and comparisons (`backend/core/tests/test_analytics.py`)
- [x] Confirm analytics metadata remains aggregate-only and contains no raw queries, labels, IP addresses, or user identifiers (`backend/core/tests/test_analytics.py`)

## Post-Launch
- [ ] Monitor OpenRouter costs daily for first 2 weeks
- [ ] Set up alerting for API error rates >1%
- [ ] Weekly review of PubMed auto-ingested studies
- [ ] Monthly audit of safety score drift (NHI consistency check)
