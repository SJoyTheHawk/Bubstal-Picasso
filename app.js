// ===== PLATFORM TEMPLATES =====
const PLATFORM_TEMPLATES = {
    'amazon-jp': {
        name: 'Amazon.co.jp',
        imageCount: 7,
        imagePurposes: [
            'Main product shot - white background',
            'Product detail - close-up feature 1',
            'Product detail - close-up feature 2',
            'Lifestyle context shot',
            'Size/scale reference',
            'Product in use demonstration',
            'Packaging and contents'
        ],
        basePrompt: 'Create a professional product image for Amazon.co.jp marketplace.',
        promptModifiers: {
            background: 'Pure white background (#FFFFFF), no shadows or gradients',
            lighting: 'Bright, even studio lighting with soft shadows',
            composition: 'Clean, centered product placement with generous white space',
            textDensity: 'Minimal to none - product speaks for itself',
            style: 'Professional, trustworthy, high-resolution product photography'
        },
        constraints: [
            { id: 'product_name', label: 'Product Name', type: 'text', defaultLevel: 'locked' },
            { id: 'product_color', label: 'Product Color/Variant', type: 'text', defaultLevel: 'locked' },
            { id: 'key_features', label: 'Key Features (3-5 points)', type: 'textarea', defaultLevel: 'preferred' },
            { id: 'brand_logo', label: 'Brand Logo Placement', type: 'text', defaultLevel: 'preferred' },
            { id: 'safety_text', label: 'Safety/Legal Text', type: 'textarea', defaultLevel: 'locked' },
            { id: 'background_style', label: 'Background Style', type: 'text', defaultLevel: 'locked', defaultValue: 'Pure white' },
            { id: 'props', label: 'Props/Context Items', type: 'text', defaultLevel: 'free' }
        ]
    },
    'shopee-tw': {
        name: 'Shopee TW',
        imageCount: 9,
        imagePurposes: [
            'Hero promotional shot with bold text',
            'Feature collage with callouts',
            'Price highlight with savings emphasis',
            'Product comparison or before/after',
            'Customer benefit visualization',
            'Product detail shots (2-3 combined)',
            'Bundle or package deal display',
            'Social proof or rating highlight',
            'Lifestyle usage scene'
        ],
        basePrompt: 'Create an eye-catching promotional product image for Shopee Taiwan marketplace.',
        promptModifiers: {
            background: 'Vibrant gradient or colorful background, can use brand colors',
            lighting: 'Bright, energetic lighting with strong contrasts',
            composition: 'Dynamic, asymmetric layout with text overlay areas reserved',
            textDensity: 'High - multiple callouts, price tags, feature labels',
            style: 'Bold, promotional, attention-grabbing with modern e-commerce aesthetics'
        },
        constraints: [
            { id: 'product_name', label: 'Product Name (Chinese/English)', type: 'text', defaultLevel: 'locked' },
            { id: 'promotional_price', label: 'Price & Discount Info', type: 'text', defaultLevel: 'locked' },
            { id: 'key_selling_points', label: 'Key Selling Points (5-8)', type: 'textarea', defaultLevel: 'locked' },
            { id: 'promotional_message', label: 'Campaign Message (e.g., Flash Sale, Limited)', type: 'text', defaultLevel: 'locked' },
            { id: 'brand_colors', label: 'Brand Colors (hex codes)', type: 'text', defaultLevel: 'preferred' },
            { id: 'text_overlay_zones', label: 'Reserved Text Overlay Areas', type: 'text', defaultLevel: 'preferred' },
            { id: 'lifestyle_context', label: 'Lifestyle Scene Context', type: 'text', defaultLevel: 'preferred' },
            { id: 'background_props', label: 'Background Props/Decorations', type: 'text', defaultLevel: 'free' }
        ]
    },
    'rakuten': {
        name: 'Rakuten',
        imageCount: 7,
        imagePurposes: [
            'Main product image - clear and detailed',
            'Product specifications close-up',
            'Quality/material detail shot',
            'Size chart or dimensional reference',
            'Comparison with similar items',
            'Product in typical use environment',
            'Packaging and accessories included'
        ],
        basePrompt: 'Create a detailed, trustworthy product image for Rakuten marketplace.',
        promptModifiers: {
            background: 'Clean white or light neutral background, professional',
            lighting: 'Clear, accurate color reproduction with detailed shadows',
            composition: 'Organized, information-rich layout suitable for comparison shopping',
            textDensity: 'Moderate - clear labels, specifications, trust markers',
            style: 'Reliable, detailed, informative product photography emphasizing quality and value'
        },
        constraints: [
            { id: 'product_name', label: 'Product Name (Japanese)', type: 'text', defaultLevel: 'locked' },
            { id: 'specifications', label: 'Product Specifications', type: 'textarea', defaultLevel: 'locked' },
            { id: 'quality_claims', label: 'Quality/Material Claims', type: 'textarea', defaultLevel: 'locked' },
            { id: 'size_info', label: 'Size/Dimension Information', type: 'text', defaultLevel: 'preferred' },
            { id: 'trust_markers', label: 'Trust Markers (warranty, certification)', type: 'text', defaultLevel: 'preferred' },
            { id: 'brand_identity', label: 'Brand Logo and Identity', type: 'text', defaultLevel: 'preferred' },
            { id: 'comparison_context', label: 'Comparison Context', type: 'text', defaultLevel: 'free' }
        ]
    }
};

// ===== STATE =====
let state = {
    platform: 'amazon-jp',
    imageCount: 7,
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
            <img src="${img.data}" alt="Product ${index + 1}">
            <button class="remove-btn" onclick="removeProductImage(${index})">×</button>
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
                <img src="${img.data}" alt="Reference ${index + 1}">
                <div class="reference-roles">
                    <h4>Reference Type:</h4>
                    <div class="role-checkboxes">
                        <label>
                            <input type="checkbox" ${img.roles.includes('style') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'style')">
                            Style Reference
                        </label>
                        <label>
                            <input type="checkbox" ${img.roles.includes('layout') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'layout')">
                            Layout Reference
                        </label>
                        <label>
                            <input type="checkbox" ${img.roles.includes('color') ? 'checked' : ''}
                                   onchange="toggleReferenceRole(${index}, 'color')">
                            Color Reference
                        </label>
                    </div>
                </div>
            </div>
            <button class="remove-btn" onclick="removeReferenceImage(${index})" style="position: absolute; top: 1rem; right: 1rem;">×</button>
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
        const savedConstraint = state.constraints[constraint.id] || {
            enabled: false,
            level: constraint.defaultLevel || 'preferred',
            value: constraint.defaultValue || ''
        };

        const item = document.createElement('div');
        item.className = `constraint-item ${savedConstraint.enabled ? savedConstraint.level : 'disabled'}`;
        item.id = `constraint-${constraint.id}`;

        const inputType = constraint.type === 'textarea' ? 'textarea' : 'input';
        const inputTag = constraint.type === 'textarea'
            ? `<textarea rows="3" placeholder="Enter ${constraint.label.toLowerCase()}..." ${!savedConstraint.enabled ? 'disabled' : ''}>${savedConstraint.value}</textarea>`
            : `<input type="text" placeholder="Enter ${constraint.label.toLowerCase()}..." value="${savedConstraint.value}" ${!savedConstraint.enabled ? 'disabled' : ''}>`;

        item.innerHTML = `
            <div class="constraint-header">
                <input type="checkbox" id="check-${constraint.id}" ${savedConstraint.enabled ? 'checked' : ''}
                       onchange="toggleConstraint('${constraint.id}')">
                <label for="check-${constraint.id}">${constraint.label}</label>
                <div class="level-toggle">
                    <button class="level-btn locked ${savedConstraint.level === 'locked' ? 'active' : ''}"
                            onclick="setConstraintLevel('${constraint.id}', 'locked')"
                            ${!savedConstraint.enabled ? 'disabled' : ''}>
                        🔒 Locked
                    </button>
                    <button class="level-btn preferred ${savedConstraint.level === 'preferred' ? 'active' : ''}"
                            onclick="setConstraintLevel('${constraint.id}', 'preferred')"
                            ${!savedConstraint.enabled ? 'disabled' : ''}>
                        ⭐ Preferred
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
    renderConstraints();
}

function setConstraintLevel(id, level) {
    if (!state.constraints[id]) return;
    state.constraints[id].level = level;
    renderConstraints();
}

function updateConstraintValue(id, value) {
    if (!state.constraints[id]) {
        state.constraints[id] = { enabled: false, level: 'preferred', value: '' };
    }
    state.constraints[id].value = value;
}

// ===== IMAGE MANAGEMENT =====
window.removeProductImage = function(index) {
    state.productImages.splice(index, 1);
    renderProductImages();
};

window.removeReferenceImage = function(index) {
    state.referenceImages.splice(index, 1);
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
};

// ===== PROMPT BUILDING =====
function buildPrompt(imageIndex, imagePurpose) {
    const template = PLATFORM_TEMPLATES[state.platform];

    let prompt = `${template.basePrompt}\n\n`;
    prompt += `Image ${imageIndex + 1} of ${state.imageCount}: ${imagePurpose}\n\n`;

    // Add platform modifiers
    prompt += `=== PLATFORM STYLE GUIDELINES ===\n`;
    Object.entries(template.promptModifiers).forEach(([key, value]) => {
        prompt += `${key}: ${value}\n`;
    });
    prompt += `\n`;

    // Add locked constraints
    const lockedConstraints = Object.entries(state.constraints)
        .filter(([_, c]) => c.enabled && c.level === 'locked' && c.value.trim());

    if (lockedConstraints.length > 0) {
        prompt += `=== MUST FOLLOW (LOCKED) ===\n`;
        lockedConstraints.forEach(([id, constraint]) => {
            const templateConstraint = template.constraints.find(c => c.id === id);
            prompt += `${templateConstraint.label}: ${constraint.value}\n`;
        });
        prompt += `\n`;
    }

    // Add preferred constraints
    const preferredConstraints = Object.entries(state.constraints)
        .filter(([_, c]) => c.enabled && c.level === 'preferred' && c.value.trim());

    if (preferredConstraints.length > 0) {
        prompt += `=== PREFERRED (SHOULD FOLLOW) ===\n`;
        preferredConstraints.forEach(([id, constraint]) => {
            const templateConstraint = template.constraints.find(c => c.id === id);
            prompt += `${templateConstraint.label}: ${constraint.value}\n`;
        });
        prompt += `\n`;
    }

    // Add reference images
    if (state.referenceImages.length > 0) {
        prompt += `=== REFERENCE IMAGES ===\n`;

        const styleRefs = state.referenceImages.filter(img => img.roles.includes('style'));
        if (styleRefs.length > 0) {
            prompt += `Style References: ${styleRefs.length} image(s) - Follow the overall aesthetic, mood, and visual style\n`;
        }

        const layoutRefs = state.referenceImages.filter(img => img.roles.includes('layout'));
        if (layoutRefs.length > 0) {
            prompt += `Layout References: ${layoutRefs.length} image(s) - Follow the composition, element placement, and spatial arrangement\n`;
        }

        const colorRefs = state.referenceImages.filter(img => img.roles.includes('color'));
        if (colorRefs.length > 0) {
            prompt += `Color References: ${colorRefs.length} image(s) - Follow the color palette, contrast, and color relationships\n`;
        }
        prompt += `\n`;
    }

    // Add batch direction
    if (state.batchDirection.trim()) {
        prompt += `=== BATCH DIRECTION ===\n`;
        prompt += `${state.batchDirection}\n\n`;
    }

    // Add free fields
    const freeFields = template.constraints
        .filter(c => !state.constraints[c.id]?.enabled)
        .map(c => c.label);

    if (freeFields.length > 0) {
        prompt += `=== CREATIVE FREEDOM ===\n`;
        prompt += `You may freely design the following elements: ${freeFields.join(', ')}\n`;
    }

    return prompt;
}

// ===== GENERATE PROMPTS =====
async function generatePrompts() {
    const generateBtn = document.getElementById('generate-btn');
    const resultsContainer = document.getElementById('results-container');

    // Validation
    if (!state.authReady) {
        alert('Application Default Credentials are not configured on the server.');
        return;
    }

    if (state.productImages.length === 0) {
        alert('Please add at least one product image.');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating...';

    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><span>Generating prompts...</span></div>';

    try {
        const template = PLATFORM_TEMPLATES[state.platform];
        const results = [];

        // Generate prompts for each image
        for (let i = 0; i < state.imageCount; i++) {
            const purpose = template.imagePurposes[i] || `Product image ${i + 1}`;
            const prompt = buildPrompt(i, purpose);

            resultsContainer.innerHTML = `<div class="loading"><div class="spinner"></div><span>Generating image ${i + 1} of ${state.imageCount}...</span></div>`;

            // Call nano banana pro API with service account auth
            const result = await callNanoBananaAPI(
                prompt,
                state.productImages[0].data,
                state.referenceImages
            );

            results.push({
                index: i + 1,
                purpose,
                prompt,
                imageUrl: result.imageUrl,
                timestamp: new Date().toISOString()
            });
        }

        // Save batch to IndexedDB
        const batch = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            platform: state.platform,
            imageCount: state.imageCount,
            inputs: {
                productImages: state.productImages,
                referenceImages: state.referenceImages,
                constraints: state.constraints,
                batchDirection: state.batchDirection
            },
            results
        };

        await saveBatch(batch);
        state.currentBatch = batch;

        // Render results
        renderResults(results);
        await loadHistory();

    } catch (error) {
        console.error('Generation failed:', error);
        resultsContainer.innerHTML = `<div class="empty-state"><span class="icon">❌</span><p>Generation failed: ${error.message}</p></div>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '🚀 Generate Prompts';
    }
}

// Nano Banana Pro API - server-provided ADC token
async function callNanoBananaAPI(prompt, productImage, referenceImages = []) {
    try {
        const toImageInput = (dataUrl) => {
            const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
            if (!match) throw new Error('An uploaded image has an unsupported format.');

            return {
                type: 'image',
                mime_type: match[1],
                data: match[2]
            };
        };

        const input = [
            { type: 'text', text: prompt },
            { type: 'text', text: 'Primary product image. Preserve its identity and appearance.' },
            toImageInput(productImage)
        ];

        referenceImages.forEach((image, index) => {
            const roles = image.roles.length > 0 ? image.roles.join(', ') : 'general inspiration';
            input.push(
                { type: 'text', text: `Reference image ${index + 1}; use for: ${roles}.` },
                toImageInput(image.data)
            );
        });

        const payload = {
            model: 'gemini-3-pro-image',
            input,
            response_format: {
                type: 'image',
                mime_type: 'image/png',
                image_size: '2K'
            },
            store: false
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
        const outputImage = result.output_image;

        if (!outputImage?.data) {
            throw new Error('Gemini returned no generated image.');
        }

        return {
            imageUrl: `data:${outputImage.mime_type || 'image/png'};base64,${outputImage.data}`,
            metadata: result
        };
    } catch (error) {
        console.error('Nano Banana API error:', error);
        throw error;
    }
}

function renderResults(results) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h3>Image ${result.index}: ${result.purpose}</h3>
            <img src="${result.imageUrl}" alt="Generated ${result.index}" class="result-image">
            <details class="result-prompt">
                <summary>View Prompt</summary>
                <pre>${result.prompt}</pre>
            </details>
        `;
        container.appendChild(item);
    });
}

// ===== HISTORY =====
async function loadHistory() {
    const container = document.getElementById('history-container');
    const batches = await loadBatches();

    if (batches.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="icon">📚</span><p>No saved batches yet</p></div>';
        return;
    }

    // Sort by timestamp descending
    batches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = '';

    batches.forEach(batch => {
        const date = new Date(batch.timestamp);
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <h4>${PLATFORM_TEMPLATES[batch.platform].name} - ${batch.imageCount} images</h4>
            <div class="timestamp">${date.toLocaleString()}</div>
            <div class="meta">${batch.results.length} images generated</div>
        `;
        item.onclick = () => loadBatch(batch);
        container.appendChild(item);
    });
}

function loadBatch(batch) {
    // Restore state from batch
    state.platform = batch.platform;
    state.imageCount = batch.imageCount;
    state.productImages = batch.inputs.productImages;
    state.referenceImages = batch.inputs.referenceImages;
    state.constraints = batch.inputs.constraints;
    state.batchDirection = batch.inputs.batchDirection;
    state.currentBatch = batch;

    // Update UI
    document.getElementById('platform-select').value = batch.platform;
    document.getElementById('image-count').value = batch.imageCount;
    document.getElementById('batch-direction').value = batch.inputs.batchDirection;

    renderProductImages();
    renderReferenceImages();
    renderConstraints();
    renderResults(batch.results);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SAVE DRAFT =====
async function saveDraft() {
    if (state.productImages.length === 0) {
        alert('Nothing to save. Add at least one product image first.');
        return;
    }

    const batch = {
        id: state.currentBatch?.id || generateId(),
        timestamp: new Date().toISOString(),
        platform: state.platform,
        imageCount: state.imageCount,
        inputs: {
            productImages: state.productImages,
            referenceImages: state.referenceImages,
            constraints: state.constraints,
            batchDirection: state.batchDirection
        },
        results: state.currentBatch?.results || []
    };

    await saveBatch(batch);
    state.currentBatch = batch;
    await loadHistory();

    alert('Draft saved successfully!');
}

// ===== UTILITY =====
function generateId() {
    return 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB
    await initDB();

    // Setup dropzones
    setupDropzone('product-dropzone', 'product-file-input', (data, name) => {
        state.productImages.push({ data, name });
        renderProductImages();
    });

    setupDropzone('reference-dropzone', 'reference-file-input', (data, name) => {
        state.referenceImages.push({ data, name, roles: [] });
        renderReferenceImages();
    });

    // Platform change
    document.getElementById('platform-select').addEventListener('change', (e) => {
        state.platform = e.target.value;
        state.constraints = {}; // Reset constraints when platform changes
        renderConstraints();
    });

    // Image count change
    document.getElementById('image-count').addEventListener('change', (e) => {
        state.imageCount = parseInt(e.target.value);
    });

    // Batch direction
    document.getElementById('batch-direction').addEventListener('input', (e) => {
        state.batchDirection = e.target.value;
    });

    // Generate button
    document.getElementById('generate-btn').addEventListener('click', generatePrompts);

    // Save draft button
    document.getElementById('save-draft-btn').addEventListener('click', saveDraft);

    const authStatus = document.getElementById('auth-status');
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) throw new Error('ADC is unavailable');

        state.authReady = true;
        authStatus.textContent = 'Application Default Credentials ready';
        authStatus.style.color = 'var(--success)';
    } catch (error) {
        state.authReady = false;
        authStatus.textContent = 'Application Default Credentials unavailable';
        authStatus.style.color = 'var(--danger)';
        console.error('ADC status check failed:', error);
    }

    // Initial render
    renderConstraints();
    await loadHistory();
});
