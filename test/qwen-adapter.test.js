const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../auth-service');

test('Qwen adapter preserves the prompt and selects up to three labeled images', () => {
    const payload = app.transformToQwenFormat({
        contents: [{ parts: [
            { text: 'Create a clean product poster.' },
            { text: 'Product identity image 1.' },
            { inlineData: { mimeType: 'image/png', data: 'data:image/png;base64,PRODUCT1' } },
            { text: 'Product identity image 2.' },
            { inlineData: { mimeType: 'image/png', data: 'PRODUCT2' } },
            { text: 'Visual reference 1: use its palette.' },
            { inlineData: { mimeType: 'image/jpeg', data: 'REFERENCE1' } },
            { text: 'Visual reference 2: use its layout.' },
            { inlineData: { mimeType: 'image/jpeg', data: 'REFERENCE2' } }
        ] }],
        generationConfig: { imageConfig: { aspectRatio: '3:4' } }
    });

    assert.equal(payload.prompt, 'Create a clean product poster.');
    assert.deepEqual(payload.product_images, ['PRODUCT1', 'PRODUCT2']);
    assert.deepEqual(payload.reference_images, ['REFERENCE1']);
    assert.equal(payload.config.aspect_ratio, '3:4');
});

test('Qwen adapter returns the Vertex-compatible single-image response', () => {
    const response = app.transformToVertexFormat({
        image: 'data:image/png;base64,OUTPUT',
        metadata: { model: 'Qwen/Qwen-Image-Edit-2509', w: 1024, h: 1024 }
    });

    assert.equal(response.candidates[0].finishReason, 'STOP');
    assert.equal(response.candidates[0].content.parts[1].inlineData.data, 'OUTPUT');
    assert.equal(response.usageMetadata.backend, 'qwen');
});

test('Qwen adapter rejects requests without a product image', () => {
    assert.throws(
        () => app.transformToQwenFormat({ contents: [{ parts: [{ text: 'Make an image.' }] }] }),
        /product image/
    );
});
