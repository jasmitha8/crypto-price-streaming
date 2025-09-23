#!/usr/bin/env bash
set -euo pipefail

# Ensure pnpm deps
echo "[run.sh] Installing dependencies..."
pnpm install --recursive

echo "[run.sh] Generating protobuf/ConnectRPC code..."
pnpm run codegen

echo "[run.sh] Launching backend and frontend..."
# Two terminals is ideal; for single command convenience use concurrently
# but to keep deps minimal, run both in the background here.
(cd packages/backend && pnpm run dev) &
BACKEND_PID=$!

(cd packages/web && pnpm run dev) &
WEB_PID=$!

echo "[run.sh] Backend PID: $BACKEND_PID, Web PID: $WEB_PID"
echo "[run.sh] Open http://localhost:3000"

wait
