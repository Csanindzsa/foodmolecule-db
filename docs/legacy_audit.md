# Legacy Audit — FoodMolecule-DB / Nutri → nutrii

> **Phase 0 Deliverable**  
> Documents what to keep, rewrite, or discard from the original FoodMolecule-DB repository.

---

## 1. What Existed Before

The original repository (`foodmolecule-db`) was a minimal data-first project with:

| Artifact | Path | Status |
|----------|------|--------|
| Food JSON schema | `schema/food.schema.json` | **Keep** — extend with new fields |
| Molecule JSON schema | `schema/molecule.schema.json` | **Keep** — extend with new fields |
| Ban list schema | `schema/ban_list.schema.json` | **Keep** — extend with regulatory JSONB |
| Ban list data | `ban_list/ban_list.md` | **Keep** — migrate to `ban_list.json` |
| Processing methods | `processing/methods.md` | **Keep** — add compound matrix CSV |
| Classification (partial) | `classification/` | **Keep & expand** |
| README | `README.md` | **Rewritten** — rebranded to nutrii |

## 2. What Was Missing (Now Added)

- No backend (Django) — **to be created in Phase 10**
- No frontend — **to be created in Phase 11**
- No mobile app — **to be created in Phase 12**
- No AI/LLM integration — **to be created in Phase 4**
- No PubMed ingestion — **to be created in Phase 5**
- No Docker / infra config — **to be created in Phase 1**
- No `.env.example` — **added in Phase 1**
- Missing schemas: `study.schema.json`, `ai_guide.schema.json` — **to be added in Phase 2**
- No `docs/` directory with structured documentation — **created now**

## 3. Known Technical Debt from Legacy Project

See [technical_debt.md](technical_debt.md) for the full checklist.

Summary of the most critical issues identified to avoid repeating:

1. **Hardcoded secrets** — legacy Nutri had `SECRET_KEY` committed in settings. nutrii uses environment variables exclusively via `.env` + `python-decouple`.
2. **CORS `*`** — legacy used wildcard CORS. nutrii uses an explicit allow-list.
3. **SQLite in production** — legacy used SQLite. nutrii uses Supabase PostgreSQL exclusively.
4. **No migration strategy** — legacy had no Django migrations. nutrii will have migrations from day one.
5. **No test suite** — legacy had zero tests. nutrii requires `pytest-django` coverage on all models and API endpoints.
6. **No rate limiting** — legacy had no rate limiting. nutrii uses Django Ratelimit + Redis from Phase 1.
7. **No caching** — legacy had no cache layer. nutrii uses Redis for all high-traffic endpoints.
8. **Schema drift** — JSON schema files were not enforced. nutrii runs `jsonschema` validation before every bulk insert.

## 4. Reusable Patterns

- The ban list data structure (food name + reason + lethal dose) is the core nucleus of `ban_list.json`.
- The processing methods taxonomy from `processing/methods.md` maps directly to the `processing_methods` DB table.
- The classification structure from `classification/` maps to the `harm_levels` and `harm_types` tables.

## 5. Assets to Keep / Reuse

- No images, icons, or design tokens existed in the legacy repo — all will be created fresh.
- The JSON Schema files are kept as the interchange validation layer (not the DB schema source of truth, which is Django ORM).

---

*Audited: May 2026 | Phase: 0*
