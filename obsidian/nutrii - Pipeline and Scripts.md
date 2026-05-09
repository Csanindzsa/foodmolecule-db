# nutrii — Pipeline & Scripts

> **Phase 3 & Phase 5 Deliverables** — Data collection pipeline + PubMed auto-ingestion.

---

## Master Pipeline

File: `scripts/run_pipeline.py`

Orchestrates full data ingestion in 5 stages:

```
[1/5] Load JSON files from data/seed/
  --> Pydantic models with validation
[2/5] Normalize names and units
  --> Canonical name format, unit conversion
[3/5] Deduplicate entries
  --> Fuzzy name matching, alias merging
[4/5] Validate against JSON Schema
  --> jsonschema validation before DB insert
[5/5] Bulk insert into database
  --> Upsert with ON CONFLICT handling
```

Usage:
```bash
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run
```

---

## Data Fetchers

All in `scripts/fetchers/`:

### USDA FoodData Central (`fetch_usda.py`)
- API-based fetcher with rate limiting
- Extracts nutrients, macros, portions
- Uses USDA API key from `.env`
- Paginates through FDC API responses

### PubChem PUG-REST (`fetch_pubchem.py`)
- Fetches molecular properties by CID
- PubChem CID, molecular formula, weight, IUPAC name
- CAS number lookup
- Built-in rate limiting

### PubMed E-utilities (`fetch_pubmed.py`)
- Fetches study metadata and abstracts
- Supports NCBI API key for higher rate limits
- Parses XML response from E-utilities
- Extracts: PMID, title, authors, journal, year, abstract, DOI

---

## Transformers

All in `scripts/transformers/`:

### Normalizer (`normalizer.py`)
- Canonical name formatting (lowercase, strip whitespace)
- Unit conversion standardization
- Category name normalization

### Deduplicator (`deduplicator.py`)
- Fuzzy name matching via SequenceMatcher
- Alias propagation across duplicate entries
- Confidence threshold for auto-merge

---

## Loaders

All in `scripts/loaders/`:

### Bulk Inserter (`bulk_insert.py`)
- Upsert molecules first (no FK dependencies)
- Upsert foods
- Link food molecules via junction table
- Django ORM with get_or_create pattern
- Transaction-safe

### Schema Validator (`validate.py`)
- Validates against `schema/*.schema.json` files
- Food validation: checks required fields, molecule refs
- Molecule validation: checks harm level range, CAS format
- Returns per-entry error list

---

## PubMed Pipeline (Phase 5)

### PubMed Watcher (`pubmed_watcher.py`)
- Scheduled job (intended every 6 hours)
- Polls PubMed via E-utilities esearch
- Dynamically generates search queries from ingredient names + synonyms
- Filters by date range
- Detects duplicates via PMID check

### Study Analyzer (`study_analyzer.py`)
- Reads unanalyzed studies from database
- Sends to OpenRouter dispatcher with `study_analysis.j2` prompt
- Stores structured results (ai_summary, ai_safety_impact, etc.)
- Fuzzy matches to `foods.aliases` for auto-linking

### Safety Adjuster (`safety_adjuster.py`)
- Triggered when |ai_safety_impact| >= 2
- Proposes new safety_score and health_index
- Enforces +/-15 point cap per update
- Writes full audit trail to `safety_score_revisions`
- Validates AI overrides via `core/ai_override.py`

---

## Seed Data

**Foods** (`data/seed/foods/`):
- `spinach.json` — with oxalic acid + iron molecules
- `kidney_bean.json` — with lectin molecules

**Molecules** (`data/seed/molecules/`):
- `oxalic_acid.json`
- `lectin.json`
- `saponin.json`
- `iron.json`

**Studies** (`data/seed/studies/`): (empty - awaiting PubMed ingestion)

---

## Additional Scripts

### Guide Generator (`scripts/generate_guides.py`)
- Generates agent instruction guides for foods
- Calls OpenRouter with `guide_generation.j2` prompt
- Saves to `ingredient_ai_guides` table + `guides/ingredients/*.md`
- Supports single food or --all mode

### Guide Updater (`scripts/update_guide.py`)
- Triggered after safety adjustments
- Proposes guide updates if new patterns emerge
- Increments guide version
- Appends to Update Log section
