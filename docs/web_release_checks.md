# Web Release Checks

Status: static React/Vite release preflight. This validates deploy wiring without installing Node dependencies or requiring hosting credentials.

## Command

Run from the repository root:

```bash
python scripts/check_web_release.py
```

CI and the local release audit run this command before backend tests.

## What It Verifies

- `web/package.json` keeps locked Bun install, isolated test, and production build commands.
- Vite builds to `dist`, uses React and Tailwind, and does not emit public production source maps.
- The web API client supports `VITE_API_URL`, legacy `VITE_API_BASE_URL`, and same-origin `/api/v1` fallback.
- The web API client rejects empty and oversized path IDs before building detail-route URLs.
- Search input, URL query handling, and the web API client cap client-side queries to the backend 128-character limit.
- `index.html` includes launch SEO, canonical URL, and Open Graph metadata.
- `robots.txt` and `sitemap.xml` expose the crawlable launch routes.
- The Compare page and API client bound compare IDs and sanitize molecule amount maps, shared molecule names, and aggregate count displays before rendering.
- Food and molecule detail pages sanitize text arrays, molecule harm levels, amount values, numeric properties, and neutralization reductions before rendering badge text or classes.
- Food detail renders health-index labels through the backend label allowlist.
- Food detail sanitizes AI guide copy before rendering.
- Optional category and molecular formula text is trimmed and type-checked before rendering.
- CI installs web dependencies with `bun install --frozen-lockfile`, runs tests, and builds the Vite app.

## Live Launch Follow-Up

This check does not prove the deployed site is reachable or fast. After deployment, set `VITE_API_URL=https://api.nutrii.fit/api/v1`, smoke test the deployed routes, and run Lighthouse with a target above 90 for Performance, Accessibility, and SEO.
