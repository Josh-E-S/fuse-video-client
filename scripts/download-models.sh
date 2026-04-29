#!/bin/bash
set -e

MODELS_DIR="${MODELS_DIR:-$(dirname "$0")/../models}"
mkdir -p "$MODELS_DIR"

REPO="Josh-E-S/fuse-video-client"

# Parakeet TDT-CTC 110M (NVIDIA, INT8 quantized, ~126MB)
PARAKEET_TAG="models-v1"
PARAKEET_URL="https://github.com/$REPO/releases/download/$PARAKEET_TAG/parakeet-tdt-ctc-110m-int8.tar.bz2"
if [ ! -f "$MODELS_DIR/parakeet/model.int8.onnx" ]; then
  echo "Downloading Parakeet TDT-CTC 110M..."
  curl -L -o "$MODELS_DIR/parakeet.tar.bz2" "$PARAKEET_URL"
  echo "Extracting..."
  tar xjf "$MODELS_DIR/parakeet.tar.bz2" -C "$MODELS_DIR"
  rm "$MODELS_DIR/parakeet.tar.bz2"
  echo "Parakeet model ready."
fi

# Qwen3-0.6B-Instruct Q4_K_M (Bartowski/Qwen, ~400MB)
QWEN_TAG="models-v2"
QWEN_URL="https://github.com/$REPO/releases/download/$QWEN_TAG/qwen3-0.6b-instruct-q4km.tar.bz2"
if [ ! -f "$MODELS_DIR/qwen3-0.6b/Qwen_Qwen3-0.6B-Q4_K_M.gguf" ]; then
  echo "Downloading Qwen3-0.6B-Instruct Q4_K_M..."
  curl -L -o "$MODELS_DIR/qwen3.tar.bz2" "$QWEN_URL"
  echo "Extracting..."
  tar xjf "$MODELS_DIR/qwen3.tar.bz2" -C "$MODELS_DIR"
  rm "$MODELS_DIR/qwen3.tar.bz2"
  echo "Qwen3 summary model ready."
fi

echo "All models downloaded to $MODELS_DIR"
