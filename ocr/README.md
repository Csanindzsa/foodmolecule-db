# OCR Ingredient Scanner

Mobile-first ingredient label OCR pipeline.

## Architecture

```
Photo → Pre-process → OCR (Tesseract / Google ML Kit) →
  Text Normalization → Ingredient Extraction →
  Fuzzy Match (≥0.80) → API Lookup → Results
```

## Pipeline

| Stage | Tool | Purpose |
|-------|------|---------|
| Capture | `expo-camera` | High-res photo, auto-focus, flashlight toggle |
| Pre-process | OpenCV (native) | Deskew, contrast boost, binarize |
| OCR | Google ML Kit Text Recognition v2 | On-device, free, 90%+ accuracy on labels |
| Normalizer | Custom regex + OpenRouter fallback | Fix line breaks, split concatenated words |
| Extractor | Regex + heuristic parser | Pull ingredient list from raw text |
| Matcher | `thefuzz` (Python) or `fuse.js` (JS) | Fuzzy match against molecule/food names |
| Lookup | DRF API | Return safety scores, neutralization tips |

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

The mobile app calls the OCR pipeline via:
```typescript
const results = await scanLabel(photoUri);
// results: { ingredients: MatchedIngredient[], unmatched: string[] }
```

Local history is persisted in `expo-sqlite` (no cloud sync, no auth).
