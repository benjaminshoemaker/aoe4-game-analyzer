import { buildPostMatchViewModel } from '@aoe4/analyzer-core/analysis/postMatchViewModel';
import { GameAnalysis } from '@aoe4/analyzer-core/analysis/types';
import { PoolSeriesPoint } from '@aoe4/analyzer-core/analysis/resourcePool';
import { BuildOrderEntry, GameSummary, PlayerSummary, ResourceTotals, TimeSeriesResources } from '@aoe4/analyzer-core/parser/gameSummaryParser';

const zeroTotals: ResourceTotals = {
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  total: 0,
};

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

function villagerEntry(finished: number[], destroyed: number[]): BuildOrderEntry {
  return {
    id: 'unit_villager',
    icon: 'villager',
    pbgid: 1,
    type: 'Unit',
    finished,
    constructed: [],
    destroyed,
  };
}

function makePlayer(
  profileId: number,
  name: string,
  duration: number,
  finishedVillagers: number[],
  destroyedVillagers: number[]
): PlayerSummary {
  return {
    profileId,
    name,
    civilization: profileId === 1 ? 'English' : 'French',
    team: profileId,
    apm: 0,
    result: profileId === 1 ? 'win' : 'loss',
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
    totalResourcesGathered: zeroTotals,
    totalResourcesSpent: zeroTotals,
    resources: resources(duration),
    buildOrder: [villagerEntry(finishedVillagers, destroyedVillagers)],
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

function makeSummary(
  duration: number,
  player1FinishedVillagers = [0, 20, 40, 60],
  player1DestroyedVillagers = [60, 90],
  player2FinishedVillagers = [0, 20, 40],
  player2DestroyedVillagers = [30]
): GameSummary {
  return {
    gameId: 123,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration,
    startedAt: 0,
    finishedAt: duration,
    players: [
      makePlayer(1, 'You', duration, player1FinishedVillagers, player1DestroyedVillagers),
      makePlayer(2, 'Opponent', duration, player2FinishedVillagers, player2DestroyedVillagers),
    ],
  };
}

function makeAnalysis(duration: number): GameAnalysis {
  const youSeries = [point(0, 50), point(duration, 200)];
  const opponentSeries = [point(0, 50), point(duration, 180)];

  return {
    gameId: 123,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration,
    winReason: 'Surrender',
    player1: {
      name: 'You',
      civilization: 'English',
      result: 'win',
      apm: 0,
      scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
      totalGathered: zeroTotals,
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
      totalGathered: zeroTotals,
      totalSpent: zeroTotals,
      kills: 0,
      deaths: 0,
      unitsProduced: 0,
    },
    phases: { unifiedPhases: [], gameDuration: duration },
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
        gatherRateSeries: [{ timestamp: 0, ratePerMin: 0 }, { timestamp: duration, ratePerMin: 0 }],
        bandItemDeltas: [],
        series: youSeries,
        peakTotal: 200,
      },
      player2: {
        profileId: 2,
        playerName: 'Opponent',
        civilization: 'French',
        deferredNotices: [],
        gatherRateSeries: [{ timestamp: 0, ratePerMin: 0 }, { timestamp: duration, ratePerMin: 0 }],
        bandItemDeltas: [],
        series: opponentSeries,
        peakTotal: 180,
      },
      sharedYAxisMax: 200,
    },
    bottomLine: null,
  };
}

describe('buildPostMatchViewModel opportunity lost breakdown', () => {
  it('shows one row per 30-second slot with villager deaths and values their remaining-game resource cost', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(120),
      analysis: makeAnalysis(120),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 120);
    const yourEntries = (finalSnapshot?.bandBreakdown.opportunityLost?.you ?? [])
      .filter(entry => entry.category === 'villagers-lost');
    const opponentEntries = (finalSnapshot?.bandBreakdown.opportunityLost?.opponent ?? [])
      .filter(entry => entry.category === 'villagers-lost');

    expect(yourEntries).toEqual([
      expect.objectContaining({ label: '1:00-1:30', value: 40, count: 1, category: 'villagers-lost' }),
      expect.objectContaining({ label: '1:30-2:00', value: 20, count: 1, category: 'villagers-lost' }),
    ]);
    expect(opponentEntries).toEqual([
      expect.objectContaining({ label: '0:30-1:00', value: 60, count: 1, category: 'villagers-lost' }),
    ]);
  });

  it('aggregates multiple villager deaths in the same 30-second slot', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(120, [0, 20, 40, 60], [60, 80], [0], []),
      analysis: makeAnalysis(120),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 120);
    const yourEntries = (finalSnapshot?.bandBreakdown.opportunityLost?.you ?? [])
      .filter(entry => entry.category === 'villagers-lost');

    expect(yourEntries).toEqual([
      expect.objectContaining({ label: '1:00-1:30', value: 67, count: 2 }),
    ]);
  });

  it('keeps underproduction out of opportunity-lost bucket rows', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(120, [0], [], [0], []),
      analysis: makeAnalysis(120),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 120);
    const yourEntries = finalSnapshot?.bandBreakdown.opportunityLost?.you ?? [];
    const finalLoss = Math.round(finalSnapshot?.villagerOpportunity.you.cumulativeLoss ?? 0);
    const underproductionLoss = Math.round(finalSnapshot?.villagerOpportunity.you.cumulativeUnderproductionLoss ?? 0);

    expect(finalLoss).toBeGreaterThan(0);
    expect(underproductionLoss).toBe(finalLoss);
    expect(yourEntries).toEqual([]);
  });

  it('orders death-slot rows by time rather than by resource value', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(180, [0, 20, 40, 60], [60, 95, 100], [0], []),
      analysis: makeAnalysis(180),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 180);
    const yourEntries = (finalSnapshot?.bandBreakdown.opportunityLost?.you ?? [])
      .filter(entry => entry.category === 'villagers-lost');

    expect(yourEntries.map(entry => entry.label)).toEqual(['1:00-1:30', '1:30-2:00']);
    expect(yourEntries[0].value).toBeLessThan(yourEntries[1].value);
  });

  it('does not mix underproduction into villager-loss time buckets', () => {
    const model = buildPostMatchViewModel({
      summary: makeSummary(150, [0], [60], [0], []),
      analysis: makeAnalysis(150),
      perspectiveProfileId: 1,
    });

    const finalSnapshot = model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 150);
    const yourEntries = finalSnapshot?.bandBreakdown.opportunityLost?.you ?? [];

    expect(yourEntries.map(entry => entry.category)).toEqual([
      'villagers-lost',
    ]);
    expect(yourEntries.map(entry => entry.label)).toEqual([
      '1:00-1:30',
    ]);
    expect(Math.round(finalSnapshot?.villagerOpportunity.you.cumulativeUnderproductionLoss ?? 0)).toBeGreaterThan(0);
  });
});
