# Local Release Audit

Status: no-credential release preflight. This command bundles the local checks that can run before DNS, provider dashboards, store accounts, production database access, or live API smoke tests.

## Command

Run from the repository root:

```bash
python scripts/check_local_release.py
```

If a production-style env file is available, include the launch environment preflight:

```bash
python scripts/check_local_release.py --env-file .env.production
```

CI runs the no-secret version.

## Included Checks

- Seed readiness: `scripts/check_seed_readiness.py --min-foods 100 --min-molecules 4`
- Ban-list schema validation.
- API smoke probe coverage list.
- Query-plan target list.
- Static web route contract.
- Static Expo mobile release contract.
- PubMed/AI research operations contract.
- Image enrichment operations contract.
- Optional launch environment preflight when `--env-file` is provided.

## Not Included

- Live Supabase pytest/migration checks.
- Deployed API smoke testing.
- PostgreSQL `EXPLAIN ANALYZE`.
- OpenRouter quota checks.
- Sentry/Logtail setup.
- DNS, deploy, Lighthouse, native Expo builds, physical devices, or app-store submission.

Run those credentialed and account-bound checks from `docs/launch_checklist.md` after the local audit passes.
