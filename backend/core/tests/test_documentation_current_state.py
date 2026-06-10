from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CURRENT_STATE_DOCS = [
    PROJECT_ROOT / "docs" / "launch_checklist.md",
    PROJECT_ROOT / "obsidian" / "nutrii - API Reference.md",
    PROJECT_ROOT / "obsidian" / "nutrii - Development Guide.md",
    PROJECT_ROOT / "obsidian" / "nutrii - Infrastructure and Deployment.md",
    PROJECT_ROOT / "obsidian" / "nutrii - Phase Status Dashboard.md",
    PROJECT_ROOT / "obsidian" / "nutrii - Project Overview.md",
]


def test_current_state_docs_do_not_contain_stale_platform_claims():
    docs = "\n".join(path.read_text(encoding="utf-8") for path in CURRENT_STATE_DOCS)

    stale_claims = [
        "16 API endpoints",
        "16 endpoints implemented",
        "Cursor pagination",
        "cursor pagination",
        "Rate limiting via Redis",
        "Redis configured for caching + rate limiting",
        "`REDIS_URL` | Cache backend | Yes",
        "`GOOGLE_CLOUD_API_KEY` | Cloud Vision OCR | For scan feature",
        "| **Search** | MeiliSearch |",
        "| **OCR** | Google Vision API + ML Kit |",
        "| **Cache** | Redis |",
        "Molecule detail page | ⬜ Not started | Missing",
        "Compare page | ⬜ Not started | Missing",
        "Ban list page | ⬜ Not started | Missing",
        "SearchScreen | ✅ Complete | Text input + result list (API not wired)",
        "FoodDetailScreen | ✅ Complete | Shows food ID (placeholder content)",
        "ScanScreen | ✅ Complete | Camera button (placeholder, no API)",
        "Camera/OCR integration not implemented",
        "No API calls wired up yet",
        "Phase 9 | ban_list.md, BanListEntry model | Doc + model done, data empty",
        "Phase 10 | 16 views, 9 serializers, settings.py, urls.py, admin.py",
        "Phase 11 | 3 pages, Layout, API client, types | Pages complete, 3 pages missing",
        "Phase 12 | 4 screens, navigation, history store | Scaffolded, mostly placeholder",
        "Phase 13 | ocr/README.md, scan.py | Architecture done, not integrated",
        "`ban_list/conditional_warnings.md` | ⬜ Not started | Not yet written",
        "`ban_list/regulatory_tracker.md` | ⬜ Not started | Not yet written",
        "Press kit | ⬜ Not started | Not created",
        "`processing/compound_matrix.csv` | ⬜ Not started | Empty",
        "Phase 8 | methods.md, MoleculeNeutralization model | Methods doc done, data empty",
        "2 examples (spinach, kidney_bean)",
        "Needs actual data population at scale.",
    ]

    for claim in stale_claims:
        assert claim not in docs
