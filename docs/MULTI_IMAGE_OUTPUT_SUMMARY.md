# Multi-Image Output Investigation Summary

## Executive Summary

Gemini 3 Pro Image can return multiple interleaved image parts from one prompt,
but the public API does not guarantee either the requested image count or a
structured mapping between each returned image and an application-defined slot.

The application therefore cannot safely assume that a partial response containing
one image represents slot 1, or that a response containing five images represents
slots 1 through 5. That assumption can attach an image to the wrong Shaper purpose
and cause retries to regenerate the wrong slots or duplicate an existing design.

For deterministic eCommerce output, the recommended architecture is:

1. Run Shaper once to create one coordinated batch plan.
2. Compile and preserve one prompt record per slot.
3. Make one image-generation request per slot using that exact prompt record.
4. Share the same batch tone, product references, and sibling differentiators
   across all slot requests.
5. Pair every response directly with the prompt ID that initiated it.

This uses multiple image-generation calls, but it preserves one coordinated plan
and removes ambiguous response-to-slot matching.

## Confirmed API Behavior

The current image model is `gemini-3-pro-image`, called through Vertex AI's
`generateContent` endpoint.

Google's documentation confirms:

- Gemini 3 Pro Image supports interleaved text and image output.
- A response may contain multiple image parts.
- The model may not follow the exact number of images requested in the prompt.
- `candidateCount` cannot be used to request ten image outputs. Gemini 3 does not
  support `candidateCount > 1`; using it returns HTTP 400.
- The model has a 32,768-output-token limit. Ten 1K images fit within the
  theoretical token budget, but that is a capacity limit, not an output-count
  guarantee.
- Gemini Batch API submits multiple independent `GenerateContentRequest` objects
  asynchronously. It is not one prompt that guarantees ten coordinated images.

Official references:

- [Gemini image generation and limitations](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/generate-content/gemini-3)
- [Gemini 3 Pro Image model specifications](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-pro-image)
- [Gemini Batch API](https://ai.google.dev/gemini-api/docs/batch-api)
- [Google Flow image help](https://support.google.com/flow/answer/16729550?hl=en)

## Google Flow Is Not the Public API Contract

Google Flow exposes a "Number of outputs" control and its Agent can request many
variations. However, Google's public documentation does not state that Flow maps
that control to one `generateContent` call or to a public request parameter.

Flow is a product-level orchestration system. It can route work to different
models and create multiple generations for one user action. Its behavior should
not be treated as evidence that the public Vertex API can guarantee ten images
from one generation call.

## Current Code Risk

The current recovery logic treats the returned image array as a contiguous prefix:

```text
images[0] -> slot 1
images[1] -> slot 2
...
```

When a combined ten-slot request returns one image, the API does not provide a
structured `slotId`. The image might represent slot 1, another slot, or a blended
interpretation of several slot instructions.

The current code then retries from `images.length` onward. For a one-image
response, it assumes slot 1 succeeded and retries slots 2 through 10. This can
produce several incorrect outcomes:

- The returned image is saved against the wrong purpose.
- The actual missing slot is not retried.
- A slot that already appeared in the response is generated again.
- The batch is marked complete even though its prompt-to-output provenance is
  incorrect.

Per-slot retry prompts do contain the correct purpose, Shaper direction,
differentiator, scene rationale, and platform rule. The problem is identifying
which slots were actually satisfied by the initial combined response.

## Recommended Generation Flow

```text
Operator inputs
      |
      v
One Shaper request
      |
      v
One coordinated batch plan
      |
      v
Compile N per-slot prompt records
      |
      +--> Generate slot 1 --> output linked to prompt 1
      +--> Generate slot 2 --> output linked to prompt 2
      +--> Generate slot 3 --> output linked to prompt 3
      ...
      +--> Generate slot N --> output linked to prompt N
```

Image requests may run sequentially or with limited concurrency. Limited
concurrency, such as two or three requests at a time, can reduce total latency
without creating a large burst of ten simultaneous paid calls.

## How to Preserve Batch Consistency

Every per-slot request should include:

- The same Shaper `batchTone`.
- The same product identity and reference images.
- The slot's exact purpose and platform rule.
- The slot's Shaper direction and scene rationale.
- The slot's differentiator.
- A concise list of sibling slot purposes and differentiators as compositions to
  avoid duplicating.

This does not mathematically guarantee visual consistency or uniqueness, but it
provides deterministic purpose assignment and stronger anti-duplication guidance
than an ambiguous partial batch response.

## Alternative: Tagged Interleaved Output

A combined request can ask the model to return this sequence:

```text
SLOT 1
<image part>
SLOT 2
<image part>
...
```

The parser could accept an image only when it immediately follows one valid,
unique `SLOT n` marker. Missing, duplicate, out-of-range, or unlabelled images
would be rejected and regenerated per slot.

This is useful as a best-effort optimization, but it is not fully reliable. The
slot markers are generated text, not structured API metadata, so the model may
omit, reorder, or merge them. It should not be the only correctness mechanism.

## Required Code Changes

1. Remove the assumption that partial response images correspond to slots
   `1...images.length`.
2. Stop using partial combined output as authoritative slot output unless a slot
   can be identified unambiguously.
3. Generate each slot from its existing `promptRecord` and attach the result
   directly to that record's `promptId`.
4. Add sibling-purpose and sibling-differentiator exclusions to each slot prompt.
5. Keep the pre-generation batch save so compiled prompts survive failures.
6. Save successful and failed slot results incrementally or after each bounded
   concurrency group.
7. Preserve `imageSize: '1K'`, the selected assets, API metadata, and export
   provenance.
8. Update progress text to report completed slots rather than claiming one model
   response will contain the entire batch.

## Acceptance Criteria

- Every output is linked to the exact prompt that initiated its API request.
- A response can never be assigned to a slot based only on array position from a
  partial multi-image response.
- A failed slot does not change the purpose or identity of another slot.
- Shaper runs once and its plan is reused for every image request.
- The Amazon main-image rule remains isolated to slot 1.
- Successful slots remain saved if a later slot fails.
- No automatic retry produces a second output for a slot already marked success.
- Tests cover complete success, one-slot failure, partial completion, retry
  failure, save ordering, concurrency limits, and prompt-to-output IDs.

## Decision

Use one Shaper request followed by one deterministic image-generation request per
slot. Treat combined multi-image generation as experimental until Google exposes
a guaranteed image-count and structured slot-identification contract in the
public API.
