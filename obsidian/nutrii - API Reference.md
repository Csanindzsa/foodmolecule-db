# nutrii — API Reference

> **Phase 10 Deliverable** — Fully public, read-only REST API. No authentication required.

---

## Base URL

```
http://localhost:8000/api/v1/     (development)
https://nutrii.fit/api/v1/         (production)
```

## Authentication

None. All endpoints are fully public. Rate limited to 100 requests/minute per IP.

---

## Endpoints

### Health Check

```
GET /api/v1/health/
```

Response: `{ "status": "ok", "service": "nutrii-api" }`

---

### Foods

#### List Foods
```
GET /api/v1/foods/
```

Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| category | string | Filter by category name (case-insensitive) |
| min_health_index | int | Minimum health index (0-100) |
| max_health_index | int | Maximum health index (0-100) |

Response: Page-number paginated list of foods with name, category, safety score, health index.

#### Food Detail
```
GET /api/v1/foods/<uuid:id>/
```

Returns full food detail including molecules with amounts, score revisions, AI guides.

#### Food Health Index
```
GET /api/v1/foods/<uuid:id>/health-index/
```

Response:
```json
{
  "food_id": "uuid",
  "health_index": 82,
  "benefit_score": 45,
  "safety_score": 88,
  "bioavailability_score": 76,
  "label": "Good"
}
```

#### Food Studies
```
GET /api/v1/foods/<uuid:id>/studies/
```

Returns all linked PubMed studies with AI summaries, ordered by analyzed_at desc.

#### Food Guide
```
GET /api/v1/foods/<uuid:id>/guide/
```

Returns the current AI agent instruction guide Markdown content.

#### Search Foods
```
GET /api/v1/foods/search/?q=<query>
```

Searches foods by name and aliases. Also searches molecules by name, IUPAC, CAS.

Response:
```json
{
  "query": "spinach",
  "foods": [...],
  "molecules": [...],
  "count": 5
}
```

#### Compare Foods
```
GET /api/v1/foods/compare/?ids=id1,id2
```

Compares 2-3 foods side-by-side. Returns health index, safety score, molecules, and shared molecules.

---

### Molecules

#### List Molecules
```
GET /api/v1/molecules/
```
Optional: `?harm_level=<0-5>`

#### Molecule Detail
```
GET /api/v1/molecules/<uuid:id>/
```

Returns molecule with foods containing it and neutralization methods.

#### Search Molecules
```
GET /api/v1/molecules/search/?q=<query>
```

Search by name, CAS number, or PubChem CID.

---

### Studies

#### Recent Studies
```
GET /api/v1/studies/recent/
```

Returns last 50 analyzed studies with AI summaries.

---

### Ban List

```
GET /api/v1/ban-list/
```

Optional: `?conditional=true|false`

---

### Categories

```
GET /api/v1/categories/
```

Returns food categories tree with children.

---

### Processing Methods

```
GET /api/v1/processing-methods/
```

---

### Ingredient Scan

```
POST /api/v1/scan/
```

Accepts a multipart image upload and returns OCR ingredients plus matched foods and molecules.

---

### Platform Stats

```
GET /api/v1/stats/
```

Response:
```json
{
  "foods": 0,
  "molecules": 0,
  "studies": 0,
  "studies_analyzed": 0,
  "ban_list_entries": 0
}
```

---

## Caching Strategy

| Data | Cache TTL | Invalidation |
|------|-----------|--------------|
| Food detail pages | 1 hour | Time-based |
| Health index scores | 24 hours | On AI update |
| Search autocomplete | 6 hours | Time-based |

## Pagination

All list endpoints use page-number pagination. Page size: 50 items default; client-requested `page_size` is capped at 100.

## Rate Limiting

- 100 requests/minute per IP (configurable via `RATE_LIMIT_REQUESTS_PER_MINUTE`)
- Backed by Django's configured cache. The default deployment uses local-memory cache; configure a shared cache before multi-instance production traffic.

## CORS

Allowed origins configured via `CORS_ALLOWED_ORIGINS` env var.
Default (dev): `http://localhost:5173,http://localhost:3000`
