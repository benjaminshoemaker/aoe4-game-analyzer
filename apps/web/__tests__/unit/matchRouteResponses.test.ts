import {
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
});
