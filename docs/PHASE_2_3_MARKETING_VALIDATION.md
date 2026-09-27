# Phase 2.3 Marketing Validation and Revision

## Purpose

Phase 2.3 adds visual-selection guidance to the Shaper prompt. The guidance should help the model choose an image's communication job while preserving its freedom to decide the specific scene, lighting, colors, props, camera angle, and composition.

This review was completed before implementation. It separates platform requirements and ecommerce usability findings from market-specific hypotheses that still require testing.

## Evidence review

### Evidence suitable for operational guidance

- Amazon requires the main product image to use a pure white background, show the actual product accurately, show the entire product, and fill about 85% of the image. This is a main-image requirement, not a rule for every gallery image. [Amazon main image requirements](https://sellercentral.amazon.com/help/hub/reference/external/G1881?itemid=200164650)
- Ecommerce usability research supports using multiple image jobs: product verification, lifestyle context, scale and proportion, usage inspiration, feature explanation, and human-model context where the category requires it. [Baymard: seven product-image types](https://baymard.com/research-articles/ux-product-image-categories)
- Baymard reports that 42% of tested users tried to determine product size from product images, supporting an in-scale or contextual slot when size is difficult to infer from the product alone. [Baymard: in-scale images](https://baymard.com/research-articles/in-scale-product-images)
- Baymard identifies apparel, accessories, and cosmetics as categories where human-model images can improve understanding of fit or application. This supports a conditional human-presence choice, not a general requirement. [Baymard: human-model images](https://baymard.com/research-articles/human-model)
- Descriptive graphics can help communicate features that photography alone does not make clear. Exact commercial, legal, and regulated copy should remain application-controlled. [Baymard: descriptive text or graphics](https://baymard.com/research-articles/product-images-descriptive-text)

### Claims that require qualification

Color and visual-style research supports cultural variation, but it does not justify universal rules such as “Japan means warm,” “Taiwan or China means vibrant,” or “Japanese shoppers prefer text-free images.” Cross-cultural studies report both similarities and differences, with results depending on the product, design, audience, and task. [Journal of International Marketing color study](https://journals.sagepub.com/doi/full/10.1509/jimk.8.4.90.19795), [cross-cultural color review](https://www.tandfonline.com/doi/abs/10.1080/13527260500247827), [Taiwan-Germany interface experiment](https://www.sciencedirect.com/science/article/pii/S074756321830390X)

The existing mappings for `warm-enhanced`, `vibrant-pop`, `text-free`, and `model-rendered-headline` should therefore be treated as benchmark hypotheses. They must not be presented to the model as cultural facts or mandatory defaults.

## Marketing interpretation

The visual element labels are useful when they describe the job an image performs:

| Element | Safe marketing meaning |
|---|---|
| `pure-white` | Product verification and platform compliance when the platform requires it |
| `neutral-solid` | Product clarity with low scene distraction |
| `gradient` | An optional stylistic treatment when brand, product, and category support it |
| `contextual-scene` | Usage, scale, compatibility, or lifestyle explanation |
| `lifestyle-environment` | A fuller aspiration or use-context story |
| `centered-isolated` | Product recognition and verification |
| `angled-with-shadow` | A possible editorial or aesthetic presentation |
| `in-context` | Product-to-environment relationship |
| `in-use` | Demonstration of supported use |
| `product-dominant` | Product remains the primary visual signal |
| `balanced` | Product and context share attention |
| `environmental` | Context carries more of the story while the product remains identifiable |
| `human-presence` | Use only when a person materially explains fit, scale, or application |
| `text-free` | Avoid generated copy when no approved text is needed |
| `reserve-overlay-space` | Leave a clean location for application-rendered exact copy |
| `model-rendered-headline` | Use only with approved copy and an explicit model-rendering experiment |

## Freedom and constraint assessment

Phase 2.3 becomes over-constraining when it does any of the following:

- Selects a visual treatment solely from a country or platform label.
- Treats a buyer-motivation code as a deterministic composition rule.
- Forces one palette, background, or layout across all slots.
- Requires people, props, promotional color, or text when the product evidence does not support them.
- Converts a soft market prior into a hard platform rule.
- Requires model-rendered text when overlay rendering is safer for exact copy.

The revised guidance avoids these problems by applying a precedence order:

1. Platform hard rules.
2. Product evidence and category requirements.
3. The communication objective of the slot.
4. Approved operator constraints and brand direction.
5. Buyer motivation.
6. Market context as a soft prior.
7. Model freedom for all remaining decisions.

When evidence is weak, the model should choose the least assumptive treatment that keeps the product clear. Every slot may still choose a different visual treatment.

## Revised Phase 2.3 prompt guidance

Use this text in the Shaper prompt after the market-context section:

```text
VISUAL ELEMENT SELECTION GUIDANCE:
For each slot, choose visualElements to serve the slot's communication objective. Consider, in order: platform hard rules, product evidence and category, approved operator constraints and brand direction, buyer motivation, and market context.

Market context is a soft prior and a testable hypothesis. Do not select a treatment solely because of a country, platform, or buyer-motivation label. Do not force one background, palette, layout, lifestyle level, or text strategy across the batch. Each slot may make a different choice.

Use pure-white only when a platform rule or strong verification objective supports it. Use contextual-scene or lifestyle-environment when the slot needs to communicate usage, scale, compatibility, or lifestyle fit. Use human-presence only when a person materially explains fit, scale, or application and the product evidence supports the depiction. Use model-rendered-headline only when approved copy exists and the experiment explicitly permits model-rendered text; otherwise use text-free or reserve-overlay-space.

Treat gradient, warm-enhanced, cool-enhanced, and vibrant-pop as optional stylistic treatments. Choose them when the product, category, brand direction, supplied references, campaign, or tested market evidence supports them. Do not infer a color treatment from Japan, Taiwan, China, or any other market alone.

Keep exact colors, materials, scene details, props, people, lighting, camera angle, and composition open to model judgment unless constrained by supplied facts, platform rules, or operator input. When evidence is weak, choose the least assumptive valid treatment that preserves product clarity.

Every slot must include complete visualElements, and the visualElements labels must remain a concise description of the image job rather than a complete art direction.
```

## Validation plan before implementation

Run the revised guidance as a controlled benchmark rather than assuming it improves marketing performance. Hold product references, slot roles, aspect ratio, approved copy, model, and seed policy constant. Compare:

- No visual-selection guidance.
- Original market-specific guidance.
- Revised evidence-qualified guidance.

Score each arm for product identity, platform compliance, slot-purpose adherence, visual diversity across siblings, shopper interpretation of the intended message, unintended claims or props, cultural appropriateness, and copy accuracy. Report results by product category and locale. Do not combine markets into one score that can hide a regression.

The implementation gate is: use the revised guidance only after it does not materially reduce product identity or slot adherence, and after any market-specific effect is demonstrated in the benchmark. The original country-level mappings should not be used as production rules without that evidence.

