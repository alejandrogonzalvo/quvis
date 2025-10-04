#!/bin/bash

# Quvis Development Launcher
# Starts both FastAPI backend and Vite frontend

set -e

echo "🚀 Starting Quvis Development Environment"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down...${NC}"

    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null || true

    # Kill by port if needed
    lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true

    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}❌ Poetry is not installed${NC}"
    echo "Install it with: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

if [ ! -d ".venv" ] && [ ! -d "$(poetry env info -p 2>/dev/null)" ]; then
    echo "Installing Python dependencies..."
    poetry install
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Start FastAPI backend
echo -e "${BLUE}🐍 Starting FastAPI backend on http://localhost:8000${NC}"
poetry run uvicorn quvis.api.fastapi_app:app --reload --host 0.0.0.0 --port 8000 > /tmp/quvis-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo "Check logs: tail -f /tmp/quvis-backend.log"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""

# Start Vite frontend
echo -e "${BLUE}⚛️  Starting Vite frontend on http://localhost:5173${NC}"
npm run dev > /tmp/quvis-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start${NC}"
        echo "Check logs: tail -f /tmp/quvis-frontend.log"
        cleanup
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Quvis is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}     http://localhost:5173"
echo -e "  ${BLUE}Backend:${NC}      http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC}     http://localhost:8000/docs"
echo -e "  ${BLUE}Health Check:${NC} http://localhost:8000/api/health"
echo ""
echo -e "  ${YELLOW}Backend logs:${NC}  tail -f /tmp/quvis-backend.log"
echo -e "  ${YELLOW}Frontend logs:${NC} tail -f /tmp/quvis-frontend.log"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and show combined logs
tail -f /tmp/quvis-backend.log /tmp/quvis-frontend.log &
TAIL_PID=$!

# Wait indefinitely
wait $TAIL_PID
