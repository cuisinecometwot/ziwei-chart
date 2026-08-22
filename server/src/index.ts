import { buildChart } from './chart';
import { interpret, toPreview } from './interpreter';
import { RateLimiterDO } from './rate-limiter';
import type { Gender, InterpretRequest, InterpretResponse, Lang } from './types';

export { RateLimiterDO };

export interface Env {
  RATE_LIMITER_DO: DurableObjectNamespace;
  ALLOWED_ORIGIN?: string;
  TURNSTILE_SECRET?: string;
  // Số request tối đa/IP trong 1 giờ (mặc định 5).
  RATE_LIMIT_PER_HOUR?: string;
  // 'local' khi chạy `wrangler dev` (xem server/.dev.vars.example) — bỏ qua
  // yêu cầu trả phí trên route /api/interpret/full để tiện phát triển.
  ENVIRONMENT?: string;
}

const isLocalEnv = (env: Env): boolean => env.ENVIRONMENT === 'local';

const DEFAULT_RATE_LIMIT_PER_HOUR = 5;

const SUPPORTED_LANGS: Lang[] = ['vi', 'en', 'jp'];

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

// 12 giờ chi (double-hours): giá trị 24h đại diện mà engine nhận.
const DOUBLE_HOUR_VALUES = new Set([23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]);

function json(data: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function isValidDate(year: number, month: number, day: number): boolean {
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function requireInt(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${name} phải là số nguyên`);
  }
  return value;
}

function validate(body: unknown): InterpretRequest {
  if (!body || typeof body !== 'object') throw new Error('Body phải là JSON object');
  const b = body as Record<string, unknown>;

  if (b.gender !== 'male' && b.gender !== 'female') {
    throw new Error('gender phải là "male" hoặc "female"');
  }

  const year = requireInt(b.year, 'year');
  const month = requireInt(b.month, 'month');
  const day = requireInt(b.day, 'day');
  const hour = requireInt(b.hour, 'hour');

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(`year phải trong khoảng ${MIN_YEAR}–${MAX_YEAR}`);
  }
  if (month < 1 || month > 12) {
    throw new Error('month phải từ 1–12');
  }
  if (day < 1 || day > 31) {
    throw new Error('day phải từ 1–31');
  }
  if (!isValidDate(year, month, day)) {
    throw new Error('Ngày sinh không hợp lệ');
  }
  if (!DOUBLE_HOUR_VALUES.has(hour)) {
    throw new Error('hour phải là một trong các giờ chi: 23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21');
  }

  const rawLang = b.lang as string | undefined;
  const lang: Lang = rawLang && SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'vi';
  return {
    gender: b.gender as Gender,
    year,
    month,
    day,
    hour,
    lang,
  };
}

// Xác thực token Turnstile với Cloudflare (miễn phí). Trả true nếu là người thật.
async function verifyTurnstile(token: string, remoteIp: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Fail-open: nếu không gọi được siteverify, chặn để an toàn hơn.
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = cors(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const isFullRoute = url.pathname === '/api/interpret/full';
    const isPreviewRoute = url.pathname === '/api/interpret';
    if (request.method !== 'POST' || (!isFullRoute && !isPreviewRoute)) {
      return json({ error: 'Không tìm thấy endpoint' }, 404, headers);
    }

    // Route trả phí: hiện chưa mở bán, chỉ dùng được khi chạy local (ENVIRONMENT=local)
    // để phát triển/kiểm thử. Sẽ gắn cổng thanh toán thật ở đây sau.
    if (isFullRoute && !isLocalEnv(env)) {
      return json(
        { error: 'Bản luận giải đầy đủ hiện chưa mở bán. Vui lòng quay lại sau.' },
        402,
        headers,
      );
    }

    // Lớp phòng vệ A: rate limit per-IP theo khung 1 giờ (Durable Object).
    // Mặc định 5 request/giờ/IP; đổi bằng secret RATE_LIMIT_PER_HOUR.
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limitPerHour = Number(env.RATE_LIMIT_PER_HOUR) || DEFAULT_RATE_LIMIT_PER_HOUR;
    let withinLimit = true;
    try {
      const doId = env.RATE_LIMITER_DO.idFromName('global');
      const stub = env.RATE_LIMITER_DO.get(doId);
      const rlRes = await stub.fetch(
        `https://ratelimit/?ip=${encodeURIComponent(clientIp)}&limit=${limitPerHour}`,
      );
      const rl = (await rlRes.json()) as { allowed?: boolean };
      withinLimit = rl.allowed !== false;
    } catch {
      // Fail-open: nếu DO lỗi, không chặn người dùng thật.
      withinLimit = true;
    }
    if (!withinLimit) {
      return json(
        { error: `Bạn đã đạt giới hạn ${limitPerHour} request/giờ. Vui lòng thử lại sau.` },
        429,
        headers,
      );
    }

    // Lớp phòng vệ B: Turnstile (xác minh con người). Chỉ bật khi có secret.
    if (env.TURNSTILE_SECRET) {
      const token = request.headers.get('X-Turnstile-Token') || '';
      const ok = await verifyTurnstile(token, clientIp, env.TURNSTILE_SECRET);
      if (!ok) {
        return json({ error: 'Xác minh con người thất bại. Vui lòng thử lại.' }, 403, headers);
      }
    }

    // Lớp phòng vệ C: validate chặt.
    let input: InterpretRequest;
    try {
      input = validate(await request.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bad request';
      return json({ error: msg }, 400, headers);
    }

    try {
      const chart = buildChart({
        gender: input.gender,
        birth: { year: input.year, month: input.month, day: input.day, hour: input.hour },
      });
      const result = interpret(chart, input.lang);
      const tier = isFullRoute ? 'full' : 'preview';
      const response: InterpretResponse = {
        lang: result.lang,
        tier,
        intro: result.intro,
        sections: tier === 'full' ? result.sections : toPreview(result.sections),
      };
      return json(response, 200, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi server';
      return json({ error: msg }, 500, headers);
    }
  },
};