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

## Solution Architecture

### Three-Layer Enhancement

```
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
    state.imageCount = PLATFORM_TEMPLATES[state.platform].imageCount;
    state.imageCountTouched = false;
    state.constraints = {};
    document.getElementById('image-count').value = state.imageCount;
    markInputsChanged();
    renderConstraints();
});
```

---

## Phase 2: Add Visual Element Specifications

### Step 2.1: Extend Shaper Schema

**Location:** `buildShaperPayload()` function around line 722

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
                          'sceneSource', 'copyPlacement', 'derivedFrom', 'visualElements'],
                properties: {
                    index: { type: 'INTEGER' },
                    role: { type: 'STRING', enum: Array.from(SHAPER_ROLES) },
                    direction: { type: 'STRING' },
                    differentiator: { type: 'STRING' },
                    sceneRationale: { type: 'STRING' },
                    sceneSource: { type: 'STRING', enum: ['shaper', 'operator'] },
                    copyPlacement: { type: 'STRING', enum: ['none', 'model-rendered', 'reserve-overlay-area'] },
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

// Build visual element instruction string
const visualInstruction = buildVisualElementInstruction(visualElements, purpose, market);

const sections = [
    `Create a new ${template.name} eCommerce product photograph using the attached product photos as identity references.`,
    
    `IMAGE ${imageIndex + 1} OF ${state.imageCount}
Purpose: ${purpose}
Role: ${slot?.role || purpose}
Differentiator: ${slot?.differentiator || `Distinct ${purpose} view`}

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
    
    // Text handling based on copyPlan
    copyPlan.modelRenderedText.length > 0 
        ? `MODEL-RENDERED TEXT\nRender this headline exactly: "${copyPlan.modelRenderedText[0].value}". Make it legible and fit the batch tone.`
        : copyPlan.overlayText.length > 0
        ? `RESERVE OVERLAY AREA\nLeave one clean area for later text overlay:\n${copyPlan.overlayText.map(item => `${item.label}: ${item.value}`).join('\n')}`
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

---

## Validation Checklist

Before considering implementation complete:

- [ ] MARKET_PROFILES defined with all 4 markets
- [ ] getMarketFromPlatform() function added
- [ ] state.market tracked and updated
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
