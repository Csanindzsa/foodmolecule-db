# FoodMolecule-DB — Implementation Plan

> **Vision:** A fully open-source, science-backed database that maps every known food to its molecular composition, highlights harmful compounds, explains how cooking/processing neutralizes them, and maintains a ban list for foods that cannot be made safe.

---

## Table of Contents
1. [Project Phases Overview](#project-phases-overview)
2. [Phase 1 — Data Architecture & Schema](#phase-1--data-architecture--schema)
3. [Phase 2 — Data Collection Pipeline](#phase-2--data-collection-pipeline)
4. [Phase 3 — Harm Classification System](#phase-3--harm-classification-system)
5. [Phase 4 — Processing & Neutralization Guide](#phase-4--processing--neutralization-guide)
6. [Phase 5 — Ban List](#phase-5--ban-list)
7. [Phase 6 — Website & Frontend](#phase-6--website--frontend)
8. [Phase 7 — API & Community Contributions](#phase-7--api--community-contributions)
9. [Data Sources](#data-sources)
10. [Technology Stack](#technology-stack)
11. [Folder Structure](#folder-structure)
12. [Contributing Guidelines](#contributing-guidelines)

---

## Project Phases Overview

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Data architecture & JSON/CSV schema | 🔲 Todo |
| 2 | Data collection pipeline (USDA, FooDB, PubChem) | 🔲 Todo |
| 3 | Harm classification engine | 🔲 Todo |
| 4 | Processing & neutralization guides per compound | 🔲 Todo |
| 5 | Ban list (non-neutralizable harmful foods) | 🔲 Todo |
| 6 | Website — search, browse, visualize | 🔲 Todo |
| 7 | Public REST API + community contribution system | 🔲 Todo |

---

## Phase 1 — Data Architecture & Schema

### Goal
Define the canonical data schema used across all JSON/CSV files in this repo before any data entry begins.

### Schema: Food Entry
```json
{
  "id": "food_001",
  "name": "Spinach",
  "aliases": ["Spinacia oleracea"],
  "category": "Leafy Vegetable",
  "origin": "Central Asia",
  "molecules": [
    {
      "name": "Oxalic Acid",
      "pubchem_cid": 971,
      "amount_per_100g": "600-900 mg",
      "unit": "mg",
      "harm_level": "moderate",
      "harm_type": ["kidney_stone_risk", "mineral_absorption_inhibitor"],
      "neutralizable": true,
      "neutralization_methods": ["boiling", "blanching"],
      "notes": "Boiling removes ~30-50% of oxalates. Avoid if prone to kidney stones."
    },
    {
      "name": "Lutein",
      "pubchem_cid": 5281243,
      "amount_per_100g": "12 mg",
      "unit": "mg",
      "harm_level": "none",
      "harm_type": [],
      "beneficial": true,
      "benefits": ["eye_health", "antioxidant"]
    }
  ],
  "overall_safety": "safe_with_preparation",
  "ban_listed": false,
  "sources": ["USDA FoodData Central", "FooDB", "PubMed PMID:12345678"]
}
```

### Schema: Molecule Entry
```json
{
  "pubchem_cid": 971,
  "name": "Oxalic Acid",
  "iupac_name": "ethanedioic acid",
  "cas_number": "144-62-7",
  "molecular_formula": "C2H2O4",
  "molecular_weight": 90.03,
  "harm_level": "moderate",
  "harm_mechanisms": [
    "Binds calcium, magnesium, and iron — reducing their bioavailability",
    "Can crystallize into calcium oxalate kidney stones in susceptible individuals"
  ],
  "threshold_concern_mg_per_day": 250,
  "neutralization": {
    "heat": "Boiling reduces content by 30-87% depending on duration",
    "soaking": "Overnight soaking in water reduces 10-40%",
    "fermentation": "Reduces by up to 50% in 24h fermentation"
  },
  "foods_high_in_this": ["spinach", "rhubarb", "beet_greens", "almonds"],
  "references": ["PubMed PMID:18300710", "PubMed PMID:29580532"]
}
```

### Schema: Ban List Entry
```json
{
  "id": "ban_001",
  "food_name": "Puffer Fish (improperly prepared)",
  "reason": "Contains tetrodotoxin — a potent neurotoxin with no known antidote. Cannot be neutralized by cooking.",
  "harmful_molecules": ["Tetrodotoxin"],
  "lethal_dose": "~1.2 mg for 70kg human",
  "is_heat_stable": true,
  "is_conditionally_safe": true,
  "safe_condition": "Only when prepared by licensed fugu chefs in Japan with certified parts removed",
  "regulatory_status": {
    "EU": "Banned for commercial sale",
    "USA": "Import restricted",
    "Japan": "Allowed with licensed preparation"
  }
}
```

### Deliverables
- [ ] `schema/food.schema.json` — JSON Schema validation file
- [ ] `schema/molecule.schema.json`
- [ ] `schema/ban_list.schema.json`

---

## Phase 2 — Data Collection Pipeline

### Goal
Collect and normalize molecular data for the most commonly consumed foods worldwide (~500 initial foods, growing to 5,000+).

### Priority Groups (in order)
1. **Staple grains** — wheat, rice, oats, corn, barley, rye
2. **Vegetables** — top 50 consumed globally
3. **Fruits** — top 50 consumed globally
4. **Legumes** — beans, lentils, chickpeas, soy
5. **Animal products** — beef, pork, chicken, eggs, dairy
6. **Seafood** — top 30 species
7. **Nuts & seeds**
8. **Herbs & spices**
9. **Processed foods** — bread, vegetable oils, refined sugar
10. **Exotic / regional foods**

### Data Collection Strategy

#### Automated Pipeline (Python scripts in `/scripts/`)
- **USDA FoodData Central API** → nutrient and macromolecule data
- **FooDB API / CSV dump** → phytochemical and flavor compound data
- **PubChem API** → molecular properties (formula, weight, structure)
- **PubMed / Europe PMC** → toxicity studies and health effect citations

#### Manual Curation
- Cross-reference multiple sources for each compound
- Add harm level classification based on EFSA, IARC, and FDA rulings
- Write plain-language harm/benefit summaries

### Scripts Plan
```
scripts/
  fetch_usda.py        # Pull foods + nutrients from USDA API
  fetch_foodb.py       # Enrich with phytochemical data
  fetch_pubchem.py     # Get molecular properties by CID
  merge_and_validate.py  # Merge sources, validate against schema
  generate_ban_list.py   # Flag non-neutralizable harmful foods
```

### Deliverables
- [ ] `scripts/fetch_usda.py`
- [ ] `scripts/fetch_foodb.py`
- [ ] `scripts/fetch_pubchem.py`
- [ ] `scripts/merge_and_validate.py`
- [ ] `data/foods/` populated with initial 50 foods
- [ ] `data/molecules/` populated with initial 100 molecules

---

## Phase 3 — Harm Classification System

### Goal
Create a consistent, evidence-based harm classification for every molecule and food.

### Harm Levels

| Level | Label | Definition |
|-------|-------|------------|
| 0 | `none` | No known harm at dietary amounts |
| 1 | `negligible` | Theoretically harmful only at extreme doses (>100x normal consumption) |
| 2 | `low` | Mild adverse effects possible in sensitive populations |
| 3 | `moderate` | Adverse effects documented in normal dietary ranges for some people |
| 4 | `high` | Harmful at common consumption levels; regulatory warnings exist |
| 5 | `critical` | Acutely toxic; lethal at small doses |

### Harm Types (Tags)
- `carcinogen` — IARC Group 1 or 2A/2B classification
- `endocrine_disruptor` — Interferes with hormone signaling
- `neurotoxin` — Harms nervous system
- `hepatotoxin` — Harms the liver
- `nephrotoxin` — Harms the kidneys
- `mineral_absorption_inhibitor` — Blocks iron, zinc, calcium, magnesium
- `gut_irritant` — Damages intestinal lining or microbiome
- `allergen` — Triggers immune responses
- `inflammatory` — Promotes chronic systemic inflammation
- `oxidative_stress` — Generates harmful free radicals
- `antinutrient` — Blocks absorption of other nutrients (lectins, phytates, oxalates)

### Evidence Requirements
Each harm classification must cite:
- At least 1 peer-reviewed study (PubMed ID)
- Regulatory body ruling if available (EFSA, FDA, IARC, WHO)
- Human vs. animal data distinction

### Deliverables
- [ ] `classification/harm_levels.md` — Full rubric with examples
- [ ] `classification/harm_types.md` — All tag definitions with references
- [ ] `classification/evidence_standards.md` — Citation requirements

---

## Phase 4 — Processing & Neutralization Guide

### Goal
For every harmful molecule, document whether it can be neutralized and by what method.

### Methods Matrix

| Method | Examples | Compounds it neutralizes |
|--------|----------|-------------------------|
| **Boiling** | 10–30 min in water | Oxalates, lectins, phytates, nitrates |
| **Soaking** | 8–24h in water | Lectins, phytates, saponins |
| **Fermentation** | Yogurt, kimchi, sourdough | Phytates, lactose, certain antinutrients |
| **Sprouting** | 2–5 days germination | Phytates, lectins |
| **Roasting/Baking** | >180°C | Aflatoxins (partial), lectins, some mycotoxins |
| **Peeling** | Remove outer layer | Pesticide residues, some glycoalkaloids |
| **Acidification** | Vinegar, lemon juice | Some toxins, anti-nutrients |
| **Enzyme treatment** | Phytase, protease | Phytates, certain peptides |
| **None** | — | Tetrodotoxin, certain heavy metals, persistent organic pollutants |

### Compound-Level Processing Notes
Each molecule entry includes:
```
neutralization:
  method: boiling
  reduction_percent: "30-87%"
  time_required: "10-20 minutes"
  temperature_c: 100
  notes: "Discard cooking water. Reduction varies by spinach variety."
  evidence: "PubMed PMID:18300710"
```

### Deliverables
- [ ] `processing/methods.md` — All processing methods with mechanisms explained
- [ ] `processing/compound_matrix.csv` — Compound × Method effectiveness table
- [ ] Processing field populated in all molecule JSON files

---

## Phase 5 — Ban List

### Goal
Maintain a curated list of foods (or specific preparations of foods) that should be avoided entirely because their harmful molecules cannot be effectively neutralized.

### Ban Criteria (ANY of the following triggers a ban)
1. Contains a compound with harm_level = `critical` AND `is_heat_stable: true`
2. Contains multiple `high`-level compounds that act synergistically
3. Regulatory ban exists in 2+ major jurisdictions (EU, USA, Canada, Australia)
4. No safe preparation method exists that reduces harm below `moderate`

### Initial Ban List Candidates

| Food | Harmful Molecule | Reason |
|------|-----------------|--------|
| Puffer fish (fugu, unprepared) | Tetrodotoxin | Lethal neurotoxin, heat stable, no antidote |
| Ackee (unripe) | Hypoglycin A | Causes Jamaican vomiting sickness; fatal |
| Bitter almonds (raw) | Amygdalin → HCN | Releases lethal hydrogen cyanide |
| Castor beans | Ricin | Extremely potent toxin; 1–10 µg/kg lethal |
| Rhubarb leaves | Oxalic acid (extreme) | Safe in stalks only; leaves are toxic |
| Raw kidney beans | Phytohaemagglutinin | 4–5 raw beans can cause severe poisoning |
| Star fruit (in kidney disease) | Caramboxin | Causes neurotoxicity in impaired kidneys |
| Ergot-contaminated grain | Ergotamine | Causes gangrenous ergotism |
| Colza/rapeseed (old varieties) | Erucic acid (>5%) | High-erucic varieties linked to heart lipidosis |

### Deliverables
- [ ] `ban_list/ban_list.json` — Machine-readable ban list
- [ ] `ban_list/ban_list.md` — Human-readable version with full explanations
- [ ] `ban_list/conditional_warnings.md` — Foods that are safe ONLY under specific conditions

---

## Phase 6 — Website & Frontend

### Goal
Build a public-facing website to make the database searchable, browsable, and visually informative.

### Pages

#### Home / Search
- Full-text search across all foods and molecules
- Filter by: harm level, food category, molecule type
- Featured: "Most dangerous common foods", "Today's spotlight compound"

#### Food Detail Page
- All molecular constituents with harm-level color coding
- Processing recommendations
- Benefit compounds highlighted
- Sources / references section
- "Ban listed?" badge if applicable

#### Molecule Detail Page
- Molecular structure visualization
- Foods that contain this molecule (ranked by amount)
- Harm mechanism explained in plain language
- Processing effectiveness chart
- PubMed reference links

#### Ban List Page
- Full sortable table
- Filter by: harm type, regulatory status, lethal dose range
- Clear "Conditionally safe" vs "Avoid entirely" distinction

#### Compare Mode
- Side-by-side comparison of 2–3 foods
- Molecule overlap visualization

#### API Documentation
- Interactive docs (Swagger/Redoc)

### Design Direction
- **Tone:** Scientific, clean, trustworthy — like a cross between PubMed and Wirecutter
- **Palette:** Neutral warm whites, deep forest green accent (safe = green, danger = amber/red)
- **Typography:** `Instrument Serif` for display headings, `Work Sans` for body
- **Data viz:** Radar charts for molecular profiles, bar charts for compound amounts, color-coded harm badges

### Tech Stack (Frontend)
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Data viz:** Chart.js or Recharts
- **Search:** Fuse.js (client-side) → Algolia or MeiliSearch (when scale requires)
- **Hosting:** Vercel (free tier)

### Deliverables
- [ ] `web/` — Next.js project
- [ ] Search working across all foods
- [ ] Food detail pages
- [ ] Molecule detail pages
- [ ] Ban list page
- [ ] Mobile responsive
- [ ] Light + dark mode

---

## Phase 7 — API & Community Contributions

### Goal
Make the database accessible via a REST API and accept community corrections/additions.

### API Endpoints (Planned)
```
GET /api/foods                    — List all foods (paginated)
GET /api/foods/:id                — Food detail with all molecules
GET /api/foods/search?q=spinach   — Full-text search
GET /api/molecules                — List all molecules
GET /api/molecules/:pubchem_cid   — Molecule detail
GET /api/ban-list                 — Full ban list
GET /api/categories               — All food categories
```

### Community Contributions
- GitHub Issues for corrections and additions (use templates)
- PRs accepted for new food entries following the schema
- All additions require at least 1 PubMed citation
- Maintainer review required before merge

### Deliverables
- [ ] API routes in Next.js
- [ ] GitHub Issue templates (new food, new molecule, correction, ban list nomination)
- [ ] `CONTRIBUTING.md` — Full guide
- [ ] Automated schema validation in CI (GitHub Actions)

---

## Data Sources

| Source | Type | URL | Notes |
|--------|------|-----|-------|
| USDA FoodData Central | API + CSV | https://fdc.nal.usda.gov/ | Nutrients, macros, some phytochemicals |
| FooDB | CSV download | https://foodb.ca/ | 70,000+ food compounds, best phytochemical DB |
| PubChem | API | https://pubchem.ncbi.nlm.nih.gov/ | Molecular properties by CID |
| PubMed | API | https://pubmed.ncbi.nlm.nih.gov/ | Toxicity studies and health research |
| EFSA | Reports | https://efsa.europa.eu/ | EU food safety rulings |
| IARC | Reports | https://iarc.who.int/ | Carcinogen classifications |
| Phenol-Explorer | DB | http://phenol-explorer.eu/ | Polyphenol content in foods |
| ChEMBL | API | https://www.ebi.ac.uk/chembl/ | Bioactivity data for molecules |
| WHO GEMS/Food | Reports | https://www.who.int/ | Dietary exposure estimates |

---

## Technology Stack

| Layer | Tool | Reason |
|-------|------|---------|
| Data format | JSON + CSV | Human-readable, Git-friendly, easy to query |
| Schema validation | JSON Schema + AJV | Strict type enforcement on all entries |
| Data pipeline | Python 3.11 + httpx + pandas | Fast async API fetching, data manipulation |
| Website framework | Next.js 14 | React SSR + static generation, Vercel-native |
| Styling | Tailwind CSS v4 | Rapid UI, design token system |
| Search | Fuse.js → MeiliSearch | Client-side first, upgrade path when needed |
| CI/CD | GitHub Actions | Auto-validate schema on every PR |
| Hosting | Vercel (web) + GitHub (data) | Free, fast CDN globally |

---

## Folder Structure

```
foodmolecule-db/
├── README.md
├── IMPLEMENTATION_PLAN.md        ← This file
├── CONTRIBUTING.md
│
├── schema/                       # Phase 1
│   ├── food.schema.json
│   ├── molecule.schema.json
│   └── ban_list.schema.json
│
├── data/
│   ├── foods/                    # Phase 2
│   │   ├── vegetables/
│   │   ├── fruits/
│   │   ├── grains/
│   │   ├── legumes/
│   │   ├── animal_products/
│   │   ├── seafood/
│   │   ├── nuts_seeds/
│   │   ├── herbs_spices/
│   │   └── processed/
│   └── molecules/                # Phase 2
│       ├── antinutrients/
│       ├── toxins/
│       ├── heavy_metals/
│       ├── pesticides/
│       ├── beneficial/
│       └── neutral/
│
├── ban_list/                     # Phase 5
│   ├── ban_list.json
│   ├── ban_list.md
│   └── conditional_warnings.md
│
├── classification/               # Phase 3
│   ├── harm_levels.md
│   ├── harm_types.md
│   └── evidence_standards.md
│
├── processing/                   # Phase 4
│   ├── methods.md
│   └── compound_matrix.csv
│
├── scripts/                      # Phase 2
│   ├── fetch_usda.py
│   ├── fetch_foodb.py
│   ├── fetch_pubchem.py
│   ├── merge_and_validate.py
│   └── generate_ban_list.py
│
└── web/                          # Phase 6 & 7
    └── (Next.js project)
```

---

## Contributing Guidelines

See `CONTRIBUTING.md` (to be created in Phase 7).

**Short version:**
- All entries must include a PubMed or EFSA/FDA/WHO citation
- Follow the JSON schema exactly — PRs failing validation will be auto-rejected
- Plain-language summaries are mandatory alongside technical data
- No corporate interests — this project remains independent and non-commercial

---

*Last updated: May 2026 | Maintained by the FoodMolecule-DB community*
