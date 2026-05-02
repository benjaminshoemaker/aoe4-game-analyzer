import { renderHomeHtml } from '../lib/homePageHtml';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const errorText = url.searchParams.get('error');

  return new Response(renderHomeHtml(errorText), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': errorText
        ? 'no-store'
        : 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
