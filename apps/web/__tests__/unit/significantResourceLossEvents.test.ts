import { detectSignificantResourceLossEvents } from '@aoe4/analyzer-core/analysis/significantResourceLossEvents';
import { DeployedResourcePools, PoolSeriesPoint } from '@aoe4/analyzer-core/analysis/resourcePool';
import { ResolvedBuildItem, ResolvedBuildOrder } from '@aoe4/analyzer-core/parser/buildOrderResolver';
import { GameSummary, PlayerSummary, TimeSeriesResources } from '@aoe4/analyzer-core/parser/gameSummaryParser';

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

function player(index: number, duration: number): PlayerSummary {
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
    buildOrder: [],
  };
}

function summary(duration: number): GameSummary {
  return {
    gameId: 1,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration,
    startedAt: 0,
    finishedAt: duration,
    players: [player(1, duration), player(2, duration)],
  };
}

function point(timestamp: number, militaryActive: number): PoolSeriesPoint {
  return {
    timestamp,
    economic: 0,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive,
    defensive: 0,
    research: 0,
    advancement: 0,
    total: militaryActive,
  };
}

function pools(duration: number, p1Military: number, p2Military: number): DeployedResourcePools {
  return {
    player1: {
      profileId: 1,
      playerName: 'You',
      civilization: 'english',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: [point(0, p1Military), point(duration, p1Military)],
      peakTotal: p1Military,
    },
    player2: {
      profileId: 2,
      playerName: 'Opponent',
      civilization: 'french',
      deferredNotices: [],
      gatherRateSeries: [],
      bandItemDeltas: [],
      bandItemSnapshots: [],
      series: [point(0, p2Military), point(duration, p2Military)],
      peakTotal: p2Military,
    },
    sharedYAxisMax: Math.max(p1Military, p2Military),
  };
}

function unit(params: {
  id: string;
  name: string;
  totalCost: number;
  produced: number[];
  destroyed: number[];
  classes: string[];
}): ResolvedBuildItem {
  return {
    originalEntry: {
      id: params.id,
      icon: `icons/races/common/units/${params.id}`,
      pbgid: 1,
      type: 'Unit',
      finished: params.produced,
      constructed: [],
      destroyed: params.destroyed,
    },
    type: 'unit',
    id: params.id,
    name: params.name,
    cost: { food: params.totalCost, wood: 0, gold: 0, stone: 0, total: params.totalCost },
    tier: 1,
    tierMultiplier: 1,
    classes: params.classes,
    produced: params.produced,
    destroyed: params.destroyed,
    civs: [],
  };
}

function build(items: ResolvedBuildItem[]): ResolvedBuildOrder {
  return { startingAssets: [], resolved: items, unresolved: [] };
}

describe('detectSignificantResourceLossEvents (web)', () => {
  it('captures fight pre-encounter armies at the detected window start', () => {
    const longbowmen = unit({
      id: 'longbowman',
      name: 'Longbowman',
      totalCost: 80,
      produced: [0, 0, 0, 0, 0, 0],
      destroyed: [30, 30],
      classes: ['archer'],
    });
    const knights = unit({
      id: 'knight',
      name: 'Knight',
      totalCost: 240,
      produced: [0, 0],
      destroyed: [35],
      classes: ['cavalry'],
    });

    const events = detectSignificantResourceLossEvents({
      summary: summary(300),
      deployedResourcePools: pools(300, 480, 480),
      player1Build: build([longbowmen]),
      player2Build: build([knights]),
    });

    expect(events[0]).toEqual(expect.objectContaining({
      kind: 'fight',
      windowStart: 0,
      preEncounterArmies: {
        player1: {
          totalValue: 480,
          units: [expect.objectContaining({ label: 'Longbowman', value: 480, count: 6 })],
        },
        player2: {
          totalValue: 480,
          units: [expect.objectContaining({ label: 'Knight', value: 480, count: 2 })],
        },
      },
    }));
  });
});
