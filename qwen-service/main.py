import asyncio
import base64
import binascii
import io
import os
from typing import List

import torch
from diffusers import QwenImageEditPlusPipeline
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

app = FastAPI(title="Bubstal Picasso Qwen image service")
pipe = None
generation_lock = asyncio.Lock()

MODEL_ID = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
OFFLOAD_MODE = os.environ.get("QWEN_OFFLOAD_MODE", "sequential" if os.environ.get("QWEN_OFFLOAD", "1") == "1" else "none")
if OFFLOAD_MODE not in {"none", "model", "sequential"}:
    raise RuntimeError("QWEN_OFFLOAD_MODE must be none, model, or sequential")
MAX_INPUT_IMAGES = 3


class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20000)
    product_images: List[str] = Field(default_factory=list)
    reference_images: List[str] = Field(default_factory=list)
    config: dict = Field(default_factory=dict)


class GenerationResponse(BaseModel):
    image: str
    metadata: dict


def decode_b64(value: str) -> Image.Image:
    if value.startswith("data:"):
        try:
            value = value.split(",", 1)[1]
        except IndexError as exc:
            raise ValueError("invalid data URL") from exc
    try:
        decoded = base64.b64decode(value, validate=True)
        return Image.open(io.BytesIO(decoded)).convert("RGB")
    except (binascii.Error, ValueError, UnidentifiedImageError) as exc:
        raise ValueError("invalid base64 image") from exc


def encode_b64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def aspect_to_size(ratio: str) -> tuple[int, int]:
    sizes = {
        "1:1": (1024, 1024),
        "3:4": (896, 1152),
        "4:3": (1152, 896),
        "16:9": (1248, 704),
        "9:16": (704, 1248),
    }
    return sizes.get(ratio, sizes["1:1"])


def output_size(config: dict) -> tuple[int, int]:
    width, height = aspect_to_size(str(config.get("aspect_ratio", "1:1")))
    if config.get("width") is not None:
        width = int(config["width"])
    if config.get("height") is not None:
        height = int(config["height"])
    if not (512 <= width <= 2048 and 512 <= height <= 2048):
        raise ValueError("width and height must be between 512 and 2048")
    if width % 32 or height % 32:
        raise ValueError("width and height must be divisible by 32")
    return width, height


def load_model() -> None:
    global pipe
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is required for Qwen image generation")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    pipe = QwenImageEditPlusPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
    if OFFLOAD_MODE == "sequential":
        pipe.enable_sequential_cpu_offload()
        pipe.enable_vae_tiling()
    elif OFFLOAD_MODE == "model":
        pipe.enable_model_cpu_offload()
        pipe.enable_vae_tiling()
    else:
        pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    print(f"Qwen loaded: {MODEL_ID} offload={OFFLOAD_MODE}", flush=True)


@app.on_event("startup")
def startup() -> None:
    load_model()


@app.get("/health")
def health() -> dict:
    return {"ok": pipe is not None, "model": MODEL_ID, "offload": OFFLOAD_MODE}


def run_generation(req: GenerationRequest, images: list[Image.Image], width: int, height: int) -> Image.Image:
    config = req.config
    seed = config.get("seed")
    generator = torch.Generator(device="cuda").manual_seed(int(seed)) if seed is not None else None
    with torch.inference_mode():
        result = pipe(
            image=images,
            prompt=req.prompt,
            negative_prompt=config.get("negative_prompt", " "),
            width=width,
            height=height,
            num_inference_steps=int(config.get("steps", 40)),
            true_cfg_scale=float(config.get("guidance_scale", 4.0)),
            guidance_scale=1.0,
            num_images_per_prompt=1,
            generator=generator,
        )
    return result.images[0]


@app.post("/generate", response_model=GenerationResponse)
async def generate(req: GenerationRequest) -> GenerationResponse:
    if pipe is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    if not req.product_images:
        raise HTTPException(status_code=400, detail="at least one product image is required")
    all_images = req.product_images + req.reference_images
    if len(all_images) > MAX_INPUT_IMAGES:
        raise HTTPException(status_code=400, detail="Qwen supports at most 3 input images")
    try:
        images = [decode_b64(value) for value in all_images]
        width, height = output_size(req.config)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # The pipeline is stateful and a single GPU cannot safely run two calls at once.
    async with generation_lock:
        try:
            image = await asyncio.to_thread(run_generation, req, images, width, height)
        except Exception as exc:
            print(f"generate failed: {exc}", flush=True)
            raise HTTPException(status_code=500, detail="Qwen generation failed") from exc
    return GenerationResponse(
        image=encode_b64(image),
        metadata={"model": MODEL_ID, "status": "success", "w": width, "h": height},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
