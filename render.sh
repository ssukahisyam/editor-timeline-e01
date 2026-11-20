#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org"; exit 1; }
node scripts/menu.mjs "$@"
