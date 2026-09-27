const positiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const imageGenBackend = process.env.IMAGE_GEN_BACKEND || 'qwen';
if (!['qwen', 'gemini'].includes(imageGenBackend)) {
    throw new Error(`Unsupported IMAGE_GEN_BACKEND: ${imageGenBackend}`);
}

module.exports = {
    imageGenBackend,
    qwen: {
        serviceUrl: process.env.QWEN_SERVICE_URL || 'http://127.0.0.1:8001',
        timeoutMs: positiveInteger(process.env.QWEN_TIMEOUT_MS, 300000),
        modelId: process.env.QWEN_MODEL_ID || 'Qwen/Qwen-Image-Edit-2509'
    },
    gemini: {
        projectId: process.env.GEMINI_PROJECT_ID,
        location: process.env.GEMINI_LOCATION || 'global',
        modelId: process.env.GEMINI_MODEL_ID || 'gemini-3-pro-image',
        shaperModelId: process.env.SHAPER_MODEL_ID || 'gemini-3.5-flash'
    }
};
