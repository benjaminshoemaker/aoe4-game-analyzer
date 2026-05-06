import { generateNarrative } from '../../packages/aoe4-core/src/analysis/llmNarrative';
import { GameAnalysis } from '../../packages/aoe4-core/src/analysis/types';
import { DeployedResourcePools } from '../../packages/aoe4-core/src/analysis/resourcePool';

const emptyPools: DeployedResourcePools = {
  player1: {
    profileId: 1,
    playerName: 'Alice',
    civilization: 'English',
    deferredNotices: [],
    gatherRateSeries: [],
    series: [],
    peakTotal: 0,
  },
  player2: {
    profileId: 2,
    playerName: 'Bob',
    civilization: 'French',
    deferredNotices: [],
    gatherRateSeries: [],
    series: [],
    peakTotal: 0,
  },
  sharedYAxisMax: 1,
};

function makeAnalysis(overrides?: Partial<GameAnalysis>): GameAnalysis {
  return {
    gameId: 12345,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration: 900,
    winReason: 'elimination',
    player1: {
      name: 'Alice',
      civilization: 'English',
      result: 'win',
      apm: 90,
      scores: { total: 1000, military: 400, economy: 300, technology: 200, society: 100 },
      totalGathered: { food: 5000, gold: 3000, stone: 1000, wood: 4000, total: 13000 },
      totalSpent: { food: 4800, gold: 2900, stone: 900, wood: 3800, total: 12400 },
      kills: 20,
      deaths: 10,
      unitsProduced: 50,
    },
    player2: {
      name: 'Bob',
      civilization: 'French',
      result: 'loss',
      apm: 80,
      scores: { total: 800, military: 300, economy: 250, technology: 150, society: 100 },
      totalGathered: { food: 4500, gold: 2500, stone: 800, wood: 3500, total: 11300 },
      totalSpent: { food: 4300, gold: 2400, stone: 750, wood: 3300, total: 10750 },
      kills: 10,
      deaths: 20,
      unitsProduced: 40,
    },
    phases: { unifiedPhases: [], gameDuration: 900 },
    phaseComparisons: [],
    inflectionPoints: [],
    finalArmyMatchup: null,
    combatAdjustedMilitarySeries: [],
    deployedResourcePools: emptyPools,
    bottomLine: null,
    ...overrides,
  };
}

describe('generateNarrative', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('returns null when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateNarrative(makeAnalysis());
    expect(result).toBeNull();
  });

  it('returns null when ANTHROPIC_API_KEY is empty string', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const result = await generateNarrative(makeAnalysis());
    expect(result).toBeNull();
  });
});
