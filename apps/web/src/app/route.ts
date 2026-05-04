import { renderHomeHtml } from '../lib/homePageHtml';

// Browser-facing Cache-Control: always revalidate so a fresh deploy is
// picked up on the next navigation. CDN keeps a longer TTL via
// CDN-Cache-Control; Vercel auto-purges the edge cache on each deploy.
const HOME_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const HOME_CDN_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const errorText = url.searchParams.get('error');

  const skipCdn = Boolean(errorText) || isDevelopment();
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': errorText || isDevelopment() ? 'no-store' : HOME_CACHE_CONTROL,
  };
  if (!skipCdn) {
    headers['cdn-cache-control'] = HOME_CDN_CACHE_CONTROL;
  }

  return new Response(renderHomeHtml(errorText), {
    status: 200,
    headers,
  });
}
