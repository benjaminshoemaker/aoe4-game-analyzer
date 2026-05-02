import { buildDeployedResourcePools } from '@aoe4/analyzer-core/analysis/resourcePool';
import { resolveAllBuildOrders } from '@aoe4/analyzer-core/parser/buildOrderResolver';
import { parseGameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import { StaticDataCache } from '@aoe4/analyzer-core/types';

const zeroStats = {
  ekills: 0,
  edeaths: 0,
  sqprod: 0,
  sqlost: 0,
  bprod: 0,
  upg: 0,
  totalcmds: 0,
};

const zeroScores = { total: 0, military: 0, economy: 0, technology: 0, society: 0 };
const zeroTotals = { food: 0, gold: 0, stone: 0, wood: 0, total: 0 };
const resources = {
  timestamps: [0, 61, 116, 159, 240],
  food: [0, 0, 0, 0, 0],
  gold: [0, 0, 0, 0, 0],
  stone: [0, 0, 0, 0, 0],
  wood: [0, 0, 0, 0, 0],
  foodPerMin: [0, 0, 0, 0, 0],
  goldPerMin: [0, 0, 0, 0, 0],
  stonePerMin: [0, 0, 0, 0, 0],
  woodPerMin: [0, 0, 0, 0, 0],
  total: [0, 0, 0, 0, 0],
  military: [0, 0, 0, 0, 0],
  economy: [0, 0, 0, 0, 0],
  technology: [0, 0, 0, 0, 0],
  society: [0, 0, 0, 0, 0],
};

const staticData: StaticDataCache = {
  fetchedAt: new Date().toISOString(),
  units: [],
  buildings: [],
  technologies: [],
};

describe('Sengoku Yatai integration', () => {
  it('counts parsed Yatai entries as economic deployed resources', () => {
    const summary = parseGameSummary({
      gameId: 229727104,
      winReason: 'Surrender',
      mapName: 'Dry Arabia',
      mapBiome: 'Desert',
      leaderboard: 'rm_1v1',
      duration: 240,
      startedAt: 0,
      finishedAt: 240,
      players: [
        {
          profileId: 8139502,
          name: 'Beasty',
          civilization: 'sengoku_daimyo',
          team: 1,
          apm: 0,
          result: 'win',
          _stats: zeroStats,
          actions: {},
          scores: zeroScores,
          totalResourcesGathered: zeroTotals,
          totalResourcesSpent: zeroTotals,
          resources,
          buildOrder: [
            {
              id: '11266336',
              icon: 'icons/races/sengoku/units/yatai',
              pbgid: 9001316,
              type: 'Unit',
              finished: [],
              constructed: [],
              destroyed: [],
              unknown: {
                '14': [61, 116, 159],
                '15': [170],
              },
            },
          ],
        },
        {
          profileId: 2,
          name: 'Opponent',
          civilization: 'english',
          team: 2,
          apm: 0,
          result: 'loss',
          _stats: zeroStats,
          actions: {},
          scores: zeroScores,
          totalResourcesGathered: zeroTotals,
          totalResourcesSpent: zeroTotals,
          resources,
          buildOrder: [],
        },
      ],
    });

    const player1Build = resolveAllBuildOrders(summary.players[0], staticData);
    const player2Build = resolveAllBuildOrders(summary.players[1], staticData);
    const pools = buildDeployedResourcePools(summary, player1Build, player2Build);

    expect(player1Build.unresolved).toEqual([]);
    expect(player1Build.resolved[0]).toEqual(expect.objectContaining({
      name: 'Yatai',
      produced: [61, 116, 159],
      destroyed: [170],
    }));
    expect(pools.player1.series.find(point => point.timestamp === 159)?.economic).toBe(375);
    expect(pools.player1.series.find(point => point.timestamp === 240)?.economic).toBe(250);
    expect(pools.player1.series.find(point => point.timestamp === 159)?.militaryActive).toBe(0);
    expect(pools.player1.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({ timestamp: 61, band: 'economic', itemLabel: 'Yatai', deltaValue: 125 }),
      expect.objectContaining({ timestamp: 116, band: 'economic', itemLabel: 'Yatai', deltaValue: 125 }),
      expect.objectContaining({ timestamp: 159, band: 'economic', itemLabel: 'Yatai', deltaValue: 125 }),
      expect.objectContaining({ timestamp: 170, band: 'economic', itemLabel: 'Yatai', deltaValue: -125 }),
    ]));
  });
});
