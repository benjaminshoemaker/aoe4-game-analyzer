import { parseMatchRouteParams } from '../../../../lib/matchPage';

export type MatchRouteContext = {
  params: Promise<{ profileSlug: string; gameId: string }>;
};

export async function readMatchRouteRequest(
  request: Request,
  context: MatchRouteContext
) {
  const params = await context.params;
  const parsed = parseMatchRouteParams(params.profileSlug, params.gameId);
  const url = new URL(request.url);
  return {
    params,
    parsed,
    url,
    sig: url.searchParams.get('sig') ?? undefined,
  };
}

export function requestSig(request: Request): string | undefined {
  return new URL(request.url).searchParams.get('sig') ?? undefined;
}

export function parseMatchAverageElo(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function jsonNoStoreResponse(
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set('cache-control', 'no-store');

  return Response.json(body, {
    ...init,
    headers,
  });
}

export function jsonNoStoreError(error: unknown, status = 500): Response {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return jsonNoStoreResponse({ error: message }, { status });
}
