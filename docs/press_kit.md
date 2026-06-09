# nutrii Press Kit

Status: draft. Final screenshots, production URLs, and verified metrics must be captured after deployment.

## Boilerplate

nutrii is a public food intelligence platform that maps food ingredients to molecules, safety signals, PubMed evidence, and preparation guidance. The project combines a Django REST API, React web app, Expo mobile ingredient scanning flow, and OpenRouter-powered research workflows.

## Short Description

nutrii helps people inspect food ingredients through molecular composition, safety scoring, research summaries, and label scanning.

## Long Description

nutrii is an open, no-login food ingredient database built around molecular composition and safety transparency. It exposes public API endpoints for foods, molecules, studies, comparisons, ban-list entries, platform stats, and OCR ingredient scans. The web app supports search, detail views, comparisons, molecule pages, and ban-list browsing. The mobile app supports API-backed search, food details, and camera/gallery label scanning through the backend OCR pipeline.

## Launch Positioning

- Public by design: no accounts, paywalls, or user tracking are required for core access.
- Evidence-oriented: PubMed watcher and AI summary tooling are built into the pipeline.
- Safety-first: ban-list entries, conditional warnings, and citation gates separate draft claims from verified production data.
- Multi-surface: API, web, and Expo mobile flows share the same backend.

## Product Links

| Asset | URL |
|-------|-----|
| Web app | `https://nutrii.fit` |
| API base | `https://api.nutrii.fit/api/v1` |
| API reference | `obsidian/nutrii - API Reference.md` |
| Launch checklist | `docs/launch_checklist.md` |
| Scaling guide | `docs/scaling.md` |

## Screenshots To Capture

Capture these after production deploy and route smoke testing:

1. Home page with platform stats.
2. Search results for a common ingredient.
3. Food detail page with molecule and health-index sections.
4. Molecule detail page with linked foods.
5. Compare page with two or three foods.
6. Ban-list page with conditional warning badges.
7. Mobile scan screen after a successful label scan.

## Approved Claims

Use only claims that are covered by the repository and current launch checklist:

- Public read-only API under `/api/v1/`.
- Privacy-preserving aggregate analytics with no cookies.
- Backend test coverage for API, ingestion, OCR scan, PubMed tooling, safety adjustment, schema validation, and deployment config.
- Static web SEO assets and SPA route fallbacks are configured.
- Expo preview and production build profiles are configured.

Avoid these claims until externally verified:

- Production latency targets.
- Lighthouse scores.
- App Store or Google Play availability.
- Live Supabase seed counts.
- OpenRouter quota or cost projections beyond documented planning assumptions.
- Verified ban-list regulatory status for draft entries.

## Media Contact

Owner/contact: add before launch.

## Release Checklist

Before publishing:

1. Replace draft screenshots with production screenshots.
2. Confirm DNS and production deploy URLs.
3. Confirm final launch checklist status.
4. Confirm legal wording for safety-related claims.
5. Re-run backend and web CI checks.
