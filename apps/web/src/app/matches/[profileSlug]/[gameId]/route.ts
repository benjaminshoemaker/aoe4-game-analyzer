import { buildMatchHtml } from '../../../../lib/matchPage';
import { embeddedAoeTokenCss } from '../../../../lib/designTokens';
import { readMatchRouteRequest } from './routeResponses';
import type { MatchRouteContext } from './routeResponses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MATCH_HTML_CACHE_TTL_MS = 5 * 60 * 1000;
const MATCH_HTML_CACHE_LIMIT = 25;
const SIGNED_MATCH_CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=3600';
const PUBLIC_MATCH_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

type MatchHtmlCacheEntry = {
  html: string;
  expiresAt: number;
};

const matchHtmlCache = new Map<string, MatchHtmlCacheEntry>();

function matchCacheKey(profileSlug: string, gameId: number, sig?: string): string {
  return `${profileSlug}/${gameId}?sig=${sig ?? ''}`;
}

function getCachedMatchHtml(cacheKey: string, now: number): string | null {
  const cached = matchHtmlCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    matchHtmlCache.delete(cacheKey);
    return null;
  }
  matchHtmlCache.delete(cacheKey);
  matchHtmlCache.set(cacheKey, cached);
  return cached.html;
}

function setCachedMatchHtml(cacheKey: string, html: string, now: number): void {
  matchHtmlCache.set(cacheKey, {
    html,
    expiresAt: now + MATCH_HTML_CACHE_TTL_MS,
  });

  while (matchHtmlCache.size > MATCH_HTML_CACHE_LIMIT) {
    const oldestKey = matchHtmlCache.keys().next().value;
    if (!oldestKey) break;
    matchHtmlCache.delete(oldestKey);
  }
}

function matchCacheControl(sig?: string): string {
  return sig ? SIGNED_MATCH_CACHE_CONTROL : PUBLIC_MATCH_CACHE_CONTROL;
}

export function clearMatchRouteCacheForTests(): void {
  matchHtmlCache.clear();
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
    <p>${message.replace(/[<>&]/g, '')}</p>
  </section>
</body>
</html>`;
}

export async function GET(
  request: Request,
  context: MatchRouteContext
): Promise<Response> {
  try {
    const { parsed, sig } = await readMatchRouteRequest(request, context);
    const now = Date.now();
    const cacheKey = matchCacheKey(parsed.profileSlug, parsed.gameId, sig);
    const cachedHtml = getCachedMatchHtml(cacheKey, now);
    const html = cachedHtml ?? await buildMatchHtml({ ...parsed, sig });
    if (!cachedHtml) {
      setCachedMatchHtml(cacheKey, html, now);
    }

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': matchCacheControl(sig),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const html = errorDocument(message, 500);
    return new Response(html, {
      status: 500,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}
