from pathlib import Path

from scripts import smoke_api


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class FakeResponse:
    def __init__(self, status=200, body=b"{}"):
        self.status = status
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def getcode(self):
        return self.status

    def read(self, size=-1):
        return self.body[:size]


def test_api_smoke_baseline_probes_cover_public_no_input_routes():
    probes, missing = smoke_api.build_probes()

    assert [probe.name for probe in probes] == [
        "health-check",
        "food-list",
        "food-search",
        "molecule-list",
        "molecule-search",
        "recent-studies",
        "ban-list",
        "category-list",
        "processing-method-list",
        "platform-stats",
    ]
    assert missing == ("--food-id", "--molecule-id", "--compare-food-ids", "--scan-image")


def test_api_smoke_full_probes_cover_all_public_api_routes(tmp_path):
    scan_image = tmp_path / "label.png"
    scan_image.write_bytes(b"png")
    food_a = "11111111-1111-4111-8111-111111111111"
    food_b = "22222222-2222-4222-8222-222222222222"
    molecule_id = "33333333-3333-4333-8333-333333333333"

    probes, missing = smoke_api.build_probes(
        food_id=food_a,
        molecule_id=molecule_id,
        compare_food_ids=f"{food_a},{food_b}",
        scan_image=scan_image,
    )

    assert len(probes) == 17
    assert not missing
    assert {probe.name for probe in probes} >= {
        "food-detail",
        "food-health-index",
        "food-studies",
        "food-guide",
        "molecule-detail",
        "food-compare",
        "ingredient-scan",
    }


def test_api_smoke_require_full_reports_missing_runtime_inputs(capsys):
    exit_code = smoke_api.main(["--base-url", "https://api.nutrii.fit/api/v1", "--require-full"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "--food-id" in captured.err
    assert "--scan-image" in captured.err


def test_api_smoke_normalizes_base_url_before_joining_probe_paths():
    assert (
        smoke_api.build_url("https://api.nutrii.fit/api/v1", "foods/?page_size=1")
        == "https://api.nutrii.fit/api/v1/foods/?page_size=1"
    )


def test_api_smoke_run_probe_uses_expected_request_url():
    seen = {}

    def fake_urlopen(req, timeout):
        seen["url"] = req.full_url
        seen["timeout"] = timeout
        seen["method"] = req.get_method()
        return FakeResponse()

    probe = smoke_api.Probe("health-check", "GET", "health/")
    result = smoke_api.run_probe(
        "https://api.nutrii.fit/api/v1",
        probe,
        timeout=3,
        urlopen=fake_urlopen,
    )

    assert result.ok
    assert seen == {
        "url": "https://api.nutrii.fit/api/v1/health/",
        "timeout": 3,
        "method": "GET",
    }


def test_api_smoke_cli_is_documented_for_launch_use():
    docs = (PROJECT_ROOT / "docs" / "api_smoke_test.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1" in docs
    assert "scripts/smoke_api.py" in checklist
