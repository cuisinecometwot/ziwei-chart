# Lá Số Tử Vi (紫微斗数 / Zi Wei Dou Shu)

Ứng dụng lập lá số Tử Vi (Zi Wei Dou Shu) với kiến trúc **Frontend + Backend**:
lá số được lập ngay trên trình duyệt, còn **dữ liệu luận giải được bảo vệ ở phía server**
và trả về qua API (chống lộ dữ liệu luận giải ra bundle frontend).

- **Frontend**: React + TypeScript, chạy tĩnh trên GitHub Pages.
  Vẫn lập lá số 12 cung hoàn toàn trên browser (chính tinh, phụ tinh, Tứ Hóa, Đại hạn,
  Tiểu hạn) và tải ảnh PNG.
- **Backend**: Cloudflare Worker nhận dữ liệu ngày giờ sinh, tự lập lá số, luận giải và
  trả về kết quả. `vi.json` (dữ liệu luận giải) + `interpreter.ts` chỉ nằm ở server.

Hỗ trợ 3 ngôn ngữ: **Tiếng Việt / English / 日本語**.

> 📘 Hướng dẫn triển khai chi tiết từng bước (backend + frontend): xem [HUONG_DAN_TRIEN_KHAI.md](HUONG_DAN_TRIEN_KHAI.md)

## Kiến trúc

```
┌─────────────────────────┐        POST /api/interpret        ┌──────────────────────────────┐
│  Frontend (GitHub Pages) │ ───────────────────────────────► │  Cloudflare Worker API        │
│  React + TypeScript      │  { gender, year, month, day,     │  server/src/                  │
│  - tuvi-neo: lập lá số   │    hour, lang }                  │  - chart.ts (lập lá số)       │
│  - chart.ts (buildChart) │ ◄─────────────────────────────── │  - interpreter.ts + vi.json   │
│  - gọi API lấy luận giải │   { tier: 'preview', sections }  │    (dữ liệu luận giải, giữ    │
│  - render lá số + luận   │   (không trả raw dict)           │    kín ở server)              │
│    giải                  │                                  └──────────────────────────────┘
└─────────────────────────┘        Cloudflare Workers Free: 100k request/ngày (~3M/tháng)
```

Điểm mấu chốt bảo vệ sở hữu trí tuệ: API chỉ trả **kết quả luận giải đã render**
(`sections`) cho đúng lá số được yêu cầu, **không bao giờ trả raw JSON luận giải**.
Vì vậy `vi.json` và logic luận giải không xuất hiện trong bundle frontend.
Ngoài ra còn có 3 lớp chống cào dữ liệu: rate limit per-IP (mặc định 5 request/giờ),
Cloudflare Turnstile (xác minh con người) và validate đầu vào chặt.

### Preview vs. bản đầy đủ

Worker có 2 route:

- `POST /api/interpret` — **bản xem trước (miễn phí)**, frontend đang gọi route này.
  Trả tổng quan (`summary`) đầy đủ + luận giải riêng 2 cung Mệnh/Thân; các phần còn lại
  (cách cục, sao đồng cung, sao xung chiếu, tương quan giữa các cung, 10 cung còn lại)
  chỉ trả về **số lượng bị khoá** (`locked: true`, `lockedCount`), không lộ nội dung.
- `POST /api/interpret/full` — **bản đầy đủ**. Hiện **chưa mở bán** (trả `402`) trừ khi
  worker chạy với `ENVIRONMENT=local` — dùng để phát triển/kiểm thử UI bản đầy đủ trước
  khi có cổng thanh toán thật. Cả hai route dùng chung 3 lớp chống cào ở trên.

Việc phân loại preview/full nằm ở `server/src/interpreter.ts` (`toPreview`) — chỉ lược
bớt ở tầng response, dữ liệu gốc `vi.json` không rời khỏi server trong cả hai trường hợp.

## Công nghệ

- React 18 + TypeScript + Vite
- [tuvi-neo](https://www.npmjs.com/package/tuvi-neo) — engine tính toán Tử Vi Việt Nam
- i18next / react-i18next — đa ngôn ngữ VN / EN / JP
- html-to-image — xuất ảnh PNG
- GitHub Pages + GitHub Actions — deploy frontend
- Cloudflare Workers (TypeScript, `wrangler`) — backend API luận giải

## Chạy tại máy

```bash
npm install
npm run dev          # chạy môi trường phát triển (frontend)
npm run typecheck    # typecheck frontend + config
npm run build        # build bản production vào thư mục dist/
npm run preview      # xem trước bản production

# Backend (server/)
cd server
cp .dev.vars.example .dev.vars   # bật ENVIRONMENT=local (mở khoá /api/interpret/full khi chạy local)
npm run dev          # chạy worker local (http://localhost:8787)
npm run typecheck
npm run deploy       # deploy lên Cloudflare Workers
```

`.dev.vars` chỉ được `wrangler dev` đọc, không bao giờ deploy lên Cloudflare và đã có
trong `.gitignore` (không commit). Không có file này, route `/api/interpret/full` sẽ
trả `402` kể cả khi chạy local — giống hệt hành vi trên production.

Kiểm nhanh cả 2 route sau khi `npm run dev`:

```bash
curl -s -X POST http://localhost:8787/api/interpret \
  -H "Content-Type: application/json" \
  -d '{"gender":"male","year":1990,"month":5,"day":15,"hour":7,"lang":"vi"}'

curl -s -X POST http://localhost:8787/api/interpret/full \
  -H "Content-Type: application/json" \
  -d '{"gender":"male","year":1990,"month":5,"day":15,"hour":7,"lang":"vi"}'
```

### Cấu hình URL API (bắt buộc để có phần luận giải)

Frontend cần biết URL worker để gọi luận giải. Tạo file `.env` ở thư mục gốc
(xem `.env.example`):

```bash
VITE_API_URL=https://lasotuvi-api.<subdomain>.workers.dev
```

Hoặc khi build:
```bash
VITE_API_URL=https://lasotuvi-api.<subdomain>.workers.dev npm run build
```

Nếu chưa cấu hình, lá số vẫn lập bình thường nhưng phần luận giải sẽ báo lỗi cấu hình.

## Deploy

### 1. Backend — Cloudflare Workers

```bash
cd server
npm install
npm run deploy        # lần đầu sẽ yêu cầu đăng nhập Cloudflare (wrangler login)
```

- Gói **Free**: 100.000 request/ngày (~3 triệu/tháng), không cần thẻ tín dụng.
  Khi đạt hạn mức, API trả HTTP 429 và frontend hiển thị thông báo (không treo).
- Worker URL mặc định dạng `https://lasotuvi-api.<tên>.workers.dev`.
- Có thể giới hạn nguồn gọi bằng biến `ALLOWED_ORIGIN`:
  ```bash
  cd server
  npx wrangler secret put ALLOWED_ORIGIN
  # nhập: https://<user>.github.io
  ```

### 2. Frontend — GitHub Pages

1. Đẩy mã nguồn lên nhánh `main`.
2. Vào **Settings → Pages**, chọn nguồn **GitHub Actions**.
3. Thiết lập biến repository `VITE_API_URL` (URL worker) tại
   **Settings → Secrets and variables → Actions → Variables**.
4. Workflow `.github/workflows/deploy.yml` tự build và deploy sau mỗi lần push.

> Kết quả mang tính tham khảo, phục vụ mục đích văn hóa, giáo dục và giải trí.