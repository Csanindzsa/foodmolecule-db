# Web Route Checks

Status: static frontend route preflight. This verifies route/config drift without installing Node dependencies.

## Command

Run from the repository root:

```bash
python scripts/check_web_routes.py
```

CI runs the same command before backend tests.

## What It Verifies

- `web/src/App.tsx` defines the launch routes: `/`, `/search`, `/foods/:id`, `/molecules/:id`, `/compare`, `/research`, and `/ban-list`.
- `web/public/sitemap.xml` contains the static crawlable routes: `/`, `/search`, `/compare`, `/research`, and `/ban-list`.
- `web/src/components/Layout.tsx` exposes Compare, Research, and Ban List links in desktop and mobile header navigation.
- `web/vercel.json` rewrites SPA routes to `index.html`.
- `web/public/_redirects` has the Netlify SPA fallback.

## What It Does Not Prove

- The Vite app builds successfully.
- The deployed frontend can reach the production API.
- Dynamic food and molecule detail routes have production IDs.
- Lighthouse scores meet launch targets.

After this passes, still run `bun install --frozen-lockfile`, `bun run build`, deployed route smoke testing, and Lighthouse.
