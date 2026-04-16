#!/bin/bash
set -e

MODELS_DIR="${MODELS_DIR:-$(dirname "$0")/../models}"
mkdir -p "$MODELS_DIR"

REPO="Josh-E-S/fuse-video-client"
TAG="models-v1"
URL="https://github.com/$REPO/releases/download/$TAG/parakeet-tdt-ctc-110m-int8.tar.bz2"

# Parakeet TDT-CTC 110M (NVIDIA, INT8 quantized, ~126MB)
if [ ! -f "$MODELS_DIR/parakeet/model.int8.onnx" ]; then
  echo "Downloading Parakeet TDT-CTC 110M..."
  curl -L -o "$MODELS_DIR/parakeet.tar.bz2" "$URL"
  echo "Extracting..."
  tar xjf "$MODELS_DIR/parakeet.tar.bz2" -C "$MODELS_DIR"
  rm "$MODELS_DIR/parakeet.tar.bz2"
  echo "Parakeet model ready."
fi

echo "All models downloaded to $MODELS_DIR"
