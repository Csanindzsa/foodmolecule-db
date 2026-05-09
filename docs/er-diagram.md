# Entity-Relationship Diagram — nutrii Database

> **Phase 2 Deliverable**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CORE ENTITIES                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

 foods                        molecules                    studies
 ┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
 │ PK  id (UUID)       │      │ PK  id (UUID)       │      │ PK  id (UUID)       │
 │     name            │      │     pubchem_cid      │      │     pmid            │
 │     aliases[]       │      │     name             │      │     title           │
 │     category        │      │     iupac_name       │      │     authors[]       │
 │     origin          │      │     cas_number       │      │     journal         │
 │     safety_score    │      │     molecular_formula│      │     year            │
 │     health_index    │      │     molecular_weight │      │     abstract        │
 │     ban_listed      │      │     harm_level (0-5) │      │     ai_summary      │
 │     image_url       │      │     harm_mechanisms[]│      │     ai_safety_impact│
 │     metadata (JSONB)│      │     threshold_mg/day │      │     ai_health_impact│
 │     ai_guide_version│      │     is_heat_stable   │      │     ai_confidence   │
 │     last_analyzed_at│      │     is_neutralizable │      │     ai_model_used   │
 │     created_at      │      │     structure_url    │      │     analyzed_at     │
 │     updated_at      │      │     metadata (JSONB) │      │     created_at      │
 └────────────────────┘      └────────────────────┘      └────────────────────┘
         │                          │  │                        │
         │                          │  │                        │
         ┬────────────────────────┼──┘                        │
         │       food_molecules      │                           │
         │    ┌─────────────────┐  │                           │
         └───►│ FK  food_id         │◄┘                           │
              │ FK  molecule_id     │                           │
              │     amount_per_100g │                           │
              │     unit            │                           │
              │     is_beneficial   │    food_studies            │
              │     amount_notes    │ ┌──────────────────┐          │
              └─────────────────┘ │ FK  food_id         │◄─────► foods
                                    │ FK  study_id        │◄───► studies
                                    │     relevance_score │
                                    │     linked_by       │
                                    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    AUXILIARY ENTITIES                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

 safety_score_revisions         ingredient_ai_guides
 ┌────────────────────┐      ┌────────────────────┐
 │ PK  id              │      │ PK  id              │
 │ FK  food_id         │      │ FK  food_id (null.) │
 │     old_safety_score│      │ FK  molecule_id     │
 │     new_safety_score│      │     guide_markdown  │
 │     old_health_index│      │     version         │
 │     new_health_index│      │     generated_by    │
 │     reason          │      │     generated_at    │
 │ FK  triggering_study │      └────────────────────┘
 │     ai_model_used   │
 │     created_at      │  ban_list                processing_methods
 └────────────────────┘  ┌───────────────┐  ┌───────────────┐
                          │ PK  id         │  │ PK  id         │
                          │ FK  food_id    │  │     name       │
                          │     reason     │  │     description│
                          │     lethal_dose│  │     mechanism  │
                          │     regulatory  │  │     temp_c     │
                          │     status     │  │     duration   │
                          └───────────────┘  └────┬──────────┘
                                                    │
                              molecule_neutralizations
                           ┌──────────────────────┐
                           │ FK  molecule_id         │◄──► molecules
                           │ FK  method_id           │◄──► processing_methods
                           │     reduction_pct_min   │
                           │     reduction_pct_max   │
                           │     time_required       │
                           │     notes               │
                           │     evidence_refs[]     │
                           └──────────────────────┘
```

---

## Key Design Decisions

1. **UUID primary keys everywhere** — enables distributed inserts and avoids sequential enumeration attacks.
2. **JSONB `metadata`** on `foods` and `molecules` — stores source attribution, confidence levels, and external IDs without schema migrations.
3. **GIN indexes** on all array and JSONB columns for fast full-text and containment searches.
4. **`pg_trgm` trigram indexes** on `foods.name` and `molecules.name` for fuzzy search (supports <3-character typos).
5. **Audit trail via `safety_score_revisions`** — every AI-driven score change is recorded with the model name, reason, and triggering study.
6. **No user or auth tables** — the schema is intentionally free of any concept of accounts or sessions.

---

*Created: May 2026 | Phase: 2*
