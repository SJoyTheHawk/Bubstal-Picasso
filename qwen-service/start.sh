#!/usr/bin/env bash
set -euo pipefail

python qwen-service/download_model.py
exec python qwen-service/main.py
