const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadApp(overrides = {}) {
    const document = {
        addEventListener() {},
        getElementById() { return null; },
        createElement() { return { click() {} }; }
    };
    const context = vm.createContext({
        Blob,
        URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
        console,
        document,
        window: {},
        process: { cwd: () => path.join(__dirname, '..') },
        require: (mod) => {
            if (mod === 'fs') return fs;
            if (mod === 'path') return path;
            return require(mod);
        },
        ...overrides
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    vm.runInContext(`${source}\n;globalThis.testApi = {\n` +
        'PLATFORM_TEMPLATES, CATEGORY_PRESETS, SHAPER_ROLES, loadBuyerMotivationSkill, buildFallbackPlan, validateShaperPlan, buildShaperPayload, shapeBatch, buildPromptRecord, compilePromptRecords, buildBatchPromptRecord, getSelectedAssets, generatePrompts, previewPrompts, copyPreviewPrompt, ' +
        'callNanoBananaAPI, generateSlotsWithConcurrency, exportCurrentBatch, setState(value) { state = value; }, getState() { return state; }\n' +
        '};', context);
    return { context, api: context.testApi };
}

function baseState(platform = 'amazon-jp', category = 'beauty') {
    return {
        platform,
        imageCount: 3,
        category,
        productName: 'Example Product',
        productVariant: 'Red',
        categoryFacts: 'Package contains one unit.',
        categoryPreference: '',
        productImages: [{ id: 'p1', name: 'front.png', data: 'data:image/png;base64,AA==' }],
        referenceImages: [],
        constraints: {},
        batchDirection: '',
        season: '',
        promotion: '',
        shaperPlan: null,
        imageCountTouched: true,
        currentBatch: null,
        authReady: true
    };
}

test('all platform/category combinations produce open but guarded prompts', () => {
    const { api } = loadApp();

    for (const platform of Object.keys(api.PLATFORM_TEMPLATES)) {
        for (const category of Object.keys(api.CATEGORY_PRESETS)) {
            api.setState(baseState(platform, category));
            const record = api.buildPromptRecord(0);
            assert.match(record.prompt, /PRODUCT IDENTITY - MUST PRESERVE/);
            assert.match(record.prompt, /CREATIVE FREEDOM/);
            assert.match(record.prompt, /do not repeat or copy the same design/i);
            assert.match(record.prompt, /Do not invent measurements/);
            assert.equal(record.platform, platform);
            assert.equal(record.category, category);
        }
    }
});

test('Must Have, Preferred, and exact-text overlay semantics remain distinct', () => {
    const { api } = loadApp();
    const state = baseState('shopee-tw', 'electronics');
    state.imageCount = 1;
    state.constraints = {
        key_selling_points: { enabled: true, level: 'locked', value: 'Quiet motor' },
        brand_colors: { enabled: true, level: 'preferred', value: '#123456' },
        promotional_price: { enabled: true, level: 'locked', value: 'NT$999' }
    };
    api.setState(state);

    const record = api.buildPromptRecord(0);
    assert.match(record.prompt, /MUST HAVE[\s\S]*Quiet motor/);
    assert.match(record.prompt, /PREFERRED DIRECTION[\s\S]*#123456/);
    assert.match(record.prompt, /TEXT TO ADD AFTER GENERATION[\s\S]*NT\$999/);
    assert.equal(record.copyPlan.overlayText[0].id, 'promotional_price');
});

test('Amazon main-image restrictions do not leak into alternate slots', () => {
    const { api } = loadApp();
    api.setState(baseState('amazon-jp', 'home'));

    const main = api.buildPromptRecord(0).prompt;
    const alternate = api.buildPromptRecord(1).prompt;
    assert.match(main, /pure white #FFFFFF/);
    assert.match(main, /no added text, graphics, watermarks/);
    assert.doesNotMatch(alternate, /pure white #FFFFFF/);
});

test('product identity images take priority within the 14-image limit', () => {
    const { api } = loadApp();
    const state = baseState();
    state.productImages = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, name: `p${index}.png` }));
    state.referenceImages = Array.from({ length: 5 }, (_, index) => ({ id: `r${index}`, name: `r${index}.png`, roles: [] }));
    api.setState(state);

    const selected = api.getSelectedAssets();
    assert.equal(selected.productImages.length, 12);
    assert.equal(selected.referenceImages.length, 2);
});

test('Nano Banana request sends one exact slot prompt and all selected images', async () => {
    let requestBody;
    const { api } = loadApp({
        fetch: async (_url, options) => {
            requestBody = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({
                    candidates: [{
                        finishReason: 'STOP',
                        content: { parts: [
                            { text: 'Generated slot.' },
                            { inlineData: { mimeType: 'image/png', data: 'aW1hZ2Ux' } }
                        ] }
                    }]
                })
            };
        }
    });
    const state = baseState('rakuten', 'apparel');
    state.productImages.push({ id: 'p2', name: 'back.png', data: 'data:image/png;base64,AA==' });
    state.referenceImages.push({ id: 'r1', name: 'tone.png', data: 'data:image/png;base64,AA==', roles: ['style'] });
    api.setState(state);
    const record = api.buildPromptRecord(1);

    const images = await api.callNanoBananaAPI(record, api.getSelectedAssets());
    assert.equal(requestBody.generationConfig.imageConfig.aspectRatio, '1:1');
    assert.equal(requestBody.generationConfig.imageConfig.imageSize, '1K');
    assert.equal(requestBody.generationConfig.maxOutputTokens, 32768);
    assert.deepEqual(requestBody.generationConfig.responseModalities, ['TEXT', 'IMAGE']);
    assert.equal(requestBody.contents[0].parts.filter(part => part.inlineData).length, 3);
    assert.match(requestBody.contents[0].parts[0].text, /IMAGE 2 OF 3/);
    assert.match(requestBody.contents[0].parts[0].text, /Return exactly one final image for this slot/);
    assert.match(requestBody.contents[0].parts[0].text, /AVOID DUPLICATING SIBLING SLOTS/);
    assert.equal(requestBody.contents[0].parts[0].text.match(/PRODUCT IDENTITY - MUST PRESERVE/g).length, 1);
    assert.equal(images.length, 1);
    assert.match(images[0].imageUrl, /aW1hZ2Ux$/);
});

test('output export excludes local source and reference image binaries', async () => {
    let exportedText;
    let createdBlob;
    const link = { click() { exportedText = createdBlob; } };
    const { api } = loadApp({
        Blob: class TestBlob {
            constructor(parts) { createdBlob = parts.join(''); }
        },
        document: {
            addEventListener() {},
            getElementById() { return null; },
            createElement() { return link; }
        }
    });
    const state = baseState();
    state.currentBatch = {
        id: 'batch-1',
        platform: state.platform,
        category: state.category,
        imageCount: 1,
        inputs: {
            productImages: [{ data: 'SOURCE_SECRET' }],
            referenceImages: [{ data: 'REFERENCE_SECRET' }]
        },
        promptRecords: [{ id: 'prompt-1', prompt: 'Create image' }],
        outputRecords: [{ promptId: 'prompt-1', status: 'success', imageUrl: 'OUTPUT_IMAGE' }]
    };
    api.setState(state);

    api.exportCurrentBatch();
    assert.match(exportedText, /OUTPUT_IMAGE/);
    assert.doesNotMatch(exportedText, /SOURCE_SECRET|REFERENCE_SECRET/);
});

test('compiled prompts are saved before per-slot generation and each outcome is persisted', async () => {
    const elements = {
        'generate-btn': { disabled: false, textContent: '' },
        'results-container': { innerHTML: '' },
        'history-container': { innerHTML: '' },
        'export-btn': { disabled: true }
    };
    const saved = [];
    const { context, api } = loadApp({
        alert() {},
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { className: '', innerHTML: '', appendChild() {} }; }
        }
    });
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 2;
    api.setState(state);
    let callCount = 0;
    const renderedCounts = [];
    context.saveBatch = async batch => {
        saved.push(JSON.parse(JSON.stringify(batch)));
        return batch.id;
    };
    context.loadHistory = async () => {};
    context.renderResults = results => renderedCounts.push(results.length);
    context.callNanoBananaAPI = async record => {
        callCount += 1;
        return [{ imageUrl: `data:image/png;base64,${record.index}`, metadata: { status: 'completed' } }];
    };

    await api.generatePrompts();
    assert.equal(callCount, 2);
    assert.equal(saved[0].promptRecords.length, 2);
    assert.equal(saved[0].outputRecords.length, 0);
    assert.equal(saved.length, 4);
    const finalBatch = saved.at(-1);
    assert.equal(finalBatch.outputRecords[0].status, 'success');
    assert.equal(finalBatch.outputRecords[1].status, 'success');
    assert.equal(finalBatch.outputRecords[0].promptId, finalBatch.promptRecords[0].id);
    assert.equal(finalBatch.outputRecords[1].promptId, finalBatch.promptRecords[1].id);
    assert.equal(finalBatch.status, 'completed');
    assert.deepEqual(renderedCounts, [2]);
});

test('generateSlotsWithConcurrency completes a single slot with direct prompt mapping', async () => {
    const { context, api } = loadApp();
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 1;
    api.setState(state);
    const records = api.compilePromptRecords();
    context.callNanoBananaAPI = async record => [{
        imageUrl: 'data:image/png;base64,T05F',
        metadata: { slot: record.index }
    }];

    const outputs = await api.generateSlotsWithConcurrency(records, api.getSelectedAssets(), 2);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].status, 'success');
    assert.equal(outputs[0].promptId, records[0].id);
    assert.equal(outputs[0].index, records[0].index);
});

test('generateSlotsWithConcurrency records one slot failure without losing successes', async () => {
    const { context, api } = loadApp();
    const state = baseState('rakuten', 'home');
    state.imageCount = 3;
    api.setState(state);
    const records = api.compilePromptRecords();
    context.callNanoBananaAPI = async record => {
        if (record.index === 2) throw new Error('slot refused');
        return [{ imageUrl: `data:image/png;base64,${record.index}`, metadata: { slot: record.index } }];
    };

    const outputs = await api.generateSlotsWithConcurrency(records, api.getSelectedAssets(), 2);
    assert.deepEqual(Array.from(outputs, output => output.status), ['success', 'failed', 'success']);
    assert.equal(outputs[1].error, 'slot refused');
    assert.deepEqual(
        Array.from(outputs, output => output.promptId),
        Array.from(records, record => record.id)
    );
});

test('generateSlotsWithConcurrency preserves mapping when slots finish out of order', async () => {
    const { context, api } = loadApp();
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 2;
    api.setState(state);
    const records = api.compilePromptRecords();
    const resolvers = new Map();
    context.callNanoBananaAPI = record => new Promise(resolve => {
        resolvers.set(record.index, resolve);
    });

    const pending = api.generateSlotsWithConcurrency(records, api.getSelectedAssets(), 2);
    await new Promise(resolve => setImmediate(resolve));
    resolvers.get(2)([{ imageUrl: 'data:image/png;base64,VFdP', metadata: { slot: 2 } }]);
    await new Promise(resolve => setImmediate(resolve));
    resolvers.get(1)([{ imageUrl: 'data:image/png;base64,T05F', metadata: { slot: 1 } }]);
    const outputs = await pending;

    assert.deepEqual(Array.from(outputs, output => output.index), [1, 2]);
    assert.deepEqual(
        Array.from(outputs, output => output.promptId),
        Array.from(records, record => record.id)
    );
    assert.match(outputs[0].imageUrl, /T05F$/);
    assert.match(outputs[1].imageUrl, /VFdP$/);
});

test('generateSlotsWithConcurrency never exceeds the requested concurrency', async () => {
    const { context, api } = loadApp();
    const state = baseState('shopee-tw', 'electronics');
    state.imageCount = 5;
    api.setState(state);
    const records = api.compilePromptRecords();
    let active = 0;
    let maxActive = 0;
    context.callNanoBananaAPI = async record => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setImmediate(resolve));
        active -= 1;
        return [{ imageUrl: `data:image/png;base64,${record.index}`, metadata: {} }];
    };

    const outputs = await api.generateSlotsWithConcurrency(records, api.getSelectedAssets(), 2);
    assert.equal(outputs.every(output => output.status === 'success'), true);
    assert.equal(maxActive, 2);
});

test('failed per-slot calls persist a failed output for every slot', async () => {
    const elements = {
        'generate-btn': { disabled: false, textContent: '' },
        'results-container': { innerHTML: '' },
        'history-container': { innerHTML: '' },
        'export-btn': { disabled: true }
    };
    const saved = [];
    const { context, api } = loadApp({
        alert() {},
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { className: '', innerHTML: '', appendChild() {} }; }
        }
    });
    const state = baseState('rakuten', 'home');
    state.imageCount = 2;
    api.setState(state);
    context.saveBatch = async batch => {
        saved.push(JSON.parse(JSON.stringify(batch)));
        return batch.id;
    };
    context.loadHistory = async () => {};
    context.renderResults = () => {};
    let callCount = 0;
    context.callNanoBananaAPI = async () => {
        callCount += 1;
        throw new Error('slot refused');
    };

    await api.generatePrompts();
    const batch = saved.at(-1);
    assert.equal(batch.outputRecords.length, 2);
    assert.equal(batch.outputRecords.every(output => output.status === 'failed'), true);
    assert.equal(batch.outputRecords.every(output => output.error === 'slot refused'), true);
    assert.equal(callCount, 2);
    assert.equal(batch.status, 'completed-with-errors');
});

test('prompt preview shapes once, displays compiled prompts, and caches the plan', async () => {
    let apiCalls = 0;
    const options = [];
    const elements = {
        'prompt-preview-dialog': { showModalCalled: false, showModal() { this.showModalCalled = true; } },
        'prompt-preview-select': {
            innerHTML: '',
            value: '',
            appendChild(option) { options.push(option); }
        },
        'prompt-preview-summary': { textContent: '' },
        'prompt-preview-plan': { textContent: '' },
        'prompt-preview-content': { textContent: '' },
        'prompt-preview-model': { textContent: '' },
        'prompt-preview-output': { textContent: '' },
        'prompt-preview-assets': { textContent: '' }
    };
    const { api } = loadApp({
        alert() {},
        async fetch(url) {
            apiCalls += 1;
            assert.equal(url, '/api/shape');
            return {
                ok: true,
                async json() {
                    return { candidates: [{ content: { parts: [{ text: JSON.stringify({
                        resolvedImageCount: 3,
                        batchTone: { character: 'Clear', palette: 'Red and white', mood: 'Direct', finish: 'Clean' },
                        slots: Array.from({ length: 3 }, (_, index) => ({
                            index: index + 1,
                            role: index === 0 ? 'hero' : 'feature-detail',
                            direction: `Direction ${index + 1}`,
                            differentiator: `Distinct ${index + 1}`,
                            sceneRationale: 'Plain view supports verification.',
                            sceneSource: 'shaper',
                            copyPlacement: 'none',
                            derivedFrom: 'open'
                        }))
                    }) }] } }] };
                }
            };
        },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { value: '', textContent: '' }; }
        }
    });
    const state = baseState('shopee-tw', 'food');
    api.setState(state);

    await api.previewPrompts();
    await api.shapeBatch();
    assert.equal(apiCalls, 1);
    assert.equal(options.length, state.imageCount + 1);
    assert.equal(options[0].value, 'batch');
    assert.equal(elements['prompt-preview-dialog'].showModalCalled, true);
    assert.match(elements['prompt-preview-content'].textContent, /SHARED BATCH CONTEXT/);
    assert.match(elements['prompt-preview-content'].textContent, /SLOT 1[\s\S]*SLOT 3/);
    assert.equal(elements['prompt-preview-model'].textContent, 'gemini-3-pro-image');
    assert.equal(elements['prompt-preview-output'].textContent, '1:1, PNG, 1K');
    assert.match(elements['prompt-preview-plan'].textContent, /shaper: Clear/);
});

test('prompt preview shows an immediate busy state while Gemini planning is pending', async () => {
    let resolveFetch;
    const options = [];
    const elements = {
        'preview-prompts-btn': { disabled: false, textContent: '', dataset: {} },
        'generate-btn': { disabled: false, textContent: '', dataset: {} },
        'task-status': { hidden: true },
        'task-status-title': { textContent: '' },
        'task-status-detail': { textContent: '' },
        'task-status-elapsed': { textContent: '' },
        'prompt-preview-loading-elapsed': { textContent: '' },
        'prompt-preview-loading': { hidden: true },
        'prompt-preview-ready': { hidden: false },
        'prompt-preview-dialog': {
            showModalCalled: false,
            showModal() { this.showModalCalled = true; },
            setAttribute(name, value) { this[name] = value; }
        },
        'prompt-preview-select': { innerHTML: '', value: '', appendChild(option) { options.push(option); } },
        'prompt-preview-summary': { textContent: '' },
        'prompt-preview-plan': { textContent: '' },
        'prompt-preview-content': { textContent: '' },
        'prompt-preview-model': { textContent: '' },
        'prompt-preview-output': { textContent: '' },
        'prompt-preview-assets': { textContent: '' }
    };
    const { api } = loadApp({
        alert() {},
        fetch() {
            return new Promise(resolve => { resolveFetch = resolve; });
        },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { value: '', textContent: '' }; }
        }
    });
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 1;
    api.setState(state);

    const pendingPreview = api.previewPrompts();
    assert.equal(elements['prompt-preview-dialog'].showModalCalled, true);
    assert.equal(elements['prompt-preview-loading'].hidden, false);
    assert.equal(elements['prompt-preview-ready'].hidden, true);
    assert.equal(elements['task-status'].hidden, false);
    assert.equal(elements['preview-prompts-btn'].disabled, true);
    assert.equal(elements['generate-btn'].disabled, true);
    assert.equal(elements['preview-prompts-btn'].dataset.busy, 'true');
    assert.match(elements['preview-prompts-btn'].textContent, /Building preview/);
    assert.match(elements['task-status-title'].textContent, /Gemini 3\.5/);

    resolveFetch({
        ok: true,
        async json() {
            return { candidates: [{ content: { parts: [{ text: JSON.stringify({
                resolvedImageCount: 1,
                batchTone: { character: 'Clear', palette: 'White', mood: 'Direct', finish: 'Clean' },
                slots: [{ index: 1, role: 'hero', direction: 'Front view', differentiator: 'Only hero', sceneRationale: 'Clear verification', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' }]
            }) }] } }] };
        }
    });
    await pendingPreview;

    assert.equal(elements['prompt-preview-loading'].hidden, true);
    assert.equal(elements['prompt-preview-ready'].hidden, false);
    assert.equal(elements['task-status'].hidden, true);
    assert.equal(elements['preview-prompts-btn'].dataset.busy, 'false');
    assert.equal(elements['preview-prompts-btn'].disabled, false);
    assert.equal(elements['generate-btn'].disabled, false);
});

test('image generation shows locked controls, placeholders, and live Gemini status while pending', async () => {
    const generationResolvers = [];
    let signalGenerationStarted;
    const generationStarted = new Promise(resolve => { signalGenerationStarted = resolve; });
    const elements = {
        'preview-prompts-btn': { disabled: false, textContent: '', dataset: {} },
        'generate-btn': { disabled: false, textContent: '', dataset: {} },
        'task-status': { hidden: true },
        'task-status-title': { textContent: '' },
        'task-status-detail': { textContent: '' },
        'task-status-elapsed': { textContent: '' },
        'generation-status': { hidden: true },
        'generation-status-text': { textContent: '' },
        'results-container': { innerHTML: '' },
        'results-section': {
            setAttribute(name, value) { this[name] = value; },
            scrollIntoView() {}
        },
        'history-container': { innerHTML: '' },
        'export-btn': { disabled: true }
    };
    const { context, api } = loadApp({
        alert() {},
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { className: '', innerHTML: '', appendChild() {} }; }
        }
    });
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 2;
    api.setState(state);
    state.shaperPlan = api.buildFallbackPlan(api.PLATFORM_TEMPLATES['amazon-jp']);
    context.saveBatch = async batch => batch.id;
    context.loadHistory = async () => {};
    context.renderResults = () => {};
    context.callNanoBananaAPI = () => {
        if (generationResolvers.length === 0) signalGenerationStarted();
        return new Promise(resolve => { generationResolvers.push(resolve); });
    };

    const pendingGeneration = api.generatePrompts();
    await generationStarted;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements['generation-status'].hidden, false);
    assert.match(elements['generation-status-text'].textContent, /Starting generation for 2 images/);
    assert.equal(elements['task-status'].hidden, false);
    assert.match(elements['task-status-title'].textContent, /generating your images/);
    assert.match(elements['task-status-detail'].textContent, /several minutes/);
    assert.equal(elements['preview-prompts-btn'].disabled, true);
    assert.equal(elements['generate-btn'].disabled, true);
    assert.equal(elements['generate-btn'].dataset.busy, 'true');
    assert.match(elements['results-container'].innerHTML, /generation-placeholder/);
    assert.match(elements['results-container'].innerHTML, /Image 2/);
    assert.equal(elements['results-section']['aria-busy'], 'true');

    assert.equal(generationResolvers.length, 2);
    generationResolvers[0]([{ imageUrl: 'data:image/png;base64,T05F', metadata: { status: 'completed' } }]);
    generationResolvers[1]([{ imageUrl: 'data:image/png;base64,VFdP', metadata: { status: 'completed' } }]);
    await pendingGeneration;

    assert.equal(elements['generation-status'].hidden, true);
    assert.equal(elements['task-status'].hidden, true);
    assert.equal(elements['generate-btn'].dataset.busy, 'false');
    assert.equal(elements['preview-prompts-btn'].disabled, false);
    assert.equal(elements['generate-btn'].disabled, false);
    assert.equal(elements['results-section']['aria-busy'], 'false');
});

test('Shaper validation repairs invalid roles, slot count, and duplicate differentiators', () => {
    const { api } = loadApp();
    const state = baseState('amazon-jp', 'electronics');
    state.imageCount = 3;
    api.setState(state);
    const plan = api.validateShaperPlan({
        resolvedImageCount: 3,
        batchTone: { character: 'Precise', palette: 'Neutral', mood: 'Calm', finish: 'Crisp' },
        slots: [
            { role: 'invented-role', direction: 'A', differentiator: 'same' },
            { role: 'feature-detail', direction: 'B', differentiator: 'same' }
        ]
    }, api.PLATFORM_TEMPLATES['amazon-jp']);

    assert.equal(plan.slots.length, 3);
    assert.equal(plan.slots[0].index, 1);
    assert.equal(api.SHAPER_ROLES.has(plan.slots[0].role), true);
    assert.notEqual(plan.slots[0].differentiator, plan.slots[1].differentiator);
    assert.equal(plan.slots[2].derivedFrom, 'platform-rule');
});

test('unparseable Shaper output falls back without throwing', () => {
    const { api } = loadApp();
    const state = baseState('rakuten', 'home');
    api.setState(state);
    for (const malformed of ['not json', '', null, {}, { slots: null }]) {
        const plan = api.validateShaperPlan(malformed, api.PLATFORM_TEMPLATES.rakuten);
        assert.equal(plan.planSource, 'fallback');
        assert.equal(plan.slots.length, state.imageCount);
        assert.equal(plan.slots[0].role, 'hero');
    }
});

test('Shaper payload sends product images and the exact precedence chain', () => {
    const { api } = loadApp();
    const state = baseState('shopee-tw', 'beauty');
    state.season = 'Summer 2027';
    state.promotion = 'Launch sale';
    api.setState(state);
    const payload = api.buildShaperPayload(api.PLATFORM_TEMPLATES['shopee-tw']);
    const parts = payload.contents[0].parts;
    assert.match(parts[0].text, /Must Have > platform hard rule > operator Preferred > Shaper > model freedom/);
    assert.match(parts[0].text, /Summer 2027/);
    assert.equal(parts.filter(part => part.inlineData).length, 1);
    assert.equal(payload.generationConfig.responseMimeType, 'application/json');
});

test('valid Shaper plan drives prompt roles, tone, direction, and provenance', () => {
    const { api } = loadApp();
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 1;
    state.shaperPlan = api.validateShaperPlan({
        id: 'plan_test',
        batchTone: { character: 'Clinical', palette: 'White and green', mood: 'Reassuring', finish: 'Soft matte' },
        resolvedImageCount: 1,
        slots: [{ index: 1, role: 'hero', direction: 'Show the exact bottle plainly.', differentiator: 'Only full-pack hero in the batch.', sceneRationale: 'Plain view maximizes verification.', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' }]
    }, api.PLATFORM_TEMPLATES['amazon-jp']);
    api.setState(state);

    const record = api.buildPromptRecord(0);
    assert.equal(record.shaperPlanId, 'plan_test');
    assert.equal(record.planSource, 'shaper');
    assert.equal(record.purpose, 'hero');
    assert.match(record.prompt, /Show the exact bottle plainly/);
    assert.match(record.prompt, /Clinical/);
    assert.match(record.prompt, /pure white #FFFFFF/);
});

test('each slot prompt names sibling differentiators and keeps its own distinct target', () => {
    const { api } = loadApp();
    const state = baseState('rakuten', 'apparel');
    state.imageCount = 3;
    api.setState(state);
    const records = api.compilePromptRecords();

    records.forEach((record, recordIndex) => {
        assert.match(record.prompt, /AVOID DUPLICATING SIBLING SLOTS/);
        state.shaperPlan.slots.forEach((slot, slotIndex) => {
            const expected = slotIndex === recordIndex
                ? `Your differentiator for this slot: "${slot.differentiator}"`
                : slot.differentiator;
            assert.equal(record.prompt.includes(expected), true);
        });
    });
});

test('copy control copies the currently displayed prompt', async () => {
    let copiedText = '';
    const button = {
        title: 'Copy prompt',
        setAttribute(name, value) { this[name] = value; }
    };
    const { api } = loadApp({
        navigator: {
            clipboard: {
                async writeText(value) { copiedText = value; }
            }
        },
        setTimeout() {},
        document: {
            addEventListener() {},
            getElementById(id) {
                if (id === 'prompt-preview-content') return { textContent: 'Exact prompt text' };
                if (id === 'copy-prompt-preview') return button;
                return null;
            },
            createElement() { return {}; }
        },
        window: { setTimeout() {} }
    });

    await api.copyPreviewPrompt();
    assert.equal(copiedText, 'Exact prompt text');
    assert.equal(button.title, 'Copied');
    assert.equal(button['aria-label'], 'Prompt copied');
});

test('validateShaperPlan accepts valid buyerMotivation structure', () => {
    const { api } = loadApp();
    const state = baseState('amazon-jp', 'beauty');
    state.imageCount = 2;
    api.setState(state);
    const plan = api.validateShaperPlan({
        resolvedImageCount: 2,
        batchTone: { character: 'Clean', palette: 'Neutral', mood: 'Trustworthy', finish: 'Polished' },
        productRead: {
            verificationNeed: 'medium',
            purchaseType: 'repeat',
            infoLocation: 'packaging',
            anglesSupplied: 1,
            notes: 'Beauty product',
            buyerMotivation: {
                primary: 'B3_Lifestyle',
                secondary: ['B4_Aesthetic'],
                confidence: 0.78,
                reason: 'Personal care category with design-forward packaging'
            }
        },
        slots: [
            { index: 1, role: 'hero', direction: 'A', differentiator: 'Main view', sceneRationale: 'Clear', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' },
            { index: 2, role: 'lifestyle', direction: 'B', differentiator: 'Usage context', sceneRationale: 'Lifestyle fit', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' }
        ]
    }, api.PLATFORM_TEMPLATES['amazon-jp']);

    assert.equal(plan.productRead.buyerMotivation.primary, 'B3_Lifestyle');
    assert.deepEqual(plan.productRead.buyerMotivation.secondary, ['B4_Aesthetic']);
    assert.equal(plan.productRead.buyerMotivation.confidence, 0.78);
    assert.equal(plan.productRead.buyerMotivation.reason, 'Personal care category with design-forward packaging');
});

test('fallback plan includes buyerMotivation with low confidence', () => {
    const { api } = loadApp();
    const state = baseState('rakuten', 'electronics');
    api.setState(state);
    const plan = api.buildFallbackPlan(api.PLATFORM_TEMPLATES.rakuten);

    assert.equal(plan.productRead.buyerMotivation.primary, 'B1_Functional');
    assert.equal(plan.productRead.buyerMotivation.secondary.length, 0);
    assert.equal(plan.productRead.buyerMotivation.confidence, 0.5);
    assert.equal(plan.productRead.buyerMotivation.reason, 'Fallback to platform template.');
});

test('validateShaperPlan coerces invalid buyerMotivation to fallback', () => {
    const { api } = loadApp();
    const state = baseState('shopee-tw', 'food');
    state.imageCount = 1;
    api.setState(state);
    const plan = api.validateShaperPlan({
        resolvedImageCount: 1,
        batchTone: { character: 'Vibrant', palette: 'Colorful', mood: 'Appetizing', finish: 'Glossy' },
        productRead: {
            verificationNeed: 'low',
            purchaseType: 'repeat',
            infoLocation: 'both',
            anglesSupplied: 1,
            notes: 'Food product',
            buyerMotivation: {
                primary: 'INVALID_CODE',
                confidence: 'not a number'
            }
        },
        slots: [{ index: 1, role: 'hero', direction: 'A', differentiator: 'Main', sceneRationale: 'Clear', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' }]
    }, api.PLATFORM_TEMPLATES['shopee-tw']);

    assert.equal(plan.productRead.buyerMotivation.primary, 'B1_Functional');
    assert.equal(plan.productRead.buyerMotivation.confidence, 0.5);
});

test('Shaper payload includes buyer motivation framework instruction', () => {
    const { api } = loadApp();
    const state = baseState('amazon-jp', 'electronics');
    api.setState(state);
    const payload = api.buildShaperPayload(api.PLATFORM_TEMPLATES['amazon-jp']);
    const promptText = payload.contents[0].parts[0].text;

    // Verify full skill file is embedded
    assert.match(promptText, /Buyer Motivation Framework/);
    assert.match(promptText, /B1 Functional/);
    assert.match(promptText, /B2 Evidence/);
    assert.match(promptText, /B3 Lifestyle/);
    assert.match(promptText, /B4 Aesthetic/);
    assert.match(promptText, /B5 Value/);
    assert.match(promptText, /B6 Convenience/);
    assert.match(promptText, /B7 Expert/);
    assert.match(promptText, /Evidence Discipline/);
    assert.match(promptText, /Hard Prohibitions/);
});

test('Shaper response schema requires buyerMotivation in productRead', () => {
    const { api } = loadApp();
    const state = baseState('rakuten', 'home');
    api.setState(state);
    const payload = api.buildShaperPayload(api.PLATFORM_TEMPLATES.rakuten);
    const schema = payload.generationConfig.responseSchema;

    assert.equal(schema.properties.productRead.required.includes('buyerMotivation'), true);
    assert.equal(schema.properties.productRead.properties.buyerMotivation.type, 'OBJECT');
    assert.equal(schema.properties.productRead.properties.buyerMotivation.required.length, 2);
    assert.equal(schema.properties.productRead.properties.buyerMotivation.required.includes('primary'), true);
    assert.equal(schema.properties.productRead.properties.buyerMotivation.required.includes('confidence'), true);
    assert.equal(schema.properties.productRead.properties.buyerMotivation.properties.primary.type, 'STRING');
    assert.equal(schema.properties.productRead.properties.buyerMotivation.properties.confidence.type, 'NUMBER');
});

test('prompt preview displays buyer motivation when present', async () => {
    const elements = {
        'prompt-preview-dialog': { showModal() {} },
        'prompt-preview-select': { innerHTML: '', value: '', appendChild() {} },
        'prompt-preview-summary': { textContent: '' },
        'prompt-preview-plan': { textContent: '' },
        'prompt-preview-content': { textContent: '' },
        'prompt-preview-model': { textContent: '' },
        'prompt-preview-output': { textContent: '' },
        'prompt-preview-assets': { textContent: '' }
    };
    const { api } = loadApp({
        alert() {},
        async fetch() {
            return {
                ok: true,
                async json() {
                    return { candidates: [{ content: { parts: [{ text: JSON.stringify({
                        resolvedImageCount: 2,
                        batchTone: { character: 'Technical', palette: 'Gray', mood: 'Precise', finish: 'Sharp' },
                        productRead: {
                            verificationNeed: 'high',
                            purchaseType: 'one-off',
                            infoLocation: 'listing',
                            anglesSupplied: 1,
                            notes: 'Technical product',
                            buyerMotivation: {
                                primary: 'B7_Expert',
                                secondary: ['B2_Evidence'],
                                confidence: 0.85,
                                reason: 'Technical category with visible specifications'
                            }
                        },
                        slots: [
                            { index: 1, role: 'hero', direction: 'A', differentiator: 'Main', sceneRationale: 'Clear', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' },
                            { index: 2, role: 'feature-detail', direction: 'B', differentiator: 'Detail', sceneRationale: 'Specs', sceneSource: 'shaper', copyPlacement: 'none', derivedFrom: 'open' }
                        ]
                    }) }] } }] };
                }
            };
        },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { value: '', textContent: '' }; }
        }
    });
    const state = baseState('rakuten', 'electronics');
    state.imageCount = 2;
    api.setState(state);

    await api.previewPrompts();

    assert.match(elements['prompt-preview-plan'].textContent, /B7 Expert/);
    assert.match(elements['prompt-preview-plan'].textContent, /85%/);
});

test('buyer motivation skill file loads and embeds in Shaper payload', () => {
    const { api } = loadApp();
    const state = baseState('amazon-jp', 'beauty');
    api.setState(state);

    const skill = api.loadBuyerMotivationSkill();
    assert.ok(skill !== null, 'Skill file should be loaded');
    assert.match(skill, /Buyer Motivation Framework/);
    assert.match(skill, /B1 Functional/);
    assert.match(skill, /B7 Expert/);
    assert.match(skill, /Role Weighting Guidance/);

    const payload = api.buildShaperPayload(api.PLATFORM_TEMPLATES['amazon-jp']);
    const promptText = payload.contents[0].parts[0].text;

    // Verify the skill content is embedded, not the condensed inline version
    assert.match(promptText, /Buyer Motivation Framework/);
    assert.match(promptText, /Evidence Discipline/);
    assert.match(promptText, /Hard Prohibitions/);
});
