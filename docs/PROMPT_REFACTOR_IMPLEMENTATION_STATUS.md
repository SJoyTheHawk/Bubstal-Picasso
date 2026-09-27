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

## Remaining

- [ ] Phase 2.3: Add visual element selection guidance to the Shaper prompt.
- [ ] Phase 3: Validate and repair per-slot visual elements.
- [ ] Phase 4: Inject visual elements, locale, and copy contract into generated slot prompts.
- [ ] Phase 5: Complete fallback visual element behavior and related integration checks.
- [ ] Locale benchmark matrix and release-gate evaluation.

## Verification

`npm test` currently passes all 43 tests.

The implementation is in [app.js](../app.js), with coverage in [test/app.test.js](../test/app.test.js).
