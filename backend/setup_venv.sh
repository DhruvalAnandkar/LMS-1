#!/usr/bin/env bash
# Create and set up a local Python virtual environment for the backend.
# Run from the backend directory: ./setup_venv.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="venv"

echo "Creating virtual environment in $VENV_DIR..."
python3 -m venv "$VENV_DIR"

echo "Installing dependencies..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r requirements.txt

echo ""
echo "Virtual environment ready. Activate it with:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "Or run commands directly:"
echo "  $VENV_DIR/bin/python -m uvicorn app.main:app --reload"
