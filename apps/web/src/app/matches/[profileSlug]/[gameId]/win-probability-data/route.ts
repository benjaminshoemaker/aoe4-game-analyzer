import { buildMatchWinProbabilityData } from '../../../../../lib/matchPage';
import {
  jsonNoStoreError,
  jsonNoStoreResponse,
  readMatchRouteRequest,
  parseMatchAverageElo,
} from '../routeResponses';
import type { MatchRouteContext } from '../routeResponses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: MatchRouteContext
): Promise<Response> {
  try {
    const { parsed, sig, url } = await readMatchRouteRequest(request, context);
    const matchAverageElo = parseMatchAverageElo(url.searchParams.get('matchElo'));
    const payload = await buildMatchWinProbabilityData({
      ...parsed,
      sig,
      matchAverageElo,
    });

    return jsonNoStoreResponse(payload, { status: 200 });
  } catch (error) {
    return jsonNoStoreError(error);
  }
}
