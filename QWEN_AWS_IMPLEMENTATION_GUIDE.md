# Code Guide: Nano Banana → Qwen-Image-Edit on Ubuntu (AWS)

Target: EC2 Ubuntu + Node `auth-service.js` proxy + local Python `qwen-service` (port 8001).
The frontend request/response contract stays unchanged; only backend/model metadata
handling is generalized.

> Correction to `QWEN_MIGRATION_PLAN.md`: `Qwen/Qwen-Image-Edit` is a **Diffusers**
> model, not `AutoModelForCausalLM`. The plan's `main.py` will not run.
> Use `QwenImageEditPlusPipeline` below for this app's multi-image workflow.

## Validation Corrections Applied

The original migration plan and the first draft of this guide had four implementation
problems that are corrected in the repository:

* Diffusers added the Qwen Image pipelines in 0.35.0; `diffusers>=0.32.0` cannot
  import them. The service pins the current stable 0.40 series for Edit Plus fixes.
* `QwenImageEditPipeline` accepts one input image. This app sends product views and
  visual references, so the service uses the official `Qwen-Image-Edit-2509` Plus
  pipeline. Its model card documents best results with one to three input images;
  the Node adapter selects at most three, prioritizing product images.
* `QwenImageEditPipeline.download()` is not a valid API. Model warming uses
  `huggingface_hub.snapshot_download`; `from_pretrained` then loads the cached model.
* The model is a 20B-parameter BF16 checkpoint (the Hub repository is tens of GB,
  not ~20 GB). A 24 GB A10G should use sequential CPU offload. Generation time and
  memory use must be measured on the selected instance; the former `<30s` acceptance
  target is not guaranteed with CPU offload.

The checked-in implementation also serializes requests because one Diffusers pipeline
is stateful and cannot safely execute the browser's two concurrent slot calls at once.

## 1. AWS Architecture

```text
Browser → :3000 Node (auth-service.js)
            ├─ /api/shape    → Vertex AI (Gemini 3.5 Flash, keep as-is)
            └─ /api/generate → localhost:8001/generate (Qwen, new)
                                  └─ QwenImageEditPlusPipeline (CUDA)
```

Recommended instance:

| Use | Instance | Notes |
| --- | --- | --- |
| Prod baseline | `g6e.2xlarge` (48GB VRAM, 64GB RAM) | Benchmark with model offload |
| Lower-cost test | `g5.4xlarge` (24GB VRAM, 64GB RAM) | Sequential offload; expect slower inference |
| Storage | 150GB gp3 EBS | Tens of GB for weights + cache + outputs |

Security Group: open `22` (your IP), `3000` (or `80/443` if nginx).
Keep `8001` **closed** (localhost only).

AMI choice: `Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.x (Ubuntu 22.04)`.
It already has drivers + CUDA + Docker + nvidia-container-toolkit.

## 2. Ubuntu Base Setup

```bash
# Ubuntu 22.04 / 24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.10 python3.10-venv python3-pip \
  git htop nvtop nginx

# verify GPU
nvidia-smi

# Node 20 (repo uses Express 4 + google-auth-library 9)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# clone app
git clone <your-repo> ~/picaso && cd ~/picaso
npm ci
```

If not on DL AMI (vanilla Ubuntu):

```bash
# drivers + docker + nvidia toolkit (DL AMI skips this)
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER  # re-login after
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

## 3. Qwen Service (Python)

Layout:

```text
qwen-service/
  main.py
  requirements.txt
  download_model.py
  start.sh
models/          # gitignored, tens of GB for weights/cache
```

### 3.1 `qwen-service/requirements.txt`

```txt
fastapi>=0.115,<1
uvicorn[standard]>=0.30,<1
pydantic>=2.8,<3
torch>=2.4,<3
transformers>=4.51.3,<6
diffusers>=0.40,<0.41
accelerate>=1.0,<2
safetensors>=0.4,<1
huggingface-hub>=0.26,<1
Pillow>=10,<13
```

### 3.2 `qwen-service/main.py`

The checked-in service uses the official `QwenImageEditPlusPipeline` with
`Qwen/Qwen-Image-Edit-2509`. It accepts one to three images, maps the configured
aspect ratio to a 32-pixel-aligned output size, returns one PNG, and serializes
generation calls behind an async lock. `QWEN_OFFLOAD_MODE=sequential` is the
default because it is the safest mode on 16-24 GB GPUs; `model` is faster when
the largest pipeline component fits in VRAM, and `none` requires the full
pipeline to fit. The complete implementation is [qwen-service/main.py](qwen-service/main.py).

### 3.3 `qwen-service/download_model.py`

```python
import os
from huggingface_hub import snapshot_download

mid = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
print(snapshot_download(repo_id=mid))
```

### 3.4 Install + run

```bash
cd ~/picaso
python3 -m venv .venv-qwen
source .venv-qwen/bin/activate
pip install -U pip
pip install -r qwen-service/requirements.txt

# optional HF mirror / cache on big disk
export HF_HOME=~/picaso/models/hf-cache
export QWEN_MODEL_ID="Qwen/Qwen-Image-Edit-2509"
export QWEN_OFFLOAD_MODE=sequential  # use model/none only after measuring VRAM

python qwen-service/download_model.py   # one-time; expect tens of GB
python qwen-service/main.py
# test in another shell:
curl localhost:8001/health
```

## 4. Node Adapter (`auth-service.js` + `config.js`)

### 4.1 `config.js` (new)

```js
module.exports = {
  imageGenBackend: process.env.IMAGE_GEN_BACKEND || 'qwen', // 'qwen' | 'gemini'
  qwen: {
    serviceUrl: process.env.QWEN_SERVICE_URL || 'http://127.0.0.1:8001',
  timeoutMs: parseInt(process.env.QWEN_TIMEOUT_MS || '300000', 10),
  },
  gemini: {
    projectId: process.env.GEMINI_PROJECT_ID,
    location: process.env.GEMINI_LOCATION || 'global',
    modelId: process.env.GEMINI_MODEL_ID || 'gemini-3-pro-image',
    shaperModelId: process.env.SHAPER_MODEL_ID || 'gemini-3.5-flash',
  }
};
```

### 4.2 Patch `auth-service.js` — `/api/generate`

Keep `/api/shape` (lines 100-119) exactly as-is (still Gemini).
Replace `/api/generate` (lines 71-96) with backend switch:

```js
const config = require('./config');

function stripDataPrefix(s) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(s || '');
  return m ? m[1] : s;
}
function toDataUrl(b64, mime = 'image/png') {
  return b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`;
}

// Vertex generateContent -> Qwen {prompt, product_images, reference_images, config}
function transformToQwenFormat(vertexBody) {
  const parts = vertexBody?.contents?.[0]?.parts || [];
  const texts = parts.filter(p => p.text).map(p => p.text);
  const b64s  = parts.filter(p => p.inlineData?.data).map(p => p.inlineData.data);
  // app.js interleaves label-text + image: even texts are slot prompt / labels.
  // Heuristic that matches current app.js layout:
  const prompt = texts[0] || texts.join('\n');
  const nProd = (vertexBody._picasoHint?.nProduct) ?? null; // optional hint (see below)
  const product_images = nProd != null ? b64s.slice(0, nProd).map(stripDataPrefix)
                                      : b64s.map(stripDataPrefix);
  const reference_images = nProd != null ? b64s.slice(nProd).map(stripDataPrefix) : [];
  return {
    prompt,
    product_images,
    reference_images,
    config: {
      aspect_ratio: vertexBody?.generationConfig?.imageConfig?.aspectRatio || '1:1',
      // Qwen native is ~1K; keep 1024
    }
  };
}

// Qwen {image} -> Vertex {candidates[0].content.parts[]} so app.js parses unchanged
function transformToVertexFormat(qwenJson) {
  return {
    candidates: [{ content: { parts: [
      { text: `Generated by ${qwenJson.metadata?.model || 'Qwen-Image-Edit'}` },
      { inlineData: { mimeType: 'image/png', data: stripDataPrefix(qwenJson.image) } }
    ]}, finishReason: 'STOP' }],
    usageMetadata: { backend: 'qwen', ...qwenJson.metadata },
  };
}

app.post('/api/generate', async (req, res) => {
  if (config.imageGenBackend !== 'qwen') {
    // ... existing Vertex passthrough (old lines 72-95) as gemini fallback
  }
  try {
    const qwenPayload = transformToQwenFormat(req.body);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), config.qwen.timeoutMs);
    const r = await fetch(`${config.qwen.serviceUrl}/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qwenPayload), signal: ctl.signal,
    }).finally(() => clearTimeout(t));
    if (!r.ok) throw new Error(`Qwen service ${r.status}: ${await r.text()}`);
    res.json(transformToVertexFormat(await r.json()));
  } catch (e) {
    console.error('Qwen generation failed:', e.message);
    res.status(502).json({ error: 'Image generation failed', message: e.message });
  }
});
```

The adapter uses the existing `Product identity image ...` and `Visual reference ...`
labels in `app.js`, so the product/reference split is exact without changing the
frontend request body. It retains at most three images and prioritizes product views.

Add dependency: `npm i node-fetch@2` only if Node <18. Node 20 has global `fetch`.

### 4.3 `.env.example` + `.gitignore`

```bash
# .env
IMAGE_GEN_BACKEND=qwen
QWEN_SERVICE_URL=http://127.0.0.1:8001
QWEN_TIMEOUT_MS=300000
QWEN_MODEL_ID=Qwen/Qwen-Image-Edit-2509
QWEN_OFFLOAD_MODE=sequential
# Shaper stays on Gemini:
GEMINI_PROJECT_ID=
GEMINI_LOCATION=global
SHAPER_MODEL_ID=gemini-3.5-flash
GEMINI_MODEL_ID=gemini-3-pro-image  # fallback only
PORT=3000
```

```text
# .gitignore append:
models/
.venv-qwen/
.env
```

## 5. Run as Services on Ubuntu

### systemd — Qwen

`/etc/systemd/system/qwen.service`:

```ini
[Unit]
Description=Qwen Image Edit service
After=network.target
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/picaso
Environment="PATH=/home/ubuntu/picaso/.venv-qwen/bin:/usr/bin"
Environment="HF_HOME=/home/ubuntu/picaso/models/hf-cache"
Environment="QWEN_MODEL_ID=Qwen/Qwen-Image-Edit-2509"
Environment="QWEN_OFFLOAD_MODE=sequential"
ExecStart=/home/ubuntu/picaso/.venv-qwen/bin/python qwen-service/main.py
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
```

### systemd — Node

`/etc/systemd/system/picaso.service`:

```ini
[Unit]
Description=Bubstal Picaso Node proxy
After=network.target qwen.service
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/picaso
Environment="IMAGE_GEN_BACKEND=qwen"
Environment="QWEN_SERVICE_URL=http://127.0.0.1:8001"
Environment="PORT=3000"
# Shaper via attached IAM / ADC — no key file on server:
# Environment="GEMINI_PROJECT_ID=your-project"
ExecStart=/usr/bin/node auth-service.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qwen picaso
journalctl -u qwen -f
journalctl -u picaso -f
```

### nginx (optional, :80 → :3000)

```bash
sudo tee /etc/nginx/sites-enabled/picaso <<'EOF'
server {
  listen 80;
  client_max_body_size 50m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_read_timeout 300s; }
}
EOF
sudo nginx -t && sudo systemctl reload nginx
```

Docker alternative: keep Node native, run Qwen in
`nvidia/cuda:12.1.0-runtime-ubuntu22.04` with `--gpus all`.
Compose is otherwise equivalent to the two systemd units.

## 6. Verify End-to-End

```bash
# 1. Qwen health
curl localhost:8001/health
# 2. Node status (Shaper ADC still required)
curl localhost:3000/api/auth/status
# 3. Real slot payload through the adapter (copy from browser devtools or test/)
curl -X POST localhost:3000/api/generate \
  -H 'Content-Type: application/json' -d @test-slot-payload.json | head -c 300
# 4. Browser: http://<ec2-ip>:3000 → Preview Prompts → Generate Batch (2 concurrent slots, as before)
```

Acceptance: Chinese headlines render, every request returns a single PNG, and
product/reference selection is preserved up to Qwen's three-image limit. Measure
latency and memory on the selected GPU before setting a production SLO; sequential
offload on a 24 GB A10G is expected to be slower than an in-VRAM run.

## 7. Ops Notes

* **Shaper on EC2:** attach an instance IAM role / workload identity for Vertex;
  never copy `auth/*.json` to the server (already gitignored).
* **OOM:** use `QWEN_OFFLOAD_MODE=sequential`, lower steps to 30, and keep one
  worker. Do not run another GPU workload on the same device.
* **Timeouts:** Qwen cold start is minutes; systemd `RestartSec` + `/health`
  gate handles it. Set `QWEN_TIMEOUT_MS=300000` or higher after benchmarking.
* **Rollback:** `IMAGE_GEN_BACKEND=gemini && sudo systemctl restart picaso`
  restores Nano Banana instantly.
