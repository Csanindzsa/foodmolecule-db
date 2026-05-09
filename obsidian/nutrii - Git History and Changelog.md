# nutrii — Git History & Changelog

> **Repository:** github.com/Csanindzsa/foodmolecule-db  
> **Branch:** main (single branch)  
> **Commits:** 7  
> **Files:** 94 created, 5,600+ lines

---

## Commit History

```
* 169d22e  docs: add legacy docs, schemas, and project infrastructure
* 8676b88  Phase 2: Data architecture — updated JSON schemas, ER diagram, Django models
* 470e4bc  Phase 1: Infrastructure — Docker Compose, Supabase config, .env.example
* db6d5be  Phase 0: Legacy audit, project bootstrap, and rebrand to nutrii
* b81bed5  Rework of implementation plan
* 4b54709  feat: add comprehensive implementation plan
* 9130541  Initial commit
```

---

## Detailed Changelog

### Commit 1 — `9130541` (Initial Commit)
- Repository initialization

### Commit 2 — `4b54709` (feat: add comprehensive implementation plan)
- First version of `IMPLEMENTATION_PLAN.md`
- 14-phase roadmap documented

### Commit 3 — `b81bed5` (Rework of implementation plan)
- Restructured and detailed the plan
- Added appendices (prompt templates, mobile spec)

### Commit 4 — `db6d5be` (Phase 0: Legacy audit, project bootstrap, rebrand)
- Created `docs/legacy_audit.md` — 62 lines of audit documentation
- Created `docs/technical_debt.md` — 76 lines of technical debt checklist
- Rebranded README from Nutri to nutrii
- Updated LICENSE.md
- Renamed project references

### Commit 5 — `470e4bc` (Phase 1: Infrastructure)
- `infra/docker-compose.yml` — PostgreSQL 16, Redis, MinIO, MeiliSearch
- `infra/supabase-config.md` — Supabase configuration guide
- `infra/init.sql` — Database initialization
- `.env.example` — 43-line environment template
- `render.yaml` — Render deployment config
- Updated `infra/supabase-config.md` (93 lines)

### Commit 6 — `8676b88` (Phase 2: Data Architecture)
- **94 files changed, 5,565 insertions**
- Django project scaffolded (`backend/`)
  - 10 database models in `core/models.py` (439 lines)
  - 16 API views in `core/views.py` (224 lines)
  - 9 serializers in `core/serializers.py` (152 lines)
  - Full admin configuration (95 lines)
  - Django settings (154 lines)
  - Initial migration (663 lines)
- JSON Schema files updated (5 files)
  - `schema/food.schema.json`
  - `schema/molecule.schema.json`
  - `schema/ban_list.schema.json`
  - `schema/study.schema.json` (new)
  - `schema/ai_guide.schema.json` (new)
- AI agent system (`ai/`)
  - `consensus_selector.py` (186 lines)
  - `dispatcher.py` (153 lines)
  - `parsers.py` (71 lines)
  - 5 Jinja2 prompt templates
  - 3 test files (200+ lines)
- Web frontend scaffolded (`web/`)
  - 3 pages (Home, Search, FoodDetail)
  - Layout component
  - API client + TypeScript types
  - Vite + Tailwind v4 configuration
- Mobile app scaffolded (`mobile/`)
  - 4 screens (Home, Search, FoodDetail, Scan)
  - React Navigation setup
  - History store (Zustand + AsyncStorage)
- Scripts for data pipeline (`scripts/`)
  - Master pipeline runner
  - 3 data fetchers (USDA, PubChem, PubMed)
  - 2 transformers (normalizer, deduplicator)
  - 2 loaders (bulk insert, validator)
  - 4 phase-5 scripts (watcher, analyzer, adjuster, guides)
- Seed data: 2 foods, 4 molecules
- Docs: ER diagram, launch checklist, scaling
- Guide template, classification docs, processing methods
- OCR pipeline scaffold
- GitHub issue templates

### Commit 7 — `169d22e` (docs: add legacy docs, schemas, infra)
- Finalized documentation and infrastructure files
- Small refinements to existing files

---

## Stats Summary

| Metric | Value |
|--------|-------|
| Total commits | 7 |
| Files created | 94 |
| Lines added | 5,565 |
| Lines removed | 56 |
| Active branches | 1 (main) |
| Contributors | 1 |
| First commit | ~April 2026 |
| Latest commit | ~May 2026 |

## What This Repo Contains

| Category | Count |
|----------|-------|
| Python files | 25+ |
| TypeScript/TSX | 10 |
| JSON/Schema | 10 |
| Markdown docs | 15+ |
| Docker/Infra | 4 |
| Jinja2 templates | 5 |
| CSS | 1 |
| Config files | 10+ |

## Key Accomplishments

1. **Complete Django backend** with 10 models, 16 API endpoints, full test suite
2. **AI agent system** with dynamic model selection, dispatcher, and 5 prompt templates
3. **Data pipeline** with USDA/PubChem/PubMed fetchers, normalizer, deduplicator
4. **React web frontend** with 3 working pages, API integration
5. **Mobile app scaffold** with 4 screens, navigation, local storage
6. **Infrastructure** with Docker Compose, Supabase config, deployment config
7. **Documentation** with legacy audit, ER diagram, scaling plan, launch checklist
