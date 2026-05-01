import { buildPostMatchViewModel } from '../../src/lib/aoe4/analysis/postMatchViewModel';
import { GameAnalysis } from '../../src/lib/aoe4/analysis/types';
import { PoolSeriesPoint } from '../../src/lib/aoe4/analysis/resourcePool';
import { GameSummary, PlayerSummary, ResourceTotals, TimeSeriesResources } from '../../src/lib/aoe4/parser/gameSummaryParser';

const zeroTotals: ResourceTotals = { food: 0, wood: 0, gold: 0, stone: 0, total: 0 };
const gatheredTotals: ResourceTotals = { food: 1200, wood: 900, gold: 600, stone: 300, total: 3000 };

function resources(values: {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  oliveoil?: number;
}): TimeSeriesResources {
  return {
    timestamps: [0, 60, 120],
    food: [0, Math.round(values.food / 2), values.food],
    wood: [0, Math.round(values.wood / 2), values.wood],
    gold: [0, Math.round(values.gold / 2), values.gold],
    stone: [0, Math.round(values.stone / 2), values.stone],
    oliveoil: values.oliveoil === undefined ? undefined : [0, Math.round(values.oliveoil / 2), values.oliveoil],
    foodPerMin: [0, 0, 0],
    woodPerMin: [0, 0, 0],
    goldPerMin: [0, 0, 0],
    stonePerMin: [0, 0, 0],
    total: [0, 9999, 9999],
    military: [0, 0, 0],
    economy: [0, 0, 0],
    technology: [0, 0, 0],
    society: [0, 0, 0],
  };
}

function player(
  profileId: number,
  resourceValues: Parameters<typeof resources>[0]
): PlayerSummary {
  return {
    profileId,
    name: profileId === 1 ? 'You' : 'Opponent',
    civilization: profileId === 1 ? 'English' : 'French',
    team: profileId,
    apm: 0,
    result: profileId === 1 ? 'win' : 'loss',
    _stats: { ekills: 0, edeaths: 0, sqprod: 0, sqlost: 0, bprod: 0, upg: 0, totalcmds: 0 },
    actions: {},
    scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    totalResourcesGathered: gatheredTotals,
    totalResourcesSpent: zeroTotals,
    resources: resources(resourceValues),
    buildOrder: [],
  };
}

function point(timestamp: number, economic: number): PoolSeriesPoint {
  return {
    timestamp,
    economic,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total: economic,
  };
}

function makeSummary(): GameSummary {
  return {
    gameId: 123,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration: 120,
    startedAt: 0,
    finishedAt: 120,
    players: [
      player(1, { food: 100, wood: 200, gold: 300, stone: 350, oliveoil: 50 }),
      player(2, { food: 75, wood: 25, gold: 0, stone: 0 }),
    ],
  };
}

function makeAnalysis(): GameAnalysis {
  const youSeries = [point(0, 0), point(120, 600)];
  const opponentSeries = [point(0, 0), point(120, 500)];
  return {
    gameId: 123,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration: 120,
    winReason: 'Surrender',
    player1: {
      name: 'You',
      civilization: 'English',
      result: 'win',
      apm: 0,
      scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
      totalGathered: gatheredTotals,
      totalSpent: zeroTotals,
      kills: 0,
      deaths: 0,
      unitsProduced: 0,
    },
    player2: {
      name: 'Opponent',
      civilization: 'French',
      result: 'loss',
      apm: 0,
      scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
      totalGathered: gatheredTotals,
      totalSpent: zeroTotals,
      kills: 0,
      deaths: 0,
      unitsProduced: 0,
    },
    phases: { unifiedPhases: [], gameDuration: 120 },
    phaseComparisons: [],
    inflectionPoints: [],
    finalArmyMatchup: null,
    combatAdjustedMilitarySeries: [],
    deployedResourcePools: {
      player1: {
        profileId: 1,
        playerName: 'You',
        civilization: 'English',
        deferredNotices: [],
        gatherRateSeries: [],
        bandItemDeltas: [],
        bandItemSnapshots: [],
        series: youSeries,
        peakTotal: 600,
      },
      player2: {
        profileId: 2,
        playerName: 'Opponent',
        civilization: 'French',
        deferredNotices: [],
        gatherRateSeries: [],
        bandItemDeltas: [],
        bandItemSnapshots: [],
        series: opponentSeries,
        peakTotal: 500,
      },
      sharedYAxisMax: 600,
    },
    bottomLine: null,
  };
}

describe('buildPostMatchViewModel float resource breakdown', () => {
  it('uses live stockpile resource series for float totals and composition', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(),
      analysis: makeAnalysis(),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 120);

    expect(finalSnapshot?.accounting?.you.float).toBe(1000);
    expect(finalSnapshot?.accounting?.opponent.float).toBe(100);
    expect(finalSnapshot?.accounting?.delta.float).toBe(900);
    expect(finalSnapshot?.bandBreakdown.float?.you).toEqual([
      { label: 'Food', value: 100, percent: 10, category: 'resource-stockpile' },
      { label: 'Wood', value: 200, percent: 20, category: 'resource-stockpile' },
      { label: 'Gold', value: 300, percent: 30, category: 'resource-stockpile' },
      { label: 'Stone', value: 350, percent: 35, category: 'resource-stockpile' },
      { label: 'Olive oil', value: 50, percent: 5, category: 'resource-stockpile' },
    ]);
    expect(finalSnapshot?.bandBreakdown.float?.opponent).toEqual([
      { label: 'Food', value: 75, percent: 75, category: 'resource-stockpile' },
      { label: 'Wood', value: 25, percent: 25, category: 'resource-stockpile' },
    ]);
  });
});
