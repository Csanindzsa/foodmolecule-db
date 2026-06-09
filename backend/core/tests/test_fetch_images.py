import httpx
import pytest

from scripts import fetch_images


class FakeClient:
    def __init__(self, *responses: httpx.Response | httpx.HTTPError):
        self.responses = list(responses)
        self.get_calls = 0
        self.post_calls = 0

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def _next(self) -> httpx.Response:
        response = self.responses.pop(0)
        if isinstance(response, httpx.HTTPError):
            raise response
        return response

    def get(self, url: str, **kwargs):
        self.get_calls += 1
        return self._next()

    def post(self, url: str, **kwargs):
        self.post_calls += 1
        return self._next()


def _response(url: str, content_type: str, content: bytes) -> httpx.Response:
    return httpx.Response(
        200,
        headers={"content-type": content_type},
        content=content,
        request=httpx.Request("GET", url),
    )


def _candidate(url: str = "https://upload.wikimedia.org/example.jpg") -> fetch_images.CandidateImage:
    return fetch_images.CandidateImage(
        image_url=url,
        source_url="https://commons.wikimedia.org/wiki/File:Example.jpg",
        provider="brave",
    )


def test_request_with_retries_retries_retryable_image_status(monkeypatch):
    response_503 = httpx.Response(
        503,
        request=httpx.Request("GET", "https://upload.wikimedia.org/example.jpg"),
    )
    response_200 = _response("https://upload.wikimedia.org/example.jpg", "image/jpeg", b"ok")
    client = FakeClient(response_503, response_200)
    monkeypatch.setattr(fetch_images.time, "sleep", lambda seconds: None)

    response = fetch_images._request_with_retries(
        client,
        "get",
        "https://upload.wikimedia.org/example.jpg",
    )

    assert response.status_code == 200
    assert client.get_calls == 2


def test_request_with_retries_does_not_retry_non_retryable_image_status(monkeypatch):
    response_404 = httpx.Response(
        404,
        request=httpx.Request("GET", "https://upload.wikimedia.org/missing.jpg"),
    )
    client = FakeClient(response_404)
    monkeypatch.setattr(fetch_images.time, "sleep", lambda seconds: None)

    with pytest.raises(httpx.HTTPStatusError):
        fetch_images._request_with_retries(
            client,
            "get",
            "https://upload.wikimedia.org/missing.jpg",
        )

    assert client.get_calls == 1


def test_download_image_writes_supported_image_content(monkeypatch, tmp_path):
    image_bytes = b"\xff\xd8fakejpeg"
    response = _response("https://upload.wikimedia.org/example.jpg", "image/jpeg; charset=binary", image_bytes)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    path = fetch_images.download_image(_candidate(), tmp_path)

    assert path.name.startswith("raw")
    assert path.suffix in {".jpg", ".jpe", ".jpeg"}
    assert path.read_bytes() == image_bytes


def test_download_image_rejects_non_https_url(monkeypatch, tmp_path):
    response = _response("http://upload.wikimedia.org/example.jpg", "image/jpeg", b"fake")
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    with pytest.raises(ValueError, match="Image URL must use HTTPS"):
        fetch_images.download_image(_candidate("http://upload.wikimedia.org/example.jpg"), tmp_path)


def test_download_image_handles_uppercase_content_type(monkeypatch, tmp_path):
    image_bytes = b"\xff\xd8fakejpeg"
    response = _response("https://upload.wikimedia.org/example.jpg", "IMAGE/JPEG; charset=binary", image_bytes)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    path = fetch_images.download_image(_candidate(), tmp_path)

    assert path.suffix in {".jpg", ".jpe", ".jpeg"}
    assert path.read_bytes() == image_bytes


def test_download_image_rejects_html_response(monkeypatch, tmp_path):
    response = _response("https://upload.wikimedia.org/example.jpg", "text/html", b"<html></html>")
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    with pytest.raises(ValueError, match="Unsupported image content type"):
        fetch_images.download_image(_candidate(), tmp_path)


def test_download_image_rejects_svg_response(monkeypatch, tmp_path):
    response = _response("https://upload.wikimedia.org/example.svg", "image/svg+xml", b"<svg></svg>")
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    with pytest.raises(ValueError, match="Unsupported image content type"):
        fetch_images.download_image(_candidate("https://upload.wikimedia.org/example.svg"), tmp_path)


def test_download_image_rejects_oversized_source(monkeypatch, tmp_path):
    oversized = b"x" * (fetch_images.MAX_SOURCE_IMAGE_BYTES + 1)
    response = _response("https://upload.wikimedia.org/large.png", "image/png", oversized)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    with pytest.raises(ValueError, match="Source image is too large"):
        fetch_images.download_image(_candidate("https://upload.wikimedia.org/large.png"), tmp_path)


def test_brave_food_candidate_retries_rate_limit_and_returns_approved_candidate(monkeypatch):
    payload = {
        "results": [
            {
                "url": "https://commons.wikimedia.org/wiki/File:Apple.jpg",
                "properties": {"url": "https://upload.wikimedia.org/apple.jpg"},
            }
        ]
    }
    response_429 = httpx.Response(
        429,
        request=httpx.Request("GET", fetch_images.BRAVE_IMAGE_SEARCH_URL),
    )
    response_200 = httpx.Response(
        200,
        json=payload,
        request=httpx.Request("GET", fetch_images.BRAVE_IMAGE_SEARCH_URL),
    )
    client = FakeClient(response_429, response_200)
    monkeypatch.setenv("BRAVE_API_KEY", "test-key")
    monkeypatch.setattr(fetch_images.time, "sleep", lambda seconds: None)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: client)

    candidate = fetch_images.brave_food_candidate(type("FoodLike", (), {"name": "apple"})())

    assert candidate == fetch_images.CandidateImage(
        image_url="https://upload.wikimedia.org/apple.jpg",
        source_url="https://commons.wikimedia.org/wiki/File:Apple.jpg",
        provider="brave",
    )
    assert client.get_calls == 2


def test_upload_to_supabase_retries_transient_upload_failure(monkeypatch, tmp_path):
    local_path = tmp_path / "image.webp"
    local_path.write_bytes(b"webp")
    upload_url = "https://example.supabase.co/storage/v1/object/food-images/foods/apple.webp"
    response_500 = httpx.Response(
        500,
        request=httpx.Request("POST", upload_url),
    )
    response_200 = httpx.Response(
        200,
        request=httpx.Request("POST", upload_url),
    )
    client = FakeClient(response_500, response_200)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.setattr(fetch_images.time, "sleep", lambda seconds: None)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: client)

    public_url = fetch_images.upload_to_supabase(local_path, "foods/apple.webp", "food-images")

    assert public_url == "https://example.supabase.co/storage/v1/object/public/food-images/foods/apple.webp"
    assert client.post_calls == 2
