# nutrii — AI Agent System

> **Phase 4 Deliverable** — The central nervous system of nutrii.

---

## Architecture

```
User/System Task
       |
       v
+------------------+
| OpenRouter       |
| Dispatcher       |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+--------+ +--------+
|Consensus| |Prompt  |
|Selector | |Registry|
+--------+ +--------+
    |         |
    +----+----+
         |
         v
+------------------+
| OpenRouter API   |
| (dynamic model)  |
+--------+---------+
         |
         v
+------------------+
| Pydantic Parser  |
| (JSON validation)|
+--------+---------+
         |
         v
   Structured Output
```

---

## Consensus Model Selector

File: `ai/consensus_selector.py`

Every AI task scores available OpenRouter models by:

```
score = (context_length / 1M * 0.2) + (strength_score * 0.5) + (availability_score * 0.3)
```

**Strength tiers:**
| Tier | Models | Base Score |
|------|--------|-----------|
| Top | GPT-4o, Claude 3.5 Sonnet, Claude 3 Opus, o1, o3 | 1.0 |
| High | GPT-4, Claude 3, Gemini 1.5 Pro | 0.85 |
| Medium | Gemini Flash, Llama 3.1 70B, Mixtral | 0.7 |
| Low | Llama 3.1 8B, Gemma 2 | 0.5 |
| Fallback | Everything else | 0.4 |

**Task-specific preferences** (bonus on top):
| Task | Preferred Models |
|------|-----------------|
| study_analysis | o3 (+0.2), GPT-4 (+0.15), Claude (+0.1) |
| safety_adjustment | Claude (+0.15), GPT-4 (+0.1) |
| guide_generation | Claude (+0.1), Gemini (+0.05) |
| conflict_arbitration | o3 (+0.2), Claude (+0.1) |
| molecule_classification | GPT-4 (+0.1), Gemini (+0.05) |

**Excluded models:** GPT-3.5 Turbo, GPT-3.5 Turbo 16k

---

## Dispatcher

File: `ai/dispatcher.py`

Unified inference router:
1. Renders Jinja2 prompt template with context variables
2. Selects best model via ConsensusSelector
3. Calls OpenRouter chat completions API with `response_format: json_object`
4. Falls through fallback models on failure
5. Parses JSON response into Pydantic model

```python
dispatcher.dispatch(
    task_type="study_analysis",
    template_vars={
        "ingredient_name": "spinach",
        "study_title": "...",
        "study_abstract": "..."
    }
)
# Returns: StudyAnalysisResponse(...)
```

---

## Pydantic Response Models

File: `ai/parsers.py`

| Model | Key Fields |
|-------|-----------|
| StudyAnalysisResponse | primary_ingredient, summary, safety_impact (-5 to +5), health_impact (-5 to +5), confidence, red_flags |
| SafetyAdjustmentResponse | new_safety_score (0-100), new_health_index (0-100), reasoning, pmid_cited |
| GuideGenerationResponse | markdown_content (min 100 chars), version |
| ConflictArbitrationResponse | resolved_value, confidence, explanation |
| MoleculeClassificationResponse | harm_level (0-5), harm_mechanisms, is_heat_stable, is_neutralizable, reasoning, confidence |

---

## Prompt Templates

All stored as version-controlled Jinja2 files in `ai/prompts/`:

| File | Purpose |
|------|---------|
| `study_analysis.j2` | Analyze PubMed study abstract |
| `safety_adjustment.j2` | Propose score changes with guidelines |
| `guide_generation.j2` | Generate agent instruction guide |
| `conflict_arbitration.j2` | Resolve data conflicts between sources |
| `molecule_classification.j2` | Auto-classify molecules |

---

## Integration With Other Phases

| Phase | Integration Point |
|-------|------------------|
| Phase 5 | `pubmed_watcher.py` + `study_analyzer.py` call dispatcher for study analysis |
| Phase 5 | `safety_adjuster.py` calls dispatcher for score proposals |
| Phase 6 | `generate_guides.py` calls dispatcher for guide creation |
| Phase 3 | `conflict_arbitration` used when data sources disagree |

---

## Configuration

All AI settings in `.env`:
```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Model list is cached for 5 minutes to avoid rate limiting OpenRouter's `/models` endpoint.
