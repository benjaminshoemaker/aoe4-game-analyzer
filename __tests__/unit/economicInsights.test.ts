import { generateGameEconomicInsights, generatePhaseEconomicInsights } from '../../packages/aoe4-core/src/analysis/economicInsights';
import { GameAnalysis, PhaseComparison, PlayerAnalysisSummary, IncomeSnapshot, ResourceAllocation } from '../../packages/aoe4-core/src/analysis/types';
import { DeployedResourcePools } from '../../packages/aoe4-core/src/analysis/resourcePool';
import { ResourceTotals, ScoreBreakdown } from '../../packages/aoe4-core/src/parser/gameSummaryParser';

const emptyPools: DeployedResourcePools = {
  player1: {
    profileId: 1,
    playerName: 'Winner',
    civilization: 'English',
    deferredNotices: [],
    gatherRateSeries: [],
    series: [],
    peakTotal: 0,
  },
  player2: {
    profileId: 2,
    playerName: 'Loser',
    civilization: 'English',
    deferredNotices: [],
    gatherRateSeries: [],
    series: [],
    peakTotal: 0,
  },
  sharedYAxisMax: 1,
};

function makeResources(total: number, overrides?: Partial<ResourceTotals>): ResourceTotals {
  return { food: Math.round(total * 0.4), wood: Math.round(total * 0.3), gold: Math.round(total * 0.2), stone: Math.round(total * 0.1), total, ...overrides };
}

function makeScores(total: number): ScoreBreakdown {
  return { total, military: Math.round(total * 0.4), economy: Math.round(total * 0.3), technology: Math.round(total * 0.2), society: Math.round(total * 0.1) };
}

function makeIncome(total: number): IncomeSnapshot {
  return {
    foodPerMin: Math.round(total * 0.35),
    woodPerMin: Math.round(total * 0.3),
    goldPerMin: Math.round(total * 0.25),
    stonePerMin: total - Math.round(total * 0.35) - Math.round(total * 0.3) - Math.round(total * 0.25),
  };
}

function makeAllocation(milPct: number): ResourceAllocation {
  const remaining = 100 - milPct;
  return {
    militaryPercent: milPct,
    economyPercent: remaining * 0.5,
    technologyPercent: remaining * 0.3,
    buildingPercent: remaining * 0.2,
  };
}

function makePlayer(name: string, result: 'win' | 'loss', gathered: number, spent: number): PlayerAnalysisSummary {
  return {
    name,
    civilization: 'English',
    result,
    apm: 80,
    scores: makeScores(result === 'win' ? 1000 : 800),
    totalGathered: makeResources(gathered),
    totalSpent: makeResources(spent),
    kills: 20,
    deaths: 10,
    unitsProduced: 50,
  };
}

function makePhaseComparison(overrides: Partial<PhaseComparison> & { phase: PhaseComparison['phase'] }): PhaseComparison {
  return {
    ageUpDelta: { player1Time: null, player2Time: null, deltaSeconds: null },
    player1Allocation: makeAllocation(0),
    player2Allocation: makeAllocation(0),
    player1IncomeAtEnd: makeIncome(500),
    player2IncomeAtEnd: makeIncome(500),
    scoreDeltaAtStart: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    scoreDeltaAtEnd: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    player1Units: [],
    player2Units: [],
    inflections: [],
    armyMatchup: null,
    ...overrides,
  };
}

function makeAnalysis(overrides?: Partial<GameAnalysis>): GameAnalysis {
  return {
    gameId: 123456,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration: 900,
    winReason: 'elimination',
    player1: makePlayer('Winner', 'win', 13000, 12400),
    player2: makePlayer('Loser', 'loss', 11300, 10750),
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

describe('generateGameEconomicInsights', () => {
  it('reports resource gathering gap when winner gathered >15% more', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 13000, 12400),
      player2: makePlayer('Loser', 'loss', 11300, 10750),
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights[0]).toMatch(/Winner out-gathered Loser by 15%/);
    expect(insights[0]).toContain('13000 vs 11300');
  });

  it('reports when loser gathered more resources', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 10000, 9500),
      player2: makePlayer('Loser', 'loss', 11000, 10500),
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights[0]).toMatch(/Loser gathered more total resources but Winner spent them more effectively/);
  });

  it('skips gathering insight when gap is <15%', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 10000, 9500),
      player2: makePlayer('Loser', 'loss', 9500, 9000),
    });
    const insights = generateGameEconomicInsights(analysis);
    // 10000/9500 = 1.053, under 15%
    expect(insights.every(i => !i.includes('out-gathered'))).toBe(true);
  });

  it('reports spending efficiency difference >10pp', () => {
    // P1 spends 95%, P2 spends 80%
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 10000, 9500),
      player2: makePlayer('Loser', 'loss', 10000, 8000),
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.some(i => i.includes('spent') && i.includes('95%') && i.includes('80%'))).toBe(true);
  });

  it('reports "floating resources" when winner spent less but won', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 10000, 7500),
      player2: makePlayer('Loser', 'loss', 10000, 9000),
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.some(i => i.includes('floating more resources'))).toBe(true);
  });

  it('reports income trajectory when winner always ahead', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(600),
        player2IncomeAtEnd: makeIncome(500),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(800),
        player2IncomeAtEnd: makeIncome(650),
      }),
    ];
    const analysis = makeAnalysis({ phaseComparisons: comparisons });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.some(i => i.includes('maintained higher income'))).toBe(true);
  });

  it('reports income lead flip', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(400),
        player2IncomeAtEnd: makeIncome(600),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(800),
        player2IncomeAtEnd: makeIncome(650),
      }),
    ];
    const analysis = makeAnalysis({ phaseComparisons: comparisons });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.some(i => i.includes('overtook') && i.includes('Feudal'))).toBe(true);
  });

  it('reports military investment imbalance', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1Allocation: makeAllocation(5),
        player2Allocation: makeAllocation(40),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1Allocation: makeAllocation(10),
        player2Allocation: makeAllocation(50),
      }),
    ];
    const analysis = makeAnalysis({ phaseComparisons: comparisons });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.some(i => i.includes('devoted') && i.includes('military') && i.includes('sacrificed economy'))).toBe(true);
  });

  it('returns at most 4 insights', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(600),
        player2IncomeAtEnd: makeIncome(400),
        player1Allocation: makeAllocation(5),
        player2Allocation: makeAllocation(50),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(900),
        player2IncomeAtEnd: makeIncome(500),
        player1Allocation: makeAllocation(5),
        player2Allocation: makeAllocation(50),
      }),
    ];
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 13000, 12400),
      player2: makePlayer('Loser', 'loss', 8000, 7800),
      phaseComparisons: comparisons,
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.length).toBeLessThanOrEqual(4);
  });

  it('returns empty array when nothing notable', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 10000, 9500),
      player2: makePlayer('Loser', 'loss', 10000, 9500),
      phaseComparisons: [],
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.length).toBe(0);
  });

  it('handles zero gathered resources gracefully', () => {
    const analysis = makeAnalysis({
      player1: makePlayer('Winner', 'win', 0, 0),
      player2: makePlayer('Loser', 'loss', 0, 0),
    });
    const insights = generateGameEconomicInsights(analysis);
    expect(insights.length).toBe(0);
  });
});

describe('generatePhaseEconomicInsights', () => {
  it('returns empty arrays when nothing changed', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(0);
    expect(result[1]).toHaveLength(0);
  });

  it('detects early military investment in first phase', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1Allocation: makeAllocation(30),
        player2Allocation: makeAllocation(2),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'Aggressor', 'Boomer');
    expect(result[0]).toHaveLength(1);
    expect(result[0][0]).toContain('Aggressor invested in early military');
    expect(result[0][0]).toContain('Boomer focused purely on economy');
  });

  it('skips first phase insight when both boom (both <5% military)', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1Allocation: makeAllocation(2),
        player2Allocation: makeAllocation(3),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[0]).toHaveLength(0);
  });

  it('detects income gap growth', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(500),
        player2IncomeAtEnd: makeIncome(450),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(900),
        player2IncomeAtEnd: makeIncome(500),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].some(i => i.includes('income advantage grew'))).toBe(true);
  });

  it('detects income lead flip', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(400),
        player2IncomeAtEnd: makeIncome(600),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(700),
        player2IncomeAtEnd: makeIncome(500),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].some(i => i.includes('P1 overtook P2 in income'))).toBe(true);
  });

  it('detects income gap closing to parity', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(800),
        player2IncomeAtEnd: makeIncome(500),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(700),
        player2IncomeAtEnd: makeIncome(680),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].some(i => i.includes('closed the income gap to near-parity'))).toBe(true);
  });

  it('detects spending pivot to military', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1Allocation: makeAllocation(10),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1Allocation: makeAllocation(50),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].some(i => i.includes('P1 pivoted to military'))).toBe(true);
  });

  it('detects spending shift back to economy', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1Allocation: makeAllocation(50),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1Allocation: makeAllocation(20),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].some(i => i.includes('P1 shifted back to economy'))).toBe(true);
  });

  it('limits each phase to at most 2 insights', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        player1IncomeAtEnd: makeIncome(400),
        player2IncomeAtEnd: makeIncome(600),
        player1Allocation: makeAllocation(10),
        player2Allocation: makeAllocation(10),
      }),
      makePhaseComparison({
        phase: { label: 'Feudal Age', startTime: 300, endTime: 600, player1Age: 'Feudal', player2Age: 'Feudal' },
        player1IncomeAtEnd: makeIncome(900),
        player2IncomeAtEnd: makeIncome(500),
        player1Allocation: makeAllocation(60),
        player2Allocation: makeAllocation(60),
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result[1].length).toBeLessThanOrEqual(2);
  });

  it('handles single phase input', () => {
    const comparisons = [
      makePhaseComparison({
        phase: { label: 'Dark Age', startTime: 0, endTime: 900, player1Age: 'Dark', player2Age: 'Dark' },
      }),
    ];
    const result = generatePhaseEconomicInsights(comparisons, 'P1', 'P2');
    expect(result).toHaveLength(1);
    // No crash, no previous phase comparison
  });

  it('handles empty comparisons array', () => {
    const result = generatePhaseEconomicInsights([], 'P1', 'P2');
    expect(result).toHaveLength(0);
  });
});
