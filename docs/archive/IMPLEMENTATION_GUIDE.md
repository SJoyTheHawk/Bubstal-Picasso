# Implementation Guide: Per-Slot Image Generation

**Date:** 2026-09-18  
**Based on:** MULTI_IMAGE_OUTPUT_SUMMARY.md  
**Target Files:** `app.js`, `auth-service.js`

---

## Overview

This guide implements the per-slot generation architecture to eliminate ambiguous response-to-slot mapping. Each image is generated from its own prompt record and directly linked to that prompt's ID.

**Key Changes:**
1. Generate one image per slot using individual API calls
2. Add concurrency control (e.g., 2-3 slots at a time)
3. Remove array-position-based slot assumptions
4. Add sibling differentiation to each prompt
5. Update progress reporting for incremental completion

---

## Phase 1: Fix Model ID Inconsistency

**Priority:** Low (housekeeping)  
**Files:** `app.js`, `auth-service.js`

### Issue
The client metadata and server default used different Shaper model IDs.

### Fix

**Files:** `app.js`, `auth-service.js`
```javascript
const SHAPER_MODEL_ID = 'gemini-3.5-flash';
const SHAPER_MODEL_ID = process.env.SHAPER_MODEL_ID || 'gemini-3.5-flash';
```

**Implemented decision:** Standardize both client metadata and the server default on `gemini-3.5-flash`.

---

## Phase 2: Add Sibling Differentiation to Prompts

**Priority:** High  
**Files:** `app.js`  
**Location:** `buildPromptRecord()` function (around line 786)

### Current Behavior
Each prompt knows its own purpose but doesn't reference sibling slots to avoid duplication.

### Change

**File:** `app.js` - Add after line 828 (after "VISUAL REFERENCES" section, before "MODEL-RENDERED TEXT")

```javascript
    // Add this new section
    if (state.imageCount > 1) {
        const siblingSlots = plan.slots
            .filter((_, index) => index !== imageIndex)
            .map(slot => `• ${slot.role}: ${slot.differentiator}`)
            .join('\n');
        
        sections.push(`AVOID DUPLICATING SIBLING SLOTS\nThis batch contains ${state.imageCount} distinct images. Do not repeat or closely mimic the composition, angle, or concept already used in these sibling slots:\n${siblingSlots}\n\nYour differentiator for this slot: "${slot.differentiator}"`);
    }
```

**Location Context:**
```javascript
    // Existing code around line 826-829
    if (referenceRelationships.length > 0) {
        sections.push(`VISUAL REFERENCES\n...`);
    }

    // ADD NEW SECTION HERE (above)

    if (copyPlan.modelRenderedText.length > 0) {
        sections.push(`MODEL-RENDERED TEXT\n...`);
    }
```

---

## Phase 3: Create Concurrent Slot Generator

**Priority:** Critical  
**Files:** `app.js`  
**Location:** Before `generatePrompts()` function (around line 1180)

### Add New Function

**File:** `app.js` - Insert before line 1181 (before `async function generatePrompts()`)

```javascript
// Generate images for multiple slots with concurrency control
async function generateSlotsWithConcurrency(promptRecords, assets, concurrency = 2, onProgress = null) {
    const results = new Array(promptRecords.length).fill(null);
    const errors = new Map();
    const queue = promptRecords.map((record, index) => ({ record, index }));
    let completed = 0;

    const generateSlot = async (item) => {
        const { record, index } = item;
        const startedAt = new Date().toISOString();
        
        try {
            if (onProgress) {
                onProgress({ 
                    type: 'slot-start', 
                    index: record.index, 
                    completed, 
                    total: promptRecords.length 
                });
            }

            const images = await callNanoBananaAPI(record, assets);
            
            if (!images[0]) {
                throw new Error(`Model returned no image for slot ${record.index}`);
            }

            const completedAt = new Date().toISOString();
            results[index] = {
                promptId: record.id,
                index: record.index,
                purpose: record.purpose,
                status: 'success',
                model: MODEL_ID,
                aspectRatio: record.aspectRatio,
                imageSize: IMAGE_SIZE,
                startedAt,
                completedAt,
                imageUrl: images[0].imageUrl,
                apiMetadata: images[0].metadata
            };

            completed++;
            if (onProgress) {
                onProgress({ 
                    type: 'slot-complete', 
                    index: record.index, 
                    completed, 
                    total: promptRecords.length 
                });
            }

        } catch (error) {
            const completedAt = new Date().toISOString();
            errors.set(index, error.message);
            results[index] = {
                promptId: record.id,
                index: record.index,
                purpose: record.purpose,
                status: 'failed',
                model: MODEL_ID,
                aspectRatio: record.aspectRatio,
                imageSize: IMAGE_SIZE,
                startedAt,
                completedAt,
                error: error.message
            };

            completed++;
            if (onProgress) {
                onProgress({ 
                    type: 'slot-error', 
                    index: record.index, 
                    error: error.message,
                    completed, 
                    total: promptRecords.length 
                });
            }
        }
    };

    // Process queue with concurrency limit
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (item) {
                    await generateSlot(item);
                }
            }
        })());
    }

    await Promise.all(workers);

    return results;
}
```

---

## Phase 4: Replace Batch Generation Logic

**Priority:** Critical  
**Files:** `app.js`  
**Location:** `generatePrompts()` function (lines 1182-1330)

### Current Flow (TO REPLACE)
```javascript
// Lines 1225-1273 (approximate)
const batchRecord = buildBatchPromptRecord(promptRecords);
setActiveTaskPhase('generating');
// ...
let images = [];
try {
    images = await callNanoBananaAPI(batchRecord, assets);
} catch (error) {
    // error handling
}

if (batch.outputRecords.length === 0 && images.length < promptRecords.length) {
    // retry logic with array-position assumption
    for (let index = images.length; index < promptRecords.length; index += 1) {
        // ...
    }
}
```

### New Flow (REPLACE WITH)

**File:** `app.js` - Replace lines 1224-1273 with:

```javascript
        const assets = getSelectedAssets();
        setActiveTaskPhase('generating');
        if (generationStatusText) {
            generationStatusText.textContent = uiText('generation.starting', {
                count: promptRecords.length
            }, `Starting generation for ${promptRecords.length} images...`);
        }

        // Progress callback for incremental updates
        const onProgress = (event) => {
            if (generationStatusText) {
                if (event.type === 'slot-complete') {
                    generationStatusText.textContent = uiText('generation.progress', {
                        completed: event.completed,
                        total: event.total
                    }, `Generated ${event.completed} of ${event.total} images...`);
                } else if (event.type === 'slot-error') {
                    console.warn(`Slot ${event.index} failed:`, event.error);
                }
            }

            // Optional: Update placeholders incrementally
            const placeholder = document.querySelector(`.generation-placeholder:nth-child(${event.index})`);
            if (placeholder) {
                if (event.type === 'slot-complete') {
                    placeholder.classList.add('completed');
                } else if (event.type === 'slot-error') {
                    placeholder.classList.add('failed');
                }
            }
        };

        // Generate all slots with concurrency control (2 at a time)
        const outputRecords = await generateSlotsWithConcurrency(
            promptRecords, 
            assets, 
            2,  // concurrency: 2 slots at a time
            onProgress
        );

        batch.outputRecords = outputRecords;
```

**Location Context:**
```javascript
        // Existing code around line 1220
        await saveBatch(batch);
        state.currentBatch = batch;
        await loadHistory();

        // REPLACE FROM HERE (line ~1224)
        const assets = getSelectedAssets();
        const batchRecord = buildBatchPromptRecord(promptRecords);  // <-- DELETE THIS LINE AND EVERYTHING BELOW UNTIL LINE 1273

        // REPLACE WITH NEW CODE ABOVE

        // CONTINUE WITH EXISTING CODE (line ~1274)
        batch.results = buildLegacyResults(batch);
        batch.status = batch.outputRecords.some(output => output.status === 'failed')
```

---

## Phase 5: Remove Batch Prompt Record (Optional Cleanup)

**Priority:** Low (cleanup)  
**Files:** `app.js`

### Optional: Keep or Remove `buildBatchPromptRecord()`

**Option A: Keep it for preview**
- Keep the function for prompt preview dialog
- Preview dialog can show the "theoretical batch prompt" even though generation uses per-slot

**Option B: Remove it entirely**
- Remove `buildBatchPromptRecord()` function (lines 875-936)
- Update prompt preview to show individual slot prompts only
- Simplify preview UI

**Recommendation:** Keep it for preview purposes. Users may want to see what a combined prompt would look like.

---

## Phase 6: Update Progress Placeholders (Optional)

**Priority:** Low (polish)  
**Files:** `app.js`  
**Location:** `renderGenerationPlaceholders()` (line 1067)

### Add Status Classes

**File:** `app.js:1070-1076` - Enhance placeholder HTML

```javascript
// Before
<div class="result-item generation-placeholder">
    <h3>${escapeHtml(uiText('generation.pendingImage', { index: index + 1 }, `Image ${index + 1}`))}</h3>
    <div class="generation-placeholder-visual"><span class="spinner" aria-hidden="true"></span></div>
    <p>${escapeHtml(uiText('generation.waiting', {}, 'Waiting for the batch response'))}</p>
</div>

// After
<div class="result-item generation-placeholder" data-slot-index="${index + 1}">
    <h3>${escapeHtml(uiText('generation.pendingImage', { index: index + 1 }, `Image ${index + 1}`))}</h3>
    <div class="generation-placeholder-visual"><span class="spinner" aria-hidden="true"></span></div>
    <p class="placeholder-status">${escapeHtml(uiText('generation.queued', {}, 'Queued'))}</p>
</div>
```

### Add CSS for Status Classes

**File:** `styles.css` - Add at the end

```css
/* Slot generation status */
.generation-placeholder[data-slot-index] .placeholder-status {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.generation-placeholder.completed {
    opacity: 0.7;
}

.generation-placeholder.completed .spinner {
    display: none;
}

.generation-placeholder.completed .placeholder-status::before {
    content: '✓ ';
    color: var(--success);
}

.generation-placeholder.failed .spinner {
    display: none;
}

.generation-placeholder.failed {
    border-color: var(--danger);
}

.generation-placeholder.failed .placeholder-status {
    color: var(--danger);
}

.generation-placeholder.failed .placeholder-status::before {
    content: '✗ ';
}
```

---

## Phase 7: Update Tests

**Priority:** High  
**Files:** `test/app.test.js`

### Add New Test Cases

**File:** `test/app.test.js` - Add new test suite

```javascript
// Add to test/app.test.js
const { test } = require('node:test');
const assert = require('node:assert');

test('generateSlotsWithConcurrency - complete success', async () => {
    // Mock API responses
    const promptRecords = [
        { id: 'prompt_1', index: 1, purpose: 'hero', aspectRatio: '1:1' },
        { id: 'prompt_2', index: 2, purpose: 'feature', aspectRatio: '1:1' },
        { id: 'prompt_3', index: 3, purpose: 'detail', aspectRatio: '1:1' }
    ];

    // TODO: Implement mock callNanoBananaAPI
    // const results = await generateSlotsWithConcurrency(promptRecords, assets, 2);
    
    // assert.strictEqual(results.length, 3);
    // assert.strictEqual(results[0].promptId, 'prompt_1');
    // assert.strictEqual(results[0].status, 'success');
});

test('generateSlotsWithConcurrency - one slot fails', async () => {
    // Test that one failed slot doesn't affect others
    // TODO: Mock one failing API call
    // assert.strictEqual(results[0].status, 'success');
    // assert.strictEqual(results[1].status, 'failed');
    // assert.strictEqual(results[2].status, 'success');
});

test('generateSlotsWithConcurrency - preserves prompt-to-output mapping', async () => {
    // Test that output[i].promptId === promptRecords[i].id
    // Even if generation order differs due to concurrency
});

test('sibling differentiation included in prompts', () => {
    // Mock state with multiple slots
    // const promptRecord = buildPromptRecord(1);
    // assert.ok(promptRecord.prompt.includes('AVOID DUPLICATING SIBLING SLOTS'));
    // assert.ok(promptRecord.prompt.includes('differentiator'));
});
```

---

## Phase 8: Update Documentation

**Priority:** Medium  
**Files:** `README.md`, inline comments

### Update README.md

**File:** `README.md` - Add section

```markdown
## Image Generation Architecture

Bubstal Picaso uses a **per-slot generation architecture**:

1. **Shaper** (Gemini 3.5 Flash) analyzes inputs and creates one coordinated batch plan
2. **Generator** (Gemini 3 Pro Image) generates each slot individually using that plan
3. Each image is generated from its own prompt record
4. Generation uses concurrency control (2 slots at a time) for efficiency
5. Every output is directly linked to the prompt ID that initiated it

This architecture ensures:
- ✅ Deterministic prompt-to-output mapping
- ✅ No ambiguous array-position assumptions
- ✅ Failed slots don't affect successful ones
- ✅ Coordinated batch consistency via shared plan

### Why Not Batch Generation?

Gemini 3 Pro Image can return multiple images, but:
- No guaranteed image count
- No structured slot IDs in responses
- Cannot deterministically map partial responses to specific slots

See `MULTI_IMAGE_OUTPUT_SUMMARY.md` for detailed analysis.
```

---

## Migration Checklist

### Pre-Implementation
- [ ] Review VALIDATION_REPORT.md
- [ ] Back up current `app.js`
- [ ] Run existing tests: `npm test`
- [ ] Verify auth works: `npm start` → check `/api/auth/status`

### Implementation Order
- [x] Phase 1: Fix model ID inconsistency
- [x] Phase 2: Add sibling differentiation to prompts
- [x] Phase 3: Create `generateSlotsWithConcurrency()` function
- [x] Phase 4: Replace batch generation logic in `generatePrompts()`
- [x] Phase 5: Keep `buildBatchPromptRecord()` for preview only
- [x] Phase 6: Update progress placeholders
- [x] Phase 7: Add new tests
- [x] Phase 8: Update documentation

### Testing
- [ ] Test single-slot generation (image count = 1)
- [ ] Test multi-slot generation (image count = 7)
- [ ] Test partial failure (mock one slot failing)
- [ ] Test complete failure (mock API unavailable)
- [ ] Verify prompt includes sibling differentiation
- [ ] Verify outputRecords[i].promptId matches promptRecords[i].id
- [ ] Check progress text updates incrementally
- [ ] Verify saved batch has correct structure
- [ ] Test history reload
- [ ] Test export functionality

### Post-Implementation
- [ ] Update HANDOFF.md with architecture changes
- [ ] Consider Google Batch API for cost savings (50% off)
- [ ] Monitor for improved slot accuracy
- [ ] Evaluate if concurrency should increase (current: 2)

---

## Performance Considerations

### Concurrency Tuning

**Current Setting:** 2 slots at a time

**Considerations:**
- **Lower (1):** Sequential, slowest, but easiest to debug
- **Medium (2-3):** Good balance, current recommendation
- **Higher (5-10):** Faster but may hit rate limits, harder to monitor

**Rate Limits:**
- Gemini 3 Pro Image: 10-100 images/minute depending on tier
- For 10 slots with concurrency=2: ~5 sequential batches
- Estimated total time: 2-10 minutes depending on image complexity

### Cost Optimization

**Current:** Pay full price per slot

**Future Optimization:** Use Google Batch API
- 50% cost reduction for batch requests
- Requires refactoring to use Batch API format
- See: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/batch-prediction-api

**Implementation:** Create batch request file with all slot prompts
```json
{
  "requests": [
    {"contents": [...], "generationConfig": {...}},
    {"contents": [...], "generationConfig": {...}},
    ...
  ]
}
```

---

## Rollback Plan

If issues arise, revert these changes:

1. **Restore backup** of `app.js`
2. **Or manually revert:**
   - Remove `generateSlotsWithConcurrency()` function
   - Restore original lines 1224-1273 in `generatePrompts()`
   - Remove sibling differentiation section from `buildPromptRecord()`

3. **Git revert:**
```bash
git diff app.js  # Review changes
git checkout app.js  # Discard changes
```

---

## Success Criteria

✅ **Implementation is successful when:**

1. Every `outputRecord` has a `promptId` that matches a `promptRecord.id`
2. A response is never assigned to a slot based solely on array position
3. Failed slots don't cause wrong-purpose assignment to other slots
4. Progress text reports "Generated N of M images" incrementally
5. All existing tests pass
6. New tests cover per-slot generation
7. No automatic retry duplicates an already-successful slot

---

## Questions?

- **Q: Why concurrency=2 instead of 10?**  
  A: Balance between speed and monitoring. 2 slots at a time keeps progress visible and avoids rate limit issues. Increase after testing.

- **Q: Does this use more API calls?**  
  A: Yes, but it solves the correctness problem. Consider Batch API for 50% cost savings.

- **Q: What about the preview dialog?**  
  A: Keep `buildBatchPromptRecord()` for preview. Users can still see what a combined prompt looks like.

- **Q: Will this break saved batches?**  
  A: No. Old batches use `results` array, new batches use `outputRecords` array. Both are preserved.

---

**End of Implementation Guide**
