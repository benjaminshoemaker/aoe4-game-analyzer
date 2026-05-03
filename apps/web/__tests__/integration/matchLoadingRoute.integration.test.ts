import { GET } from '../../src/app/matches/loading/route';

describe('match loading route integration', () => {
  it('returns a no-store HTML loading page for a safe match target', async () => {
    const request = new Request('http://localhost/matches/loading?to=%2Fmatches%2Fmy-slug%2F230143339%3Fsig%3Dabc123');
    const response = await GET(request);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Building match report');
    expect(body).toContain('aria-label="Match report preview skeleton"');
    expect(body).toContain('/matches/my-slug/230143339?sig=abc123');
    expect(body).not.toContain('/_next/static/chunks/');
  });

  it('redirects unsafe targets back to the home page with an error', async () => {
    const request = new Request('http://localhost/matches/loading?to=https%3A%2F%2Fevil.example%2Fmatches%2Fmy-slug%2F230143339');
    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('http://localhost/?error=');
    expect(new URL(location ?? '').searchParams.get('error')).toBe('Invalid match loading target');
  });
});
