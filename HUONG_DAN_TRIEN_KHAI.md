# Hướng dẫn triển khai Lá Số Tử Vi (Production Deployment Guide)

Tài liệu này hướng dẫn từng bước triển khai ứng dụng **Lá Số Tử Vi** lên môi trường
production với hai thành phần:

| Thành phần | Công nghệ | Nơi chạy |
|---|---|---|
| Frontend | React + TypeScript + Vite | GitHub Pages (tĩnh) |
| Backend API luận giải | Cloudflare Workers (TypeScript) | `https://lasotuvi-api.<subdomain>.workers.dev` |

> Dữ liệu luận giải (`vi.json`) và logic luận giải (`interpreter.ts`) **chỉ nằm ở phía server**.
> Frontend chỉ nhận kết quả luận giải đã render qua API, nên dữ liệu không bị lộ ra bundle.

---

## 1. Điều kiện tiên quyết

Trước khi bắt đầu, cần có:

- [Node.js](https://nodejs.org/) **18 trở lên** (khuyến nghị 20/22 LTS) kèm `npm`
- [Git](https://git-scm.com/)
- Tài khoản [Cloudflare](https://dash.cloudflare.com/) (miễn phí, **không cần thẻ tín dụng**)
- Tài khoản [GitHub](https://github.com/)

Kiểm tra môi trường:

```bash
node --version   # >= 18
npm --version
git --version
```

Cài đặt dependencies (lưu ý: repo dùng npm workspaces, một lệnh cài cho cả frontend + server):

```bash
cd <thư-mục-dự-án>
npm install
```

---

## 2. Triển khai Backend (Cloudflare Workers)

### 2.1. Đăng nhập Cloudflare

```bash
cd server
npm run deploy
```

Lần đầu chạy, `wrangler` sẽ mở trình duyệt yêu cầu đăng nhập tài khoản Cloudflare:

```bash
npx wrangler login
```

Nếu máy không có trình duyệt, có thể cấp token thủ công:

```bash
npx wrangler login --browser=false
```

### 2.2. Deploy Worker

```bash
cd server
npm run deploy
```

Khi deploy thành công, `wrangler` hiển thị URL dạng:

```
https://lasotuvi-api.<tên-đăng-nhập>.workers.dev
```

Đây là **URL API** cần dùng ở bước frontend (mục 3.3). Có thể kiểm tra nhanh bằng curl:

```bash
curl -X POST "https://lasotuvi-api.<tên-đăng-nhập>.workers.dev/api/interpret" \
  -H "Content-Type: application/json" \
  -d '{"gender":"male","year":1990,"month":5,"day":15,"hour":7,"lang":"vi"}'
```

Nếu thành công sẽ trả về JSON có `sections` chứa nội dung luận giải.

### 2.3. Chạy Worker local (tùy chọn, khi phát triển)

```bash
cd server
npm run dev
# Worker chạy tại http://localhost:8787
```

### 2.4. Giới hạn hạn mức miễn phí (quan trọng)

- Gói **Free**: **100.000 request/ngày** (~3 triệu request/tháng).
- Khi đạt hạn mức, API trả **HTTP 429**. Frontend sẽ hiển thị thông báo "đã đạt hạn mức"
  thay vì treo lỗi, nên người dùng vẫn lập được lá số (chỉ mất phần luận giải).
- Nếu cần giới hạn nguồn gọi (chỉ cho phép domain GitHub Pages của bạn gọi), đặt secret
  `ALLOWED_ORIGIN`:

```bash
cd server
npx wrangler secret put ALLOWED_ORIGIN
# Nhập: https://<tên-user>.github.io  (bỏ tiền tố https:// và đường dẫn sau)
```

> Lưu ý: secret chỉ có hiệu lực sau lần deploy kế tiếp.

### 2.5. Chống lạm dụng (chống cào dữ liệu)

Backend đã có sẵn 3 lớp phòng vệ:

**A. Rate limit per-IP** — đếm request theo **khung 1 giờ, 5 request/IP** (mặc định),
thực hiện bằng **Durable Object** (`server/src/rate-limiter.ts`, khai báo trong
`server/wrangler.jsonc`). Lý do không dùng binding `ratelimits` của Worker: API đó chỉ
hỗ trợ chu kỳ **10s hoặc 60s**, không hỗ trợ giới hạn theo giờ. Vượt mức → trả `429`.

- Đổi ngưỡng (vd 10/giờ):
  ```bash
  cd server
  npx wrangler secret put RATE_LIMIT_PER_HOUR
  # Nhập: 10
  ```
- Lưu ý: 5 request/giờ/IP khá nghiêm ngặt — người dùng đổi lá số nhiều lần trong giờ
  (hoặc đổi ngôn ngữ liên tục) có thể bị chặn tạm. Bộ đếm nằm trong bộ nhớ DO, sẽ tự
  reset khi Worker/DO khởi động lại.

**B. Cloudflare Turnstile** (xác minh con người, chặn bot cào):

1. Tạo **site + secret key** tại [dash.cloudflare.com](https://dash.cloudflare.com/) →
   **Turnstile** → **Add site**. Nhập domain frontend (vd `*.github.io`).
2. Đặt secret cho worker:
   ```bash
   cd server
   npx wrangler secret put TURNSTILE_SECRET
   # Dán secret key của Turnstile
   ```
3. Đặt **site key** cho frontend khi build (biến `VITE_TURNSTILE_SITEKEY`, tạo thêm
   biến repository `VITE_TURNSTILE_SITEKEY` hoặc thêm vào `.env`).
4. Deploy lại: `cd server && npm run deploy`, rồi push frontend.

> Khi chưa đặt `TURNSTILE_SECRET`, worker **bỏ qua** bước xác minh (fail-open để dev dễ chạy).
> Khi đã đặt, mọi request thiếu token hợp lệ bị trả `403` — nhớ đặt sitekey phía frontend
> để người dùng xác minh được.

**C. Validate chặt** — kiểm tra ngày sinh tồn tại thực tế (chặn 30/2...), năm trong
khoảng 1900–2100, `hour` phải là 1 trong 12 giờ chi, và các trường phải là số nguyên.
Request không hợp lệ → `400`.

> Giới hạn thực tế: không cơ chế miễn phí nào chặn được 100% kẻ có proxy pool (đổi IP).
> Các lớp trên làm cho việc cào toàn bộ dữ liệu trở nên chậm và tốn kém. Muốn chặn tuyệt đối,
> về lâu dài nên mã hóa dữ liệu luận giải hoặc nâng cấp gói Cloudflare.

### 2.6. Cập nhật dữ liệu luận giải

Dữ liệu luận giải nằm tại `server/src/data/luangiai/vi.json`. Sau khi sửa, deploy lại:

```bash
cd server
npm run deploy
```

---

## 3. Triển khai Frontend (GitHub Pages)

### 3.1. Tạo repository trên GitHub

1. Tạo repository mới trên GitHub (repo **private** khuyến nghị vì chứa dữ liệu luận giải).
2. Đẩy mã nguồn lên nhánh `main`:

```bash
git add .
git commit -m "Deploy Lá Số Tử Vi"
git remote add origin git@github.com:<tên-user>/<tên-repo>.git
git push -u origin main
```

### 3.2. Bật GitHub Pages (nguồn = GitHub Actions)

1. Vào repo trên GitHub → **Settings → Pages**.
2. Mục **Build and deployment** → **Source** chọn **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ tự chạy mỗi lần push lên nhánh `main`.

> Không cần tạo branch `gh-pages` hay cấu hình thêm — workflow tự build bằng `npm run build`
> và deploy bằng `actions/deploy-pages`.

### 3.3. Cấu hình URL API cho frontend

Frontend cần biết URL worker để gọi luận giải. **Bắt buộc** nếu muốn phần luận giải hoạt động.

**Cách 1 — Biến repository (khuyến nghị cho CI/CD):**

Vào repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://lasotuvi-api.<tên-đăng-nhập>.workers.dev` |

Workflow đã đọc biến này (`${{ vars.VITE_API_URL }}`) khi build.

**Cách 2 — File `.env` khi build thủ công (dev/test):**

```bash
cd <thư-mục-dự-án>
cp .env.example .env
# Sửa .env:
#   VITE_API_URL=https://lasotuvi-api.<tên-đăng-nhập>.workers.dev
#   VITE_TURNSTILE_SITEKEY=<site-key-turnstile>   (nếu đã bật Turnstile ở mục 2.5)
```

Build thủ công:

```bash
npm run build
npm run preview      # xem trước tại http://localhost:4173
```

> Nếu thiếu `VITE_API_URL`, lá số vẫn lập bình thường nhưng phần luận giải hiển thị
> thông báo lỗi cấu hình.

### 3.4. Kiểm tra kết quả

Sau khi workflow hoàn tất, website có địa chỉ:

```
https://<tên-user>.github.io/<tên-repo>/
```

Kiểm tra:
1. Lập lá số với ngày giờ sinh bất kỳ → lá số 12 cung hiển thị đúng.
2. Phần "Luận giải lá số" hiển thị nội dung (chứng tỏ API hoạt động).
3. Đổi ngôn ngữ Việt / English / 日本語.

---

## 4. Kiểm thử trước khi phát hành

### 4.1. Typecheck

```bash
# Frontend (root)
npm run typecheck

# Backend (server)
cd server
npm run typecheck
```

### 4.2. Build production

```bash
npm run build
# Kết quả nằm trong thư mục dist/
```

### 4.3. Kiểm tra API

| Kịch bản | Kỳ vọng |
|---|---|
| `POST /api/interpret` dữ liệu hợp lệ | `200` + JSON `{ lang, intro, sections }` |
| Vượt rate limit per-IP (60/phút) | `429` |
| Thiếu/token Turnstile sai (khi đã đặt secret) | `403` |
| Sai `gender` / ngày không tồn tại / `hour` sai / trường không phải số nguyên | `400` + `{ error: "..." }` |
| Sai đường dẫn / sai method | `404` |
| `OPTIONS` (preflight CORS) | `204` kèm header `Access-Control-Allow-Origin` |
| Đạt hạn mức 100k request trong ngày | Cloudflare trả **Error 1027** |

---

## 5. Cấu trúc thư mục liên quan

```
├── .github/workflows/deploy.yml   # Build + deploy frontend lên GitHub Pages
├── .env.example                   # Mẫu cấu hình VITE_API_URL
├── server/                        # Backend Cloudflare Worker
│   ├── wrangler.jsonc             # Cấu hình worker (tên, compatibility_date)
│   ├── src/index.ts               # Entrypoint: POST /api/interpret
│   ├── src/chart.ts               # Lập lá số (dùng tuvi-neo)
│   ├── src/interpreter.ts         # Logic luận giải (chỉ ở server)
│   └── src/data/luangiai/vi.json  # Dữ liệu luận giải (chỉ ở server)
├── src/                           # Frontend React + TypeScript
│   ├── core/chart.ts              # Lập lá số trên browser
│   ├── core/api.ts                # Gọi API luận giải
│   └── config.ts                  # Đọc VITE_API_URL
└── vite.config.ts                 # Build frontend
```

---

## 6. Khắc phục sự cố thường gặp

**Lá số hiển thị nhưng phần luận giải báo "Chưa cấu hình dịch vụ luận giải"**
→ Chưa đặt `VITE_API_URL`. Làm theo mục 3.3 rồi build/deploy lại.

**Luận giải báo lỗi kết nối (Cannot connect...)**
→ Worker chưa deploy hoặc URL sai. Kiểm tra `curl` ở mục 2.2 và đối chiếu URL trong `VITE_API_URL`.

**Luận giải báo "đã đạt giới hạn request" (HTTP 429)**
→ Vượt rate limit per-IP (mặc định **5 request/giờ**, chờ hết giờ hiện tại hoặc nâng
   ngưỡng qua secret `RATE_LIMIT_PER_HOUR`). Khác với hạn mức 100k request/ngày của
   gói Free (khi đó Cloudflare trả Error 1027).

**Luận giải báo "Xác minh con người thất bại" (HTTP 403)**
→ Chưa đặt `VITE_TURNSTILE_SITEKEY` khi build frontend, hoặc site key/secret không khớp.
   Kiểm tra mục 2.5 (B) và deploy lại cả hai phía.

**Lỗi CORS khi gọi API**
→ Kiểm tra secret `ALLOWED_ORIGIN` đã đặt đúng domain GitHub Pages chưa (nếu có đặt).
   Nếu không đặt secret, worker mặc định cho phép mọi nguồn gọi (`*`).

**Workflow GitHub Pages fail ở bước Build**
→ Mở tab **Actions** xem log. Thường do thiếu `VITE_API_URL` (lỗi không ảnh hưởng build
   vì giá trị rỗng) hoặc lỗi syntax trong code — chạy `npm run typecheck` tại máy để rà.

**Muốn xem nhật ký request của worker**
```bash
cd server
npx wrangler tail
```

---

## 7. Tóm tắt quy trình triển khai lần đầu

```bash
# 1. Cài dependencies
npm install

# 2. Deploy backend
cd server
npx wrangler login
npm run deploy          # → lấy URL https://lasotuvi-api.<subdomain>.workers.dev
cd ..

# 3. Đẩy code lên GitHub, bật Pages (nguồn = GitHub Actions)
git add .
git commit -m "Initial deploy"
git push origin main

# 4. Đặt biến repository VITE_API_URL = URL worker (Settings → Secrets and variables → Actions)

# 5. Push lại (hoặc chờ workflow lần sau) để build với đúng VITE_API_URL
```

Sau lần đầu, mỗi lần chỉ cần `git push` — workflow tự build và deploy; còn backend chỉ cần
`cd server && npm run deploy` khi có thay đổi ở `server/`.