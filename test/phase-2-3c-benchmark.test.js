const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { assessShaperResponse, executeImageRun } = require('../scripts/phase-2-3c-benchmark');

function response(plan, finishReason = 'STOP') {
    return {
        candidates: [{
            finishReason,
            content: { parts: [{ text: typeof plan === 'string' ? plan : JSON.stringify(plan) }] }
        }]
    };
}

test('benchmark accepts a complete Shaper plan with the requested slots', () => {
    const assessment = assessShaperResponse(response({
        resolvedImageCount: 3,
        slots: [{ index: 1 }, { index: 2 }, { index: 3 }]
    }), 3);

    assert.equal(assessment.parseable, true);
    assert.equal(assessment.slotCountMatches, true);
    assert.equal(assessment.resolvedImageCountMatches, true);
    assert.equal(assessment.readyForImageGeneration, true);
});

test('benchmark flags a parseable plan with missing slots', () => {
    const assessment = assessShaperResponse(response({
        resolvedImageCount: 3,
        slots: [{ index: 1 }]
    }), 3);

    assert.equal(assessment.parseable, true);
    assert.equal(assessment.returnedSlotCount, 1);
    assert.deepEqual(assessment.missingSlotIndexes, [2, 3]);
    assert.equal(assessment.readyForImageGeneration, false);
});

test('benchmark flags truncated and malformed Shaper output', () => {
    const assessment = assessShaperResponse(response('{"slots":[', 'MAX_TOKENS'), 3);

    assert.equal(assessment.finishReason, 'MAX_TOKENS');
    assert.equal(assessment.parseable, false);
    assert.equal(assessment.missingSlotIndexes.length, 3);
    assert.equal(assessment.readyForImageGeneration, false);
});

test('image execution saves a generated slot and checkpoints review metadata', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-2-3c-image-'));
    const requestPath = path.join(dir, 'slot-01.request.json');
    const imagePath = path.join(dir, 'slot-01.png');
    const outputPath = path.join(dir, 'image-run.json');
    fs.writeFileSync(requestPath, JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Product photo' }] }] }));
    const originalFetch = global.fetch;
    global.fetch = async url => ({
        ok: true,
        async json() {
            return url.endsWith('/api/auth/status')
                ? { authenticated: true, imageBackend: 'gemini', model: 'test-image-model', projectId: 'test', location: 'global' }
                : { candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'UE5H' } }] } }] };
        }
    });
    const imageRun = {
        imageModel: 'test-image-model',
        cases: [{ arms: [{ status: 'prepared', slots: [{ slot: 1, requestPath, imagePath }] }] }]
    };
    try {
        await executeImageRun(imageRun, outputPath, 'http://localhost:3000', 'gemini');
        assert.equal(imageRun.status, 'pending-human-review');
        assert.equal(imageRun.cases[0].arms[0].slots[0].status, 'success');
        assert.equal(fs.readFileSync(imagePath, 'utf8'), 'PNG');
        assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).status, 'pending-human-review');
    } finally {
        global.fetch = originalFetch;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
