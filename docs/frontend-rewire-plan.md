# Web Frontend Integration Plan

## Current Shape

- The production backend lives in `backend/` and exposes Django REST API endpoints under `/api/v1/`.
- The active web app lives in `web/` and uses React, Vite, Bun, TanStack Query, and Tailwind CSS.
- The web API client reads `VITE_API_URL` or `VITE_API_BASE_URL`, falling back to `/api/v1` for same-origin deployments.
- The old nested `Nutri/react-ts-frontend/` and `Nutri/django_backend/` paths are not active project dependencies.

## Active Routes

| Route | Purpose | Backend data |
| --- | --- | --- |
| `/` | Home dashboard | Platform stats and food list |
| `/search` | Food and molecule search | `GET /foods/search/?q=...` |
| `/foods/:id` | Food detail | Food, molecules, NHI, studies, AI guide |
| `/molecules/:id` | Molecule detail | Molecule, foods, neutralization methods |
| `/compare` | Compare 2-3 foods | `GET /foods/compare/?ids=...` |
| `/ban-list` | Ban list | `GET /ban-list/` |

## Backend API Contract

Base path: `/api/v1/`

| Frontend need | Backend endpoint | Notes |
| --- | --- | --- |
| Health check | `GET /health/` | Returns service status. |
| Food explorer | `GET /foods/` | Paginated DRF response; supports category, score, hazard, sort, and dedupe filters. |
| Food detail | `GET /foods/:id/` | Includes molecules, score revisions, and AI guides. IDs are UUIDs. |
| Food health score | `GET /foods/:id/health-index/` | Computes current NHI breakdown. |
| Food studies | `GET /foods/:id/studies/` | Linked PubMed evidence. |
| Food guide | `GET /foods/:id/guide/` | AI guide markdown for a food. |
| Search | `GET /foods/search/?q=...` | Returns `foods`, `molecules`, and `count`. |
| Compare foods | `GET /foods/compare/?ids=id1,id2` | Accepts 2-3 unique food UUIDs. |
| Molecule list | `GET /molecules/` | Supports harm-level and sort filters. |
| Molecule detail | `GET /molecules/:id/` | Includes related foods and neutralization methods. |
| Molecule search | `GET /molecules/search/?q=...` | Name, CAS, or PubChem lookup. |
| Recent studies | `GET /studies/recent/` | Latest AI-analyzed studies. |
| Ban list | `GET /ban-list/` | Supports `conditional=true/false`. |
| Categories | `GET /categories/` | Food category lookup. |
| Processing methods | `GET /processing-methods/` | Neutralization methods. |
| Stats | `GET /stats/` | Platform counts. |

## Launch Validation

1. Backend: `cd backend && python manage.py check --deploy` with production environment variables.
2. Web install: `cd web && bun install --frozen-lockfile`.
3. Web tests: `cd web && bun run test`.
4. Web build: `cd web && bun run build`.
5. Runtime smoke: start backend on `127.0.0.1:8000`, set `VITE_API_URL=http://127.0.0.1:8000/api/v1`, start Vite, then confirm the active routes above load from the API.
