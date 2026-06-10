"""Validate image-enriched data is surfaced in the React web app."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ImageSurfaceCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[ImageSurfaceCheck, ...]:
    types = _read(project_root / "web" / "src" / "types" / "index.ts")
    food_detail = _read(project_root / "web" / "src" / "pages" / "FoodDetail.tsx")
    molecule_detail = _read(project_root / "web" / "src" / "pages" / "MoleculeDetail.tsx")
    home = _read(project_root / "web" / "src" / "pages" / "Home.tsx")
    search = _read(project_root / "web" / "src" / "pages" / "Search.tsx")
    safe_url = _read(project_root / "web" / "src" / "lib" / "safeUrl.ts")
    runbook = _read(project_root / "docs" / "image_surface_checks.md")
    checklist = _read(project_root / "docs" / "launch_checklist.md")

    return (
        ImageSurfaceCheck(
            "web-image-types",
            "image_url?: string" in types and "structure_image_url?: string" in types,
            "web types must carry optional food and molecule image URLs",
        ),
        ImageSurfaceCheck(
            "food-detail-image",
            "food.image_url" in food_detail
            and "externalHttpUrl(food.image_url)" in food_detail
            and "<img" in food_detail
            and "loading=\"lazy\"" in food_detail
            and "object-cover" in food_detail
            and "Food photo" in food_detail,
            "food detail must render an accessible lazy-loaded food image when present",
        ),
        ImageSurfaceCheck(
            "molecule-detail-image",
            "molecule.structure_image_url" in molecule_detail
            and "externalHttpUrl(molecule.structure_image_url)" in molecule_detail
            and "<img" in molecule_detail
            and "loading=\"lazy\"" in molecule_detail
            and "object-contain" in molecule_detail
            and "Molecular structure" in molecule_detail,
            "molecule detail must render an accessible lazy-loaded structure image when present",
        ),
        ImageSurfaceCheck(
            "list-image-thumbnails",
            "food.image_url" in home
            and "f.image_url" in search
            and "m.structure_image_url" in search
            and "externalHttpUrl(food.image_url)" in home
            and "externalHttpUrl(f.image_url)" in search
            and "externalHttpUrl(m.structure_image_url)" in search
            and home.count("<img") >= 1
            and search.count("<img") >= 2,
            "home and search lists must surface food and molecule image thumbnails",
        ),
        ImageSurfaceCheck(
            "http-only-image-urls",
            "externalHttpUrl" in safe_url
            and "http:" in safe_url
            and "https:" in safe_url,
            "web image rendering must share the HTTP(S)-only external URL sanitizer",
        ),
        ImageSurfaceCheck(
            "stable-image-layout",
            "h-24 w-24" in food_detail
            and "h-40 w-40" in molecule_detail
            and "h-28 w-full" in home
            and "h-12 w-12" in search,
            "image containers must use stable dimensions to avoid layout shift",
        ),
        ImageSurfaceCheck(
            "runbook-linked-from-launch-checklist",
            "python scripts/check_image_surface.py" in runbook
            and "docs/image_surface_checks.md" in checklist,
            "launch checklist must link the image surface runbook",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate image-enriched data is surfaced in the React web app.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-image-rendering\trequires enriched production image URLs and browser verification")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
