import { comparePhases } from '../../packages/aoe4-core/src/analysis/phaseComparison';
import { GamePhases, UnifiedPhase, InflectionPoint } from '../../packages/aoe4-core/src/analysis/types';
import { ResolvedBuildOrder, ResolvedBuildItem } from '../../packages/aoe4-core/src/parser/buildOrderResolver';
import { TimeSeriesResources } from '../../packages/aoe4-core/src/parser/gameSummaryParser';

function makeSeries(overrides?: Partial<TimeSeriesResources>): TimeSeriesResources {
  return {
    timestamps: [0, 300, 600, 900],
    food: [0, 1000, 2500, 5000],
    gold: [0, 800, 1800, 3000],
    stone: [0, 100, 400, 1000],
    wood: [0, 900, 2500, 4000],
    foodPerMin: [0, 200, 300, 350],
    goldPerMin: [0, 160, 200, 220],
    stonePerMin: [0, 20, 40, 60],
    woodPerMin: [0, 180, 250, 260],
    total: [0, 200, 600, 1000],
    military: [0, 80, 240, 400],
    economy: [0, 60, 180, 300],
    technology: [0, 40, 120, 200],
    society: [0, 20, 60, 100],
    ...overrides
  };
}

function makeUnit(name: string, produced: number[], cost = 100): ResolvedBuildItem {
  return {
    originalEntry: { id: name.toLowerCase(), icon: `${name.toLowerCase()}.png`, pbgid: 1, type: 'Unit' as const, finished: produced, constructed: [], destroyed: [] },
    type: 'unit',
    id: name.toLowerCase(),
    name,
    cost: { food: cost, wood: 0, gold: 0, stone: 0, total: cost },
    tier: 1,
    tierMultiplier: 1.0,
    classes: ['Infantry'],
    produced,
    destroyed: [],
    civs: ['en']
  };
}

function makeBuilding(name: string, produced: number[], cost = 200): ResolvedBuildItem {
  return {
    originalEntry: { id: name.toLowerCase(), icon: `${name.toLowerCase()}.png`, pbgid: 1, type: 'Building' as const, finished: [], constructed: produced, destroyed: [] },
    type: 'building',
    id: name.toLowerCase(),
    name,
    cost: { food: 0, wood: cost, gold: 0, stone: 0, total: cost },
    tier: 1,
    tierMultiplier: 1.0,
    classes: ['Building'],
    produced,
    destroyed: [],
    civs: ['en']
  };
}

function makeUpgrade(name: string, produced: number[], cost = 150): ResolvedBuildItem {
  return {
    originalEntry: { id: name.toLowerCase(), icon: `${name.toLowerCase()}.png`, pbgid: 1, type: 'Upgrade' as const, finished: produced, constructed: [], destroyed: [] },
    type: 'upgrade',
    id: name.toLowerCase(),
    name,
    cost: { food: 0, wood: 0, gold: cost, stone: 0, total: cost },
    tier: 1,
    tierMultiplier: 1.0,
    classes: [],
    produced,
    destroyed: [],
    civs: ['en']
  };
}

describe('comparePhases', () => {
  const singlePhase: GamePhases = {
    unifiedPhases: [{
      label: 'Dark Age',
      startTime: 0,
      endTime: 900,
      player1Age: 'Dark',
      player2Age: 'Dark',
    }],
    gameDuration: 900,
  };

  it('produces one comparison per phase', () => {
    const p1Build: ResolvedBuildOrder = { startingAssets: [], resolved: [], unresolved: [] };
    const p2Build: ResolvedBuildOrder = { startingAssets: [], resolved: [], unresolved: [] };

    const result = comparePhases(singlePhase, p1Build, p2Build, makeSeries(), makeSeries(), []);
    expect(result).toHaveLength(1);
    expect(result[0].phase.label).toBe('Dark Age');
  });

  it('computes score deltas at start and end of phase', () => {
    const p1Series = makeSeries({ total: [0, 200, 600, 1000], military: [0, 80, 240, 400] });
    const p2Series = makeSeries({ total: [0, 150, 500, 800], military: [0, 60, 180, 300] });

    const result = comparePhases(
      singlePhase,
      { startingAssets: [], resolved: [], unresolved: [] },
      { startingAssets: [], resolved: [], unresolved: [] },
      p1Series, p2Series, []
    );

    expect(result[0].scoreDeltaAtStart.total).toBe(0);
    expect(result[0].scoreDeltaAtEnd.total).toBe(200); // 1000 - 800
  });

  it('computes resource allocation percentages', () => {
    const p1Build: ResolvedBuildOrder = {
      startingAssets: [],
      resolved: [
        makeUnit('Spearman', [100, 200], 100),    // military: 200 total
        makeBuilding('House', [150], 50),           // building: 50 total
        makeUpgrade('Armor', [300], 100),            // technology: 100 total
      ],
      unresolved: []
    };

    const result = comparePhases(
      singlePhase,
      p1Build,
      { startingAssets: [], resolved: [], unresolved: [] },
      makeSeries(), makeSeries(), []
    );

    // Total: 200 + 50 + 100 = 350
    expect(result[0].player1Allocation.militaryPercent).toBeCloseTo(200 / 350 * 100, 0);
    expect(result[0].player1Allocation.buildingPercent).toBeCloseTo(50 / 350 * 100, 0);
    expect(result[0].player1Allocation.technologyPercent).toBeCloseTo(100 / 350 * 100, 0);
  });

  it('handles zero total spending gracefully', () => {
    const result = comparePhases(
      singlePhase,
      { startingAssets: [], resolved: [], unresolved: [] },
      { startingAssets: [], resolved: [], unresolved: [] },
      makeSeries(), makeSeries(), []
    );

    expect(result[0].player1Allocation.militaryPercent).toBe(0);
    expect(result[0].player1Allocation.economyPercent).toBe(0);
  });

  it('includes income at end of phase', () => {
    const series = makeSeries({
      timestamps: [0, 300, 600, 900],
      foodPerMin: [0, 200, 300, 350],
      goldPerMin: [0, 160, 200, 220],
      stonePerMin: [0, 20, 40, 60],
      woodPerMin: [0, 180, 250, 260],
    });

    const result = comparePhases(
      singlePhase,
      { startingAssets: [], resolved: [], unresolved: [] },
      { startingAssets: [], resolved: [], unresolved: [] },
      series, series, []
    );

    expect(result[0].player1IncomeAtEnd.foodPerMin).toBe(350);
    expect(result[0].player1IncomeAtEnd.goldPerMin).toBe(220);
  });

  it('filters inflection points into correct phase', () => {
    const twoPhases: GamePhases = {
      unifiedPhases: [
        { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        { label: 'Feudal Age', startTime: 300, endTime: 900, player1Age: 'Feudal', player2Age: 'Feudal' },
      ],
      gameDuration: 900,
    };

    const inflections: InflectionPoint[] = [
      { timestamp: 150, scoreType: 'total', deltaShift: 50, magnitude: 50, favoredPlayer: 1, destructionCluster: null },
      { timestamp: 500, scoreType: 'military', deltaShift: -80, magnitude: 80, favoredPlayer: 2, destructionCluster: null },
    ];

    const emptyBuild: ResolvedBuildOrder = { startingAssets: [], resolved: [], unresolved: [] };
    const result = comparePhases(twoPhases, emptyBuild, emptyBuild, makeSeries(), makeSeries(), inflections);

    expect(result[0].inflections).toHaveLength(1);
    expect(result[0].inflections[0].timestamp).toBe(150);
    expect(result[1].inflections).toHaveLength(1);
    expect(result[1].inflections[0].timestamp).toBe(500);
  });

  it('counts unit production per phase', () => {
    const twoPhases: GamePhases = {
      unifiedPhases: [
        { label: 'Dark Age', startTime: 0, endTime: 300, player1Age: 'Dark', player2Age: 'Dark' },
        { label: 'Feudal Age', startTime: 300, endTime: 900, player1Age: 'Feudal', player2Age: 'Feudal' },
      ],
      gameDuration: 900,
    };

    const p1Build: ResolvedBuildOrder = {
      startingAssets: [],
      resolved: [
        makeUnit('Spearman', [100, 200, 400, 500]),
      ],
      unresolved: []
    };

    const result = comparePhases(twoPhases, p1Build,
      { startingAssets: [], resolved: [], unresolved: [] },
      makeSeries(), makeSeries(), []);

    // Phase 1 (0-300): timestamps 100, 200 = 2 units
    expect(result[0].player1Units).toEqual([{ name: 'Spearman', count: 2 }]);
    // Phase 2 (300-900): timestamps 400, 500 = 2 units
    expect(result[1].player1Units).toEqual([{ name: 'Spearman', count: 2 }]);
  });
});
