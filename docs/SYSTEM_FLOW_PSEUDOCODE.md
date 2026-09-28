# Bubstal Picasso: System Flow Pseudocode

This document describes the flow implemented by Bubstal Picasso. The system
turns one product brief and a set of product/reference images into a coordinated
batch of platform-specific eCommerce images. It does not use one fixed visual
template for every product. It first decides what each image has to communicate,
then leaves the exact scene, camera, lighting, and composition open where the
evidence and platform rules allow it.

The terms used below have the following meaning:

- **Product category** is the selected category such as beauty, electronics,
  apparel, food, or home. It supplies category-specific preservation and safety
  guardrails.
- **Product nature** is the product's observable and inferred decision profile:
  function, purchase type, information need, verification need, supplied angles,
  and likely buyer motivation. It is derived from the product photos, facts,
  category, and operator direction.
- **Target customer** is an operator-supplied audience or use-case description
  in the batch direction field. If it is absent, the system may infer a buyer's
  decision need from product evidence, but it must not invent demographic facts.
- **Platform** is the selected marketplace. Its image sequence, main-image
  restrictions, text policy, locale, aspect ratio, and copy limits determine the
  boundaries for the generated batch.

## 1. Whole-system flow

```text
PROCEDURE CREATE_PRODUCT_IMAGE_BATCH(operatorInput):

    INITIALISE application state, IndexedDB, UI, and server-auth status

    INPUTS := COLLECT_OPERATOR_INPUT(operatorInput)
    IF NOT VALIDATE_REQUIRED_INPUTS(INPUTS):
        SHOW missing-input errors
        STOP

    CONTEXT := RESOLVE_CONTEXT(INPUTS)
        # platform, category, market, locale, image-count bounds, and policies

    ASSETS := INGEST_AND_SELECT_ASSETS(
        productImages = INPUTS.productImages,
        referenceImages = INPUTS.referenceImages,
        maxApplicationImages = 14
    )
        # Product identity images have priority. References are retained only
        # while the selected backend can accept them.

    CONSTRAINTS := NORMALISE_CONSTRAINTS(
        platform = CONTEXT.platformId,
        operatorConstraints = INPUTS.constraints,
        categoryFacts = INPUTS.categoryFacts,
        categoryPreference = INPUTS.categoryPreference,
        targetCustomerBrief = INPUTS.batchDirection,
        approvedCopyItems = INPUTS.copyItems,
        promotion = INPUTS.promotion,
        season = INPUTS.season
    )
        # A target-customer statement is carried as operator direction. It is
        # not silently replaced by a demographic persona.

    PLAN := BUILD_AND_VALIDATE_SHARED_PLAN(
        context = CONTEXT,
        product = INPUTS.product,
        assets = ASSETS,
        constraints = CONSTRAINTS
    )
        # One Shaper call plans the whole ordered batch. The plan contains
        # productRead, buyerMotivation, batchTone, and one slot for each image.

    PROMPT_RECORDS := COMPILE_ONE_PROMPT_PER_SLOT(
        plan = PLAN,
        context = CONTEXT,
        product = INPUTS.product,
        assets = ASSETS,
        constraints = CONSTRAINTS
    )
        # Every prompt is complete, inspectable, and assigned a prompt ID.

    BATCH := CREATE_BATCH_RECORD(
        inputs = SNAPSHOT_INPUTS(INPUTS),
        context = CONTEXT,
        plan = PLAN,
        promptRecords = PROMPT_RECORDS,
        status = "rendering"
    )
    SAVE_TO_INDEXED_DB(BATCH)                 # Save before any paid render call.

    RESULTS := GENERATE_SLOTS_WITH_LIMITED_CONCURRENCY(
        promptRecords = PROMPT_RECORDS,
        assets = ASSETS,
        concurrency = 2,
        onEachSlot = FUNCTION (slotResult):
            APPEND_OR_REPLACE_OUTPUT(BATCH, slotResult)
            UPDATE_BATCH_STATUS_AND_TIMESTAMP(BATCH)
            SAVE_TO_INDEXED_DB(BATCH)
            UPDATE_RESULT_UI(slotResult)
    )

    BATCH.outputRecords := RESULTS
    BATCH.results := BUILD_LEGACY_COMPATIBLE_RESULTS(BATCH)
    BATCH.status :=
        IF ANY_RESULT_FAILED(RESULTS) THEN "completed-with-errors"
        ELSE "completed"
    SAVE_TO_INDEXED_DB(BATCH)
    RENDER_RESULTS_AND_ENABLE_EXPORT(BATCH)

    RETURN BATCH
```

The decision order is applied twice: while planning the batch and while
compiling each image prompt.

```text
FOR EACH visual decision:
    1. Preserve product identity, supplied facts, and Must Have constraints.
    2. Satisfy the selected platform's hard slot and compliance rules.
    3. Follow operator Preferred direction, category preference, and target
       customer/use-case direction when they do not conflict with steps 1-2.
    4. Use product nature and buyer motivation to choose the most useful
       communication role for this slot.
    5. Use market context as a soft, testable prior.
    6. Let the image model decide remaining open details.

    IF a proposed choice violates product truth or a hard platform rule:
        reject or repair the choice before image generation
```

The result is one coherent batch tone with different slot-level treatments.
The system does not force the same background, layout, color treatment,
lifestyle level, or text strategy onto every image.

## 2. Component flows

### 2.1 Application state, input, and validation

```text
PROCEDURE COLLECT_OPERATOR_INPUT(form):
    state.platform            := form.marketplace
    state.imageCount          := form.imageCount
    state.category            := form.productCategory
    state.productName         := form.productName
    state.productVariant      := form.variant
    state.categoryFacts       := form.factsToPreserve
    state.categoryPreference  := form.creativePreference
    state.batchDirection      := form.batchDirection
    state.season              := form.season
    state.promotion           := form.promotion
    state.productImages       := uploaded product identity images
    state.referenceImages     := uploaded references with roles:
                                  style, layout, color, or general inspiration
    state.constraints          := enabled constraints with level:
                                  locked (Must Have) or preferred (Preferred)
    state.locale              := default locale for state.platform
    state.market               := market mapped from state.platform
    RETURN state

PROCEDURE VALIDATE_REQUIRED_INPUTS(state):
    IF state.productName is blank: RETURN FALSE
    IF COUNT(state.productImages) = 0: RETURN FALSE
    IF generation is requested AND state.authReady is FALSE: RETURN FALSE
    RETURN TRUE

PROCEDURE MARK_INPUTS_CHANGED():
    state.shaperPlan := null
    state.currentBatch := current draft with stale plan removed
    refresh constraint counts, readiness badge, and export controls
```

The plan is cached until an input that can change a prompt is edited. Preview
and Generate therefore use the same approved plan rather than independently
replanning the batch.

### 2.2 Platform, category, market, and locale policy

```text
PROCEDURE RESOLVE_CONTEXT(state):
    platformTemplate := PLATFORM_TEMPLATES[state.platform]
    categoryGuardrail := CATEGORY_PRESETS[state.category]
    marketId := state.market OR GET_MARKET_FROM_PLATFORM(state.platform)
    marketProfile := MARKET_PROFILES[marketId] OR MARKET_PROFILES.japan
    copyPolicy := GET_PLATFORM_COPY_POLICY(state.platform)
    outputLocale := PLATFORM_LOCALES[state.platform] OR "en-US"

    imageCount := CLAMP(
        requested = state.imageCount,
        minimum = platformTemplate.minImageCount,
        maximum = platformTemplate.maxImageCount
    )

    RETURN {
        platformId: state.platform,
        platformTemplate,
        categoryGuardrail,
        marketProfile,
        copyPolicy,
        outputLocale,
        aspectRatio: platformTemplate.aspectRatio,
        imageCount
    }
```

The platform templates define the ordered purposes and hard rules. For example,
Amazon.co.jp requires a text-free pure-white main image, Shopee TW permits a
more image-led later sequence with concise Traditional Chinese copy, and Rakuten
allows limited copy with a restrained first-image text area. Category guardrails
change what must be preserved: packaging and shade for beauty, controls and
ports for electronics, fabric and silhouette for apparel, label and quantity
for food, and form, finish, and scale for home products.

Market profiles are soft priors. They can influence a slot when supported by
the product, operator direction, or platform, but a country label alone cannot
force a visual treatment.

### 2.3 Asset ingestion and reference handling

```text
PROCEDURE INGEST_AND_SELECT_ASSETS(productImages, referenceImages,
                                   maxApplicationImages):
    productAssets := READ_FILES_AS_DATA_URLS(productImages)
    referenceAssets := READ_FILES_AS_DATA_URLS(referenceImages)

    productAssets := FIRST(productAssets, maxApplicationImages)
    remaining := maxApplicationImages - COUNT(productAssets)
    referenceAssets := FIRST(referenceAssets, MAX(0, remaining))

    FOR EACH reference IN referenceAssets:
        reference.instruction :=
            IF "style" IN reference.roles:
                "carry over tone and mood, not the exact design"
            IF "layout" IN reference.roles:
                "use spatial principles without copying the layout"
            IF "color" IN reference.roles:
                "use palette relationships as guidance"
            OTHERWISE:
                "use only as broad inspiration"

    RETURN { productAssets, referenceAssets }
```

Product images establish identity and visible facts. References influence style,
layout, or color only according to their assigned role; they are never treated
as proof that another object's props or accessories belong to the product.
The application accepts up to 14 combined inputs for planning. The Qwen route
further selects at most three images for its model request, preserving product
images before references.

### 2.4 Product nature and target-customer understanding

```text
PROCEDURE BUILD_PRODUCT_AND_BUYER_CONTEXT(product, category, assets,
                                           categoryFacts, batchDirection):
    observed := INSPECT_VISIBLE_PRODUCT_EVIDENCE(assets.productAssets)
        # geometry, materials, labels, packaging, controls, color, quantity,
        # included components visible in the product evidence

    targetCustomerBrief := EXTRACT_OPERATOR_AUDIENCE_OR_USE_CASE(batchDirection)
    IF targetCustomerBrief is blank:
        targetCustomerBrief := "unknown"

    productNature := INFER_FROM(
        category,
        product.name,
        product.variant,
        observed,
        categoryFacts,
        targetCustomerBrief
    )
        # function, repeat versus one-off purchase, information location,
        # verification need, and supplied camera angles

    buyerMotivation := CHOOSE_ONE_PRIMARY_AND_UP_TO_TWO_SECONDARY(
        B1_Functional, B2_Evidence, B3_Lifestyle, B4_Aesthetic,
        B5_Value, B6_Convenience, B7_Expert
    )
    buyerMotivation.confidence := ESTIMATE_CONFIDENCE_FROM_EVIDENCE()
    buyerMotivation.reason := EXPLAIN_WITH_SUPPLIED_FACTS()

    RETURN {
        observed,
        productNature,
        targetCustomerBrief,
        buyerMotivation
    }

RULE:
    Never infer age, gender, income, ethnicity, or other demographic facts
    unless the operator explicitly supplied them. A target customer can guide
    the use case and information need without becoming a stereotype.
```

This context is recorded in `productRead` and `buyerMotivation` in the shared
plan. Buyer motivation weights image roles; it does not mechanically dictate a
background or color. For example, an evidence-oriented electronics product may
need feature, material, and scale views, while a lifestyle-oriented apparel
product may need usage, lifestyle, and alternate-view images.

### 2.5 Shared Shaper planning and dynamic batch composition

```text
PROCEDURE BUILD_AND_VALIDATE_SHARED_PLAN(context, product, assets, constraints):
    buyerContext := BUILD_PRODUCT_AND_BUYER_CONTEXT(
        product,
        context.categoryGuardrail,
        assets,
        constraints.categoryFacts,
        constraints.targetCustomerBrief
    )

    shaperRequest := BUILD_SHAPER_PAYLOAD(
        platformRules = context.platformTemplate,
        categoryGuardrail = context.categoryGuardrail,
        marketHypothesis = context.marketProfile,
        buyerContext = buyerContext,
        constraints = constraints,
        references = assets.referenceAssets,
        locale = context.outputLocale
    )

    IF authentication is unavailable OR Shaper request fails:
        RETURN BUILD_FALLBACK_PLAN(context, constraints)

    FOR attempt FROM 1 TO 2:
        rawPlan := CALL /api/shape(shaperRequest)
        validation := VALIDATE_RAW_SHAPER_PLAN(rawPlan, context)
        IF validation is valid AND response finish reason is STOP:
            plan := NORMALISE_AND_VALIDATE_SHAPER_PLAN(rawPlan, context)
            RETURN plan

    RETURN BUILD_FALLBACK_PLAN(context, constraints)

PROCEDURE PLAN_SLOTS(buyerContext, context, constraints):
    count := operator-fixed image count
             OR choose a count within platform min/max using product needs
    purposes := context.platformTemplate.imagePurposes
    roles := WEIGHT_ROLES_BY(buyerContext.buyerMotivation,
                             buyerContext.productNature,
                             purposes)

    FOR index FROM 1 TO count:
        role := SELECT_USEFUL_UNCOVERED_ROLE(roles, previousSlots)
        visualElements[index] := SELECT_PER_SLOT_VISUAL_ELEMENTS(
            role,
            productCategory = context.categoryGuardrail,
            productNature = buyerContext.productNature,
            targetCustomer = buyerContext.targetCustomerBrief,
            platform = context.platformTemplate,
            market = context.marketProfile,
            constraints = constraints,
            previousSlots = previousSlots
        )
        slots[index] := {
            index,
            role,
            direction: communication job for this role,
            differentiator: explicit difference from every sibling slot,
            sceneRationale: why plain or contextual treatment is appropriate,
            visualElements,
            copyPlacement and copyItems,
            outputLocale: context.outputLocale,
            derivedFrom: platform-rule | operator | open
        }

    RETURN { productRead, batchTone, resolvedImageCount: count, slots }
```

`SELECT_PER_SLOT_VISUAL_ELEMENTS` dynamically chooses the following independent
dimensions for every slot:

```text
visualElements := {
    backgroundType: pure-white | neutral-solid | gradient |
                    contextual-scene | lifestyle-environment,
    productTreatment: centered-isolated | angled-with-shadow |
                      in-context | in-use,
    layoutComposition: product-dominant | balanced | environmental,
    colorPalette: product-accurate | warm-enhanced | cool-enhanced | vibrant-pop,
    lifestyleLevel: none | subtle-props | full-scene | human-presence,
    textStrategy: text-free | reserve-overlay-space | model-rendered-headline
}
```

The planner also prevents sibling duplication. It can combine product photos in
different ways across slots: a hero may use a centered identity view, a feature
slot may use a close crop or angled view, a scale slot may place the product in a
believable environment, and a usage slot may use a human or lifestyle context
when the evidence and target use case support it. Package contents are selected
only when included items are confirmed.

### 2.6 Copy, localization, and platform-specific image treatment

```text
PROCEDURE RESOLVE_SLOT_COPY(slot, constraints, context):
    policy := context.copyPolicy

    IF slot.index = 1 AND policy.firstSlotTextFree:
        approvedModelCopy := []
    ELSE:
        approvedModelCopy := constraints.approvedCopyItems
        approvedModelCopy := approvedModelCopy + COPY_ITEMS_APPROVED_BY_OPERATOR(constraints)
        IF approvedModelCopy is empty AND policy.allowShaperAuthoredCopy:
            approvedModelCopy := SHAPER_MAY_AUTHOR_CONCISE_FACTUAL_COPY(
                maxItems = policy.maxItemsPerSlot,
                maxCharacters = policy.maxCharactersPerItem,
                locale = context.outputLocale
            )

    overlayCopy := COPY_THAT_MUST_BE_ADDED_AFTER_RENDERING(
        prices, specifications, safety, legal text, exact claims,
        trust markers, and other accuracy-critical items
    )

    IF policy.mode = "main-image-restricted":
        keep primary image text-free; allow at most one factual secondary label
    IF policy.mode = "image-led":
        allow concise factual selling-point or bundle labels on later images
    IF policy.mode = "limited":
        allow concise labels while keeping first-image text area restrained

    RETURN { approvedModelCopy, overlayCopy }

RULE:
    Render only exact approved strings. Never invent price, rating, warning,
    disclaimer, certification, performance claim, or unsupported promotion.
    Use the platform output locale (ja-JP for Amazon/Rakuten, zh-TW for Shopee)
    for visible copy. Visible overlay text is reserved in the image and added
    later by production tooling.
```

### 2.7 Per-slot prompt compiler

```text
PROCEDURE COMPILE_ONE_PROMPT_PER_SLOT(plan, context, product, assets, constraints):
    records := []

    FOR EACH slot IN plan.slots IN slot.index order:
        copyPlan := RESOLVE_SLOT_COPY(slot, constraints, context)
        siblingDifferences := ALL_OTHER_SLOT_ROLES_AND_DIFFERENTIATORS(plan, slot)

        prompt := JOIN_SECTIONS(
            product identity and attached product-photo instructions,
            slot number, purpose, direction, and differentiator,
            platform rule and shared batch tone,
            language and copy contract,
            slot.visualElements instruction,
            category guardrail and additional facts,
            Must Have constraints,
            Preferred direction including category preference and target customer,
            role-aware visual-reference relationships,
            sibling duplication exclusions,
            exact model-rendered copy or reserved overlay area,
            creative freedom for unconstrained details,
            accuracy boundary,
            exactly-one-image output contract
        )

        records.APPEND({
            id: NEW_ID("prompt"),
            index: slot.index,
            platform: context.platformId,
            category: product.category,
            outputLocale: slot.outputLocale,
            planSource: plan.planSource,
            shaperPlanId: plan.id,
            aspectRatio: context.aspectRatio,
            constraints,
            productAssets: IDENTIFIERS(assets.productAssets),
            referenceRelationships: DESCRIBE_REFERENCES(assets.referenceAssets),
            copyPlan,
            visualElements: slot.visualElements,
            prompt
        })

    RETURN records
```

The saved prompt record is the exact source of truth for its image. A batch
prompt can be displayed for review, but rendering still uses one prompt record
per slot so an output can always be traced to the slot that requested it.

### 2.8 Browser generation coordinator and provenance

```text
PROCEDURE GENERATE_SLOTS_WITH_LIMITED_CONCURRENCY(records, assets,
                                                   concurrency, onEachSlot):
    queue := records
    results := array sized to COUNT(records)
    workers := MIN(MAX(1, concurrency), COUNT(records))

    RUN workers in parallel:
        WHILE queue is not empty:
            record := REMOVE_NEXT(queue)
            EMIT slot-start(record.index)
            startedAt := NOW()

            TRY:
                responseImages := CALL_IMAGE_BACKEND(record, assets)
                IF responseImages has no image: RAISE error
                result := {
                    promptId: record.id,
                    index: record.index,
                    purpose: record.purpose,
                    status: "success",
                    model, aspectRatio, imageSize,
                    startedAt, completedAt: NOW(),
                    imageUrl: FIRST(responseImages).imageUrl,
                    apiMetadata
                }
            CATCH error:
                result := {
                    promptId: record.id,
                    index: record.index,
                    purpose: record.purpose,
                    status: "failed",
                    model, aspectRatio, imageSize,
                    startedAt, completedAt: NOW(),
                    error: error.message
                }

            results[record.index - 1] := result
            EMIT slot-complete OR slot-error(result)
            onEachSlot(result)

    WAIT for all workers
    RETURN results ordered by slot index
```

Each completed or failed slot is checkpointed immediately. One failed request
does not erase successful images or their prompt records.

### 2.9 Backend adapter and image generation service

```text
PROCEDURE CALL_IMAGE_BACKEND(promptRecord, assets):
    request := BUILD_VERTEX_STYLE_GENERATE_CONTENT_REQUEST(
        text = promptRecord.prompt,
        productImages = assets.productAssets,
        referenceImages = assets.referenceAssets,
        aspectRatio = promptRecord.aspectRatio,
        imageSize = "1K"
    )
    response := POST /api/generate(request)
    RETURN PARSE_IMAGE_PARTS_AND_METADATA(response)

SERVER PROCEDURE POST /api/generate(request):
    IF configured backend = "qwen":
        qwenRequest := TRANSFORM_TO_QWEN_FORMAT(request)
        qwenResponse := POST qwenService /generate(qwenRequest)
        RETURN TRANSFORM_QWEN_RESPONSE_TO_VERTEX_SHAPE(qwenResponse)
    ELSE:
        client := AUTHENTICATE_WITH_GOOGLE_ADC()
        RETURN FORWARD request TO configured Gemini image model

QWEN SERVICE PROCEDURE /generate(qwenRequest):
    REQUIRE model is loaded and at least one product image exists
    DECODE base64 product and reference images
    SELECT output width and height from aspect ratio
    ACQUIRE single-GPU generation lock
    generated := QWEN_IMAGE_EDIT_PLUS(
        images, prompt, negativePrompt, width, height,
        steps, guidanceScale, seed
    )
    RELEASE generation lock
    RETURN PNG base64 image and model metadata
```

The browser is backend-neutral. The same compiled prompt and slot provenance can
be sent to Gemini or to the local Qwen service. Qwen serialises GPU calls with a
lock even though the browser can coordinate multiple slot tasks.

### 2.10 Preview, persistence, history, and export

```text
PROCEDURE PREVIEW_PROMPTS():
    REQUIRE VALIDATE_REQUIRED_INPUTS(state)
    begin active planning task
    plan := BUILD_AND_VALIDATE_SHARED_PLAN(...)
    records := COMPILE_ONE_PROMPT_PER_SLOT(...)
    state.shaperPlan := plan
    DISPLAY productRead, buyerMotivation, batchTone,
            slot purposes, visualElements, copy treatment, and exact prompts
    end active planning task

PROCEDURE SAVE_TO_INDEXED_DB(batch):
    upsert complete versioned batch record
    include inputs, plan, promptRecords, outputRecords, results, and timestamps

PROCEDURE LOAD_HISTORY():
    read saved batches
    show platform, category, product, status, and output count

PROCEDURE EXPORT_CURRENT_BATCH(batch):
    export JSON containing inputs, context, plan, prompt records,
    copy plans, output records, generated image data, statuses, and render settings
    exclude uploaded source/reference binaries from the JSON export
```

The preview is a review checkpoint: it makes the platform decision, product
understanding, target-customer direction, buyer motivation, slot roles, dynamic
visual elements, and copy policy visible before generation begins.

## 3. What the flow demonstrates

For any generated batch, the saved metadata can be inspected to answer:

1. **Was product category considered?** Check the category guardrail and the
   category-specific facts in each prompt record.
2. **Was product nature considered?** Check `productRead`, `buyerMotivation`,
   verification need, purchase type, and the role distribution across slots.
3. **Was the target customer considered?** Check the operator's target-customer
   or use-case direction in the batch direction and the resulting scene rationale
   and usage/lifestyle choices. If no audience was supplied, the record should
   show uncertainty rather than an invented demographic profile.
4. **Was platform treatment different?** Check platform slot rules, locale, copy
   policy, aspect ratio, and the selected backend request.
5. **Were layout and photo combinations dynamic?** Compare each slot's
   `visualElements`, role, differentiator, reference relationships, and sibling
   exclusions. These fields show why one slot is isolated, another is a detail,
   and another is contextual or in-use.
6. **Can every output be audited?** Follow `outputRecord.promptId` to its exact
   prompt record and then to the shared plan and saved input snapshot.

This makes the system a traceable decision pipeline: product and buyer evidence
define what must be communicated, the platform defines what is allowed, and the
planner dynamically assigns complementary visual jobs before the image backend
renders each slot.
