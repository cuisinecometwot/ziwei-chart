// URL gốc của dịch vụ luận giải (Cloudflare Worker).
// Thiết lập khi build bằng biến môi trường VITE_API_URL, ví dụ:
//   VITE_API_URL=https://lasotuvi-api.<subdomain>.workers.dev npm run build
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';

// Site key Turnstile (chống bot cào data). Nếu để trống, frontend bỏ qua bước
// xác minh (dùng khi chưa cấu hình / chạy local).
export const TURNSTILE_SITEKEY: string = (import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined)?.trim() || '';