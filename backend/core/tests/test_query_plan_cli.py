import json
from pathlib import Path

from scripts import check_query_plans


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class FakeCursor:
    def __init__(self, explain_result):
        self.explain_result = explain_result
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def execute(self, sql, params):
        self.executed.append((sql, params))

    def fetchone(self):
        return (self.explain_result,)


class FakeConnection:
    vendor = "postgresql"

    def __init__(self, explain_result):
        self.cursor_obj = FakeCursor(explain_result)

    def cursor(self):
        return self.cursor_obj


def test_query_plan_targets_cover_high_traffic_launch_routes():
    names = {target.name for target in check_query_plans.TARGET_QUERIES}

    assert names == {
        "food-list",
        "food-search",
        "molecule-list",
        "molecule-search",
        "recent-studies",
        "ban-list",
        "scan-food-match",
        "scan-molecule-match",
    }


def test_query_plan_parser_accepts_python_and_json_explain_results():
    explain = [{"Execution Time": 42.5}]

    assert check_query_plans.parse_execution_time_ms(explain) == 42.5
    assert check_query_plans.parse_execution_time_ms(json.dumps(explain)) == 42.5
    assert check_query_plans.parse_execution_time_ms((explain,)) == 42.5


def test_query_plan_result_flags_slow_queries():
    target = check_query_plans.QueryTarget("food-list", "GET /api/v1/foods/", "SELECT 1")
    connection = FakeConnection([{"Execution Time": 250.0}])

    result = check_query_plans.run_target(connection, target, threshold_ms=200.0)

    assert not result.ok
    assert result.execution_time_ms == 250.0
    sql, params = connection.cursor_obj.executed[0]
    assert sql.startswith("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT 1")
    assert params == ()


def test_query_plan_cli_lists_targets_without_database(capsys):
    exit_code = check_query_plans.main(["--list"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "food-search\tGET /api/v1/foods/search/?q=apple" in captured.out
    assert "scan-molecule-match\tPOST /api/v1/scan/" in captured.out


def test_query_plan_cli_rejects_non_positive_threshold(capsys):
    exit_code = check_query_plans.main(["--threshold-ms", "0"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "--threshold-ms must be positive" in captured.err


def test_query_plan_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "query_plan_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_query_plans.py --threshold-ms 200" in runbook
    assert "docs/query_plan_checks.md" in checklist
