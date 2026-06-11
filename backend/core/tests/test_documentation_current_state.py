from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CURRENT_STATE_DOCS = [
    PROJECT_ROOT / "IMPLEMENTATION_PLAN.md",
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
        "FoodDetailScreen | ✅ Complete | API-backed detail screen with molecules",
        "ScanScreen | ✅ Complete | Camera button (placeholder, no API)",
        "HomeScreen | ✅ Complete | Title, subtitle, navigation buttons",
        "App.tsx navigation | ✅ Complete | Stack navigator with 4 screens",
        "App.tsx navigation | ✅ Complete | Stack navigator with Home, Search, Food Detail, Scan, and Ban List screens",
        "App.tsx navigation | ✅ Complete | Stack navigator with Home, Search, Compare, Food Detail, Scan, and Ban List screens",
        "Mobile app has API-backed search/detail and OCR scan flows.",
        "The mobile app supports API-backed search, food details, and camera/gallery label scanning through the backend OCR pipeline.",
        "Camera/OCR integration not implemented",
        "No API calls wired up yet",
        "ScanResultScreen | Parsed ingredients, overall score, color list",
        "IngredientDetailScreen | Full food/molecule info + latest AI summaries + studies",
        "HistoryScreen | Past scans (local SQLite)",
        "FavoritesScreen | Saved foods (local SQLite)",
        "SettingsScreen | Dietary prefs, allergen alerts, offline mode, about",
        "OnboardingScreen | First-launch tutorial",
        "expo-ml-kit",
        "SQLite for local caching",
        "Sync top 500 most-searched foods to local SQLite",
        "Mobile app caches last 50 searches in SQLite",
        "Queue scans when offline; process when connection restored",
        "Phase 9 | ban_list.md, BanListEntry model | Doc + model done, data empty",
        "Phase 10 | 16 views, 9 serializers, settings.py, urls.py, admin.py",
        "Phase 11 | 3 pages, Layout, API client, types | Pages complete, 3 pages missing",
        "Phase 12 | 4 screens, navigation, history store | Scaffolded, mostly placeholder",
        "Phase 12 | 4 screens, API client, scan flow, history store, EAS profiles",
        "Phase 12 | 5 screens, API client, scan flow, ban list, history store, EAS profiles",
        "Phase 12 | 6 screens, API client, compare, scan flow, ban list, history store, EAS profiles",
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


def test_current_state_docs_describe_mobile_release_scope():
    docs = "\n".join(path.read_text(encoding="utf-8") for path in CURRENT_STATE_DOCS)

    required_claims = [
        "App.tsx navigation | ✅ Complete | Stack navigator with Home, Search, Compare, Food Detail, Molecule Detail, Scan, and Ban List screens",
        "FoodDetailScreen | ✅ Complete | API-backed detail screen with images, molecules, health breakdown, AI guide, and linked research",
        "MoleculeDetailScreen | ✅ Complete | API-backed detail screen with structure image, harm mechanisms, and linked foods",
        "ScanScreen | ✅ Complete | Camera/gallery image scan posts to backend `/scan/` and surfaces OCR confidence, matches, and images",
        "Phase 12 | 7 screens, API client, compare, scan flow, ban list, history store, EAS profiles | App code ready for native build validation",
        "API-backed search, compare, food detail, molecule detail, ban list, and scan flows",
        "Recent scan history is stored **locally** on device with AsyncStorage",
        "Current-state note:",
        "For launch readiness, use the deliverable status tables in each phase",
    ]

    for claim in required_claims:
        assert claim in docs


def test_production_handoff_guide_is_discoverable_and_actionable():
    readme = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(
        encoding="utf-8"
    )
    handoff = (PROJECT_ROOT / "docs" / "HANDOFF_NEXT_STEPS.md").read_text(
        encoding="utf-8"
    )

    assert "docs/HANDOFF_NEXT_STEPS.md" in readme
    assert "docs/HANDOFF_NEXT_STEPS.md" in checklist

    required_launch_gates = [
        "python scripts/check_local_release.py",
        "python scripts/check_launch_env.py --env-file .env.production",
        "python scripts/check_secret_hygiene.py",
        "python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1",
        "python scripts/check_query_plans.py --threshold-ms 200",
        "## 2. Phase 1: Freeze And Re-run Local Gates",
        "## 7. Phase 6: Web Deployment And DNS",
        "## 10. Phase 9: Mobile And OCR Physical-Device Validation",
        "bun install --frozen-lockfile",
        "npx expo prebuild",
    ]

    for gate in required_launch_gates:
        assert gate in handoff
