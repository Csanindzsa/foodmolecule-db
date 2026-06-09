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
| OCR | Tesseract via `pytesseract` | Server-side fallback OCR with confidence |
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

## OCR Prompt Template

When ML Kit returns low-confidence text, we fall back to a vision-capable model:

```jinja2
You are an OCR assistant for food ingredient labels.
Rules:
1. List ONLY the ingredient names, one per line.
2. Do NOT include marketing text, brand names, or "Ingredients:" header.
3. Preserve chemical names exactly (e.g., "Sodium Benzoate" not "sodium benzoate").
4. If a word is unreadable, output "[unreadable]".
5. Combine split words across line breaks intelligently.

Photo analysis:
{{ image_description }}
Raw OCR text:
{{ raw_text }}

Return JSON: {"ingredients": ["..."], "confidence": 0.0-1.0}
```

## Integration

The mobile app calls the public backend API via `mobile/src/lib/api.ts`.
Set `EXPO_PUBLIC_API_URL` for physical devices or production builds:

```bash
EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1 npm run start
```

When unset, the mobile client defaults to:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator / web: `http://localhost:8000/api/v1`

Local scan history is persisted on-device only through AsyncStorage. No cloud sync, auth, cookies, or device fingerprinting are used.
