import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _mobile_app_config() -> dict:
    return json.loads((PROJECT_ROOT / "mobile" / "app.json").read_text(encoding="utf-8"))["expo"]


def _mobile_eas_config() -> dict:
    return json.loads((PROJECT_ROOT / "mobile" / "eas.json").read_text(encoding="utf-8"))


def test_mobile_scan_permissions_are_configured_for_camera_and_library():
    config = _mobile_app_config()
    plugins = config["plugins"]
    plugin_names = {plugin[0] if isinstance(plugin, list) else plugin for plugin in plugins}

    assert "expo-camera" in plugin_names
    assert "expo-image-picker" in plugin_names
    assert config["ios"]["infoPlist"]["NSCameraUsageDescription"]
    assert config["ios"]["infoPlist"]["NSPhotoLibraryUsageDescription"]


def test_mobile_permission_copy_mentions_ingredient_scanning():
    config = _mobile_app_config()
    permission_copy = [
        config["ios"]["infoPlist"]["NSCameraUsageDescription"],
        config["ios"]["infoPlist"]["NSPhotoLibraryUsageDescription"],
    ]
    for plugin in config["plugins"]:
        if isinstance(plugin, list) and len(plugin) > 1:
            permission_copy.extend(str(value) for value in plugin[1].values())

    assert all("ingredient" in text.lower() and "scan" in text.lower() for text in permission_copy)


def test_mobile_eas_build_profiles_are_configured_for_preview_and_production_api():
    config = _mobile_eas_config()

    assert config["build"]["development"]["developmentClient"] is True
    assert config["build"]["development"]["distribution"] == "internal"
    assert config["build"]["preview"]["distribution"] == "internal"
    assert config["build"]["preview"]["env"]["EXPO_PUBLIC_API_URL"] == "https://api.nutrii.fit/api/v1"
    assert config["build"]["production"]["autoIncrement"] is True
    assert config["build"]["production"]["env"]["EXPO_PUBLIC_API_URL"] == "https://api.nutrii.fit/api/v1"
    assert "production" in config["submit"]
