import { API_URL } from '../config';
import type { InterpretRequest, InterpretResponse } from '../types';

// Lỗi xác minh Turnstile thất bại/hết hạn (HTTP 403).
export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

// Gọi API backend lấy luận giải. Dữ liệu luận giải (JSON gốc) nằm ở phía server,
// frontend chỉ nhận kết quả đã render cho đúng lá số được yêu cầu.
export async function fetchInterpretation(
  req: InterpretRequest,
  turnstileToken?: string,
): Promise<InterpretResponse> {
  if (!API_URL) {
    throw new Error('Chưa cấu hình dịch vụ luận giải. Đặt biến môi trường VITE_API_URL khi build.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (turnstileToken) headers['X-Turnstile-Token'] = turnstileToken;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/interpret`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error('Không thể kết nối tới dịch vụ luận giải. Vui lòng thử lại sau.');
  }

  if (res.status === 403) {
    throw new VerificationError('Xác minh con người thất bại hoặc đã hết hạn. Vui lòng xác minh lại.');
  }

  if (res.status === 429) {
    throw new Error('Dịch vụ luận giải đã đạt hạn mức request trong ngày. Vui lòng quay lại sau.');
  }

  if (!res.ok) {
    let message = `Lỗi dịch vụ luận giải (HTTP ${res.status}).`;
    try {
      const data: unknown = await res.json();
      if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
        message = (data as { error: string }).error;
      }
    } catch {
      // Giữ thông báo mặc định nếu body không phải JSON.
    }
    throw new Error(message);
  }

  return (await res.json()) as InterpretResponse;
}