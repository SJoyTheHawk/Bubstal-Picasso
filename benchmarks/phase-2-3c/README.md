# Phase 2.3c Benchmark Pack

This pack prepares a controlled comparison of the three Shaper prompt arms:

1. `unguided` — no market or visual-selection guidance.
2. `original` — the original market-specific soft-prior guidance only.
3. `revised` — a hypothesis-qualified market context plus the evidence-qualified visual-selection guidance introduced in Phase 2.3a.

The revised arm is an additive guidance package comparison against the original arm. It is not a single-sentence ablation. All
product inputs, output count, locale, copy, schema, and generation settings remain constant across arms. The revised package
must preserve a shared batch story while allowing each slot to choose its own supported visual treatment.

The runner keeps each case's product references, category, platform, locale,
copy, constraints, image count, and seed policy constant. By default, it writes
all three request bodies to a review file and does not call model APIs. The
prepared file is marked `pending-shaper-execution`; it is not a model result.

The benchmark evaluates the same browser-equivalent Shaper prompt path. It does
not load the Node-only buyer-motivation Markdown file; the app's inline fallback
is used in both contexts so prompt comparisons do not change because of the
runtime environment.

## Prepare a Run

1. Copy `manifest.example.json` to a working location.
2. Replace the product names, facts, approved copy, and image paths.
3. Use the same product references for every arm of a case.
4. Add cases for every production locale and category needed for the decision.
5. Run:

```bash
node scripts/phase-2-3c-benchmark.js \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --out benchmarks/phase-2-3c/run.json
```

The command fails if a case is missing a product image, uses an unsupported
platform, has an invalid image count, or changes image/reference inputs between
arms. The output status is `pending-shaper-execution` by design.

## Run Shaper Arms Through Local Credentials

`npm run start:local` configures Google Application Default Credentials for the
app server. The benchmark runner does not read the credential file. Its live
mode checks `/api/auth/status` and sends Shaper requests to that server, which
uses the same ADC-backed client as the browser application.

In terminal 1, start the server. For Gemini/Vertex image generation, select the
Gemini backend explicitly because the default image backend is Qwen:

```bash
IMAGE_GEN_BACKEND=gemini npm run start:local
```

In terminal 2, run the three Shaper arms through the local server:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --out benchmarks/phase-2-3c/run.json \
  --execute-shaper \
  --image-backend gemini
```

The runner stops before making Shaper calls if the server cannot authenticate
or reports a different image backend. After preflight succeeds, this makes three
initial Shaper model requests per case, with at most one additional request for
an invalid response. It records every raw attempt and checks whether it stopped
normally, parses as JSON, and contains every requested slot. Image
generation and human review are still separate steps. Use `--server-url` if the
app runs on a different local port.

Review a run that already exists without making more API calls:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --review-existing benchmarks/phase-2-3c/run.json \
  --out benchmarks/phase-2-3c/run.reviewed.json
```

The reviewed file preserves each raw Shaper response and adds `planValidation`
plus `normalizedPlan`. The normalized plan follows the app's validation behavior,
including fallback slots; missing raw slots are listed explicitly. The run remains
`pending-shaper-retry` until every arm is complete, parseable, and has the
requested slot count. Invalid raw responses receive at most one repeat request;
the run records each attempt and the raw validation issues. The original run file
is not overwritten. Approved localized copy stays in operator input; Shaper
responses contain only the approved item's id, text, locale, location, and render
fields, without a free-form `textByLocale` map.

## Generate and Review

Review the saved Shaper plans for unsupported claims before making image calls.
Record decisions in a small content-review JSON file with `sourceRun` pointing
to the exact saved run and one `{ "arm": "...", "approved": true }` entry per
case and arm. The current two-case review is in `plan-content-review.json`; its
six arms are not approved, so the runner will refuse image generation from that
run. The findings are in `docs/PHASE_2_3_STEP_4_CONTENT_REVIEW.md`.

Prepare the image requests from a reviewed run without making image API calls:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --prepare-images /private/tmp/phase2-step2-live.json \
  --content-review benchmarks/phase-2-3c/plan-content-review.json \
  --out /private/tmp/phase2-image-requests.json \
  --images-dir /private/tmp/phase2-images
```

Once a fresh run passes content review for all arms, use `--execute-images`
instead of `--prepare-images`, set a new output filename, and add
`--image-backend gemini`. The local ADC-backed app server must be running.
This uses saved Shaper plans; it does not call Shaper again. It writes each
compiled request and image by case, arm, and slot, and checkpoints the image-run
JSON after every slot. The current two-case sample produces 18 images.

For every case, use the same image model and repeat policy. Store outputs using
this naming pattern:

```text
<caseId>/<arm>/slot-01.png
<caseId>/<arm>/slot-02.png
```

Complete one review record per case, arm, repeat, and slot. Score identity,
platform compliance, slot purpose, sibling diversity, shopper interpretation,
unsupported claims or additions, cultural appropriateness, and copy accuracy or
placement. Keep `ja-JP` and `zh-TW` results separate from one another.

## Approval Gate

The revised arm is approved only when the review shows no material regression in
product identity or slot-purpose adherence, and no unsupported cultural or
promotional assumptions. A failed gate means the guidance is revised or weakened
and the comparison is rerun. It does not require removing the visual-element
schema.

Do not mark the gate approved from prompt text alone. The generated images and
the per-locale review are required evidence.
