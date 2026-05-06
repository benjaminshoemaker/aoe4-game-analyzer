const mockUnstableCache = jest.fn((
  callback: () => Promise<string>,
  _keyParts?: string[],
  _options?: { revalidate?: number | false; tags?: string[] }
) => callback);

jest.mock('next/cache', () => ({
  unstable_cache: (
    callback: () => Promise<string>,
    keyParts?: string[],
    options?: { revalidate?: number | false; tags?: string[] }
  ) => mockUnstableCache(callback, keyParts, options),
}));

const buildMatchHtml = jest.fn();
const parseMatchRouteParams = jest.fn();

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchHtml: (...args: unknown[]) => buildMatchHtml(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';

describe('non-1:1 unsupported match route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnstableCache.mockImplementation((callback: () => Promise<string>) => callback);
    clearMatchRouteCacheForTests();
  });

  it('serves the helpful unsupported page for imported non-1:1 matches', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 231103172 });
    buildMatchHtml.mockResolvedValue('<!doctype html><h1>Unsupported match type</h1><p>This tool currently supports 1:1 matches only. The imported AoE4World match appears to have 4 players across 2 teams, so team games and free-for-all games are not handled yet.</p><p>Please paste a 1:1 AoE4World match URL.</p>');

    const response = await GET(new Request('http://localhost/matches/my-slug/231103172?sig=abc123'), {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '231103172',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('Unsupported match type');
    expect(body).toContain('This tool currently supports 1:1 matches only.');
    expect(body).toContain('4 players across 2 teams');
    expect(body).toContain('Please paste a 1:1 AoE4World match URL.');
    expect(buildMatchHtml).toHaveBeenCalledWith({
      profileSlug: 'my-slug',
      gameId: 231103172,
      sig: 'abc123',
    });
  });
});
