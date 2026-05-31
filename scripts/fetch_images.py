"""
nutrii — Image Fetcher

Finds missing food and molecule images, compresses them below a target size,
uploads them to Supabase Storage, and writes the public URL back to the DB.

Usage:
    python scripts/fetch_images.py --entity all --limit 50 --dry-run
    python scripts/fetch_images.py --entity food --limit 200
    python scripts/fetch_images.py --entity molecule --limit 200
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlparse

import httpx
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from core.models import Food, Molecule


BRAVE_IMAGE_SEARCH_URL = "https://api.search.brave.com/res/v1/images/search"
DEFAULT_BUCKET = os.getenv("SUPABASE_IMAGE_BUCKET", "food-images")
DEFAULT_MAX_BYTES = 200 * 1024
FOOD_ALLOWED_DOMAINS = (
    "commons.wikimedia.org",
    "upload.wikimedia.org",
    "wikipedia.org",
    "openfoodfacts.org",
    "static.openfoodfacts.org",
)
REJECT_FOOD_IMAGE_TERMS = (
    "/wiki/category:",
    "baked",
    "cheese",
    "cooked",
    "dinner",
    "dish",
    "meal",
    "pizza",
    "recipe",
    "salad",
    "soup",
)


@dataclass
class CandidateImage:
    image_url: str
    source_url: str
    provider: str


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:90] or "image"


def domain_allowed(url: str, allowed_domains: tuple[str, ...]) -> bool:
    hostname = (urlparse(url).hostname or "").lower()
    return any(hostname == domain or hostname.endswith(f".{domain}") for domain in allowed_domains)


def food_image_looks_prepared_or_noisy(*urls: str) -> bool:
    haystack = " ".join(urls).lower()
    return any(term in haystack for term in REJECT_FOOD_IMAGE_TERMS)


def pubchem_structure_candidate(molecule: Molecule) -> CandidateImage | None:
    if not molecule.pubchem_cid:
        return None

    cid = molecule.pubchem_cid
    return CandidateImage(
        image_url=f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/PNG?image_size=large",
        source_url=f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
        provider="pubchem",
    )


def brave_food_candidate(food: Food) -> CandidateImage | None:
    api_key = os.getenv("BRAVE_API_KEY", "")
    if not api_key:
        raise RuntimeError("BRAVE_API_KEY is required for food image search")

    query = f"{food.name} food ingredient photo site:commons.wikimedia.org OR site:openfoodfacts.org"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key,
    }
    params = {
        "q": query,
        "count": 10,
        "safesearch": "strict",
        "search_lang": "en",
    }

    with httpx.Client(timeout=30, follow_redirects=True) as client:
        response = client.get(BRAVE_IMAGE_SEARCH_URL, headers=headers, params=params)
        response.raise_for_status()
        payload = response.json()

    for result in payload.get("results", []):
        properties = result.get("properties") or {}
        thumbnail = result.get("thumbnail") or {}
        image_url = (
            properties.get("url")
            or result.get("image_url")
            or result.get("src")
            or thumbnail.get("src")
        )
        source_url = result.get("url") or result.get("source") or image_url

        if not image_url or not source_url:
            continue
        if not (
            domain_allowed(source_url, FOOD_ALLOWED_DOMAINS)
            or domain_allowed(image_url, FOOD_ALLOWED_DOMAINS)
        ):
            continue
        if food_image_looks_prepared_or_noisy(source_url, image_url):
            continue

        return CandidateImage(
            image_url=image_url,
            source_url=source_url,
            provider="brave",
        )

    return None


def download_image(candidate: CandidateImage, output_dir: Path) -> Path:
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        response = client.get(candidate.image_url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").split(";")[0].strip()

    suffix = mimetypes.guess_extension(content_type) or Path(urlparse(candidate.image_url).path).suffix
    if suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        suffix = ".img"

    raw_path = output_dir / f"raw{suffix}"
    raw_path.write_bytes(response.content)
    return raw_path


def compress_with_ffmpeg(input_path: Path, output_path: Path, max_bytes: int) -> None:
    attempts = [
        (900, 80),
        (900, 70),
        (800, 65),
        (700, 60),
        (600, 55),
        (500, 50),
    ]

    for width, quality in attempts:
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                str(input_path),
                "-vf",
                f"scale='min({width},iw)':-2",
                "-c:v",
                "libwebp",
                "-quality",
                str(quality),
                str(output_path),
            ],
            check=True,
        )
        if output_path.stat().st_size <= max_bytes:
            return

    raise RuntimeError(
        f"Could not compress {input_path.name} below {max_bytes} bytes; "
        f"smallest attempt was {output_path.stat().st_size} bytes"
    )


def upload_to_supabase(local_path: Path, object_path: str, bucket: str) -> str:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for upload")

    encoded_path = quote(object_path, safe="/")
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}"
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "image/webp",
        "x-upsert": "true",
    }

    with httpx.Client(timeout=60) as client:
        response = client.post(upload_url, headers=headers, content=local_path.read_bytes())
        response.raise_for_status()

    return f"{supabase_url}/storage/v1/object/public/{bucket}/{encoded_path}"


def update_metadata(obj, candidate: CandidateImage, public_url: str, size_bytes: int) -> None:
    metadata = obj.metadata or {}
    metadata["image_source"] = {
        "provider": candidate.provider,
        "source_url": candidate.source_url,
        "stored_url": public_url,
        "size_bytes": size_bytes,
    }
    obj.metadata = metadata


def process_food(food: Food, args) -> bool:
    try:
        candidate = brave_food_candidate(food)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            print(f"food: {food.name}: Brave rate limit hit; retry later or raise --sleep")
            return False
        raise

    if not candidate:
        print(f"food: {food.name}: no approved candidate")
        return False

    if args.dry_run:
        print(f"food: {food.name}: {candidate.image_url} ({candidate.source_url})")
        return True

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        raw_path = download_image(candidate, tmp_path)
        webp_path = tmp_path / "image.webp"
        compress_with_ffmpeg(raw_path, webp_path, args.max_bytes)
        size_bytes = webp_path.stat().st_size
        object_path = f"foods/{slugify(food.name)}-{food.id}.webp"
        public_url = upload_to_supabase(webp_path, object_path, args.bucket)

    food.image_url = public_url
    update_metadata(food, candidate, public_url, size_bytes)
    food.save(update_fields=["image_url", "metadata", "updated_at"])
    print(f"food: {food.name}: uploaded {public_url}")
    return True


def process_molecule(molecule: Molecule, args) -> bool:
    candidate = pubchem_structure_candidate(molecule)
    if not candidate:
        print(f"molecule: {molecule.name}: missing PubChem CID")
        return False

    if args.dry_run:
        print(f"molecule: {molecule.name}: {candidate.image_url} ({candidate.source_url})")
        return True

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        raw_path = download_image(candidate, tmp_path)
        webp_path = tmp_path / "image.webp"
        compress_with_ffmpeg(raw_path, webp_path, args.max_bytes)
        object_path = f"molecules/{slugify(molecule.name)}-{molecule.id}.webp"
        public_url = upload_to_supabase(webp_path, object_path, args.bucket)
        size_bytes = webp_path.stat().st_size

    molecule.structure_image_url = public_url
    update_metadata(molecule, candidate, public_url, size_bytes)
    molecule.save(update_fields=["structure_image_url", "metadata"])
    print(f"molecule: {molecule.name}: uploaded {public_url}")
    return True


def run(args) -> None:
    processed = 0

    if args.entity in {"food", "all"}:
        foods = Food.objects.filter(image_url="").order_by("name")[: args.limit]
        for food in foods:
            processed += int(process_food(food, args))
            time.sleep(args.sleep)

    if args.entity in {"molecule", "all"}:
        molecules = Molecule.objects.filter(structure_image_url="").order_by("name")[: args.limit]
        for molecule in molecules:
            processed += int(process_molecule(molecule, args))

    print(f"Done. Processed {processed} image candidate(s).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch and optimize missing Nutrii images")
    parser.add_argument("--entity", choices=["food", "molecule", "all"], default="all")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    parser.add_argument("--sleep", type=float, default=1.0, help="Delay between food image API calls")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    run(args)


if __name__ == "__main__":
    main()
