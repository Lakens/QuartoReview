#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
ELECTRON_DIR="$ROOT/electron"
FRONTEND_DIR="$ROOT/frontend"

echo "============================================================"
echo " QuartoReview - macOS Desktop Build"
echo "============================================================"
echo

if [[ "$OSTYPE" != darwin* ]]; then
    echo "[ERROR] macOS builds must be created on macOS."
    echo "Run this script on a Mac, or use a macOS CI runner."
    exit 1
fi

echo "[1/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

echo "[2/4] Building frontend..."
npx vite build
echo "[OK] Frontend built to frontend/dist/"
echo

echo "[3/4] Installing electron dependencies..."
cd "$ELECTRON_DIR"
npm install --silent

echo "[4/4] Building macOS app..."
npm run build:mac

echo
echo "============================================================"
echo " Build complete! macOS artifacts are in: dist/"
echo "============================================================"
