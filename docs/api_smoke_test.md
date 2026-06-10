# API Smoke Test

Status: launch-ready command runbook. This checks deployed public API routes from outside the Django test process; it does not replace the backend pytest suite or database query-plan checks.

## Baseline Route Check

Run this after deploying the backend and pointing DNS:

```bash
python scripts/smoke_api.py --base-url https://api.nutrii.fit/api/v1
```

The baseline check probes public routes that do not need runtime object IDs or file uploads:

- `health/`
- `foods/`
- `foods/search/`
- `molecules/`
- `molecules/search/`
- `studies/recent/`
- `ban-list/`
- `categories/`
- `processing-methods/`
- `stats/`

The command exits non-zero if any selected probe returns an unexpected status, cannot connect within the timeout, or returns a non-JSON body. This catches misrouted deploys where a frontend or proxy serves an HTML page with a `200` status.

## Full Public API Check

After the production database is seeded, choose two real food UUIDs, one real molecule UUID, and a small JPEG, PNG, or WebP ingredient label image. Then run:

```bash
python scripts/smoke_api.py \
  --base-url https://api.nutrii.fit/api/v1 \
  --food-id FOOD_UUID \
  --molecule-id MOLECULE_UUID \
  --compare-food-ids FOOD_UUID_A,FOOD_UUID_B \
  --scan-image ./label-smoke.png \
  --require-full
```

`--require-full` fails fast unless all 17 public API routes are represented in the selected probe set. `food-guide` accepts `200` or `404`, because a seeded food can exist before its AI guide is generated. All selected probes must return JSON. The OCR scan probe expects the production scan endpoint to return `200`; a `503`, `415`, or `422` should be treated as a launch issue unless the input file is invalid.

Use `--list-probes` to verify the selected probe set without making network calls:

```bash
python scripts/smoke_api.py --list-probes
```

## Interpreting Results

- `ok` means the route returned one of the expected statuses.
- `FAIL` means the route returned an unexpected status or the request failed.
- `expected JSON body` means the route returned an expected status but did not return API JSON.
- `skipped optional probes` means the baseline run omitted routes that need `--food-id`, `--molecule-id`, `--compare-food-ids`, or `--scan-image`.

For launch sign-off, capture the full command output together with the deploy version and the production database seed timestamp.
