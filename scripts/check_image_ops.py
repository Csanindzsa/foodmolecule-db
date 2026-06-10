"""Validate static image enrichment operations wiring."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ImageOpsCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[ImageOpsCheck, ...]:
    fetcher = _read(project_root / "scripts" / "fetch_images.py")
    overnight = _read(project_root / "scripts" / "overnight_ingestion.sh")
    continuation = _read(project_root / "scripts" / "continue_overnight_ingestion.sh")
    runbook = _read(project_root / "docs" / "overnight_ingestion_runbook.md")
    env_template = _read(project_root / ".env.example")

    return (
        ImageOpsCheck(
            "default-storage-bucket",
            'DEFAULT_BUCKET = os.getenv("SUPABASE_IMAGE_BUCKET", "food-images")' in fetcher,
            "fetcher must default to the food-images bucket",
        ),
        ImageOpsCheck(
            "food-source-allowlist",
            "FOOD_ALLOWED_DOMAINS" in fetcher
            and "commons.wikimedia.org" in fetcher
            and "openfoodfacts.org" in fetcher,
            "food image candidates must be restricted to approved source domains",
        ),
        ImageOpsCheck(
            "prepared-food-filter",
            "REJECT_FOOD_IMAGE_TERMS" in fetcher
            and "recipe" in fetcher
            and "meal" in fetcher
            and "dish" in fetcher,
            "food image candidate filter must reject prepared/noisy terms",
        ),
        ImageOpsCheck(
            "source-download-safety",
            "parsed_url.scheme.lower() != \"https\"" in fetcher
            and "ALLOWED_SOURCE_IMAGE_CONTENT_TYPES" in fetcher
            and "MAX_SOURCE_IMAGE_BYTES" in fetcher,
            "downloads must require HTTPS, allowed image content types, and source size cap",
        ),
        ImageOpsCheck(
            "webp-compression",
            '"ffmpeg"' in fetcher and '"libwebp"' in fetcher and "DEFAULT_MAX_BYTES = 200 * 1024" in fetcher,
            "images must be compressed to WebP below the target size",
        ),
        ImageOpsCheck(
            "supabase-upload",
            "SUPABASE_SERVICE_ROLE_KEY" in fetcher
            and '"Content-Type": "image/webp"' in fetcher
            and '"x-upsert": "true"' in fetcher,
            "uploads must use service-role auth, WebP content type, and upsert",
        ),
        ImageOpsCheck(
            "metadata-attribution",
            "metadata[\"image_source\"]" in fetcher
            and '"provider"' in fetcher
            and '"source_url"' in fetcher
            and '"stored_url"' in fetcher,
            "image enrichment must write source attribution metadata",
        ),
        ImageOpsCheck(
            "dry-run-support",
            'parser.add_argument("--dry-run", action="store_true")' in fetcher
            and "if args.dry_run" in fetcher,
            "fetcher must support dry runs before upload",
        ),
        ImageOpsCheck(
            "overnight-image-steps",
            "scripts/fetch_images.py" in overnight
            and "--entity molecule" in overnight
            and "--entity food" in overnight
            and "--sleep" in overnight,
            "overnight runner must enrich molecule and food images",
        ),
        ImageOpsCheck(
            "continuation-image-steps",
            "scripts/fetch_images.py" in continuation
            and "--entity molecule" in continuation
            and "--entity food" in continuation
            and "--sleep" in continuation,
            "continuation runner must enrich molecule and food images",
        ),
        ImageOpsCheck(
            "runbook-image-guidance",
            "Molecule images" in runbook
            and "Food images via Brave" in runbook
            and "foods_with_images" in runbook
            and "molecules_with_images" in runbook,
            "runbook must document image enrichment order and metrics",
        ),
        ImageOpsCheck(
            "env-template-image-keys",
            "BRAVE_API_KEY=" in env_template
            and "SUPABASE_IMAGE_BUCKET=food-images" in env_template
            and "SUPABASE_SERVICE_ROLE_KEY" in env_template,
            "environment template must document image enrichment keys",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static image enrichment operations wiring.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-image-enrichment\trequires Brave and Supabase service-role credentials")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
