#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping any processes on ports 3001 and 5173..."
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

echo "Starting backend..."
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
  osascript -e "tell app \"iTerm\" to create window with default profile command \"bash -c 'cd \\\"$SCRIPT_DIR/backend\\\" && npm start; exec bash'\""
else
  osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && npm start\""
fi

echo "Starting frontend..."
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
  osascript -e "tell app \"iTerm\" to create window with default profile command \"bash -c 'cd \\\"$SCRIPT_DIR/frontend\\\" && npm start; exec bash'\""
else
  osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm start\""
fi

echo ""
echo "Both servers are starting."
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"

echo "Opening browser in 5 seconds..."
sleep 5
open "http://localhost:5173"
