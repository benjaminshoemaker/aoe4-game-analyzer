import { buildMatchHoverPayload } from '../../../../../lib/matchPage';
import { jsonNoStoreError, jsonNoStoreResponse, readMatchRouteRequest } from '../routeResponses';
import type { MatchRouteContext } from '../routeResponses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: MatchRouteContext
): Promise<Response> {
  try {
    const { parsed, sig } = await readMatchRouteRequest(request, context);
    const hoverSnapshots = await buildMatchHoverPayload({ ...parsed, sig });

    return jsonNoStoreResponse({ hoverSnapshots }, { status: 200 });
  } catch (error) {
    return jsonNoStoreError(error);
  }
}
