# Prompt Refactor Implementation Status

This file tracks implementation against [PROMPT_REFACTOR_IMPLEMENTATION_GUIDE.md](./PROMPT_REFACTOR_IMPLEMENTATION_GUIDE.md).

## Completed

- [x] Phase 1.1: Add market profiles and platform-to-market mapping.
- [x] Phase 1.2: Add `state.market` with the Japan default.
- [x] Phase 1.3: Update market when the platform changes.
- [x] Phase 2.0: Add the platform locale and language contract.
  - Platform locale defaults are defined for supported marketplaces.
  - `state.locale`, `state.instructionLanguage`, and approved `state.copyItems` are tracked.
  - Locale and copy data are persisted with batch inputs.
  - Shaper validation keeps only operator-approved copy.
- [x] Phase 2.1: Add per-slot visual element, locale, instruction-language, and copy schema fields.
- [x] Phase 2.2: Add market cultural context to the Shaper prompt as soft per-slot guidance.
- [x] Phase 3 (core): Validate and repair per-slot visual elements.
- [x] Phase 2.3 research revision: Marketing evidence review completed and revised soft-prior guidance implemented.
- [x] Phase 2.3 completion Step 1: Arm packages are separated and documented; revised market context is hypothesis-qualified, batch-story guidance is explicit, and benchmark prompt construction follows the browser-equivalent buyer-motivation path.
- [x] Phase 2.3 completion Step 2 implementation: Shaper no longer authors `textByLocale`; raw plans are checked for explicit unique indexes, required fields, enums, approved copy, locale, and fixed counts before normalization; one bounded retry is recorded for invalid model output.
- [x] Phase 4 minimum compiler dependency: generated slot prompts now carry Shaper `visualElements`, output locale, and approved per-slot copy; fallback plans retain the existing constraint-based copy behavior.
- [x] Step 4 image-run preparation: saved valid plans compile into 18 image requests across the current six arms. The image runner checkpoints requests, images, and per-slot outcomes; image execution requires separate content approval.

## Remaining

- [ ] Phase 2.3: Complete the controlled Shaper benchmark and approve rollout.
- [x] Phase 2.3a: Integrate revised visual selection guidance into the Shaper prompt.
- [x] Phase 2.3b: Add prompt-contract tests and run regression checks.
- [ ] Phase 2.3c: Benchmark unguided, original-guidance, and revised-guidance arms and approve rollout.
  - [x] Controlled arm builder, invariant checks, manifest, and review template added.
  - [x] Response validity review records parse status, finish reason, requested slot coverage, and app-normalized plans.
  - [ ] Latest saved run, `benchmarks/phase-2-3c/run-rerun.json`, has 4 of 6 arms structurally ready. Taiwan unguided and revised ended with MAX_TOKENS and malformed JSON; all six calls completed. Follow the [completion plan](./PHASE_2_3_COMPLETION_PLAN.md) before a fresh comparison.
  - [x] Offline package check passes with 6 prepared arms and no `textByLocale` in the model schema or prompt; it makes no model calls.
  - [x] Fresh live Step 2 check completed in `/private/tmp/phase2-step2-live.json`: 6/6 arms structurally valid, all stopped normally on the first attempt, and no retry was needed. This is a Shaper-plan check only; image generation and human review remain pending.
  - [ ] Content review found unsupported statements in all six saved arms; see [Step 4 content review](./PHASE_2_3_STEP_4_CONTENT_REVIEW.md). A shared evidence-boundary prompt revision is implemented, but a fresh live six-arm run and renewed content review are required before image calls.
  - [ ] Real product outputs reviewed separately by locale, category, and model.
- [ ] Phase 4: Inject visual elements, locale, and copy contract into generated slot prompts.
- [ ] Phase 5: Complete fallback visual element behavior and related integration checks.
- [ ] Locale benchmark matrix and release-gate evaluation.

## Audit notes

- The legacy `buildCopyPlan()` / `copyPlacement` path remains only for fallback plans. Valid Shaper plans use their approved per-slot `copyItems` contract; broader Phase 4 cleanup can remove the fallback path after its behavior is covered.
- Phase 2.1 visual element data is now retained through fallback and Shaper-plan validation, with invalid values repaired to role- and market-aware defaults.

## Verification

`npm test` currently passes all 54 tests.

The implementation plan is in [PHASE_2_3_IMPLEMENTATION_PLAN.md](./PHASE_2_3_IMPLEMENTATION_PLAN.md). The implementation is in [app.js](../app.js), with coverage in [test/app.test.js](../test/app.test.js).

The Phase 2.3c benchmark pack is in [benchmarks/phase-2-3c](../benchmarks/phase-2-3c), and the end-to-end test guide is in [PHASE_1_TO_2_TEST_GUIDE.md](./PHASE_1_TO_2_TEST_GUIDE.md).
