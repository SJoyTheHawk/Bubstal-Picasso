# Phase 1 to Phase 2 Test Guide

This guide tests the implemented prompt refactor from Phase 1 through Phase 2.3c.
It separates automated checks from the browser and model checks that require real
product images.

## 1. Automated Regression Check

From the repository root:

```bash
npm install
npm test
git diff --check
```

Expected result:

```text
tests 46
pass 46
fail 0
```

The test suite verifies market mapping, locale and copy handling, visual-element
schema and repair, Shaper guidance, prompt compilation, slot-to-output mapping,
and both UI locale dictionaries.

## 2. Start the Application

Configure Google Application Default Credentials, then start the server:

```bash
npm start
```

Open `http://localhost:3000`. Use real product images for the browser checks.
The Preview Prompts action calls the Shaper, so the server must have access to
the configured Shaper model. Without credentials, the application falls back to
the validated platform plan.

## 3. Phase 1 Checks

### Phase 1.1: Market profiles and platform mapping

1. Select `Amazon.co.jp`, open Preview Prompts, and inspect the request or plan.
2. Repeat with `Rakuten` and `Shopee TW`.
3. Confirm the market context identifies Japan for the first two and Taiwan for
   Shopee TW.

Observable result: the Shaper request contains `MARKET CULTURAL CONTEXT` and the
correct market profile. The market profile is guidance only; it does not replace
platform hard rules.

### Phase 1.2: Market state

1. Load a fresh page and inspect the selected platform and Preview Prompts request.
2. Confirm the initial market is `japan`.
3. Change to `Shopee TW` and inspect the request again.

Observable result: the state and request use `taiwan` after the platform change.

### Phase 1.3: Platform change synchronization

1. Change between Amazon.co.jp, Rakuten, and Shopee TW.
2. Confirm the image count and platform rules update with the platform.
3. Preview prompts after every change.

Observable result: platform, market, locale, image-count bounds, and hard slot
rules remain synchronized. A previous market selection must not remain attached to
the new platform.

## 4. Phase 2 Checks

### Phase 2.0: Locale and language contract

1. Select Amazon.co.jp and confirm the output locale is `ja-JP`.
2. Select Shopee TW and confirm the output locale is `zh-TW`.
3. Add one approved copy item with a locale-specific `textByLocale` value.
4. Preview the Shaper plan.

Observable result: the request contains `LANGUAGE AND COPY CONTRACT`, one output
locale, an instruction-language arm, and only the supplied copy item. The model is
not asked to translate or invent text.

### Phase 2.1: Per-slot visual elements and copy fields

1. Preview a plan with at least three image slots.
2. Inspect the returned plan in the preview dialog or exported batch JSON.
3. Confirm every slot contains `visualElements`, `outputLocale`,
   `instructionLanguage`, and `copyItems`.

Observable result: each visual element uses one of the schema enum values. If a
test response contains an invalid visual element or missing slot, validation
repairs it to a role- and market-aware fallback instead of passing invalid data
to the plan. Phase 4 has not yet added these structured fields directly to the
final image-generation prompt, so inspect them in the Shaper plan; do not expect
the compiled image prompt to contain each enum value as a separate instruction.

### Phase 2.2: Soft market guidance

1. Preview a Taiwan case and a Japan case with the same product references.
2. Compare the Shaper request text.
3. Confirm market preferences are described as soft priors.

Observable result: the request says each slot may make a different visual choice
and must not force one background, palette, layout, or text strategy across the
batch.

### Phase 2.3a and 2.3b: Revised guidance and contract tests

Run the automated check from Section 1. The prompt contract must include:

- The precedence order ending in model freedom.
- Market context as a soft, testable hypothesis.
- No country-only visual decisions.
- Per-slot variation.
- Conditional human presence and model-rendered text.
- Freedom over exact colors, props, lighting, camera, and composition.

The dedicated tests are named `Shaper payload includes evidence-qualified visual
selection guidance` and `Phase 2.3c benchmark arms keep inputs and schema constant`.

## 5. Phase 2.3c Controlled Benchmark

Prepare a real case manifest from the example:

```bash
cp benchmarks/phase-2-3c/manifest.example.json benchmarks/phase-2-3c/manifest.json
```

Replace its placeholder product data and image paths. Then prepare the three arms:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --out benchmarks/phase-2-3c/run.json
```

The command does not call paid model APIs. It creates the controlled requests and
checks that all arms use the same image/reference parts and generation schema.

To assess an existing Shaper run without making more model calls:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --review-existing benchmarks/phase-2-3c/run.json \
  --out benchmarks/phase-2-3c/run.reviewed.json
```

The reviewed file keeps raw responses, reports parse and slot-count validity per
arm, and stores the normalized plan the app would consume. Truncated or
underfilled responses remain flagged and must be rerun before image comparison.

To run the Shaper arms using the same credentials as the local app, start the
server in terminal 1:

```bash
IMAGE_GEN_BACKEND=gemini npm run start:local
```

Then in terminal 2, run the benchmark with live Shaper execution enabled:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --out benchmarks/phase-2-3c/run.json \
  --execute-shaper \
  --image-backend gemini
```

`start:local` supplies the server with `GOOGLE_APPLICATION_CREDENTIALS` from
`auth/service_auth.json`. The benchmark first checks `/api/auth/status`, then
sends each arm to the server's `/api/shape` route. It does not read or copy the
credential itself. The preflight confirms ADC is available; model access is
confirmed by the Shaper requests. The Gemini setting checks the configured
image backend, but this command does not generate images.

Generate each arm with the same Shaper model, image model, product references,
slot count, approved copy, and repeat policy. Save outputs by case, arm, repeat,
and slot. Complete `benchmarks/phase-2-3c/review-template.json` for every locale
and category.

Review these dimensions separately for each locale and category:

- Product identity and factual accuracy.
- Platform compliance.
- Slot-purpose adherence.
- Diversity across sibling slots.
- Shopper interpretation.
- Unintended claims, props, people, or promotional text.
- Cultural appropriateness.
- Copy accuracy and placement.

Approve the revised arm only when it causes no material identity or slot-purpose
regression and no unsupported cultural or promotional assumptions. The repository
status should remain pending until those real image reviews are complete.

## 6. Evidence to Keep

Keep these artifacts together for review:

- `npm test` output.
- The generated Phase 2.3c run file.
- The exact product and reference image set used for each case.
- Shaper responses for all three arms.
- Generated images grouped by case, arm, repeat, and slot.
- Completed review records and the final approval decision.
