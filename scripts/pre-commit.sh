#!/usr/bin/env bash
# Capa 2: bloquea commits con secretos. Lo ejecuta husky (.husky/pre-commit), que se instala solo con `npm install`.
set -euo pipefail
if ! command -v gitleaks >/dev/null; then
  echo "pre-commit: falta gitleaks. Instálalo con: brew install gitleaks" >&2
  exit 1
fi
gitleaks git --pre-commit --staged --redact --no-banner --verbose
