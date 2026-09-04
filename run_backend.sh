#!/usr/bin/env bash
# Script to launch Drishtikon FastAPI Backend with venv Python
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="$DIR"

if [ -f "$DIR/venv/bin/python" ]; then
    PYTHON_EXEC="$DIR/venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

echo "Starting Drishtikon Backend using $PYTHON_EXEC..."
exec "$PYTHON_EXEC" "$DIR/backend/main.py"
