import { GET } from '../../src/app/matches/open/route';
import { GET as GET_LOADING } from '../../src/app/matches/loading/route';

describe('open match route e2e', () => {
  it('redirects valid AoE4World URLs to an automatic loading interstitial before the canonical match route', async () => {
    const request = new Request('http://localhost/matches/open?url=https%3A%2F%2Faoe4world.com%2Fplayers%2Fmy-slug%2Fgames%2F230143339%3Fsig%3Dabc123');
    const response = GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toBe('http://localhost/matches/loading?to=%2Fmatches%2Fmy-slug%2F230143339%3Fsig%3Dabc123');

    const loadingResponse = GET_LOADING(new Request(location ?? 'http://localhost/'));
    const body = await loadingResponse.text();

    expect(loadingResponse.status).toBe(200);
    expect(body).toContain('Opening automatically');
    expect(body).not.toContain('<a class="primary" href=');
    expect(body).not.toContain('>Open match report<');
  });

  it('redirects invalid input back to the home page with an error', () => {
    const request = new Request('http://localhost/matches/open?url=not-a-match');
    const response = GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(303);
    expect(location).toContain('http://localhost/?error=');
    expect(decodeURIComponent(location ?? '')).toContain('AoE4World');
  });
});
