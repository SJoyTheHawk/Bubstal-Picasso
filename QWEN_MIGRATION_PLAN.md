# Migration Plan: Nano Banana to Qwen Image Edit

> **Validation status (2026-09-18): superseded for implementation.** The Python
> example below incorrectly loads this Diffusers model through
> `AutoModelForCausalLM`, and the original single-image design drops this app's
> product views and visual references. Use `QWEN_AWS_IMPLEMENTATION_GUIDE.md`
> and the checked-in `qwen-service/` implementation instead. This document is
> retained as background planning context only.

## Executive Summary

This document outlines the plan to replace the current Nano Banana (Google Gemini) API calls with local Qwen Image Edit model inference. Qwen Image Edit is chosen for its strong Chinese character support and local inference capabilities.

**Key Objectives:**
- Replace remote Gemini API calls with local Qwen Image Edit inference
- Maintain existing prompt structure and workflow
- Preserve Chinese language support throughout the system
- Eliminate dependency on Google Cloud Platform credentials

---

## Current Architecture Analysis

### Current Flow
```
User Input → Shaper (Gemini 3.5 Flash) → Prompt Building → Generation (Gemini 3 Pro Image) → Results
           ↓                                              ↓
    Google ADC Auth                                Google ADC Auth
```

### Key Components to Modify

1. **auth-service.js** (lines 71-96, 100-119)
   - `/api/generate` endpoint: Calls Gemini 3 Pro Image via Vertex AI
   - `/api/shape` endpoint: Calls Gemini 3.5 Flash for planning

2. **app.js** (lines 1454-1547)
   - `callNanoBananaAPI()`: Constructs Vertex AI payload and processes response
   - Handles image encoding/decoding (base64)
   - Processes multi-part responses with images

3. **Authentication System**
   - Google Application Default Credentials (ADC)
   - Project ID resolution
   - OAuth token management

---

## Qwen Image Edit Overview

### Model Information
- **Repository**: https://huggingface.co/Qwen/Qwen-Image-Edit
- **Capabilities**: 
  - Text-guided image editing
  - Strong Chinese character rendering
  - Multi-modal input (text + images)
  - Local inference support

### Technical Requirements
- Python runtime with transformers library
- GPU recommended (CUDA support)
- Model weights download (~several GB)
- torch, transformers, Pillow dependencies

---

## Migration Strategy

### Phase 1: Infrastructure Setup

#### 1.1 Python Backend Service
Create a new Python service to handle Qwen inference:

**File**: `qwen-service.py`
- FastAPI or Flask web server
- Qwen model loading and inference
- Image encoding/decoding utilities
- Request/response format matching current API

**Key Functions**:
```python
- load_qwen_model()          # Initialize model
- generate_image(prompt, product_images, reference_images)
- encode_image()             # Base64 encoding
- decode_image()             # Base64 decoding
```

#### 1.2 Node.js Proxy Updates
Modify `auth-service.js`:
- Replace Google API calls with local Qwen service calls
- Remove Google ADC dependencies (keep for Shaper if needed)
- Update endpoint routing

---

### Phase 2: API Adaptation Layer

#### 2.1 Request Format Translation
Map current Vertex AI format to Qwen format:

**Current (Vertex AI)**:
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      {"text": "prompt"},
      {"inlineData": {"mimeType": "image/png", "data": "base64..."}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}
  }
}
```

**New (Qwen)**:
```json
{
  "prompt": "text prompt",
  "product_images": ["base64_1", "base64_2", ...],
  "reference_images": ["base64_1", ...],
  "config": {
    "aspect_ratio": "1:1",
    "width": 1024,
    "height": 1024
  }
}
```

#### 2.2 Response Format Translation
Map Qwen output to current format:

**Current Response**:
```json
{
  "candidates": [{
    "content": {
      "parts": [
        {"text": "description"},
        {"inlineData": {"mimeType": "image/png", "data": "base64..."}}
      ]
    },
    "finishReason": "STOP"
  }],
  "usageMetadata": {...}
}
```

**Maintain this structure** for minimal frontend changes.

---

### Phase 3: Core Component Updates

#### 3.1 Update `auth-service.js`

**Changes to `/api/generate`**:
```javascript
app.post('/api/generate', async (req, res) => {
    try {
        // Transform request to Qwen format
        const qwenPayload = transformToQwenFormat(req.body);
        
        // Call local Qwen service
        const response = await fetch('http://localhost:8001/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(qwenPayload)
        });
        
        if (!response.ok) {
            throw new Error(`Qwen service error: ${response.status}`);
        }
        
        const qwenResult = await response.json();
        
        // Transform response to Vertex AI format
        const vertexFormat = transformToVertexFormat(qwenResult);
        
        res.json(vertexFormat);
    } catch (error) {
        console.error('Qwen generation failed:', error);
        res.status(500).json({
            error: 'Image generation failed',
            message: error.message
        });
    }
});
```

**New Helper Functions**:
```javascript
function transformToQwenFormat(vertexPayload) {
    // Extract prompt text and images
    // Flatten multi-part structure
    // Return Qwen-compatible payload
}

function transformToVertexFormat(qwenResponse) {
    // Wrap Qwen output in Vertex AI response structure
    // Maintain compatibility with existing frontend
}
```

#### 3.2 Update `app.js`

**Minimal changes needed** due to adapter layer, but verify:
- Line 1454-1547: `callNanoBananaAPI()` should work as-is
- Image encoding/decoding logic preserved
- Error handling paths updated

#### 3.3 Shaper Component Decision

**Options for Shaper**:

**Option A: Keep Gemini for Planning**
- Pros: Planning works well, minimal changes
- Cons: Still depends on Google Cloud
- Implementation: Keep `/api/shape` endpoint as-is

**Option B: Replace with Qwen Text Model**
- Pros: Full local inference
- Cons: May need prompt adaptation
- Implementation: Use Qwen2-VL or Qwen-Chat for planning

**Recommendation**: Start with Option A, migrate later if needed

---

### Phase 4: Qwen Service Implementation

#### 4.1 Python Service Structure

**File**: `qwen-service/main.py`
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import base64
from PIL import Image
from io import BytesIO
import torch
from transformers import AutoModelForCausalLM, AutoProcessor

app = FastAPI()

# Global model instance
model = None
processor = None

class GenerationRequest(BaseModel):
    prompt: str
    product_images: List[str]  # base64 encoded
    reference_images: List[str] = []
    config: dict = {}

class GenerationResponse(BaseModel):
    image: str  # base64 encoded
    metadata: dict

@app.on_event("startup")
async def load_model():
    global model, processor
    model = AutoModelForCausalLM.from_pretrained(
        "Qwen/Qwen-Image-Edit",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    processor = AutoProcessor.from_pretrained("Qwen/Qwen-Image-Edit")

@app.post("/generate")
async def generate(request: GenerationRequest) -> GenerationResponse:
    # Decode images
    product_imgs = [decode_base64_image(img) for img in request.product_images]
    reference_imgs = [decode_base64_image(img) for img in request.reference_images]
    
    # Prepare model input
    inputs = processor(
        text=request.prompt,
        images=product_imgs + reference_imgs,
        return_tensors="pt"
    ).to(model.device)
    
    # Generate
    with torch.no_grad():
        outputs = model.generate(**inputs)
    
    # Extract generated image
    generated_image = processor.decode_image(outputs)
    
    # Encode to base64
    buffered = BytesIO()
    generated_image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return GenerationResponse(
        image=img_str,
        metadata={"model": "Qwen-Image-Edit", "status": "success"}
    )

def decode_base64_image(base64_str: str) -> Image:
    img_data = base64.b64decode(base64_str)
    return Image.open(BytesIO(img_data))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

#### 4.2 Dependencies

**File**: `qwen-service/requirements.txt`
```txt
fastapi==0.109.0
uvicorn==0.27.0
torch>=2.1.0
transformers>=4.37.0
Pillow>=10.0.0
pydantic==2.5.0
```

#### 4.3 Deployment Script

**File**: `qwen-service/start.sh`
```bash
#!/bin/bash

# Check if model is downloaded
if [ ! -d "./models/Qwen-Image-Edit" ]; then
    echo "Downloading Qwen Image Edit model..."
    python download_model.py
fi

# Start service
python main.py
```

---

### Phase 5: Configuration Management

#### 5.1 Environment Variables

**Update `.env` file**:
```bash
# Image generation backend
IMAGE_GEN_BACKEND=qwen  # or 'gemini'
QWEN_SERVICE_URL=http://localhost:8001
QWEN_MODEL_PATH=./models/Qwen-Image-Edit

# Legacy Gemini config (optional, for Shaper)
GEMINI_PROJECT_ID=your-project-id
GEMINI_LOCATION=global
SHAPER_MODEL_ID=gemini-3.5-flash
```

#### 5.2 Config Loading

**File**: `config.js`
```javascript
module.exports = {
    imageGenBackend: process.env.IMAGE_GEN_BACKEND || 'qwen',
    qwen: {
        serviceUrl: process.env.QWEN_SERVICE_URL || 'http://localhost:8001',
        modelPath: process.env.QWEN_MODEL_PATH || './models/Qwen-Image-Edit'
    },
    gemini: {
        projectId: process.env.GEMINI_PROJECT_ID,
        location: process.env.GEMINI_LOCATION || 'global',
        modelId: process.env.GEMINI_MODEL_ID || 'gemini-3-pro-image',
        shaperModelId: process.env.SHAPER_MODEL_ID || 'gemini-3.5-flash'
    }
};
```

---

### Phase 6: Testing Strategy

#### 6.1 Unit Tests
- Qwen service endpoint responses
- Format transformation functions
- Image encoding/decoding

#### 6.2 Integration Tests
- End-to-end generation flow
- Prompt record compilation
- Result storage and retrieval

#### 6.3 Comparison Tests
- Generate same prompt with both backends
- Compare output quality
- Validate Chinese character rendering

#### 6.4 Performance Tests
- Latency measurements (Gemini vs Qwen)
- Concurrent request handling
- Memory usage monitoring

---

### Phase 7: Rollout Plan

#### Step 1: Development Environment (Week 1-2)
1. Set up Qwen Python service
2. Implement adapter layer
3. Update Node.js proxy
4. Run basic smoke tests

#### Step 2: Testing & Validation (Week 3)
1. Comprehensive testing with real prompts
2. Chinese character validation
3. Performance benchmarking
4. Bug fixes and refinements

#### Step 3: Parallel Running (Week 4)
1. Deploy both backends
2. Toggle via config flag
3. A/B comparison testing
4. Collect quality feedback

#### Step 4: Migration (Week 5)
1. Default to Qwen backend
2. Keep Gemini as fallback
3. Monitor production usage
4. Document issues

#### Step 5: Cleanup (Week 6)
1. Remove Gemini dependency (optional)
2. Update documentation
3. Finalize deployment scripts

---

## Risk Assessment

### High Priority Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Model quality lower than Gemini | High | Keep fallback option, extensive testing |
| Chinese characters render poorly | High | Validate with diverse test cases before cutover |
| Inference too slow | Medium | GPU acceleration, optimize model loading |
| High memory usage | Medium | Model quantization, batch size tuning |

### Medium Priority Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prompt format incompatibility | Medium | Careful adapter implementation |
| Installation complexity | Medium | Docker containerization |
| Model updates/maintenance | Low | Version pinning, update schedule |

---

## Resource Requirements

### Hardware
- **GPU**: NVIDIA GPU with 16GB+ VRAM (recommended)
- **RAM**: 32GB+ system RAM
- **Storage**: 50GB for model weights and cache

### Software
- Python 3.9+
- Node.js 18+ (existing)
- CUDA 11.8+ (for GPU acceleration)

### Personnel
- 1 Backend developer (Node.js/Python)
- 1 ML engineer (model integration)
- 1 QA tester (validation)

---

## Success Criteria

1. ✅ Generate images with Qwen matching Gemini quality
2. ✅ Chinese characters render correctly in all test cases
3. ✅ Latency <30s per image (acceptable for batch workflow)
4. ✅ Zero Google Cloud dependency for generation
5. ✅ All existing features work without regression
6. ✅ Documentation complete and deployment scripted

---

## Future Enhancements

### Short Term
- Model quantization for faster inference
- Batch processing optimization
- Image quality presets

### Long Term
- Fine-tune Qwen for eCommerce product images
- Support multiple aspect ratios
- Multi-language UI improvements
- Advanced style transfer controls

---

## Appendix: File Change Summary

### New Files
- `qwen-service/main.py` - Qwen inference service
- `qwen-service/requirements.txt` - Python dependencies
- `qwen-service/start.sh` - Service startup script
- `qwen-service/download_model.py` - Model download utility
- `config.js` - Centralized configuration
- `Dockerfile.qwen` - Container for Qwen service
- `docker-compose.yml` - Multi-service orchestration

### Modified Files
- `auth-service.js` - Add Qwen adapter, update endpoints
- `package.json` - Update dependencies if needed
- `README.md` - Update setup instructions
- `.env.example` - Add Qwen configuration template
- `.gitignore` - Exclude model weights directory

### Optional Modifications
- `app.js` - Minor updates if response format changes
- `test/app.test.js` - Add Qwen-specific tests

---

## Questions for Discussion

1. **Shaper Strategy**: Keep Gemini for planning or migrate to Qwen text model?
2. **Deployment**: Docker containers or bare metal? Cloud VM or on-premise?
3. **GPU Access**: Dedicated GPU server or shared compute?
4. **Fallback**: Keep Gemini as production fallback indefinitely?
5. **Timeline**: Is 6-week timeline acceptable or need acceleration?

---

**Document Version**: 1.0  
**Date**: 2026-09-18  
**Author**: Migration Planning Team
