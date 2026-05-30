# Nutri Frontend Rewire Plan

## Current Shape

- The production backend lives in `backend/` and exposes a public read-only Django REST API under `/api/v1/`.
- Supabase PostgreSQL is the primary database path. Local/offline development can fall back to SQLite when Supabase env vars are absent.
- The existing root `web/` app is the frontend to retire.
- `Nutri/react-ts-frontend/` is the React + Vite + MUI frontend to keep, but it was built against the old `Nutri/django_backend/` API.
- `Nutri/django_backend/` and bulky nested-repo artifacts have been removed. The old backend must not be reintroduced as an active dependency.

## Target Shape

- Keep one active backend: `backend/`.
- Keep one active frontend: `Nutri/react-ts-frontend/`, eventually moved or aliased as the root web app if desired.
- Route all frontend API traffic through one typed client that reads `VITE_API_URL`, with a local fallback of `/api/v1`.
- Remove old auth, supervisor, restaurant-edit, and mutation workflows unless they are intentionally rebuilt against the new product model.
- Treat the new backend as the source of truth for foods, molecules, categories, studies, ban-list entries, processing methods, guides, and platform stats.

## Backend API Contract To Wire

Base path: `/api/v1/`

| Frontend need | Backend endpoint | Notes |
| --- | --- | --- |
| Health check | `GET /health/` | Returns service status. |
| Food explorer | `GET /foods/` | Paginated DRF response by default; supports `category`, `min_health_index`, `max_health_index`. |
| Food detail | `GET /foods/:id/` | Includes molecules, score revisions, AI guides. IDs are UUIDs. |
| Food health score | `GET /foods/:id/health-index/` | Computes current NHI breakdown. |
| Food studies | `GET /foods/:id/studies/` | Linked PubMed evidence. |
| Food guide | `GET /foods/:id/guide/` | AI guide markdown for a food. |
| Search | `GET /foods/search/?q=...` | Returns `foods`, `molecules`, and `count`. |
| Compare foods | `GET /foods/compare/?ids=id1,id2` | Accepts 2-3 food UUIDs. |
| Molecule list | `GET /molecules/` | Supports `harm_level`. |
| Molecule detail | `GET /molecules/:id/` | Includes related foods and neutralization methods. |
| Molecule search | `GET /molecules/search/?q=...` | Name, CAS, or PubChem lookup. |
| Recent studies | `GET /studies/recent/` | Latest AI-analyzed studies. |
| Ban list | `GET /ban-list/` | Supports `conditional=true/false`. |
| Categories | `GET /categories/` | Food category lookup. |
| Processing methods | `GET /processing-methods/` | Neutralization methods. |
| Stats | `GET /stats/` | Platform counts. |

## Rewire Steps

1. Flatten and track the chosen frontend
   - Done: nested Git metadata was removed from `Nutri/`.
   - Done: the root `Nutri/` ignore rule was removed so the outer repo can track source files.
   - Done: old Django backend, local DB/media/data, proof screenshots, school document binaries, and large raster frontend assets were removed.
   - Keep generated and bulky folders ignored through root ignore rules: `node_modules/`, `dist/`, `media/`, `db.sqlite3`, caches, and env files.

2. Choose frontend package location
   - Short term: run and adapt `Nutri/react-ts-frontend/` in place.
   - Later: either rename root `web/` to `web-legacy/` and move `Nutri/react-ts-frontend/` to `web/`, or update repo scripts/docs to treat `Nutri/react-ts-frontend/` as the active web app.

3. Replace the old API layer
   - Replace hard-coded `http://localhost:8000` with `import.meta.env.VITE_API_URL ?? "/api/v1"`.
   - Add a small typed API client for DRF pagination, errors, and URL building.
   - Normalize DRF paginated responses so pages can consume arrays cleanly.

4. Replace legacy data types
   - Change numeric legacy IDs to backend UUID strings.
   - Replace `Restaurant`, legacy `Ingredient`, and nutrition macro-first types with new `Food`, `Molecule`, `FoodMolecule`, `Study`, `Category`, `BanListEntry`, and `ProcessingMethod` types.
   - Map old `hazard_level` UI concepts to backend molecule `harm_level`, food `health_index`, and `overall_safety_score`.

5. Remove or quarantine incompatible UI
   - Remove auth flows: login, register, email confirmation, JWT refresh, protected routes, account edit/delete.
   - Remove supervisor approval flows and food mutation flows unless the backend grows write endpoints.
   - Remove restaurant/location pages unless the product still needs them as a separate feature.
   - Keep reusable visual pieces: theme, logo/branding, food cards, hazard/score indicators, background components if they still fit.

6. Build the new read-only product flow
   - Home/dashboard: platform stats, search, recent studies, top safe/risky foods.
   - Food explorer: backend-backed filters for category and health index.
   - Food detail: NHI breakdown, molecules, AI guide, linked studies, safety revisions.
   - Molecule explorer/detail: harm level, mechanisms, foods containing the molecule, neutralization methods.
   - Compare: 2-3 foods by NHI and molecule overlap.
   - Ban list: reason, conditional safety, safe condition, regulatory status.

7. Validate integration
   - Backend: `cd backend && python manage.py check`.
   - Frontend: `cd Nutri/react-ts-frontend && npm install && npm run build`.
   - Runtime smoke: start backend on `127.0.0.1:8000`, frontend on Vite, confirm search/list/detail pages load from `/api/v1/`.

## First Buildable Slice

The first implementation slice should be narrow:

1. Add `src/lib/api.ts` and `src/types/nutrii.ts` to `Nutri/react-ts-frontend/`.
2. Strip auth/token bootstrapping from `App.tsx`.
3. Rebuild the navbar around public pages only: Home, Foods, Molecules, Compare, Ban List.
4. Rewire `FoodList.tsx` to `GET /api/v1/foods/` and handle DRF pagination.
5. Add a new food detail page backed by `GET /api/v1/foods/:id/`.

That slice proves the frontend can talk to the new backend without trying to migrate every legacy page at once.
