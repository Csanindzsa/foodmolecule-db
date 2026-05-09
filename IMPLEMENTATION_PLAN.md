# nutrii — Comprehensive Implementation Plan

> **Project:** nutrii (formerly Nutri / FoodMolecule-DB)  
> **Vision:** A fully autonomous, AI-driven database that maps every known food ingredient on Earth to its molecular composition, continuously updates safety scores from live PubMed research via OpenRouter LLMs, and delivers real-time health intelligence through a web platform and mobile app with ingredient scanning.  
> **Core Principle:** No human gatekeepers. No authentication walls. Science-backed, automatically evolving, completely open.

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Project Architecture Overview](#project-architecture-overview)
3. [Phase 0 — Legacy Audit & Project Bootstrap](#phase-0--legacy-audit--project-bootstrap)
4. [Phase 1 — Infrastructure & Database (Supabase)](#phase-1--infrastructure--database-supabase)
5. [Phase 2 — Data Architecture & Schema](#phase-2--data-architecture--schema)
6. [Phase 3 — Automated Data Collection Pipeline](#phase-3--automated-data-collection-pipeline)
7. [Phase 4 — OpenRouter AI Agent System](#phase-4--openrouter-ai-agent-system)
8. [Phase 5 — PubMed Auto-Ingestion & Safety Adjustment Pipeline](#phase-5--pubmed-auto-ingestion--safety-adjustment-pipeline)
9. [Phase 6 — Agent Instruction Guide System](#phase-6--agent-instruction-guide-system)
10. [Phase 7 — Harm Classification & Health Index Engine](#phase-7--harm-classification--health-index-engine)
11. [Phase 8 — Processing & Neutralization Guide](#phase-8--processing--neutralization-guide)
12. [Phase 9 — Ban List & Regulatory Mapping](#phase-9--ban-list--regulatory-mapping)
13. [Phase 10 — Backend API (Django + DRF)](#phase-10--backend-api-django--drf)
14. [Phase 11 — Web Frontend (nutrii Website)](#phase-11--web-frontend-nutrii-website)
15. [Phase 12 — Mobile Application](#phase-12--mobile-application)
16. [Phase 13 — AI / OCR Ingredient Scanner](#phase-13--ai--ocr-ingredient-scanner)
17. [Phase 14 — Launch, Analytics & Scaling](#phase-14--launch-analytics--scaling)
18. [Technology Stack](#technology-stack)
19. [Folder Structure](#folder-structure)
20. [Data Sources](#data-sources)
21. [Appendix A: AI Prompt Templates](#appendix-a-ai-prompt-templates)
22. [Appendix B: Mobile App Feature Specification](#appendix-b-mobile-app-feature-specification)

---

## Executive Summary

nutrii is a ground-up rebuild of Nutri with a radical shift in philosophy: **the database is alive**. There are no human moderators, no contributor tiers, no login walls, and no manual curation queues. Instead:

1. **Automated data ingestion** continuously pulls from USDA, FooDB, PubChem, and PubMed.
2. **An OpenRouter-powered AI agent swarm** reads new PubMed studies as they appear, generates summaries, and automatically adjusts ingredient safety scores.
3. **Per-ingredient agent instruction guides** (Markdown) ensure the AI applies consistent, evidence-based reasoning.
4. **A public web platform and mobile app** deliver this intelligence freely to anyone — no accounts required.

The database lives on **Supabase (PostgreSQL)**. The backend is **Django REST Framework**. The web frontend is **React + TypeScript**. The mobile app is **React Native (Expo)**. All AI inference routes through **OpenRouter**, with a custom consensus selector that dynamically picks the strongest available model.

---

## Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Web App    │  │  Mobile App  │  │  3rd Party   │                  │
│  │  (React/TS)  │  │(React Native)│  │   Consumers  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PUBLIC API (Django + DRF)                          │
│         No authentication. Rate limiting only. Caching enabled.         │
└─────────────────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐
│   Supabase PG   │ │   OpenRouter │
│   (Primary DB)  │ │   AI Agents  │
└─────────────────┘ └──────────────┘
          │
    ┌─────┘
    ▼
┌────────┐
│Storage │
│(Images)│
└────────┘
```

---

## Phase 0 — Legacy Audit & Project Bootstrap

### Goal
Analyze the existing Nutri codebase, extract reusable patterns, and formally deprecate the old data model.

### Tasks
- [ ] **Code Archaeology:** Document Nutri's Django models, serializers, and React component structure.
- [ ] **Asset Inventory:** List images, icons, and design tokens that can be reused.
- [ ] **Technical Debt Log:** Record all known issues from Nutri (hardcoded secrets, CORS `*`, SQLite in production, etc.) to avoid repeating them.
- [ ] **Rebrand Setup:**
  - Rename all references from `Nutri` → `nutrii`
  - Register domains / verify `nutrii.*` availability
  - Generate new logo assets and color palette
- [ ] **Repo Restructure:** Create a clean monorepo layout (see [Folder Structure](#folder-structure)).

### Deliverables
- `docs/legacy_audit.md` — Full breakdown of what to keep, rewrite, or discard
- `docs/technical_debt.md` — Checklist of anti-patterns to avoid
- Rebranded `README.md` and `LICENSE.md`

---

## Phase 1 — Infrastructure & Database (Supabase)

### Goal
Provision production-grade infrastructure. No authentication layer — the API is fully public.

### 1.1 Supabase Project Setup
- [ ] Create Supabase project (`nutrii-db`)
- [ ] Configure **Database Roles**:
  - `anon` — public read-only on all published tables
  - `service_role` — backend-only, full access for data ingestion and AI agents
- [ ] Enable **Connection Pooling (PgBouncer)** for serverless workloads
- [ ] Set up **Supabase Storage** buckets:
  - `food-images` — public, optimized with CDN
  - `molecule-structures` — SVG/PNG molecular diagrams
  - `study-attachments` — optional PDFs or images linked to PubMed entries

### 1.2 Local Development Environment
- [ ] Docker Compose file with:
  - PostgreSQL 16 (matching Supabase version)
- [ ] Environment variable template (`.env.example`) including `OPENROUTER_API_KEY`
- [ ] Database migration strategy:
  - Django ORM manages schema migrations
  - Seed scripts for local development

### 1.3 Security Hardening
- [ ] Rotate all secrets (no hardcoded `SECRET_KEY` like Nutri)
- [ ] Configure CORS with an explicit allow-list
- [ ] API rate limiting via Django Ratelimit or Nginx
- [ ] Enable Supabase **Audit Logging** (pgaudit) for data integrity

### Deliverables
- [ ] `infra/docker-compose.yml`
- [ ] `infra/supabase-config.md`
- [ ] `.env.example`
- [ ] Working local PostgreSQL instance with initial migration

---

## Phase 2 — Data Architecture & Schema

### Goal
Design the canonical relational schema. No user tables, no auth tables, no contribution queues. The database is purely a scientific document store with AI audit trails.

### 2.1 Core Entities

#### `foods` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `name` | VARCHAR(255) | NOT NULL, unique per category |
| `aliases` | TEXT[] | GIN indexed for fast alias search |
| `category` | VARCHAR(100) | FK → `food_categories` |
| `origin` | VARCHAR(255) | nullable |
| `overall_safety_score` | SMALLINT | 0–100, updated by AI agents |
| `health_index` | SMALLINT | 0–100, updated by AI agents |
| `ban_listed` | BOOLEAN | DEFAULT FALSE |
| `image_url` | TEXT | nullable |
| `metadata` | JSONB | flexible source links, regional data |
| `ai_guide_version` | INT | links to current agent instruction guide |
| `last_analyzed_at` | TIMESTAMPTZ | when AI last reviewed this food |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `molecules` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `pubchem_cid` | BIGINT | UNIQUE, indexed |
| `name` | VARCHAR(255) | NOT NULL, unique |
| `iupac_name` | VARCHAR(500) | nullable |
| `cas_number` | VARCHAR(50) | nullable, indexed |
| `molecular_formula` | VARCHAR(100) | nullable |
| `molecular_weight` | DECIMAL(10,4) | nullable |
| `harm_level` | SMALLINT | 0–5 (auto-adjusted by AI from new studies) |
| `harm_mechanisms` | TEXT[] | plain-language descriptions |
| `threshold_concern_mg_per_day` | DECIMAL(10,4) | nullable |
| `is_heat_stable` | BOOLEAN | DEFAULT TRUE |
| `is_neutralizable` | BOOLEAN | DEFAULT FALSE |
| `structure_image_url` | TEXT | nullable |
| `metadata` | JSONB | references, synonyms, etc. |

#### `food_molecules` (junction)
| Column | Type | Notes |
|--------|------|-------|
| `food_id` | UUID | FK → foods |
| `molecule_id` | UUID | FK → molecules |
| `amount_per_100g` | DECIMAL(12,6) | nullable if unknown |
| `unit` | VARCHAR(20) | mg, µg, g, IU, etc. |
| `amount_notes` | TEXT | e.g., "varies by cultivar" |
| `is_beneficial` | BOOLEAN | context-dependent flag |

#### `studies` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `pmid` | VARCHAR(20) | UNIQUE, indexed |
| `title` | TEXT | NOT NULL |
| `authors` | TEXT[] | nullable |
| `journal` | VARCHAR(255) | nullable |
| `publication_year` | SMALLINT | nullable |
| `url` | TEXT | PubMed or DOI link |
| `abstract` | TEXT | nullable |
| `ai_summary` | TEXT | generated by OpenRouter agent |
| `ai_safety_impact` | SMALLINT | −5 to +5, AI-assessed impact on safety perception |
| `ai_health_impact` | SMALLINT | −5 to +5, AI-assessed impact on health perception |
| `ai_confidence` | VARCHAR(20) | `high`, `medium`, `low` |
| `ai_model_used` | VARCHAR(100) | which OpenRouter model analyzed this |
| `analyzed_at` | TIMESTAMPTZ | when AI processed this study |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `food_studies` (junction)
| Column | Type | Notes |
|--------|------|-------|
| `food_id` | UUID | FK → foods |
| `study_id` | UUID | FK → studies |
| `relevance_score` | DECIMAL(3,2) | 0.00–1.00, how relevant the study is to this food |
| `linked_by` | VARCHAR(50) | `auto_ingestion` or `ai_cross_reference` |

#### `safety_score_revisions` table (audit trail)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `food_id` | UUID | FK → foods |
| `old_safety_score` | SMALLINT | previous value |
| `new_safety_score` | SMALLINT | updated value |
| `old_health_index` | SMALLINT | previous value |
| `new_health_index` | SMALLINT | updated value |
| `reason` | TEXT | AI-generated explanation for the change |
| `triggering_study_id` | UUID | FK → studies (nullable if bulk recompute) |
| `ai_model_used` | VARCHAR(100) | model that proposed the change |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `ingredient_ai_guides` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `food_id` | UUID | FK → foods, nullable (generic guides exist) |
| `molecule_id` | UUID | FK → molecules, nullable |
| `guide_markdown` | TEXT | the agent instruction document |
| `version` | INT | incremented on each regeneration |
| `generated_by` | VARCHAR(100) | OpenRouter model name |
| `generated_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `processing_methods` table
| Column | Type |
|--------|------|
| `id` | SERIAL PK |
| `name` | VARCHAR(100) |
| `description` | TEXT |
| `mechanism` | TEXT |
| `typical_temperature_c` | SMALLINT |
| `typical_duration_min` | SMALLINT |

#### `molecule_neutralizations` (junction)
| Column | Type | Notes |
|--------|------|-------|
| `molecule_id` | UUID | FK |
| `method_id` | INT | FK |
| `reduction_percent_min` | SMALLINT | 0–100 |
| `reduction_percent_max` | SMALLINT | 0–100 |
| `time_required` | VARCHAR(100) | human readable |
| `notes` | TEXT | e.g., "discard soaking water" |
| `evidence_refs` | TEXT[] | PubMed IDs |

#### `ban_list` table
| Column | Type |
|--------|------|
| `id` | UUID PK |
| `food_id` | UUID FK → foods |
| `reason` | TEXT |
| `lethal_dose_mg` | DECIMAL(10,4) |
| `is_conditionally_safe` | BOOLEAN |
| `safe_condition` | TEXT |
| `regulatory_status` | JSONB | `{ "EU": "banned", "USA": "restricted" }` |

### 2.2 Schema Files (JSON for interchange)
- Keep `schema/food.schema.json`, `schema/molecule.schema.json`, `schema/ban_list.schema.json` for **data import/export validation**.
- Add `schema/study.schema.json` for PubMed study interchange.
- Add `schema/ai_guide.schema.json` for agent instruction validation.

### Deliverables
- [ ] Django models mirroring the tables above
- [ ] Initial migrations
- [ ] `schema/*.schema.json` updated
- [ ] Entity-Relationship diagram (`docs/er-diagram.md`)

---

## Phase 3 — Automated Data Collection Pipeline

### Goal
Populate the database with the first 1,000 foods and 2,000 molecules — entirely automatically. No manual curation dashboard. No human reviewers.

### 3.1 Priority Matrix

| Priority | Group | Target Count | Example |
|----------|-------|-------------|---------|
| P0 | Staple grains & cereals | 50 | wheat, rice, oats, corn, quinoa |
| P0 | Top vegetables | 75 | spinach, potato, tomato, onion, garlic |
| P0 | Top fruits | 75 | apple, banana, orange, grape, blueberry |
| P0 | Legumes | 40 | kidney bean, chickpea, lentil, soybean, peanut |
| P0 | Animal products | 50 | beef, chicken, egg, milk, cheese, yogurt |
| P1 | Seafood | 40 | salmon, tuna, shrimp, cod, sardine |
| P1 | Nuts & seeds | 35 | almond, walnut, chia, flax, sesame |
| P1 | Herbs & spices | 50 | turmeric, black pepper, oregano, cinnamon |
| P1 | Oils & fats | 25 | olive oil, butter, coconut oil, lard |
| P1 | Sweeteners | 15 | sucrose, honey, maple syrup, stevia |
| P2 | Processed foods | 100 | bread, pasta, tofu, yogurt, cheese |
| P2 | Additives & preservatives | 80 | citric acid, sodium benzoate, xanthan gum |
| P2 | Beverages | 40 | coffee, tea, wine, beer, juice |
| P3 | Exotic / regional | 200 | ackee, durian, teff, amaranth, sea buckthorn |

### 3.2 Automated Pipeline Scripts

```
scripts/
  pipeline/
    __init__.py
    config.py               # API keys, rate limits, source configs
    models.py               # Pydantic models for pipeline data
  fetchers/
    fetch_usda.py           # USDA FoodData Central → foods + basic nutrients
    fetch_foodb.py          # FooDB → phytochemicals, flavor compounds
    fetch_pubchem.py        # PubChem PUG-REST → molecular properties
    fetch_pubmed.py         # E-utilities → study metadata and abstracts
    fetch_chembl.py         # ChEMBL → bioactivity data
    fetch_efsa.py           # EFSA OpenFoodTox → regulatory assessments
  transformers/
    normalizer.py           # Canonical names, unit conversions
    deduplicator.py         # Merge "spinach" vs "Spinacia oleracea"
    harm_classifier.py      # Auto-tag based on IARC/EFSA lists
  loaders/
    bulk_insert.py          # COPY/upsert into Supabase
    validate.py             # Run JSON Schema validation before insert
    generate_embeddings.py  # Create text embeddings for semantic search
```

### 3.3 Quality Assurance (Automated, Not Manual)
- Every auto-imported molecule is **cross-validated** against ≥2 sources before insertion.
- Conflicts trigger an **AI arbitration** call to OpenRouter (e.g., "USDA says X, FooDB says Y — reconcile").
- Low-confidence entries (<0.7 agreement) are flagged in `metadata.confidence = "low"` but still published transparently.

### Deliverables
- [ ] All fetcher scripts with retry logic and rate limiting
- [ ] `data/seed/` with first 500 auto-ingested foods as JSON
- [ ] `data/seed/` with first 500 auto-ingested molecules as JSON
- [ ] `scripts/validate.py` with automated quality gates

---

## Phase 4 — OpenRouter AI Agent System

### Goal
Build the central nervous system of nutrii: a dynamic model selector and structured inference pipeline that routes all AI tasks through OpenRouter.

### 4.1 Consensus Model Selector

Every time an AI task runs, the system queries OpenRouter's `/api/v1/models` endpoint and scores available models by:

```
model_score = (context_length * 0.2) + (strength_score * 0.5) + (availability_score * 0.3)
```

Where:
- `strength_score` = OpenRouter's published model capability rating (or custom benchmark)
- `availability_score` = inverse of current latency / error rate
- `context_length` = max tokens the model supports (important for long PubMed abstracts)

The top-scoring model is selected automatically. If it fails, the runner-up is used.

### 4.2 Agent Dispatcher

All AI tasks route through a single dispatcher:

```python
# scripts/ai/dispatcher.py
class OpenRouterDispatcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.selector = ConsensusSelector()

    async def dispatch(
        self,
        task_type: Literal["study_analysis", "safety_adjustment", "guide_generation", "conflict_arbitration"],
        prompt: str,
        json_mode: bool = True,
    ) -> AIResponse:
        model = await self.selector.pick_best_model(task_type)
        return await self._call_openrouter(model, prompt, json_mode)
```

### 4.3 Structured Output Parsing

All AI responses are requested in **JSON mode** with strict Pydantic schemas:

- `StudyAnalysisResponse` — summary, safety_impact, health_impact, confidence
- `SafetyAdjustmentResponse` — new_safety_score, new_health_index, reasoning
- `GuideGenerationResponse` — markdown_content, version
- `ConflictArbitrationResponse` — resolved_value, confidence, explanation

### 4.4 Prompt Registry

All prompts live as version-controlled Jinja2 templates in `ai/prompts/`:

```
ai/prompts/
  study_analysis.j2
  safety_adjustment.j2
  guide_generation.j2
  conflict_arbitration.j2
  molecule_classification.j2
```

This allows A/B testing prompts and rolling back if a prompt degradation is detected.

### Deliverables
- [ ] `ai/consensus_selector.py` — dynamic model picker
- [ ] `ai/dispatcher.py` — unified inference router
- [ ] `ai/parsers.py` — Pydantic validators for all AI outputs
- [ ] `ai/prompts/*.j2` — version-controlled prompt templates
- [ ] `ai/tests/test_consensus_selector.py`
- [ ] `ai/tests/test_dispatcher.py`

---

## Phase 5 — PubMed Auto-Ingestion & Safety Adjustment Pipeline

### Goal
Continuously monitor PubMed for new studies related to nutrii ingredients, automatically analyze them, link them to foods/molecules, generate summaries, and update safety scores — all without human intervention.

### 5.1 PubMed Watcher

A scheduled job (every 6 hours) runs:

```python
# scripts/pubmed_watcher.py
async def poll_pubmed():
    for ingredient in all_ingredients():
        new_studies = pubmed.esearch(
            term=ingredient.search_query,  # e.g., "spinach[Title/Abstract] AND toxicity"
            mindate=yesterday,
            retmax=50,
        )
        for study in new_studies:
            if not already_in_db(study.pmid):
                await ingest_study(study)
```

Search queries are dynamically generated from ingredient names + synonym lists + relevant MeSH terms.

### 5.2 Study Analysis Flow

For each newly discovered study:

```
1. Fetch metadata + abstract via E-utilities
2. Send to OpenRouter agent with prompt:
   "You are a nutritional toxicology analyst. Read this study and determine:
    - What food or molecule is primarily studied?
    - What is the key finding regarding safety or health impact?
    - Does this increase, decrease, or leave unchanged our confidence in the ingredient's safety?
    - Rate your confidence in this assessment."
3. Parse JSON response → `studies` table row
4. Run fuzzy match against `foods.aliases` and `molecules.name`
5. Insert `food_studies` junction row with `relevance_score`
```

### 5.3 Safety Score Auto-Adjustment

When a study with `|ai_safety_impact| >= 2` is linked to a food:

```
1. Dispatch `safety_adjustment` agent
2. Agent receives:
   - Current food profile (molecules, scores, processing methods)
   - New study summary
   - Agent instruction guide for this food (see Phase 6)
3. Agent returns:
   - Proposed new_safety_score (0–100)
   - Proposed new_health_index (0–100)
   - Reasoning (max 300 words, human-readable)
4. System validates: score delta cannot exceed ±15 in a single update
   (prevents hallucination swings)
5. If validation passes:
   - Update `foods.overall_safety_score` and `foods.health_index`
   - Insert row into `safety_score_revisions` (full audit trail)
   - Update `foods.last_analyzed_at`
```

### 5.4 Ingredient Page Auto-Update

Because the web frontend reads directly from the API:
- A new study appears on the ingredient page **immediately** after ingestion
- The AI summary is displayed in a "Latest Research" panel
- Older studies are sorted by `publication_year` desc
- Score changes are shown with a small trend indicator (↗ ↘ →) and a tooltip linking to the `safety_score_revisions` explanation

### 5.5 Bulk Re-Analysis

Quarterly, a full re-analysis job runs:
- Re-evaluates all foods against their complete study corpus
- Regenerates all AI summaries with the latest (stronger) model
- Recomputes safety scores holistically rather than incrementally
- Produces a `docs/quarterly_report.md` automatically

### Deliverables
- [ ] `scripts/pubmed_watcher.py`
- [ ] `scripts/study_analyzer.py`
- [ ] `scripts/safety_adjuster.py`
- [ ] `ai/prompts/study_analysis.j2`
- [ ] `ai/prompts/safety_adjustment.j2`
- [ ] Scheduled job configuration (systemd timer or cron)
- [ ] `docs/quarterly_report.md` template

---

## Phase 6 — Agent Instruction Guide System

### Goal
Ensure the AI agents apply consistent, evidence-based reasoning by giving each ingredient (or ingredient class) a dedicated Markdown instruction guide.

### 6.1 Guide Structure

Every guide follows a strict template:

```markdown
# Agent Guide: {ingredient_name}

## Classification
- Primary category: {category}
- Known harmful molecules: [list]
- Known beneficial molecules: [list]

## Safety Scoring Rules
- Baseline safety score: {X}
- Critical modifiers:
  - [specific rule, e.g., "If study mentions kidney stone risk, reduce by 5"]
- Processing dependencies:
  - [e.g., "Raw score is 15 points lower than cooked score"]

## Study Interpretation Guidelines
- **High-weight journals:** Nature, Lancet, JAMA, BMJ, Cell Metabolism
- **Distinguish:** in-vitro vs. animal vs. human RCT evidence
- **Red flags:** single-study claims, conflicts of interest, retracted papers
- **Always check:** sample size, p-values, effect sizes

## Historical Context
- [Summary of why this ingredient has the score it currently has]
- [Key landmark studies that shaped the current assessment]

## Update Log
- v1 — {date} — Initial guide generated by {model}
```

### 6.2 Guide Generation

Initial guides are auto-generated by OpenRouter during Phase 3 data ingestion:

```python
async def generate_guide(food: Food):
    prompt = guide_generation_template.format(
        food_name=food.name,
        molecules=food.molecules.all(),
        current_score=food.health_index,
    )
    response = await ai_dispatcher.dispatch("guide_generation", prompt)
    return IngredientAIGuide(
        food=food,
        guide_markdown=response.markdown_content,
        version=1,
    )
```

### 6.3 Guide Evolution

When a new study triggers a safety adjustment, the agent also proposes a guide update if the study reveals a new pattern. The update is appended to the `Update Log` section and `version` is incremented.

### 6.4 Storage

Guides live in two places:
1. **Database:** `ingredient_ai_guides` table (source of truth for the backend)
2. **Git Repository:** `guides/ingredients/{food_id}.md` (human-readable, version-controlled backup)

### Deliverables
- [ ] `guides/template.md` — canonical guide template
- [ ] `guides/ingredients/*.md` — one guide per top-500 ingredient
- [ ] `ai/prompts/guide_generation.j2`
- [ ] `scripts/generate_guides.py`
- [ ] `scripts/update_guide.py` — triggered after safety adjustments

---

## Phase 7 — Harm Classification & Health Index Engine

### Goal
Define the scoring framework that the AI agents use. The algorithm is **rule-based at the core** but **AI-augmented at the edges** — the agents can propose deviations from the formula when compelling new evidence emerges.

### 7.1 Harm Levels

| Level | Label | Definition |
|-------|-------|-----------|
| 0 | `none` | No known harm at any realistic dietary amount |
| 1 | `negligible` | Theoretically harmful only at >100× normal intake |
| 2 | `low` | Mild effects in sensitive sub-populations |
| 3 | `moderate` | Documented adverse effects at normal dietary ranges |
| 4 | `high` | Harmful at common consumption; regulatory warnings exist |
| 5 | `critical` | Acutely toxic; lethal at small doses |

### 7.2 Harm Types
- `carcinogen`, `endocrine_disruptor`, `neurotoxin`, `hepatotoxin`, `nephrotoxin`, `cardiotoxin`
- `gut_irritant`, `allergen`, `inflammatory`, `oxidative_stress`
- `mineral_absorption_inhibitor`, `protease_inhibitor`, `digestive_enzyme_inhibitor`
- `goitrogen`, `cyanogenic`, `mycotoxin`, `heavy_metal`
- `persistent_organic_pollutant`, `pesticide_residue`, `artificial_sweetener`

### 7.3 The nutrii Health Index (NHI) — Base Algorithm

```
NHI = (Benefit_Score * 0.4) + (Safety_Score * 0.4) + (Bioavailability_Score * 0.2)
```

**Benefit_Score (0–100):**
- Vitamins & minerals: +2 to +5 each
- Polyphenols / antioxidants: +1 to +3 each
- Fiber: +1 per gram
- Omega-3 fatty acids: +2 per gram

**Safety_Score (0–100):**
- Start at 100
- Penalties: `critical` −40, `high` −20, `moderate` −10, `low` −3, `negligible` −1
- Synergy multiplier (≥2 `high`/`moderate`): 1.2× penalties
- Preparation modifier (raw + non-neutralizable `moderate+`): −5

**Bioavailability_Score (0–100):**
- Penalize antinutrient load unless neutralization is standard

### 7.4 AI Override Protocol

The base algorithm produces the initial score. The AI agent can propose an override **only if**:
1. A new PubMed study provides direct human RCT evidence
2. The agent cites the specific PMID in its reasoning
3. The override delta is within ±15 points
4. The override is logged in `safety_score_revisions`

This creates a **transparent, auditable** system where scores are mostly formulaic but can evolve with science.

### Deliverables
- [ ] `classification/harm_levels.md`
- [ ] `classification/harm_types.md`
- [ ] `core/health_index.py` — base algorithm implementation
- [ ] `core/ai_override.py` — AI adjustment validator
- [ ] `core/tests/test_health_index.py`

---

## Phase 8 — Processing & Neutralization Guide

### Goal
For every harmful molecule, document whether and how it can be neutralized, with evidence-backed reduction percentages.

### 8.1 Methods Matrix

| Method | Temp / Time | Mechanism | Key Compounds |
|--------|-------------|-----------|---------------|
| **Boiling** | 100°C, 10–30 min | Leaching, thermal degradation | Oxalates, nitrates, lectins |
| **Pressure cooking** | 120°C, 15–45 min | Higher temp hydrolysis | Lectins, phytates |
| **Soaking** | Room temp, 8–24 h | Hydration + enzyme activation | Phytates, saponins, lectins |
| **Fermentation** | 20–40°C, 12–72 h | Microbial metabolism | Phytates, lactose, oligosaccharides |
| **Sprouting** | Room temp, 2–5 days | Endogenous enzyme activation | Phytates, lectins |
| **Roasting** | >180°C, 10–30 min | Maillard + thermal breakdown | Some mycotoxins, lectins |
| **Steaming** | 100°C steam, 5–20 min | Gentle heat, minimal leaching | Glycoalkaloids (partial) |
| **Peeling** | N/A | Remove surface concentrate | Pesticides, glycoalkaloids |
| **Acidification** | pH < 4 | Hydrolysis, protonation | Some toxins, nitrates |
| **Enzyme treatment** | 37–55°C | Specific catalysis | Phytates (phytase), gluten (protease) |
| **Dehydration** | 50–70°C | Concentration (sometimes bad) | — |
| **Freezing** | −18°C | Cell rupture (affects texture) | Some antinutrients |

### 8.2 Compound-Level Processing Notes
Each `molecule_neutralizations` entry must include:
- `reduction_percent_min` and `max`
- `time_required`
- `temperature_c`
- `critical_step`
- `evidence_refs` (PubMed IDs)
- `confidence` (`high`, `medium`, `low`)

### Deliverables
- [ ] `processing/methods.md`
- [ ] `processing/compound_matrix.csv`
- [ ] Processing data populated for top 100 harmful molecules

---

## Phase 9 — Ban List & Regulatory Mapping

### Goal
Maintain the definitive list of foods or preparations that cannot be made safe, plus conditional warnings.

### 9.1 Ban Criteria (ANY triggers entry)
1. Contains `critical` compound that is heat-stable AND has no known antidote
2. Contains multiple `high`-level compounds with documented synergy
3. Banned in ≥2 major regulatory jurisdictions (EU, USA, Canada, Australia, Japan)
4. No preparation method reduces cumulative harm below `moderate`

### 9.2 Conditional Warnings
- **Kidney beans** — Safe ONLY after boiling ≥10 min; slow-cooker unsafe
- **Cassava / tapioca** — Safe ONLY after peeling + thorough boiling
- **Puffer fish** — Safe ONLY when prepared by licensed fugu chef
- **Star fruit** — Safe ONLY for individuals with normal kidney function
- **Alfalfa sprouts** — High Salmonella risk; vulnerable populations should avoid raw

### 9.3 Regulatory Status Tracking
```json
{
  "EU": { "status": "banned", "regulation": "EC 1333/2008", "date": "2008-12-16" },
  "USA": { "status": "restricted", "agency": "FDA", "note": "GRAS with limits" },
  "Codex": { "status": "permitted", "max_ppm": 50 }
}
```

### Deliverables
- [ ] `ban_list/ban_list.json` + `ban_list.md`
- [ ] `ban_list/conditional_warnings.md`
- [ ] `ban_list/regulatory_tracker.md`

---

## Phase 10 — Backend API (Django + DRF)

### Goal
A completely public, read-only API. No authentication. No user management. Just pure data.

### 10.1 Database Layer
- Django ORM with `psycopg2-binary`
- Custom managers for:
  - `Food.objects.with_molecule_summary()`
  - `Food.objects.with_recent_studies(days=30)`
  - `Food.objects.by_health_index(min, max)`
- PostgreSQL-specific features:
  - GIN indexes on `aliases`, `harm_mechanisms`, `metadata`
  - Partial indexes on `ban_listed = TRUE`
  - Trigram indexes for fuzzy text search (`pg_trgm`)

### 10.2 API Endpoints (All Public)

```
GET  /api/v1/foods                          → paginated list
GET  /api/v1/foods/:id                      → detail with all molecules + latest studies
GET  /api/v1/foods/search?q=&category=      → full-text search
GET  /api/v1/foods/compare?ids=             → side-by-side molecule comparison
GET  /api/v1/foods/:id/health-index         → computed NHI breakdown + revision history
GET  /api/v1/foods/:id/studies              → all linked PubMed studies with AI summaries
GET  /api/v1/foods/:id/guide                → agent instruction guide (Markdown)
GET  /api/v1/molecules                     → paginated list
GET  /api/v1/molecules/:id                 → detail with foods & neutralization
GET  /api/v1/molecules/search?q=            → search by name, CAS, CID
GET  /api/v1/ban-list                      → full ban list
GET  /api/v1/categories                    → food categories tree
GET  /api/v1/processing-methods            → all methods
GET  /api/v1/studies/recent                → latest 50 analyzed studies
GET  /api/v1/stats                         → platform stats (food count, molecule count, study count)
```

### 10.3 No Authentication
- **No JWT.** No sessions. No user table.
- Rate limiting only: 100 requests/minute per IP (configurable via `RATE_LIMIT_REQUESTS_PER_MINUTE`)
- CORS allow-list for known domains

### 10.4 Performance
- In-memory caching (Django LocMemCache) for:
  - Food detail pages
  - Health index scores
  - Search results
- Database query optimization:
  - `select_related` + `prefetch_related` on all list endpoints
  - Cursor pagination for large lists

### Deliverables
- [ ] Complete Django project in `backend/`
- [ ] Full test suite (`pytest-django`)
- [ ] API documentation (Swagger / drf-spectacular)
- [ ] Load testing script (`locustfile.py`)

---

## Phase 11 — Web Frontend (nutrii Website)

### Goal
Build the public-facing website: fast, beautiful, scientifically authoritative, and fully accessible without logging in.

### 11.1 Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **State Management:** TanStack Query + Zustand
- **Data Visualization:** Recharts + custom SVG radar charts
- **Search:** PostgreSQL full-text (pg_trgm)
- **Hosting:** Vercel

### 11.2 Pages & Features

#### Home
- Hero search bar ("Search 10,000+ foods, molecules, and research...")
- Featured: "Highest Health Index Foods", "Most Dangerous Common Foods", "Latest AI-Analyzed Study"
- Live stats: food count, molecule count, studies analyzed today

#### Search Results
- Faceted filters: category, harm level, health index range, processing method
- Sort: relevance, health index (asc/desc), name, "most recently studied"

#### Food Detail Page
- Hero: name, image, NHI score (big circular gauge), safety label
- **Latest Research** panel: newest PubMed study + AI summary
- Tabs:
  - **Molecules** — list with harm/benefit badges
  - **Health Index Breakdown** — radar chart + revision history timeline
  - **Processing Guide** — step-by-step neutralization
  - **Studies** — all linked PubMed papers with AI summaries
  - **Agent Guide** — the Markdown instruction that governs this ingredient's AI analysis
- "Compare" button

#### Molecule Detail Page
- Structure image, harm explanation, foods containing it, neutralization chart, references

#### Ban List Page
- Sortable table with "Avoid Entirely" vs "Conditionally Safe" badges

#### Compare Mode
- Side-by-side up to 3 foods with molecule overlap and health index bars

### 11.3 Design System
- **Tone:** "PubMed meets Wirecutter"
- **Palette:** Warm white `#FAFAF9`, forest green `#166534`, safety gradient green→red
- **Typography:** `Inter` for UI, `Merriweather` for long-form
- **Accessibility:** WCAG 2.1 AA, full keyboard navigation

### Deliverables
- [ ] `web/` Vite project
- [ ] All pages implemented and responsive
- [ ] Light + dark mode
- [ ] E2E tests (Playwright)

---

## Phase 12 — Mobile Application

### Goal
The flagship consumer product. No login required. All data is local or fetched anonymously from the public API.

### 12.1 Tech Stack
- **Framework:** React Native (Expo) with TypeScript
- **State:** Zustand + TanStack Query
- **Navigation:** Expo Router
- **Camera / OCR:** Expo Camera + `expo-ml-kit`
- **Offline Support:** SQLite for local caching
- **Push Notifications:** None (no user accounts to push to)

### 12.2 Core User Flows

#### Flow 1: Ingredient Label Scan
1. Open app → Camera view with overlay guide
2. Tap shutter → capture image
3. Image sent to `/api/v1/scans` (anonymous, rate-limited by IP)
4. Backend OCR extracts text
5. Text parsed into ingredient list via fuzzy matching
6. Results screen:
   - Overall product score (0–100)
   - Color-coded ingredient list
   - Tap any ingredient → full nutrii detail page with latest AI summaries
   - "How to make safer" tips

#### Flow 2: Manual Ingredient Search
- Search bar with autocomplete against public API
- Full food/molecule detail pages

#### Flow 3: Browse & Discover
- Curated lists: "Top 10 Safest Breakfast Foods", "Foods You Should Never Eat Raw"

#### Flow 4: Local History & Favorites
- Scan history stored **locally** on device (SQLite / AsyncStorage)
- Favorites stored **locally**
- Settings stored **locally**
- No cloud sync, no accounts, no data collection

### 12.3 Offline Strategy
- Sync top 500 most-searched foods to local SQLite on first install
- Cache recent searches and detail pages
- Queue scans when offline; process when connection restored

### Deliverables
- [ ] `mobile/` Expo project
- [ ] iOS build (TestFlight)
- [ ] Android build (Play Store Internal Testing)
- [ ] On-device OCR fallback

---

## Phase 13 — AI / OCR Ingredient Scanner

### Goal
Accurately extract ingredient lists from photos of product labels.

### 13.1 Hybrid Architecture

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Cloud OCR** (Google Vision) | Highest accuracy, multilingual | Cost per scan, latency | Primary for complex images |
| **On-device ML** (ML Kit) | Free, instant, private | Lower accuracy | Fallback for simple labels |
| **Hybrid** | Best of both | More complex | **Chosen** |

### 13.2 Pipeline
```
1. Image capture → preprocess (deskew, contrast boost, binarize)
2. Try on-device OCR (fast path)
3. If confidence < 0.85 → upload to cloud OCR
4. Raw text → NLP parser
5. Fuzzy match against `foods.name` and `foods.aliases`
6. Return matched ingredients + confidence scores
```

### 13.3 NLP Ingredient Parser
- Rule-based parser first
- Handle: "May contain traces of...", "Produced in a facility...", parentheticals, percentages

### Deliverables
- [ ] `ai/ocr_pipeline.py`
- [ ] `ai/ingredient_parser.py`
- [ ] `ai/fuzzy_matcher.py`
- [ ] `ai/tests/` with real label photos

---

## Phase 14 — Launch, Analytics & Scaling

### Goal
Measure, iterate, and scale.

### 14.1 Launch Checklist
- [ ] SEO optimization (SSR or pre-rendering for food/molecule pages)
- [ ] Sitemap generation
- [ ] Social sharing cards (OpenGraph)
- [ ] App Store / Play Store listings
- [ ] Press kit (`docs/press-kit/`)

### 14.2 Analytics (Privacy-First, Anonymous)
- **Web:** Plausible Analytics (no cookies, no personal data)
- **Mobile:** Expo analytics (anonymous, aggregated)
- **Key Metrics:**
  - Daily searches
  - Scans per day (anonymous count)
  - Top searched foods
  - AI model performance (accuracy of safety adjustments vs. later consensus)
  - API usage by third parties

### 14.3 Scaling Roadmap
| Milestone | Users | Infrastructure Change |
|-----------|-------|----------------------|
| 0–10k | — | Supabase free tier + Vercel hobby |
| 10k–100k | — | Supabase Pro + Vercel Pro |
| 100k–1M | — | Supabase Enterprise + CDN + read replicas |
| 1M+ | — | Self-managed PG + dedicated OCR cluster |

### 14.4 Monetization (Future, Non-Intrusive)
- Everything is free. No paywalls on safety data.
- Optional nutrii Supporter ($3.99/mo):
  - Offline mode with full database sync
  - Dark mode themes
  - Early access to new AI features
- API keys for commercial use (tiered pricing)

### Deliverables
- [ ] Analytics dashboard
- [ ] Load testing report
- [ ] App store listings
- [ ] Monetization infrastructure (Stripe integration)

---

## Technology Stack

| Layer | Tool | Reason |
|-------|------|--------|
| **Database** | Supabase PostgreSQL | Managed, scalable, no auth required |
| **Backend** | Django 5 + DRF | Rapid API dev, mature ORM |
| **Cache** | Django LocMemCache | In-memory, no Redis needed (MVP) |
| **Search** | PostgreSQL pg_trgm | Full-text search via GIN indexes |
| **Web Frontend** | React 19 + Vite + Tailwind v4 | Fast DX, modern CSS |
| **Mobile** | Expo (React Native) | Single TS codebase, OTA updates |
| **OCR** | Google Vision API + ML Kit | Hybrid accuracy/speed |
| **AI Inference** | OpenRouter API | Access to strongest available LLMs dynamically |
| **AI Orchestration** | Python + Pydantic | Structured output parsing, prompt versioning |
| **Auth** | **None** | Fully public, no login walls |
| **Storage** | Supabase Storage | S3-compatible, CDN |
| **CI/CD** | GitHub Actions | Test, lint, build, deploy |
| **Hosting** | Vercel (web) + Supabase (data) | Global CDN, cost-effective |
| **Monitoring** | Sentry + UptimeRobot | Error tracking + uptime |

---

## Folder Structure

```
nutrii/
├── README.md
├── IMPLEMENTATION_PLAN.md
├── LICENSE.md
├── .env.example
│
├── infra/                          # Phase 1
│   ├── docker-compose.yml
│   └── supabase-config.md
│
├── docs/
│   ├── legacy_audit.md             # Phase 0
│   ├── technical_debt.md
│   ├── er-diagram.md
│   ├── health-index-algorithm.md
│   └── press-kit/
│
├── schema/                         # Phase 2
│   ├── food.schema.json
│   ├── molecule.schema.json
│   ├── ban_list.schema.json
│   ├── study.schema.json
│   └── ai_guide.schema.json
│
├── data/
│   ├── seed/                       # Phase 3
│   │   ├── foods/
│   │   └── molecules/
│   └── exports/                    # Weekly DB dumps
│
├── guides/                         # Phase 6
│   ├── template.md
│   └── ingredients/
│       ├── spinach.md
│       ├── kidney-bean.md
│       └── ...
│
├── ban_list/                       # Phase 9
│   ├── ban_list.json
│   ├── ban_list.md
│   ├── conditional_warnings.md
│   └── regulatory_tracker.md
│
├── classification/                 # Phase 7
│   ├── harm_levels.md
│   └── harm_types.md
│
├── processing/                     # Phase 8
│   ├── methods.md
│   └── compound_matrix.csv
│
├── scripts/                        # Phase 3 & 5
│   ├── pipeline/
│   ├── fetchers/
│   ├── transformers/
│   ├── loaders/
│   ├── pubmed_watcher.py
│   ├── study_analyzer.py
│   ├── safety_adjuster.py
│   ├── generate_guides.py
│   └── update_guide.py
│
├── backend/                        # Phase 10
│   ├── nutrii/
│   │   ├── settings/
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── health_index.py
│   │   ├── ai_override.py
│   │   └── tests/
│   ├── scans/
│   │   ├── ocr_client.py
│   │   ├── ingredient_parser.py
│   │   └── views.py
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── web/                            # Phase 11
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── Dockerfile
│
├── mobile/                         # Phase 12
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── api/
│   │   └── App.tsx
│   ├── app.json
│   ├── package.json
│   └── eas.json
│
├── ai/                             # Phase 4, 5, 6, 13
│   ├── consensus_selector.py
│   ├── dispatcher.py
│   ├── parsers.py
│   ├── ocr_pipeline.py
│   ├── ingredient_parser.py
│   ├── fuzzy_matcher.py
│   ├── prompts/
│   │   ├── study_analysis.j2
│   │   ├── safety_adjustment.j2
│   │   ├── guide_generation.j2
│   │   ├── conflict_arbitration.j2
│   │   └── molecule_classification.j2
│   └── tests/
│
└── .github/
    └── workflows/
        ├── test.yml
        ├── lint.yml
        └── deploy.yml
```

---

## Data Sources

| Source | Type | URL | What We Extract |
|--------|------|-----|-----------------|
| USDA FoodData Central | API + CSV | fdc.nal.usda.gov | Nutrients, macros, portions |
| FooDB | CSV | foodb.ca | 70,000+ food compounds |
| PubChem PUG-REST | API | pubchem.ncbi.nlm.nih.gov | Molecular properties, structures |
| PubMed E-utilities | API | pubmed.ncbi.nlm.nih.gov | **Study metadata, abstracts, new research** |
| EFSA OpenFoodTox | Reports | efsa.europa.eu | Regulatory assessments |
| IARC Monographs | Reports | iarc.who.int | Carcinogen classifications |
| Phenol-Explorer | DB | phenol-explorer.eu | Polyphenol contents |
| ChEMBL | API | ebi.ac.uk/chembl | Bioactivity data |
| WHO GEMS/Food | Reports | who.int | Exposure estimates |
| Open Food Facts | API | world.openfoodfacts.org | Real product ingredient lists (for OCR training) |
| OpenRouter | API | openrouter.ai | **Dynamic LLM inference** |

---

## Appendix A: AI Prompt Templates

### A.1 Study Analysis Prompt (`study_analysis.j2`)

```jinja2
You are a nutritional toxicology research analyst. Your job is to read the
following PubMed study abstract and produce a structured analysis.

INGREDIENT CONTEXT:
{{ ingredient_name }}
Known molecules: {{ known_molecules }}
Current safety score: {{ current_safety_score }}
Current health index: {{ current_health_index }}

STUDY:
Title: {{ study_title }}
Abstract: {{ study_abstract }}
Journal: {{ journal }}
Year: {{ year }}

INSTRUCTIONS:
1. Identify the primary food or molecule studied.
2. Summarize the key finding in 2–3 sentences for a general audience.
3. Assess the impact on SAFETY perception: −5 (much more dangerous) to +5 (much safer).
4. Assess the impact on HEALTH perception: −5 to +5.
5. Rate your confidence: high / medium / low.
6. Note any methodological red flags (small sample, in-vitro only, conflict of interest).

Return ONLY valid JSON matching this schema:
{
  "primary_ingredient": "string",
  "summary": "string",
  "safety_impact": -5,
  "health_impact": 3,
  "confidence": "high",
  "red_flags": ["string"]
}
```

### A.2 Safety Adjustment Prompt (`safety_adjustment.j2`)

```jinja2
You are the nutrii safety scoring engine. A new study has been published that
may affect the safety profile of an ingredient. Review the evidence and propose
updated scores.

AGENT GUIDE FOR THIS INGREDIENT:
{{ agent_guide_markdown }}

CURRENT STATE:
- Safety score: {{ current_safety_score }}
- Health index: {{ current_health_index }}
- Harm level: {{ current_harm_level }}

NEW STUDY:
{{ study_summary }}

HISTORICAL STUDIES (last 5):
{{ recent_studies }}

RULES:
- Base algorithm: start at 100, subtract harm penalties, add benefit bonuses.
- You may deviate up to ±15 points from the base algorithm if the new study
  provides strong human RCT evidence.
- You must cite the specific PMID in your reasoning.
- Be conservative: prefer under-adjusting to over-adjusting.

Return ONLY valid JSON:
{
  "new_safety_score": 78,
  "new_health_index": 82,
  "reasoning": "string",
  "pmid_cited": "12345678"
}
```

### A.3 Guide Generation Prompt (`guide_generation.j2`)

```jinja2
You are creating an agent instruction guide for the nutrii platform.
This guide will govern how AI agents analyze new studies and adjust scores
for this ingredient.

INGREDIENT: {{ food_name }}
CATEGORY: {{ category }}
MOLECULES:
{% for m in molecules %}
- {{ m.name }} (harm: {{ m.harm_level }}, beneficial: {{ m.is_beneficial }})
{% endfor %}
CURRENT SCORES: safety={{ safety_score }}, health={{ health_index }}

Generate a Markdown guide following this exact structure:
1. Classification
2. Safety Scoring Rules (with specific numeric modifiers)
3. Study Interpretation Guidelines
4. Historical Context
5. Update Log (empty except for v1 entry)

Be specific. Future agents must be able to read this guide and make consistent
decisions without ambiguity.
```

---

## Appendix B: Mobile App Feature Specification

### B.1 Screen List
| Screen | Purpose |
|--------|---------|
| `HomeScreen` | Featured lists, recent scans (local), search bar |
| `ScanScreen` | Camera view, capture button, gallery picker |
| `ScanResultScreen` | Parsed ingredients, overall score, color list |
| `IngredientDetailScreen` | Full food/molecule info + latest AI summaries + studies |
| `FoodDetailScreen` | Rich food page with agent guide viewer |
| `CompareScreen` | Side-by-side comparison |
| `HistoryScreen` | Past scans (local SQLite) |
| `FavoritesScreen` | Saved foods (local SQLite) |
| `SettingsScreen` | Dietary prefs, allergen alerts, offline mode, about |
| `OnboardingScreen` | First-launch tutorial |

### B.2 State Management (No Auth)
```typescript
interface AppState {
  dietaryPrefs: DietaryPreference[];
  allergenAlerts: string[];
  scanHistory: Scan[];        // local SQLite
  favorites: string[];        // local SQLite
  offlineMode: boolean;
  cachedFoods: Food[];        // top 500 for offline
}
```

### B.3 Performance Targets
- Time to first scan: <2 seconds from app open
- OCR result: <3 seconds (cloud), <1 second (on-device)
- Ingredient list render: <100ms for 50 items
- App bundle size: <50MB (iOS), <40MB (Android)

---

*Plan version: 3.0 | Last updated: May 2026 | Project: nutrii*
*This plan replaces all previous FoodMolecule-DB and Nutri legacy documentation.*
