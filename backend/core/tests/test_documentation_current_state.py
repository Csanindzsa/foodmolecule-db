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
    ]

    for claim in stale_claims:
        assert claim not in docs
