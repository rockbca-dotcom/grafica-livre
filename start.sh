#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org/"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Este sistema pede Node.js 20 ou superior. Versão atual: $(node -v)"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Instalando dependências..."
  npm install
fi

echo "Abrindo o sistema em http://localhost:5173"
echo "Para parar, pressione Ctrl+C"
npm run dev
