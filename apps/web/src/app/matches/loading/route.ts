import { NextResponse } from 'next/server';
import { renderMatchLoadingHtml, safeMatchLoadingTarget } from '../../../lib/matchLoadingPageHtml';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const target = safeMatchLoadingTarget(url.searchParams.get('to'));

  if (!target) {
    const homeUrl = new URL('/', request.url);
    homeUrl.searchParams.set('error', 'Invalid match loading target');
    return NextResponse.redirect(homeUrl, { status: 303 });
  }

  return new Response(renderMatchLoadingHtml(target), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
