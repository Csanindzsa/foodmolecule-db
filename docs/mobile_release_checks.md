# Mobile Release Checks

Status: static Expo release preflight. This validates mobile launch wiring without running a native build or requiring Apple/Google store accounts.

## Command

Run from the repository root:

```bash
python scripts/check_mobile_release.py
```

CI runs the same command.

After Apple and Google identifiers are chosen, run the stricter check:

```bash
python scripts/check_mobile_release.py --require-store-ids
```

## What It Verifies

- Preview and production EAS profiles point `EXPO_PUBLIC_API_URL` at `https://api.nutrii.fit/api/v1`.
- `expo-camera` and `expo-image-picker` plugins are configured.
- iOS camera and photo-library permission copy exists.
- Mobile Bun installs are reproducible from `mobile/bun.lock`.
- CI installs locked mobile dependencies, runs Bun unit tests, and runs the Expo TypeScript check.
- `ScanScreen` launches camera/gallery image selection and submits through `api.scanImage`.
- The mobile API client posts multipart images to `/scan/`.
- The mobile upload client names scan files and sends JPEG, PNG, or WebP content types.
- The scan result view preserves OCR confidence, raw-text truncation, empty states, matched-food navigation, and sanitized ingredient/hazard/raw-text displays.
- Successful scans persist up to five matched foods to local history for offline revisit.
- Recent scan history normalizes persisted IDs, names, scan dates, food image, and health context when available.
- Search, food detail, and scan result screens surface enriched food images when `image_url` is present.
- Search preserves and displays molecule matches returned by the API, including sanitized harm, formula, and molecule-name snippet context.
- Molecule detail is reachable from search and surfaces structure image, sanitized text/harm/count/amount/molecular-property context, and linked foods.
- Food detail surfaces linked research summaries, sanitized publication years, and PubMed citation links when study data is present.
- Recent Research is reachable from Home and surfaces recent AI-analyzed PubMed studies with sanitized years and impact context.
- Food detail and Recent Research render AI confidence labels through the high/medium/low display allowlist.
- Food detail surfaces sanitized AI guide copy/metadata and health-index breakdowns from the existing backend endpoints.
- Food detail renders health-index labels through the backend label allowlist.
- Optional origin, category, molecular formula, and ban-list text is trimmed and type-checked before rendering.
- Ban List is reachable from Home and surfaces draft/citation-required safety entries with sanitized dose displays and food-detail navigation.
- Compare is reachable from Home, searches foods, selects 2-3 foods, calls the backend compare endpoint, and sanitizes molecule/shared-name/count displays.
- Development, preview, and production EAS build profiles exist.

## What It Does Not Prove

- `npx expo prebuild` or EAS native builds pass.
- iOS and Android physical-device camera permissions work.
- OCR accuracy on real labels is acceptable.
- App Store or Google Play submissions are ready.

Those checks still require native tooling, devices, store-account identifiers, and real product-label samples.
