import { buildMatchHtml, parseMatchRouteParams } from '../../../../lib/matchPage';
import { embeddedAoeTokenCss } from '../../../../lib/designTokens';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  context: { params: Promise<{ profileSlug: string; gameId: string }> }
): Promise<Response> {
  try {
    const params = await context.params;
    const parsed = parseMatchRouteParams(params.profileSlug, params.gameId);
    const url = new URL(request.url);
    const sig = url.searchParams.get('sig') ?? undefined;
    const hoverDataUrl = new URL(`${url.pathname.replace(/\/$/, '')}/hover-data`, request.url);
    if (sig) {
      hoverDataUrl.searchParams.set('sig', sig);
    }
    const html = await buildMatchHtml({
      ...parsed,
      sig,
      hoverDataUrl: hoverDataUrl.pathname + hoverDataUrl.search,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
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
