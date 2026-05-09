# nutrii — Data Model Reference

> **Phase 2 Deliverable** — 10 core tables, 0 user/auth tables.

---

## Entity Relationship Overview

```
foods ──── food_molecules ──── molecules
  │                              │
  │                         molecule_neutralizations ──── processing_methods
  │                              │
  ├─── food_studies ──── studies
  │
  ├─── safety_score_revisions
  │
  ├─── ingredient_ai_guides
  │
  └─── ban_list_entries
```

---

## Core Tables

### food_categories

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PK |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| parent | FK → self | nullable, for hierarchy |
| description | TEXT | nullable |

### foods

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(255) | NOT NULL |
| aliases | TEXT[] | GIN indexed |
| category | FK → food_categories | nullable |
| origin | VARCHAR(255) | nullable |
| overall_safety_score | SMALLINT | 0-100, AI-updated |
| health_index | SMALLINT | 0-100, AI-updated |
| ban_listed | BOOLEAN | default false, indexed |
| image_url | TEXT | nullable |
| metadata | JSONB | source refs, regional data |
| ai_guide_version | INT | current guide version |
| last_analyzed_at | TIMESTAMPTZ | last AI review |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto |

### molecules

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| pubchem_cid | BIGINT | UNIQUE, indexed |
| name | VARCHAR(255) | UNIQUE, NOT NULL |
| iupac_name | VARCHAR(500) | nullable |
| cas_number | VARCHAR(50) | indexed |
| molecular_formula | VARCHAR(100) | nullable |
| molecular_weight | DECIMAL(10,4) | nullable |
| harm_level | SMALLINT | 0-5, AI-adjusted |
| harm_mechanisms | TEXT[] | plain-language tags |
| threshold_concern_mg_per_day | DECIMAL(10,4) | nullable |
| is_heat_stable | BOOLEAN | default true |
| is_neutralizable | BOOLEAN | default false |
| structure_image_url | TEXT | nullable |
| metadata | JSONB | references, synonyms |

### studies

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| pmid | VARCHAR(20) | UNIQUE, indexed |
| title | TEXT | NOT NULL |
| authors | TEXT[] | nullable |
| journal | VARCHAR(255) | nullable |
| publication_year | SMALLINT | nullable |
| url | TEXT | nullable |
| abstract | TEXT | nullable |
| ai_summary | TEXT | OpenRouter-generated |
| ai_safety_impact | SMALLINT | -5 to +5 |
| ai_health_impact | SMALLINT | -5 to +5 |
| ai_confidence | VARCHAR(20) | high/medium/low |
| ai_model_used | VARCHAR(100) | model name |
| analyzed_at | TIMESTAMPTZ | when AI processed |
| created_at | TIMESTAMPTZ | auto |

---

## Junction Tables

### food_molecules

| Column | Type | Notes |
|--------|------|-------|
| food_id | UUID | FK → foods |
| molecule_id | UUID | FK → molecules |
| amount_per_100g | DECIMAL(12,6) | nullable |
| unit | VARCHAR(20) | mg, ug, g, IU |
| amount_notes | TEXT | e.g. "varies by cultivar" |
| is_beneficial | BOOLEAN | context-dependent |
| **PK** | (food_id, molecule_id) | unique together |

### food_studies

| Column | Type | Notes |
|--------|------|-------|
| food_id | UUID | FK → foods |
| study_id | UUID | FK → studies |
| relevance_score | DECIMAL(3,2) | 0.00-1.00 |
| linked_by | VARCHAR(50) | auto_ingestion/ai_cross_reference |
| **PK** | (food_id, study_id) | unique together |

### molecule_neutralizations

| Column | Type | Notes |
|--------|------|-------|
| molecule_id | UUID | FK → molecules |
| method_id | INT | FK → processing_methods |
| reduction_percent_min | SMALLINT | 0-100 |
| reduction_percent_max | SMALLINT | 0-100 |
| time_required | VARCHAR(100) | human-readable |
| temperature_c | SMALLINT | via processing_methods |
| notes | TEXT | e.g. "discard soaking water" |
| evidence_refs | TEXT[] | PubMed IDs |
| confidence | VARCHAR(20) | high/medium/low |
| **PK** | (molecule_id, method_id) | unique together |

---

## Audit & AI Tables

### safety_score_revisions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| food_id | UUID | FK → foods |
| old_safety_score | SMALLINT | previous value |
| new_safety_score | SMALLINT | updated value |
| old_health_index | SMALLINT | previous |
| new_health_index | SMALLINT | updated |
| reason | TEXT | AI explanation, required |
| triggering_study_id | UUID | FK → studies, nullable |
| ai_model_used | VARCHAR(100) | model that proposed change |
| created_at | TIMESTAMPTZ | auto |

### ingredient_ai_guides

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| food_id | UUID | FK → foods, nullable |
| molecule_id | UUID | FK → molecules, nullable |
| guide_markdown | TEXT | agent instruction document |
| version | INT | incremented on regeneration |
| generated_by | VARCHAR(100) | OpenRouter model name |
| generated_at | TIMESTAMPTZ | auto |

### ban_list_entries

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| food_id | UUID | FK → foods (OneToOne) |
| reason | TEXT | why banned |
| lethal_dose_mg | DECIMAL(10,4) | nullable |
| is_conditionally_safe | BOOLEAN | default false |
| safe_condition | TEXT | required if conditional |
| regulatory_status | JSONB | per-jurisdiction status |

---

## Lookup Tables

### processing_methods

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(100) | UNIQUE |
| description | TEXT | nullable |
| mechanism | TEXT | nullable |
| typical_temperature_c | SMALLINT | nullable |
| typical_duration_min | SMALLINT | nullable |

---

## Health Index (NHI) Formula

```
NHI = (Benefit_Score x 0.4) + (Safety_Score x 0.4) + (Bioavailability_Score x 0.2)

Benefit_Score (0-100):
  - Weighted by molecule type (vitamin: 3, mineral: 3, polyphenol: 2, fiber: 1, etc.)
  - Capped at 100

Safety_Score (0-100):
  - Start at 100
  - Penalties: critical (-40), high (-20), moderate (-10), low (-3), negligible (-1)
  - Synergy multiplier (>=2 high/moderate): 1.2x penalties
  - Non-neutralizable penalty: 1.3x

Bioavailability_Score (0-100):
  - Start at 100
  - Antinutrient penalty: -5 (non-neutralizable), -2 (neutralizable)
```

## AI Override Rules

1. Must cite a specific PMID in reasoning
2. Triggering study should be human RCT (heuristic: "randomized"/"clinical trial" in abstract)
3. Delta cannot exceed +/-15 points from base algorithm
4. New score must be within 0-100
5. Override logged in safety_score_revisions audit table
