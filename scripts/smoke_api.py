"""Smoke-test the public nutrii API from a deployed base URL.

This intentionally uses only the Python standard library so it can run from
CI, a Render shell, or a local machine without installing project dependencies.
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable
from urllib import error, parse, request


DEFAULT_BASE_URL = "https://api.nutrii.fit/api/v1"
DEFAULT_TIMEOUT_SECONDS = 10.0


@dataclass(frozen=True)
class Probe:
    name: str
    method: str
    path: str
    expected_statuses: tuple[int, ...] = (200,)
    body_path: Path | None = None
    requirement: str | None = None


@dataclass(frozen=True)
class ProbeResult:
    probe: Probe
    status: int | None
    elapsed_ms: int
    ok: bool
    detail: str


BASELINE_PROBES = (
    Probe("health-check", "GET", "health/"),
    Probe("food-list", "GET", "foods/?page_size=1"),
    Probe("food-search", "GET", "foods/search/?q=apple"),
    Probe("molecule-list", "GET", "molecules/?page_size=1"),
    Probe("molecule-search", "GET", "molecules/search/?q=water"),
    Probe("recent-studies", "GET", "studies/recent/?page_size=1"),
    Probe("ban-list", "GET", "ban-list/?page_size=1"),
    Probe("category-list", "GET", "categories/?page_size=1"),
    Probe("processing-method-list", "GET", "processing-methods/?page_size=1"),
    Probe("platform-stats", "GET", "stats/"),
)


def normalize_base_url(base_url: str) -> str:
    cleaned = base_url.strip()
    if not cleaned:
        raise ValueError("API base URL must not be empty.")
    return cleaned.rstrip("/") + "/"


def build_url(base_url: str, probe_path: str) -> str:
    return parse.urljoin(normalize_base_url(base_url), probe_path)


def _validate_uuid(value: str, label: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError as exc:
        raise ValueError(f"{label} must be a valid UUID: {value}") from exc


def _validate_compare_ids(value: str) -> str:
    ids = [item.strip() for item in value.split(",") if item.strip()]
    if len(ids) not in {2, 3}:
        raise ValueError("--compare-food-ids must contain 2 or 3 comma-separated UUIDs.")
    parsed = [_validate_uuid(item, "--compare-food-ids") for item in ids]
    if len(set(parsed)) != len(parsed):
        raise ValueError("--compare-food-ids values must be unique.")
    return ",".join(parsed)


def build_probes(
    *,
    food_id: str | None = None,
    molecule_id: str | None = None,
    compare_food_ids: str | None = None,
    scan_image: Path | None = None,
) -> tuple[tuple[Probe, ...], tuple[str, ...]]:
    probes = list(BASELINE_PROBES)
    missing_requirements: list[str] = []

    if food_id:
        pk = _validate_uuid(food_id, "--food-id")
        probes.extend((
            Probe("food-detail", "GET", f"foods/{pk}/", requirement="--food-id"),
            Probe("food-health-index", "GET", f"foods/{pk}/health-index/", requirement="--food-id"),
            Probe("food-studies", "GET", f"foods/{pk}/studies/", requirement="--food-id"),
            Probe(
                "food-guide",
                "GET",
                f"foods/{pk}/guide/",
                expected_statuses=(200, 404),
                requirement="--food-id",
            ),
        ))
    else:
        missing_requirements.append("--food-id")

    if molecule_id:
        pk = _validate_uuid(molecule_id, "--molecule-id")
        probes.append(Probe("molecule-detail", "GET", f"molecules/{pk}/", requirement="--molecule-id"))
    else:
        missing_requirements.append("--molecule-id")

    if compare_food_ids:
        ids = _validate_compare_ids(compare_food_ids)
        probes.append(Probe("food-compare", "GET", f"foods/compare/?ids={ids}", requirement="--compare-food-ids"))
    else:
        missing_requirements.append("--compare-food-ids")

    if scan_image:
        probes.append(Probe("ingredient-scan", "POST", "scan/", body_path=scan_image, requirement="--scan-image"))
    else:
        missing_requirements.append("--scan-image")

    return tuple(probes), tuple(missing_requirements)


def _multipart_body(field_name: str, file_path: Path) -> tuple[bytes, str]:
    filename = file_path.name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    boundary = f"nutrii-smoke-{int(time.time() * 1000)}"
    file_bytes = file_path.read_bytes()
    body = b"".join((
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode(),
        f"Content-Type: {content_type}\r\n\r\n".encode(),
        file_bytes,
        f"\r\n--{boundary}--\r\n".encode(),
    ))
    return body, f"multipart/form-data; boundary={boundary}"


def _build_request(base_url: str, probe: Probe) -> request.Request:
    url = build_url(base_url, probe.path)
    headers = {"User-Agent": "nutrii-api-smoke/1.0"}
    data = None
    if probe.body_path is not None:
        data, content_type = _multipart_body("image", probe.body_path)
        headers["Content-Type"] = content_type
    return request.Request(url, data=data, headers=headers, method=probe.method)


def run_probe(
    base_url: str,
    probe: Probe,
    *,
    timeout: float,
    urlopen: Callable[..., object] = request.urlopen,
) -> ProbeResult:
    started = time.perf_counter()
    try:
        with urlopen(_build_request(base_url, probe), timeout=timeout) as response:
            status = response.getcode()
            body = response.read(512).decode("utf-8", errors="replace")
    except error.HTTPError as exc:
        status = exc.code
        body = exc.read(512).decode("utf-8", errors="replace")
    except (OSError, error.URLError) as exc:
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        return ProbeResult(probe, None, elapsed_ms, False, str(exc))

    elapsed_ms = round((time.perf_counter() - started) * 1000)
    ok = status in probe.expected_statuses
    expected = "/".join(str(value) for value in probe.expected_statuses)
    detail = f"status {status}; expected {expected}"
    if not ok and body:
        detail = f"{detail}; body {body[:200]}"
    return ProbeResult(probe, status, elapsed_ms, ok, detail)


def run_probes(
    base_url: str,
    probes: Iterable[Probe],
    *,
    timeout: float,
    urlopen: Callable[..., object] = request.urlopen,
) -> tuple[ProbeResult, ...]:
    return tuple(run_probe(base_url, probe, timeout=timeout, urlopen=urlopen) for probe in probes)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke-test the public nutrii API.")
    parser.add_argument(
        "--base-url",
        default=os.getenv("NUTRII_API_URL", DEFAULT_BASE_URL),
        help=f"API base URL ending at /api/v1. Defaults to {DEFAULT_BASE_URL}.",
    )
    parser.add_argument("--food-id", help="Food UUID for detail, health-index, studies, and guide probes.")
    parser.add_argument("--molecule-id", help="Molecule UUID for the molecule detail probe.")
    parser.add_argument("--compare-food-ids", help="Two or three comma-separated food UUIDs for the compare probe.")
    parser.add_argument("--scan-image", type=Path, help="JPEG, PNG, or WebP label image for the scan probe.")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_SECONDS, help="Per-probe timeout in seconds.")
    parser.add_argument("--require-full", action="store_true", help="Fail unless all 17 public API routes are probed.")
    parser.add_argument("--list-probes", action="store_true", help="List probes selected by the provided arguments.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse_args(argv)
        probes, missing_requirements = build_probes(
            food_id=args.food_id,
            molecule_id=args.molecule_id,
            compare_food_ids=args.compare_food_ids,
            scan_image=args.scan_image,
        )
        normalize_base_url(args.base_url)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.scan_image and not args.scan_image.is_file():
        print(f"error: --scan-image does not exist or is not a file: {args.scan_image}", file=sys.stderr)
        return 2

    if args.require_full and missing_requirements:
        print(
            "error: --require-full needs " + ", ".join(missing_requirements),
            file=sys.stderr,
        )
        return 2

    if args.list_probes:
        for probe in probes:
            marker = "optional" if probe.requirement else "baseline"
            expected = "/".join(str(value) for value in probe.expected_statuses)
            print(f"{probe.name}\t{marker}\t{probe.method}\t{probe.path}\texpected={expected}")
        if missing_requirements:
            print("skipped optional probes: " + ", ".join(missing_requirements))
        return 0

    results = run_probes(args.base_url, probes, timeout=args.timeout)
    for result in results:
        prefix = "ok" if result.ok else "FAIL"
        print(f"{prefix}\t{result.probe.name}\t{result.elapsed_ms}ms\t{result.detail}")

    if missing_requirements:
        print("skipped optional probes: " + ", ".join(missing_requirements))

    failed = [result for result in results if not result.ok]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
