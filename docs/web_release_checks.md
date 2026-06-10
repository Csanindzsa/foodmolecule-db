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
- `index.html` includes launch SEO, canonical URL, and Open Graph metadata.
- `robots.txt` and `sitemap.xml` expose the crawlable launch routes.
- The Compare page sanitizes molecule amount maps and aggregate count displays before rendering.
- Food and molecule detail pages sanitize molecule harm levels before rendering badge text or classes.
- CI installs web dependencies with `bun install --frozen-lockfile`, runs tests, and builds the Vite app.

## Live Launch Follow-Up

This check does not prove the deployed site is reachable or fast. After deployment, set `VITE_API_URL=https://api.nutrii.fit/api/v1`, smoke test the deployed routes, and run Lighthouse with a target above 90 for Performance, Accessibility, and SEO.
