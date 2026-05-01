import { detectSignificantResourceLossEvents } from '../../src/analysis/significantResourceLossEvents';
import { GameSummary, PlayerSummary, TimeSeriesResources } from '../../src/parser/gameSummaryParser';
import { ResolvedBuildOrder } from '../../src/parser/buildOrderResolver';
import { DeployedResourcePools, PoolSeriesPoint } from '../../src/analysis/resourcePool';

const zeroTotals = { food: 0, wood: 0, gold: 0, stone: 0, total: 0 };
const zeroScores = { total: 0, military: 0, economy: 0, technology: 0, society: 0 };
const zeroStats = { ekills: 0, edeaths: 0, sqprod: 0, sqlost: 0, bprod: 0, upg: 0, totalcmds: 0 };

function resources(duration: number): TimeSeriesResources {
  return {
    timestamps: [0, duration],
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
  };
}

function player(index: number, duration: number, buildOrder: PlayerSummary['buildOrder'] = []): PlayerSummary {
  return {
    profileId: index,
    name: index === 1 ? 'You' : 'Opponent',
    civilization: index === 1 ? 'english' : 'french',
    team: index,
    apm: 0,
    result: index === 1 ? 'win' : 'loss',
    _stats: zeroStats,
    actions: {},
    scores: zeroScores,
    totalResourcesGathered: zeroTotals,
    totalResourcesSpent: zeroTotals,
    resources: resources(duration),
    buildOrder,
  };
}

function summary(duration: number, p1BuildOrder: PlayerSummary['buildOrder'] = [], p2BuildOrder: PlayerSummary['buildOrder'] = []): GameSummary {
  return {
    gameId: 1,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration,
    startedAt: 0,
    finishedAt: duration,
    players: [
      player(1, duration, p1BuildOrder),
      player(2, duration, p2BuildOrder),
    ],
  };
}

function point(timestamp: number, total: number): PoolSeriesPoint {
  return {
    timestamp,
    economic: total,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total,
  };
}

function pools(duration: number, p1Total: number, p2Total: number): DeployedResourcePools {
  return {
    player1: {
      profileId: 1,
      playerName: 'You',
      civilization: 'english',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: [point(0, p1Total), point(duration, p1Total)],
      peakTotal: p1Total,
    },
    player2: {
      profileId: 2,
      playerName: 'Opponent',
      civilization: 'french',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: [point(0, p2Total), point(duration, p2Total)],
      peakTotal: p2Total,
    },
    sharedYAxisMax: Math.max(p1Total, p2Total),
  };
}

function poolsFromSeries(
  duration: number,
  p1Series: PoolSeriesPoint[],
  p2Series: PoolSeriesPoint[]
): DeployedResourcePools {
  return {
    player1: {
      profileId: 1,
      playerName: 'You',
      civilization: 'english',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: p1Series,
      peakTotal: Math.max(...p1Series.map(item => item.total)),
    },
    player2: {
      profileId: 2,
      playerName: 'Opponent',
      civilization: 'french',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: p2Series,
      peakTotal: Math.max(...p2Series.map(item => item.total)),
    },
    sharedYAxisMax: Math.max(...p1Series.map(item => item.total), ...p2Series.map(item => item.total)),
  };
}

function emptyBuild(): ResolvedBuildOrder {
  return { startingAssets: [], resolved: [], unresolved: [] };
}

describe('detectSignificantResourceLossEvents', () => {
  it('uses gross lifecycle destruction when same-timestamp production and destruction would net to zero', () => {
    const p2Build: ResolvedBuildOrder = {
      startingAssets: [],
      resolved: [{
        originalEntry: {
          id: 'knight',
          icon: 'icons/races/french/units/knight',
          pbgid: 1,
          type: 'Unit',
          finished: [120],
          constructed: [],
          destroyed: [120],
        },
        type: 'unit',
        id: 'knight',
        name: 'Knight',
        cost: { food: 140, wood: 0, gold: 100, stone: 0, total: 240 },
        tier: 1,
        tierMultiplier: 1,
        classes: ['cavalry'],
        produced: [120],
        destroyed: [120],
        civs: ['fr'],
      }],
      unresolved: [],
    };

    const events = detectSignificantResourceLossEvents({
      summary: summary(600),
      deployedResourcePools: pools(600, 1000, 1000),
      player1Build: emptyBuild(),
      player2Build: p2Build,
    });

    expect(events).toEqual([
      expect.objectContaining({
        victimPlayer: 2,
        kind: 'fight',
        immediateLoss: 240,
        grossLoss: 240,
        topLosses: [expect.objectContaining({ label: 'Knight', value: 240, count: 1 })],
      }),
    ]);
  });

  it('keeps both players losses for a fight and ranks the event by combined gross impact', () => {
    const knight = {
      originalEntry: {
        id: 'knight',
        icon: 'icons/races/french/units/knight',
        pbgid: 4,
        type: 'Unit' as const,
        finished: [180],
        constructed: [],
        destroyed: [210],
      },
      type: 'unit' as const,
      id: 'knight',
      name: 'Knight',
      cost: { food: 140, wood: 0, gold: 100, stone: 0, total: 240 },
      tier: 1,
      tierMultiplier: 1,
      classes: ['cavalry'],
      produced: [180],
      destroyed: [210],
      civs: ['fr'],
    };
    const spearman = {
      originalEntry: {
        id: 'spearman',
        icon: 'icons/races/english/units/spearman',
        pbgid: 5,
        type: 'Unit' as const,
        finished: [180, 180],
        constructed: [],
        destroyed: [205, 210],
      },
      type: 'unit' as const,
      id: 'spearman',
      name: 'Spearman',
      cost: { food: 60, wood: 20, gold: 0, stone: 0, total: 80 },
      tier: 1,
      tierMultiplier: 1,
      classes: ['infantry'],
      produced: [180, 180],
      destroyed: [205, 210],
      civs: ['en'],
    };

    const events = detectSignificantResourceLossEvents({
      summary: summary(600),
      deployedResourcePools: pools(600, 1000, 1000),
      player1Build: { startingAssets: [], resolved: [knight], unresolved: [] },
      player2Build: { startingAssets: [], resolved: [spearman], unresolved: [] },
    });

    expect(events[0]).toEqual(expect.objectContaining({
      kind: 'fight',
      victimPlayer: 1,
      grossLoss: 240,
      grossImpact: 400,
      playerImpacts: {
        player1: expect.objectContaining({ immediateLoss: 240, grossLoss: 240 }),
        player2: expect.objectContaining({ immediateLoss: 160, grossLoss: 160 }),
      },
    }));
  });

  it('applies the absolute guard to trivial non-villager losses even when percentage is high', () => {
    const p2Build: ResolvedBuildOrder = {
      startingAssets: [],
      resolved: [{
        originalEntry: {
          id: 'house',
          icon: 'icons/races/common/buildings/house',
          pbgid: 2,
          type: 'Building',
          finished: [],
          constructed: [30],
          destroyed: [45],
        },
        type: 'building',
        id: 'house',
        name: 'House',
        cost: { food: 0, wood: 50, gold: 0, stone: 0, total: 50 },
        tier: 1,
        tierMultiplier: 1,
        classes: ['house'],
        produced: [30],
        destroyed: [45],
        civs: [],
      }],
      unresolved: [],
    };

    const events = detectSignificantResourceLossEvents({
      summary: summary(600),
      deployedResourcePools: pools(600, 1000, 500),
      player1Build: emptyBuild(),
      player2Build: p2Build,
    });

    expect(events).toEqual([]);
  });

  it('lets villager opportunity cost satisfy the absolute guard for an early raid', () => {
    const villagerEntry: PlayerSummary['buildOrder'][number] = {
      id: 'villager',
      icon: 'icons/races/common/units/villager',
      pbgid: 3,
      type: 'Unit',
      finished: [0, 0, 0, 0, 0, 0],
      constructed: [],
      destroyed: [120],
    };
    const p2Build: ResolvedBuildOrder = {
      startingAssets: [{
        originalEntry: villagerEntry,
        type: 'unit',
        id: 'villager',
        name: 'Villager',
        cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
        tier: 1,
        tierMultiplier: 1,
        classes: ['worker'],
        produced: [0, 0, 0, 0, 0, 0],
        destroyed: [120],
        civs: [],
      }],
      resolved: [],
      unresolved: [],
    };

    const events = detectSignificantResourceLossEvents({
      summary: summary(600, [], [villagerEntry]),
      deployedResourcePools: pools(600, 1000, 500),
      player1Build: emptyBuild(),
      player2Build: p2Build,
    });

    expect(events[0]).toEqual(expect.objectContaining({
      victimPlayer: 2,
      kind: 'raid',
      immediateLoss: 50,
      villagerDeaths: 1,
    }));
    expect(events[0].villagerOpportunityLoss).toBeGreaterThan(0);
    expect(events[0].description).toContain('villager opportunity');
  });

  it('discounts future villager opportunity by later deployed-resource scale', () => {
    const villagerEntry: PlayerSummary['buildOrder'][number] = {
      id: 'villager',
      icon: 'icons/races/common/units/villager',
      pbgid: 3,
      type: 'Unit',
      finished: [0, 0, 0, 0, 0, 0],
      constructed: [],
      destroyed: [60],
    };
    const p2Build: ResolvedBuildOrder = {
      startingAssets: [{
        originalEntry: villagerEntry,
        type: 'unit',
        id: 'villager',
        name: 'Villager',
        cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
        tier: 1,
        tierMultiplier: 1,
        classes: ['worker'],
        produced: [0, 0, 0, 0, 0, 0],
        destroyed: [60],
        civs: [],
      }],
      resolved: [],
      unresolved: [],
    };

    const events = detectSignificantResourceLossEvents({
      summary: summary(300, [], [villagerEntry]),
      deployedResourcePools: poolsFromSeries(
        300,
        [point(0, 1000), point(300, 1000)],
        [point(0, 500), point(60, 500), point(120, 1000), point(300, 1000)]
      ),
      player1Build: emptyBuild(),
      player2Build: p2Build,
    });

    expect(events[0]).toEqual(expect.objectContaining({
      victimPlayer: 2,
      immediateLoss: 50,
      villagerDeaths: 1,
      denominator: 500,
    }));
    expect(events[0].villagerOpportunityLoss).toBe(100);
    expect(events[0].grossLoss).toBe(150);
  });
});
