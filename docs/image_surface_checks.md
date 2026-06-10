# Image Surface Checks

Status: static React image-surface preflight. This validates that enriched food and molecule image URLs are visible in product UI without fetching external images.

## Command

Run from the repository root:

```bash
python scripts/check_image_surface.py
```

CI and the local release audit run this command before backend tests.

## What It Verifies

- Web types carry optional `image_url` and `structure_image_url` fields.
- Food detail renders a lazy-loaded food image when `image_url` is present.
- Molecule detail renders a lazy-loaded molecular structure image when `structure_image_url` is present.
- Home and search result lists show stable image thumbnails.
- Image containers use fixed dimensions to reduce layout shift.

## Live Launch Follow-Up

This check does not prove that production image URLs are populated or visually correct. After running image enrichment with Brave/Supabase credentials, verify several food photos and molecule structures in the deployed web app and confirm source attribution metadata remains present in the backend records.
