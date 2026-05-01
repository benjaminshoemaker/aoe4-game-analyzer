import { buildMatchHoverPayload, parseMatchRouteParams } from '../../../../../lib/matchPage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ profileSlug: string; gameId: string }> }
): Promise<Response> {
  try {
    const params = await context.params;
    const parsed = parseMatchRouteParams(params.profileSlug, params.gameId);
    const url = new URL(request.url);
    const sig = url.searchParams.get('sig') ?? undefined;
    const hoverSnapshots = await buildMatchHoverPayload({ ...parsed, sig });

    return Response.json(
      { hoverSnapshots },
      {
        status: 200,
        headers: {
          'cache-control': 'no-store',
        },
      }
    );
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
