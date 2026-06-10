# Ban List Surface Checks

Status: no-credential release check for the current draft ban-list data.

## Command

Run from the repository root:

```bash
python scripts/check_ban_list_surface.py
```

CI and the local release audit run this command before backend tests.

## What It Verifies

- `ban_list/ban_list.json` keeps `evidence_status` set to `draft_requires_citation`.
- Every current structured entry keeps `metadata.requires_citation` set to `true`.
- The React ban-list page visibly labels the current rows as draft safety signals that require citation and regulatory verification.
- The React ban-list page does not show a generic verified badge for draft entries.
- The React ban-list page sanitizes lethal-dose displays and sorting before rendering.
- The conditional warning and regulatory tracker docs keep the citation gate documented.

## Live Launch Follow-Up

This check does not decide whether any entry is legally or medically launch-ready. Before public release, attach PubMed or regulatory sources to each production claim, clear `requires_citation` only for verified entries, and confirm the deployed UI does not mix draft review rows with verified production claims.
