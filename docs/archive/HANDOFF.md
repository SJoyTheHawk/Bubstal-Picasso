# Bubstal Picasso: Product Handoff

## Objective

Bubstal Picasso uses AI-generated product photography to reduce the time and cost of repetitive eCommerce image production normally handled by human designers.

The goal is not to pursue the best possible image at any cost. The goal is to balance generation cost, production speed, and usable commercial quality. A successful batch should preserve the product and required business information while needing substantially less briefing, manual design work, and correction.

## Product Principle

Operators should enter what is essential and only a small amount of preferred direction. They should not need to complete a large product database or direct every visual decision.

The system separates input into three levels:

| Level | Meaning |
| --- | --- |
| Must Have | Exact product facts, copy, legal requirements, or platform requirements that cannot change |
| Preferred | Brand or campaign direction the AI should normally follow |
| Open | Decisions the AI is free to make |

Anything the operator does not enable is Open. Composition, camera angle, lighting, props, and scene design should remain open unless there is a business reason to constrain them. This creative freedom is intentional: it allows the AI to produce dynamic and varied designs rather than mechanically repeat one template.

Product identity is always a Must Have. The generated product must retain the geometry, proportions, colors, materials, packaging, visible labels, logos, quantity, and included components shown in the supplied product images.

## Cost And Quality Boundary

- Generate one image per requested slot with Nano Banana Pro.
- Do not automatically create variants, retry acceptable outputs, score images, or run refinement loops.
- Optimize for a useful first batch and lower operator correction effort, not artistic perfection.
- Treat marketplace and category presets as practical guidance, not legal certification.
- Leave nonessential decisions open instead of adding controls for every visual property.

## Inputs

### Required

- Target marketplace
- Product category
- Product name
- At least one product image

### Optional

- Product variant
- Essential category facts
- A small category-specific creative preference
- Marketplace constraints marked Must Have or Preferred
- A short batch direction
- Style, layout, or color reference images

The five initial category presets are Beauty & Personal Care, Electronics & Appliances, Apparel & Accessories, Food & Beverage, and Home & Living. Their preservation guidance is applied behind the interface instead of becoming a long required form.

## Batch Design

Each marketplace defines a sequence of useful image roles such as hero, benefit, feature detail, material detail, scale, usage, alternate view, and package contents.

Images in a batch should share a recognizable design tone through qualities such as brand character, palette, mood, and visual finish. They should not reuse the same layout or scene. The rule for references is:

**Same design tone, not the same design.**

The AI should choose an original composition for every slot unless an operator explicitly makes a layout requirement a Must Have.

Unsupported prices, ratings, comparisons, discounts, measurements, certifications, ingredients, accessories, and performance claims must never be invented. Evidence-dependent content is used only when supplied by the operator.

## Prompt And Image Flow

Operators can preview every compiled prompt and its request settings before generation. Previewing may call the Shaper, but has no image-generation or persistence side effects. Generate Batch remains the explicit action that commits the batch to Nano Banana Pro.

After that action, the application performs two internal steps:

1. Compile a structured prompt record for every image slot and save the batch.
2. Generate every slot from its exact prompt record, with at most two Nano Banana Pro requests in flight, and save each outcome against the prompt ID that initiated it.

This separation lets the team inspect exactly what prompt produced each output and prepares stable prompt/output pairs for a future human-review survey. It does not store hidden model reasoning.

Each prompt record contains the final prompt, purpose, platform, category, active constraints, selected asset names, reference relationships, aspect ratio, copy plan, and prompt-format version.

Each output record contains the prompt ID, success or failure, model and output settings, timestamps, generated image when successful, and basic API or error metadata.

## Text Handling

Use a lightweight hybrid policy:

- Nano Banana may render a short promotional headline supplied by the operator.
- Prices, numeric claims, specifications, warnings, legal copy, certifications, and other accuracy-critical text are recorded for later overlay.
- The image prompt reserves an uncluttered area when later text is required.
- The MVP does not perform final text compositing or define detailed typography specifications.

## Persistence And Export

The complete working batch remains in the existing browser IndexedDB record, including uploaded source and reference images. Prompt records are saved before rendering, and output records are saved incrementally as slots finish so completed work survives a later failure.

Operators can export a JSON review package containing prompts, copy plans, generated images, statuses, model settings, and timestamps. Uploaded source and reference image binaries are intentionally omitted from the export.

## Success Criteria

The trial succeeds when an operator can provide core product material once and receive a coordinated batch that:

- Preserves Must Have product and business facts.
- Reflects Preferred direction without turning it into a rigid rule.
- Fits the selected marketplace and category.
- Uses one tone while still producing different designs.
- Does not invent unsupported commercial claims.
- Reduces briefing time, designer production time, and correction effort.

Visual perfection is not the acceptance standard. Commercial usefulness at a practical time and generation cost is.
