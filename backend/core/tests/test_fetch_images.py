import httpx
import pytest

from scripts import fetch_images


class FakeClient:
    def __init__(self, response: httpx.Response):
        self.response = response

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url: str):
        return self.response


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


def test_download_image_writes_supported_image_content(monkeypatch, tmp_path):
    image_bytes = b"\xff\xd8fakejpeg"
    response = _response("https://upload.wikimedia.org/example.jpg", "image/jpeg; charset=binary", image_bytes)
    monkeypatch.setattr(fetch_images.httpx, "Client", lambda **kwargs: FakeClient(response))

    path = fetch_images.download_image(_candidate(), tmp_path)

    assert path.name.startswith("raw")
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
