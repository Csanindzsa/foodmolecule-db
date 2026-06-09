# nutrii Ban List Conditional Warnings

This file documents user-facing warning copy for ban-list entries that are only safe under narrow conditions.

Status: draft. Every entry must remain citation-required until backed by PubMed or regulatory sources in `ban_list/ban_list.json`.

## Warning Principles

- Show the unsafe form first, not the safe exception.
- State the exact safe condition in plain language.
- Avoid vague advice such as "cook properly" when the required preparation is specific.
- Keep conditionally safe entries visually distinct from absolute bans in the UI.
- Do not downgrade a warning until the structured entry has verified citations.

## Draft Conditional Entries

| Entry | Unsafe form | Safe condition copy |
|-------|-------------|---------------------|
| Puffer fish / fugu | Unprepared fish or uncertified removal of toxic organs | Only consume when prepared by licensed fugu chefs with certified removal of toxic organs. |
| Ackee | Unripe fruit or fruit prepared with seeds or membranes | Only ripe, naturally opened arils are in scope as conditionally safe. Discard seeds and membranes. |
| Rhubarb leaves | Leaves | Stalks only. Leaves must be discarded. |
| Raw kidney beans | Raw or slow-cooked beans below boiling | Boil at 100 C for at least 10 minutes before consumption. |
| Star fruit in kidney disease | Star fruit consumed by people with kidney disease | The draft exception applies only to people with healthy kidneys. |
| Ergot-contaminated grain | Grain suspected or confirmed to be contaminated | Reject contaminated grain; inspection is the primary safeguard. |

## UI Copy Contract

The API exposes `is_conditionally_safe` and `safe_condition`. The web and mobile UI should:

1. Render conditional entries with a "Conditional" badge.
2. Show `safe_condition` next to the warning, not hidden behind a detail view.
3. Keep absolute entries and conditional entries sortable/filterable.
4. Avoid showing a green or safe visual state for conditional entries.

## Verification Gate

Before any conditional entry is treated as verified:

1. Add at least one PubMed, regulator, or standards-body source.
2. Update `ban_list/ban_list.json` metadata so `requires_citation` is false only for the verified entry.
3. Confirm the source supports both the unsafe form and the safe exception.
4. Re-run `python scripts/validate_schema.py ban_list ban_list/ban_list.json`.
