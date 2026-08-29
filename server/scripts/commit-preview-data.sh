#!/usr/bin/env bash
# Tạo và commit bản "preview" (nội dung bị cắt gần hết, giữ nguyên cấu trúc)
# của server/src/data/luangiai/vi.json — file này bị .gitignore loại khỏi git
# (server/src/data/luangiai/) nên phải git add -f mới commit được.
#
# Chạy lại mỗi khi cấu trúc JSON luận giải đổi theo code, để một checkout mới
# (dùng khi deploy) luôn có sẵn một vi.json hợp lệ về cấu trúc.
#
# Script tự backup bản đầy đủ đang có trên máy trước khi ghi đè, và khôi phục
# lại sau khi commit xong — không làm mất nội dung đầy đủ trên local.
set -euo pipefail
cd "$(dirname "$0")/.."

DATA_FILE="src/data/luangiai/vi.json"

if [ ! -f "$DATA_FILE" ]; then
  echo "Lỗi: không tìm thấy $DATA_FILE (chạy từ máy có sẵn bản luận giải đầy đủ)." >&2
  exit 1
fi

BACKUP="$(mktemp)"
cp "$DATA_FILE" "$BACKUP"

restore_full_data() {
  cp "$BACKUP" "$DATA_FILE"
  rm -f "$BACKUP"
  echo "Đã khôi phục bản luận giải đầy đủ cho local."
}
trap restore_full_data EXIT

echo "Sinh bản preview từ $DATA_FILE..."
node scripts/gen-preview-data.mjs

git add -f "$DATA_FILE"
git commit -m "Update preview luận giải data to match current JSON structure"

echo "Đã commit bản preview."
