import { buildMatchWinProbabilityData, parseMatchRouteParams } from '../../../../../lib/matchPage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseMatchAverageElo(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ profileSlug: string; gameId: string }> }
): Promise<Response> {
  try {
    const params = await context.params;
    const parsed = parseMatchRouteParams(params.profileSlug, params.gameId);
    const url = new URL(request.url);
    const sig = url.searchParams.get('sig') ?? undefined;
    const matchAverageElo = parseMatchAverageElo(url.searchParams.get('matchElo'));
    const payload = await buildMatchWinProbabilityData({
      ...parsed,
      sig,
      matchAverageElo,
    });

    return Response.json(payload, {
      status: 200,
      headers: {
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: message },
      {
        status: 500,
        headers: {
          'cache-control': 'no-store',
        },
      }
    );
  }
}
