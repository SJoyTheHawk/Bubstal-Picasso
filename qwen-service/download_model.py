import os

from huggingface_hub import snapshot_download


model_id = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
path = snapshot_download(repo_id=model_id)
print(f"downloaded {model_id} to {path}")
