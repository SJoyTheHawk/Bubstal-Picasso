# Picasso Prompt Generation Refactor - Implementation Guide

## Overview

This guide provides step-by-step instructions for refactoring the Picasso prompt generation system to achieve more precise, varied image outputs by implementing the Market Cultural Context domain from the academic framework.

## Problem Statement

**Current Issue:**
- Repetitive images across batch (e.g., "日式生活品味" slogan appearing in every image)
- Generic prompt instructions repeated across all slots
- Missing granular control over specific visual elements
- No market cultural context layer

**Root Cause:**
The prompt generation creates similar instructions for each slot, with only minor role-based differentiation. The system lacks the Market Cultural Context domain (Domain 4) that would provide market-specific visual language preferences.

## Cross-Cutting Design: Platform Locale and Language Contract (NEW)

Platform selection determines the default output locale. The locale controls visible user-facing copy, while the market profile controls visual and cultural preferences. Keep these as separate values: a platform can serve a language shared by several markets, and an operator may need to override the default locale for a cross-market test.

There are three language decisions in every generated asset:

1. **Visible copy language** — the language of short descriptions, slogans, badges, and labels shown in the image.
2. **Visible copy content and location** — exact text values and where each item belongs. These are structured variables, not prose buried in a prompt.
3. **Image instruction language** — the language used for scene, composition, product, and rendering instructions sent to the image model.

Do not conflate these decisions. A Japanese slogan can be rendered while the visual instruction remains in English. A translated visual instruction does not authorize the model to translate a slogan or invent additional copy.

### Locale and copy contract

Add a platform-to-locale map and an explicit copy list. The locale must be overrideable for benchmarking and localization review.

```javascript
const PLATFORM_LOCALES = {
    'amazon-jp': { locale: 'ja-JP', languageName: 'Japanese', direction: 'ltr' },
    'rakuten': { locale: 'ja-JP', languageName: 'Japanese', direction: 'ltr' },
    'shopee-tw': { locale: 'zh-TW', languageName: 'Traditional Chinese', direction: 'ltr' },
    'qoo10-jp': { locale: 'ja-JP', languageName: 'Japanese', direction: 'ltr' }
};

function getLocaleFromPlatform(platformId) {
    return PLATFORM_LOCALES[platformId]?.locale || 'en-US';
}

function localizeCopyItems(items, locale) {
    return (items || []).map(item => ({
        ...item,
        locale,
        text: item.textByLocale?.[locale] || item.text || ''
    })).filter(item => item.text);
}

// Copy is data. Do not ask the image model to translate or invent these values.
const copyItems = [
    {
        id: 'slogan',
        kind: 'slogan', // slogan|short-description|badge|label
        text: '日式生活品味',
        textByLocale: { 'ja-JP': '日式生活品味', 'zh-TW': '日式生活品味' },
        locale: 'ja-JP',
        location: 'top-right', // top-left|top-center|top-right|bottom-left|bottom-center|bottom-right|custom
        render: 'overlay' // overlay|model-rendered
    }
];
```

When copy is rendered after image generation, reserve the named location and use the application’s locale-aware font and line-breaking rules. When copy is rendered by the model, pass one exact string per item, require the declared locale, and prohibit any extra text. Store `sourceLocale`, `targetLocale`, and the final approved string so a reviewer can distinguish translation errors from image-generation errors. Keep brand names, regulated claims, ingredients, units, and legal text in their approved source form unless localization explicitly supplies a replacement.

### Should the whole image prompt be translated?

Use an English canonical visual prompt by default for both Nano Banana 2 and Qwen Image 2.1. Keep only the visible copy in the target locale. This gives both models the same semantic instruction, makes model-to-model comparisons meaningful, and avoids changing scene meaning, product constraints, and slot differentiation at the same time as language.

Run a translated visual-prompt variant only as a benchmark arm when the language carries information that matters to the scene, such as an idiom, culturally specific object, or local usage convention. Preserve the same structured facts, references, seed policy, and copy strings in both arms. Select the translated arm per locale and model only when it improves the measured score without reducing product identity or copy fidelity.

Current model guidance supports this conservative default:

- **Nano Banana 2 (`gemini-3.1-flash-image`)** documents improved internationalized text rendering and lists best-performance locales including `en-US`, `de-DE`, `es-MX`, `fr-FR`, `hi-IN`, `id-ID`, `it-IT`, `ja-JP`, `ko-KR`, `pt-BR`, `ru-RU`, `ua-UA`, and `vi-VN`, plus `zh-CN`. `zh-TW` and `zh-HK` are not listed, so Traditional Chinese must be treated as an unverified case and measured separately. The same documentation recommends generating text first and then asking for an image when text accuracy matters. See the [Nano Banana 2 model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image) and [image-generation guide](https://ai.google.dev/gemini-api/docs/image-generation).
- **Qwen Image 2.1** documents improved typography and uses a Qwen3-VL 8B text encoder, but its official model card does not publish a complete language-support or per-language text-rendering table. Its official prompt-rewrite instructions keep Chinese descriptive prompts in Chinese and use English descriptive prompts for other languages, while requiring rendered text to follow the explicitly requested language. Treat Japanese and Traditional Chinese support as hypotheses until the benchmark confirms them. See the [Qwen Image 2.1 model card](https://github.com/QwenLM/Qwen-Image-2.1) and [official prompt-rewrite rules](https://github.com/QwenLM/Qwen-Image-2.1/blob/main/prompt_rewrite/prompts/system_prompt_edit.txt).

Do not claim that a model supports a locale because it can understand a few words in that language. Record separate results for visual instruction following, OCR exact-match, text placement, and cultural appropriateness. Long slogans, multiple text blocks, uncommon characters, and mixed scripts are higher-risk cases. Use post-generation overlay for legally or commercially exact copy whenever the model arm fails the copy gate.

There is no justified universal language penalty to apply in advance. A benchmark can drop for a particular locale when tokenization, translation ambiguity, script rendering, or text density changes the task. It can also improve when the localized instruction names a culturally specific scene more clearly. Treat the English prompt as the comparison baseline and select the prompt language from measured per-locale results.

### Benchmark matrix and acceptance gates

Prepare the same cases for each platform locale, model, and prompt-language arm:

| Dimension | Required arms |
|---|---|
| Model | Nano Banana 2; Qwen Image 2.1 |
| Locale | `ja-JP`; `zh-TW`; add every production locale before launch |
| Visual prompt | Canonical English; target-language translation where available |
| Copy path | Overlay; model-rendered exact text |
| Content | Same product references, facts, slot role, aspect ratio, and approved copy |
| Repeats | At least 5 fixed seeds per cell, or every seed supported by the provider |

Score each cell separately. At minimum record: product identity, slot/composition adherence, visual diversity across siblings, OCR exact-match for every copy item, copy location, unintended text rate, locale and cultural review, latency, and cost. Report the mean with a confidence interval and the worst locale result; do not let an English result hide a Japanese or Traditional Chinese regression.

Suggested release gates are: 100% exact-match for overlay copy; a model-rendered copy pass rate agreed with product for each locale; zero invented claims or extra promotional text; no material product-identity regression versus the English baseline; and no locale score below the minimum defined by the product owner. If a locale fails only the model-rendered-copy gate, keep the localized visual prompt if its visual score passes and switch that locale to overlay rendering.

The implementation belongs in Phase 2 alongside the visual element fields. Phase 1 supplies the platform-to-locale default and `state.locale`; Phase 2 carries locale, copy, and instruction-language fields through the Shaper schema; Phase 3 validates them; Phase 4 injects them into each slot prompt; and the testing plan evaluates both English and localized instruction arms.

## Solution Architecture

### Four-Layer Enhancement

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 0: Platform Locale and Copy Contract (NEW)            │
│ - Output locale resolved from platform                       │
│ - Exact descriptions and slogans                             │
│ - Copy location and render mode                              │
│ - English or localized visual-prompt benchmark arm           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Market Cultural Context (NEW)                      │
│ - Contextual imagery preference                              │
│ - Information density tolerance                              │
│ - Trust evidence requirement                                 │
│ - Lifestyle identification preference                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Visual Element Specification (ENHANCED)            │
│ - Background type per slot                                   │
│ - Product treatment per slot                                 │
│ - Layout composition per slot                                │
│ - Color palette approach per slot                            │
│ - Lifestyle element level per slot                           │
│ - Text strategy per slot                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Precise Slot Prompts (REFACTORED)                 │
│ - Specific visual instructions based on elements above       │
│ - Reduced repeated generic constraints                       │
│ - Shorter, more targeted prompts per slot                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Add Market Cultural Context

### Step 1.1: Define Market Profiles

**Location:** `app.js` after `CATEGORY_PRESETS` (around line 167)

**Add this constant:**

```javascript
// Market Cultural Context profiles based on Domain 4 of the academic framework.
// These are engineering priors for stimulus generation, not validated findings.
const MARKET_PROFILES = {
    'japan': {
        name: 'Japan Market',
        contextualImageryPreference: 'high', // Prefers lifestyle/scene context
        informationDensityTolerance: 'low', // Clean, minimal text
        trustEvidenceRequirement: 'medium', // Brand trust + some specs
        socialProofSensitivity: 'low', // Less reliance on reviews
        promotionSensitivity: 'low', // Subtle pricing, avoid hard-sell
        lifestyleIdentification: 'high', // Strong preference for aspirational lifestyle
        visualTendencies: {
            backgroundPreference: 'contextual scene or gradient',
            colorPalette: 'natural, muted, warm tones',
            textIntegration: 'minimal or reserved',
            productPresentation: 'in-context when appropriate'
        }
    },
    'taiwan': {
        name: 'Taiwan Market',
        contextualImageryPreference: 'medium', // Mix of product and lifestyle
        informationDensityTolerance: 'high', // Accepts detailed specs/text
        trustEvidenceRequirement: 'high', // Wants proof points
        socialProofSensitivity: 'high', // Reviews/ratings important
        promotionSensitivity: 'high', // Price/discount prominent
        lifestyleIdentification: 'medium', // Balanced approach
        visualTendencies: {
            backgroundPreference: 'vibrant or promotional',
            colorPalette: 'energetic, saturated colors',
            textIntegration: 'overlay-friendly',
            productPresentation: 'clear product visibility'
        }
    },
    'hongkong': {
        name: 'Hong Kong Market',
        contextualImageryPreference: 'medium', // Practical + some lifestyle
        informationDensityTolerance: 'medium', // Balanced information
        trustEvidenceRequirement: 'high', // Quality evidence important
        socialProofSensitivity: 'medium', // Some social proof
        promotionSensitivity: 'medium', // Value-conscious but not aggressive
        lifestyleIdentification: 'medium', // Pragmatic lifestyle
        visualTendencies: {
            backgroundPreference: 'clean or subtle context',
            colorPalette: 'modern, professional tones',
            textIntegration: 'balanced',
            productPresentation: 'clear + quality signals'
        }
    },
    'china': {
        name: 'Mainland China Market',
        contextualImageryPreference: 'medium-high', // Lifestyle emphasis
        informationDensityTolerance: 'very-high', // Dense information accepted
        trustEvidenceRequirement: 'very-high', // Heavy proof/certification need
        socialProofSensitivity: 'very-high', // Social proof critical
        promotionSensitivity: 'very-high', // Strong promotion emphasis
        lifestyleIdentification: 'high', // Status/aspiration important
        visualTendencies: {
            backgroundPreference: 'rich, detailed scenes',
            colorPalette: 'bold, premium, gold accents',
            textIntegration: 'heavy overlay acceptable',
            productPresentation: 'aspirational + detailed'
        }
    }
};

// Map platform IDs to market IDs
function getMarketFromPlatform(platformId) {
    const marketMap = {
        'amazon-jp': 'japan',
        'rakuten': 'japan',
        'shopee-tw': 'taiwan',
        'qoo10-jp': 'japan',
        // Add more mappings as platforms are added
    };
    return marketMap[platformId] || 'japan'; // Default to japan
}
```

### Step 1.2: Add Market to State

**Location:** Around line 180 in the state initialization

**Modify:**

```javascript
let state = {
    platform: 'amazon-jp',
    market: 'japan', // NEW: Track market separately
    locale: 'ja-JP', // NEW: Visible-copy locale; can be overridden for tests
    instructionLanguage: 'en', // NEW: 'en' or 'localized' benchmark arm
    copyItems: [], // NEW: approved localized text and locations
    imageCount: 7,
    category: 'beauty',
    // ... rest of state
};
```

### Step 1.3: Update Platform Change Handler

**Location:** Around line 1815 in the event listeners

**Modify:**

```javascript
document.getElementById('platform-select').addEventListener('change', (e) => {
    state.platform = e.target.value;
    state.market = getMarketFromPlatform(e.target.value); // NEW: Update market
    state.locale = getLocaleFromPlatform(e.target.value); // NEW: Update output language
    state.copyItems = localizeCopyItems(state.copyItems, state.locale); // NEW: Resolve text variables
    state.imageCount = PLATFORM_TEMPLATES[state.platform].imageCount;
    state.imageCountTouched = false;
    state.constraints = {};
    document.getElementById('image-count').value = state.imageCount;
    markInputsChanged();
    renderConstraints();
});
```

---

## Phase 2: Add Visual Element and Locale Specifications

### Step 2.0: Add Platform Locale and Language Contract

Implement the cross-cutting locale and copy contract above before extending the visual element schema. Add the platform locale lookup and `state.locale` assignment from Phase 1, then add `outputLocale`, `instructionLanguage`, and `copyItems` to each Shaper slot in Step 2.1. This keeps locale and visual specifications in the same plan object and gives later validation and prompt-building phases one source of truth.

### Step 2.1: Extend Shaper Schema

**Location:** `buildShaperPayload()` function around line 722

This is the main insertion point for the locale change: add `outputLocale`, `instructionLanguage`, and `copyItems` to every slot together with `visualElements`. The platform lookup in Phase 1 supplies their defaults; the Shaper plan makes them explicit and reviewable per slot.

**Current schema (line 726-744) - ADD these fields to the slot schema:**

```javascript
const schema = JSON.stringify({
    planFormatVersion: PLAN_FORMAT_VERSION,
    id: 'plan_<unique id>',
    planSource: 'shaper',
    shapedAt: '<ISO timestamp>',
    model: SHAPER_MODEL_ID,
    productRead: { /* ... existing ... */ },
    batchTone: { /* ... existing ... */ },
    resolvedImageCount: template.imageCount,
    countRationale: '<short reason>',
    slots: [{
        index: 1,
        role: 'hero',
        direction: '<what this slot communicates>',
        differentiator: '<how it differs from all sibling slots>',
        sceneRationale: '<why a scene or plain view is correct>',
        sceneSource: 'shaper|operator',
        copyPlacement: 'none|model-rendered|reserve-overlay-area',
        outputLocale: '<BCP-47 locale, for example ja-JP or zh-TW>',
        instructionLanguage: 'en',
        copyItems: [{
            id: '<stable id>',
            kind: 'slogan|short-description|badge|label',
            text: '<exact approved text>',
            textByLocale: { '<locale>': '<approved localized text>' },
            locale: '<BCP-47 locale>',
            location: 'top-left|top-center|top-right|bottom-left|bottom-center|bottom-right|custom',
            render: 'overlay|model-rendered'
        }],
        derivedFrom: 'open|platform-rule|operator',
        // NEW FIELDS - Visual Element Specifications
        visualElements: {
            backgroundType: 'pure-white|neutral-solid|gradient|contextual-scene|lifestyle-environment',
            productTreatment: 'centered-isolated|angled-with-shadow|in-context|in-use',
            layoutComposition: 'product-dominant|balanced|environmental',
            colorPalette: 'product-accurate|warm-enhanced|cool-enhanced|vibrant-pop',
            lifestyleLevel: 'none|subtle-props|full-scene|human-presence',
            textStrategy: 'text-free|reserve-overlay-space|model-rendered-headline'
        }
    }]
}, null, 2);
```

**In the responseSchema (around line 777), add:**

```javascript
const responseSchema = {
    type: 'OBJECT',
    required: ['productRead', 'batchTone', 'resolvedImageCount', 'countRationale', 'slots'],
    properties: {
        // ... existing properties ...
        slots: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                required: ['index', 'role', 'direction', 'differentiator', 'sceneRationale', 
                          'sceneSource', 'copyPlacement', 'outputLocale', 'instructionLanguage',
                          'copyItems', 'derivedFrom', 'visualElements'],
                properties: {
                    index: { type: 'INTEGER' },
                    role: { type: 'STRING', enum: Array.from(SHAPER_ROLES) },
                    direction: { type: 'STRING' },
                    differentiator: { type: 'STRING' },
                    sceneRationale: { type: 'STRING' },
                    sceneSource: { type: 'STRING', enum: ['shaper', 'operator'] },
                    copyPlacement: { type: 'STRING', enum: ['none', 'model-rendered', 'reserve-overlay-area'] },
                    outputLocale: { type: 'STRING' },
                    instructionLanguage: { type: 'STRING', enum: ['en', 'localized'] },
                    copyItems: {
                        type: 'ARRAY',
                        items: {
                            type: 'OBJECT',
                            required: ['id', 'kind', 'text', 'locale', 'location', 'render'],
                            properties: {
                                id: { type: 'STRING' },
                                kind: { type: 'STRING', enum: ['slogan', 'short-description', 'badge', 'label'] },
                                text: { type: 'STRING' },
                                textByLocale: { type: 'OBJECT' },
                                locale: { type: 'STRING' },
                                location: { type: 'STRING' },
                                render: { type: 'STRING', enum: ['overlay', 'model-rendered'] }
                            }
                        }
                    },
                    derivedFrom: { type: 'STRING', enum: ['open', 'platform-rule', 'operator'] },
                    // NEW: Visual Elements
                    visualElements: {
                        type: 'OBJECT',
                        required: ['backgroundType', 'productTreatment', 'layoutComposition', 
                                  'colorPalette', 'lifestyleLevel', 'textStrategy'],
                        properties: {
                            backgroundType: { 
                                type: 'STRING', 
                                enum: ['pure-white', 'neutral-solid', 'gradient', 
                                      'contextual-scene', 'lifestyle-environment'] 
                            },
                            productTreatment: { 
                                type: 'STRING', 
                                enum: ['centered-isolated', 'angled-with-shadow', 
                                      'in-context', 'in-use'] 
                            },
                            layoutComposition: { 
                                type: 'STRING', 
                                enum: ['product-dominant', 'balanced', 'environmental'] 
                            },
                            colorPalette: { 
                                type: 'STRING', 
                                enum: ['product-accurate', 'warm-enhanced', 
                                      'cool-enhanced', 'vibrant-pop'] 
                            },
                            lifestyleLevel: { 
                                type: 'STRING', 
                                enum: ['none', 'subtle-props', 'full-scene', 'human-presence'] 
                            },
                            textStrategy: { 
                                type: 'STRING', 
                                enum: ['text-free', 'reserve-overlay-space', 
                                      'model-rendered-headline'] 
                            }
                        }
                    }
                }
            }
        }
    }
};
```

### Step 2.2: Add Market Context to Shaper Prompt

**Location:** `buildShaperPayload()` around line 749, in the prompt array

**Add after the buyer motivation skill section and before platform info:**

```javascript
const prompt = [
    'You are Shaper, an eCommerce image batch planner. Return JSON only, with no markdown fences.',
    // ... existing role and schema instructions ...
    buyerMotivationSkill || '...',
    // NEW: Market Cultural Context
    `MARKET CULTURAL CONTEXT: ${MARKET_PROFILES[state.market].name}
Market visual preferences:
- Contextual imagery preference: ${MARKET_PROFILES[state.market].contextualImageryPreference}
- Information density tolerance: ${MARKET_PROFILES[state.market].informationDensityTolerance}
- Lifestyle identification: ${MARKET_PROFILES[state.market].lifestyleIdentification}
Visual tendencies: ${JSON.stringify(MARKET_PROFILES[state.market].visualTendencies)}

Use these market preferences to inform your visualElements choices per slot. High contextual preference → favor lifestyle-environment backgrounds. Low information density tolerance → favor text-free strategy. High lifestyle identification → use full-scene or human-presence where appropriate.`,
    // NEW: Locale and copy contract
    `LANGUAGE AND COPY CONTRACT:
Output locale: ${state.locale}
Use the output locale for all visible short descriptions, slogans, badges, and labels. Copy is supplied as exact approved values with an explicit location and render mode. Never translate, paraphrase, transliterate, or invent copy. Keep the visual instruction language as English unless this case is explicitly running the localized-prompt benchmark arm. For model-rendered copy, render only the supplied strings, exactly once each, in their declared locations. For overlay copy, reserve the named clean area and render no text.`,
    // ... rest of existing prompt instructions ...
    `Platform: ${template.name}; aspect ratio: ${template.aspectRatio}; ...`,
    // ... rest
].join('\n\n');
```

### Step 2.3: Add Guidance for Visual Element Selection

**Location:** `buildShaperPayload()` prompt array, add before the "Author one shared batchTone" line

```javascript
`VISUAL ELEMENT SELECTION GUIDANCE:
For each slot, choose visualElements based on: role + buyer motivation + market preferences + platform rules.

backgroundType:
- pure-white: Amazon main image, high verification need, B2_Evidence
- neutral-solid: Clean product focus, B1_Functional, B7_Expert  
- gradient: Modern aesthetic, B4_Aesthetic, premium feel
- contextual-scene: B3_Lifestyle, Japan market, usage roles
- lifestyle-environment: High lifestyle identification, lifestyle role

productTreatment:
- centered-isolated: Hero shots, pure product focus, high verification
- angled-with-shadow: Modern e-commerce, B4_Aesthetic
- in-context: Lifestyle roles, B3_Lifestyle, contextual scenes
- in-use: Usage demonstration, B1_Functional, B6_Convenience

layoutComposition:
- product-dominant: Amazon style, hero roles, product-first
- balanced: Mixed approach, moderate lifestyle preference
- environmental: High lifestyle identification, B3_Lifestyle

colorPalette:
- product-accurate: High verification need, B2_Evidence, B7_Expert
- warm-enhanced: Japan market, lifestyle identification
- cool-enhanced: Modern tech, professional
- vibrant-pop: Taiwan/China markets, promotional, B5_Value

lifestyleLevel:
- none: Pure product, B2_Evidence, B7_Expert, high verification
- subtle-props: Balanced approach, scale reference
- full-scene: B3_Lifestyle, high contextual preference
- human-presence: Usage roles, convenience demonstration

textStrategy:
- text-free: Amazon style, Japan market, aesthetic focus
- reserve-overlay-space: Taiwan/China markets, spec overlay slots
- model-rendered-headline: First slot promotional, Shopee style

Every slot must include complete visualElements.`,
```

---

## Phase 3: Update Validation to Handle Visual Elements

### Step 3.1: Modify `validateShaperPlan` Function

**Location:** Around line 616, function `validateShaperPlan`

**After the existing slot validation loop (around line 624-656), add visual elements fallback:**

```javascript
const slots = Array.from({ length: targetCount }, (_, index) => {
    const candidate = sourceSlots.get(index + 1);
    if (!candidate || typeof candidate !== 'object') {
        const repaired = fallback.slots[index] || fallback.slots[fallback.slots.length - 1];
        return { ...repaired, index: index + 1 };
    }
    const fallbackSlot = fallback.slots[index] || fallback.slots[fallback.slots.length - 1];
    const role = SHAPER_ROLES.has(candidate.role) ? candidate.role : fallbackSlot.role;
    
    // NEW: Visual Elements validation and fallback
    const visualElements = candidate.visualElements || {};
    const validatedVisualElements = {
        backgroundType: ['pure-white', 'neutral-solid', 'gradient', 'contextual-scene', 'lifestyle-environment']
            .includes(visualElements.backgroundType) 
            ? visualElements.backgroundType 
            : fallbackVisualElements(role, index, state.market).backgroundType,
        productTreatment: ['centered-isolated', 'angled-with-shadow', 'in-context', 'in-use']
            .includes(visualElements.productTreatment)
            ? visualElements.productTreatment
            : fallbackVisualElements(role, index, state.market).productTreatment,
        layoutComposition: ['product-dominant', 'balanced', 'environmental']
            .includes(visualElements.layoutComposition)
            ? visualElements.layoutComposition
            : fallbackVisualElements(role, index, state.market).layoutComposition,
        colorPalette: ['product-accurate', 'warm-enhanced', 'cool-enhanced', 'vibrant-pop']
            .includes(visualElements.colorPalette)
            ? visualElements.colorPalette
            : fallbackVisualElements(role, index, state.market).colorPalette,
        lifestyleLevel: ['none', 'subtle-props', 'full-scene', 'human-presence']
            .includes(visualElements.lifestyleLevel)
            ? visualElements.lifestyleLevel
            : fallbackVisualElements(role, index, state.market).lifestyleLevel,
        textStrategy: ['text-free', 'reserve-overlay-space', 'model-rendered-headline']
            .includes(visualElements.textStrategy)
            ? visualElements.textStrategy
            : fallbackVisualElements(role, index, state.market).textStrategy
    };

    const outputLocale = /^[a-z]{2,3}-[A-Z]{2}$/.test(candidate.outputLocale || '')
        ? candidate.outputLocale
        : state.locale;
    const instructionLanguage = candidate.instructionLanguage === 'localized' ? 'localized' : 'en';
    const copyItems = Array.isArray(candidate.copyItems)
        ? candidate.copyItems.filter(item => item && typeof item.text === 'string' && item.text.trim())
            .map(item => ({
                id: String(item.id || `copy-${index + 1}`),
                kind: ['slogan', 'short-description', 'badge', 'label'].includes(item.kind) ? item.kind : 'label',
                text: item.text.trim(),
                locale: /^[a-z]{2,3}-[A-Z]{2}$/.test(item.locale || '') ? item.locale : outputLocale,
                location: String(item.location || 'custom'),
                render: item.render === 'model-rendered' ? 'model-rendered' : 'overlay'
            }))
        : [];
    
    return {
        index: index + 1,
        role,
        direction: String(candidate.direction || fallbackSlot.direction),
        differentiator: String(candidate.differentiator || fallbackSlot.differentiator),
        sceneRationale: String(candidate.sceneRationale || fallbackSlot.sceneRationale),
        sceneSource: candidate.sceneSource === 'operator' ? 'operator' : 'shaper',
        copyPlacement: ['none', 'model-rendered', 'reserve-overlay-area'].includes(candidate.copyPlacement) 
            ? candidate.copyPlacement 
            : fallbackSlot.copyPlacement,
        outputLocale,
        instructionLanguage,
        copyItems,
        derivedFrom: candidate.derivedFrom === 'platform-rule' ? 'platform-rule' : 'open',
        visualElements: validatedVisualElements // NEW
    };
});
```

### Step 3.2: Add Fallback Visual Elements Function

**Location:** Before `validateShaperPlan`, around line 570

```javascript
function fallbackVisualElements(role, index, marketId) {
    const market = MARKET_PROFILES[marketId] || MARKET_PROFILES['japan'];
    const isFirstSlot = index === 0;
    const platform = PLATFORM_TEMPLATES[state.platform];
    
    // Amazon-jp slot 1 hard rule: pure white background
    if (platform.name === 'Amazon.co.jp' && isFirstSlot) {
        return {
            backgroundType: 'pure-white',
            productTreatment: 'centered-isolated',
            layoutComposition: 'product-dominant',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: 'text-free'
        };
    }
    
    // Role-based fallbacks with market influence
    const roleDefaults = {
        'hero': {
            backgroundType: market.contextualImageryPreference === 'high' ? 'gradient' : 'neutral-solid',
            productTreatment: 'angled-with-shadow',
            layoutComposition: 'product-dominant',
            colorPalette: market.visualTendencies.colorPalette.includes('muted') ? 'warm-enhanced' : 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: isFirstSlot && platform.name !== 'Amazon.co.jp' ? 'model-rendered-headline' : 'text-free'
        },
        'lifestyle': {
            backgroundType: 'lifestyle-environment',
            productTreatment: 'in-context',
            layoutComposition: 'environmental',
            colorPalette: 'warm-enhanced',
            lifestyleLevel: market.lifestyleIdentification === 'high' ? 'full-scene' : 'subtle-props',
            textStrategy: 'text-free'
        },
        'usage': {
            backgroundType: 'contextual-scene',
            productTreatment: 'in-use',
            layoutComposition: 'balanced',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'human-presence',
            textStrategy: 'text-free'
        },
        'feature-detail': {
            backgroundType: 'neutral-solid',
            productTreatment: 'centered-isolated',
            layoutComposition: 'product-dominant',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: market.informationDensityTolerance === 'high' ? 'reserve-overlay-space' : 'text-free'
        },
        'material-detail': {
            backgroundType: 'neutral-solid',
            productTreatment: 'centered-isolated',
            layoutComposition: 'product-dominant',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: 'text-free'
        },
        'scale': {
            backgroundType: market.contextualImageryPreference === 'low' ? 'neutral-solid' : 'contextual-scene',
            productTreatment: market.contextualImageryPreference === 'low' ? 'centered-isolated' : 'in-context',
            layoutComposition: 'balanced',
            colorPalette: 'product-accurate',
            lifestyleLevel: market.contextualImageryPreference === 'low' ? 'subtle-props' : 'full-scene',
            textStrategy: 'text-free'
        },
        'benefit': {
            backgroundType: market.visualTendencies.backgroundPreference.includes('vibrant') ? 'gradient' : 'contextual-scene',
            productTreatment: 'in-context',
            layoutComposition: 'balanced',
            colorPalette: market.visualTendencies.colorPalette.includes('energetic') ? 'vibrant-pop' : 'warm-enhanced',
            lifestyleLevel: 'subtle-props',
            textStrategy: market.informationDensityTolerance === 'high' ? 'reserve-overlay-space' : 'text-free'
        },
        'package-contents': {
            backgroundType: 'neutral-solid',
            productTreatment: 'centered-isolated',
            layoutComposition: 'product-dominant',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: market.informationDensityTolerance === 'high' ? 'reserve-overlay-space' : 'text-free'
        },
        'alternate-view': {
            backgroundType: 'neutral-solid',
            productTreatment: 'angled-with-shadow',
            layoutComposition: 'product-dominant',
            colorPalette: 'product-accurate',
            lifestyleLevel: 'none',
            textStrategy: 'text-free'
        }
    };
    
    return roleDefaults[role] || roleDefaults['hero'];
}
```

---

## Phase 4: Refactor Prompt Building

### Step 4.1: Modify `buildPromptRecord` to Use Visual Elements

**Location:** `buildPromptRecord()` function around line 858

**Replace the sections array construction (lines 874-922) with:**

```javascript
const visualElements = slot?.visualElements || fallbackVisualElements(purpose, imageIndex, state.market);
const market = MARKET_PROFILES[state.market];
const outputLocale = slot?.outputLocale || state.locale;
const instructionLanguage = slot?.instructionLanguage || 'en';
const copyItems = Array.isArray(slot?.copyItems) ? slot.copyItems : [];

// Build visual element instruction string
const visualInstruction = buildVisualElementInstruction(visualElements, purpose, market);

const sections = [
    `Create a new ${template.name} eCommerce product photograph using the attached product photos as identity references.`,
    
    `IMAGE ${imageIndex + 1} OF ${state.imageCount}
Purpose: ${purpose}
Role: ${slot?.role || purpose}
Differentiator: ${slot?.differentiator || `Distinct ${purpose} view`}
Instruction language: ${instructionLanguage}
Visible-copy locale: ${outputLocale}

VISUAL SPECIFICATIONS:
${visualInstruction}`,
    
    `PRODUCT IDENTITY - MUST PRESERVE
Product name: ${state.productName.trim()}
Variant: ${state.productVariant.trim() || 'Use the exact variant shown in the product photos.'}
Preserve all visible product attributes: geometry, proportions, colors, materials, packaging, labels, logos, quantity, components.
Category guardrail: ${category.guidance}`,
    
    // Add product facts if present
    state.categoryFacts.trim() ? `ADDITIONAL PRODUCT FACTS\n${state.categoryFacts.trim()}` : '',
    
    // Must Have constraints
    mustHave.length > 0 ? `MUST HAVE\n${mustHave.map(item => `${item.label}: ${item.value}`).join('\n')}\nUse as exact factual direction. Do not typeset unless text instructions explicitly request it.` : '',
    
    // Preferred direction (shortened)
    preferences.length > 0 ? `PREFERRED DIRECTION\n${preferences.join('\n')}` : '',
    
    // Reference images
    referenceRelationships.length > 0 ? `VISUAL REFERENCES\n${referenceRelationships.map((ref, i) => `Reference ${i + 1}: ${ref.instruction}`).join('\n')}` : '',
    
    // Sibling differentiation (shortened)
    state.imageCount > 1 ? `SIBLING DIFFERENTIATION\nThis batch has ${state.imageCount} images. Your differentiator: "${slot.differentiator}". Do not repeat compositions from other slots.` : '',
    
    // Text handling is explicit per copy item and locale
    copyItems.some(item => item.render === 'model-rendered')
        ? `MODEL-RENDERED TEXT\nRender only these exact strings in ${outputLocale}, once each, at the specified locations. Do not translate, paraphrase, transliterate, or add any other text.\n${copyItems.filter(item => item.render === 'model-rendered').map(item => `${item.id} (${item.kind}) at ${item.location}: "${item.text}"`).join('\n')}`
        : copyItems.some(item => item.render === 'overlay')
        ? `RESERVE OVERLAY AREAS\nRender no text. Leave clean areas at these locations for application overlay in ${outputLocale}:\n${copyItems.filter(item => item.render === 'overlay').map(item => `${item.id} (${item.kind}) at ${item.location}`).join('\n')}`
        : !isAmazonMain ? 'TEXT HANDLING\nDo not render prices, ratings, specifications, or promotional copy.' : '',
    
    'ACCURACY\nUse only supplied facts. Do not invent measurements, ingredients, certifications, ratings, discounts, or capabilities.',
    
    'OUTPUT\nReturn exactly one final image for this slot.'
].filter(Boolean);
```

### Step 4.2: Add Visual Element Instruction Builder

**Location:** Before `buildPromptRecord`, around line 857

```javascript
function buildVisualElementInstruction(elements, role, market) {
    const parts = [];
    
    // Background
    const bgMap = {
        'pure-white': 'Use a pure white #FFFFFF background with no shadows, gradients, or props. Product must be centered and isolated.',
        'neutral-solid': 'Use a clean, neutral solid background (white, light gray, or soft beige). Minimal shadows acceptable.',
        'gradient': 'Use a subtle gradient background that enhances the product without overwhelming it. Keep it modern and clean.',
        'contextual-scene': 'Place the product in a believable contextual scene that supports its use case. Keep scene elements relevant.',
        'lifestyle-environment': 'Create a full lifestyle environment showing the product in realistic daily use context. Scene should feel natural and aspirational.'
    };
    parts.push(`Background: ${bgMap[elements.backgroundType] || bgMap['neutral-solid']}`);
    
    // Product treatment
    const treatmentMap = {
        'centered-isolated': 'Center the product in frame, fully visible, filling about 75-85% of the image. No background distractions.',
        'angled-with-shadow': 'Position the product at a slight angle with subtle natural shadow. Modern e-commerce style.',
        'in-context': 'Show the product within its usage context, surrounded by relevant environmental elements.',
        'in-use': 'Demonstrate the product being actively used. Show realistic interaction.'
    };
    parts.push(`Product treatment: ${treatmentMap[elements.productTreatment] || treatmentMap['centered-isolated']}`);
    
    // Layout
    const layoutMap = {
        'product-dominant': 'Product is the clear focus, occupying 70%+ of visual weight.',
        'balanced': 'Balance product and environment roughly 50/50 in visual weight.',
        'environmental': 'Environment is primary, product is integrated naturally within the scene.'
    };
    parts.push(`Composition: ${layoutMap[elements.layoutComposition] || layoutMap['product-dominant']}`);
    
    // Color
    const colorMap = {
        'product-accurate': 'Maintain accurate product colors. Neutral lighting. Professional and truthful.',
        'warm-enhanced': 'Enhance with warm, natural tones. Soft lighting. Inviting and comfortable mood.',
        'cool-enhanced': 'Use cool, modern tones. Clean lighting. Professional and contemporary feel.',
        'vibrant-pop': 'Use energetic, saturated colors. Bold lighting. Eye-catching and promotional.'
    };
    parts.push(`Color palette: ${colorMap[elements.colorPalette] || colorMap['product-accurate']}`);
    
    // Lifestyle level
    const lifestyleMap = {
        'none': 'No lifestyle elements. Pure product photography.',
        'subtle-props': 'Add minimal relevant props for context (e.g., scale reference items). Keep props subtle.',
        'full-scene': 'Create a complete scene with multiple contextual elements. Show realistic usage environment.',
        'human-presence': 'Include human interaction with the product. Show hands or person using it naturally.'
    };
    parts.push(`Lifestyle level: ${lifestyleMap[elements.lifestyleLevel] || lifestyleMap['none']}`);
    
    // Text strategy is handled separately in the main sections
    
    return parts.join('\n');
}
```

---

## Phase 5: Update Fallback Plan Function

### Step 5.1: Add Visual Elements to Fallback

**Location:** `buildFallbackPlan()` function around line 571

**In the slots array map, add visualElements:**

```javascript
const slots = Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    role: roleForPurpose(template.imagePurposes[index], index),
    direction: template.slotRules[index] || 'Create a useful additional product view with a new composition that fits the shared batch tone.',
    differentiator: template.imagePurposes[index] || `Additional product view ${index + 1}`,
    sceneRationale: 'Static platform guidance; use a plain product view unless the platform rule calls for context.',
    sceneSource: 'operator',
    copyPlacement: fallbackCopyPlacement(template, index, count),
    outputLocale: state.locale,
    instructionLanguage: 'en',
    copyItems: state.copyItems || [],
    derivedFrom: 'platform-rule',
    visualElements: fallbackVisualElements(roleForPurpose(template.imagePurposes[index], index), index, state.market) // NEW
}));
```

---

## Testing Plan

### Test Case 1: Original Problem

**Input:**
- Platform: Shopee TW
- Product: Japanese lifestyle product
- Slogan: "日式生活品味"
- Category: Home goods
- Batch direction: "Japanese lifestyle aesthetic"

**Expected Output:**
- Slot 1 (hero): gradient background, model-rendered headline with slogan
- Slot 2-3 (features): neutral-solid, text-free, focus on product detail
- Slot 4-5 (lifestyle): lifestyle-environment, full-scene, NO text overlay
- Slot 6 (scale): contextual-scene, subtle-props, text-free
- Slot 7+ (varies): mix of treatments, controlled text placement

### Test Case 2: Taiwan Market (High Info Density)

**Input:**
- Platform: Shopee TW
- Product: Electronics
- Buyer motivation: B2_Evidence

**Expected Output:**
- Multiple slots with reserve-overlay-space text strategy
- neutral-solid backgrounds for spec emphasis
- Vibrant colors due to Taiwan market preference

### Test Case 3: Japan Market (High Lifestyle)

**Input:**
- Platform: Rakuten
- Product: Beauty product  
- Buyer motivation: B4_Aesthetic

**Expected Output:**
- Lifestyle-environment and contextual-scene backgrounds
- Warm-enhanced color palette
- Minimal text (text-free strategy)
- Full-scene lifestyle level

### Test Case 4: Fallback Mode

**Test:** Disconnect Shaper (simulate API failure)

**Expected Output:**
- System uses fallbackVisualElements()
- All slots have valid visualElements
- Visual variety still present based on role + market

### Test Case 5: Locale and copy variables

**Input:**
- Platform: Shopee TW (`locale: zh-TW`)
- Product: Japanese lifestyle product
- Approved copy: `夏日生活提案` as a slogan at `top-right`; `輕盈好收納` as a short description at `bottom-left`
- Copy path: run once with `overlay`, once with `model-rendered`

**Expected Output:**
- All visible copy is Traditional Chinese and appears only at the declared locations.
- The visual scene remains the same between copy paths and contains no extra slogans, prices, ratings, or invented claims.
- Overlay output is checked for exact application-rendered strings; model-rendered output is checked with OCR and locale review.

### Test Case 6: Prompt-language benchmark

Run the same `ja-JP` and `zh-TW` cases with `instructionLanguage: en` and `instructionLanguage: localized` on both target models. Hold product references, slot plan, copy, aspect ratio, and seeds constant. A localized visual prompt is adopted only when its per-locale visual and copy scores meet the release gates above. A failure in model-rendered text routes that locale to overlay rendering without changing the visual prompt arm.

---

## Validation Checklist

Before considering implementation complete:

- [ ] MARKET_PROFILES defined with all 4 markets
- [ ] getMarketFromPlatform() function added
- [ ] state.market tracked and updated
- [ ] PLATFORM_LOCALES defined and state.locale updated from platform
- [ ] Locale override is available for cross-market testing
- [ ] Copy items carry exact text, locale, type, location, and render mode
- [ ] English canonical visual prompt is the default for both image models
- [ ] Localized visual prompt is a separately benchmarked arm
- [ ] Visual element enums added to Shaper schema
- [ ] responseSchema updated with visualElements
- [ ] Market context added to Shaper prompt
- [ ] Visual element selection guidance in Shaper prompt
- [ ] fallbackVisualElements() function implemented
- [ ] validateShaperPlan() handles visualElements
- [ ] buildVisualElementInstruction() function added
- [ ] buildPromptRecord() refactored to use visual elements
- [ ] buildFallbackPlan() includes visual elements
- [ ] Test case 1 produces varied images with controlled text
- [ ] Test case 2 respects Taiwan market preferences
- [ ] Test case 3 respects Japan market preferences
- [ ] Test case 4 works without Shaper
- [ ] Test case 5 passes copy locale, exact text, and location checks
- [ ] Test case 6 reports per-model, per-locale, per-prompt-language results
- [ ] Release gates prevent an aggregate score from hiding a locale regression

---

## File Summary

**Files Modified:**
1. `app.js` - All major changes (900+ lines affected)

**New Functions Added:**
1. `getMarketFromPlatform(platformId)` - Maps platform to market
2. `fallbackVisualElements(role, index, marketId)` - Provides default visual elements
3. `buildVisualElementInstruction(elements, role, market)` - Converts visual elements to prompt text

**Existing Functions Modified:**
1. `buildShaperPayload()` - Extended schema, added market context
2. `validateShaperPlan()` - Validates and falls back visual elements
3. `buildPromptRecord()` - Uses visual elements for precise prompts
4. `buildFallbackPlan()` - Includes visual elements in fallback slots

**Lines of Code:**
- New code: ~400 lines
- Modified code: ~200 lines
- Total affected: ~600 lines in one file

---

## Rollback Plan

If implementation causes issues:

1. **Visual elements not working:**
   - Shaper will fall back to `fallbackVisualElements()`
   - System remains functional

2. **Market profiles causing errors:**
   - Default to 'japan' market in all getMarket calls
   - Visual elements still provide variety

3. **Complete rollback:**
   - Git revert to commit before changes
   - Original system still in repo history

---

## Future Enhancements

After successful implementation:

1. **Market UI Selection:**
   - Add explicit market dropdown (currently auto-detected from platform)
   - Allow override for cross-market testing

2. **Visual Element Analytics:**
   - Log which visual elements produced best images
   - A/B test different element combinations

3. **Dynamic Market Profiles:**
   - Load market profiles from external config
   - Allow customization without code changes

4. **Buyer Motivation → Visual Elements Matrix:**
   - More sophisticated mapping between motivation and visual choices
   - Learn from generated image quality

5. **Platform-Market Interaction:**
   - Some platforms in same market may need different defaults
   - Amazon JP vs Rakuten JP nuances
