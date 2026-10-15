#!/usr/bin/env bash
# Capa 2: bloquea commits con secretos. Instalar: ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit
set -euo pipefail
if ! command -v gitleaks >/dev/null; then echo "Instala gitleaks: brew install gitleaks"; exit 1; fi
gitleaks protect --staged --redact
