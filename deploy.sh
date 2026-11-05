#!/usr/bin/env bash
# Deploy: git push (kích hoạt CI/CD của frontend) rồi wrangler deploy (backend).
#
# Dữ liệu luận giải (server/src/data/luangiai/) bị .gitignore, KHÔNG có trong git;
# wrangler deploy đóng gói trực tiếp các file đang có trên máy này vào Worker,
# nên chỉ deploy được từ máy có sẵn bộ dữ liệu. Nội dung nằm kín trên
# Cloudflare; người dùng miễn phí chỉ nhận bản đã lược (toPreview).
set -euo pipefail
cd "$(dirname "$0")"

DATA_DIR="server/src/data/luangiai"
DATA_FILES=(vi.json tuvi-luan-giai.json tuvi-cach-cuc.json tuvi-tap-tinh.json)

for f in "${DATA_FILES[@]}"; do
  if [ ! -f "$DATA_DIR/$f" ]; then
    echo "Lỗi: thiếu $DATA_DIR/$f — chỉ deploy được từ máy có dữ liệu luận giải." >&2
    exit 1
  fi
done

if [ -n "$(git ls-files "$DATA_DIR")" ]; then
  echo "Lỗi: có file trong $DATA_DIR đang được git theo dõi — gỡ ra (git rm --cached) trước khi deploy." >&2
  exit 1
fi

echo "Đẩy code lên git..."
git push

echo "Deploy backend qua wrangler..."
(cd server && npm run deploy)

echo "Deploy xong."
