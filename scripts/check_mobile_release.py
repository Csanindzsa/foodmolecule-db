"""Validate static Expo mobile release readiness without native builds."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MOBILE_ROOT = PROJECT_ROOT / "mobile"
PRODUCTION_API_URL = "https://api.nutrii.fit/api/v1"


@dataclass(frozen=True)
class MobileCheck:
    name: str
    ok: bool
    detail: str


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_https_api_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and parsed.netloc and parsed.path.rstrip("/").endswith("/api/v1")


def _plugin_names(config: dict) -> set[str]:
    names = set()
    for plugin in config.get("plugins", []):
        names.add(plugin[0] if isinstance(plugin, list) else plugin)
    return names


def run_checks(mobile_root: Path = MOBILE_ROOT, *, require_store_ids: bool = False) -> tuple[MobileCheck, ...]:
    app = _load_json(mobile_root / "app.json")["expo"]
    eas = _load_json(mobile_root / "eas.json")
    app_root = (mobile_root / "App.tsx").read_text(encoding="utf-8")
    navigation_types = (mobile_root / "src" / "navigation" / "types.ts").read_text(encoding="utf-8")
    scan_screen = (mobile_root / "src" / "screens" / "ScanScreen.tsx").read_text(encoding="utf-8")
    search_screen = (mobile_root / "src" / "screens" / "SearchScreen.tsx").read_text(encoding="utf-8")
    food_detail_screen = (mobile_root / "src" / "screens" / "FoodDetailScreen.tsx").read_text(encoding="utf-8")
    ban_list_screen = (mobile_root / "src" / "screens" / "BanListScreen.tsx").read_text(encoding="utf-8")
    home_screen = (mobile_root / "src" / "screens" / "HomeScreen.tsx").read_text(encoding="utf-8")
    history_store = (mobile_root / "src" / "stores" / "useHistoryStore.ts").read_text(encoding="utf-8")
    api_client = (mobile_root / "src" / "lib" / "api.ts").read_text(encoding="utf-8")
    plugins = _plugin_names(app)

    preview_api = eas["build"]["preview"]["env"].get("EXPO_PUBLIC_API_URL", "")
    production_api = eas["build"]["production"]["env"].get("EXPO_PUBLIC_API_URL", "")
    ios = app.get("ios", {})
    android = app.get("android", {})
    checks = [
        MobileCheck(
            "preview-api-url",
            preview_api == PRODUCTION_API_URL and _is_https_api_url(preview_api),
            "preview EXPO_PUBLIC_API_URL must point to production /api/v1",
        ),
        MobileCheck(
            "production-api-url",
            production_api == PRODUCTION_API_URL and _is_https_api_url(production_api),
            "production EXPO_PUBLIC_API_URL must point to production /api/v1",
        ),
        MobileCheck(
            "camera-and-library-plugins",
            {"expo-camera", "expo-image-picker"}.issubset(plugins),
            "expo-camera and expo-image-picker plugins must be configured",
        ),
        MobileCheck(
            "ios-permission-copy",
            bool(ios.get("infoPlist", {}).get("NSCameraUsageDescription"))
            and bool(ios.get("infoPlist", {}).get("NSPhotoLibraryUsageDescription")),
            "iOS camera and photo-library permission copy must be present",
        ),
        MobileCheck(
            "scan-screen-wiring",
            "launchCameraAsync" in scan_screen
            and "launchImageLibraryAsync" in scan_screen
            and "api.scanImage" in scan_screen,
            "ScanScreen must launch camera/library and submit to api.scanImage",
        ),
        MobileCheck(
            "scan-api-client",
            '"/scan/"' in api_client and "new FormData()" in api_client and 'append("image"' in api_client,
            "mobile API client must post FormData image uploads to /scan/",
        ),
        MobileCheck(
            "scan-upload-mime-contract",
            'return "image/png"' in api_client
            and 'return "image/webp"' in api_client
            and 'return "image/jpeg"' in api_client
            and "imageName(uri)" in api_client
            and "imageType(uri)" in api_client,
            "mobile upload client must name files and send JPEG, PNG, or WebP content types",
        ),
        MobileCheck(
            "scan-result-ux-contract",
            "OCR confidence" in scan_screen
            and "raw_text_truncated" in scan_screen
            and "Raw OCR" in scan_screen
            and "Truncated" in scan_screen
            and "No ingredient terms detected." in scan_screen
            and "No food matches found." in scan_screen,
            "ScanScreen must show confidence, raw OCR truncation, empty states, and matches",
        ),
        MobileCheck(
            "scan-history-contract",
            "useHistoryStore" in scan_screen
            and "addHistory" in scan_screen
            and "response.foods.slice(0, 5)" in scan_screen,
            "successful scans must persist up to five matched foods to local history",
        ),
        MobileCheck(
            "scan-history-context-contract",
            "image_url?: string" in history_store
            and "health_index?: number | null" in history_store
            and "image_url: food.image_url" in scan_screen
            and "health_index: food.health_index ?? null" in scan_screen
            and "item.image_url" in home_screen
            and "historyImage" in home_screen
            and "item.health_index" in home_screen
            and "historyScore" in home_screen,
            "scan history must preserve food image and health context for recent scans",
        ),
        MobileCheck(
            "mobile-image-surface-contract",
            "image_url?: string" in api_client
            and "structure_image_url?: string" in api_client
            and "Image" in search_screen
            and "item.image_url" in search_screen
            and "molecule.structure_image_url" in search_screen
            and "resultImage" in search_screen
            and "moleculeImage" in search_screen
            and "Image" in food_detail_screen
            and "food.image_url" in food_detail_screen
            and "heroImage" in food_detail_screen
            and "Image" in scan_screen
            and "food.image_url" in scan_screen
            and "matchImage" in scan_screen,
            "mobile search, detail, and scan result screens must surface enriched food images",
        ),
        MobileCheck(
            "mobile-search-molecule-contract",
            "type Molecule" in api_client
            and "response.molecules" in search_screen
            and "moleculeResults" in search_screen
            and "Molecules" in search_screen
            and "No matching foods or molecules found." in search_screen
            and "molecule.harm_level" in search_screen
            and "molecule.molecular_formula" in search_screen,
            "mobile search must preserve and display molecule matches returned by the API",
        ),
        MobileCheck(
            "mobile-research-surface-contract",
            "type Study" in api_client
            and "foodStudies" in api_client
            and "/studies/" in api_client
            and "api.foodStudies(id)" in food_detail_screen
            and "Latest Research" in food_detail_screen
            and "study.ai_summary" in food_detail_screen
            and "study.ai_confidence" in food_detail_screen
            and "study.url" in food_detail_screen
            and "Linking.openURL" in food_detail_screen
            and 'accessibilityRole="link"' in food_detail_screen,
            "mobile food detail must surface linked research summaries and PubMed citation links",
        ),
        MobileCheck(
            "mobile-ai-guide-contract",
            "type FoodGuide" in api_client
            and "type HealthBreakdown" in api_client
            and "foodGuide" in api_client
            and "foodHealthIndex" in api_client
            and "/guide/" in api_client
            and "/health-index/" in api_client
            and "api.foodGuide(id)" in food_detail_screen
            and "api.foodHealthIndex(id)" in food_detail_screen
            and "Agent Guide" in food_detail_screen
            and "guide.guide" in food_detail_screen
            and "Health Breakdown" in food_detail_screen
            and "breakdown.benefit_score" in food_detail_screen
            and "breakdown.bioavailability_score" in food_detail_screen,
            "mobile food detail must surface AI guide copy and health-index breakdowns",
        ),
        MobileCheck(
            "mobile-ban-list-contract",
            "type BanListEntry" in api_client
            and "banList:" in api_client
            and '"/ban-list/"' in api_client
            and "BanList: undefined" in navigation_types
            and "BanListScreen" in app_root
            and 'name="BanList"' in app_root
            and 'navigation.navigate("BanList")' in home_screen
            and "api.banList()" in ban_list_screen
            and "Citation verification required" in ban_list_screen
            and "Citation-required draft" in ban_list_screen
            and "entry.lethal_dose_mg" in ban_list_screen
            and "entry.is_conditionally_safe" in ban_list_screen
            and 'navigation.navigate("FoodDetail"' in ban_list_screen,
            "mobile must expose the draft/citation-gated ban list with food-detail navigation",
        ),
        MobileCheck(
            "eas-build-profiles",
            eas["build"]["development"].get("developmentClient") is True
            and eas["build"]["preview"].get("distribution") == "internal"
            and eas["build"]["production"].get("autoIncrement") is True,
            "development, preview, and production EAS profiles must be configured",
        ),
    ]
    if require_store_ids:
        checks.extend([
            MobileCheck(
                "ios-bundle-identifier",
                bool(ios.get("bundleIdentifier")),
                "iOS bundleIdentifier is required before App Store submission",
            ),
            MobileCheck(
                "android-package",
                bool(android.get("package")),
                "Android package is required before Play Store submission",
            ),
        ])
    return tuple(checks)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static Expo mobile release readiness.")
    parser.add_argument("--mobile-root", type=Path, default=MOBILE_ROOT, help="Path to the Expo app root.")
    parser.add_argument(
        "--require-store-ids",
        action="store_true",
        help="Also require ios.bundleIdentifier and android.package.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.mobile_root, require_store_ids=args.require_store_ids)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    if not args.require_store_ids:
        print("skip\tstore-identifiers\tpass --require-store-ids after Apple/Google IDs are chosen")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
