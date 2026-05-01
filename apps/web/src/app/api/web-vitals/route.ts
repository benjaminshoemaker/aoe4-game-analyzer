export const runtime = 'nodejs';

interface WebVitalPayload {
  name?: unknown;
  value?: unknown;
  path?: unknown;
  ts?: unknown;
}

const allowedMetricNames = new Set(['LCP', 'CLS', 'INP']);

export async function POST(request: Request): Promise<Response> {
  let payload: WebVitalPayload;
  try {
    payload = await request.json();
  } catch (_error) {
    return new Response(null, { status: 400 });
  }

  if (
    typeof payload.name !== 'string' ||
    !allowedMetricNames.has(payload.name) ||
    typeof payload.value !== 'number' ||
    !Number.isFinite(payload.value)
  ) {
    return new Response(null, { status: 400 });
  }

  console.info('[web-vitals]', JSON.stringify({
    name: payload.name,
    value: payload.value,
    path: typeof payload.path === 'string' ? payload.path : '/',
    ts: typeof payload.ts === 'number' ? payload.ts : Date.now(),
  }));

  return new Response(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
