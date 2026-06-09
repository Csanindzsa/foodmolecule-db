# nutrii — Phase Status Dashboard

> **Last Updated:** May 2026  
> **Progress:** 2 of 14 phases complete

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ Complete | All deliverables done |
| 🟡 In Progress | Active development |
| ⬜ Not Started | Not yet begun |
| 🚫 Blocked | Cannot proceed without dependency |

---

## Phase 0: Legacy Audit & Project Bootstrap ✅

**Goal:** Analyze existing Nutri codebase, extract reusable patterns, formally deprecate old data model.

**Deliverables:**
- [x] `docs/legacy_audit.md` — Full breakdown of keep/rewrite/discard
- [x] `docs/technical_debt.md` — 20+ anti-patterns documented
- [x] Rebranded `README.md` and `LICENSE.md`
- [x] Initial commit with repo structure

**Notes:** Legacy audit identified 8 critical issues: hardcoded secrets, CORS wildcard, SQLite in production, no migrations, no tests, no rate limiting, no caching, schema drift. All documented with mitigations.

---

## Phase 1: Infrastructure & Database (Supabase) ✅

**Goal:** Provision production-grade infrastructure. No authentication layer.

**Deliverables:**
- [x] `infra/docker-compose.yml` — PostgreSQL 16 for offline local development
- [x] `infra/supabase-config.md` — Supabase project settings guide
- [x] `infra/init.sql` — Database initialization
- [x] `.env.example` — Complete environment template with all API keys
- [x] CORS configuration with explicit allow-list
- [x] Django settings with `python-decouple` for env-based config

**Files Created:**
- `infra/docker-compose.yml` (106 lines)
- `infra/supabase-config.md`
- `infra/init.sql`
- `.env.example`
- `render.yaml` — Render deployment config

**Notes:** Docker Compose mirrors Supabase PG16 for offline development. Uses env vars exclusively (no hardcoded secrets). The app defaults to Django local-memory cache; use a shared cache before multi-instance production traffic.

---

## Phase 2: Data Architecture & Schema ✅

**Goal:** Design the canonical relational schema. No user/auth tables.

**Deliverables:**
- [x] Django models — 10 models with full field definitions
- [x] Initial migration (`0001_initial.py`, 663 lines)
- [x] JSON Schema files — 5 schemas updated
- [x] `docs/er-diagram.md` — Entity-relationship diagram
- [x] Django admin configuration — 10 model admins
- [x] Backend test suite — `test_models.py`, `test_health_index.py`

**Models Created:**
| Model | Type | Key Fields |
|-------|------|------------|
| `FoodCategory` | Lookup | name, parent (self-ref) |
| `ProcessingMethod` | Lookup | name, temperature, duration |
| `Food` | Core | name, aliases[], safety_score, health_index |
| `Molecule` | Core | pubchem_cid, harm_level, CAS |
| `Study` | Core | pmid, ai_summary, ai_confidence |
| `FoodMolecule` | Junction | amount_per_100g, is_beneficial |
| `FoodStudy` | Junction | relevance_score |
| `MoleculeNeutralization` | Junction | reduction %, evidence refs |
| `SafetyScoreRevision` | Audit | old/new scores, reason |
| `IngredientAIGuide` | AI | guide_markdown, version |
| `BanListEntry` | Audit | reason, regulatory JSONB |

**Notes:** All models use UUID primary keys. GIN indexes on array fields. No user/auth tables at all.

---

## Phase 3: Automated Data Collection Pipeline 🟡

**Goal:** Populate database with first 1,000 foods and 2,000 molecules.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| Pipeline orchestration (`run_pipeline.py`) | ✅ Complete | 5-stage pipeline: load → normalize → deduplicate → validate → insert |
| Pydantic models (`pipeline/models.py`) | ✅ Complete | FoodEntry, MoleculeEntry with validators |
| Pipeline config (`pipeline/config.py`) | ✅ Complete | API keys, rate limits, source URLs |
| USDA fetcher (`fetchers/fetch_usda.py`) | ✅ Complete | FoodData Central API integration with rate limiting |
| PubChem fetcher (`fetchers/fetch_pubchem.py`) | ✅ Complete | PUG-REST API for molecular properties |
| PubMed fetcher (`fetchers/fetch_pubmed.py`) | ✅ Complete | E-utilities with API key support |
| Normalizer (`transformers/normalizer.py`) | ✅ Complete | Name canonicalization, unit conversion |
| Deduplicator (`transformers/deduplicator.py`) | ✅ Complete | Fuzzy name matching, alias merging |
| Bulk inserter (`loaders/bulk_insert.py`) | ✅ Complete | Upsert with ON CONFLICT handling |
| Schema validator (`loaders/validate.py`) | ✅ Complete | JSON Schema validation |
| Seed data (foods) | ⬜ Partial | 2 examples (spinach, kidney_bean) |
| Seed data (molecules) | ⬜ Partial | 4 examples (oxalic_acid, lectin, saponin, iron) |
| Seed data (studies) | ⬜ Not started | Directory exists, empty |

**Notes:** All pipeline infrastructure is built. Needs actual data population at scale. The pipeline processes JSON files from `data/seed/` through a 5-stage pipeline.

---

## Phase 4: OpenRouter AI Agent System 🟡

**Goal:** Build the central nervous system: dynamic model selector + structured inference pipeline.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `consensus_selector.py` | ✅ Complete | Model scoring: context(0.2) + strength(0.5) + availability(0.3) |
| `dispatcher.py` | ✅ Complete | Unified router with JSON mode, fallback chain |
| `parsers.py` | ✅ Complete | 5 Pydantic response models |
| `prompts/study_analysis.j2` | ✅ Complete | Prompt for PubMed study analysis |
| `prompts/safety_adjustment.j2` | ✅ Complete | Prompt for score adjustment |
| `prompts/guide_generation.j2` | ✅ Complete | Prompt for agent guide creation |
| `prompts/conflict_arbitration.j2` | ✅ Complete | Prompt for data conflict resolution |
| `prompts/molecule_classification.j2` | ✅ Complete | Prompt for molecule classification |
| `tests/test_consensus_selector.py` | ✅ Complete | Unit tests for model selection |
| `tests/test_dispatcher.py` | ✅ Complete | Unit tests for dispatch |
| `tests/test_parsers.py` | ✅ Complete | Unit tests for Pydantic validation |

**Notes:** All AI code is alpha-ready. The dispatcher auto-selects the best OpenRouter model per task type. Requires `OPENROUTER_API_KEY` in `.env` to function. Integration with live API not yet tested.

---

## Phase 5: PubMed Auto-Ingestion & Safety Adjustment 🟡

**Goal:** Continuously monitor PubMed, auto-analyze studies, update scores.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `pubmed_watcher.py` | ✅ Complete | Scheduled job, polls PubMed every 6h |
| `study_analyzer.py` | ✅ Complete | Routes studies to OpenRouter for analysis |
| `safety_adjuster.py` | ✅ Complete | Proposes score changes ±15 cap, full audit |
| Backend: `ai_override.py` | ✅ Complete | Validates AI overrides (RCT check, delta cap, PMID citation) |
| Backend: `health_index.py` | ✅ Complete | NHI formula engine |

**Notes:** All scripts are written and importable. They require a running Django + database to execute. The safety adjuster enforces ±15 point cap per update to prevent hallucination swings. Override validator checks for PMID citations and RCT evidence.

---

## Phase 6: Agent Instruction Guide System ⬜

**Goal:** Ensure AI agents apply consistent, evidence-based reasoning via per-ingredient Markdown guides.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `guides/template.md` | ✅ Complete | Canonical guide template |
| `guides/ingredients/*.md` | ⬜ Not started | 0 of 500 guides created |
| `ai/prompts/guide_generation.j2` | ✅ Complete | Prompt for guide generation |
| `scripts/generate_guides.py` | ✅ Complete | Guide generation script |
| `scripts/update_guide.py` | ✅ Complete | Guide update script |

**Notes:** The template and generation infrastructure is ready. Guides can be auto-generated by running `generate_guides.py --all` once the database has food entries.

---

## Phase 7: Harm Classification & Health Index Engine ⬜

**Goal:** Define the scoring framework used by AI agents.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `classification/harm_levels.md` | ✅ Complete | 6-level system (0=none to 5=critical) |
| `classification/harm_types.md` | ✅ Complete | 20+ harm mechanism types |
| `backend/core/health_index.py` | ✅ Complete | NHI = Benefit(0.4) + Safety(0.4) + Bioavailability(0.2) |
| `backend/core/ai_override.py` | ✅ Complete | AI can propose ±15 deviation with PMID citation |
| `backend/core/tests/test_health_index.py` | ✅ Complete | Unit tests for NHI algorithm |

**Notes:** The NHI algorithm is fully implemented in the backend. Classification docs are written. AI override protocol is validated in `ai_override.py`.

---

## Phase 8: Processing & Neutralization Guide ⬜

**Goal:** Document how harmful molecules can be neutralized.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `processing/methods.md` | ✅ Complete | 12 processing methods documented |
| `processing/compound_matrix.csv` | ⬜ Not started | Empty |
| MoleculeNeutralization model | ✅ Complete | Django model with reduction %, evidence refs |

**Notes:** Processing methods documented (boiling, pressure cooking, soaking, fermentation, sprouting, roasting, steaming, peeling, acidification, enzyme treatment, dehydration, freezing). Compound-level data population not yet started.

---

## Phase 9: Ban List & Regulatory Mapping ⬜

**Goal:** Maintain definitive list of foods/preparations that cannot be made safe.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `ban_list/ban_list.md` | ✅ Complete | Core ban list documentation |
| `ban_list/ban_list.json` | ⬜ Not started | Structured data not yet created |
| `ban_list/conditional_warnings.md` | ⬜ Not started | Not yet written |
| `ban_list/regulatory_tracker.md` | ⬜ Not started | Not yet written |
| BanListEntry Django model | ✅ Complete | Full model with regulatory JSONB |
| Ban list API + web page | ✅ Complete | `/api/v1/ban-list/` and `web/src/pages/BanList.tsx` implemented with tests |

**Notes:** Ban criteria documented (4 criteria for automatic entry). Conditional warnings framework defined. The `BanListEntry` model supports per-jurisdiction regulatory JSONB.

---

## Phase 10: Backend API (Django + DRF) 🟡

**Goal:** A completely public, read-only API. No authentication.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| Django project setup | ✅ Complete | Settings, URLs, WSGI, ASGI |
| All 10 models | ✅ Complete | Full field definitions |
| All serializers | ✅ Complete | 9 serializers with nested relations |
| All API views | ✅ Complete | 17 endpoints implemented |
| All URL routing | ✅ Complete | Nested api/v1/ prefix |
| Django admin | ✅ Complete | 10 model admins with filters/search |
| Core tests | ✅ Complete | Model tests + health index tests |
| `requirements.txt` | ✅ Complete | 20 packages with version pins |

**API Endpoints:**
```
GET /api/v1/health/
GET /api/v1/foods/
GET /api/v1/foods/:id/
GET /api/v1/foods/search/?q=
GET /api/v1/foods/compare/?ids=
GET /api/v1/foods/:id/health-index/
GET /api/v1/foods/:id/studies/
GET /api/v1/foods/:id/guide/
GET /api/v1/molecules/
GET /api/v1/molecules/:id/
GET /api/v1/molecules/search/?q=
GET /api/v1/studies/recent/
GET /api/v1/ban-list/
GET /api/v1/categories/
GET /api/v1/processing-methods/
POST /api/v1/scan/
GET /api/v1/stats/
```

**Notes:** Fully public - no JWT, no sessions, no user table. Rate limited (100 req/min/IP). Local-memory caching is configured by default. Page-number pagination is used on list endpoints.

---

## Phase 11: Web Frontend ⬜

**Goal:** Fast, beautiful, scientifically authoritative public website.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| Vite project setup | ✅ Complete | React 19 + TypeScript + Tailwind v4 |
| Layout component | ✅ Complete | Header, footer, navigation |
| Home page | ✅ Complete | Hero, stats, featured foods grid |
| Search page | ✅ Complete | Search input, results display |
| FoodDetail page | ✅ Complete | Full detail view with molecules, health index, studies |
| API client (`lib/api.ts`) | ✅ Complete | 8 API functions |
| TypeScript types | ✅ Complete | Food, Molecule, Study, HealthIndex |
| Molecule detail page | ✅ Complete | `web/src/pages/MoleculeDetail.tsx` implemented with tests |
| Compare page | ✅ Complete | `web/src/pages/Compare.tsx` implemented with tests |
| Ban list page | ✅ Complete | `web/src/pages/BanList.tsx` implemented with tests |
| Health index display | ✅ Complete | Numeric health/safety/bioavailability display implemented; charting can remain future polish |
| Dark mode | ✅ Complete | Zustand theme store and dark classes implemented |
| E2E tests (Playwright) | ⬜ Not started | Not configured |
| Hooks directory | ✅ Complete | `web/src/hooks/useApi.ts` implemented with tests |

**Notes:** Web app is functional with routed home, search, food detail, molecule detail, compare, ban list, and not-found pages. Local JS build verification still requires installing web dependencies.

---

## Phase 12: Mobile Application ⬜

**Goal:** The flagship consumer product — no login required.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| Expo project setup | ✅ Complete | SDK 52, TypeScript, React Navigation |
| App.tsx navigation | ✅ Complete | Stack navigator with 4 screens |
| HomeScreen | ✅ Complete | Title, subtitle, navigation buttons |
| SearchScreen | ✅ Complete | API-backed search results and navigation |
| FoodDetailScreen | ✅ Complete | API-backed detail screen with molecules |
| ScanScreen | ✅ Complete | Camera/gallery image scan posts to backend `/scan/` |
| History store (`useHistoryStore.ts`) | ✅ Complete | Zustand + AsyncStorage |
| EAS build profiles | ✅ Complete | Development, preview, and production profiles in `mobile/eas.json` |
| iOS build | ⬜ Not started | Requires Apple account and bundle identifier |
| Android build | ⬜ Not started | Requires Google Play account and package identifier |
| Components directory | ⬜ Empty | Directory exists, no files |
| Hooks directory | ⬜ Not started | Missing |

**Notes:** Mobile app has API-backed search/detail and OCR scan flows. Native build, physical-device permission testing, and real-label OCR validation remain open.

---

## Phase 13: AI / OCR Ingredient Scanner ⬜

**Goal:** Accurately extract ingredient lists from product label photos.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `ocr/README.md` | ✅ Complete | Architecture documentation |
| `ocr/src/pipeline/scan.py` | ✅ Complete | Tesseract ingredient extraction pipeline |
| Backend scan API | ✅ Complete | `/api/v1/scan/` accepts image uploads |
| Mobile scan flow | ✅ Complete | Expo camera and image picker submit to backend scan API |

**Notes:** OCR is backend-driven for MVP readiness. Device camera/gallery capture is handled by Expo, then the Django scan endpoint runs the Tesseract pipeline and returns matched foods and molecules.

---

## Phase 14: Launch, Analytics & Scaling ⬜

**Goal:** Measure, iterate, and scale.

**Deliverables Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| `docs/launch_checklist.md` | ✅ Complete | Comprehensive launch checklist |
| `docs/scaling.md` | ✅ Complete | Scaling roadmap across user milestones |
| `backend/core/analytics.py` | ✅ Complete | Privacy-first analytics (IP hashing, no cookies) |
| SEO optimization | ⬜ Not started | SSR/pre-rendering needed |
| Sitemap generation | 🟡 Partial | Static route sitemap and robots.txt created; dynamic food/molecule sitemap needs production data |
| App store listings | ⬜ Not started | Needed |
| Press kit | ⬜ Not started | Not created |
| GitHub ISSUE_TEMPLATE | ✅ Complete | new_food.md, ban_list_nomination.md |

**Notes:** Foundation laid for launch. Analytics are privacy-first (no cookies, IP hashing, daily buckets). Scaling roadmap covers 0 to 1M+ users.

---

## Summary: All Files Across All Phases

| Phase | Files | Status |
|-------|-------|--------|
| Phase 0 | 4 docs + README + LICENSE | Complete |
| Phase 1 | docker-compose.yml, supabase-config.md, .env.example, render.yaml | Complete |
| Phase 2 | 10 models, 5 schemas, admin.py, ER diagram, migrations | Complete |
| Phase 3 | 13 Python files (pipeline + fetchers + transformers + loaders) | Pipeline code done, data partial |
| Phase 4 | consensus_selector.py, dispatcher.py, parsers.py, 5 prompts, 3 test files | Complete |
| Phase 5 | pubmed_watcher.py, study_analyzer.py, safety_adjuster.py, ai_override.py | Complete |
| Phase 6 | template.md, generate_guides.py, update_guide.py | Template + scripts done, 0 guides |
| Phase 7 | harm_levels.md, harm_types.md, health_index.py | Complete |
| Phase 8 | methods.md, MoleculeNeutralization model | Methods doc done, data empty |
| Phase 9 | ban_list.md, BanListEntry model | Doc + model done, data empty |
| Phase 10 | 16 views, 9 serializers, settings.py, urls.py, admin.py | Complete |
| Phase 11 | 3 pages, Layout, API client, types | Pages complete, 3 pages missing |
| Phase 12 | 4 screens, navigation, history store | Scaffolded, mostly placeholder |
| Phase 13 | ocr/README.md, scan.py | Architecture done, not integrated |
| Phase 14 | launch_checklist.md, scaling.md, analytics.py, issue templates | Foundation laid |
