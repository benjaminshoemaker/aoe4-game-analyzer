import { NextResponse } from 'next/server';
import { canonicalMatchHref } from '../../../lib/urlCanonicalization';

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const rawMatchUrl = url.searchParams.get('url') ?? '';

  try {
    const canonical = canonicalMatchHref(rawMatchUrl);
    return NextResponse.redirect(new URL(canonical.href, request.url), { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid AoE4World URL';
    const homeUrl = new URL('/', request.url);
    homeUrl.searchParams.set('error', message);
    return NextResponse.redirect(homeUrl, { status: 303 });
  }
}
