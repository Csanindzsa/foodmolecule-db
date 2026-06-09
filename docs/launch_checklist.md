# Launch Checklist — nutrii

## Domain
- Production domain purchased: `nutrii.fit`

## Pre-Launch (Before Public Release)

### Backend
- [ ] Run full `pytest-django` suite against live Supabase (needs Docker up or live DB)
- [ ] Verify all 16 API endpoints respond <200ms with `EXPLAIN ANALYZE`
- [ ] Add GIN indexes on `Food.name`, `Molecule.name`, `Study.title` if not present
- [ ] Configure Render/Fly.io `DATABASE_URL` and `REDIS_URL`
- [ ] Set `DEBUG=False`, configure `ALLOWED_HOSTS`
- [ ] Enable Django security middleware (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`)
- [ ] Set up Logtail / Sentry for error tracking
- [ ] Verify OpenRouter API key has sufficient quota for launch traffic

### Frontend
- [ ] Build web (`cd web && npm run build`) and verify no Vite errors
- [ ] Point `nutrii.fit` DNS to the production frontend host
- [ ] Deploy to Vercel/Netlify with `VITE_API_URL` pointing to the production backend API
- [ ] Run Lighthouse audit: target >90 on Performance, Accessibility, SEO
- [ ] Test all routes: `/`, `/search`, `/food/:id`, `/molecule/:id`, `/compare`, `/ban-list`

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
- [ ] Add lightweight analytics: Plausible or privacy-focused alternative
- [ ] Track: searches, food detail views, scans, comparisons
- [ ] No user-identifiable data — aggregate only

## Post-Launch
- [ ] Monitor OpenRouter costs daily for first 2 weeks
- [ ] Set up alerting for API error rates >1%
- [ ] Weekly review of PubMed auto-ingested studies
- [ ] Monthly audit of safety score drift (NHI consistency check)
