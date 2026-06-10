# Image Operations Checks

Status: static image enrichment preflight. This validates the repository wiring for food and molecule image enrichment without Brave or Supabase credentials.

## Command

Run from the repository root:

```bash
python scripts/check_image_ops.py
```

CI runs the same command.

## What It Verifies

- `scripts/fetch_images.py` defaults to the `food-images` Supabase bucket.
- Food image candidates are restricted to approved Wikimedia/OpenFoodFacts sources.
- Prepared or noisy food image terms are rejected before upload.
- Image downloads require HTTPS, supported raster content types, and a source size cap.
- Images are compressed to WebP with `ffmpeg`/`libwebp` and a 200 KB target.
- Supabase uploads use the service-role key, WebP content type, and upsert semantics.
- Image source attribution is written into model metadata.
- `--dry-run` is available before writing to Supabase or the database.
- Overnight ingestion runners include molecule and food image enrichment steps.
- The overnight runbook documents image order and reporting metrics.

## What It Does Not Prove

- Brave Search credentials are valid.
- Supabase Storage credentials and bucket permissions are valid.
- The production database has missing images to enrich.
- Candidate images are visually ideal for every food.

After this static check passes, run `scripts/fetch_images.py --entity molecule --limit 500` and `scripts/fetch_images.py --entity food --limit 200 --sleep 5` in the credentialed production environment, then report `molecules_with_images` and `foods_with_images`.
