import { GET } from '../../src/app/route';

describe('home route integration', () => {
  it('returns cacheable raw HTML for the default form page', async () => {
    const response = await GET(new Request('http://localhost/'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toContain('public');
    expect(body).toContain('<form method="get" action="/matches/open"');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');
  });
});
