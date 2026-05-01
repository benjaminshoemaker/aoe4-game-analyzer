import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/hover-data/route';

const buildMatchHoverPayload = jest.fn();
const parseMatchRouteParams = jest.fn();

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchHoverPayload: (...args: unknown[]) => buildMatchHoverPayload(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

describe('match hover data route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns compact hover data JSON and preserves private sig', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHoverPayload.mockResolvedValue([{ timestamp: 0, timeLabel: '0:00' }]);

    const request = new Request('http://localhost/matches/my-slug/230143339/hover-data?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });

    await expect(response.json()).resolves.toEqual({
      hoverSnapshots: [{ timestamp: 0, timeLabel: '0:00' }],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(buildMatchHoverPayload).toHaveBeenCalledWith({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
    });
  });
});
