# Phase 2.3 Implementation Plan

## Objective

Add evidence-qualified visual element guidance to the Shaper planning prompt while preserving model freedom over concrete creative decisions.

Phase 2.3 is one product phase with three implementation and evaluation checkpoints:

- **2.3a — Prompt integration**
- **2.3b — Prompt-contract tests**
- **2.3c — Comparative benchmark and approval gate**

The phase does not add Web UI controls, change the visual element schema, or inject visual elements into final image-generation prompts. Prompt injection remains part of Phase 4.

## 2.3a — Prompt integration

Update `buildShaperPayload()` in `app.js` by adding a `VISUAL ELEMENT SELECTION GUIDANCE` section after the existing market-context and language-contract guidance.

The guidance must instruct Shaper to consider, in order:

1. Platform hard rules.
2. Product evidence and category requirements.
3. Approved operator constraints and brand direction.
4. Buyer motivation.
5. Market context.
6. Model freedom for all remaining decisions.

The prompt must state that market context is a soft, testable hypothesis. It must prohibit selecting a treatment solely because of a country, platform, or buyer-motivation label and must preserve different visual choices across sibling slots.

The prompt should describe conditional use of contextual scenes, lifestyle environments, human presence, model-rendered headlines, and optional color treatments. It must keep exact colors, props, people, lighting, camera angle, and composition open to model judgment unless supplied facts, platform rules, or operator input constrain them.

Do not change the `visualElements` schema, validation, fallback behavior, Web UI, or Phase 4 prompt compiler in this checkpoint.

## 2.3b — Prompt-contract tests

Add tests in `test/app.test.js` that build a Shaper payload and verify the prompt contract contains:

- The precedence order.
- The statement that market context is a soft, testable hypothesis.
- The prohibition against country-only visual decisions.
- The instruction to preserve per-slot variation.
- The freedom to choose exact scene details and composition.
- Conditions for human presence and model-rendered text.
- The requirement that visual element labels remain concise image-job descriptions.

Keep the existing tests for market context, schema enums, visual-element validation, locale, and approved copy passing.

Required checks:

```bash
npm test
git diff --check
```

## 2.3c — Comparative benchmark and approval gate

Evaluate three prompt arms using the same product references, slot roles, aspect ratio, approved copy, model, and seed policy:

1. No visual-selection guidance.
2. Original market-specific guidance.
3. Revised evidence-qualified guidance.

Record results by locale, product category, and model. Evaluate:

- Product identity and factual accuracy.
- Platform compliance.
- Slot-purpose adherence.
- Visual diversity across sibling slots.
- Shopper interpretation of the intended message.
- Unintended claims, props, people, or promotional text.
- Cultural appropriateness.
- Copy accuracy and placement where copy is rendered.

Do not combine markets into one aggregate score if that could hide a locale regression.

The revised guidance is approved for production use only when it does not materially reduce product identity or slot adherence and does not create unsupported cultural or promotional assumptions. A failed benchmark does not require removing the visual element schema; it requires revising or weakening the guidance before rollout.

## Completion tracking

| Checkpoint | Deliverable | Status |
|---|---|---|
| 2.3a | Revised guidance added to the Shaper prompt | Pending implementation |
| 2.3b | Prompt-contract and regression tests pass | Pending implementation |
| 2.3c | Comparative benchmark reviewed and approved | Pending evaluation |

Related documents:

- [Marketing validation and revision](./PHASE_2_3_MARKETING_VALIDATION.md)
- [Prompt refactor implementation guide](./PROMPT_REFACTOR_IMPLEMENTATION_GUIDE.md)
- [Implementation status](./PROMPT_REFACTOR_IMPLEMENTATION_STATUS.md)
