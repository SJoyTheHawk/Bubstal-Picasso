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
        ...overrides
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    vm.runInContext(`${source}\n;globalThis.testApi = {\n` +
        'PLATFORM_TEMPLATES, CATEGORY_PRESETS, buildPromptRecord, compilePromptRecords, getSelectedAssets, generatePrompts, previewPrompts, copyPreviewPrompt, ' +
        'callNanoBananaAPI, exportCurrentBatch, setState(value) { state = value; }, getState() { return state; }\n' +
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

test('Nano Banana request includes every selected image and the slot aspect ratio', async () => {
    let requestBody;
    const { api } = loadApp({
        fetch: async (_url, options) => {
            requestBody = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({ output_image: { mime_type: 'image/png', data: 'ZmFrZQ==' } })
            };
        }
    });
    const state = baseState('rakuten', 'apparel');
    state.productImages.push({ id: 'p2', name: 'back.png', data: 'data:image/png;base64,AA==' });
    state.referenceImages.push({ id: 'r1', name: 'tone.png', data: 'data:image/png;base64,AA==', roles: ['style'] });
    api.setState(state);
    const record = api.buildPromptRecord(0);

    await api.callNanoBananaAPI(record, api.getSelectedAssets());
    assert.equal(requestBody.response_format.aspect_ratio, '1:1');
    assert.equal(requestBody.response_format.image_size, '2K');
    assert.equal(requestBody.input.filter(item => item.type === 'image').length, 3);
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

test('compiled prompts and each failed or successful output are saved incrementally', async () => {
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
    context.saveBatch = async batch => {
        saved.push(JSON.parse(JSON.stringify(batch)));
        return batch.id;
    };
    context.loadHistory = async () => {};
    context.renderResults = () => {};
    context.callNanoBananaAPI = async () => {
        callCount += 1;
        if (callCount === 2) throw new Error('simulated failure');
        return { imageUrl: 'data:image/png;base64,T1VU', metadata: { status: 'completed' } };
    };

    await api.generatePrompts();
    assert.equal(saved[0].promptRecords.length, 2);
    assert.equal(saved[0].outputRecords.length, 0);
    assert.equal(saved[1].outputRecords[0].status, 'success');
    assert.equal(saved[2].outputRecords[1].status, 'failed');
    assert.equal(saved.at(-1).status, 'completed-with-errors');
});

test('prompt preview displays compiled prompts without authentication or API calls', () => {
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
        'prompt-preview-content': { textContent: '' },
        'prompt-preview-model': { textContent: '' },
        'prompt-preview-output': { textContent: '' },
        'prompt-preview-assets': { textContent: '' }
    };
    const { api } = loadApp({
        alert() {},
        fetch() {
            apiCalls += 1;
            throw new Error('Preview must not call fetch');
        },
        document: {
            addEventListener() {},
            getElementById(id) { return elements[id] || null; },
            createElement() { return { value: '', textContent: '' }; }
        }
    });
    const state = baseState('shopee-tw', 'food');
    state.authReady = false;
    api.setState(state);

    api.previewPrompts();
    assert.equal(apiCalls, 0);
    assert.equal(options.length, state.imageCount);
    assert.equal(elements['prompt-preview-dialog'].showModalCalled, true);
    assert.match(elements['prompt-preview-content'].textContent, /Create a new Shopee TW/);
    assert.equal(elements['prompt-preview-model'].textContent, 'gemini-3-pro-image');
    assert.equal(elements['prompt-preview-output'].textContent, '1:1, PNG, 2K');
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
