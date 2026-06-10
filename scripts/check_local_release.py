"""Run local no-credential release readiness checks as one audit."""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class AuditCommand:
    name: str
    args: tuple[str, ...]


LOCAL_AUDIT_COMMANDS = (
    AuditCommand("seed-readiness", ("scripts/check_seed_readiness.py", "--min-foods", "100", "--min-molecules", "4")),
    AuditCommand("ban-list-schema", ("scripts/validate_schema.py", "ban_list", "ban_list/ban_list.json")),
    AuditCommand("backend-release-contract", ("scripts/check_backend_release.py",)),
    AuditCommand("api-smoke-probe-list", ("scripts/smoke_api.py", "--list-probes")),
    AuditCommand("query-plan-target-list", ("scripts/check_query_plans.py", "--list")),
    AuditCommand("web-route-contract", ("scripts/check_web_routes.py",)),
    AuditCommand("web-release-contract", ("scripts/check_web_release.py",)),
    AuditCommand("mobile-release-contract", ("scripts/check_mobile_release.py",)),
    AuditCommand("research-ops-contract", ("scripts/check_research_ops.py",)),
    AuditCommand("image-ops-contract", ("scripts/check_image_ops.py",)),
    AuditCommand("ban-list-surface-contract", ("scripts/check_ban_list_surface.py",)),
    AuditCommand("observability-contract", ("scripts/check_observability.py",)),
    AuditCommand("ai-contract", ("scripts/check_ai_contract.py",)),
    AuditCommand("image-surface-contract", ("scripts/check_image_surface.py",)),
)


def build_commands(env_file: Path | None = None) -> tuple[AuditCommand, ...]:
    commands = list(LOCAL_AUDIT_COMMANDS)
    if env_file is not None:
        commands.insert(
            0,
            AuditCommand(
                "launch-env-preflight",
                ("scripts/check_launch_env.py", "--env-file", str(env_file)),
            ),
        )
    return tuple(commands)


def run_command(command: AuditCommand, *, python: str = sys.executable, cwd: Path = PROJECT_ROOT) -> int:
    print(f"===== {command.name} =====", flush=True)
    result = subprocess.run((python, *command.args), cwd=cwd, check=False)
    return result.returncode


def run_audit(commands: tuple[AuditCommand, ...], *, python: str = sys.executable, cwd: Path = PROJECT_ROOT) -> int:
    failed: list[str] = []
    for command in commands:
        exit_code = run_command(command, python=python, cwd=cwd)
        if exit_code != 0:
            failed.append(command.name)

    if failed:
        print("FAILED checks: " + ", ".join(failed), file=sys.stderr)
        return 1

    print("Local release audit passed.")
    return 0


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local no-credential release readiness checks.")
    parser.add_argument(
        "--env-file",
        type=Path,
        help="Optional production env file to include the launch environment preflight.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.env_file is not None and not args.env_file.is_file():
        print(f"error: env file not found: {args.env_file}", file=sys.stderr)
        return 2
    return run_audit(build_commands(args.env_file))


if __name__ == "__main__":
    raise SystemExit(main())
