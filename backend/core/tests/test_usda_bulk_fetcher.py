from __future__ import annotations

from types import SimpleNamespace

from scripts.fetchers import fetch_usda_bulk


def test_collect_fdc_ids_paginates_each_query_and_deduplicates(monkeypatch):
    calls: list[tuple[str, int, int]] = []
    pages = {
        ("fruit", 1): [{"fdcId": 1}, {"fdcId": 2}],
        ("fruit", 2): [{"fdcId": 2}, {"fdcId": 3}],
        ("fruit", 3): [],
        ("vegetable", 1): [{"fdcId": 4}],
    }

    def fake_search_food(query: str, page_size: int, page_number: int = 1):
        calls.append((query, page_size, page_number))
        return pages.get((query, page_number), [])

    monkeypatch.setattr(fetch_usda_bulk, "search_food", fake_search_food)
    monkeypatch.setattr(fetch_usda_bulk.time, "sleep", lambda _: None)

    ids = fetch_usda_bulk.collect_fdc_ids(
        ["fruit", "vegetable"],
        page_size=2,
        limit=4,
        max_pages_per_query=3,
    )

    assert ids == [1, 2, 3, 4]
    assert calls == [
        ("fruit", 2, 1),
        ("fruit", 2, 2),
        ("fruit", 2, 3),
        ("vegetable", 2, 1),
    ]


def test_collect_fdc_ids_stops_at_limit_before_unneeded_pages(monkeypatch):
    calls: list[tuple[str, int, int]] = []

    def fake_search_food(query: str, page_size: int, page_number: int = 1):
        calls.append((query, page_size, page_number))
        return [{"fdcId": 10}, {"fdcId": 11}]

    monkeypatch.setattr(fetch_usda_bulk, "search_food", fake_search_food)
    monkeypatch.setattr(fetch_usda_bulk.time, "sleep", lambda _: None)

    ids = fetch_usda_bulk.collect_fdc_ids(
        ["fruit", "vegetable"],
        page_size=2,
        limit=2,
        max_pages_per_query=10,
    )

    assert ids == [10, 11]
    assert calls == [("fruit", 2, 1)]


def test_run_fetches_details_in_batches(monkeypatch, tmp_path):
    requested_batches: list[list[int]] = []

    monkeypatch.setattr(fetch_usda_bulk, "collect_fdc_ids", lambda *args, **kwargs: [1, 2, 3])
    monkeypatch.setattr(fetch_usda_bulk.time, "sleep", lambda _: None)

    def fake_get_food_details(fdc_ids: list[int]):
        requested_batches.append(fdc_ids)
        return [
            {
                "fdcId": fdc_id,
                "description": f"Food {fdc_id}",
                "dataType": "SR Legacy",
                "foodNutrients": [],
            }
            for fdc_id in fdc_ids
        ]

    monkeypatch.setattr(fetch_usda_bulk, "get_food_details", fake_get_food_details)

    args = SimpleNamespace(
        output=tmp_path,
        queries_file=None,
        limit=3,
        page_size=2,
        candidate_multiplier=1,
        max_pages_per_query=5,
        detail_batch_size=2,
    )

    fetch_usda_bulk.run(args)

    assert requested_batches == [[1, 2], [3]]
    assert sorted(path.name for path in tmp_path.glob("*.json")) == [
        "food-1-1.json",
        "food-2-2.json",
        "food-3-3.json",
    ]
