import {
  buildMatchRouteErrorDocument,
  jsonNoStoreError,
  jsonNoStoreResponse,
  parseMatchAverageElo,
  requestSig,
} from '../../src/app/matches/[profileSlug]/[gameId]/routeResponses';

describe('match route response helpers', () => {
  it('builds no-store JSON success responses', async () => {
    const response = jsonNoStoreResponse({ ok: true }, { status: 201 });

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('normalizes error payloads without losing error messages', async () => {
    const response = jsonNoStoreError(new Error('broken route'));

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ error: 'broken route' });
  });

  it('parses optional sig and match Elo query values', () => {
    const request = new Request('http://localhost/matches/me/123?sig=abc123&matchElo=972');

    expect(requestSig(request)).toBe('abc123');
    expect(requestSig(new Request('http://localhost/matches/me/123'))).toBeUndefined();
    expect(parseMatchAverageElo(new URL(request.url).searchParams.get('matchElo'))).toBe(972);
    expect(parseMatchAverageElo('')).toBeNull();
    expect(parseMatchAverageElo('not-a-number')).toBeNull();
  });

  it('builds an actionable incident page for AoE4World rate limiting', () => {
    const html = buildMatchRouteErrorDocument('AoE4World rate limited the summary request', 429);

    expect(html).toContain('Match analysis is temporarily delayed');
    expect(html).toContain('AoE4World is rate-limiting match summary requests right now.');
    expect(html).toContain('This match link is valid');
    expect(html).toContain('Match URL parsed');
    expect(html).toContain('Summary request rate-limited');
    expect(html).toContain('Cached report unavailable');
    expect(html).toContain('Come back to this exact URL');
    expect(html).toContain('Try again');
    expect(html).toContain('Copy link');
    expect(html).toContain('View sample report');
    expect(html).toContain('/matches/8139502/229727104');
    expect(html).toContain('Technical detail');
    expect(html).toContain('AoE4World rate limited the summary request');
    expect(html).not.toContain('Unable to load match (429)');
  });

  it('keeps generic errors compact and escapes route error messages', () => {
    const html = buildMatchRouteErrorDocument('bad <game> id', 500);

    expect(html).toContain('Unable to load match (500)');
    expect(html).toContain('bad &lt;game&gt; id');
    expect(html).not.toContain('bad <game> id');
    expect(html).not.toContain('Match analysis is temporarily delayed');
  });
});
