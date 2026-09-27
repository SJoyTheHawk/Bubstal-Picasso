# Batch Output: Code Guide

> Superseded by `IMPLEMENTATION_GUIDE.md`. The public API does not provide
> deterministic slot IDs for partial multi-image responses, so production
> generation now uses one coordinated Shaper plan followed by per-slot image
> requests with bounded concurrency. This document remains historical context
> for the earlier combined-response implementation.

Change guide for two coupled changes to the generation call:

1. **Batch output.** One initial `/api/generate` call per batch instead of one per
   slot. A single combined prompt asks for N images; short responses trigger
   targeted retries for only the missing slots.
2. **Output size.** `imageSize` moves from `2K` to `1K`.

Read `HANDOFF.md` for product principles and `SHAPER_CODE_GUIDE.md` for repo
orientation. Line numbers below are against `app.js` as of commit `bb1c19e`
plus the current uncommitted working tree.

## Decision record

| Question | Decision |
| --- | --- |
| Batch shape | One combined call first; retry only slots missing from a short response. |
| Output size | `imageSize: '1K'`. No client-side resize. |

The request was "800x800". The API accepts fixed tiers only — `512px`, `1K`,
`2K`, `4K` — so `1K` at `1:1` returns **1024x1024**, not 800x800. This was
raised and accepted. Reaching exactly 800x800 would require a canvas downscale
after generation; that is deliberately out of scope here.

Batching does **not** reduce cost. Billing is per output image either way. The
wins are latency (one round trip instead of N) and tone consistency across the
set, since the model composes all slots in one pass.

## Current flow (what changes)

```
generatePrompts()                       app.js:906
  shapeBatch()                          app.js:674
  compilePromptRecords()                app.js:800   -> N prompt records
  saveBatch()                           <- before any paid call
  for (const promptRecord of ...)       app.js:950   <-- REMOVED
      callNanoBananaAPI(record, assets) app.js:1024  <-- returns 1 image
      push outputRecord; saveBatch(); renderResults()
```

After the change the loop collapses: one `callNanoBananaAPI()` call returning an
array, then targeted per-slot retries only when that array is short, followed by
one pass pairing images to prompt records by index.

## Edit 1: size constant

Add near the other constants at the top of `app.js` (after `MAX_INPUT_IMAGES`,
`app.js:5`):

```js
// The image model accepts fixed size tiers only (512px, 1K, 2K, 4K).
const IMAGE_SIZE = '1K';
```

Then replace every hardcoded `'2K'`. There are four:

| Site | Context |
| --- | --- |
| `app.js:831` | `prompt-preview-output` label text |
| `app.js:969` | success `outputRecord.imageSize` |
| `app.js:983` | failure `outputRecord.imageSize` |
| `app.js:1063` | `generationConfig.imageConfig.imageSize` in the request |

`app.js:831` builds a display string — use a template literal, not the bare
constant: `` `${record.aspectRatio}, PNG, ${IMAGE_SIZE}` ``.

## Edit 2: `buildBatchPromptRecord(promptRecords)`

New function, placed after `compilePromptRecords()` (`app.js:800`). It composes
the single prompt string actually sent to the model.

**`buildPromptRecord()` (`app.js:718`) stays exactly as it is.** It still feeds
the preview dialog, export provenance, and per-output metadata. Only the
transport changes. Do not fold it into the batch builder — the per-slot records
are the audit trail that pairs each output to the direction that produced it.

Structure of the combined prompt:

1. **Shared context, stated once.** Product identity block, category guardrail,
   additional product facts, must-have constraints, preferred direction, visual
   references, text handling, accuracy, creative freedom. These are identical
   across slots today, so N copies would only burn context.
2. **N numbered slot blocks.** For each record, its `purpose`, Shaper
   `direction`, `differentiator`, `sceneRationale`, and the platform
   `slotRules[i]`. Slot-specific text must stay attached to its number — the
   Amazon main image rule (pure white `#FFFFFF`, no props, ~85% frame) is not
   safe to generalize across the batch.
3. **Output contract.** Return exactly N separate images, one per numbered slot,
   in slot order, sharing one design tone, no repeated composition.

Read the sections from the existing per-slot records rather than recomputing
state. `getActiveConstraints()`, `buildCopyPlan()`, and `describeReferences()`
have already run once per slot by then.

The returned record should keep `aspectRatio` (all three platform templates are
`1:1`, so a single batch-level ratio is safe) and carry the composed `prompt`
plus the slot IDs it covers, in order.

## Edit 3: `callNanoBananaAPI()` returns an array

`app.js:1024`. Signature becomes `(batchRecord, assets)`.

**Unchanged:** `toInlineData()`, the product identity part labels, the reference
relationship labels, `responseModalities: ['TEXT', 'IMAGE']`, the fetch to
`/api/generate`, and the `!response.ok` branch. The server proxy
(`auth-service.js:71`) forwards the body verbatim and needs no change at all.

**Changed:** the single text part is now the combined batch prompt, `imageSize`
uses `IMAGE_SIZE`, and response parsing changes shape.

Today (`app.js:1085`) the parser takes the *first* image part:

```js
const imagePart = responseParts.find(part => part.inlineData?.data || part.inline_data?.data);
```

It must collect *all* of them, in order, and return one entry per image:

```js
const images = responseParts
    .filter(part => (part.inlineData?.data || part.inline_data?.data))
    .map(part => { /* ...normalize to { imageUrl, metadata } */ });
```

Keep the `inlineData` / `inline_data` dual-casing handling — Vertex has returned
both. Keep the refusal path, but trigger it only when **zero** images come back:
`responseParts.find(part => part.text)?.text` then
`result.promptFeedback?.blockReason`, same message shape as now. A short partial
return is not a refusal and must not throw.

The shared `metadata` (`finishReason`, response text, `usageMetadata`) describes
the whole call, not one image. Attach it to every entry so each output record
stays self-describing for export.

## Edit 4: `generatePrompts()` loop collapse

`app.js:950-995`. The `for (const promptRecord of promptRecords)` loop goes away.

**Keep the pre-call save.** `saveBatch()` at `app.js:945` runs before the first
paid request and that ordering is deliberate — compiled prompts survive a failed
generation. Do not move it.

New sequence:

1. Build the batch record from `promptRecords`.
2. One `await callNanoBananaAPI(batchRecord, assets)`.
3. If the response is short, retry only the missing slot records with their
   original per-slot prompts.
4. Pair the initial and recovered images to `promptRecords` by index.
5. Any slot still without an image becomes a `failed` output record whose `error`
   states the shortfall or retry error.
6. `saveBatch()` once, `renderResults()` once.

`batch.status` logic at `app.js:997` already derives from
`outputRecords.some(output => output.status === 'failed')` and needs no change —
partial returns land in `completed-with-errors` for free.

If the whole call throws, every slot gets a `failed` record with that error, so
the batch still persists N output records. The existing `catch` at `app.js:1008`
handles the outer failure path and stays.

Status text: the per-image `generation.progress` call at `app.js:952` no longer
has an index to report. Replace with a single batch message before the call.

## Edit 5: UI and i18n

| Site | Change |
| --- | --- |
| `i18n.js:102` | `review.outputPlan`: `'{count} images / 1:1 / PNG 2K'` -> `1K` |
| `i18n.js:280` | zh-TW same key: `'{count} 張圖片 / 1:1 / PNG 2K'` -> `1K` |
| `index.html:233` | Hardcoded fallback `7 images / 1:1 / PNG 2K` -> `1K` |
| `i18n.js` both locales | Add `generation.batch`, e.g. `Generating {count} images in one batch...` |
| `app.js:952` | Use `generation.batch`; `generation.progress` becomes unused |

`i18n.js` is **untracked in git** but required at runtime (see
`SHAPER_CODE_GUIDE.md`). Edit it on disk; it will not appear in `git status`.

Leave `generation.progress` in the dictionaries. Removing a key risks a bare
fallback string if any path still reaches it, and `test/i18n.test.js` checks
locale parity.

The preview dialog should show the combined batch prompt so what operators
inspect is what gets sent. `renderPromptPreview()` (`app.js:826`) currently
takes `(promptRecords, selectedIndex)` and the per-slot selector is asserted in
`test/app.test.js:244`. Simplest path: keep the per-slot selector working and add
the batch prompt as an additional view, rather than deleting the selector.

## Edit 6: Tests

`test/app.test.js`, run with `npm test`.

| Test | Line | Change |
| --- | --- | --- |
| `Nano Banana request includes every selected image...` | 109 | `imageSize` assert `2K` -> `1K` (line 133). Its mock returns one image part; extend to N and assert the combined prompt carries every slot. |
| `compiled prompts and each failed or successful output are saved incrementally` | 172 | Reworked. `context.callNanoBananaAPI` mock counts calls and throws on the 2nd (line 199) — with one call per batch that premise is gone. Mock returns an array; assert one call for `imageCount: 2`. |
| preview output label | 248 | `'1:1, PNG, 2K'` -> `'1:1, PNG, 1K'` |

Add a partial-return case: `imageCount: 2`, mock returns 1 image, assert slot 1
is `success`, slot 2 is `failed`, and `batch.status` is `completed-with-errors`.
This is the path most likely to occur in production and has no coverage today.

The existing assertions on save ordering (`saved[0].outputRecords.length === 0`,
line 207) still hold and are worth keeping — they pin the "prompts persisted
before paid call" guarantee.

## Risks

- **Image count is not guaranteed.** Interleaved multi-image output is
  model-driven; there is no `candidateCount` for this model. N images per request
  is a request, not a contract. The partial-return path is the mitigation.
- **One refusal still costs the batch.** A response with zero images is treated
  as a failed call; only a short nonzero response triggers missing-slot retries.
- **Context pressure.** The combined prompt plus up to `MAX_INPUT_IMAGES` (14)
  attachments is a much larger single request. Shopee TW at 9 slots is the worst
  case. Watch for truncation there first.
- **Slot fidelity may soften.** Per-slot rules compete for attention inside one
  prompt. The Amazon main image (`amazon-jp` slot 0, pure white background, no
  props) is the highest-risk slot and the one to check first on a real batch.

## Verification

`npm test` covers compile, request shape, and persistence. Neither the batch
count nor slot fidelity can be verified without a real paid call, so confirm on
one live batch per platform: `amazon-jp` (7), `shopee-tw` (9), `rakuten` (7).
Check the returned image count matches, slot 0 of `amazon-jp` is on white, and
outputs are 1024x1024.
