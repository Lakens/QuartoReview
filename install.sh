#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo " Resolve - First-time setup"
echo "================================================"
echo ""

# Check that Node.js is installed
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "Please install Node.js from: https://nodejs.org"
    echo "Choose the LTS version."
    echo "Then run this script again."
    exit 1
fi

echo "Node.js found: $(node --version)"
echo ""

echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install

echo ""
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install

echo ""
echo "================================================"
echo " Installation complete!"
echo "================================================"
echo ""
echo "Next step: create the file  backend/.env"
echo "See README.md for instructions on what to put in it."
echo "(You need a GitHub OAuth App - takes about 2 minutes.)"
echo ""
echo "Once .env is ready, run  ./start.sh  to launch the app."
echo ""
