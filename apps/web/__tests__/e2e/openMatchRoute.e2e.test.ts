import { GET } from '../../src/app/matches/open/route';

describe('open match route e2e', () => {
  it('redirects valid AoE4World URLs to the loading interstitial before the canonical match route', () => {
    const request = new Request('http://localhost/matches/open?url=https%3A%2F%2Faoe4world.com%2Fplayers%2Fmy-slug%2Fgames%2F230143339%3Fsig%3Dabc123');
    const response = GET(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/matches/loading?to=%2Fmatches%2Fmy-slug%2F230143339%3Fsig%3Dabc123');
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
