#!/bin/bash
set -e

MODELS_DIR="$(dirname "$0")/../models"
mkdir -p "$MODELS_DIR"

# Parakeet TDT-CTC 110M (NVIDIA, INT8 quantized, ~126MB)
if [ ! -f "$MODELS_DIR/parakeet/model.int8.onnx" ]; then
  echo "Downloading Parakeet TDT-CTC 110M..."
  curl -L -o "$MODELS_DIR/parakeet.tar.bz2" \
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet_tdt_ctc_110m-en-36000-int8.tar.bz2"
  tar xjf "$MODELS_DIR/parakeet.tar.bz2" -C "$MODELS_DIR"
  mv "$MODELS_DIR/sherpa-onnx-nemo-parakeet_tdt_ctc_110m-en-36000-int8" "$MODELS_DIR/parakeet"
  rm "$MODELS_DIR/parakeet.tar.bz2"
  echo "Parakeet model ready."
fi

# Silero VAD v5 (~2.2MB) -- not yet used, will enable for smart segmentation later
# if [ ! -f "$MODELS_DIR/silero_vad.onnx" ]; then
#   echo "Downloading Silero VAD..."
#   curl -L -o "$MODELS_DIR/silero_vad.onnx" \
#     "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx"
#   echo "Silero VAD ready."
# fi

echo "All models downloaded to $MODELS_DIR"
