# nutrii Ban List Regulatory Tracker

This tracker defines how jurisdiction-level ban-list status should be recorded in `ban_list/ban_list.json`.

Status: draft. Existing structured entries are migrated from `ban_list/ban_list.md` and still require citations before production use.

## Status Values

| Status | Meaning |
|--------|---------|
| `banned` | The food or preparation is prohibited in the jurisdiction. |
| `restricted` | Sale, import, preparation, or concentration is limited by rule or license. |
| `permitted` | The jurisdiction explicitly permits the food or preparation under documented conditions. |
| `under_review` | A regulator or standards body has a pending review or unresolved advisory. |

## Required Fields

Each jurisdiction object in `regulatory_status` must include:

- `status`: one of the schema status values.

Optional fields:

- `regulation`: law, rule, standard, or guidance identifier.
- `agency`: regulator or standards body.
- `note`: short explanation of the local rule.
- `date`: publication or access date when known.
- `max_ppm`: numeric concentration limit when applicable.

## Current Draft Coverage

| Entry | Jurisdictions currently noted | Citation state |
|-------|-------------------------------|----------------|
| Castor beans | global restricted draft note | Citation required |
| Raw bitter almonds | EU, USA restricted draft notes | Citation required |
| Puffer fish / fugu | EU banned, USA restricted, Japan restricted draft notes | Citation required |
| Ackee | USA restricted draft note | Citation required |

Entries without a jurisdiction row in `ban_list/ban_list.json` should be treated as having no verified regulatory status yet.

## Verification Workflow

1. Capture the regulator or standards-body source URL outside this file.
2. Add or update the matching jurisdiction object in `ban_list/ban_list.json`.
3. Keep the entry-level `requires_citation` flag true until all critical claims in the entry are sourced.
4. Run `python scripts/validate_schema.py ban_list ban_list/ban_list.json`.
5. Record production verification in `docs/launch_checklist.md` only after the verified entries are seeded and visible in the UI.
