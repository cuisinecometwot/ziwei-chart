#!/usr/bin/env bash
# Chạy frontend (vite, :5173) và backend (wrangler dev, :8787) cùng lúc để
# phát triển/kiểm thử tại máy local. Bật ENVIRONMENT=local ở backend nên phần
# luận giải trả về đầy đủ, không bị cắt như bản preview khi deploy.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f server/.dev.vars ]; then
  echo "Tạo server/.dev.vars từ .dev.vars.example (bật ENVIRONMENT=local)..."
  cp server/.dev.vars.example server/.dev.vars
fi

if [ ! -f .env ]; then
  echo "Tạo .env từ .env.example..."
  cp .env.example .env
fi

echo "Khởi động backend (wrangler dev, cổng 8787)..."
(cd server && npm run dev) &
BACKEND_PID=$!

cleanup() {
  echo
  echo "Đang dừng backend..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Khởi động frontend (vite, cổng 5173)..."
npm run dev
