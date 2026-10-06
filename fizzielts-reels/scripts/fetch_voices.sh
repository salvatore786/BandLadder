#!/usr/bin/env bash
# Piper voice models for the narration. ~63MB each, so .voices/ is gitignored
# and this script refetches them on a fresh clone.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .voices
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/en

for v in en_US-amy-medium en_GB-jenny_dioco-medium en_US-hfc_female-medium; do
  lang=${v%%-*}; rest=${v#*-}; name=${rest%-*}; quality=${rest##*-}
  for ext in onnx onnx.json; do
    out=".voices/$v.$ext"
    [ -s "$out" ] && { echo "have $out"; continue; }
    echo "fetching $v.$ext"
    curl -fsSL --retry 3 -o "$out" "$BASE/$lang/$name/$quality/$v.$ext"
  done
done
echo "voices in .voices/"
