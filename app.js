const MODEL_ID = 'gemini-3-pro-image';
const PROMPT_FORMAT_VERSION = '2.0';
const MAX_INPUT_IMAGES = 14;

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
    currentBatch: null,
    authReady: false
};

// ===== INDEXEDDB SETUP =====
let db;

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
    const purpose = template.imagePurposes[imageIndex] || `Additional product view ${imageIndex + 1}`;
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
        `IMAGE ${imageIndex + 1} OF ${state.imageCount}\nPurpose: ${purpose}`,
        `PLATFORM AND SLOT REQUIREMENTS\n${platformRule}\nShared tone: ${template.tone}`,
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

    return {
        id: generateId('prompt'),
        index: imageIndex + 1,
        purpose,
        promptFormatVersion: PROMPT_FORMAT_VERSION,
        platform: state.platform,
        category: state.category,
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

function renderPromptPreview(promptRecords, selectedIndex = 0) {
    const record = promptRecords[selectedIndex];
    const assets = getSelectedAssets();
    document.getElementById('prompt-preview-content').textContent = record.prompt;
    document.getElementById('prompt-preview-model').textContent = MODEL_ID;
    document.getElementById('prompt-preview-output').textContent = `${record.aspectRatio}, PNG, 2K`;
    document.getElementById('prompt-preview-assets').textContent = uiText('prompt.assets', {
        product: assets.productImages.length,
        reference: assets.referenceImages.length
    }, `${assets.productImages.length} product + ${assets.referenceImages.length} reference`);
}

function previewPrompts() {
    if (!validateBatchInputs()) return;

    const promptRecords = compilePromptRecords();
    const dialog = document.getElementById('prompt-preview-dialog');
    const select = document.getElementById('prompt-preview-select');
    const template = PLATFORM_TEMPLATES[state.platform];
    const category = CATEGORY_PRESETS[state.category];

    select.innerHTML = '';
    promptRecords.forEach((record, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = uiText('prompt.option', {
            index: record.index,
            purpose: localizedPurpose(record.purpose)
        }, `Image ${record.index}: ${record.purpose}`);
        select.appendChild(option);
    });
    select.value = '0';
    select.onchange = () => renderPromptPreview(promptRecords, Number(select.value));
    document.getElementById('prompt-preview-summary').textContent = uiText('prompt.summary', {
        platform: localizedPlatform(state.platform),
        category: localizedCategory(state.category),
        count: promptRecords.length
    }, `${template.name} / ${category.name} / ${promptRecords.length} prompts`);
    renderPromptPreview(promptRecords);
    dialog.showModal();
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

// ===== GENERATE PROMPTS =====
async function generatePrompts() {
    const generateBtn = document.getElementById('generate-btn');
    const resultsContainer = document.getElementById('results-container');
    const generationStatus = document.getElementById('generation-status');
    const generationStatusText = document.getElementById('generation-status-text');

    if (!validateBatchInputs({ requireAuth: true })) return;

    generateBtn.disabled = true;
    if (generateBtn.dataset) generateBtn.dataset.busy = 'true';
    generateBtn.textContent = uiText('generation.generating', {}, 'Generating...');

    resultsContainer.innerHTML = '';
    if (generationStatus) generationStatus.hidden = false;
    if (generationStatusText) generationStatusText.textContent = uiText('generation.preparing', {}, 'Preparing batch prompts...');
    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const now = new Date().toISOString();
        const promptRecords = compilePromptRecords();
        const batch = {
            id: generateId('batch'),
            recordVersion: 2,
            status: 'rendering',
            timestamp: now,
            updatedAt: now,
            platform: state.platform,
            category: state.category,
            imageCount: state.imageCount,
            inputs: buildInputSnapshot(),
            promptRecords,
            outputRecords: [],
            results: []
        };

        // Persist compiled prompts before the first paid generation request.
        await saveBatch(batch);
        state.currentBatch = batch;
        await loadHistory();

        const assets = getSelectedAssets();
        for (const promptRecord of promptRecords) {
            if (generationStatusText) {
                generationStatusText.textContent = uiText('generation.progress', {
                    index: promptRecord.index,
                    count: state.imageCount
                }, `Generating image ${promptRecord.index} of ${state.imageCount}...`);
            }

            const startedAt = new Date().toISOString();
            let outputRecord;
            try {
                const result = await callNanoBananaAPI(promptRecord, assets);
                outputRecord = {
                    promptId: promptRecord.id,
                    index: promptRecord.index,
                    purpose: promptRecord.purpose,
                    status: 'success',
                    model: MODEL_ID,
                    aspectRatio: promptRecord.aspectRatio,
                    imageSize: '2K',
                    startedAt,
                    completedAt: new Date().toISOString(),
                    imageUrl: result.imageUrl,
                    apiMetadata: result.metadata
                };
            } catch (error) {
                outputRecord = {
                    promptId: promptRecord.id,
                    index: promptRecord.index,
                    purpose: promptRecord.purpose,
                    status: 'failed',
                    model: MODEL_ID,
                    aspectRatio: promptRecord.aspectRatio,
                    imageSize: '2K',
                    startedAt,
                    completedAt: new Date().toISOString(),
                    error: error.message
                };
            }

            batch.outputRecords.push(outputRecord);
            batch.results = buildLegacyResults(batch);
            batch.updatedAt = new Date().toISOString();
            await saveBatch(batch);
            renderResults(getDisplayResults(batch));
        }

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
        if (generateBtn.dataset) generateBtn.dataset.busy = 'false';
        generateBtn.textContent = uiText('actions.generate', {}, 'Generate batch');
        if (typeof window !== 'undefined' && window.updateWorkbench) {
            window.updateWorkbench();
        } else {
            generateBtn.disabled = false;
        }
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
                imageConfig: {
                    aspectRatio: promptRecord.aspectRatio,
                    imageSize: '2K'
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
        const imagePart = responseParts.find(part => part.inlineData?.data || part.inline_data?.data);
        const inlineData = imagePart?.inlineData || imagePart?.inline_data;

        if (!inlineData?.data) {
            const refusal = responseParts.find(part => part.text)?.text;
            const blockReason = result.promptFeedback?.blockReason;
            throw new Error(
                refusal || blockReason
                    ? `Gemini returned no image: ${refusal || blockReason}`
                    : 'Gemini returned no generated image.'
            );
        }

        return {
            imageUrl: `data:${inlineData.mimeType || inlineData.mime_type || 'image/png'};base64,${inlineData.data}`,
            metadata: {
                model: MODEL_ID,
                status: candidate.finishReason,
                text: responseParts.find(part => part.text)?.text || '',
                usage: result.usageMetadata
            }
        };
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
        recordVersion: 2,
        status: 'draft',
        timestamp: new Date().toISOString(),
        platform: state.platform,
        category: state.category,
        imageCount: state.imageCount,
        inputs: buildInputSnapshot(),
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
    updateExportButton();
}

function exportCurrentBatch() {
    const batch = state.currentBatch;
    if (!batch?.outputRecords?.length) return;

    const exported = {
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        batchId: batch.id,
        platform: batch.platform,
        category: batch.category,
        imageCount: batch.imageCount,
        model: MODEL_ID,
        promptFormatVersion: PROMPT_FORMAT_VERSION,
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
        state.constraints = {}; // Reset constraints when platform changes
        document.getElementById('image-count').value = state.imageCount;
        markInputsChanged();
        renderConstraints();
    });

    // Image count change
    document.getElementById('image-count').addEventListener('change', (e) => {
        state.imageCount = parseInt(e.target.value);
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
        if (previewDialog.open) {
            previewDialog.close();
            previewPrompts();
        }

        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn.dataset.busy === 'true') {
            generateBtn.textContent = uiText('generation.generating', {}, 'Generating...');
        }
        if (typeof window !== 'undefined' && window.updateWorkbench) {
            window.updateWorkbench();
        }
    });
});
