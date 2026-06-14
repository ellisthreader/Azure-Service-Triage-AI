#!/usr/bin/env bash
set -euo pipefail

export PORT="${PORT:-8000}"

python -m gunicorn backend.app.main:app \
  --workers "${WEB_CONCURRENCY:-2}" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}"
