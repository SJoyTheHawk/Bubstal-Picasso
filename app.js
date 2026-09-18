const MODEL_ID = 'gemini-3-pro-image';
const SHAPER_MODEL_ID = 'gemini-3.5-flash';
const PROMPT_FORMAT_VERSION = '3.0';
const PLAN_FORMAT_VERSION = '1.0';
const MAX_INPUT_IMAGES = 14;
// The image model accepts fixed size tiers only (512px, 1K, 2K, 4K).
const IMAGE_SIZE = '1K';
const SHAPER_ROLES = Object.freeze(new Set([
    'hero', 'benefit', 'feature-detail', 'material-detail', 'scale', 'usage',
    'alternate-view', 'package-contents', 'lifestyle'
]));

function uiText(key, variables = {}, fallback = key) {
    return typeof window !== 'undefined' && window.BubstalI18n
        ? window.BubstalI18n.t(key, variables)
        : fallback;
}

function localizedPurpose(purpose) {
    const key = String(purpose || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    return uiText(`purpose.${key}`, {}, purpose);
}

function localizedCategory(categoryId) {
    return uiText(`category.${categoryId}`, {}, CATEGORY_PRESETS[categoryId]?.name || categoryId);
}

function localizedPlatform(platformId) {
    return uiText(`platform.${platformId}`, {}, PLATFORM_TEMPLATES[platformId]?.name || platformId);
}

// Marketplace presets are practical production guidance, not legal certification.
const PLATFORM_TEMPLATES = {
    'amazon-jp': {
        name: 'Amazon.co.jp',
        imageCount: 7,
        minImageCount: 1,
        maxImageCount: 10,
        aspectRatio: '1:1',
        imagePurposes: [
            'Main product image',
            'Primary feature detail',
            'Secondary feature detail',
            'Lifestyle context',
            'Size and scale',
            'Product in use',
            'Package contents'
        ],
        tone: 'Clean, trustworthy, accurate product photography with restrained styling.',
        slotRules: [
            'Show only the actual product for sale on a pure white #FFFFFF background. Center it, keep it fully visible, let it fill about 85% of the frame, and include no added text, graphics, watermarks, borders, props, or accessories not included with the product.',
            'Show one supplied product feature clearly in a close detail view. Keep the product recognizable and avoid unsupported labels or claims.',
            'Show a different supplied product feature clearly. Use a distinct composition from the previous image.',
            'Place the product in a believable usage setting with only contextually appropriate props. Do not imply items are included unless supplied as product facts.',
            'Communicate scale using a believable environment or familiar neutral reference. Do not invent measurements; reserve space for exact supplied dimensions when needed.',
            'Demonstrate a realistic use case without changing the product or implying unsupported performance.',
            'Show only packaging, accessories, and components confirmed by the supplied product facts and photos.'
        ],
        constraints: [
            { id: 'key_features', label: 'Key Features (3-5 points)', type: 'textarea', defaultLevel: 'preferred' },
            { id: 'exact_claims', label: 'Approved Claims', type: 'textarea', defaultLevel: 'locked' },
            { id: 'brand_logo', label: 'Brand Treatment', type: 'text', defaultLevel: 'preferred' },
            { id: 'safety_text', label: 'Safety/Legal Text', type: 'textarea', defaultLevel: 'locked' },
            { id: 'background_style', label: 'Preferred Background Style', type: 'text', defaultLevel: 'preferred' },
            { id: 'props', label: 'Preferred Props/Context', type: 'text', defaultLevel: 'preferred' }
        ]
    },
    'shopee-tw': {
        name: 'Shopee TW',
        imageCount: 9,
        minImageCount: 1,
        maxImageCount: 10,
        aspectRatio: '1:1',
        imagePurposes: [
            'Promotional hero',
            'Primary customer benefit',
            'Primary feature',
            'Secondary feature',
            'Material or finish detail',
            'Size and scale',
            'Package contents',
            'Alternate product view',
            'Lifestyle usage scene'
        ],
        tone: 'Clear, energetic eCommerce imagery with strong product visibility and an original promotional composition.',
        slotRules: [
            'Make the product the unmistakable focal point and leave usable space for supplied promotional copy.',
            'Visualize one supplied customer benefit without inventing performance or before-and-after results.',
            'Communicate one supplied feature through the product itself, a detail view, or a simple visual demonstration.',
            'Communicate a different supplied feature using a new composition rather than repeating the previous layout.',
            'Reveal the real material, surface, texture, or finish accurately from the product references.',
            'Communicate scale without inventing dimensions; reserve space for exact supplied measurements when needed.',
            'Show only the bundle, packaging, and accessories confirmed by supplied facts and photos.',
            'Use a fresh camera angle or crop that reveals another useful part of the actual product.',
            'Show a believable use moment for the target customer without changing the product or making unsupported claims.'
        ],
        constraints: [
            { id: 'promotional_price', label: 'Price & Discount Info', type: 'text', defaultLevel: 'locked' },
            { id: 'key_selling_points', label: 'Key Selling Points', type: 'textarea', defaultLevel: 'locked' },
            { id: 'promotional_message', label: 'Short Promotional Headline', type: 'text', defaultLevel: 'preferred' },
            { id: 'brand_colors', label: 'Brand Colors (hex codes)', type: 'text', defaultLevel: 'preferred' },
            { id: 'lifestyle_context', label: 'Lifestyle Scene Context', type: 'text', defaultLevel: 'preferred' },
            { id: 'safety_text', label: 'Safety/Legal Text', type: 'textarea', defaultLevel: 'locked' },
            { id: 'background_props', label: 'Preferred Background Props', type: 'text', defaultLevel: 'preferred' }
        ]
    },
    'rakuten': {
        name: 'Rakuten',
        imageCount: 7,
        minImageCount: 1,
        maxImageCount: 10,
        aspectRatio: '1:1',
        imagePurposes: [
            'Main product image',
            'Primary feature',
            'Quality and material detail',
            'Size and scale',
            'Secondary feature',
            'Typical use environment',
            'Packaging and included accessories'
        ],
        tone: 'Detailed, reliable product photography with accurate color and an informative but uncluttered presentation.',
        slotRules: [
            'Present the complete product clearly against a clean, simple background. Keep added decoration restrained.',
            'Show one supplied feature clearly without adding unsupported specifications or claims.',
            'Use a close view to communicate the actual material, construction, or finish seen in the references.',
            'Communicate scale without inventing dimensions; reserve space for exact supplied measurements when needed.',
            'Show a different supplied feature with an original layout and useful product angle.',
            'Place the product in a believable typical-use environment without implying unsupported capabilities.',
            'Show only packaging, accessories, and components confirmed by supplied facts and photos.'
        ],
        constraints: [
            { id: 'specifications', label: 'Product Specifications', type: 'textarea', defaultLevel: 'locked' },
            { id: 'quality_claims', label: 'Approved Quality/Material Claims', type: 'textarea', defaultLevel: 'locked' },
            { id: 'size_info', label: 'Size/Dimension Information', type: 'text', defaultLevel: 'preferred' },
            { id: 'trust_markers', label: 'Trust Markers (warranty, certification)', type: 'text', defaultLevel: 'preferred' },
            { id: 'brand_identity', label: 'Brand Treatment', type: 'text', defaultLevel: 'preferred' },
            { id: 'safety_text', label: 'Safety/Legal Text', type: 'textarea', defaultLevel: 'locked' }
        ]
    }
};

const CATEGORY_PRESETS = {
    beauty: {
        name: 'Beauty & Personal Care',
        guidance: 'Preserve packaging shape, cap or dispenser, label placement, shade, product texture, and finish. Show application only when supported by the supplied product facts. Do not invent cosmetic, medical, or performance claims.'
    },
    electronics: {
        name: 'Electronics & Appliances',
        guidance: 'Preserve geometry, controls, ports, displays, materials, and supplied accessories. Keep screens and indicators believable. Do not invent connectivity, capacity, compatibility, or performance.'
    },
    apparel: {
        name: 'Apparel & Accessories',
        guidance: 'Preserve garment or accessory color, pattern, fabric appearance, construction, hardware, and silhouette. Keep fit and drape believable and do not invent unseen details.'
    },
    food: {
        name: 'Food & Beverage',
        guidance: 'Preserve packaging, label, quantity, color, and product appearance. Treat serving scenes as suggestions, distinguish props from included items, and do not invent ingredients, nutrition, origin, or health claims.'
    },
    home: {
        name: 'Home & Living',
        guidance: 'Preserve form, material, finish, construction, dimensions when supplied, and included components. Keep room scale believable and make contextual props clearly separate from the product.'
    }
};

const OVERLAY_CONSTRAINT_IDS = new Set([
    'promotional_price',
    'safety_text',
    'specifications',
    'quality_claims',
    'size_info',
    'trust_markers',
    'exact_claims'
]);

// ===== STATE =====
let state = {
    platform: 'amazon-jp',
    imageCount: 7,
    category: 'beauty',
    productName: '',
    productVariant: '',
    categoryFacts: '',
    categoryPreference: '',
    productImages: [],
    referenceImages: [],
    constraints: {},
    batchDirection: '',
    season: '',
    promotion: '',
    shaperPlan: null,
    imageCountTouched: false,
    currentBatch: null,
    authReady: false
};

// ===== INDEXEDDB SETUP =====
let db;
let activeTask = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BubstalPicasoDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('batches')) {
                const store = db.createObjectStore('batches', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

function saveBatch(batch) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['batches'], 'readwrite');
        const store = transaction.objectStore('batches');
        const request = store.put(batch);

        request.onsuccess = () => resolve(batch.id);
        request.onerror = () => reject(request.error);
    });
}

function loadBatches() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['batches'], 'readonly');
        const store = transaction.objectStore('batches');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteBatch(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['batches'], 'readwrite');
        const store = transaction.objectStore('batches');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ===== IMAGE HANDLING =====
function setupDropzone(dropzoneId, fileInputId, onFilesAdded) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(fileInputId);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files, onFilesAdded);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, onFilesAdded);
        e.target.value = '';
    });

    dropzone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });
}

function handleFiles(files, callback) {
    const supportedImageExtension = /\.(?:jpe?g|png|webp)$/i;
    const imageFiles = Array.from(files).filter(file =>
        file.type.startsWith('image/') || supportedImageExtension.test(file.name)
    );

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            callback(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    });
}

function renderProductImages() {
    const container = document.getElementById('product-preview');
    container.innerHTML = '';

    state.productImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${img.data}" alt="${escapeHtml(uiText('media.productAlt', { index: index + 1 }, `Product ${index + 1}`))}">
            <button type="button" class="remove-btn" aria-label="${escapeHtml(uiText('media.removeProduct', { index: index + 1 }, `Remove product image ${index + 1}`))}" onclick="removeProductImage(${index})">×</button>
        `;
        container.appendChild(item);
    });
}

function renderReferenceImages() {
    const container = document.getElementById('reference-preview');
    container.innerHTML = '';

    state.referenceImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'reference-preview-item';
        item.innerHTML = `
            <div class="reference-preview-content">
                <img src="${img.data}" alt="${escapeHtml(uiText('media.referenceAlt', { index: index + 1 }, `Reference ${index + 1}`))}">
                <div class="reference-roles">
                    <h4>${escapeHtml(uiText('reference.type', {}, 'Reference type'))}</h4>
                    <div class="role-checkboxes">
                        <label>
                            <input type="checkbox" ${img.roles.includes('style') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'style')">
                            ${escapeHtml(uiText('reference.style', {}, 'Style reference'))}
                        </label>
                        <label>
                            <input type="checkbox" ${img.roles.includes('layout') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'layout')">
                            ${escapeHtml(uiText('reference.layout', {}, 'Layout reference'))}
                        </label>
                        <label>
                            <input type="checkbox" ${img.roles.includes('color') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'color')">
                            ${escapeHtml(uiText('reference.color', {}, 'Color reference'))}
                        </label>
                    </div>
                </div>
            </div>
            <button type="button" class="remove-btn" aria-label="${escapeHtml(uiText('media.removeReference', { index: index + 1 }, `Remove reference image ${index + 1}`))}" onclick="removeReferenceImage(${index})">×</button>
        `;
        container.appendChild(item);
    });
}

// ===== CONSTRAINT RENDERING =====
function renderConstraints() {
    const container = document.getElementById('constraint-list');
    const template = PLATFORM_TEMPLATES[state.platform];

    container.innerHTML = '';

    template.constraints.forEach(constraint => {
        const label = uiText(`constraint.${constraint.id}`, {}, constraint.label);
        const savedConstraint = state.constraints[constraint.id] || {
            enabled: false,
            level: constraint.defaultLevel || 'preferred',
            value: constraint.defaultValue || ''
        };

        const item = document.createElement('div');
        item.className = `constraint-item ${savedConstraint.enabled ? savedConstraint.level : 'disabled'}`;
        item.id = `constraint-${constraint.id}`;

        const inputTag = constraint.type === 'textarea'
            ? `<textarea rows="3" placeholder="${escapeHtml(uiText('rules.inputPlaceholder', { label }, `Enter ${label.toLowerCase()}...`))}" ${!savedConstraint.enabled ? 'disabled' : ''}>${escapeHtml(savedConstraint.value)}</textarea>`
            : `<input type="text" placeholder="${escapeHtml(uiText('rules.inputPlaceholder', { label }, `Enter ${label.toLowerCase()}...`))}" value="${escapeHtml(savedConstraint.value)}" ${!savedConstraint.enabled ? 'disabled' : ''}>`;

        item.innerHTML = `
            <div class="constraint-header">
                <input type="checkbox" id="check-${constraint.id}" ${savedConstraint.enabled ? 'checked' : ''}
                       onchange="toggleConstraint('${constraint.id}')">
                <label for="check-${constraint.id}">${escapeHtml(label)}</label>
                <div class="level-toggle">
                    <button class="level-btn locked ${savedConstraint.level === 'locked' ? 'active' : ''}"
                            onclick="setConstraintLevel('${constraint.id}', 'locked')"
                            ${!savedConstraint.enabled ? 'disabled' : ''}>
                        ${escapeHtml(uiText('policy.must', {}, 'Must Have'))}
                    </button>
                    <button class="level-btn preferred ${savedConstraint.level === 'preferred' ? 'active' : ''}"
                            onclick="setConstraintLevel('${constraint.id}', 'preferred')"
                            ${!savedConstraint.enabled ? 'disabled' : ''}>
                        ${escapeHtml(uiText('policy.preferred', {}, 'Preferred'))}
                    </button>
                </div>
            </div>
            <div class="constraint-input">
                ${inputTag}
            </div>
        `;

        container.appendChild(item);

        // Add input listeners
        const input = item.querySelector('input[type="text"], textarea');
        if (input) {
            input.addEventListener('input', (e) => {
                updateConstraintValue(constraint.id, e.target.value);
            });
        }
    });
}

// ===== CONSTRAINT INTERACTIONS =====
function toggleConstraint(id) {
    const constraint = state.constraints[id] || {};
    constraint.enabled = !constraint.enabled;

    if (!state.constraints[id]) {
        const template = PLATFORM_TEMPLATES[state.platform];
        const templateConstraint = template.constraints.find(c => c.id === id);
        constraint.level = templateConstraint.defaultLevel || 'preferred';
        constraint.value = templateConstraint.defaultValue || '';
    }

    state.constraints[id] = constraint;
    markInputsChanged();
    renderConstraints();
}

function setConstraintLevel(id, level) {
    if (!state.constraints[id]) return;
    state.constraints[id].level = level;
    markInputsChanged();
    renderConstraints();
}

function updateConstraintValue(id, value) {
    if (!state.constraints[id]) {
        state.constraints[id] = { enabled: false, level: 'preferred', value: '' };
    }
    state.constraints[id].value = value;
    markInputsChanged();
}

// ===== IMAGE MANAGEMENT =====
window.removeProductImage = function(index) {
    state.productImages.splice(index, 1);
    markInputsChanged();
    renderProductImages();
};

window.removeReferenceImage = function(index) {
    state.referenceImages.splice(index, 1);
    markInputsChanged();
    renderReferenceImages();
};

window.toggleReferenceRole = function(index, role) {
    const img = state.referenceImages[index];
    if (!img) return;

    const roleIndex = img.roles.indexOf(role);
    if (roleIndex > -1) {
        img.roles.splice(roleIndex, 1);
    } else {
        img.roles.push(role);
    }
    markInputsChanged();
};

// ===== PROMPT BUILDING =====
function getActiveConstraints(template) {
    return template.constraints.flatMap(definition => {
        const value = state.constraints[definition.id];
        if (!value?.enabled || !value.value?.trim()) return [];

        return [{
            id: definition.id,
            label: definition.label,
            level: value.level === 'locked' ? 'must-have' : 'preferred',
            value: value.value.trim()
        }];
    });
}

function getSelectedAssets() {
    const productImages = state.productImages.slice(0, MAX_INPUT_IMAGES);
    const remainingSlots = Math.max(0, MAX_INPUT_IMAGES - productImages.length);
    const referenceImages = state.referenceImages.slice(0, remainingSlots);

    return { productImages, referenceImages };
}

function buildCopyPlan(constraints, imageIndex) {
    const shapedPlacement = state.shaperPlan?.planSource === 'shaper'
        ? state.shaperPlan.slots?.[imageIndex]?.copyPlacement
        : null;
    if (shapedPlacement) {
        const reserveSlots = state.shaperPlan.slots
            .map((slot, index) => slot.copyPlacement === 'reserve-overlay-area' ? index : -1)
            .filter(index => index >= 0);
        const overlayItems = constraints.filter(item => OVERLAY_CONSTRAINT_IDS.has(item.id));
        const overlayText = shapedPlacement === 'reserve-overlay-area'
            ? overlayItems.filter((_, index) => reserveSlots[index % reserveSlots.length] === imageIndex)
            : [];
        const headline = constraints.find(item => item.id === 'promotional_message');
        const modelRenderedText = shapedPlacement === 'model-rendered' && headline && state.platform !== 'amazon-jp'
            ? [{ label: headline.label, value: headline.value }]
            : [];
        return { modelRenderedText, overlayText };
    }
    const lastSlot = Math.max(0, state.imageCount - 1);
    const copySlot = {
        promotional_price: 0,
        trust_markers: 0,
        specifications: Math.min(1, lastSlot),
        exact_claims: Math.min(1, lastSlot),
        quality_claims: Math.min(2, lastSlot),
        size_info: Math.min(3, lastSlot),
        safety_text: lastSlot
    };

    const overlayText = constraints.filter(item => (
        OVERLAY_CONSTRAINT_IDS.has(item.id) && copySlot[item.id] === imageIndex
    ));
    const headline = constraints.find(item => item.id === 'promotional_message');
    const modelRenderedText = headline && imageIndex === 0 && state.platform !== 'amazon-jp'
        ? [{ label: headline.label, value: headline.value }]
        : [];

    return { modelRenderedText, overlayText };
}

function roleForPurpose(purpose, index) {
    const text = String(purpose || '').toLowerCase();
    if (text.includes('hero') || text.includes('main product')) return 'hero';
    if (text.includes('benefit')) return 'benefit';
    if (text.includes('material') || text.includes('quality') || text.includes('finish')) return 'material-detail';
    if (text.includes('scale') || text.includes('size')) return 'scale';
    if (text.includes('package') || text.includes('packaging')) return 'package-contents';
    if (text.includes('lifestyle') || text.includes('environment') || text.includes('context')) return 'lifestyle';
    if (text.includes('use')) return 'usage';
    if (text.includes('alternate')) return 'alternate-view';
    if (text.includes('feature')) return 'feature-detail';
    return index === 0 ? 'hero' : 'feature-detail';
}

function fallbackCopyPlacement(template, index, count) {
    const lastSlot = Math.max(0, count - 1);
    const copySlot = {
        promotional_price: 0, trust_markers: 0, specifications: Math.min(1, lastSlot),
        exact_claims: Math.min(1, lastSlot), quality_claims: Math.min(2, lastSlot),
        size_info: Math.min(3, lastSlot), safety_text: lastSlot
    };
    const ids = Object.keys(copySlot).filter(id => copySlot[id] === index);
    return ids.length ? 'reserve-overlay-area' : (index === 0 && template.name !== 'Amazon.co.jp' ? 'model-rendered' : 'none');
}

function buildFallbackPlan(template = PLATFORM_TEMPLATES[state.platform]) {
    const count = Math.max(template.minImageCount, Math.min(state.imageCount || template.imageCount, template.maxImageCount));
    const slots = Array.from({ length: count }, (_, index) => ({
        index: index + 1,
        role: roleForPurpose(template.imagePurposes[index], index),
        direction: template.slotRules[index] || 'Create a useful additional product view with a new composition that fits the shared batch tone.',
        differentiator: template.imagePurposes[index] || `Additional product view ${index + 1}`,
        sceneRationale: 'Static platform guidance; use a plain product view unless the platform rule calls for context.',
        sceneSource: 'operator',
        copyPlacement: fallbackCopyPlacement(template, index, count),
        derivedFrom: 'platform-rule'
    }));
    return {
        planFormatVersion: PLAN_FORMAT_VERSION,
        id: generateId('plan'),
        planSource: 'fallback',
        shapedAt: new Date().toISOString(),
        model: SHAPER_MODEL_ID,
        productRead: { verificationNeed: 'medium', purchaseType: 'one-off', infoLocation: 'both', anglesSupplied: state.productImages?.length || 0, notes: 'Fallback to platform template.' },
        batchTone: { character: template.tone, palette: 'Accurate product colors', mood: 'Trustworthy', finish: 'Polished product photography' },
        resolvedImageCount: count,
        countRationale: 'Use the platform template count.',
        slots
    };
}

function parseShaperResponse(raw) {
    if (raw && typeof raw === 'object') return raw;
    const text = typeof raw === 'string' ? raw : '';
    const unfenced = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    try { return JSON.parse(unfenced); } catch (_) { return null; }
}

function validateShaperPlan(raw, template = PLATFORM_TEMPLATES[state.platform]) {
    const parsed = parseShaperResponse(raw);
    if (!parsed || !Array.isArray(parsed.slots)) return buildFallbackPlan(template);
    const fallback = buildFallbackPlan(template);
    const targetCount = state.imageCountTouched
        ? Math.max(template.minImageCount, Math.min(Number(state.imageCount) || template.imageCount, template.maxImageCount))
        : Math.max(template.minImageCount, Math.min(Number(parsed.resolvedImageCount) || template.imageCount, template.maxImageCount));
    const sourceSlots = new Map(parsed.slots.map((slot, position) => [Number(slot?.index) || position + 1, slot]));
    const slots = Array.from({ length: targetCount }, (_, index) => {
        const candidate = sourceSlots.get(index + 1);
        if (!candidate || typeof candidate !== 'object') {
            const repaired = fallback.slots[index] || fallback.slots[fallback.slots.length - 1];
            return { ...repaired, index: index + 1 };
        }
        const fallbackSlot = fallback.slots[index] || fallback.slots[fallback.slots.length - 1];
        const role = SHAPER_ROLES.has(candidate.role) ? candidate.role : fallbackSlot.role;
        return {
            index: index + 1,
            role,
            direction: String(candidate.direction || fallbackSlot.direction),
            differentiator: String(candidate.differentiator || fallbackSlot.differentiator),
            sceneRationale: String(candidate.sceneRationale || fallbackSlot.sceneRationale),
            sceneSource: candidate.sceneSource === 'operator' ? 'operator' : 'shaper',
            copyPlacement: ['none', 'model-rendered', 'reserve-overlay-area'].includes(candidate.copyPlacement) ? candidate.copyPlacement : fallbackSlot.copyPlacement,
            derivedFrom: candidate.derivedFrom === 'platform-rule' ? 'platform-rule' : 'open'
        };
    });
    const accuracyCritical = getActiveConstraints(template).some(item => OVERLAY_CONSTRAINT_IDS.has(item.id));
    if (accuracyCritical && !slots.some(slot => slot.copyPlacement === 'reserve-overlay-area')) {
        const fallbackReserveIndex = fallback.slots.findIndex(slot => slot.copyPlacement === 'reserve-overlay-area');
        slots[Math.max(0, fallbackReserveIndex)].copyPlacement = 'reserve-overlay-area';
    }
    const seen = new Set();
    slots.forEach((slot, index) => {
        let key = slot.differentiator.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        const nearDuplicate = Array.from(seen).some(previous => key.length > 10 && (key.includes(previous) || previous.includes(key)));
        if (!key || seen.has(key) || nearDuplicate) {
            slot.differentiator = fallback.slots[index]?.differentiator || `Distinct product view ${index + 1}`;
            key = slot.differentiator.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        }
        seen.add(key);
    });
    const tone = parsed.batchTone && typeof parsed.batchTone === 'object' ? parsed.batchTone : fallback.batchTone;
    return {
        planFormatVersion: PLAN_FORMAT_VERSION,
        id: String(parsed.id || generateId('plan')),
        planSource: parsed.planSource === 'fallback' ? 'fallback' : 'shaper',
        shapedAt: String(parsed.shapedAt || new Date().toISOString()),
        model: String(parsed.model || SHAPER_MODEL_ID),
        productRead: {
            verificationNeed: ['low', 'medium', 'high'].includes(parsed.productRead?.verificationNeed) ? parsed.productRead.verificationNeed : fallback.productRead.verificationNeed,
            purchaseType: ['repeat', 'one-off'].includes(parsed.productRead?.purchaseType) ? parsed.productRead.purchaseType : fallback.productRead.purchaseType,
            infoLocation: ['packaging', 'listing', 'both'].includes(parsed.productRead?.infoLocation) ? parsed.productRead.infoLocation : fallback.productRead.infoLocation,
            anglesSupplied: Math.max(0, Number.parseInt(parsed.productRead?.anglesSupplied, 10) || fallback.productRead.anglesSupplied),
            notes: String(parsed.productRead?.notes || fallback.productRead.notes)
        },
        batchTone: {
            character: String(tone.character || fallback.batchTone.character),
            palette: String(tone.palette || fallback.batchTone.palette),
            mood: String(tone.mood || fallback.batchTone.mood),
            finish: String(tone.finish || fallback.batchTone.finish)
        },
        resolvedImageCount: targetCount,
        countRationale: String(parsed.countRationale || fallback.countRationale),
        slots
    };
}

function buildShaperPayload(template) {
    const assets = getSelectedAssets();
    const constraints = getActiveConstraints(template);
    const schema = JSON.stringify({
        planFormatVersion: PLAN_FORMAT_VERSION,
        id: 'plan_<unique id>', planSource: 'shaper', shapedAt: '<ISO timestamp>', model: SHAPER_MODEL_ID,
        productRead: { verificationNeed: 'low|medium|high', purchaseType: 'repeat|one-off', infoLocation: 'packaging|listing|both', anglesSupplied: 1, notes: '<short factual observation>' },
        batchTone: { character: '<shared character>', palette: '<shared palette>', mood: '<shared mood>', finish: '<shared finish>' },
        resolvedImageCount: template.imageCount, countRationale: '<short reason>',
        slots: [{ index: 1, role: 'hero', direction: '<what this slot communicates>', differentiator: '<how it differs from all sibling slots>', sceneRationale: '<why a scene or plain view is correct>', sceneSource: 'shaper|operator', copyPlacement: 'none|model-rendered|reserve-overlay-area', derivedFrom: 'open|platform-rule|operator' }]
    }, null, 2);
    const prompt = [
        'You are Shaper, an eCommerce image batch planner. Return JSON only, with no markdown fences.',
        `Closed roles: ${Array.from(SHAPER_ROLES).join(', ')}. Never invent a role.`,
        `JSON schema: ${schema}. Each slot must include index, role, direction, differentiator, sceneRationale, sceneSource (shaper|operator), copyPlacement (none|model-rendered|reserve-overlay-area), derivedFrom (open|platform-rule|operator).`,
        'Precedence: Must Have > platform hard rule > operator Preferred > Shaper > model freedom.',
        'You may only decide what is Open. Preserve Must Have facts and platform hard rules. Do not instruct creativity, variety, imagination, or originality.',
        'Use sceneRationale to justify plain or scene-based choices. Plain slots with no scene are valid and preferred when buyer verification is high.',
        'Reason from verification need, repeat versus one-off purchase, and whether information lives on packaging, listing text, or both when selecting the slot mix.',
        'Only use usage contexts supported by supplied product facts. Depict people only when operator input supports the audience; do not infer children or safety claims from season.',
        'When category creative preference or batch direction seeds a scene concept, build around it and set sceneSource to operator; otherwise use shaper.',
        `Platform: ${template.name}; aspect ratio: ${template.aspectRatio}; image-count bounds: ${template.minImageCount}-${template.maxImageCount}; default: ${template.imageCount}; hard rules: ${template.slotRules.join(' | ')}`,
        `Category guidance: ${CATEGORY_PRESETS[state.category]?.guidance || ''}`,
        `Product: ${state.productName}; variant: ${state.productVariant}; facts: ${state.categoryFacts}`,
        `Campaign season (target, paired with market ${template.name}): ${state.season || 'unspecified'}; promotion: ${state.promotion || 'none'}; batch direction: ${state.batchDirection || 'none'}`,
        `Operator constraints: ${JSON.stringify(constraints)}`,
        `Reference image roles: ${JSON.stringify(state.referenceImages.map(image => image.roles || []))}`,
        state.imageCountTouched ? `Operator fixed image count: ${state.imageCount}` : 'Operator has not fixed image count; propose a count within the platform bounds.',
        'Author one shared batchTone object for all slots. Every differentiator must be distinct and explicitly distinguish its slot from siblings.'
    ].join('\n\n');
    const parts = [{ text: prompt }];
    assets.productImages.forEach((image, index) => {
        parts.push({ text: `Product image ${index + 1}; inspect it for productRead.` });
        parts.push({ inlineData: { mimeType: (image.data.match(/^data:([^;]+);/) || [])[1] || 'image/png', data: (image.data.split(',')[1] || image.data) } });
    });
    assets.referenceImages.forEach((image, index) => {
        parts.push({ text: `Reference image ${index + 1}; roles: ${(image.roles || []).join(', ') || 'general inspiration'}.` });
        parts.push({ inlineData: { mimeType: (image.data.match(/^data:([^;]+);/) || [])[1] || 'image/png', data: (image.data.split(',')[1] || image.data) } });
    });
    const responseSchema = {
        type: 'OBJECT',
        required: ['productRead', 'batchTone', 'resolvedImageCount', 'countRationale', 'slots'],
        properties: {
            planFormatVersion: { type: 'STRING', enum: [PLAN_FORMAT_VERSION] },
            id: { type: 'STRING' }, planSource: { type: 'STRING', enum: ['shaper'] },
            shapedAt: { type: 'STRING' }, model: { type: 'STRING', enum: [SHAPER_MODEL_ID] },
            productRead: { type: 'OBJECT', required: ['verificationNeed', 'purchaseType', 'infoLocation', 'anglesSupplied', 'notes'], properties: {
                verificationNeed: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                purchaseType: { type: 'STRING', enum: ['repeat', 'one-off'] },
                infoLocation: { type: 'STRING', enum: ['packaging', 'listing', 'both'] },
                anglesSupplied: { type: 'INTEGER' }, notes: { type: 'STRING' }
            } },
            batchTone: { type: 'OBJECT', required: ['character', 'palette', 'mood', 'finish'], properties: {
                character: { type: 'STRING' }, palette: { type: 'STRING' }, mood: { type: 'STRING' }, finish: { type: 'STRING' }
            } },
            resolvedImageCount: { type: 'INTEGER', minimum: template.minImageCount, maximum: template.maxImageCount },
            countRationale: { type: 'STRING' },
            slots: { type: 'ARRAY', items: { type: 'OBJECT', required: ['index', 'role', 'direction', 'differentiator', 'sceneRationale', 'sceneSource', 'copyPlacement', 'derivedFrom'], properties: {
                index: { type: 'INTEGER' }, role: { type: 'STRING', enum: Array.from(SHAPER_ROLES) },
                direction: { type: 'STRING' }, differentiator: { type: 'STRING' }, sceneRationale: { type: 'STRING' },
                sceneSource: { type: 'STRING', enum: ['shaper', 'operator'] },
                copyPlacement: { type: 'STRING', enum: ['none', 'model-rendered', 'reserve-overlay-area'] },
                derivedFrom: { type: 'STRING', enum: ['open', 'platform-rule', 'operator'] }
            } } }
        }
    };
    responseSchema.required.push('planFormatVersion', 'id', 'planSource', 'shapedAt', 'model');
    return { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema, responseModalities: ['TEXT'], maxOutputTokens: 8192 } };
}

async function shapeBatch() {
    const template = PLATFORM_TEMPLATES[state.platform];
    if (state.shaperPlan) return state.shaperPlan;
    let plan;
    try {
        if (!state.authReady) throw new Error('Shaper authentication unavailable');
        const response = await fetch('/api/shape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildShaperPayload(template)) });
        if (!response.ok) throw new Error(`Shaper request failed (${response.status})`);
        const body = await response.json();
        const text = body?.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || body?.text || body;
        plan = validateShaperPlan(text, template);
    } catch (error) {
        console.warn('Shaper unavailable; using fallback plan:', error.message);
        plan = buildFallbackPlan(template);
    }
    if (!state.imageCountTouched && plan.planSource === 'shaper') {
        state.imageCount = plan.resolvedImageCount;
        const countControl = document.getElementById('image-count');
        if (countControl) countControl.value = String(state.imageCount);
    }
    state.shaperPlan = plan;
    return plan;
}

function describeReferences(referenceImages) {
    if (referenceImages.length === 0) return [];

    return referenceImages.map((image, index) => {
        const roles = image.roles?.length ? image.roles : ['general inspiration'];
        const directions = [];
        if (roles.includes('style')) directions.push('carry over its design tone and mood, not its exact design');
        if (roles.includes('layout')) directions.push('use its spatial principles as guidance without copying the layout');
        if (roles.includes('color')) directions.push('use its palette and color relationships as guidance');
        if (directions.length === 0) directions.push('use it only as broad inspiration');

        return {
            assetId: image.id || `reference-${index + 1}`,
            name: image.name,
            roles,
            instruction: directions.join('; ')
        };
    });
}

function buildPromptRecord(imageIndex) {
    const template = PLATFORM_TEMPLATES[state.platform];
    const category = CATEGORY_PRESETS[state.category];
    const plan = state.shaperPlan || (state.shaperPlan = buildFallbackPlan(template));
    const slot = plan.slots[imageIndex] || buildFallbackPlan(template).slots[imageIndex];
    const purpose = slot?.role || roleForPurpose(template.imagePurposes[imageIndex], imageIndex);
    const platformRule = template.slotRules[imageIndex]
        || 'Create a useful additional product view with a new composition that fits the shared batch tone.';
    const constraints = getActiveConstraints(template);
    const assets = getSelectedAssets();
    const referenceRelationships = describeReferences(assets.referenceImages);
    const copyPlan = buildCopyPlan(constraints, imageIndex);
    const mustHave = constraints.filter(item => item.level === 'must-have');
    const preferred = constraints.filter(item => item.level === 'preferred');
    const isAmazonMain = state.platform === 'amazon-jp' && imageIndex === 0;

    const sections = [
        `Create a new ${template.name} eCommerce product photograph using the attached product photos as identity references.`,
        `IMAGE ${imageIndex + 1} OF ${state.imageCount}\nPurpose: ${purpose}\nShaper direction: ${slot?.direction || ''}\nDifferentiator: ${slot?.differentiator || ''}\nScene rationale: ${slot?.sceneRationale || ''}`,
        `PLATFORM AND SLOT REQUIREMENTS\n${platformRule}\nIf Shaper direction conflicts with this platform rule, the platform rule wins.\nShared tone: ${JSON.stringify(plan.batchTone || template.tone)}`,
        `PRODUCT IDENTITY - MUST PRESERVE\nProduct name: ${state.productName.trim()}\nVariant: ${state.productVariant.trim() || 'Use the exact variant shown in the product photos.'}\nTreat every attached product photo as another view of the same product. Preserve its geometry, proportions, colors, materials, packaging, visible labels, logos, quantity, and included components. Do not redesign or replace the product.\nCategory guardrail: ${category.guidance}`
    ];

    if (state.categoryFacts.trim()) {
        sections.push(`ADDITIONAL PRODUCT FACTS - MUST PRESERVE\n${state.categoryFacts.trim()}`);
    }

    if (mustHave.length > 0) {
        sections.push(`MUST HAVE\n${mustHave.map(item => `${item.label}: ${item.value}`).join('\n')}\nUse these as exact factual direction. Do not typeset them unless the text instructions below explicitly request it.`);
    }

    const preferences = [
        ...preferred.map(item => `${item.label}: ${item.value}`),
        state.categoryPreference.trim() ? `Category creative preference: ${state.categoryPreference.trim()}` : '',
        state.batchDirection.trim() ? `Batch direction: ${state.batchDirection.trim()}` : ''
    ].filter(Boolean);
    if (preferences.length > 0) {
        sections.push(`PREFERRED DIRECTION\nFollow these when they support a strong image, but product truth and platform requirements take priority.\n${preferences.join('\n')}`);
    }

    if (referenceRelationships.length > 0) {
        sections.push(`VISUAL REFERENCES\n${referenceRelationships.map((reference, index) => `Reference ${index + 1} (${reference.name}): ${reference.instruction}.`).join('\n')}\nMaintain a related design tone while creating an original scene and composition for this product.`);
    }

    if (state.imageCount > 1) {
        const siblingSlots = plan.slots
            .filter((_, index) => index !== imageIndex)
            .map(sibling => `- ${sibling.role}: ${sibling.differentiator}`)
            .join('\n');
        sections.push(`AVOID DUPLICATING SIBLING SLOTS\nThis batch contains ${state.imageCount} distinct images. Do not repeat or closely mimic the composition, angle, or concept planned for these sibling slots:\n${siblingSlots}\n\nYour differentiator for this slot: "${slot.differentiator}"`);
    }

    if (copyPlan.modelRenderedText.length > 0) {
        sections.push(`MODEL-RENDERED TEXT\nRender only this supplied short headline, exactly as quoted: "${copyPlan.modelRenderedText[0].value}". Make it legible and appropriate to the batch tone. Do not add other promotional wording.`);
    }

    if (copyPlan.overlayText.length > 0) {
        sections.push(`TEXT TO ADD AFTER GENERATION\nDo not render the following exact copy in the image. Leave one clean, uncluttered area with enough contrast for a later text overlay.\n${copyPlan.overlayText.map(item => `${item.label}: ${item.value}`).join('\n')}`);
    } else if (!isAmazonMain && copyPlan.modelRenderedText.length === 0) {
        sections.push('TEXT HANDLING\nDo not invent or render prices, ratings, specifications, claims, badges, warnings, or promotional copy.');
    }

    sections.push('CREATIVE FREEDOM\nChoose an original commercially useful composition, camera angle, lighting, props, and scene for every detail not constrained above. Keep this batch in one design tone, but do not repeat or copy the same design.');
    sections.push('ACCURACY\nUse only supplied facts. Do not invent measurements, ingredients, certifications, ratings, discounts, comparisons, accessories, or product capabilities. The final image must look like real, polished product photography.');
    sections.push('OUTPUT CONTRACT\nReturn exactly one final image for this slot. Do not create a collage, contact sheet, or alternate variation.');

    return {
        id: generateId('prompt'),
        index: imageIndex + 1,
        purpose,
        promptFormatVersion: PROMPT_FORMAT_VERSION,
        platform: state.platform,
        category: state.category,
        shaperPlanId: plan.id,
        planSource: plan.planSource,
        aspectRatio: template.aspectRatio,
        constraints,
        productAssets: assets.productImages.map((image, index) => ({
            assetId: image.id || `product-${index + 1}`,
            name: image.name
        })),
        referenceRelationships,
        copyPlan,
        prompt: sections.join('\n\n')
    };
}

function buildPrompt(imageIndex) {
    return buildPromptRecord(imageIndex).prompt;
}

function compilePromptRecords() {
    return Array.from(
        { length: state.imageCount },
        (_, index) => buildPromptRecord(index)
    );
}

function buildBatchPromptRecord(promptRecords) {
    if (!promptRecords.length) throw new Error('Cannot build a batch prompt without prompt records.');

    const splitSections = record => record.prompt.split(/\n\n+/);
    const firstSections = splitSections(promptRecords[0]);
    const sharedTone = firstSections
        .find(section => section.startsWith('PLATFORM AND SLOT REQUIREMENTS'))
        ?.split('\n')
        .find(line => line.startsWith('Shared tone:'));
    const isSlotSection = section => (
        section.startsWith('IMAGE ')
        || section.startsWith('PLATFORM AND SLOT REQUIREMENTS')
        || section.startsWith('MODEL-RENDERED TEXT')
        || section.startsWith('TEXT TO ADD AFTER GENERATION')
        || section.startsWith('TEXT HANDLING')
        || section.startsWith('AVOID DUPLICATING SIBLING SLOTS')
        || section.startsWith('OUTPUT CONTRACT')
    );
    const sharedSections = firstSections.filter(section => !isSlotSection(section));
    if (sharedTone) sharedSections.splice(1, 0, sharedTone);

    const slotBlocks = promptRecords.map(record => {
        const sections = splitSections(record);
        const imageSection = sections.find(section => section.startsWith('IMAGE '));
        const platformSection = sections.find(section => section.startsWith('PLATFORM AND SLOT REQUIREMENTS'));
        const slotRequirements = platformSection
            ?.split('\n')
            .filter(line => !line.startsWith('Shared tone:'))
            .join('\n');
        const textSections = sections.filter(section => (
            section.startsWith('MODEL-RENDERED TEXT')
            || section.startsWith('TEXT TO ADD AFTER GENERATION')
            || section.startsWith('TEXT HANDLING')
            || section.startsWith('AVOID DUPLICATING SIBLING SLOTS')
        ));

        return [
            `SLOT ${record.index}`,
            imageSection,
            slotRequirements,
            ...textSections
        ].filter(Boolean).join('\n\n');
    });
    const count = promptRecords.length;
    const outputContract = [
        'OUTPUT CONTRACT',
        `Return exactly ${count} separate images, one for each numbered slot.`,
        'Return the images in slot order.',
        'For each slot, emit one separate image part; never combine slots into a collage.',
        'Keep one shared design tone across the batch, but use a distinct composition for every slot and do not repeat a composition.'
    ].join('\n');

    return {
        promptIds: promptRecords.map(record => record.id),
        aspectRatio: promptRecords[0].aspectRatio,
        referenceRelationships: promptRecords[0].referenceRelationships,
        prompt: [
            'SHARED BATCH CONTEXT',
            ...sharedSections,
            'NUMBERED IMAGE SLOTS',
            ...slotBlocks,
            outputContract
        ].join('\n\n')
    };
}

function validateBatchInputs({ requireAuth = false } = {}) {
    if (requireAuth && !state.authReady) {
        alert(uiText('alert.auth', {}, 'Application Default Credentials are not configured on the server.'));
        return false;
    }

    if (state.productImages.length === 0) {
        alert(uiText('alert.addProductImage', {}, 'Please add at least one product image.'));
        return false;
    }

    if (!state.productName.trim()) {
        alert(uiText('alert.enterProductName', {}, 'Please enter the product name.'));
        return false;
    }

    return true;
}

function elapsedTaskText(startedAt) {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    return uiText('task.elapsed', { time }, `${time} elapsed`);
}

function renderActiveTask() {
    const status = document.getElementById('task-status');
    if (!activeTask) {
        if (status) status.hidden = true;
        return;
    }

    if (status) status.hidden = false;
    const title = document.getElementById('task-status-title');
    const detail = document.getElementById('task-status-detail');
    const elapsed = elapsedTaskText(activeTask.startedAt);
    if (title) title.textContent = uiText(activeTask.titleKey, {}, activeTask.titleFallback);
    if (detail) detail.textContent = uiText(activeTask.detailKey, {}, activeTask.detailFallback);
    const elapsedNode = document.getElementById('task-status-elapsed');
    if (elapsedNode) elapsedNode.textContent = elapsed;
    const previewElapsed = document.getElementById('prompt-preview-loading-elapsed');
    if (previewElapsed) previewElapsed.textContent = elapsed;
    const busyButton = document.getElementById(activeTask.type === 'preview' ? 'preview-prompts-btn' : 'generate-btn');
    if (busyButton) {
        busyButton.textContent = activeTask.type === 'preview'
            ? uiText('prompt.previewing', {}, 'Building preview...')
            : uiText('generation.generating', {}, 'Generating...');
    }
}

function setActiveTaskPhase(phase) {
    if (!activeTask) return;
    if (phase === 'generating') {
        activeTask.titleKey = 'task.generatingTitle';
        activeTask.titleFallback = 'Gemini is generating your images';
        activeTask.detailKey = 'task.generatingDetail';
        activeTask.detailFallback = 'Images are generated from their individual slot prompts, two at a time. This can take several minutes; keep this tab open.';
    } else {
        activeTask.titleKey = 'task.planningTitle';
        activeTask.titleFallback = 'Gemini 3.5 is building your prompt plan';
        activeTask.detailKey = 'task.planningDetail';
        activeTask.detailFallback = 'Analyzing product photos and requirements. This can take up to a minute.';
    }
    renderActiveTask();
}

function beginActiveTask(type) {
    if (activeTask) return false;
    activeTask = { type, startedAt: Date.now(), timer: null };
    setActiveTaskPhase('planning');

    const previewButton = document.getElementById('preview-prompts-btn');
    const generateButton = document.getElementById('generate-btn');
    [previewButton, generateButton].forEach(button => {
        if (!button) return;
        button.disabled = true;
        if (button.dataset) button.dataset.taskLock = 'true';
    });
    const busyButton = type === 'preview' ? previewButton : generateButton;
    if (busyButton?.dataset) busyButton.dataset.busy = 'true';
    if (typeof setInterval === 'function') {
        activeTask.timer = setInterval(renderActiveTask, 1000);
    }
    renderActiveTask();
    return true;
}

function finishActiveTask() {
    if (!activeTask) return;
    if (activeTask.timer && typeof clearInterval === 'function') clearInterval(activeTask.timer);
    activeTask = null;
    const status = document.getElementById('task-status');
    if (status) status.hidden = true;

    const previewButton = document.getElementById('preview-prompts-btn');
    const generateButton = document.getElementById('generate-btn');
    [previewButton, generateButton].forEach(button => {
        if (!button) return;
        if (button.dataset) {
            button.dataset.taskLock = 'false';
            button.dataset.busy = 'false';
        }
    });
    if (previewButton) previewButton.textContent = uiText('actions.preview', {}, 'Preview prompts');
    if (generateButton) generateButton.textContent = uiText('actions.generate', {}, 'Generate batch');

    if (typeof window !== 'undefined' && window.updateWorkbench) {
        window.updateWorkbench();
    } else {
        if (previewButton) previewButton.disabled = false;
        if (generateButton) generateButton.disabled = false;
    }
}

function setPromptPreviewLoading(loading) {
    const dialog = document.getElementById('prompt-preview-dialog');
    const loadingView = document.getElementById('prompt-preview-loading');
    const readyView = document.getElementById('prompt-preview-ready');
    if (dialog?.setAttribute) dialog.setAttribute('aria-busy', String(loading));
    if (loadingView) loadingView.hidden = !loading;
    if (readyView) readyView.hidden = loading;
    ['copy-prompt-preview', 'regenerate-plan-btn', 'generate-from-preview-btn', 'done-prompt-preview'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = loading;
    });
}

function renderGenerationPlaceholders(count) {
    const container = document.getElementById('results-container');
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, (_, index) => `
        <div class="result-item generation-placeholder" data-slot-index="${index + 1}">
            <h3>${escapeHtml(uiText('generation.pendingImage', { index: index + 1 }, `Image ${index + 1}`))}</h3>
            <div class="generation-placeholder-visual"><span class="spinner" aria-hidden="true"></span></div>
            <p class="placeholder-status">${escapeHtml(uiText('generation.queued', {}, 'Queued'))}</p>
        </div>
    `).join('');
}

function renderPromptPreview(promptRecords, selectedIndex = 'batch', batchRecord = buildBatchPromptRecord(promptRecords)) {
    const record = selectedIndex === 'batch' ? batchRecord : promptRecords[selectedIndex];
    const assets = getSelectedAssets();
    document.getElementById('prompt-preview-content').textContent = record.prompt;
    document.getElementById('prompt-preview-model').textContent = MODEL_ID;
    document.getElementById('prompt-preview-output').textContent = `${record.aspectRatio}, PNG, ${IMAGE_SIZE}`;
    document.getElementById('prompt-preview-assets').textContent = uiText('prompt.assets', {
        product: assets.productImages.length,
        reference: assets.referenceImages.length
    }, `${assets.productImages.length} product + ${assets.referenceImages.length} reference`);
}

async function previewPrompts() {
    if (!validateBatchInputs({ requireAuth: true })) return;
    if (!beginActiveTask('preview')) return;

    const dialog = document.getElementById('prompt-preview-dialog');
    setPromptPreviewLoading(true);
    dialog.showModal();

    try {
        const plan = await shapeBatch();
        const promptRecords = compilePromptRecords();
        const batchRecord = buildBatchPromptRecord(promptRecords);
        const select = document.getElementById('prompt-preview-select');
        const template = PLATFORM_TEMPLATES[state.platform];
        const category = CATEGORY_PRESETS[state.category];

        select.innerHTML = '';
        const batchOption = document.createElement('option');
        batchOption.value = 'batch';
        batchOption.textContent = uiText('prompt.batch', {}, 'Combined batch prompt');
        select.appendChild(batchOption);
        promptRecords.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = uiText('prompt.option', {
                index: record.index,
                purpose: localizedPurpose(record.purpose)
            }, `Image ${record.index}: ${record.purpose}`);
            select.appendChild(option);
        });
        select.value = 'batch';
        select.onchange = () => renderPromptPreview(
            promptRecords,
            select.value === 'batch' ? 'batch' : Number(select.value),
            batchRecord
        );
        document.getElementById('prompt-preview-summary').textContent = uiText('prompt.summary', {
            platform: localizedPlatform(state.platform),
            category: localizedCategory(state.category),
            count: promptRecords.length
        }, `${template.name} / ${category.name} / ${promptRecords.length} prompts`);
        const planSummary = document.getElementById('prompt-preview-plan');
        if (planSummary) {
            planSummary.textContent = `${plan.planSource}: ${plan.batchTone.character} / ${plan.batchTone.mood} | ${plan.slots.map(slot => slot.role).join(', ')}`;
        }
        renderPromptPreview(promptRecords, 'batch', batchRecord);
        setPromptPreviewLoading(false);
    } catch (error) {
        console.error('Prompt preview failed:', error);
        dialog.close();
        alert(uiText('alert.previewFailed', {}, 'Could not build the prompt preview. Please try again.'));
    } finally {
        finishActiveTask();
    }
}

async function copyPreviewPrompt() {
    const content = document.getElementById('prompt-preview-content').textContent;
    const button = document.getElementById('copy-prompt-preview');

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(content);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }

        button.textContent = uiText('prompt.copied', {}, 'Copied');
        button.title = uiText('prompt.copied', {}, 'Copied');
        button.setAttribute('aria-label', uiText('prompt.copiedAria', {}, 'Prompt copied'));
        window.setTimeout(() => {
            button.textContent = uiText('prompt.copy', {}, 'Copy prompt');
            button.title = uiText('prompt.copy', {}, 'Copy prompt');
            button.setAttribute('aria-label', uiText('prompt.copy', {}, 'Copy prompt'));
        }, 1500);
    } catch (error) {
        button.textContent = uiText('prompt.copyFailed', {}, 'Copy failed');
        button.title = uiText('prompt.copyFailed', {}, 'Copy failed');
        console.error('Could not copy prompt:', error);
    }
}

// Generate each slot from its own prompt record while limiting paid calls in flight.
async function generateSlotsWithConcurrency(promptRecords, assets, concurrency = 2, onProgress = null) {
    const results = new Array(promptRecords.length).fill(null);
    const queue = promptRecords.map((record, index) => ({ record, index }));
    const workerCount = Math.max(1, Math.min(Number.parseInt(concurrency, 10) || 1, queue.length || 1));
    let completed = 0;
    let progressChain = Promise.resolve();

    const emitProgress = event => {
        if (!onProgress) return Promise.resolve();
        const snapshot = {
            ...event,
            completed,
            total: promptRecords.length,
            results: results.filter(Boolean).sort((a, b) => a.index - b.index)
        };
        progressChain = progressChain.then(() => onProgress(snapshot));
        return progressChain;
    };

    const generateSlot = async ({ record, index }) => {
        const startedAt = new Date().toISOString();
        await emitProgress({ type: 'slot-start', index: record.index });
        let progressEvent;

        try {
            const images = await callNanoBananaAPI(record, assets);
            if (!images[0]) throw new Error(`Model returned no image for slot ${record.index}.`);

            results[index] = {
                promptId: record.id,
                index: record.index,
                purpose: record.purpose,
                status: 'success',
                model: MODEL_ID,
                aspectRatio: record.aspectRatio,
                imageSize: IMAGE_SIZE,
                startedAt,
                completedAt: new Date().toISOString(),
                imageUrl: images[0].imageUrl,
                apiMetadata: images[0].metadata
            };
            progressEvent = { type: 'slot-complete', index: record.index, result: results[index] };
        } catch (error) {
            results[index] = {
                promptId: record.id,
                index: record.index,
                purpose: record.purpose,
                status: 'failed',
                model: MODEL_ID,
                aspectRatio: record.aspectRatio,
                imageSize: IMAGE_SIZE,
                startedAt,
                completedAt: new Date().toISOString(),
                error: error.message
            };
            progressEvent = { type: 'slot-error', index: record.index, error: error.message, result: results[index] };
        }

        completed += 1;
        await emitProgress(progressEvent);
    };

    const workers = Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item) await generateSlot(item);
        }
    });

    await Promise.all(workers);
    await progressChain;
    return results;
}

// ===== GENERATE PROMPTS =====
async function generatePrompts() {
    const generateBtn = document.getElementById('generate-btn');
    const resultsContainer = document.getElementById('results-container');
    const generationStatus = document.getElementById('generation-status');
    const generationStatusText = document.getElementById('generation-status-text');

    if (!validateBatchInputs({ requireAuth: true })) return;
    if (!beginActiveTask('generation')) return;

    renderGenerationPlaceholders(state.imageCount);
    if (generationStatus) generationStatus.hidden = false;
    if (generationStatusText) generationStatusText.textContent = uiText('generation.preparing', {}, 'Gemini 3.5 is building the prompt plan...');
    document.getElementById('results-section')?.setAttribute('aria-busy', 'true');
    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const now = new Date().toISOString();
        const shaperPlan = await shapeBatch();
        const promptRecords = compilePromptRecords();
        const batch = {
            id: generateId('batch'),
            recordVersion: 3,
            status: 'rendering',
            timestamp: now,
            updatedAt: now,
            platform: state.platform,
            category: state.category,
            imageCount: state.imageCount,
            inputs: buildInputSnapshot(),
            shaperPlan,
            planSource: shaperPlan.planSource,
            promptRecords,
            outputRecords: [],
            results: []
        };

        // Persist compiled prompts before the first paid generation request.
        await saveBatch(batch);
        state.currentBatch = batch;
        await loadHistory();

        const assets = getSelectedAssets();
        setActiveTaskPhase('generating');
        if (generationStatusText) {
            generationStatusText.textContent = uiText('generation.starting', {
                count: promptRecords.length
            }, `Starting generation for ${promptRecords.length} images...`);
        }

        const onProgress = async event => {
            const placeholder = document.querySelector?.(`.generation-placeholder[data-slot-index="${event.index}"]`);
            if (event.type === 'slot-start' && placeholder) {
                placeholder.classList.add('active');
                const status = placeholder.querySelector?.('.placeholder-status');
                if (status) status.textContent = uiText('generation.slotGenerating', {}, 'Generating...');
            }

            if (event.type === 'slot-complete' || event.type === 'slot-error') {
                if (generationStatusText) {
                    generationStatusText.textContent = uiText('generation.progress', {
                        completed: event.completed,
                        total: event.total
                    }, `Finished ${event.completed} of ${event.total} images...`);
                }
                if (event.type === 'slot-error') console.warn(`Slot ${event.index} failed:`, event.error);

                if (placeholder) {
                    placeholder.classList.remove('active');
                    placeholder.classList.add(event.type === 'slot-complete' ? 'completed' : 'failed');
                    const status = placeholder.querySelector?.('.placeholder-status');
                    if (status) {
                        status.textContent = event.type === 'slot-complete'
                            ? uiText('generation.complete', {}, 'Complete')
                            : uiText('generation.slotFailed', {}, 'Failed');
                    }
                }

                batch.outputRecords = event.results;
                batch.results = buildLegacyResults(batch);
                batch.updatedAt = new Date().toISOString();
                await saveBatch(batch);
                state.currentBatch = batch;
            }
        };

        batch.outputRecords = await generateSlotsWithConcurrency(promptRecords, assets, 2, onProgress);

        batch.results = buildLegacyResults(batch);
        batch.status = batch.outputRecords.some(output => output.status === 'failed')
            ? 'completed-with-errors'
            : 'completed';
        batch.updatedAt = new Date().toISOString();
        await saveBatch(batch);
        state.currentBatch = batch;

        renderResults(getDisplayResults(batch));
        updateExportButton();
        await loadHistory();

    } catch (error) {
        console.error('Generation failed:', error);
        resultsContainer.innerHTML = `<div class="empty-state"><p>${escapeHtml(uiText('results.failed', { error: error.message }, `Generation failed: ${error.message}`))}</p></div>`;
    } finally {
        if (generationStatus) generationStatus.hidden = true;
        document.getElementById('results-section')?.setAttribute('aria-busy', 'false');
        finishActiveTask();
    }
}

// Nano Banana Pro API - server-provided ADC token
async function callNanoBananaAPI(promptRecord, assets) {
    try {
        const toInlineData = (dataUrl) => {
            const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
            if (!match) throw new Error('An uploaded image has an unsupported format.');

            return {
                inlineData: {
                    mimeType: match[1],
                    data: match[2]
                }
            };
        };

        const parts = [{ text: promptRecord.prompt }];

        assets.productImages.forEach((image, index) => {
            parts.push(
                { text: `Product identity image ${index + 1}. This is the same product from another view; preserve its identity and visible details.` },
                toInlineData(image.data)
            );
        });

        assets.referenceImages.forEach((image, index) => {
            const relationship = promptRecord.referenceRelationships[index];
            parts.push(
                { text: `Visual reference ${index + 1}: ${relationship.instruction}.` },
                toInlineData(image.data)
            );
        });

        // Vertex AI generateContent shape. The server adds project, location and
        // the ADC bearer token, so the model name is not part of the body.
        const payload = {
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                maxOutputTokens: 32768,
                imageConfig: {
                    aspectRatio: promptRecord.aspectRatio,
                    imageSize: IMAGE_SIZE
                }
            }
        };

        // The backend applies ADC and forwards the request without exposing a token.
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || `API request failed: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        const responseParts = candidate?.content?.parts || [];
        const metadata = {
            model: MODEL_ID,
            status: candidate.finishReason,
            text: responseParts.find(part => part.text)?.text || '',
            usage: result.usageMetadata
        };
        const images = responseParts
            .filter(part => part.inlineData?.data || part.inline_data?.data)
            .map(part => {
                const inlineData = part.inlineData || part.inline_data;
                return {
                    imageUrl: `data:${inlineData.mimeType || inlineData.mime_type || 'image/png'};base64,${inlineData.data}`,
                    metadata
                };
            });

        if (images.length === 0) {
            const refusal = responseParts.find(part => part.text)?.text;
            const blockReason = result.promptFeedback?.blockReason;
            throw new Error(
                refusal || blockReason
                    ? `Gemini returned no image: ${refusal || blockReason}`
                    : 'Gemini returned no generated image.'
            );
        }

        return images;
    } catch (error) {
        console.error('Nano Banana API error:', error);
        throw error;
    }
}

function buildInputSnapshot() {
    return {
        productName: state.productName,
        productVariant: state.productVariant,
        category: state.category,
        categoryFacts: state.categoryFacts,
        categoryPreference: state.categoryPreference,
        season: state.season,
        promotion: state.promotion,
        productImages: state.productImages,
        referenceImages: state.referenceImages,
        constraints: state.constraints,
        batchDirection: state.batchDirection
    };
}

function buildLegacyResults(batch) {
    return batch.outputRecords
        .filter(output => output.status === 'success')
        .map(output => {
            const promptRecord = batch.promptRecords.find(prompt => prompt.id === output.promptId);
            return {
                index: output.index,
                purpose: output.purpose,
                prompt: promptRecord?.prompt || '',
                imageUrl: output.imageUrl,
                timestamp: output.completedAt
            };
        });
}

function getDisplayResults(batch) {
    if (!batch) return [];
    if (!Array.isArray(batch.outputRecords)) return batch.results || [];

    return batch.outputRecords.map(output => {
        const promptRecord = batch.promptRecords?.find(prompt => prompt.id === output.promptId);
        return {
            ...output,
            prompt: promptRecord?.prompt || '',
            copyPlan: promptRecord?.copyPlan
        };
    });
}

function renderResults(results) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';

    if (state.currentBatch?.planSource === 'fallback') {
        const notice = document.createElement('p');
        notice.className = 'shaper-notice';
        notice.textContent = uiText('results.shaperFallback', {}, 'Shaper was unavailable. This batch uses the platform fallback plan.');
        container.appendChild(notice);
    }

    if (results.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${escapeHtml(uiText('results.noOutputs', {}, 'This batch has no generated outputs yet.'))}</p></div>`;
        return;
    }

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const imageOrError = result.status === 'failed'
            ? `<p class="result-error">${escapeHtml(uiText('results.failed', {
                error: result.error || uiText('results.unknownError', {}, 'Unknown error')
            }, `Generation failed: ${result.error || 'Unknown error'}`))}</p>`
            : `<img src="${result.imageUrl}" alt="${escapeHtml(uiText('results.generatedAlt', { index: result.index }, `Generated image ${result.index}`))}" class="result-image">`;
        const overlayItems = result.copyPlan?.overlayText || [];
        const copyDetails = overlayItems.length > 0
            ? `<details class="result-prompt"><summary>${escapeHtml(uiText('results.overlayText', {}, 'Text to add later'))}</summary><pre>${escapeHtml(overlayItems.map(item => `${uiText(`constraint.${item.id}`, {}, item.label)}: ${item.value}`).join('\n'))}</pre></details>`
            : '';
        item.innerHTML = `
            <h3>${escapeHtml(uiText('results.imageTitle', {
                index: result.index,
                purpose: localizedPurpose(result.purpose)
            }, `Image ${result.index}: ${result.purpose}`))}</h3>
            ${imageOrError}
            <details class="result-prompt">
                <summary>${escapeHtml(uiText('results.viewPrompt', {}, 'View prompt'))}</summary>
                <pre>${escapeHtml(result.prompt || '')}</pre>
            </details>
            ${copyDetails}
        `;
        container.appendChild(item);
    });
}

// ===== HISTORY =====
async function loadHistory() {
    const container = document.getElementById('history-container');
    const batches = await loadBatches();

    if (batches.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${escapeHtml(uiText('history.empty', {}, 'No saved batches yet.'))}</p></div>`;
        return;
    }

    // Sort by timestamp descending
    batches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = '';

    batches.forEach(batch => {
        const date = new Date(batch.timestamp);
        const outputs = Array.isArray(batch.outputRecords) ? batch.outputRecords : (batch.results || []);
        const successCount = outputs.filter(output => !output.status || output.status === 'success').length;
        const failedCount = outputs.filter(output => output.status === 'failed').length;
        const template = PLATFORM_TEMPLATES[batch.platform];
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <h4>${escapeHtml(uiText('history.itemTitle', { platform: localizedPlatform(batch.platform), count: batch.imageCount }, `${template?.name || batch.platform} - ${batch.imageCount} images`))}</h4>
            <div class="timestamp">${date.toLocaleString(window.BubstalI18n?.getLocale?.() || 'en')}</div>
            <div class="meta">${escapeHtml(uiText('history.generated', { count: successCount }, `${successCount} generated`))}${failedCount ? escapeHtml(uiText('history.failed', { count: failedCount }, `, ${failedCount} failed`)) : ''}</div>
        `;
        item.onclick = () => loadBatch(batch);
        container.appendChild(item);
    });
}

function loadBatch(batch) {
    // Restore state from batch
    state.platform = batch.platform;
    state.imageCount = batch.imageCount;
    state.category = batch.inputs.category || batch.category || 'beauty';
    state.productName = batch.inputs.productName || '';
    state.productVariant = batch.inputs.productVariant || '';
    state.categoryFacts = batch.inputs.categoryFacts || '';
    state.categoryPreference = batch.inputs.categoryPreference || '';
    state.productImages = batch.inputs.productImages || [];
    state.referenceImages = batch.inputs.referenceImages || [];
    state.constraints = batch.inputs.constraints || {};
    state.batchDirection = batch.inputs.batchDirection || '';
    state.season = batch.inputs.season || '';
    state.promotion = batch.inputs.promotion || '';
    state.shaperPlan = batch.shaperPlan || null;
    state.imageCountTouched = true;
    state.currentBatch = batch;

    // Update UI
    document.getElementById('platform-select').value = batch.platform;
    document.getElementById('image-count').value = batch.imageCount;
    document.getElementById('category-select').value = state.category;
    document.getElementById('product-name').value = state.productName;
    document.getElementById('product-variant').value = state.productVariant;
    document.getElementById('category-facts').value = state.categoryFacts;
    document.getElementById('category-preference').value = state.categoryPreference;
    document.getElementById('batch-direction').value = state.batchDirection;
    document.getElementById('season').value = state.season;
    document.getElementById('promotion').value = state.promotion;

    renderProductImages();
    renderReferenceImages();
    renderConstraints();
    renderResults(getDisplayResults(batch));
    updateExportButton();

    const historyDialog = document.getElementById('history-dialog');
    if (historyDialog?.open) historyDialog.close();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SAVE DRAFT =====
async function saveDraft() {
    if (state.productImages.length === 0) {
        alert(uiText('alert.nothingToSave', {}, 'Nothing to save. Add at least one product image first.'));
        return;
    }

    const batch = {
        id: state.currentBatch?.id || generateId('batch'),
        recordVersion: 3,
        status: 'draft',
        timestamp: new Date().toISOString(),
        platform: state.platform,
        category: state.category,
        imageCount: state.imageCount,
        inputs: buildInputSnapshot(),
        shaperPlan: state.shaperPlan,
        planSource: state.shaperPlan?.planSource || 'fallback',
        promptRecords: state.currentBatch?.promptRecords || [],
        outputRecords: state.currentBatch?.outputRecords || [],
        results: state.currentBatch?.results || []
    };

    await saveBatch(batch);
    state.currentBatch = batch;
    await loadHistory();

    alert(uiText('alert.draftSaved', {}, 'Draft saved successfully!'));
}

// ===== UTILITY =====
function generateId(prefix = 'record') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function updateExportButton() {
    const button = document.getElementById('export-btn');
    if (!button) return;
    button.disabled = !state.currentBatch?.outputRecords?.length;
}

function markInputsChanged() {
    state.currentBatch = null;
    state.shaperPlan = null;
    updateExportButton();
}

function exportCurrentBatch() {
    const batch = state.currentBatch;
    if (!batch?.outputRecords?.length) return;

    const exported = {
        exportVersion: 2,
        exportedAt: new Date().toISOString(),
        batchId: batch.id,
        platform: batch.platform,
        category: batch.category,
        imageCount: batch.imageCount,
        model: MODEL_ID,
        promptFormatVersion: PROMPT_FORMAT_VERSION,
        shaperPlan: batch.shaperPlan,
        planSource: batch.planSource || batch.shaperPlan?.planSource || 'fallback',
        promptRecords: batch.promptRecords,
        outputRecords: batch.outputRecords
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batch.id}-outputs.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB
    await initDB();

    // Setup dropzones
    setupDropzone('product-dropzone', 'product-file-input', (data, name) => {
        state.productImages.push({ id: generateId('product'), data, name });
        markInputsChanged();
        renderProductImages();
    });

    setupDropzone('reference-dropzone', 'reference-file-input', (data, name) => {
        state.referenceImages.push({ id: generateId('reference'), data, name, roles: [] });
        markInputsChanged();
        renderReferenceImages();
    });

    // Platform change
    document.getElementById('platform-select').addEventListener('change', (e) => {
        state.platform = e.target.value;
        state.imageCount = PLATFORM_TEMPLATES[state.platform].imageCount;
        state.imageCountTouched = false;
        state.constraints = {}; // Reset constraints when platform changes
        document.getElementById('image-count').value = state.imageCount;
        markInputsChanged();
        renderConstraints();
    });

    // Image count change
    document.getElementById('image-count').addEventListener('change', (e) => {
        state.imageCount = parseInt(e.target.value);
        state.imageCountTouched = true;
        markInputsChanged();
    });

    document.getElementById('category-select').addEventListener('change', (e) => {
        state.category = e.target.value;
        markInputsChanged();
    });

    document.getElementById('product-name').addEventListener('input', (e) => {
        state.productName = e.target.value;
        markInputsChanged();
    });

    document.getElementById('product-variant').addEventListener('input', (e) => {
        state.productVariant = e.target.value;
        markInputsChanged();
    });

    document.getElementById('category-facts').addEventListener('input', (e) => {
        state.categoryFacts = e.target.value;
        markInputsChanged();
    });

    document.getElementById('category-preference').addEventListener('input', (e) => {
        state.categoryPreference = e.target.value;
        markInputsChanged();
    });

    // Batch direction
    document.getElementById('batch-direction').addEventListener('input', (e) => {
        state.batchDirection = e.target.value;
        markInputsChanged();
    });

    document.getElementById('season').addEventListener('input', (e) => {
        state.season = e.target.value;
        markInputsChanged();
    });

    document.getElementById('promotion').addEventListener('input', (e) => {
        state.promotion = e.target.value;
        markInputsChanged();
    });

    // Generate button
    document.getElementById('generate-btn').addEventListener('click', generatePrompts);
    document.getElementById('preview-prompts-btn').addEventListener('click', previewPrompts);
    document.getElementById('close-prompt-preview').addEventListener('click', () => {
        document.getElementById('prompt-preview-dialog').close();
    });
    document.getElementById('done-prompt-preview').addEventListener('click', () => {
        document.getElementById('prompt-preview-dialog').close();
    });
    document.getElementById('copy-prompt-preview').addEventListener('click', copyPreviewPrompt);
    document.getElementById('generate-from-preview-btn').addEventListener('click', () => {
        document.getElementById('prompt-preview-dialog').close();
        generatePrompts();
    });
    document.getElementById('regenerate-plan-btn').addEventListener('click', async () => {
        markInputsChanged();
        document.getElementById('prompt-preview-dialog').close();
        await previewPrompts();
    });

    // Save draft button
    document.getElementById('save-draft-btn').addEventListener('click', saveDraft);
    document.getElementById('export-btn').addEventListener('click', exportCurrentBatch);

    const authStatus = document.getElementById('auth-status');
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) throw new Error('ADC is unavailable');

        state.authReady = true;
        authStatus.dataset.ready = 'true';
        authStatus.textContent = uiText('auth.ready', {}, 'Application Default Credentials ready');
        authStatus.style.color = 'var(--success)';
    } catch (error) {
        state.authReady = false;
        authStatus.dataset.ready = 'false';
        authStatus.textContent = uiText('auth.unavailable', {}, 'Application Default Credentials unavailable');
        authStatus.style.color = 'var(--danger)';
        console.error('ADC status check failed:', error);
    }

    if (typeof window !== 'undefined' && window.updateWorkbench) {
        window.updateWorkbench();
    }

    // Initial render
    renderConstraints();
    updateExportButton();
    await loadHistory();

    document.addEventListener('bubstal:localechange', async () => {
        authStatus.textContent = state.authReady
            ? uiText('auth.ready', {}, 'Application Default Credentials ready')
            : uiText('auth.unavailable', {}, 'Application Default Credentials unavailable');
        renderProductImages();
        renderReferenceImages();
        renderConstraints();
        if (state.currentBatch) renderResults(getDisplayResults(state.currentBatch));
        await loadHistory();

        const previewDialog = document.getElementById('prompt-preview-dialog');
        if (previewDialog.open && activeTask?.type !== 'preview') {
            previewDialog.close();
            previewPrompts();
        }

        if (activeTask) renderActiveTask();
        if (typeof window !== 'undefined' && window.updateWorkbench) {
            window.updateWorkbench();
        }
    });
});
