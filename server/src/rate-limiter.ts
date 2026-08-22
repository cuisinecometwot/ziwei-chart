import type { DurableObjectState } from '@cloudflare/workers-types';

const HOUR_MS = 3_600_000;

interface Entry {
  count: number;
  bucket: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Durable Object chịu trách nhiệm đếm request theo khung 1 giờ, theo từng IP.
// Counters giữ trong bộ nhớ (không cần ghi storage), reset khi instance khởi động lại —
// chấp nhận được với mục đích chống cào. Giới hạn mặc định: 5 request/giờ/IP.
export class RateLimiterDO {
  private state: DurableObjectState;
  private counts = new Map<string, Entry>();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip') || 'unknown';
    const limit = Math.max(1, Number(url.searchParams.get('limit')) || 5);
    const bucket = Math.floor(Date.now() / HOUR_MS);

    // Giữ map gọn: khi đủ lớn, dọn các entry thuộc giờ cũ.
    if (this.counts.size > 5000) {
      for (const [key, value] of this.counts) {
        if (value.bucket !== bucket) this.counts.delete(key);
      }
    }

    const entry = this.counts.get(ip);
    if (!entry || entry.bucket !== bucket) {
      this.counts.set(ip, { count: 1, bucket });
      return json({ allowed: true });
    }
    if (entry.count >= limit) {
      return json({ allowed: false });
    }
    entry.count += 1;
    return json({ allowed: true });
  }
}