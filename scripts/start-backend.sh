#!/bin/bash

# Quvis FastAPI Backend Startup Script

set -e

echo "🚀 Starting Quvis FastAPI Backend"

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install it first:"
    echo "   curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d ".venv" ] && [ ! -d "$(poetry env info -p 2>/dev/null)" ]; then
    echo "📦 Installing dependencies..."
    poetry install
else
    echo "✓ Dependencies already installed"
fi

# Start the server
echo "🌐 Starting server on http://0.0.0.0:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

poetry run uvicorn quvis.api.fastapi_app:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info
