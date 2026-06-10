# Research Surface Checks

Status: no-credential static contract for the web research surface.

## Command

Run from the repository root:

```bash
python scripts/check_research_surface.py
```

CI and the local release audit run this checker before backend tests.

## What It Verifies

- `StudySerializer` exposes PubMed URL, AI summary, AI confidence, and publication year fields.
- The web `Study` type carries the same citation and AI fields.
- Food detail renders the Latest Research card list and caps the preview to five studies.
- The web API client and hook expose `/studies/recent/` for standalone recent research browsing.
- The `/research` page renders recent AI-analyzed PubMed studies with summaries and impact context.
- PubMed citation links open in a new tab and include `rel="noreferrer"`.
- Study cards keep AI summaries, PMID, publication year, and AI confidence visible.

## Live Follow-Up

After production data is seeded, open several deployed food detail pages and confirm PubMed citation links resolve to the expected `pubmed.ncbi.nlm.nih.gov` study pages.
