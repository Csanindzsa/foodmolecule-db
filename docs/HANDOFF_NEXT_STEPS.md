# Handoff Next Steps: 95% Local Handoff to Production Launch

Status: practical human launch guide. The repository has passed the local
no-credential release gates, but production launch has not been performed. Do
not mark production launch complete until the live checks in this guide pass
against real deployed services and production data.

## 0. Current Position

The local handoff means the codebase is ready for credentialed launch work:

- Django/DRF backend release wiring is present.
- React/Vite web release wiring is present.
- Expo mobile scan/search/detail/compare/research/ban-list flows are wired.
- OCR scan path posts camera/gallery images to backend `/api/v1/scan/`.
- Food and molecule image surfaces and enrichment tooling are wired.
- PubMed, AI study analysis, safety adjustment, AI guide, and research surface
  contracts are wired.
- CI/static gates cover backend, web, mobile, images, research, AI,
  observability, ban-list, route, and secret hygiene drift.

What has not been done locally:

- No live production deployment has been verified.
- No real DNS cutover has been verified.
- No production Supabase migration/seed has been verified.
- No OpenRouter quota or live AI batch has been verified.
- No Brave/Supabase image enrichment has been run with production credentials.
- No physical-device camera/OCR validation or app-store submission has been
  completed.
- No legal/regulatory production claim approval has been completed.

## 1. Launch Order

Follow this order. Do not skip ahead when a phase fails.

1. Freeze the release candidate and run local gates.
2. Gather accounts, credentials, and decision inputs.
3. Prepare Supabase production/staging data.
4. Deploy the Django backend.
5. Point API DNS and run live backend smoke/query checks.
6. Deploy the React web app and run route/Lighthouse checks.
7. Run image enrichment and verify image rendering.
8. Run PubMed/AI production jobs and verify research/safety outputs.
9. Validate Expo/mobile on physical devices.
10. Set up monitoring/log drains and incident rollback paths.
11. Complete citation/regulatory review and final public launch checklist.

## 2. Phase 1: Freeze And Re-run Local Gates

From the repository root:

```bash
git status --short
git log --oneline -10
python scripts/check_local_release.py
```

Expected:

- `git status --short` is empty.
- `python scripts/check_local_release.py` ends with `Local release audit passed.`
- Any `skip` lines are only for live/account-bound checks.

Then run web and mobile install/build checks using locked dependencies:

```bash
cd web
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
cd ..

cd mobile
bun install --frozen-lockfile
bun run test
bun run typecheck
cd ..
```

If Bun is not on `PATH`, use the installed absolute path:

```bash
/Users/hatsunemiku/.bun/bin/bun --version
```

Security gate:

```bash
python scripts/check_secret_hygiene.py
git ls-files .env .env.example backend/.env web/.env mobile/.env
```

Expected:

- Secret hygiene prints `ok`.
- Only `.env.example` is tracked.
- Local `.env` or `.env.production` files are never committed.

## 3. Phase 2: Gather Accounts, Credentials, And Decisions

Create a private launch notes document outside the repo. Store secrets only in
provider secret managers or a password manager.

Required accounts:

- Supabase project with PostgreSQL and Storage.
- Backend host, currently Render-compatible via `render.yaml`.
- Web host, Vercel or Netlify compatible.
- DNS provider for `nutrii.fit` and `api.nutrii.fit`.
- OpenRouter account for AI study analysis/safety adjustments.
- Brave Search API account for image enrichment.
- External log/error sink: Sentry, Logtail, or equivalent.
- Apple Developer account and Google Play Console account for app-store launch.

Required production variables:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=api.nutrii.fit,...`
- `CORS_ALLOWED_ORIGINS=https://nutrii.fit,https://www.nutrii.fit`
- `RATE_LIMIT_REQUESTS_PER_MINUTE`
- `DJANGO_LOG_LEVEL=INFO`
- `DATABASE_URL` or `SUPABASE_URL` plus `SUPABASE_DB_PASSWORD`
- `OPENROUTER_API_KEY` or `OPENROUTER_API_KEYS`
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `VITE_API_URL=https://api.nutrii.fit/api/v1`
- `EXPO_PUBLIC_API_URL=https://api.nutrii.fit/api/v1`
- `BRAVE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_IMAGE_BUCKET=food-images`
- `USDA_API_KEY`, if running USDA ingestion
- `NCBI_API_KEY`, if running PubMed at higher quota

Optional/future:

- `REDIS_URL` only if moving from local-memory cache to shared cache for
  multi-instance traffic.
- Sentry DSN or log-drain token, stored only in host secrets.

Do not put any real value in tracked docs, `.env.example`, issue templates, or
commit messages.

## 4. Phase 3: Validate Production Environment Shape

Create a local, ignored `.env.production` or use the deploy provider's preview
environment. Then run:

```bash
python scripts/check_launch_env.py --env-file .env.production
```

Optional component checks:

```bash
python scripts/check_launch_env.py --component backend --env-file .env.production
python scripts/check_launch_env.py --component ai --env-file .env.production
python scripts/check_launch_env.py --component web --env-file .env.production
python scripts/check_launch_env.py --component mobile --env-file .env.production
```

This checks shape only. It does not prove live credentials, quota, DNS, app-store
accounts, or database connectivity.

## 5. Phase 4: Supabase Production Setup

Set up Supabase before deploying the backend.

1. Create or choose the production Supabase project.
2. Confirm PostgreSQL connection details.
3. Create/confirm the `food-images` storage bucket.
4. Confirm service-role key is available only to backend/image tooling.
5. Load environment variables into the backend host secret manager.
6. Run migrations against the production database.
7. Seed production data from the reviewed launch seed files.

Local seed check before production seed:

```bash
python scripts/check_seed_readiness.py --min-foods 100 --min-molecules 4
```

Production migration guidance:

```bash
cd backend
DJANGO_DEBUG=False \
DJANGO_SECRET_KEY=launch-check-only-replace-in-host \
DJANGO_ALLOWED_HOSTS=api.nutrii.fit \
DATABASE_URL=postgresql://... \
python manage.py migrate
```

After seeding, record:

- Seed command used.
- Seed timestamp.
- Food count.
- Molecule count.
- Study count.
- Commit SHA deployed.

## 6. Phase 5: Backend Deployment And API DNS

Use `render.yaml` as the current backend blueprint.

1. Create the backend service from `render.yaml`.
2. Confirm build command installs `backend/requirements.txt`.
3. Confirm start command runs Gunicorn from `backend/`.
4. Set secrets in the host UI, not in the repo.
5. Confirm health path is `/api/v1/health/`.
6. Deploy.
7. Point `api.nutrii.fit` DNS at the backend service.
8. Wait for DNS propagation.

Static check before deploy:

```bash
python scripts/check_backend_release.py
python scripts/check_observability.py
```

Live baseline API smoke after deploy:

```bash
python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1
```

Full API smoke after production data exists:

```bash
python scripts/smoke_api.py \
  --base-url https://api.nutrii.fit/api/v1 \
  --food-id FOOD_UUID \
  --molecule-id MOLECULE_UUID \
  --compare-food-ids FOOD_UUID_A,FOOD_UUID_B \
  --scan-image ./label-smoke.png \
  --require-full
```

Choose real UUIDs from production. The scan image must be a small valid JPEG,
PNG, or WebP label image. Capture the full output for launch notes.

Run query-plan latency checks against production-like Postgres:

```bash
DJANGO_DEBUG=False \
DJANGO_SECRET_KEY=launch-check-only \
DJANGO_ALLOWED_HOSTS=api.nutrii.fit \
DATABASE_URL=postgresql://... \
python scripts/check_query_plans.py --threshold-ms 200
```

If any route or query fails, do not proceed to public web launch. Fix backend,
database, seed, index, timeout, or host configuration first.

## 7. Phase 6: Web Deployment And DNS

Static web checks:

```bash
python scripts/check_web_release.py
python scripts/check_web_routes.py
cd web
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
cd ..
```

Deploy steps:

1. Create a Vercel or Netlify project from `web/`.
2. Set `VITE_API_URL=https://api.nutrii.fit/api/v1`.
3. Deploy the current commit.
4. Point `nutrii.fit` and `www.nutrii.fit` DNS at the frontend host.
5. Confirm SPA fallback works for deep links.

Manual route smoke:

- `https://nutrii.fit/`
- `https://nutrii.fit/search`
- `https://nutrii.fit/compare`
- `https://nutrii.fit/research`
- `https://nutrii.fit/ban-list`
- `https://nutrii.fit/foods/REAL_FOOD_UUID`
- `https://nutrii.fit/molecules/REAL_MOLECULE_UUID`

Check that:

- Pages load without console errors.
- API calls go to `https://api.nutrii.fit/api/v1`.
- Search returns food and molecule results.
- Food detail shows molecules, health context, research, and guide when data is
  present.
- Molecule detail shows linked foods and structure image when present.
- Compare works for 2-3 production food IDs.
- Ban-list rows visibly remain draft/citation-required unless legally reviewed.

Run Lighthouse after DNS and deploy settle:

- Performance > 90.
- Accessibility > 90.
- SEO > 90.

Attach Lighthouse output to launch notes.

## 8. Phase 7: Food And Molecule Images

Static image checks:

```bash
python scripts/check_image_ops.py
python scripts/check_image_surface.py
```

Credentialed production enrichment:

```bash
python scripts/fetch_images.py --entity molecule --limit 500
python scripts/fetch_images.py --entity food --limit 200 --sleep 5
```

Use production credentials only in the shell or host secret manager:

- `BRAVE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_IMAGE_BUCKET=food-images`
- production database connection

Verification:

1. Confirm `molecules_with_images` and `foods_with_images` increased.
2. Open several web food, molecule, home, and search pages.
3. Open mobile search, detail, scan history, and scan result screens.
4. Confirm images are relevant, load over HTTPS, and do not cause layout shift.
5. Confirm attribution metadata remains stored in backend records.

If image quality is poor, stop public promotion of image-heavy surfaces until
candidate filters or manual source allowlists are improved.

## 9. Phase 8: PubMed, AI Summaries, Safety, And Guides

Static checks:

```bash
python scripts/check_research_ops.py
python scripts/check_research_surface.py
python scripts/check_ai_contract.py
```

Before running live jobs:

1. Confirm `OPENROUTER_API_KEY` or `OPENROUTER_API_KEYS` is valid.
2. Confirm OpenRouter quota and spend limits in the provider dashboard.
3. Confirm `NCBI_API_KEY` if higher PubMed limits are needed.
4. Confirm production database has seeded foods/molecules.
5. Decide the initial launch cadence. The runbook documents a 6-hour cron.

Run a small live batch first:

```bash
python scripts/pubmed_watcher.py --days 30 --max-results 5
python scripts/study_analyzer.py --limit 5
python scripts/safety_adjuster.py --auto
python scripts/report_ingestion_counts.py
```

Then review:

- New studies link to foods through `FoodStudy` when applicable.
- Study summaries are concise and confidence labels are high/medium/low.
- Safety score adjustments cite PMIDs and obey the 15-point cap.
- `SafetyScoreRevision` records are written.
- Web and mobile research pages show PubMed citation links.
- Food detail shows research summaries and AI guide text when present.

Only after the small batch is reviewed should scheduled production jobs be
enabled.

## 10. Phase 9: Mobile And OCR Physical-Device Validation

Static mobile checks:

```bash
python scripts/check_mobile_release.py
cd mobile
bun install --frozen-lockfile
bun run test
bun run typecheck
cd ..
```

After Apple/Google bundle identifiers are chosen:

```bash
python scripts/check_mobile_release.py --require-store-ids
```

Native validation:

1. Set `EXPO_PUBLIC_API_URL=https://api.nutrii.fit/api/v1`.
2. Run `npx expo prebuild` from `mobile/`.
3. Build and install on a physical iPhone.
4. Build and install on a physical Android device.
5. Test camera permission acceptance and denial.
6. Test photo-library permission acceptance and denial.
7. Scan at least 10 real labels:
   - clear label
   - blurry label
   - curved package
   - low light
   - long ingredient list
   - label with allergens
   - label with multiple languages
   - label with no usable ingredients
8. Confirm OCR responses return JSON, not HTML or proxy errors.
9. Confirm confidence, raw OCR preview, hazards, matched foods, images, and
   recent scan history appear correctly.
10. Confirm malformed or missing IDs never navigate to broken detail screens.

App-store preparation:

- Choose iOS bundle identifier.
- Choose Android package identifier.
- Update EAS/native config.
- Re-run `--require-store-ids`.
- Prepare screenshots, privacy labels, support URL, and app description.
- Do not submit until physical OCR validation is acceptable.

## 11. Phase 10: Monitoring, Logs, Alerts, And Privacy

Static check:

```bash
python scripts/check_observability.py
```

Production setup:

1. Choose Sentry, Logtail, or another log sink.
2. Store DSN/tokens in provider secrets only.
3. Confirm backend logs reach the sink.
4. Trigger one search, food detail view, compare request, and scan request.
5. Confirm `nutrii.analytics` entries appear for `search`, `view`, `compare`,
   and `scan`.
6. Confirm logs do not contain raw search text, raw OCR text, IP addresses,
   cookies, auth tokens, or user identifiers.
7. Configure alerts:
   - API error rate above 1%.
   - backend service down.
   - repeated scan failures.
   - OpenRouter spend/quota threshold.

Keep hosting-provider logs only for a short beta if retention and alerting are
acceptable. Production should have durable external logging.

## 12. Phase 11: Citation, Ban-list, Regulatory, And Press Review

Static ban-list check:

```bash
python scripts/check_ban_list_surface.py
```

Before public claims:

1. Review every ban-list entry in `ban_list/ban_list.json`.
2. Keep `requires_citation=true` until a PubMed/regulatory source is attached.
3. Do not show draft rows as verified production claims.
4. Confirm lethal-dose and safety-condition copy is medically/legal reviewed.
5. Review `docs/press_kit.md`; fill only facts that are true after deploy:
   - production URL
   - app availability
   - Lighthouse scores
   - contact details
   - screenshots
6. Decide whether any regulated health/safety wording needs legal review before
   launch.

If a claim is not reviewed, keep it visibly draft/citation-required or remove it
from public launch surfaces.

## 13. Phase 12: Security And Secret Hygiene

Before every release candidate:

```bash
python scripts/check_secret_hygiene.py
git status --short
git ls-files .env .env.example backend/.env web/.env mobile/.env
```

Rules:

- Never commit `.env`, `.env.production`, API keys, private keys, DSNs, service
  role keys, database URLs, app-store credentials, or log-drain tokens.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server/tooling-only.
- Web and mobile clients must only call the Django API.
- Rotate credentials immediately if a real secret is ever committed.
- Use provider secret managers for production deploys.

Also run:

```bash
python scripts/check_launch_env.py --env-file .env.production
python scripts/check_local_release.py
```

## 14. Rollback And Troubleshooting

Keep rollback simple.

Backend rollback:

1. Identify last known good commit.
2. Redeploy that commit in the backend host.
3. If a migration caused the issue, stop and write a deliberate rollback plan.
   Do not run destructive database commands under pressure.
4. Re-run baseline smoke:

   ```bash
   python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1
   ```

Web rollback:

1. Roll back to last known good frontend deployment in Vercel/Netlify.
2. Confirm SPA routes and API calls.
3. Re-run Lighthouse if the issue was performance/SEO/accessibility.

Mobile rollback:

1. If still in Expo preview/beta, ship a fixed preview build.
2. If submitted to stores, use staged rollout controls.
3. If OCR breaks, disable public promotion and direct users to web search until
   a fixed build is approved.

Data/AI rollback:

1. Stop scheduled PubMed/AI jobs.
2. Preserve `SafetyScoreRevision` records for audit.
3. Revert bad score changes through a reviewed data migration or management
   command.
4. Re-run a small AI batch only after prompt/parser or provider issues are fixed.

Common failures:

- API returns HTML: DNS/proxy points to frontend, not backend.
- Smoke test non-JSON: wrong base URL or proxy fallback.
- Scan returns 415/422: invalid test image or upload content type.
- Scan returns 503: OCR runtime/dependency issue on backend host.
- CORS error: `CORS_ALLOWED_ORIGINS` missing deployed frontend domain.
- 500 after deploy: missing env secret or migration drift.
- Slow queries: run `scripts/check_query_plans.py --threshold-ms 200` and add
  index/query fixes before scaling traffic.

## 15. Final Launch Checklist

Do not launch publicly until every item is checked.

### Local release

- [ ] `git status --short` is clean.
- [ ] `python scripts/check_local_release.py` passes.
- [ ] `python scripts/check_secret_hygiene.py` passes.
- [ ] Web `bun run lint`, `bun run test`, and `bun run build` pass.
- [ ] Mobile `bun run test` and `bun run typecheck` pass.

### Environment and backend

- [ ] `python scripts/check_launch_env.py --env-file .env.production` passes.
- [ ] Supabase production database is migrated.
- [ ] Production seed is loaded and counts are recorded.
- [ ] Backend is deployed from the release commit.
- [ ] `api.nutrii.fit` DNS points to backend.
- [ ] Baseline API smoke passes.
- [ ] Full API smoke with real IDs and scan image passes.
- [ ] Query plan check is under 200 ms for target routes.

### Web

- [ ] Web deploy uses `VITE_API_URL=https://api.nutrii.fit/api/v1`.
- [ ] `nutrii.fit` and `www.nutrii.fit` DNS point to frontend.
- [ ] Static routes and dynamic detail routes load.
- [ ] Search, compare, research, molecule detail, food detail, and ban list work.
- [ ] Lighthouse scores are above 90 for Performance, Accessibility, and SEO.

### Images, data, AI, and research

- [ ] Image enrichment ran with production credentials.
- [ ] Food/molecule image rendering verified on web and mobile.
- [ ] PubMed small batch ran and counts were recorded.
- [ ] AI study summaries and safety adjustments were reviewed.
- [ ] Scheduled PubMed/AI job is installed and monitored.
- [ ] PubMed links resolve from deployed web/mobile surfaces.

### Mobile

- [ ] `python scripts/check_mobile_release.py --require-store-ids` passes after
      store IDs are chosen.
- [ ] iOS physical-device build works.
- [ ] Android physical-device build works.
- [ ] Camera and photo-library permissions work.
- [ ] At least 10 real label OCR cases are reviewed.
- [ ] App-store metadata, privacy labels, screenshots, support URL, and staged
      rollout plan are ready.

### Monitoring and safety

- [ ] External log/error sink is active.
- [ ] Analytics events are visible and privacy-safe.
- [ ] Error-rate, uptime, scan-failure, and provider-quota alerts are active.
- [ ] Ban-list/regulatory claims are reviewed or kept draft/citation-required.
- [ ] Press kit contains only verified launch facts.
- [ ] Rollback path for backend, web, mobile, and data/AI is documented in launch
      notes.

When every item above is complete, capture:

- release commit SHA
- backend deploy version
- web deploy version
- production seed timestamp
- smoke-test output
- query-plan output
- Lighthouse report
- mobile physical-device test notes
- monitoring alert links
- known limitations

Then proceed with public launch.
