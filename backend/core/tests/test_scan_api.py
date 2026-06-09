from dataclasses import dataclass
from types import SimpleNamespace

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory

from core.views import IngredientScanView, MAX_SCAN_IMAGE_BYTES, MAX_SCAN_RAW_TEXT_CHARS


@dataclass
class FakeScanResult:
    ingredients: list[str]
    confidence: float
    raw_text: str


class FakeScanner:
    def scan(self, image_bytes: bytes) -> FakeScanResult:
        assert image_bytes == b"image-bytes"
        return FakeScanResult(
            ingredients=["spinach", "oxalic acid"],
            confidence=88.5,
            raw_text="Ingredients: spinach, oxalic acid",
        )


class LongTextScanner:
    def scan(self, image_bytes: bytes) -> FakeScanResult:
        return FakeScanResult(
            ingredients=["spinach"],
            confidence=75.0,
            raw_text="x" * (MAX_SCAN_RAW_TEXT_CHARS + 25),
        )


class FailingScanner:
    def scan(self, image_bytes: bytes) -> FakeScanResult:
        raise RuntimeError("internal scanner path /tmp/secret")


class ConfidenceScanner:
    def __init__(self, confidence):
        self.confidence = confidence

    def scan(self, image_bytes: bytes) -> FakeScanResult:
        return FakeScanResult(
            ingredients=["spinach"],
            confidence=self.confidence,
            raw_text="Ingredients: spinach",
        )


class FakeQuerySet(list):
    def select_related(self, *args):
        return self

    def prefetch_related(self, *args):
        return self

    def distinct(self):
        return self

    def __getitem__(self, item):
        result = super().__getitem__(item)
        return FakeQuerySet(result) if isinstance(item, slice) else result


class FakeManager:
    def __init__(self, results):
        self.results = FakeQuerySet(results)

    def none(self):
        return FakeQuerySet()

    def filter(self, *args, **kwargs):
        return self.results


class FakeSerializer:
    def __init__(self, items, many=False):
        self.data = list(items) if many else items


def _scan_request(file_obj=None):
    data = {}
    if file_obj is not None:
        data["image"] = file_obj
    request = APIRequestFactory().post("/api/v1/scan/", data, format="multipart")
    return IngredientScanView.as_view()(request)


def test_scan_requires_image_file():
    response = _scan_request()

    assert response.status_code == 400
    assert "image" in response.data["detail"]


def test_scan_rejects_oversized_images():
    image = SimpleUploadedFile(
        "label.jpg",
        b"x" * (MAX_SCAN_IMAGE_BYTES + 1),
        content_type="image/jpeg",
    )

    response = _scan_request(image)

    assert response.status_code == 413
    assert "too large" in response.data["detail"]


def test_scan_rejects_empty_images(monkeypatch):
    def fail_build_scanner():
        raise AssertionError("scanner should not be built for empty uploads")

    monkeypatch.setattr("core.views._build_label_scanner", fail_build_scanner)
    image = SimpleUploadedFile("label.jpg", b"", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 400
    assert response.data == {
        "detail": "Uploaded image is empty.",
        "code": "empty_image",
    }


def test_scan_rejects_unsupported_upload_type():
    upload = SimpleUploadedFile(
        "label.txt",
        b"not-an-image",
        content_type="text/plain",
    )

    response = _scan_request(upload)

    assert response.status_code == 415
    assert response.data == {
        "detail": "Upload a JPEG, PNG, or WebP image.",
        "code": "unsupported_image_type",
    }


def test_scan_dependency_failure_is_sanitized(monkeypatch):
    def raise_import_error():
        raise ImportError("missing local package at /private/path")

    monkeypatch.setattr("core.views._build_label_scanner", raise_import_error)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 503
    assert response.data == {
        "detail": "OCR dependencies are not installed.",
        "code": "ocr_unavailable",
    }
    assert "private" not in str(response.data)


def test_scan_runtime_failure_is_sanitized(monkeypatch):
    monkeypatch.setattr("core.views._build_label_scanner", lambda: FailingScanner())
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 422
    assert response.data == {
        "detail": "OCR scan failed.",
        "code": "ocr_scan_failed",
    }
    assert "secret" not in str(response.data)


def test_scan_returns_ocr_result_and_database_matches(monkeypatch):
    food = {"id": "food-1", "name": "spinach"}
    molecule = {"id": "molecule-1", "name": "Oxalic Acid"}

    monkeypatch.setattr("core.views._build_label_scanner", lambda: FakeScanner())
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([food])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([molecule])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 200
    assert response.data["ingredients"] == ["spinach", "oxalic acid"]
    assert response.data["confidence"] == 88.5
    assert response.data["raw_text"] == "Ingredients: spinach, oxalic acid"
    assert response.data["raw_text_truncated"] is False
    assert response.data["foods"][0]["id"] == "food-1"
    assert response.data["foods"][0]["name"] == "spinach"
    assert response.data["molecules"][0]["id"] == "molecule-1"
    assert response.data["molecules"][0]["name"] == "Oxalic Acid"
    assert response.data["count"] == 2


def test_scan_clamps_out_of_range_confidence(monkeypatch):
    monkeypatch.setattr("core.views._build_label_scanner", lambda: ConfidenceScanner(120.75))
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 200
    assert response.data["confidence"] == 100.0


def test_scan_defaults_invalid_confidence_to_zero(monkeypatch):
    monkeypatch.setattr("core.views._build_label_scanner", lambda: ConfidenceScanner(float("nan")))
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 200
    assert response.data["confidence"] == 0.0


def test_scan_defaults_nonnumeric_confidence_to_zero(monkeypatch):
    monkeypatch.setattr("core.views._build_label_scanner", lambda: ConfidenceScanner("unavailable"))
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 200
    assert response.data["confidence"] == 0.0


def test_scan_truncates_long_raw_ocr_text(monkeypatch):
    monkeypatch.setattr("core.views._build_label_scanner", lambda: LongTextScanner())
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")

    response = _scan_request(image)

    assert response.status_code == 200
    assert len(response.data["raw_text"]) == MAX_SCAN_RAW_TEXT_CHARS
    assert response.data["raw_text_truncated"] is True
    assert response.data["ingredients"] == ["spinach"]
