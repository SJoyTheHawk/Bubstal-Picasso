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
- [x] Phase 2.3 research revision: Marketing evidence review completed; revised soft-prior guidance is documented and awaiting implementation.

## Remaining

- [ ] Phase 2.3: Add visual element selection guidance to the Shaper prompt.
- [ ] Phase 2.3a: Integrate revised visual selection guidance into the Shaper prompt.
- [ ] Phase 2.3b: Add prompt-contract tests and run regression checks.
- [ ] Phase 2.3c: Benchmark unguided, original-guidance, and revised-guidance arms and approve rollout.
- [ ] Phase 4: Inject visual elements, locale, and copy contract into generated slot prompts.
- [ ] Phase 5: Complete fallback visual element behavior and related integration checks.
- [ ] Locale benchmark matrix and release-gate evaluation.

## Audit notes

- The legacy `buildCopyPlan()` / `copyPlacement` path is still live in generated slot prompts. It remains temporarily because Phase 4 has not yet replaced it with the approved per-slot `copyItems` contract; removing it now would drop existing constraint text. Phase 4 must remove that path as part of the prompt-builder replacement.
- Phase 2.1 visual element data is now retained through fallback and Shaper-plan validation, with invalid values repaired to role- and market-aware defaults.

## Verification

`npm test` currently passes all 44 tests.

The implementation plan is in [PHASE_2_3_IMPLEMENTATION_PLAN.md](./PHASE_2_3_IMPLEMENTATION_PLAN.md). The implementation is in [app.js](../app.js), with coverage in [test/app.test.js](../test/app.test.js).
