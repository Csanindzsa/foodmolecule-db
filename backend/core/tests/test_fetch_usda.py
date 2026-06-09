import httpx
import pytest

from scripts.fetchers import fetch_usda


class FakeClient:
    def __init__(self, responses: list[httpx.Response]):
        self.responses = responses
        self.calls: list[tuple[str, str, dict]] = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url: str, **kwargs):
        self.calls.append(("get", url, kwargs))
        return self.responses.pop(0)

    def post(self, url: str, **kwargs):
        self.calls.append(("post", url, kwargs))
        return self.responses.pop(0)


def _response(status_code: int, url: str, payload: dict | list):
    return httpx.Response(
        status_code,
        json=payload,
        request=httpx.Request("GET", url),
    )


def test_search_food_retries_retryable_usda_status(monkeypatch):
    clients: list[FakeClient] = []

    def client_factory():
        client = FakeClient(
            [
                _response(500, "https://api.nal.usda.gov/fdc/v1/foods/search", {}),
                _response(200, "https://api.nal.usda.gov/fdc/v1/foods/search", {"foods": [{"fdcId": 1}]}),
                _response(200, "https://api.nal.usda.gov/fdc/v1/foods/search", {"foods": [{"fdcId": 1}, {"fdcId": 2}]}),
            ]
        )
        clients.append(client)
        return client

    monkeypatch.setattr(fetch_usda.httpx, "Client", client_factory)
    monkeypatch.setattr(fetch_usda.time, "sleep", lambda _: None)

    foods = fetch_usda.search_food("apple", page_size=2, page_number=1)

    assert [food["fdcId"] for food in foods] == [1, 2]
    assert [call[0] for call in clients[0].calls] == ["get", "get", "get"]


def test_get_food_detail_does_not_retry_non_retryable_status(monkeypatch):
    clients: list[FakeClient] = []

    def client_factory():
        client = FakeClient([_response(404, "https://api.nal.usda.gov/fdc/v1/food/404", {})])
        clients.append(client)
        return client

    monkeypatch.setattr(fetch_usda.httpx, "Client", client_factory)
    monkeypatch.setattr(fetch_usda.time, "sleep", lambda _: None)

    with pytest.raises(httpx.HTTPStatusError):
        fetch_usda.get_food_detail(404)

    assert len(clients[0].calls) == 1


def test_get_food_details_retries_transient_post_failure(monkeypatch):
    clients: list[FakeClient] = []

    def client_factory():
        client = FakeClient(
            [
                _response(429, "https://api.nal.usda.gov/fdc/v1/foods", {}),
                _response(200, "https://api.nal.usda.gov/fdc/v1/foods", [{"fdcId": 10}]),
            ]
        )
        clients.append(client)
        return client

    monkeypatch.setattr(fetch_usda.httpx, "Client", client_factory)
    monkeypatch.setattr(fetch_usda.time, "sleep", lambda _: None)

    details = fetch_usda.get_food_details([10])

    assert details == [{"fdcId": 10}]
    assert [call[0] for call in clients[0].calls] == ["post", "post"]
