import { escapeHtml } from '@aoe4/analyzer-core';
import { buildMatchHtml } from '../../../../lib/matchPage';
import { embeddedAoeTokenCss } from '../../../../lib/designTokens';
import { clearRenderedReportCacheForTests, getRenderedReportHtml } from '../../../../lib/renderedReportCache';
import { readMatchRouteRequest } from './routeResponses';
import type { MatchRouteContext } from './routeResponses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Browser-facing Cache-Control: always revalidate so a fresh deploy is
// picked up on the next navigation, even if the previous HTML is still in
// the user's local cache. The CDN keeps a longer TTL via CDN-Cache-Control
// below; Vercel auto-purges the edge cache on each new deployment, so the
// CDN copy is at most one deploy old.
const SIGNED_MATCH_CACHE_CONTROL = 'private, max-age=0, must-revalidate';
const PUBLIC_MATCH_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const PUBLIC_MATCH_CDN_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=604800';

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

function matchCacheControl(sig?: string): string {
  if (isDevelopment()) return 'no-store';
  return sig ? SIGNED_MATCH_CACHE_CONTROL : PUBLIC_MATCH_CACHE_CONTROL;
}

function matchCdnCacheControl(sig?: string): string | null {
  if (isDevelopment()) return null;
  // Signed responses are private; do not cache at the CDN.
  return sig ? null : PUBLIC_MATCH_CDN_CACHE_CONTROL;
}

export function clearMatchRouteCacheForTests(): void {
  clearRenderedReportCacheForTests();
}

function errorDocument(message: string, status: number): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Match Web</title>
  <style>
    :root {
      ${embeddedAoeTokenCss}
      --background: var(--aoe-color-bg);
      --surface: var(--aoe-color-surface);
      --border: var(--aoe-color-border);
      --text: var(--aoe-color-text);
      --muted: var(--aoe-color-muted);
    }
    body { margin: 0; padding: 28px; font-family: var(--aoe-font-display); background: var(--background); color: var(--text); }
    .panel { max-width: 760px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--aoe-radius-lg); padding: 18px; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 0; color: var(--muted); font-size: 14px; }
  </style>
</head>
<body>
  <section class="panel">
    <h1>Unable to load match (${status})</h1>
    <p>${escapeHtml(message)}</p>
  </section>
</body>
</html>`;
}

function errorStatus(error: unknown): number {
  const status = (error as { status?: unknown }).status;
  if (typeof status !== 'number' || !Number.isInteger(status)) return 500;
  return status >= 400 && status <= 599 ? status : 500;
}

export async function GET(
  request: Request,
  context: MatchRouteContext
): Promise<Response> {
  try {
    const { parsed, sig } = await readMatchRouteRequest(request, context);
    const html = await getRenderedReportHtml(
      {
        profileSlug: parsed.profileSlug,
        gameId: parsed.gameId,
        sig,
      },
      () => buildMatchHtml({ ...parsed, sig })
    );

    const headers: Record<string, string> = {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': matchCacheControl(sig),
    };
    const cdnCacheControl = matchCdnCacheControl(sig);
    if (cdnCacheControl) {
      headers['cdn-cache-control'] = cdnCacheControl;
    }

    return new Response(html, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = errorStatus(error);
    const html = errorDocument(message, status);
    return new Response(html, {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}
