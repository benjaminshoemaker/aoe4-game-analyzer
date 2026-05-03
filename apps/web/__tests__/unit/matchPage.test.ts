const mockFetchGameSummaryFromApi = jest.fn();
const mockAnalyzeGame = jest.fn();
const mockBuildPostMatchViewModel = jest.fn();
const mockRenderPostMatchHtml = jest.fn();

jest.mock('@aoe4/analyzer-core/parser/gameSummaryParser', () => ({
  fetchGameSummaryFromApi: (...args: unknown[]) => mockFetchGameSummaryFromApi(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/gameAnalysis', () => ({
  analyzeGame: (...args: unknown[]) => mockAnalyzeGame(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/postMatchViewModel', () => ({
  buildPostMatchViewModel: (...args: unknown[]) => mockBuildPostMatchViewModel(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/winProbability', () => ({
  WIN_PROBABILITY_FEATURE_SCHEMA_VERSION: 1,
  buildWinProbabilityExamples: jest.fn(() => []),
}));

jest.mock('@aoe4/analyzer-core/formatters/postMatchHtml', () => ({
  buildPostMatchHoverPayload: jest.fn(() => []),
  renderPostMatchHtml: (...args: unknown[]) => mockRenderPostMatchHtml(...args),
}));

jest.mock('@aoe4/analyzer-core/formatters/sharedFormatters', () => ({
  escapeHtml: (value: string) => value,
}));

import { buildMatchHtml } from '../../src/lib/matchPage';
import type { GameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';

function makeSummary(): GameSummary {
  return {
    gameId: 230143339,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'Desert',
    leaderboard: 'rm_1v1',
    duration: 600,
    startedAt: 0,
    finishedAt: 600,
    players: [
      {
        profileId: 1,
        name: 'Player One',
        civilization: 'English',
        team: 1,
        apm: 0,
        result: 'win',
        _stats: {
          ekills: 0,
          edeaths: 0,
          sqprod: 0,
          sqlost: 0,
          bprod: 0,
          upg: 0,
          totalcmds: 0,
        },
        actions: {},
        scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
        totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        resources: {
          timestamps: [0, 600],
          food: [0, 0],
          gold: [0, 0],
          stone: [0, 0],
          wood: [0, 0],
          foodPerMin: [0, 0],
          goldPerMin: [0, 0],
          stonePerMin: [0, 0],
          woodPerMin: [0, 0],
          total: [0, 0],
          military: [0, 0],
          economy: [0, 0],
          technology: [0, 0],
          society: [0, 0],
        },
        buildOrder: [],
      },
      {
        profileId: 2,
        name: 'Player Two',
        civilization: 'French',
        team: 2,
        apm: 0,
        result: 'loss',
        _stats: {
          ekills: 0,
          edeaths: 0,
          sqprod: 0,
          sqlost: 0,
          bprod: 0,
          upg: 0,
          totalcmds: 0,
        },
        actions: {},
        scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
        totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        resources: {
          timestamps: [0, 600],
          food: [0, 0],
          gold: [0, 0],
          stone: [0, 0],
          wood: [0, 0],
          foodPerMin: [0, 0],
          goldPerMin: [0, 0],
          stonePerMin: [0, 0],
          woodPerMin: [0, 0],
          total: [0, 0],
          military: [0, 0],
          economy: [0, 0],
          technology: [0, 0],
          society: [0, 0],
        },
        buildOrder: [],
      },
    ],
  };
}

describe('buildMatchHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchGameSummaryFromApi.mockResolvedValue(makeSummary());
    mockAnalyzeGame.mockResolvedValue({ gameId: 230143339 });
    mockBuildPostMatchViewModel.mockReturnValue({ header: {} });
    mockRenderPostMatchHtml.mockReturnValue('<!doctype html><html><body>match</body></html>');
  });

  it('skips combat-adjusted military analysis for the web MVP render path', async () => {
    await expect(buildMatchHtml({
      profileSlug: '8097972-RepleteCactus',
      gameId: 230143339,
      sig: 'abc123',
    })).resolves.toContain('match');

    expect(mockAnalyzeGame).toHaveBeenCalledWith('8097972-RepleteCactus', 230143339, expect.objectContaining({
      sig: 'abc123',
      skipNarrative: true,
      includeCombatAdjustedMilitary: false,
      summary: expect.objectContaining({ gameId: 230143339 }),
    }));
  });
});
