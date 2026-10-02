# AI Creative LoRA Technical Preliminary Plan

**Version:** 0.2 (technical runbook draft)  
**Working window:** T−1 preparation on RTX 5070, then the 2× H800 rental  
**Primary outcome:** a repeatable character-LoRA and production workflow that creates approved commercial assets  
**Status:** preliminary; every value marked “starting value” must be measured and recorded before it becomes the production recipe

## 0. What happened to the previous “new” plan

The file described as the new technical plan was an exact copy of the original plan. The two files had the same 820 lines and produced no `diff`. The original is a strategic production plan; it does not contain installation commands, a pinned environment, a data schema, an executable training configuration, preprocessing rules, a ComfyUI workflow contract, or operational acceptance tests.

This document keeps the strategic objectives but adds the implementation layer. It is deliberately written as a runbook: each phase has inputs, commands or procedures, outputs, and a pass/fail gate. It does not pretend that the best LoRA hyperparameters are already known. The first runs produce evidence that fills the recipe.

### 0.1 Relationship to the original plan

| Document | Use | Change policy |
|---|---|---|
| `2x_H800_AI_Creative_Production_Plan.md` | Business objectives, sequencing, production strategy | Keep as the strategy baseline |
| `AI_Creative_LoRA_Technical_Preliminary_Plan.md` | T−1 and H800 execution runbook | Update after every experiment and migration rehearsal |

### 0.2 Technical decisions that must not be silently mixed

There are several similarly named Qwen products. Record the exact model ID in every experiment:

1. **Qwen-Image-2.1 text-to-image** is the primary candidate for character LoRA training and text-to-image generation.
2. **Qwen-Image-2.1 image-conditioned/edit training** uses a different official training script and a paired condition/target dataset.
3. **Qwen-Image-Edit-2509** is a separate editing model used by the existing application. Its pipeline and adapters must not be assumed compatible with Qwen-Image-2.1.

Do not load a LoRA trained for one base model into another base model and call the result a valid comparison. A model ID, Diffusers commit, ComfyUI revision, LoRA file, workflow JSON, seed, and prompt together define a reproducible result.

## 1. Target system and acceptance criteria

The system is successful when a new operator can take a prepared character dataset, run the documented training command, load the resulting `.safetensors` file in ComfyUI, generate the fixed validation set, and identify whether the result passes the quality gate.

### 1.1 T−1 exit criteria

Before H800 rental time starts, all of these must be true:

- [ ] The RTX 5070 driver, CUDA runtime, Python, PyTorch, Diffusers, Transformers, PEFT, Accelerate, and ComfyUI versions are recorded.
- [ ] A clean virtual environment can be recreated from a lock file or a complete `pip freeze` file.
- [ ] The selected Qwen model is downloaded once, its model ID and revision are recorded, and its files are readable from the planned storage path.
- [ ] One deliberately tiny training smoke test reaches at least 10 steps or fails with a documented, reproducible memory/compatibility reason.
- [ ] One real dataset has passed image-quality, duplicate, orientation, caption, and split checks.
- [ ] At least one Qwen-specific LoRA has been exported as `.safetensors` with a sidecar metadata file.
- [ ] The LoRA can be loaded in the same inference stack used for validation and in ComfyUI, or the incompatibility is explicitly recorded.
- [ ] A fixed validation prompt/seed matrix produces a baseline image and a LoRA image.
- [ ] Product reference images have a documented preprocessing path and a human product-fidelity review checklist.
- [ ] A H800 migration bundle has been built and tested in a clean directory.
- [ ] An operator can find every run’s command, config, log, checkpoint, validation images, and decision in the experiment registry.

If any item is false, H800 time should be used first to close that specific gate rather than starting an untracked character batch.

### 1.2 H800-period output targets

The exact number of characters and assets depends on measured throughput. The minimum technical outputs are:

- one validated end-to-end character recipe;
- one working character LoRA and one deliberately rejected or overfit LoRA, so the team learns the failure signatures;
- a versioned ComfyUI character workflow and product-reference workflow;
- a repeatable generation queue with metadata;
- approved images for at least one real product;
- a migration and rollback procedure;
- GPU-hour, generation-success, human-review, and usable-asset measurements.

The strategic target remains approximately ten characters, but a character counts only when its dataset, LoRA, validation record, and deployment workflow are complete.

## 2. System architecture

### 2.1 Data and model flow

```text
raw images and product references
             |
             v
quarantine -> quality/duplicate/license checks -> processed images
             |                                      |
             v                                      v
captions + manifest JSONL --------------------> LoRA trainer
                                                   |
                                                   v
                                  checkpoints + final .safetensors
                                                   |
                         +-------------------------+-------------------------+
                         v                                                   v
                 Diffusers validation                                  ComfyUI workflow
                         |                                                   |
                         +-------------------------+-------------------------+
                                                   v
                                  fixed validation set and human QA
                                                   |
                                                   v
                               approved production queue and asset library
```

### 2.2 Worker allocation

Use the two H800s as independent workers until a benchmark proves that distributed training is faster and reliable. The default allocation is:

| Worker | Default responsibility | Can switch to |
|---|---|---|
| H800-0 | one LoRA training run | validation or batch generation |
| H800-1 | ComfyUI generation and validation | a second independent training run |

Do not let ComfyUI and a training process compete for the same GPU without an explicit memory budget. Every process receives a visible GPU assignment through `CUDA_VISIBLE_DEVICES` and writes that assignment to its run metadata.

## 3. Hardware and software contract

### 3.1 Hardware inventory

Run and save the following on every machine:

```bash
mkdir -p reports/system
date -u +%Y-%m-%dT%H:%M:%SZ | tee reports/system/captured_at.txt
nvidia-smi | tee reports/system/nvidia-smi.txt
nvidia-smi --query-gpu=index,name,memory.total,driver_version,pci.bus_id \
  --format=csv,noheader | tee reports/system/gpu_inventory.csv
nvidia-smi -L | tee reports/system/gpu_list.txt
df -h | tee reports/system/disk_inventory.txt
free -h | tee reports/system/ram_inventory.txt
uname -a | tee reports/system/kernel.txt
```

Do not write “RTX 5070” or “H800” into a config based only on the rental description. The report must contain the detected name, VRAM, driver, PCI bus ID, and free disk space. Keep at least 25% of the model/cache disk free so checkpoints and validation outputs cannot fill the filesystem mid-run.

### 3.2 Recommended host baseline

- Ubuntu 22.04 or 24.04 LTS.
- NVIDIA driver supplied by the host image or rental provider; do not install a second driver over a working provider image.
- Python 3.10 or 3.11, selected after checking the installed PyTorch wheel.
- Git and Git LFS.
- A local SSD/NVMe path for model cache and checkpoints.
- One non-root service account for ComfyUI and training.

The CUDA version reported by `nvidia-smi` is a driver capability, not necessarily the toolkit used by the PyTorch wheel. Record both. A working test is more authoritative than a version number copied from a tutorial.

### 3.3 Software stack

Install the smallest stack needed for this phase:

| Function | Software | Record |
|---|---|---|
| GPU runtime | NVIDIA driver, PyTorch CUDA wheel | `nvidia-smi`, `torch.__version__`, `torch.version.cuda` |
| Qwen pipelines/trainer | Hugging Face Diffusers from a pinned commit | `git rev-parse HEAD` |
| text/image processors | Transformers, Tokenizers, Safetensors | `pip freeze` |
| LoRA adapter | PEFT | package version |
| multi-process launch | Accelerate | `accelerate env` |
| memory-saving optimizer | bitsandbytes, if supported on the selected GPU/wheel | import test and version |
| data | Pillow, torchvision, datasets, imagehash or equivalent | package versions |
| experiment tracking | TensorBoard locally; W&B only if account/network access is approved | run URL or local log path |
| interactive generation | ComfyUI at a pinned Git revision | `git rev-parse HEAD` |
| optional product masking | rembg or a ComfyUI segmentation node | model/node revision |

Do not install `latest` packages into the rental environment without recording the resolved versions. The recommended approach is to install into a clean venv, run the smoke tests, then export the environment.

## 4. Repository and storage layout

Create a project root outside the source checkout if the rental machine has a separate data volume. The paths below are examples; set `AI_ROOT` once and write it into the machine report.

```text
ai-creative/
├── README.md
├── env/
│   ├── requirements.in
│   ├── requirements.lock.txt
│   ├── accelerate.yaml
│   └── system-report.txt
├── models/
│   ├── base/qwen-image-2.1/
│   ├── edit/qwen-image-edit-2509/
│   └── vae-or-components/
├── data/
│   ├── raw/                         # immutable originals
│   │   ├── characters/char_001/
│   │   └── products/sku_001/
│   ├── quarantine/                  # rejected or awaiting review
│   ├── processed/                   # normalized training images
│   ├── captions/                    # human-reviewed captions
│   ├── manifests/                   # JSONL and checksums
│   ├── splits/                      # train/validation/test lists
│   └── references/                  # product masks/crops/views
├── training/
│   ├── scripts/                     # pinned Diffusers scripts or wrappers
│   ├── configs/                     # one config per run
│   ├── runs/                        # checkpoints, logs, command.txt
│   └── exports/                     # final LoRA + metadata
├── workflows/
│   ├── comfyui/                     # exported API/UI workflow JSON
│   ├── prompts/                     # fixed validation and production prompts
│   └── schemas/                     # metadata schemas
├── validation/
│   ├── baselines/
│   ├── generated/
│   ├── scorecards/
│   └── reports/
├── production/
│   ├── queue/
│   ├── outputs/
│   ├── approved/
│   └── rejected/
└── reports/
    ├── system/
    ├── benchmarks/
    └── migration/
```

### 4.1 File naming

Use names that sort correctly and can be traced without opening the file:

```text
{asset_type}_{id}_{view}_{revision}_{sha8}.{ext}

char_001_img_007_r01_a1b2c3d4.jpg
sku_042_front_r02_4f55e6a7.png
run_char001_r08_s500_val03.png
```

The hash is a checksum of the content or source file, not a random label. Never overwrite a raw file. A corrected caption creates a new manifest revision.

### 4.2 Run ID and registry

Every run receives an ID such as `2026-10-02_char001_r08_lr1e-4_s500`. Store:

```json
{
  "run_id": "2026-10-02_char001_r08_lr1e-4_s500",
  "base_model_id": "Qwen/Qwen-Image-2.1",
  "base_model_revision": "<commit-or-snapshot>",
  "diffusers_commit": "<git-sha>",
  "comfyui_commit": "<git-sha-or-null>",
  "gpu": "H800-0",
  "cuda_visible_devices": "0",
  "dataset_manifest": "data/manifests/char_001_v003.jsonl",
  "config": "training/configs/char_001_r08.json",
  "seed": 0,
  "status": "running",
  "decision": null
}
```

The registry must be updated to `passed`, `rejected`, or `needs-review`; a folder containing a `.safetensors` file without a decision is not a completed experiment.

### 4.3 Required helper scripts

The commands in this plan refer to small project-owned wrappers. They must be implemented, tested on five files, and committed before Day 3. Their interfaces are part of the runbook:

| Script | Input | Output | Minimum test |
|---|---|---|---|
| `inspect_images.py` | image directory | JSONL with dimensions, mode, EXIF, blur/duplicate fields | one corrupt file fails non-zero |
| `normalize_images.py` | raw image directory | deterministic RGBA PNG copies | same input twice gives same checksums |
| `find_duplicates.py` | processed image directory | exact and perceptual-hash groups | known duplicate pair is grouped |
| `make_split.py` | inspection JSONL and groups | train/validation JSONL plus summary | no duplicate group crosses splits |
| `validate_captions.py` | caption JSONL and trigger | validation report | missing trigger or unapproved row fails |
| `prepare_product_refs.py` | SKU source package | crops, masks, checksums, metadata | source files remain unchanged |
| `run_from_config.sh` | JSON run config | command, log, run registry record | `--dry-run` prints the exact command |
| `score_validation.py` | generated images and scorecard CSV | aggregate report/contact sheet | missing image or score is reported |

A placeholder command in a plan is not a completed tool. Keep these scripts small, add `--help`, and record their Git revision in each run.

## 5. Environment setup on the RTX 5070

### 5.1 Create the environment

```bash
export AI_ROOT="$HOME/ai-creative"
mkdir -p "$AI_ROOT"/{env,models,data,training,workflows,validation,production,reports}
cd "$AI_ROOT"

python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip wheel setuptools
```

Install the PyTorch wheel recommended for the host’s driver and the selected CUDA runtime. The exact command is a compatibility decision; record the command in `env/install.log`. For example, after selecting the appropriate official wheel:

```bash
python -m pip install torch torchvision torchaudio
python - <<'PY'
import torch
print({
    "torch": torch.__version__,
    "cuda_compiled": torch.version.cuda,
    "cuda_available": torch.cuda.is_available(),
    "device_count": torch.cuda.device_count(),
    "devices": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())],
})
assert torch.cuda.is_available(), "PyTorch cannot see CUDA"
PY
```

Install the project dependencies, then export the resolved versions:

```bash
python -m pip install \
  accelerate transformers peft safetensors bitsandbytes \
  datasets Pillow torchvision imagehash opencv-python-headless \
  tensorboard huggingface_hub sentencepiece ftfy
python -m pip freeze | sort > env/requirements.lock.txt
accelerate env > env/accelerate-env.txt
```

For the trainer, clone Diffusers and pin the revision used in the smoke test:

```bash
git clone https://github.com/huggingface/diffusers.git src-diffusers
cd src-diffusers
git fetch --tags
# Choose a reviewed commit that contains train_dreambooth_lora_qwenimage21.py.
git checkout <reviewed-diffusers-commit>
python -m pip install -e .
test -f examples/dreambooth/requirements_flux.txt
python -m pip install -r examples/dreambooth/requirements_flux.txt
git rev-parse HEAD | tee "$AI_ROOT/env/diffusers.commit"
cd "$AI_ROOT"
test -f src-diffusers/examples/dreambooth/train_dreambooth_lora_qwenimage21.py
```

If the script path or arguments have changed, stop and update the runbook from the pinned source. Do not silently substitute a generic Stable Diffusion trainer for a Qwen-Image-2.1 run.

### 5.2 Accelerate configuration

Start with one process and one GPU. This makes memory failures attributable to a single run:

```bash
accelerate config
accelerate env | tee env/accelerate-env.txt
```

Use a checked-in configuration only after `accelerate config` has been tested. A minimal single-GPU file can look like this, but values must match the installed version:

```yaml
compute_environment: LOCAL_MACHINE
distributed_type: NO
mixed_precision: bf16
num_processes: 1
machine_rank: 0
num_machines: 1
```

### 5.3 CUDA smoke tests

```bash
python - <<'PY'
import torch
x = torch.randn((1024, 1024), device="cuda", dtype=torch.float16)
y = x @ x
torch.cuda.synchronize()
print("cuda smoke OK", float(y.mean()), torch.cuda.memory_allocated())
PY

python -c 'import diffusers, transformers, accelerate, peft, safetensors; print(diffusers.__version__, transformers.__version__, accelerate.__version__, peft.__version__)'
python -c 'import bitsandbytes as bnb; print("bitsandbytes", bnb.__version__)'
```

If bitsandbytes fails on the RTX 5070, record that result and run the smoke test without `--use_8bit_adam`. Do not conceal a failed optional dependency by changing the lock file after training starts.

## 6. Model acquisition and model identity

### 6.1 Download once, use locally

Log in only if the selected model’s license and access requirements allow it:

```bash
source "$AI_ROOT/.venv/bin/activate"
hf auth login
export MODEL_ID="Qwen/Qwen-Image-2.1"
export MODEL_DIR="$AI_ROOT/models/base/qwen-image-2.1"
mkdir -p "$MODEL_DIR"
hf download "$MODEL_ID" --local-dir "$MODEL_DIR"
hf cache scan | tee reports/system/huggingface-cache.txt
```

The command may need a reviewed revision:

```bash
export MODEL_REVISION="<reviewed-model-revision>"
hf download "$MODEL_ID" --revision "$MODEL_REVISION" --local-dir "$MODEL_DIR"
```

Record the model card URL, license, revision, total size, and a checksum manifest. Never rely on a mutable `main` snapshot during a multi-week comparison.

### 6.2 Separate edit model storage

If the existing application needs Qwen-Image-Edit-2509, download it into a different directory and keep its model ID in a different configuration key:

```bash
mkdir -p "$AI_ROOT/models/edit/qwen-image-edit-2509"
hf download Qwen/Qwen-Image-Edit-2509 \
  --local-dir "$AI_ROOT/models/edit/qwen-image-edit-2509"
```

Do not use an edit-model LoRA as a text-to-image character LoRA unless the model documentation explicitly states that the adapter is compatible and the compatibility is validated.

## 7. Dataset preparation: characters

### 7.1 Preserve raw data

Copy originals into `data/raw/characters/<character_id>/` and make the directory read-only after ingestion:

```bash
cp -a /path/to/source/images/. data/raw/characters/char_001/
find data/raw/characters/char_001 -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum > data/manifests/char_001_raw.sha256
```

Record source, ownership/licensing status, date, photographer or generator, and whether the image is permitted for training. A file that cannot be legally used is moved to `quarantine`, not quietly included.

### 7.2 Image quality checks

Run a script or notebook that reports, per image:

- decodes successfully;
- image mode is RGB or RGBA and can be normalized to RGBA;
- EXIF orientation has been applied;
- width, height, aspect ratio, and pixel count;
- blur or severe compression flags;
- alpha/transparency behavior;
- visible crop of the face/body;
- duplicate and near-duplicate group;
- source and license metadata.

A useful initial dataset is 20–40 varied images for one character. The count is less important than coverage. Reject a set that contains ten near-identical renders and no side, full-body, expression, or lighting variation.

Example inspection command:

```bash
python training/scripts/inspect_images.py \
  --input data/raw/characters/char_001 \
  --output data/manifests/char_001_inspection.jsonl
```

If the script does not exist yet, create it before training. It must fail non-zero when an image cannot be decoded or the minimum dimension is below the agreed threshold. Thresholds must be recorded in the manifest, for example `min_width=512`, `min_height=512`, and `max_aspect_ratio=2.5`.

### 7.3 Normalize orientation and color

Create processed copies; never modify raw originals. The processing operation must be deterministic and recorded:

```bash
python training/scripts/normalize_images.py \
  --input data/raw/characters/char_001 \
  --output data/processed/characters/char_001 \
  --format png \
  --apply-exif-orientation \
  --convert-rgba \
  --max-side 2048
```

The Qwen-Image-2.1 VAE expects four channels. For an input without transparency, `--convert-rgba` means RGB plus an opaque alpha channel; it does not mean making the background transparent. Do not force a square crop before deciding how the Qwen trainer’s aspect-ratio buckets will be used. If an image must be cropped, save the crop policy and visually review the output. A crop that removes the character’s distinctive feature is a dataset error.

### 7.4 Remove duplicates before splitting

Exact duplicates must be removed. Near duplicates should be grouped so that the same source pose does not appear in both training and validation:

```bash
python training/scripts/find_duplicates.py \
  --input data/processed/characters/char_001 \
  --hash phash \
  --distance 6 \
  --output data/manifests/char_001_duplicate_groups.json
```

Review each group manually. Keep the clearest representative in the training set and move the rest to quarantine or a documented alternate set.

### 7.5 Train/validation split

Use a split that tests generalization, not memorization. A starting split is 80% train and 20% validation, stratified by pose, crop, expression, lighting, and background. Keep all near-duplicate variants in the same split.

```bash
python training/scripts/make_split.py \
  --manifest data/manifests/char_001_inspection.jsonl \
  --groups data/manifests/char_001_duplicate_groups.json \
  --train-ratio 0.8 \
  --seed 17 \
  --output data/splits/char_001_v001
```

The split output must contain `train.jsonl`, `validation.jsonl`, `test_prompts.jsonl`, and a summary showing counts by pose and scene. A validation set containing only front portraits is not sufficient for character robustness.

## 8. Captioning and metadata

### 8.1 Trigger-token policy

Give each character a unique, unlikely token, such as `bub_char_001`. Do not use a common name or an existing word. The same token must appear in every training caption for that character and in the validation prompts.

Use identity words consistently, but describe scene information per image. The goal is for the token to carry identity while the caption exposes pose, clothing, camera, lighting, and background variation.

### 8.2 Caption template

Use a structured template, then write a natural-language caption consumed by the selected script:

```text
<trigger>, <identity class>, <view and crop>, <pose and action>,
<expression>, <clothing>, <lighting>, <background>, <camera/composition>
```

Example:

```text
bub_char_001, stylized humanoid mascot character, three-quarter full-body view,
standing with one hand raised, cheerful expression, red jacket and white shoes,
soft studio lighting, pale blue background, centered composition
```

Do not put the same background or outfit in every caption unless that is part of the identity. Do not use a caption to claim a logo or small text is correct when the pixels are not correct.

### 8.3 Caption JSONL schema

Store one record per image:

```json
{
  "image": "data/processed/characters/char_001/char_001_img_007.png",
  "caption": "bub_char_001, stylized humanoid mascot character, ...",
  "character_id": "char_001",
  "trigger": "bub_char_001",
  "identity_terms": ["stylized humanoid mascot character"],
  "scene_terms": ["three-quarter full-body view", "pale blue background"],
  "pose": "standing with one hand raised",
  "expression": "cheerful",
  "source": "human_reviewed",
  "reviewer": "<name>",
  "caption_version": "v003",
  "approved": true
}
```

The training manifest must reference the caption version. A caption generated by a VLM is a draft until a person checks it against the image.

The first text-to-image baseline uses the official script's single `--instance_prompt`, so the reviewed caption manifest is still required for auditability but is not automatically consumed by that baseline command. If per-image captions are needed, use the pinned script's `--dataset_name` and `--caption_column` options with an image-folder dataset and a metadata file, then verify the exact column names with `--help`. Do not assume that a generic `.txt` sidecar convention is understood by the Qwen script.

Example metadata shape for an image-folder dataset (adapt the field name to the pinned script):

```jsonl
{"file_name":"char_001_img_007.png","text":"bub_char_001, stylized humanoid mascot character, three-quarter full-body view, standing with one hand raised"}
```

### 8.4 Captioning procedure

1. Write captions manually for five representative images.
2. Use those captions to establish the vocabulary and level of detail.
3. Optionally use a VLM to draft the remaining captions.
4. Review every draft for identity, pose, clothing, background, and false claims.
5. Run a token check that every approved caption contains exactly the intended trigger token.
6. Freeze the caption manifest revision before training.

```bash
python training/scripts/validate_captions.py \
  --manifest data/captions/char_001_v003.jsonl \
  --trigger bub_char_001 \
  --require-approved \
  --output reports/char_001_caption_check.json
```

## 9. Product reference preparation

The product workflow is a separate data path from character training. Never train a character LoRA on product images unless product identity is intentionally part of that adapter.

### 9.1 Product intake package

For each SKU, collect:

- front, back, side, top, and detail views where available;
- a clean product-only image on a neutral background;
- dimensions and important geometry;
- approved logo and packaging references;
- color/material notes;
- prohibited alterations;
- usage rights and source metadata.

Use a SKU package such as:

```text
data/raw/products/sku_042/
├── sku_042_front.jpg
├── sku_042_back.jpg
├── sku_042_side.jpg
├── sku_042_detail_logo.jpg
├── sku_042.json
└── checksums.sha256
```

### 9.2 Product preprocessing

Create derived files without changing the source:

```bash
python training/scripts/prepare_product_refs.py \
  --input data/raw/products/sku_042 \
  --output data/references/products/sku_042 \
  --apply-exif-orientation \
  --make-neutral-crops \
  --make-alpha-mask-if-safe
```

Review every mask. A bad mask changes the product’s silhouette and produces a misleading generation result. Keep both the original and the masked/cropped reference so the operator can choose the appropriate condition image.

### 9.3 Product fidelity rules

For a product claim to pass, the output must preserve the product’s silhouette, major parts, colors, packaging layout, and required text/logo placement. Generated text is not assumed correct. If exact packaging text is needed, use a compositing or edit step with a supplied source asset and human review.

## 10. Qwen LoRA training procedure

### 10.1 Official script and scope

Use the Qwen-Image-2.1-specific Diffusers script:

```text
src-diffusers/examples/dreambooth/train_dreambooth_lora_qwenimage21.py
```

For image-conditioned/edit training, use the separate script only after the paired condition/target dataset is ready. The generic Stable Diffusion DreamBooth command in a tutorial is not a substitute.

The script is actively maintained. Pin the commit, inspect `--help`, and save the exact help output with the run:

```bash
python src-diffusers/examples/dreambooth/train_dreambooth_lora_qwenimage21.py \
  --help | tee training/scripts/qwenimage21-trainer-help.txt
```

The Qwen-Image-2.1 trainer has model-specific behavior that affects preprocessing and memory:

- training and bucket resolutions must be multiples of 32;
- the VAE expects RGBA, so normalized training images must retain or receive an opaque alpha channel;
- the text encoder is Qwen3-VL and does not use the usual `--max_sequence_length` truncation flag;
- `--use_aspect_ratio_buckets` can preserve portrait/landscape data, with each batch drawn from one bucket;
- `--cache_latents`, `--offload`, and `--use_8bit_adam` are memory options and must be benchmarked on the selected revision;
- `flex_attention` can affect speed, so record whether it is available rather than treating its absence as a quality change.

These details are why the preprocessing script must be tested against the Qwen trainer rather than copied from a Stable Diffusion tutorial.

### 10.2 Starting configuration

This is a test matrix, not a final prescription:

| Parameter | Starting values | Why it is measured |
|---|---|---|
| resolution | 768 and 1024 | quality versus memory/time |
| train batch | 1 | predictable memory on 5070 and H800 |
| gradient accumulation | 1 and 4 | effective batch without extra VRAM |
| rank | 4, 8, 16 | adapter capacity versus identity drift |
| alpha | equal to rank initially | neutral adapter scaling |
| learning rate | `5e-5`, `1e-4` | underfit/overfit boundary |
| max steps | 300, 500, 800 | identity learning curve |
| optimizer | AdamW; 8-bit Adam if verified | reproducibility and memory |
| precision | `bf16` on supported hardware | H800 efficiency; verify on 5070 |
| seed | fixed per comparison, e.g. 0 | compare parameter changes |
| validation interval | every 100–200 steps | detect overfitting before the end |

Qwen documentation commonly demonstrates a rank/alpha pair of 4/4, 1024 resolution, batch 1, gradient accumulation 4, `1e-4`, and 500 steps. Treat those as a reproducible first baseline, then compare adjacent values. A stronger score at a higher rank is not automatically better if the character loses pose or scene robustness.

### 10.3 Training config file

Keep run parameters in a machine-readable file even though the official script receives command-line arguments:

```json
{
  "run_id": "2026-10-02_char001_r04_lr1e-4_s500",
  "base_model": "models/base/qwen-image-2.1",
  "instance_data_dir": "data/processed/characters/char_001",
  "output_dir": "training/runs/2026-10-02_char001_r04_lr1e-4_s500",
  "instance_prompt": "bub_char_001, stylized humanoid mascot character",
  "resolution": 1024,
  "train_batch_size": 1,
  "gradient_accumulation_steps": 4,
  "rank": 4,
  "lora_alpha": 4,
  "learning_rate": 0.0001,
  "max_train_steps": 500,
  "checkpointing_steps": 100,
  "mixed_precision": "bf16",
  "cache_latents": true,
  "use_aspect_ratio_buckets": false,
  "seed": 0,
  "validation_prompt": "bub_char_001, full-body character portrait in a green studio",
  "validation_epochs": 25
}
```

The wrapper that turns this JSON into arguments must print the final command before execution. Save the command and the environment snapshot beside the run. If `use_aspect_ratio_buckets` is enabled, add the exact `--aspect_ratio_buckets` syntax supported by the pinned script and record the bucket list in the config. Every resolution supplied to the trainer must be divisible by 32.

### 10.4 RTX 5070 smoke test

The 5070 is a methodology machine. It may not hold the complete Qwen-Image-2.1 training graph at production resolution. Prove the command path with the smallest safe test:

```bash
export CUDA_VISIBLE_DEVICES=0
export RUN_DIR="$AI_ROOT/training/runs/smoke-qwenimage21"
mkdir -p "$RUN_DIR"

accelerate launch \
  --config_file "$AI_ROOT/env/accelerate.yaml" \
  src-diffusers/examples/dreambooth/train_dreambooth_lora_qwenimage21.py \
  --pretrained_model_name_or_path "$AI_ROOT/models/base/qwen-image-2.1" \
  --instance_data_dir "$AI_ROOT/data/processed/characters/char_001" \
  --output_dir "$RUN_DIR" \
  --mixed_precision bf16 \
  --instance_prompt "bub_char_001, stylized humanoid mascot character" \
  --resolution 512 \
  --train_batch_size 1 \
  --gradient_accumulation_steps 1 \
  --rank 4 \
  --lora_alpha 4 \
  --learning_rate 1e-4 \
  --lr_scheduler constant \
  --lr_warmup_steps 0 \
  --max_train_steps 10 \
  --checkpointing_steps 10 \
  --seed 0 \
  2>&1 | tee "$RUN_DIR/train.log"
```

If the model or script rejects 512 resolution, use the minimum documented resolution and record the error. If the process OOMs, save the log and mark the 5070 as “command validation only”; do not spend the whole T−1 period trying to make a data-center-sized model fit by undocumented memory hacks.

### 10.5 H800 baseline run

After the H800 preflight, run the same config at the selected resolution. Keep `CUDA_VISIBLE_DEVICES=0` for the first run even when two GPUs are available. This establishes a single-GPU baseline for duration, peak VRAM, throughput, and output quality.

```bash
export CUDA_VISIBLE_DEVICES=0
export RUN_ID="2026-10-02_char001_baseline"
export RUN_DIR="$AI_ROOT/training/runs/$RUN_ID"
mkdir -p "$RUN_DIR"

{ date -u; nvidia-smi; cat training/configs/char_001_baseline.json; } \
  | tee "$RUN_DIR/run-context.txt"

accelerate launch \
  --config_file "$AI_ROOT/env/accelerate.yaml" \
  src-diffusers/examples/dreambooth/train_dreambooth_lora_qwenimage21.py \
  --pretrained_model_name_or_path "$AI_ROOT/models/base/qwen-image-2.1" \
  --instance_data_dir "$AI_ROOT/data/processed/characters/char_001" \
  --output_dir "$RUN_DIR" \
  --mixed_precision bf16 \
  --instance_prompt "bub_char_001, stylized humanoid mascot character" \
  --resolution 1024 \
  --train_batch_size 1 \
  --gradient_accumulation_steps 4 \
  --use_8bit_adam \
  --rank 4 \
  --lora_alpha 4 \
  --learning_rate 1e-4 \
  --lr_scheduler constant \
  --lr_warmup_steps 0 \
  --max_train_steps 500 \
  --checkpointing_steps 100 \
  --validation_prompt "bub_char_001, full-body character portrait in a green studio" \
  --validation_epochs 25 \
  --seed 0 \
  2>&1 | tee "$RUN_DIR/train.log"
```

Check the pinned script’s `--help` before copying this command. If an argument has been renamed, update the wrapper and record the change in the experiment registry.

### 10.6 Parallel H800 jobs

Only after the single-GPU baseline is stable:

```bash
# Terminal A
CUDA_VISIBLE_DEVICES=0 ./training/scripts/run_from_config.sh training/configs/char_001_r08.json

# Terminal B, independent run or generation worker
CUDA_VISIBLE_DEVICES=1 ./training/scripts/run_from_config.sh training/configs/char_001_r16.json
```

Do not launch two processes on one logical GPU. If using distributed training across both H800s, create a separate benchmark run; distributed training changes effective batch size and communication behavior, so its quality and timing cannot be compared directly with the single-GPU run without recording the distinction.

### 10.7 Checkpoints and resume

Keep the last three checkpoints and the final export. A checkpoint is useful only if its config and base-model revision are beside it:

```bash
find "$RUN_DIR" -maxdepth 2 -type f -print | sort
sha256sum "$RUN_DIR"/*.safetensors > "$RUN_DIR/checksums.sha256"
```

If a run is interrupted, resume only from a checkpoint produced by the same script commit and environment. Mark a resumed run as a new registry entry with `parent_run_id`.

### 10.8 Export metadata

Every final LoRA export must include:

```json
{
  "lora_file": "char_001_r08_step500.safetensors",
  "base_model_id": "Qwen/Qwen-Image-2.1",
  "base_model_revision": "<snapshot>",
  "diffusers_commit": "<sha>",
  "trigger": "bub_char_001",
  "rank": 8,
  "alpha": 8,
  "resolution": 1024,
  "steps": 500,
  "learning_rate": 0.0001,
  "dataset_manifest": "char_001_v003.jsonl",
  "seed": 0,
  "validation_report": "validation/reports/char_001_r08.json",
  "decision": "passed"
}
```

## 11. ComfyUI deployment

### 11.1 Install and pin ComfyUI

Use a separate venv if ComfyUI dependencies conflict with the trainer:

```bash
cd "$AI_ROOT"
git clone https://github.com/comfyanonymous/ComfyUI.git ComfyUI
cd ComfyUI
git checkout <reviewed-comfyui-commit>
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
git rev-parse HEAD | tee "$AI_ROOT/env/comfyui.commit"
```

Install only the custom nodes required by the selected Qwen workflow. Every node repository and commit must be listed in `env/custom-nodes.lock.md`. Prefer native Qwen support and official example workflows where available.

### 11.2 Model and LoRA paths

Use ComfyUI’s model path configuration so the base model and adapters are visible without copying large files into several directories. The exact loader names vary by ComfyUI revision; verify them in the installed UI and export the workflow after the graph is working.

Example path intent:

```yaml
base_path: /home/<user>/ai-creative
checkpoints: models/base
diffusion_models: models/base
loras: training/exports
vae: models/vae-or-components
```

Do not assume that a Diffusers directory is a ComfyUI checkpoint directory. Follow the model’s ComfyUI packaging instructions and record the final file mapping.

### 11.3 Launch one GPU at a time

```bash
cd "$AI_ROOT/ComfyUI"
source .venv/bin/activate
CUDA_VISIBLE_DEVICES=1 python main.py --listen 127.0.0.1 --port 8188 \
  2>&1 | tee "$AI_ROOT/reports/comfyui-gpu1.log"
```

For a remote operator, bind to a private network interface or use an SSH tunnel. Do not expose an unauthenticated ComfyUI port to the public internet.

### 11.4 Workflow contract

The first exported workflow must show, or clearly encode, these stages:

1. Load the Qwen-Image-2.1 base components.
2. Load the character LoRA and record its strength.
3. Encode the prompt containing the trigger token.
4. Apply the selected sampler/scheduler and seed.
5. Optionally load a product reference through the documented reference/edit path.
6. Decode and save the image.
7. Save prompt, seed, model names, LoRA names/weights, workflow revision, and timestamp with the output.

Export both the UI workflow JSON and the API-format workflow JSON. Commit the JSON after removing machine-specific absolute paths where possible. A screenshot is not a workflow backup.

### 11.5 LoRA loading smoke test

Generate the same prompt with:

- base model only;
- character LoRA strength 0.5;
- character LoRA strength 0.8 or the selected default;
- character LoRA strength 1.0.

Use the same seed and record whether the identity changes in the expected direction. If the LoRA has no effect, check the base-model family, loader type, file path, trigger token, and workflow revision before changing the training configuration.

## 12. Fixed validation protocol

### 12.1 Prompt matrix

Create a versioned `workflows/prompts/char_validation_v001.jsonl` containing at least these cases:

```json
{"case":"portrait_front","prompt":"bub_char_001, front-facing portrait, neutral background","seed":101}
{"case":"portrait_three_quarter","prompt":"bub_char_001, three-quarter portrait, warm studio light","seed":102}
{"case":"full_body","prompt":"bub_char_001, full-body standing pose, simple studio","seed":103}
{"case":"sitting","prompt":"bub_char_001, sitting on a simple chair, side light","seed":104}
{"case":"walking","prompt":"bub_char_001, walking pose, outdoor background","seed":105}
{"case":"expression","prompt":"bub_char_001, surprised but friendly expression, close-up","seed":106}
{"case":"lighting","prompt":"bub_char_001, dramatic rim light, dark blue background","seed":107}
{"case":"product","prompt":"bub_char_001 holding SKU-042, product clearly visible","seed":108}
{"case":"composition","prompt":"bub_char_001 in an unusual wide composition with negative space","seed":109}
{"case":"style_transfer","prompt":"bub_char_001 in the approved premium commercial style","seed":110}
```

Keep prompts stable while comparing LoRA runs. Add new prompts only as a new validation-set revision.

### 12.2 Scorecard

Score every validation case from 1 to 5:

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| identity | not recognizably the character | partially recognizable | unmistakably the character |
| pose/expression | broken or wrong | usable with corrections | correct and natural |
| scene robustness | scene dominates identity | mixed | identity survives scene change |
| product fidelity | wrong product or geometry | recognizable with defects | required geometry/features preserved |
| prompt adherence | misses core request | partly follows | follows the request |
| artifacts | unusable defects | manual cleanup needed | commercially clean |
| commercial usability | reject | possible after editing | approved candidate |

Save one row per image in `validation/scorecards/<run_id>.csv`. Add free-text failure notes. A mean score alone is insufficient: a single catastrophic product error can reject an otherwise attractive image.

### 12.3 Optional automated checks

Automated measures support human review; they do not replace it:

- perceptual hash for accidental duplicates;
- CLIP/DINO embedding similarity to the character reference set;
- OCR for required packaging text;
- alpha/mask overlap for product placement;
- image dimensions and file integrity;
- generation time and peak VRAM.

Record the model and threshold for every automated check. Do not use an embedding score as proof of identity or product correctness without human calibration.

### 12.4 Baseline comparison

For every LoRA run, generate the fixed set with the same seed using:

1. base model only;
2. candidate LoRA;
3. previous best LoRA, if one exists.

Create a contact sheet and scorecard. The reviewer must be able to see whether the LoRA improved identity without causing unacceptable pose, scene, or product failures.

## 13. Production queue and asset metadata

### 13.1 Queue record

Use JSONL so jobs are append-only and easy to retry:

```json
{
  "job_id": "sku042_char001_concept03_v001",
  "gpu": "auto",
  "base_model": "Qwen/Qwen-Image-2.1",
  "lora": "training/exports/char_001_r08_step500.safetensors",
  "lora_strength": 0.8,
  "character_id": "char_001",
  "sku": "sku_042",
  "workflow": "workflows/comfyui/product_character_v001_api.json",
  "prompt_id": "product_hero_03",
  "seed": 240042,
  "count": 4,
  "status": "queued"
}
```

The queue runner records start time, end time, GPU, ComfyUI workflow revision, output paths, errors, and retry count. A failed job is marked `failed`; it is not silently replaced by a different seed.

### 13.2 Minimal ComfyUI API loop

Use the API-format workflow exported by ComfyUI. Do not hand-write node IDs unless the workflow is committed and tested:

```bash
export COMFY_URL="http://127.0.0.1:8188"
export CLIENT_ID="ai-creative-worker-1"

curl -sS "$COMFY_URL/prompt" \
  -H 'Content-Type: application/json' \
  --data-binary @workflows/comfyui/product_character_v001_request.json \
  | tee production/queue/last-submit.json
```

The request file must contain the API workflow under `prompt` and a `client_id`; the response returns a `prompt_id`. Poll `/history/<prompt_id>` until the job is `completed` or `error`, then copy the output files into the job directory and attach the request/response metadata. The exact node IDs and prompt field are workflow-specific, so generate the request from a working exported API workflow and test one job before writing a batch runner.

### 13.3 Asset states

```text
generated -> automated_checks -> human_review -> approved | rejected | needs_edit
```

Keep rejected outputs and their reason codes. They reveal failure patterns and prevent the team from selecting only attractive examples while losing operational knowledge.

### 13.4 Production concepts

Start with three controlled concepts per SKU:

1. product hero / clean presentation;
2. character interacting with the product;
3. lifestyle or seasonal context.

Generate a small batch, review it, and expand only when the workflow passes product fidelity. Do not spend H800 time generating thousands of unreviewed variants.

## 14. Image-to-video branch

Video is a downstream experiment. First select still images that pass identity and product review. Then record:

- source image and its checksum;
- video model and revision;
- duration, frame rate, resolution;
- motion prompt;
- seed and generation settings;
- temporal identity/product failures;
- whether the clip is commercially usable.

The first video test is a short image-to-video clip for one character and one product. Do not build a new video training system during T−1 unless still-image production is already stable.

## 15. GPU operations and measurements

### 15.1 Live monitoring

```bash
nvidia-smi dmon -s pucm -d 5 | tee reports/benchmarks/gpu-dmon-$(date +%Y%m%d-%H%M%S).log
```

In a second terminal:

```bash
watch -n 2 'nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total,power.draw,temperature.gpu --format=csv'
```

Capture peak memory and utilization for training and generation separately. A run that finishes quickly while using little GPU may be I/O-bound; a run with high utilization and low success rate may be over-aggressive or unstable.

### 15.2 Required metrics

For each training run:

- wall-clock duration;
- steps/second;
- peak VRAM;
- checkpoint size;
- loss curve and validation images;
- OOM/NaN/restart count;
- GPU and software revisions.

For each production batch:

- jobs submitted and completed;
- images generated;
- generation success rate;
- images passing automated checks;
- images approved by a human;
- human review minutes;
- GPU-hours;
- usable assets per GPU-hour;
- cost per usable asset when rental price is known.

The useful business metric is approved, usable assets, not raw image count.

## 16. H800 preflight and migration

### 16.1 Migration bundle from the 5070

Package code and metadata, not untracked cache state:

```bash
cd "$AI_ROOT"
git status --short || true
tar -czf \
  "/tmp/ai-creative-migration-$(date +%Y%m%d-%H%M%S).tar.gz" \
  env training/configs training/scripts workflows/prompts workflows/schemas \
  data/manifests data/captions validation/reports reports/system README.md
```

Copy separately, with checksums:

- model snapshots or a documented download command;
- approved LoRA exports;
- processed datasets and product references;
- ComfyUI workflow JSON files;
- `requirements.lock.txt` and model/repository revisions.

Exclude API keys, `.env` files, browser cookies, and unreviewed credentials.

### 16.2 H800 acceptance test

On the H800 machine:

```bash
nvidia-smi | tee reports/migration/h800-nvidia-smi.txt
python - <<'PY' | tee reports/migration/h800-torch.txt
import torch
print(torch.__version__, torch.version.cuda, torch.cuda.device_count())
for i in range(torch.cuda.device_count()):
    p = torch.cuda.get_device_properties(i)
    print(i, p.name, p.total_memory // (1024**3), "GiB")
PY
```

Then run, in order:

1. CUDA matrix multiply smoke test;
2. local model load without generation;
3. one fixed baseline generation;
4. one fixed LoRA generation;
5. ten-step training smoke test;
6. a full baseline run only after steps 1–5 pass.

Compare generated images by prompt, seed, and model revision. Small numerical differences across GPUs are expected; unexplained composition or identity differences require investigation.

### 16.3 H800-to-production checklist

- [ ] Both GPUs are visible and have the expected VRAM.
- [ ] The driver can execute the selected PyTorch CUDA wheel.
- [ ] Model files are local and checksums match the migration manifest.
- [ ] The trainer and ComfyUI use the pinned revisions.
- [ ] GPU assignment is explicit for every process.
- [ ] A single-GPU baseline duration is recorded.
- [ ] The second GPU can generate while the first trains.
- [ ] Outputs are written to the planned volume, not an ephemeral directory.
- [ ] Monitoring logs are being saved.
- [ ] A rollback path to base-model-only generation works.

## 17. T−1 day-by-day execution plan

### Day 1 — hardware, OS, and environment

**Work:** inventory GPU/driver/disk; create venv; install PyTorch; run CUDA smoke test; install and pin Diffusers and ComfyUI.  
**Evidence:** `reports/system/*`, lock file, repository commits, successful imports.  
**Gate:** CUDA is visible and the selected trainer script exists.

### Day 2 — model and workflow baseline

**Work:** download the exact model snapshot; run one base-model inference; install only required ComfyUI nodes; export a base workflow.  
**Evidence:** model revision/checksum manifest, one baseline image, workflow JSON.  
**Gate:** base generation completes twice with fixed seed and output metadata.

### Day 3 — character dataset

**Work:** ingest one character; preserve raw data; inspect dimensions and EXIF; normalize copies; identify duplicates; create train/validation split.  
**Evidence:** raw checksums, inspection JSONL, duplicate groups, split summary, contact sheet.  
**Gate:** reviewer approves the dataset and confirms identity/scene variation.

### Day 4 — captions and product references

**Work:** choose trigger token; write five captions manually; draft/review remaining captions; validate tokens; ingest one SKU and prepare reference variants.  
**Evidence:** caption manifest, reviewer record, SKU reference package, masks/crops.  
**Gate:** all training captions are approved and product references pass visual review.

### Day 5 — trainer smoke test

**Work:** inspect `--help`; run ten-step smoke test on the 5070; if possible, run a short 512/768-resolution test; save log and failure reason.  
**Evidence:** command, environment, log, checkpoint or documented OOM.  
**Gate:** command path is reproducible, even if full training is deferred to H800.

### Day 6 — controlled LoRA experiments

**Work:** run the smallest useful matrix on the 5070, or run only workflow/validation tests if the model does not fit; generate fixed validation images; compare base and LoRA.  
**Evidence:** run registry, configs, logs, checkpoints, contact sheets, scorecards.  
**Gate:** the team knows what a healthy, underfit, and overfit result looks like.

### Day 7 — ComfyUI and migration rehearsal

**Work:** load the exported LoRA in ComfyUI; export API workflow; run a product-reference test; build migration bundle; validate the bundle in a clean directory or VM.  
**Evidence:** workflow JSON, output metadata, migration tarball/checksum, clean-install notes.  
**Gate:** a second operator can reproduce one validation image from the runbook.

## 18. H800 first-week execution

### H800 Day 1 — acceptance and baseline

Run the preflight in Section 16. Do not start ten character jobs before the single-character baseline is measured.

### H800 Day 2 — character 001 production recipe

Run the selected baseline and one adjacent rank/step experiment. Validate both. Choose the recipe based on the scorecard and failure notes, not training loss alone.

### H800 Day 3 — parallelize carefully

Assign one H800 to the next character training job and one to the validated ComfyUI workflow. Measure queue latency, peak VRAM, and approval rate.

### H800 Day 4 — product workflow

Generate the three initial SKU concepts. Review silhouette, packaging, logo/text, and character identity. Fix the workflow before scaling the queue.

### H800 Day 5 — characters 002–003 and production batch

Reuse the proven data/caption/training recipe. Change one variable at a time when diagnosing a new character. Keep production jobs running on the other worker.

### H800 Day 6 — evaluation and failure analysis

Aggregate scorecards. Classify failures as dataset, caption, training, prompt, product-reference, sampler, or post-processing failures. Fix the highest-frequency cause.

### H800 Day 7 — package and decide

Freeze a recipe revision, export approved LoRAs, archive logs and checksums, and decide which characters/styles are ready for scale. Unsuccessful experiments remain in the archive with reasons.

### T+1–T+3 technical handoff

After the first H800 week, follow the original production plan with these technical gates:

| Project week | Technical work | Required evidence |
|---|---|---|
| T+1 | Train characters 002–003 with the selected recipe; run character/product interaction tests; create the first product queue; measure approval rate by SKU | two complete character packages, queue log, scorecards, GPU-hour report |
| T+2 | Train characters 004–007; test two or three style LoRAs only if the production queue demonstrates the need; add reference/edit workflows; begin image-to-video tests from approved stills | style decision record, product-reference workflow revision, video pilot provenance |
| T+3 | Complete or refine characters 008–010; freeze the strongest workflows; run the largest reviewed production batch; package all reusable assets and failure notes | final asset manifest, approved/rejected counts, migration archive, handoff report |

At each week boundary, stop and review the ratio of generated images to approved usable assets. If approval rate is falling, fix data, prompts, reference images, or QA before increasing batch size.

## 19. Failure handling

### Out-of-memory

1. Save the full log and `nvidia-smi` output.
2. Check whether another process is using the GPU.
3. Reduce resolution, batch size, or gradient accumulation only one change at a time.
4. Use gradient checkpointing or CPU offload only when supported by the pinned script.
5. If the 5070 cannot train the full model, mark it as a methodology/inference machine and move full training to H800.

### Overfitting or identity collapse

Check validation images at earlier checkpoints. Then test fewer steps, lower learning rate, more varied data, less repetitive captions, or a lower LoRA strength at inference. Do not solve every failure by increasing rank.

### LoRA has no visible effect

Check model family, base-model revision, adapter loader, file path, trigger token, LoRA strength, and workflow JSON before retraining. Run a known-good adapter loading test.

### Product is attractive but incorrect

Reject the asset. Add better product views/masks, use an edit/compositing path, or change the prompt. Do not count visual attractiveness as product fidelity.

### NaN loss or unstable run

Stop the run, preserve the log, and record precision, optimizer, learning rate, seed, and GPU. Retry from the same dataset with one controlled change. Never delete the unstable run.

### Qwen-Image-2.1 path is blocked

Use the base-model-only ComfyUI workflow and the existing Qwen-Image-Edit-2509 application for immediate product mockups while the training path is repaired. Label those outputs as a different pipeline. Do not present an edit-model result as evidence that a Qwen-Image-2.1 character LoRA works.

## 20. Change control and review cadence

At the end of each day, commit or archive:

- changed scripts and configs;
- environment/repository revisions;
- new manifests and caption versions;
- run registry updates;
- validation contact sheets and scorecards;
- one paragraph stating the next decision and its evidence.

Every recipe change gets a revision such as `recipe-v0.1`, `recipe-v0.2`. The revision must state what changed and why. If a change improves one character but harms another, keep both scorecards and do not generalize the result without another test.

## 21. Final deliverable checklist

### Technical assets

- [ ] `requirements.lock.txt`, Diffusers commit, ComfyUI commit, and system report.
- [ ] Qwen model IDs/revisions and checksum manifests.
- [ ] Reproducible trainer wrapper and configuration examples.
- [ ] Character datasets, captions, splits, and checksums.
- [ ] Approved and rejected LoRA exports with metadata.
- [ ] Fixed validation prompt set, scorecards, and contact sheets.
- [ ] ComfyUI UI/API workflows with model and LoRA paths documented.
- [ ] Product reference preprocessing outputs and SKU metadata.
- [ ] Production queue schema and asset metadata.
- [ ] H800 migration bundle and rollback notes.

### Business assets

- [ ] Approved character/product marketing images.
- [ ] Any approved image-to-video clips with provenance.
- [ ] GPU-hour and human-review measurements.
- [ ] Usable-assets-per-GPU-hour and cost-per-usable-asset estimates.
- [ ] Known failure modes and recommendations for the next production batch.

## 22. Official technical references

Use these as the primary references, then pin the exact revisions used in the environment:

- [Diffusers Qwen-Image-2.1 DreamBooth/LoRA guide](https://github.com/huggingface/diffusers/blob/main/examples/dreambooth/README_qwenimage21.md)
- [Qwen-Image-2.1 official repository](https://github.com/QwenLM/Qwen-Image-2.1)
- [Diffusers LoRA guide](https://github.com/huggingface/diffusers/blob/main/docs/source/en/training/lora.md)
- [ComfyUI documentation](https://github.com/comfyanonymous/ComfyUI)
- [Existing Qwen service implementation guide in this repository](../QWEN_AWS_IMPLEMENTATION_GUIDE.md)

The online documentation can change. The reproducible source of truth for a run is the locally pinned commit, lock file, model revision, command, and saved output metadata.
