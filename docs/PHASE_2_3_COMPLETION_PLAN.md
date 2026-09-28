# Phase 2.3 Completion Plan

Status: active work, prepared 2026-09-28. Steps 1 and 2 implementation are complete; the fresh live benchmark and image review remain pending. This plan follows the attached “Review Summary”, checked against the current code and saved raw responses. It supplements the implementation plan.

## Current decision

The batch architecture is correct. One Shaper request receives the product inputs and requested output count, then returns one shared batch plan with one slot guide per output image.

The revised guidance also preserves per-slot creative freedom. It gives priority to platform rules, product evidence, and operator constraints, while leaving concrete scene, color, lighting, composition, and prop decisions open when they are not constrained.

Phase 2.3 remains incomplete because:

- the revised prompt retains confident market-preference wording alongside its evidence disclaimer, and the revised Japan result still asserts a national preference as fact;
- the Taiwan electronics unguided and revised responses ended with MAX_TOKENS and malformed JSON;
- no generated images have been reviewed for product identity, platform compliance, locale, or unsupported assumptions.

## Corrections to the external review

The original arm does not receive both blocks: original gets marketContextGuidance only; revised gets that block plus visualSelectionGuidance. Tests explicitly enforce this. Sharing context can be a valid additive experiment, not inherently a bug. The proposed revision below changes the experiment to compare two clearly documented guidance packages.

The failed responses contain approximately 19,500 whitespace characters each, beginning immediately after opening textByLocale. Its output schema is an unconstrained OBJECT. This is a strong investigation lead, not a proven provider root cause. Successful responses use roughly 1,084–1,195 candidate tokens; failures use 10,339–10,454. Raising the output budget first risks paying for more malformed output.

Assessment and fallback are not retry infrastructure: the current benchmark makes one attempt per arm. All six calls completed; four produced structurally complete plans. Repaired fallback plans do not count as model successes.

The benchmark's Node environment loads the full buyer-motivation file through require(), while a normal browser uses a shorter inline fallback. Benchmark results cannot fully represent Picasso until this difference is resolved.

## Step 1: Define and align prompt packages

Update buildShaperPayload() in app.js so the benchmark arms have one clear definition:

- unguided: no market-context or visual-selection guidance;
- original: the original market-context block only;
- revised: a rewritten market-context block explicitly labeling profile values as unverified hypotheses, plus the evidence-qualified visual-selection block.

Keep the product images, product facts, locale, approved copy, image count, response schema, and generation settings identical across arms.

Keep the existing market-context text only as the original comparison baseline. This experiment compares the revised guidance package against the existing package; it does not isolate one added sentence. Record the definitions and prompt versions in the benchmark README and tests.

Use one buyer-motivation text source in browser and benchmark, removing the divergent full-file versus inline path. Verify equivalent inputs produce equivalent requests in both environments. Resolve conflicting precedence and restrictions on scenes, people, and creative choices across the shared instructions and guidance.

Explicitly ask Shaper to plan an ordered, complementary story across all slots, using the existing shared tone, directions, differentiators, and count rationale. Shared tone must allow different backgrounds and colors. Preserve operator-fixed counts. Document that untouched defaults currently permit Shaper to propose a count, rather than silently changing that behavior.

Update the arm contract test in test/app.test.js to assert the chosen separation exactly. Preserve tests for the precedence order, evidence qualification, per-slot variation, locale, copy, and schema fields.

Acceptance criteria:

- prompt text proves each arm contains only its assigned guidance;
- all non-guidance request parts and generation settings remain byte-equivalent across arms;
- the revised prompt still states that market labels are hypotheses and do not determine visual treatment;
- the revised prompt still permits different choices for different slots.

## Step 2: Reduce and control Shaper truncation

Implementation checkpoint (2026-09-28): the model-authored `textByLocale` map was removed from the prompt example and response schema. `validateRawShaperPlan()` now rejects malformed JSON, missing or duplicate explicit indexes, invalid enums, wrong locale, invented or altered approved copy, missing required fields, and operator-fixed count mismatches before normalization. The browser Shaper path and benchmark each allow one retry for a structurally invalid model response; authentication and HTTP failures are not retried. Benchmark attempts and raw validation issues are retained in the run artifact. `maxOutputTokens` remains 12288 for the controlled check.

The offline package check is observable without API calls:

    npm run benchmark:phase-2-3c -- \
      --manifest benchmarks/phase-2-3c/manifest.json \
      --out /private/tmp/phase2-step2-check.json

It prepares six arms and the generated request has no `textByLocale` field. A fresh live run is still required to test whether the two previous `MAX_TOKENS` arms recover.

Investigate the Taiwan failures before spending more model calls:

1. Confirm the token accounting from usageMetadata, including candidate and thought tokens.
2. Measure the contribution of the buyer-motivation skill and the in-prompt schema example.
3. Check whether the long whitespace and open textByLocale object in the malformed responses are causing unnecessary output.
4. Keep the response schema as the source of structural requirements and shorten redundant prose if it does not change the contract.

The first reliability change should remove the unconstrained textByLocale map from model-authored output and its prompt example. Keep the operator's translation map in application inputs and persistence; the app already resolves exact text for the target locale. Shaper should return approved id, text, locale, location, and render mode. Restore other metadata from approved input where needed, without asking Shaper to translate or recreate it.

Keep maxOutputTokens at 12288 for the first controlled check. Consider a larger limit only if useful output for a full-sized batch legitimately reaches the budget after malformed-object behavior is resolved. Input framework length alone does not establish the cause of output exhaustion.

Strengthen raw validation before normalization: require an object, explicit unique slot indexes, required fields, valid enums, approved copy, correct locale, and operator-fixed counts. Do not silently substitute indexes. Share this assessment between the browser app and benchmark.

Add at most one retry for structurally invalid output, using the same whole-batch request. Record both attempts and distinguish first-attempt success from recovery. Do not retry authentication/configuration failures or silently change settings. After exhaustion retain the app's fallback with visible provenance, while the benchmark remains failed.

Add focused tests for localized copy without model-authored translation maps, empty copy, missing/duplicate indexes, invalid fields, retry success/exhaustion, and preservation of saved operator input. Primary files: app.js, test/app.test.js, scripts/phase-2-3c-benchmark.js, and test/phase-2-3c-benchmark.test.js.

Do not treat the app’s fallback plan as a successful Shaper result. A response is ready only when it has a normal stop reason, valid JSON, the exact requested slot indexes, and the matching resolvedImageCount.

Acceptance criteria:

- the retry run produces parseable, complete plans for both previously failing Taiwan arms;
- no arm is counted as ready merely because validateShaperPlan() repaired it with a fallback;
- if truncation persists, record the provider response, token usage, and the next prompt or budget change before another paid run.

## Step 3: Rerun the controlled benchmark

First improve the runner: record elapsed time, effective model IDs, prompt/schema versions, full input fingerprints including image contents and all prompt-affecting fields, and raw attempts. Print progress and checkpoint completed work. Add failed-arm resume only for matching fingerprints. Keep structural, content, and image review statuses separate. Treat seed labels as repeat identifiers unless a supported provider seed is actually sent.

Then run a fresh comparison after Steps 1 and 2. Schema and prompt changes require all six arms to run again; do not combine old successes with new failures. Keep the local ADC-backed server running:

    IMAGE_GEN_BACKEND=gemini npm run start:local

Then run:

    npm run benchmark:phase-2-3c -- \
      --manifest benchmarks/phase-2-3c/manifest.json \
      --out benchmarks/phase-2-3c/run-complete.json \
      --execute-shaper \
      --image-backend gemini

Review the result without making additional calls:

    npm run benchmark:phase-2-3c -- \
      --manifest benchmarks/phase-2-3c/manifest.json \
      --review-existing benchmarks/phase-2-3c/run-complete.json \
      --out benchmarks/phase-2-3c/run-complete.reviewed.json

The first structural gate requires 6/6 complete plans. Review their content as well, including the unsupported national-preference claim previously found in Japan revised.

Next create full-size manifests for Amazon seven outputs and Shopee ten explicitly selected outputs, across all three arms: six more initial calls. Repeat the revised seven- and ten-slot requests once each to check recurrence. Cover the current Shopee nine-image default in an app smoke check. Planned minimum: 14 initial Shaper calls, plus bounded retries. Full-size manifests and resume options are planned deliverables, not existing commands.

Every required plan must pass structural and content review, and the repeated revised requests must succeed on their first attempts before proceeding. Report recovery separately. This is a limited acceptance sample, not a statistical reliability guarantee. Preserve original artifacts and save fresh results with request versions.

## Step 4: Review generated images

Implementation checkpoint (2026-09-28): the minimum compiler dependency is now integrated. `buildPromptRecord()` carries each saved slot's `visualElements`, output locale, and approved `copyItems` into the image prompt. Overlay copy reserves a clean area and model-rendered copy is limited to the exact approved strings. Fallback plans continue to use the existing constraint copy path. The benchmark image-execution command and content-review artifact are available; generated images and image review are still required.

The two-case live result produced 6/6 structurally valid plans, all on the first attempt. Content review found unsupported assertions in the saved plans; see [Step 4 content review](./PHASE_2_3_STEP_4_CONTENT_REVIEW.md). A shared prompt evidence boundary now addresses named in-box items, performance claims, use timing, and audience-preference assertions while preserving open visual decisions. Because this changes all three arms, a fresh live six-arm run and content review are required before the image runner can execute. The runner has a content-approval gate, prepares 18 requests from the saved plans, and checkpoints image outputs after every slot. No images have been generated yet.

Use this shared compiler in Picasso and the benchmark. The remaining work in this step is to add benchmark image execution, persist image artifacts and requests, and review the generated sets.

Migrate and replace the deprecated buildCopyPlan text path once its behavior is covered. Separate actual platform requirements from fixed slot-purpose templates so a Shaper role cannot be contradicted by a different template purpose at the same index. Preserve shared tone and sibling context in each image request.

Add an explicit image-execution mode to the benchmark; retain Shaper-only as the default. Compile saved valid plans without calling Shaper again. Record image files, requests, model IDs, source plan, and slot mapping. Verify configured model identity: the saved run uses gemini-3-pro-image, so do not call it “Nano Banana 2” without verification.

Generate at least one full set per case and arm using the same image model and repeat policy: Amazon 7 x 3 plus Shopee 10 x 3 = 51 initial images. Keep each slot tied to its source plan. More repeats are warranted if results are inconsistent.

Review each locale and category separately:

- product identity and factual accuracy;
- platform hard-rule compliance;
- slot purpose;
- sibling-slot diversity and story coherence;
- shopper interpretation;
- unsupported claims, props, people, or promotional text;
- cultural appropriateness;
- copy accuracy and placement.

The reviewer must examine the revised arm against both the unguided and original arms. A valid JSON plan or attractive image is insufficient if it introduces unsupported market claims or reduces product and slot adherence.

Include qualified ja-JP and zh-TW review, recording per-slot and whole-set conclusions. Unreviewed criteria remain pending. The Japan case has no added copy, so it does not validate Japanese typography. For overlay copy, verify exact approved text and placement when applied; if the pipeline only reserves space, explicitly leave final overlay rendering unapproved.

## Step 5: Update completion records

After the benchmark and image review:

- update docs/PROMPT_REFACTOR_IMPLEMENTATION_STATUS.md with the fresh readiness count and image-review result;
- update docs/PHASE_2_3_IMPLEMENTATION_PLAN.md with the final arm definition and approval decision;
- update benchmarks/phase-2-3c/README.md if the token budget or retry procedure changed;
- keep the review handoff aligned with the final arm definitions.

Do not mark Phase 2.3 complete if any arm is incomplete or if image review finds a material regression or unsupported cultural or promotional assumption.

## Checks before approval

Run:

    npm test
    node --check app.js
    node --check scripts/phase-2-3c-benchmark.js
    git diff --check

Phase 2.3 may be approved when all of these are true:

1. The arm requests are clearly defined, match the browser app, and remain invariant outside the intended guidance.
2. Small and full-sized batches pass structural and content review; repeated revised runs succeed with all attempts reported.
3. The revised guidance retains per-slot creative freedom.
4. Generated images preserve identity, platform rules, slot purposes, and sibling diversity.
5. Locale-specific review finds no unsupported cultural or promotional assumptions.

Record the minimum Phase 4 compiler dependency as completed only when verified; leave broader Phase 4/5 work open. The revised arm is already the application's default. “Not approved” describes evaluation status and is not an implemented deployment feature gate.

## Follow-up work after this phase

These items should be tracked separately from the Phase 2.3 approval gate:

- model-rendered-copy testing;
- localized instruction-language benchmarking;
- Qwen Image 2.1 comparison;
- broader locale and category coverage;
- remaining Phase 4/5 work beyond the compiler dependency above.
