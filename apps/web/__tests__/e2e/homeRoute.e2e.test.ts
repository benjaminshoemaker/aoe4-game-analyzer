import { GET } from '../../src/app/route';

describe('home route e2e', () => {
  it('renders validation errors without adding client-side route assets', async () => {
    const response = await GET(new Request('http://localhost/?error=Invalid%20AoE4World%20URL'));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Invalid AoE4World URL');
    expect(body).toContain('AoE4World match URL');
    expect(body).not.toContain('/_next/static/chunks/');
    expect(body).not.toContain('self.__next_f');
  });
});
