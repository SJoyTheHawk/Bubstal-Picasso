# Shaper: Code Guide

Companion to `SHAPER_PLAN.md`. That document covers what and why; this one covers
where and how. Read `HANDOFF.md` first for product principles.

## Repo orientation

Vanilla JS, no build step, no framework. Express server serves the static app
from the same origin as the API.

| File | Role | Tracked |
| --- | --- | --- |
| `app.js` | Everything client-side: state, templates, compiler, IndexedDB, UI | yes |
| `auth-service.js` | Express server, ADC auth, `/api/generate` proxy | yes |
| `index.html` | Markup, incl. `#prompt-preview-dialog` | yes |
| `i18n.js` | en-US + zh-TW dictionaries, flat dotted keys | **untracked** |
| `styles.css` | Styles | yes |
| `test/app.test.js`, `test/i18n.test.js` | `node --test` suites | app only |

`i18n.js` and `test/i18n.test.js` are untracked in git but present on disk and
required by the app. Do not assume a clean checkout has them.

Run: `npm start` (ADC from environment) or `npm run start:local` (uses
`auth/service_auth.json`). Port 3000. `npm test` for tests.

`auth/` contains credentials and is hard-404'd at `auth-service.js:70`. Never
serve it, never commit it, never read the key values into logs or output.

## Current data flow

```
operator input -> state
                   |
                   v
         compilePromptRecords()          app.js:608
                   |
                   v
         buildPromptRecord(i)            app.js:530
           reads PLATFORM_TEMPLATES[platform].imagePurposes[i]   <- index lookup
           reads PLATFORM_TEMPLATES[platform].slotRules[i]       <- index lookup
           reads getActiveConstraints()  app.js:465
           reads buildCopyPlan()         app.js:487
           concatenates sections -> prompt string
                   |
        +----------+----------+
        v                     v
  previewPrompts()      generatePrompts()
  app.js:646            app.js:711
  (local, free)         callNanoBananaAPI() -> /api/generate
```

Both consumers funnel through `compilePromptRecords()`. That is the single seam
the Shaper is inserted above.

## Key existing functions

| Function | Line | Note |
| --- | --- | --- |
| `buildPromptRecord()` | 530 | Main compiler. Lines 533/534/547 are the injection points |
| `buildCopyPlan()` | 487 | Hard-codes copy placement by slot index; Shaper takes this over |
| `getActiveConstraints()` | 465 | Maps `locked` -> `must-have`, else `preferred` |
| `getSelectedAssets()` | 479 | Caps total images at `MAX_INPUT_IMAGES`; product images win |
| `validateBatchInputs()` | 615 | `requireAuth` currently only passed by Generate |
| `buildInputSnapshot()` | 904 | Add season/promotion here |
| `markInputsChanged()` | 1102 | Runs on every input change — cache invalidation hook |
| `exportCurrentBatch()` | 1107 | Add plan + `planSource` here |
| `generateId(prefix)` | 1083 | Use for plan IDs |
| `uiText(key, vars, fallback)` | 5 | Always pass a fallback |

Constants at the top of `app.js`: `MODEL_ID` (`gemini-3-pro-image`),
`PROMPT_FORMAT_VERSION` (`'2.0'`), `OVERLAY_CONSTRAINT_IDS`.

Platform templates carry `name`, `imageCount`, `aspectRatio`, `imagePurposes[]`,
`tone`, `slotRules[]`, `constraints[]` for `amazon-jp` (7), `shopee-tw` (9),
`rakuten` (7). Category presets carry `name` and `guidance` for beauty,
electronics, apparel, food, home.

## Plan schema

The contract between Shaper and compiler. Treat as versioned; bump
`planFormatVersion` on any breaking change.

```js
{
  planFormatVersion: '1.0',
  id: 'plan_...',
  planSource: 'shaper',            // 'shaper' | 'fallback'
  shapedAt: '2026-09-17T...',
  model: SHAPER_MODEL_ID,

  productRead: {                   // what the Shaper saw in the images
    verificationNeed: 'low'|'medium'|'high',
    purchaseType: 'repeat'|'one-off',
    infoLocation: 'packaging'|'listing'|'both',
    anglesSupplied: 2,
    notes: 'short factual observation'
  },

  batchTone: {                     // authored ONCE, identical in every slot
    character: '...',
    palette: '...',
    mood: '...',
    finish: '...'
  },

  resolvedImageCount: 7,
  countRationale: 'short reason',

  slots: [
    {
      index: 1,
      role: 'hero',                // closed vocabulary only
      direction: 'what this slot must communicate',
      differentiator: 'how this differs from the other slots',
      sceneRationale: 'why this slot needs a scene, or why plain is correct',
      sceneSource: 'shaper'|'operator',   // 'operator' when seeded from input
      copyPlacement: 'none'|'model-rendered'|'reserve-overlay-area',
      derivedFrom: 'open'          // 'open' | 'platform-rule' | 'operator'
    }
  ]
}
```

**Role vocabulary is closed.** Define `SHAPER_ROLES` as a frozen set and reject
anything outside it during validation. Derive the initial set from the existing
`imagePurposes` arrays so the compiler already understands every value: hero,
benefit, feature-detail, material-detail, scale, usage, alternate-view,
package-contents, lifestyle. Extend deliberately, never let the model extend it.

**Coherence invariants** to assert in validation, not merely request in the
prompt: exactly one `batchTone` object; `slots.length === resolvedImageCount`;
`slots[i].index === i + 1`; no two `differentiator` values equal or
near-duplicate; every `role` in `SHAPER_ROLES`.

## Implementation notes by phase

### Phase 1 — `/api/shape`

Mirror `/api/generate` (`auth-service.js:43`): `await auth.getClient()`,
`await auth.getProjectId()`, forward with `x-goog-user-project`, and route errors
through `getGoogleApiError()`. Differences: a text-generation endpoint rather
than `interactions`, and a JSON response instead of `output_image`.

Add `SHAPER_MODEL_ID` as a separate constant. `MODEL_ID` is an image model and
cannot serve this call. Use the strongest available text model — see the plan's
reasoning on the inverted cost profile.

Request JSON-mode / structured output if the endpoint supports it. Even then,
validate client-side: structured output reduces malformed returns, it does not
eliminate them, and it does not enforce the coherence invariants at all.

The existing `express.json({ limit: '50mb' })` at `auth-service.js:6` already
accommodates base64 image payloads.

### Phase 2 — Shaper prompt

Follow `arbiter.py`'s prompt construction: an explicit role statement, the closed
action vocabulary, the exact JSON schema inline, and a hard instruction to return
JSON only with no markdown fences. `arbiter.py:269` (`_strip_json_fences`) exists
because models emit fences anyway — port that defensive step.

Send as input: platform hard rules and bounds (from the template, not from model
memory), category guidance, product name/variant, season, promotion, batch
direction, operator constraints with their Must Have/Preferred levels, reference
image roles, and **the product images themselves**.

Send the axes framing, not a category-to-ratio table: verification need, repeat
vs. one-off purchase, information on packaging vs. in listing text. Let the
Shaper reason from the axes to the slot mix.

State the precedence chain in the prompt verbatim from `SHAPER_PLAN.md`, and
state plainly that the Shaper may only decide what is Open.

**Do not include any instruction to be creative, varied, imaginative or
original.** It biases every batch toward scenes and cannot be read as "sometimes
plain". Require a `sceneRationale` per slot instead, and state that plain slots
with no scene are a fully valid outcome for high-verification products. A model
that must give a reason picks "none" far more readily than one told to be
imaginative. See the plan's design-choices section.

**A scene can smuggle in a claim.** `HANDOFF.md` forbids inventing performance
claims and `app.js:583` enforces it — but only for *stated* claims. A scene makes
them implicitly: put sunscreen in a hiking scene and you have implied sweat
resistance and outdoor endurance; put children in frame and you have implied a
child-safe product. Neither claim was typed by anyone, so the accuracy block
never catches it. Constrain the Shaper to usage contexts the supplied product
facts actually support, and require that depicting people — children especially —
trace to operator input rather than seasonal inference. Depicting people is a
larger liberty than choosing a setting; it asserts an audience.

Scene concepts are operator-seedable but never required. Check
`categoryPreference` and `batchDirection` for direction first and build around it
with `sceneSource: 'operator'`; otherwise the Shaper proposes with
`sceneSource: 'shaper'`.

The Shaper receives no batch history in the MVP, so it will repeat scene concepts
across separate batches. This is a known accepted limitation — read the Risks
section of `SHAPER_PLAN.md` before attempting to fix it.

### Phase 3 — `shapeBatch()`

```js
async function shapeBatch() { /* assemble -> POST /api/shape -> validate -> cache */ }
function validateShaperPlan(raw, template) { /* coerce, repair, or signal fallback */ }
function buildFallbackPlan(template) { /* today's static arrays as a plan object */ }
```

Repair ladder, following `_repair_arbiter_add_op`: coerce coercible types; drop
invalid slots and refill from the static template at that index; if slot count is
wrong, truncate or pad from the template; if `batchTone` is missing, use
`template.tone`; if the response is unparseable or `slots` is absent entirely,
return `buildFallbackPlan()` with `planSource: 'fallback'`.

Never throw into the UI. A Shaper failure is a degraded batch with a notice, not
an error dialog.

`buildFallbackPlan()` is also the reference for what a valid plan looks like, and
makes phase 4 testable before the live call works. Write it first.

Cache on `state.shaperPlan`. `markInputsChanged()` (`app.js:1102`) already fires
on every input change and clears `currentBatch`; clear `shaperPlan` in the same
place. One cached plan serves both preview and generate — that is what prevents
approving one plan and generating another.

### Phase 4 — Compiler wiring

Read from the plan at `app.js:533`, `534`, `547`, and hand copy placement in
`buildCopyPlan()` to `slots[i].copyPlacement`.

Keep the platform hard rule alongside `slots[i].direction` rather than replacing
it. The Amazon main-image rule (pure white `#FFFFFF`, 85% frame, no added text)
is a marketplace requirement, not a creative decision, and the Shaper must not be
able to soften it. Same for `isAmazonMain` handling at `app.js:542` and the
`state.platform !== 'amazon-jp'` guard on model-rendered text at `app.js:503`.

Add `shaperPlanId` and `planSource` to the returned prompt record so each prompt
traces back to the plan that produced it. Consider bumping
`PROMPT_FORMAT_VERSION` to `'3.0'`, since prompt provenance changes materially.

`previewPrompts()` and `generatePrompts()` must each ensure a plan exists before
compiling. `previewPrompts()` becomes `async`; update its call site.

The `CREATIVE FREEDOM` section (`app.js:582`) and the tone language in
`describeReferences()` (`app.js:516`) stay. They now reinforce a tone that is
actually shared rather than merely requested per-prompt.

### Phase 5 — Inputs, persistence, export

`state` (`app.js:166`) gains `season`, `promotion`, `shaperPlan`,
`imageCountTouched`. Set `imageCountTouched = true` in the `#image-count`
listener (`app.js:1161`) and reset it to `false` in the platform listener
(`app.js:1151`), which already resets `imageCount` from the template.

Add both fields to `buildInputSnapshot()` (`app.js:904`) and wire inputs in
`index.html` near the existing setup form group (around line 70), following the
existing `data-i18n` attribute pattern.

`season` is the **campaign target** season, not the current date. eCommerce works
on lead time — summer imagery is planned in spring — so never derive it from
`Date.now()`. Pair it with the platform's market when passing it to the Shaper:
summer reads differently across Amazon.co.jp, Shopee TW and Rakuten, so a bare
`'summer'` string is weaker than season plus market.

Persist `shaperPlan` and `planSource` on the batch object (`app.js:731`) and add
both to `exportCurrentBatch()` (`app.js:1107`), bumping `exportVersion` to 2.
Per `HANDOFF.md`, exports omit source image binaries — the plan text is fine, but
do not let product images ride along inside `productRead`.

IndexedDB needs no migration: `batches` is keyed by `id` with no fixed schema, and
`getDisplayResults()` (`app.js:933`) already handles older records. Keep reads of
old batches working — check `planSource` presence rather than assuming it.

### Phase 6 — Preview dialog

Dialog markup is at `index.html:262-287`: a `<select id="prompt-preview-select">`
per-image switcher, a `<dl class="prompt-preview-meta">` metadata block,
`<pre id="prompt-preview-content">` for the prompt, and a footer with
`#copy-prompt-preview` and `#done-prompt-preview`.

Add a plan summary panel (batch tone, all slot roles, `planSource`), a Generate
button in the footer, and a Regenerate-plan control. Keep Copy prompt working —
it is the current production path into the Nano Banana web UI.

Generate from the dialog must reuse the cached plan, not re-shape.

Update `prompt.eyebrow` in both locales (`i18n.js:121` en-US, `:293` zh-TW). "No
API call" / "不會呼叫 API" becomes false once Preview shapes. Every new key needs
both locales; `test/i18n.test.js` should assert parity.

Show a clear notice when `planSource === 'fallback'` so a degraded batch is never
mistaken for a shaped one.

### Phase 7 — Tests

`test/app.test.js` loads source via `fs.readFileSync` and evaluates it against a
DOM stub (`test/i18n.test.js:27` shows the pattern). Follow it rather than
introducing a test framework.

Cover the malformed-return matrix, the coherence invariants, precedence (a Must
Have survives a conflicting Shaper decision), and fallback producing a usable
batch. Stub `/api/shape` — tests must not make live calls.

## Conventions

Match what is there: 4-space indent, single quotes, no semicolon omission,
`function` declarations over arrow consts at top level, `async`/`await` over
promise chains. Optional chaining and `??` are used freely. Comments are sparse
and explain *why* (see `app.js:868`, `auth-service.js:41`) — do not add narration.

Never interpolate operator input into HTML without `escapeHtml()` (`app.js:1087`).
The plan is model output rendered into the preview dialog, so it needs the same
treatment — model-generated strings are untrusted input.

All user-facing strings go through `uiText()` with a fallback, in both locales.

Do not add dependencies. Current runtime deps are `express` and
`google-auth-library` only.

## Pitfalls

- **Do not run the Shaper per slot.** It must plan the whole batch in one call.
  Per-slot planning cannot produce non-redundant slots — you get nine variations
  of a hero shot. This is the failure mode the design exists to prevent.
- **Do not trust the return shape.** Validate and repair every field.
- **Do not let the Shaper touch Must Haves or platform hard rules.**
- **Do not re-shape between preview and generate.**
- **Do not add retry or scoring loops.** `HANDOFF.md` rejects them; a fallback is
  not a retry.
- **Do not skip the image input.** A text-only Shaper plans blind and the whole
  premise weakens.
- **Do not ask the model to be creative.** It biases toward scenes on products
  that should be plain. Restraint must be an equally weighted schema option.
- **Do not let a scene assert an unsupported claim**, and do not let a lifestyle
  slot lock composition — scene concept yes, framing no.
- **Do not derive `season` from the current date.** It is the campaign target.
- **Watch `getSelectedAssets()` capping.** Product images displace reference
  images at `MAX_INPUT_IMAGES`; the Shaper's view must match what generation
  actually receives.

## Open items for the implementing session

Two decisions in `SHAPER_PLAN.md` were made without explicit operator sign-off:
degrade-on-failure, and Shaper-proposed image count with operator override
winning. Both are reversible, but confirm before building on them.

Also confirm that Preview requiring auth and costing a call is acceptable. It is
the one existing guarantee this work changes rather than extends. Note that
`test/app.test.js` contains a test named *"prompt preview displays compiled
prompts without authentication or API calls"* — it asserts exactly the guarantee
phase 6 removes, so it must be rewritten rather than extended.

Deferred by decision, not oversight: batch-history injection for scene variety.
The reasoning and the intended approach are recorded under Risks in
`SHAPER_PLAN.md`.
