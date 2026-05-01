import { getUnsupportedMatchMessage } from '../../src/lib/matchPage';
import { GameSummary } from '../../src/lib/aoe4/parser/gameSummaryParser';

function summaryWithCivilizations(civilizations: string[]): GameSummary {
  return {
    gameId: 1,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'Desert',
    leaderboard: 'rm_1v1',
    duration: 600,
    startedAt: 0,
    finishedAt: 600,
    players: civilizations.map((civilization, index) => ({
      profileId: index + 1,
      name: `Player ${index + 1}`,
      civilization,
      team: index + 1,
      apm: 0,
      result: index === 0 ? 'win' : 'loss',
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
    })),
  };
}

describe('getUnsupportedMatchMessage', () => {
  it('blocks Delhi games with a direct unsupported message', () => {
    expect(getUnsupportedMatchMessage(summaryWithCivilizations(['English', 'Delhi Sultanate'])))
      .toBe("This app doesn't work for Delhi yet.");
    expect(getUnsupportedMatchMessage(summaryWithCivilizations(['delhi_sultanate', 'French'])))
      .toBe("This app doesn't work for Delhi yet.");
  });

  it('allows non-Delhi games to continue through analysis', () => {
    expect(getUnsupportedMatchMessage(summaryWithCivilizations(['Knights Templar', 'Ayyubids']))).toBeNull();
  });
});
