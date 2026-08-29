#!/usr/bin/env bash
# Deploy: git push (kích hoạt CI/CD của frontend nếu có) rồi wrangler deploy
# (backend). QUAN TRỌNG: wrangler deploy đóng gói trực tiếp file
# server/src/data/luangiai/vi.json đang có trên đĩa — nếu để nguyên bản đầy đủ
# đang dùng cho `run.sh` thì nội dung luận giải đầy đủ sẽ bị lộ ra worker đã
# deploy. Script này tạm hoán bản đầy đủ ra ngoài, nạp lại đúng bản preview đã
# commit trong git để deploy, rồi khôi phục bản đầy đủ cho local sau khi xong
# (kể cả khi deploy lỗi giữa chừng, nhờ trap).
set -euo pipefail
cd "$(dirname "$0")"

DATA_FILE="server/src/data/luangiai/vi.json"

if ! git ls-files --error-unmatch "$DATA_FILE" >/dev/null 2>&1; then
  echo "Lỗi: $DATA_FILE chưa được commit (bản preview)." >&2
  echo "Chạy server/scripts/commit-preview-data.sh trước rồi thử lại." >&2
  exit 1
fi

BACKUP=""
if ! git diff --quiet -- "$DATA_FILE"; then
  BACKUP="$(mktemp)"
  cp "$DATA_FILE" "$BACKUP"
  echo "Đã sao lưu bản luận giải đầy đủ (local) sang $BACKUP"
fi

restore_full_data() {
  if [ -n "$BACKUP" ]; then
    cp "$BACKUP" "$DATA_FILE"
    rm -f "$BACKUP"
    echo "Đã khôi phục bản luận giải đầy đủ cho local."
  fi
}
trap restore_full_data EXIT

echo "Đẩy code lên git..."
git push

echo "Nạp lại bản preview đã commit để deploy (tránh lộ nội dung đầy đủ)..."
git checkout -- "$DATA_FILE"

echo "Deploy backend qua wrangler..."
(cd server && npm run deploy)

echo "Deploy xong."
