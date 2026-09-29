# Picasso visual-complexity cross-check and implementation plan

## Current assessment

The guide defines five theory-informed families. Its minimum specification lists **15 core metrics**; the family table also mentions optional variants such as feature congestion, saturation SD, and colourfulness. The five families are not yet validated as five statistical factors; the guide correctly defers EFA/CFA.

Picasso currently performs **semantic planning**, not numeric image measurement.

| Family | Guide metrics | Current Picasso status |
|---|---|---|
| Feature complexity | `edge_density`, `shannon_entropy`, `local_contrast_sd` | None measured |
| Element complexity | `object_count`, `object_class_count`, connected regions/area dispersion | None measured |
| Colour complexity | mean saturation, hue diversity, luminance SD | Categorical `colorPalette` and `batchTone.palette` only |
| Text complexity | text area ratio, OCR character count, text block count | Copy policy and planned text strategy only; no OCR |
| Composition complexity | product occupancy, whitespace ratio, product centroid X/Y | Categorical background, treatment, layout, and lifestyle enums only |

There is no analyzer, OCR pipeline, detector, segmentation module, `/api/analyze` endpoint, metric CSV, or image-scoring dependency in the repository. `package.json` contains only the Express/auth stack, and the archive explicitly records that no analysis endpoint exists ([package.json](/Users/szemy/Workspace/Bubstal%20Picaso/package.json:13), [buyer-motivation integration](/Users/szemy/Workspace/Bubstal%20Picaso/docs/archive/BUYER_MOTIVATION_INTEGRATION.md:158)).

The current fusion path is:

1. Product/reference images, category, platform rules, operator constraints, market context, and buyer motivation go to Gemini Shaper ([app.js](/Users/szemy/Workspace/Bubstal%20Picaso/app.js:1072)).
2. Shaper returns per-slot categorical fields: background, product treatment, layout, palette, lifestyle level, and text strategy ([app.js](/Users/szemy/Workspace/Bubstal%20Picaso/app.js:1120)).
3. The response is schema-validated, repaired, or replaced by a platform fallback ([app.js](/Users/szemy/Workspace/Bubstal%20Picaso/app.js:797)).
4. The compiler places those fields into each image prompt as a `VISUAL ELEMENT PLAN` ([app.js](/Users/szemy/Workspace/Bubstal%20Picaso/app.js:1285), [app.js](/Users/szemy/Workspace/Bubstal%20Picaso/app.js:1331)).
5. Gemini or Qwen renders the image, and Picasso saves prompt/output records ([README.md](/Users/szemy/Workspace/Bubstal%20Picaso/README.md:81)).

Therefore, the defensible current claim is: **Picasso logs intended visual treatments and uses them to control generation; it does not yet verify the resulting images with the guide’s 15 metrics.** The existing 48-hour technical document is a proposed checklist and code sketch, not an implemented analyzer.

## Implementation changes

- Add a versioned Python `visual-analysis/` package because the guide’s recommended stack and the existing Qwen service are Python-based.
- Provide both:
  - a batch CLI for 200–500-image corpus analysis;
  - a Node `/api/analyze` proxy for analyzing uploaded source images and generated slots from the Picasso UI.
- Standardize every image to a 512-pixel long side while preserving original dimensions and source metadata.
- Return one record per image containing:
  - `image_id`, `batch_id`, `prompt_id`, `slot_index`, `source_type`, `platform`, `category`, timestamp, original dimensions;
  - raw metric values;
  - normalized values;
  - analyzer version and configuration;
  - quality flags, missingness, OCR confidence, detector confidence, and segmentation status.
- Implement the 15 metrics with fixed, reproducible defaults:
  - Canny edge density with fixed thresholds;
  - grayscale Shannon entropy;
  - local luminance contrast standard deviation;
  - detector object count and unique class count;
  - OCR box union area, cleaned character count, and merged text-block count;
  - mean saturation, hue-histogram entropy after excluding low-saturation pixels, and luminance SD;
  - primary-product occupancy, whitespace proxy, and product centroid X/Y.
- Use PaddleOCR or EasyOCR for multilingual text, a pinned pretrained detector for the first single-category pilot, and detector-box occupancy as the initial product mask. Add segmentation later for white-on-white and multi-object cases.
- Preserve Picasso’s existing categorical `visualElements` and join them with measured metrics. Store intended treatment and observed result separately so a model can learn whether a requested “product-dominant” or “vibrant-pop” treatment actually appeared.
- Do not create a single composite “complexity score” in v1. Keep raw metrics and standardized features; derive family scores only after reliability and factor validation.
- Add page/environment aggregation later:
  - median and dispersion of surrounding thumbnails;
  - focal-thumbnail minus surrounding-thumbnail relative contrast;
  - page-level density summaries.

## Validation and research sequence

- Add synthetic-image unit fixtures for blank, edge-rich, text-heavy, multi-object, and high-contrast images. Assert bounds, monotonic behavior, stable reruns, and schema completeness.
- Add integration tests for `/api/analyze`, batch CSV export, prompt/output linkage, and persistence in Picasso’s IndexedDB/export records.
- Run 30–50 manual QA images to measure OCR, detector, occupancy, and whitespace failure modes.
- Pilot on one platform and one category with 200–500 images, matching the guide’s controlled sampling recommendation.
- Report metric distributions, missingness, correlations, and platform summaries without causal claims.
- Validate computational metrics against human ratings of complexity, clutter, readability, and fluency.
- Only after that run EFA on a development sample, CFA on a holdout sample, and measurement-invariance checks before treating the five families as stable constructs.
- Progress through simulated choice/click tasks, observational marketplace data, and finally merchant A/B tests. Keep stimulus properties, human response, behaviour, and commercial outcomes as separate evidence layers.

## Assumptions

- The first release analyzes both original product photos and Picasso-generated outputs, with `source_type` distinguishing them.
- The first corpus is one category and one primary platform; cross-platform comparison follows only after the pipeline is reliable.
- Numeric measurement is asynchronous after generation so it does not delay image rendering.
- Product identity, platform compliance, and copy accuracy remain separate review dimensions from visual complexity.
- No metric will be interpreted as attention, conversion, or causality without human or behavioural validation.

Repository checks currently pass: `npm test` reports 59 passing tests, and JavaScript syntax checks pass. No implementation changes have been made yet.
