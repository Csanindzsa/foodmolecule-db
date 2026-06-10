"""Check tracked files for high-confidence committed secret leaks."""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ALLOWED_ENV_FILES = {".env.example"}
MAX_TEXT_BYTES = 1_000_000
SKIP_SUFFIXES = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".ico",
    ".pdf",
    ".lock",
    ".tsbuildinfo",
}


@dataclass(frozen=True)
class Finding:
    rule: str
    path: str
    line: int


SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private-key-block", re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")),
    ("openrouter-api-key", re.compile(r"\bsk-or-v1-[A-Za-z0-9_-]{20,}\b")),
    ("openai-api-key", re.compile(r"\bsk-(?!or-v1-)[A-Za-z0-9_-]{32,}\b")),
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b")),
    ("slack-token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
)


def tracked_files(project_root: Path = PROJECT_ROOT) -> list[Path]:
    result = subprocess.run(
        ("git", "ls-files", "-z"),
        cwd=project_root,
        check=True,
        capture_output=True,
    )
    return [
        project_root / path.decode("utf-8")
        for path in result.stdout.split(b"\0")
        if path
    ]


def should_scan(path: Path) -> bool:
    if path.suffix.lower() in SKIP_SUFFIXES:
        return False
    try:
        return path.stat().st_size <= MAX_TEXT_BYTES
    except OSError:
        return False


def env_file_finding(path: Path, project_root: Path = PROJECT_ROOT) -> Finding | None:
    rel = path.relative_to(project_root).as_posix()
    if path.name.startswith(".env") and path.name not in ALLOWED_ENV_FILES:
        return Finding("tracked-env-file", rel, 1)
    return None


def client_service_role_finding(path: Path, text: str, project_root: Path = PROJECT_ROOT) -> Finding | None:
    rel = path.relative_to(project_root).as_posix()
    if not (rel.startswith("web/") or rel.startswith("mobile/")):
        return None
    if "SUPABASE_SERVICE_ROLE_KEY" not in text:
        return None
    for index, line in enumerate(text.splitlines(), start=1):
        if "SUPABASE_SERVICE_ROLE_KEY" in line:
            return Finding("client-service-role-reference", rel, index)
    return Finding("client-service-role-reference", rel, 1)


def scan_file(path: Path, project_root: Path = PROJECT_ROOT) -> list[Finding]:
    rel = path.relative_to(project_root).as_posix()
    env_finding = env_file_finding(path, project_root)
    findings = [env_finding] if env_finding else []
    if not should_scan(path):
        return findings

    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return findings
    except OSError:
        return findings

    service_role_finding = client_service_role_finding(path, text, project_root)
    if service_role_finding:
        findings.append(service_role_finding)

    for index, line in enumerate(text.splitlines(), start=1):
        for rule, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(Finding(rule, rel, index))

    return findings


def scan_tracked_files(paths: list[Path], project_root: Path = PROJECT_ROOT) -> list[Finding]:
    findings: list[Finding] = []
    for path in paths:
        findings.extend(scan_file(path, project_root))
    return findings


def main() -> int:
    findings = scan_tracked_files(tracked_files())
    if findings:
        for finding in findings:
            print(f"fail\t{finding.rule}\t{finding.path}:{finding.line}")
        return 1

    print("ok\tsecret-hygiene\ttracked files contain no high-confidence committed secrets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
