import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/win-probability-data/route';

const buildMatchWinProbabilityData = jest.fn();
const parseMatchRouteParams = jest.fn();

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchWinProbabilityData: (...args: unknown[]) => buildMatchWinProbabilityData(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

describe('match win probability data route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns model-ready examples and preserves sig plus match Elo context', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchWinProbabilityData.mockResolvedValue({
      metadata: {
        modelStatus: 'untrained',
        featureSchemaVersion: 'wp-state-v1',
        exampleCount: 2,
      },
      examples: [
        {
          timestampSeconds: 0,
          perspective: 'you',
          matchSkillBracket: { label: '900-999' },
        },
        {
          timestampSeconds: 0,
          perspective: 'opponent',
          matchSkillBracket: { label: '900-999' },
        },
      ],
    });

    const request = new Request('http://localhost/matches/my-slug/230143339/win-probability-data?sig=abc123&matchElo=972');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });

    await expect(response.json()).resolves.toEqual({
      metadata: {
        modelStatus: 'untrained',
        featureSchemaVersion: 'wp-state-v1',
        exampleCount: 2,
      },
      examples: [
        {
          timestampSeconds: 0,
          perspective: 'you',
          matchSkillBracket: { label: '900-999' },
        },
        {
          timestampSeconds: 0,
          perspective: 'opponent',
          matchSkillBracket: { label: '900-999' },
        },
      ],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(buildMatchWinProbabilityData).toHaveBeenCalledWith({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
      matchAverageElo: 972,
    });
  });
});
