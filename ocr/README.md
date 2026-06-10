# OCR Ingredient Scanner

Mobile-first ingredient label OCR pipeline.

## Architecture

```
Photo → Backend upload → Pre-process → Tesseract OCR →
  Text normalization → Ingredient extraction →
  Food/molecule API match → Results
```

## Pipeline

| Stage | Tool | Purpose |
|-------|------|---------|
| Capture | Expo Image Picker / camera | High-res label photo capture or library import |
| Upload | `POST /api/v1/scan/` | Multipart field named `image`, max 8 MB |
| Pre-process | Pillow | Grayscale conversion and contrast boost |
| OCR | Tesseract via `pytesseract` | Server-side OCR with confidence |
| Extractor | `ocr/src/pipeline/ingredients.py` | Pull ingredient terms from noisy raw OCR text |
| Matcher | DRF ORM filters | Match ingredient terms against foods and molecules |
| Lookup | DRF serializers | Return safety scores, molecule metadata, and raw OCR text |

## Runtime Requirements

Python dependencies are declared in `backend/requirements.txt`:

- `Pillow`
- `pytesseract`

The host must also provide the Tesseract binary:

```bash
brew install tesseract
```

On Linux/CI images, install the equivalent OS package, usually `tesseract-ocr`.

## Scan API Contract

`POST /api/v1/scan/` accepts a multipart upload with the image in the `image` field.
The backend rejects empty files, files over 8 MB, and non-JPEG/PNG/WebP uploads before
calling the OCR scanner.

Successful responses return:

```json
{
  "ingredients": ["water", "sea salt"],
  "confidence": 92.5,
  "raw_text": "Ingredients: water, sea salt",
  "raw_text_truncated": false,
  "foods": [],
  "molecules": [],
  "count": 0
}
```

`confidence` is normalized to a finite `0-100` percentage before it is returned to
mobile clients or logged in aggregate analytics. `raw_text` is capped by the backend
response limit; when capped, `raw_text_truncated` is `true`.

## Integration

The mobile app calls the public backend API via `mobile/src/lib/api.ts`.
The scan screen must keep the backend response contract visible: confidence,
matched ingredients, matched foods, raw OCR preview, and the truncated-text badge
when `raw_text_truncated` is true. Successful scans add up to five matched foods
to local on-device history for later review.

Set `EXPO_PUBLIC_API_URL` for physical devices or production builds:

```bash
EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1 npm run start
```

When unset, the mobile client defaults to:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator / web: `http://localhost:8000/api/v1`

Local scan history is persisted on-device only through AsyncStorage. No cloud sync, auth, cookies, or device fingerprinting are used.
