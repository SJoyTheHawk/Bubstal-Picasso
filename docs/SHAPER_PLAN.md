# Shaper: Implementation Plan

## Purpose

Picasso today is a deterministic template compiler. Slot roles come from fixed
arrays indexed by position (`PLATFORM_TEMPLATES[platform].imagePurposes[i]` and
`slotRules[i]`), so every product on a given marketplace receives an identical
batch structure. A shampoo and a laptop get the same seven slots.

The Shaper replaces that index lookup with one planning call. It fuses fixed
variables (platform, category, season, promotion) with the actual product
images, and returns a JSON batch plan that the existing prompt compiler consumes.
It decides *what each image in the batch should be and how the slots differ from
each other*; it does not write the final prompt.

Reference architecture: `Lighthouse-main/lighthouse_application/lighthouse_application/arbiter.py`.
What we borrow is the data-crunch-to-schema-locked-JSON pattern and its
validate/repair discipline (`_validate_arbiter_output`, `_repair_arbiter_add_op`,
"executor-supported actions only"). What we do **not** borrow is the
accept/reject/clarify/escalate control loop — Lighthouse arbitrates inside a
10-second feedback loop where a wrong call self-heals. The Shaper is a one-shot
planner whose output is spent on real image generations, so bounded output
matters and iteration does not.

The component is named **Shaper**, not arbiter. It shapes prompt composition.

## Naming and vocabulary

| Term | Meaning |
| --- | --- |
| Shaper | The planning stage added by this work |
| Plan | The Shaper's JSON return for one batch |
| Slot | One image position in a batch |
| Role | What a slot is for (hero, feature detail, lifestyle, ...) |
| Batch tone | The single shared design character across all slots |
| Differentiator | What makes a slot visually distinct from its siblings |

## Decisions already made

**Naming.** "Shaper" throughout — code, i18n keys, records.

**Plan editing: read-only + regenerate.** The operator inspects the plan and can
re-run the Shaper, but cannot hand-edit slots. Hand-edits would break the
non-redundancy the Shaper authored across slots.

**Timing: one call, cached, shared by both paths.** Preview and Generate both go
through `compilePromptRecords()`. The Shaper runs on whichever fires first, the
plan is cached on `state.shaperPlan`, and the other path reuses it. The preview
dialog gains a Generate button so the operator can inspect the shaped prompt and
proceed without re-shaping. Copy-to-clipboard remains, because the current
working mode is pasting prompts into the Nano Banana web UI by hand. Common path
stays one-click Generate with the Shaper running behind the scenes.

**Fallback on Shaper failure: degrade, do not block.** (Decided in the absence
of an explicit call; flagged for review.) If the Shaper call fails or returns
unrepairable JSON, fall back to today's static `imagePurposes[]`/`slotRules[]`
with a visible notice, and record `planSource: 'fallback'` on the batch. A Shaper
outage degrades to current behavior rather than stopping the operator.

**Scene authorship: optional operator seed.** The Shaper always owns the slot
mix — how many scene-based vs. plain slots, and whether a scene is warranted at
all. Scene *concepts* work either way: when the operator supplies direction
through the existing `categoryPreference` or `batchDirection` fields, the Shaper
builds around it; when they do not, the Shaper proposes. Optional rather than
required, because the common case is an operator with no strong idea who wants a
usable batch, and forcing a scene concept reintroduces the briefing burden
`HANDOFF.md` exists to remove.

**Scene variety across batches: deferred, knowingly unsolved.** See Risks.

**Image count: Shaper proposes within platform bounds; explicit operator choice
wins.** (Same status — decided, flagged.) This is what makes the consumables
insight work: shampoo genuinely needs a different count and mix than a laptop.
If the operator has not touched the count control since the last platform
change, the Shaper may propose within the platform's min/max. If they have set
it deliberately, their number is fixed and the Shaper only assigns roles inside
it. Track with a `imageCountTouched` flag on `state`.

## Scope boundary

**In scope**

- New `/api/shape` route, ADC-backed, JSON text response.
- Shaper prompt assembly, output schema, validate-and-repair.
- Batch coherence enforced structurally: one `batchTone` authored once for the
  whole batch, per-slot `differentiator` fields authored against each other.
- Shaper sees the product images. It plans blind otherwise — it cannot know that
  packaging already carries the ingredient panel, or that only one camera angle
  was supplied.
- New inputs: season, promotion.
- Plan persisted in the batch record and the export package.
- Preview dialog: plan summary panel, Generate button.
- Tests for schema validation, repair, coherence invariants, and fallback.

**Out of scope**

Explicitly rejected by `HANDOFF.md` and unchanged here: no variants, no retries
of acceptable outputs, no image scoring, no refinement loops. Also out: the
clarify/escalate chain from Lighthouse, final text compositing, typography
specs, and new category presets. The five existing presets stay.

**Untouched code paths.** Product identity preservation, the accuracy block,
reference-image handling, Must Have precedence, IndexedDB schema, auth, and
`callNanoBananaAPI()`. The Shaper only fills what is currently Open or decided
by array index.

## Precedence

Unchanged from `HANDOFF.md`, with the Shaper inserted at one level:

```
Must Have  >  platform hard rule  >  operator Preferred  >  Shaper  >  model freedom
```

The Shaper never renegotiates a Must Have and never overrides a platform hard
rule. Its decisions are tagged `derivedFrom: 'open'` so an operator override
always wins. Platform hard rules (Amazon main-image white background, aspect
ratio, text-on-image permission) stay in `PLATFORM_TEMPLATES` and are passed to
the Shaper as constraints it must plan within.

## Deliberate design choices worth keeping

**Use the strongest available model for the Shaper.** Lighthouse runs its
arbiter on flash because it fires every 10 seconds. The Shaper fires once per
batch, upstream of the expensive part — an inverted cost profile. A better plan
saves more than a cheap plan costs.

**Platform facts are looked up, not recalled.** Image counts, aspect ratios,
whether text-on-image is allowed, required slots: these are policy data from
`PLATFORM_TEMPLATES`, fed to the Shaper as input. Asking the model to remember
them produces plausible numbers that drift between runs. The model is reserved
for judgment: which roles fit *this* product, and how slots differ.

**Encode axes, not category-to-ratio tables.** "Consumables get more lifestyle,
fewer spec shots" is real, but a category x platform matrix grows unmaintainably
and cannot generalize past the five presets. The underlying axes travel further:
how much the buyer must verify before purchase (spec-driven vs. sensory-driven),
repeat vs. one-off purchase, and whether product information lives on the
packaging or in listing text. Shampoo and a laptop sit at opposite ends of
"needs verification" — which is *why* one gets lifestyle and the other gets spec
detail. The Shaper receives the axes and reasons from them.

**Constrain differentiation, not composition.** If the Shaper dictates layout,
elements, and composition for all nine slots, it rebuilds the rigid template
`HANDOFF.md` explicitly rejects. It specifies what makes each slot distinct from
its siblings and leaves the actual composition open. Constrain the axes of
variation, not the pixels.

The Shaper is an art director, not a photographer. **Scene concept is its call;
framing is not.** "Family at the beach, late afternoon" is a scene concept — it
differentiates the slot and carries the seasonal read. "Low three-quarter angle,
product in the left third, shallow depth of field" is composition, and fixing
that across nine slots is exactly the rigid-template failure. Be concrete about
*what moment*; stay open about *how it is shot*.

**Never instruct creativity. Make restraint representable instead.** An
instruction like "be creative and varied" is a one-way pressure — the model
cannot read it as "sometimes be plain", so it puts lifestyle scenes on products
that sell better on white. The role vocabulary already holds both poles: `hero`,
`feature-detail`, `material-detail` and `package-contents` are plain;
`lifestyle`, `usage` and `benefit` are scene-based. Rather than asking for
imagination, require the Shaper to justify each slot against buyer verification
need via a per-slot `sceneRationale` field. A high-verification product resolves
to mostly plain slots and zero lifestyle, and that is the *correct* answer, not a
failure of creativity. It is only reachable if nothing in the prompt rewards
scenes.

## Build phases

Phases 1-4 are the functional core; the system works end to end after phase 4.
Phases 5-7 complete it. Each phase should leave the app runnable.

### Phase 1 — Backend route

Add `POST /api/shape` to `auth-service.js`, alongside the existing
`/api/generate`. Reuse the same `GoogleAuth` client and the
`x-goog-user-project` header pattern. Text/JSON response, not image. Errors go
through the existing `getGoogleApiError()` helper so failures surface with the
same shape the client already handles.

Verify with the server running and ADC configured before moving on. This phase is
independently testable and everything downstream depends on it.

### Phase 2 — Schema and coherence contract

Define the plan schema (see `SHAPER_CODE_GUIDE.md` for the full shape) and the
Shaper's system/task prompt. Three hard constraints in the prompt:

1. Roles restricted to a closed vocabulary the compiler understands. This is
   Lighthouse's "executor-supported actions only" rule and it is the single most
   valuable thing carried over. Without it the Shaper invents a role like
   "trust-badge collage" and the compiler silently drops it.
2. `batchTone` authored once for the whole batch, identical across slots.
3. Each slot's `differentiator` written with explicit reference to the other
   slots, so no two collide.

### Phase 3 — Client Shaper call

`shapeBatch()` in `app.js`: assemble input, call `/api/shape`, then
validate-and-repair the return before anything downstream touches it. Never
trust the JSON shape. Model the repair on `_validate_arbiter_output` and
`_repair_arbiter_add_op` in `arbiter.py`: coerce what is coercible, drop what is
invalid, fill gaps from the static template, and fall back wholesale only when
the plan cannot be salvaged.

Cache to `state.shaperPlan`; invalidate through the existing
`markInputsChanged()` (`app.js:1102`), which already runs on every input change.

### Phase 4 — Wire the compiler

Point `buildPromptRecord()` at the plan:

| Line | Today | After |
| --- | --- | --- |
| `app.js:533` | `template.imagePurposes[i]` | `plan.slots[i].role` |
| `app.js:534` | `template.slotRules[i]` | `plan.slots[i].direction`, platform hard rule retained |
| `app.js:547` | `template.tone` | `plan.batchTone` |
| `app.js:487-497` | hard-coded `copySlot` index map | plan-assigned copy placement |

`previewPrompts()` and `generatePrompts()` become the two call sites that must
ensure a plan exists first. Both already call `compilePromptRecords()`, so this
is the natural seam. `previewPrompts()` becomes `async`.

After this phase the system is functional. Stop and check real output on all
three platforms and a consumable-vs-durable product pair before continuing.

### Phase 5 — New inputs and persistence

Add season and promotion to `state`, the setup UI, and `buildInputSnapshot()`
(`app.js:904`). Persist the plan on the batch record and add it to
`exportCurrentBatch()` (`app.js:1107`), with `planSource` so a reviewer can tell
a shaped batch from a fallback one. Both locales in `i18n.js`.

### Phase 6 — Preview dialog

Plan summary panel (batch tone, slot roles, `planSource`), a Generate button, and
a Regenerate-plan control. Keep Copy prompt — it is the current production path.

`prompt.eyebrow` currently reads "No API call" / "不會呼叫 API". That stops being
true: Preview now makes a live Shaper call. Update both locales.

### Phase 7 — Tests

`npm test` runs `node --test`; `test/app.test.js` and `test/i18n.test.js` exist
as precedent. Cover:

- Valid plan compiles into prompt records correctly.
- Malformed returns: missing fields, wrong slot count, unknown role, non-array
  slots, empty response, invalid JSON. Each repairs or falls back, never throws
  into the UI.
- Coherence invariants: one shared `batchTone`; no two slots sharing a
  `differentiator`; slot count matches the resolved image count.
- Precedence: a Must Have constraint survives a conflicting Shaper decision.
- Fallback produces a usable batch matching today's static behavior.
- Both locales have every new key.

## Risks

**Preview stops being free and offline.** The largest behavioral change in this
work. Today Preview is a pure local string build; afterwards it requires working
ADC and costs a call. `validateBatchInputs()` must require auth for preview
(`requireAuth: true`, currently only set by Generate). Worth confirming this is
acceptable — it is the one place where the plan changes an existing guarantee
rather than adding to it.

**A bad plan is expensive.** Unlike Lighthouse's self-correcting loop, a flawed
plan burns N generations with no correction path. This is the reason the plan is
inspectable before Generate, and the reason validate-and-repair is not optional.

**Scene repetition across batches — accepted for MVP, not solved.** Within a
single batch the Shaper diversifies acceptably, because it sees every slot at
once and authors each `differentiator` against the others. Across *separate*
batches it has no memory, so it returns to the same attractor: ask for a summer
beauty scene repeatedly and you get beach, picnic and poolside, at almost any
temperature. Expect the third batch in a category to look like the first.

The known mitigation is history injection — pass scene concepts from recent
batches in the same category as an explicit do-not-repeat list. It works because
it converts an open creative ask into constraint satisfaction, which models
handle far better than an instruction to be original. The data already exists:
every batch is in IndexedDB via `loadBatches()` (`app.js:216`), so no new
storage is required. Anti-cliché wordlists were considered and rejected as
brittle and quick to go stale; history is self-maintaining.

Deliberately deferred to keep MVP surface small and because the consequences of
feeding history back into planning were not yet settled. Do not treat this as an
oversight, and do not build it without revisiting the decision. Interim
mitigation: an operator who notices repetition seeds a scene direction, which the
Shaper will build around.

**Over-specification.** If Shaper output creeps toward dictating composition,
the result is a more elaborate rigid template — the opposite of the goal. Review
generated plans for whether slots read as *different ideas* or as *the same idea
with different labels*.

**Plan/prompt drift.** If the plan is ever re-shaped between preview and
generate, the operator approves one thing and generates another. The single
cached plan prevents this; keep it that way.

## Done when

An operator provides core product material once and receives a coordinated batch
where slot roles and count reflect the actual product and platform rather than an
array index; every image shares one design tone without repeating a design; Must
Have facts survive; no unsupported claims appear; the plan behind the batch is
inspectable before generation and present in the export; and a Shaper failure
degrades to today's behavior instead of blocking work.

Per `HANDOFF.md`: commercial usefulness at practical cost, not visual perfection.
