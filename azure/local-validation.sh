#!/usr/bin/env bash
set -euo pipefail

python_bin="${PYTHON_BIN:-python}"
if [[ -x ".venv/bin/python" ]]; then
  python_bin=".venv/bin/python"
fi

"$python_bin" ml/generate_data.py
"$python_bin" ml/train_model.py
"$python_bin" ml/evaluate_model.py
"$python_bin" ml/generate_shap_report.py
"$python_bin" ml/prepare_responsible_ai_inputs.py
"$python_bin" azure/score_online.py
"$python_bin" ml/batch_score.py
"$python_bin" monitoring/export_powerbi.py
"$python_bin" -m pytest backend/tests

(
  cd frontend
  npm run build
)
