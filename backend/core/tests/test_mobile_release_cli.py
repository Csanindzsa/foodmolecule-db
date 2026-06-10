from pathlib import Path

from scripts import check_mobile_release


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_mobile_release_checker_passes_static_mvp_contract():
    checks = check_mobile_release.run_checks(PROJECT_ROOT / "mobile")

    assert all(check.ok for check in checks)
    assert {check.name for check in checks} == {
        "preview-api-url",
        "production-api-url",
        "camera-and-library-plugins",
        "ios-permission-copy",
        "mobile-bun-lockfile",
        "mobile-ci-typecheck",
        "mobile-ci-unit-tests",
        "scan-screen-wiring",
        "scan-api-client",
        "mobile-api-id-bound",
        "mobile-route-id-bound",
        "scan-upload-mime-contract",
        "scan-result-ux-contract",
        "mobile-search-query-bound",
        "scan-history-contract",
        "scan-history-context-contract",
        "mobile-image-surface-contract",
        "mobile-search-molecule-contract",
        "mobile-molecule-detail-contract",
        "mobile-research-surface-contract",
        "mobile-recent-research-contract",
        "mobile-ai-confidence-sanitizer",
        "mobile-ai-guide-contract",
        "mobile-health-label-sanitizer",
        "mobile-optional-text-sanitizer",
        "mobile-ban-list-contract",
        "mobile-compare-contract",
        "eas-build-profiles",
    }


def test_mobile_release_checker_store_ids_are_optional_until_accounts_exist():
    checks = check_mobile_release.run_checks(PROJECT_ROOT / "mobile", require_store_ids=True)
    failures = {check.name for check in checks if not check.ok}

    assert failures == {"ios-bundle-identifier", "android-package"}


def test_mobile_release_cli_outputs_summary(capsys):
    exit_code = check_mobile_release.main(["--mobile-root", str(PROJECT_ROOT / "mobile")])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tproduction-api-url" in captured.out
    assert "ok\tmobile-ci-typecheck" in captured.out
    assert "ok\tmobile-ci-unit-tests" in captured.out
    assert "ok\tmobile-api-id-bound" in captured.out
    assert "ok\tmobile-route-id-bound" in captured.out
    assert "ok\tscan-result-ux-contract" in captured.out
    assert "ok\tmobile-search-query-bound" in captured.out
    assert "ok\tscan-history-context-contract" in captured.out
    assert "ok\tmobile-image-surface-contract" in captured.out
    assert "ok\tmobile-search-molecule-contract" in captured.out
    assert "ok\tmobile-molecule-detail-contract" in captured.out
    assert "ok\tmobile-research-surface-contract" in captured.out
    assert "ok\tmobile-recent-research-contract" in captured.out
    assert "ok\tmobile-ai-confidence-sanitizer" in captured.out
    assert "ok\tmobile-ai-guide-contract" in captured.out
    assert "ok\tmobile-health-label-sanitizer" in captured.out
    assert "ok\tmobile-optional-text-sanitizer" in captured.out
    assert "ok\tmobile-ban-list-contract" in captured.out
    assert "ok\tmobile-compare-contract" in captured.out
    assert "skip\tstore-identifiers" in captured.out


def test_mobile_release_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "mobile_release_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_mobile_release.py" in runbook
    assert "docs/mobile_release_checks.md" in checklist
