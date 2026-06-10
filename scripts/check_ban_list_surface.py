"""Validate ban-list draft citation gates are visible in product surfaces."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class BanListSurfaceCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[BanListSurfaceCheck, ...]:
    ban_list = _load_json(project_root / "ban_list" / "ban_list.json")
    entries = ban_list.get("entries", [])
    web_page = _read(project_root / "web" / "src" / "pages" / "BanList.tsx")
    web_ban_list_display = _read(project_root / "web" / "src" / "lib" / "banListDisplay.ts")
    checklist = _read(project_root / "docs" / "launch_checklist.md")
    runbook = _read(project_root / "docs" / "ban_list_surface_checks.md")
    conditional_warnings = _read(project_root / "ban_list" / "conditional_warnings.md")
    regulatory_tracker = _read(project_root / "ban_list" / "regulatory_tracker.md")

    return (
        BanListSurfaceCheck(
            "structured-data-draft-status",
            ban_list.get("evidence_status") == "draft_requires_citation",
            "ban_list.json must keep the draft evidence status until citation verification is complete",
        ),
        BanListSurfaceCheck(
            "entry-citation-gate",
            bool(entries) and all(entry.get("metadata", {}).get("requires_citation") is True for entry in entries),
            "all current structured ban-list entries must remain citation-required",
        ),
        BanListSurfaceCheck(
            "web-draft-copy",
            "Draft safety signals" in web_page
            and "Citation verification required before launch" in web_page
            and "verified production claims" in web_page,
            "web ban-list page must visibly label current rows as draft/citation-required",
        ),
        BanListSurfaceCheck(
            "web-no-verified-badge",
            "Verified</" not in web_page and ">Verified<" not in web_page,
            "web ban-list page must not display a generic Verified badge for draft entries",
        ),
        BanListSurfaceCheck(
            "web-lethal-dose-sanitizer",
            "formatLethalDose(entry.lethal_dose_mg)" in web_page
            and "lethalDoseSortValue(a.lethal_dose_mg)" in web_page
            and "formatLethalDose" in web_ban_list_display
            and "lethalDoseSortValue" in web_ban_list_display
            and "Number.isFinite(parsed)" in web_ban_list_display,
            "web ban-list page must sanitize lethal dose displays and sorting",
        ),
        BanListSurfaceCheck(
            "draft-ops-docs",
            "requires_citation" in conditional_warnings
            and "verified citations" in conditional_warnings
            and "requires_citation" in regulatory_tracker
            and "production use" in regulatory_tracker,
            "ban-list operations docs must preserve the citation gate",
        ),
        BanListSurfaceCheck(
            "runbook-linked-from-launch-checklist",
            "python scripts/check_ban_list_surface.py" in runbook
            and "docs/ban_list_surface_checks.md" in checklist,
            "launch checklist must link the ban-list surface verification runbook",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate ban-list draft citation gates are visible in product surfaces.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tverified-ban-list-live-review\trequires production citations and regulatory source approval")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
