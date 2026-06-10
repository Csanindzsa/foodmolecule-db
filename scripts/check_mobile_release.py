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
    scan_screen = (mobile_root / "src" / "screens" / "ScanScreen.tsx").read_text(encoding="utf-8")
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
