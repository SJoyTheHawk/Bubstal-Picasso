# Phase 2 Review Handoff

Use this document to review the Phase 2 prompt refactor in a new AI session.

## Review objective

Determine whether Shaper is correctly producing **one coherent plan for an entire set of product images**. The plan should contain one shared batch direction plus a separate, differentiated slot guide for every requested output image.

Do not assume that structurally valid JSON is also a good marketing or image-generation plan. Check both the contract and the meaning of the generated guidance.

## Start here

Read these files in this order:

1. `docs/PROMPT_REFACTOR_IMPLEMENTATION_GUIDE.md`
2. `docs/PHASE_2_3_IMPLEMENTATION_PLAN.md`
3. `docs/PHASE_2_3_MARKETING_VALIDATION.md`
4. `docs/PROMPT_REFACTOR_IMPLEMENTATION_STATUS.md`
5. `app.js`
6. `test/app.test.js`
7. `scripts/phase-2-3c-benchmark.js`
8. `benchmarks/phase-2-3c/manifest.json`
9. `benchmarks/phase-2-3c/run-rerun.json`

The most important implementation locations are:

- `app.js`: `buildShaperPayload()`
- `app.js`: `shapeBatch()`
- `app.js`: `validateShaperPlan()`
- `app.js`: `buildPromptRecord()`
- `app.js`: `buildBatchPromptRecord()`
- `scripts/phase-2-3c-benchmark.js`: `assessShaperResponse()` and `executeShaperArms()`

## Core questions

### 1. Is Shaper planning the whole set?

Verify that one Shaper request receives the product references and requested output count, then returns:

- one shared `batchTone` object;
- one `resolvedImageCount`;
- one `slots` array containing one guide per output image;
- distinct `index`, `role`, `direction`, `differentiator`, and `visualElements` values where appropriate.

For example, Amazon defaults to 7 output slots and Shopee TW defaults to 9. The number of uploaded product reference images is separate from the number of output slots.

Confirm that the Shaper request is not making one independent Shaper call per output photo. The later image-generation stage may compile one prompt per slot, but those prompts must derive from the single shared Shaper plan.

### 2. What does an arm mean?

The benchmark has two product cases and three prompt variants:

- `unguided`: no market or visual-selection guidance;
- `original`: the original market-context guidance only;
- `revised`: hypothesis-qualified market context plus evidence-qualified visual-selection guidance.

Therefore, `2 cases x 3 arms = 6 Shaper requests`. An arm is one case plus one prompt package. It is not one photo. The revised arm is an additive package comparison against the original arm, so the benchmark should record the package definition with each run.

### 3. Does the revised prompt preserve AI freedom?

Check that the revised prompt:

- treats market context as a soft hypothesis;
- does not infer a background, palette, composition, or lifestyle treatment from a country label alone;
- allows different slots in the same batch to use different visual treatments;
- preserves exact colors, materials, props, people, lighting, camera angle, and composition as model decisions unless constrained by evidence or operator rules;
- gives platform rules and supplied product facts priority;
- does not turn buyer-motivation labels into demographic facts or mandatory art direction.

Flag any rationale that states an unsupported cultural preference as fact, even if the JSON is valid.

### 4. Are locale and copy handled correctly?

Verify that `outputLocale`, `instructionLanguage`, and `copyItems` are per-slot fields. Approved copy must remain exact. Empty approved-copy input must produce no invented copy. Overlay copy should reserve space for later rendering; model-rendered copy should only be allowed when explicitly supported.

### 5. Is the benchmark result sufficient for approval?

The latest `run-rerun.json` reports **4/6 arms structurally valid**. The two invalid arms are the Taiwan electronics `unguided` and `revised` responses, both ending with `MAX_TOKENS` and malformed JSON. This means the benchmark is incomplete.

Also check the actual plan content. Structural validity does not prove product identity, platform compliance, cultural appropriateness, or image quality. No generated-image review has been completed in this run.

## Verification commands

Offline code checks:

```bash
npm test
git diff --check
node --check app.js
node --check scripts/phase-2-3c-benchmark.js
```

Review the saved benchmark without making API calls:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --review-existing benchmarks/phase-2-3c/run-rerun.json \
  --out benchmarks/phase-2-3c/run-rerun.reviewed.json
```

To run the live Shaper benchmark, keep the local server running so it supplies ADC credentials:

```bash
IMAGE_GEN_BACKEND=gemini npm run start:local
```

In a second terminal:

```bash
npm run benchmark:phase-2-3c -- \
  --manifest benchmarks/phase-2-3c/manifest.json \
  --out benchmarks/phase-2-3c/run-next.json \
  --execute-shaper \
  --image-backend gemini
```

This benchmark calls Shaper only. It does not generate final images. Do not approve image-generation rollout until the affected arms are rerun and the resulting images are reviewed by locale and product category.

## Required review conclusion

Return a conclusion with these four separate judgments:

1. **Batch architecture:** whether one Shaper response plans the complete photo set.
2. **Prompt freedom:** whether the revised guidance leaves legitimate creative decisions open per slot.
3. **Runtime reliability:** whether all benchmark arms return complete usable plans, including retry behavior for truncation.
4. **Production readiness:** whether Phase 2.3 can be approved, or which exact issue must be fixed first.

Do not call Phase 2 fully approved merely because `npm test` passes or because some arms return valid JSON.
