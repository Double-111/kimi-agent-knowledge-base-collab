#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}"
DEFAULT_WIKIMG_ROOT="$(cd "${APP_DIR}/../.." && pwd)/Ontology_Factory"

export KNOWLEDGE_BASE_PROVIDER="${KNOWLEDGE_BASE_PROVIDER:-wikimg}"
export WIKIMG_ROOT="${WIKIMG_ROOT:-$DEFAULT_WIKIMG_ROOT}"
export WIKIMG_PROFILE="${WIKIMG_PROFILE:-kimi}"
export PORT="${PORT:-8787}"
export PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v npm >/dev/null 2>&1; then
  echo "未找到 npm，请先安装 Node.js/npm。" >&2
  exit 1
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "未找到 Python 解释器: ${PYTHON_BIN}" >&2
  exit 1
fi

if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  echo "缺少依赖目录: ${APP_DIR}/node_modules" >&2
  echo "请先在 ${APP_DIR} 下执行 npm ci" >&2
  exit 1
fi

if [[ ! -d "${WIKIMG_ROOT}" ]]; then
  echo "未找到 WIKIMG_ROOT: ${WIKIMG_ROOT}" >&2
  exit 1
fi

if [[ ! -f "${WIKIMG_ROOT}/WIKI_MG/wikimg" ]]; then
  echo "未找到 WiKiMG CLI: ${WIKIMG_ROOT}/WIKI_MG/wikimg" >&2
  exit 1
fi

cd "${APP_DIR}"

cat <<EOF
正在启动 WiKiMG 后端
  APP_DIR: ${APP_DIR}
  KNOWLEDGE_BASE_PROVIDER: ${KNOWLEDGE_BASE_PROVIDER}
  WIKIMG_ROOT: ${WIKIMG_ROOT}
  WIKIMG_PROFILE: ${WIKIMG_PROFILE}
  PYTHON_BIN: ${PYTHON_BIN}
  PORT: ${PORT}

健康检查:
  http://localhost:${PORT}/api/health
EOF

exec npm run server
