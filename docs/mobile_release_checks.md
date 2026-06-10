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
- `ScanScreen` launches camera/gallery image selection and submits through `api.scanImage`.
- The mobile API client posts multipart images to `/scan/`.
- The mobile upload client names scan files and sends JPEG, PNG, or WebP content types.
- The scan result view preserves OCR confidence, raw-text truncation, empty states, and matched-food navigation.
- Successful scans persist up to five matched foods to local history for offline revisit.
- Recent scan history preserves food image and health context when available.
- Search, food detail, and scan result screens surface enriched food images when `image_url` is present.
- Development, preview, and production EAS build profiles exist.

## What It Does Not Prove

- `npx expo prebuild` or EAS native builds pass.
- iOS and Android physical-device camera permissions work.
- OCR accuracy on real labels is acceptable.
- App Store or Google Play submissions are ready.

Those checks still require native tooling, devices, store-account identifiers, and real product-label samples.
