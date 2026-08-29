import { describe, expect, it, vi } from 'vitest';
import type { InterpretationSection, InterpretResponse } from '../src/types';

// interpret() is mocked so these tests exercise the route's gating/tier logic
// (validation, rate limit, Turnstile, /full vs /preview, toPreview wiring)
// against a small, fully-known fixture instead of the real luận giải
// dictionary — toPreview() itself (real, not mocked) already has its own
// dedicated coverage in toPreview.test.ts.
const fixtureSections: InterpretationSection[] = [
  {
    key: 'palaces',
    title: 'Luận theo cung',
    items: [
      { name: 'Mệnh', isMenh: true, isThan: false, palaceText: 'Full Mệnh text', starBlocks: [] },
      { name: 'Huynh đệ', isMenh: false, isThan: false, palaceText: 'Paid content', starBlocks: [] },
    ],
  },
];

vi.mock('../src/interpreter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/interpreter')>();
  return {
    ...actual, // keep the real toPreview()
    interpret: vi.fn(() => ({
      lang: 'vi',
      intro: { title: 'Lá số', subtitle: 'Sub', empty: 'Empty' },
      sections: fixtureSections,
    })),
  };
});

const { default: worker } = await import('../src/index');
type Env = import('../src/index').Env;

const VALID_BODY = { gender: 'male', year: 1990, month: 5, day: 20, hour: 7 };

function makeDoStub(allowed = true) {
  return {
    idFromName: vi.fn(() => ({ toString: () => 'global' })),
    get: vi.fn(() => ({
      fetch: vi.fn(async () => new Response(JSON.stringify({ allowed }))),
    })),
  };
}

function makeEnv(overrides: Partial<Env> & { rateLimitAllowed?: boolean } = {}): Env {
  const { rateLimitAllowed = true, ...rest } = overrides;
  return {
    RATE_LIMITER_DO: makeDoStub(rateLimitAllowed) as unknown as Env['RATE_LIMITER_DO'],
    ENVIRONMENT: 'production',
    ...rest,
  };
}

function req(path: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('POST /api/interpret (preview)', () => {
  it('returns tier "preview" with the real toPreview() applied to the interpreter output', async () => {
    const res = await worker.fetch(req('/api/interpret', VALID_BODY), makeEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as InterpretResponse;
    expect(body.tier).toBe('preview');
    const palaces = body.sections.find((s: InterpretationSection) => s.key === 'palaces')!;
    expect(palaces.locked).toBe(true);
    expect(palaces.lockedCount).toBe(1);
    // Mệnh stays fully visible even in preview.
    expect(palaces.items.find((it: any) => it.name === 'Mệnh')!.palaceText).toBe('Full Mệnh text');
    // Any other palace's text is withheld.
    expect(palaces.items.find((it: any) => it.name === 'Huynh đệ')!.palaceText).toBeNull();
  });

  it('rejects invalid gender with 400', async () => {
    const res = await worker.fetch(req('/api/interpret', { ...VALID_BODY, gender: 'x' }), makeEnv());
    expect(res.status).toBe(400);
  });

  it('rejects an impossible calendar date with 400', async () => {
    const res = await worker.fetch(req('/api/interpret', { ...VALID_BODY, month: 2, day: 30 }), makeEnv());
    expect(res.status).toBe(400);
  });

  it('rejects an hour that is not a double-hour value with 400', async () => {
    const res = await worker.fetch(req('/api/interpret', { ...VALID_BODY, hour: 2 }), makeEnv());
    expect(res.status).toBe(400);
  });

  it('returns 429 once the per-IP rate limit is exceeded', async () => {
    const res = await worker.fetch(req('/api/interpret', VALID_BODY), makeEnv({ rateLimitAllowed: false }));
    expect(res.status).toBe(429);
  });

  it('returns 403 when Turnstile is configured and the token fails verification', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false })),
    );
    const res = await worker.fetch(req('/api/interpret', VALID_BODY), makeEnv({ TURNSTILE_SECRET: 'secret' }));
    expect(res.status).toBe(403);
    fetchSpy.mockRestore();
  });

  it('passes through when Turnstile verification succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true })),
    );
    const res = await worker.fetch(
      req('/api/interpret', VALID_BODY, { 'X-Turnstile-Token': 'tok' }),
      makeEnv({ TURNSTILE_SECRET: 'secret' }),
    );
    expect(res.status).toBe(200);
    fetchSpy.mockRestore();
  });

  it('returns 404 for GET requests', async () => {
    const res = await worker.fetch(
      new Request('https://worker.test/api/interpret', { method: 'GET' }),
      makeEnv(),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown path', async () => {
    const res = await worker.fetch(req('/api/nope', VALID_BODY), makeEnv());
    expect(res.status).toBe(404);
  });

  it('answers CORS preflight with 204', async () => {
    const res = await worker.fetch(
      new Request('https://worker.test/api/interpret', { method: 'OPTIONS' }),
      makeEnv(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('POST /api/interpret/full', () => {
  it('is gated behind 402 outside the local environment', async () => {
    const res = await worker.fetch(req('/api/interpret/full', VALID_BODY), makeEnv({ ENVIRONMENT: 'production' }));
    expect(res.status).toBe(402);
  });

  it('is gated behind 402 when ENVIRONMENT is unset', async () => {
    const env = makeEnv();
    env.ENVIRONMENT = undefined;
    const res = await worker.fetch(req('/api/interpret/full', VALID_BODY), env);
    expect(res.status).toBe(402);
  });

  it('returns tier "full" with sections untouched by toPreview() when ENVIRONMENT=local', async () => {
    const res = await worker.fetch(req('/api/interpret/full', VALID_BODY), makeEnv({ ENVIRONMENT: 'local' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as InterpretResponse;
    expect(body.tier).toBe('full');
    const palaces = body.sections.find((s: InterpretationSection) => s.key === 'palaces')!;
    expect(palaces.locked).toBeUndefined();
    expect(palaces.items.find((it: any) => it.name === 'Huynh đệ')!.palaceText).toBe('Paid content');
  });

  it('still enforces rate limiting when ENVIRONMENT=local', async () => {
    const res = await worker.fetch(
      req('/api/interpret/full', VALID_BODY),
      makeEnv({ ENVIRONMENT: 'local', rateLimitAllowed: false }),
    );
    expect(res.status).toBe(429);
  });
});
