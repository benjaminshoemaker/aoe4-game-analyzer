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
  timestamps: [0, 264, 519, 600],
  food: [0, 0, 0, 0],
  gold: [0, 0, 0, 0],
  stone: [0, 0, 0, 0],
  wood: [0, 0, 0, 0],
  foodPerMin: [0, 0, 0, 0],
  goldPerMin: [0, 0, 0, 0],
  stonePerMin: [0, 0, 0, 0],
  woodPerMin: [0, 0, 0, 0],
  total: [0, 0, 0, 0],
  military: [0, 0, 0, 0],
  economy: [0, 0, 0, 0],
  technology: [0, 0, 0, 0],
  society: [0, 0, 0, 0],
};

const staticData: StaticDataCache = {
  fetchedAt: new Date().toISOString(),
  units: [],
  buildings: [],
  technologies: [
    {
      id: 'knights-hospitaller-1',
      name: 'Knights Hospitaller',
      baseId: 'knights-hospitaller',
      pbgid: 5000201,
      civs: ['kt'],
      costs: { food: 400, gold: 200 },
      classes: ['age_up_upgrade', 'scar_dark_age_upgrade'],
      age: 1,
      icon: 'icons/races/templar/technologies/knights-hospitaller-1',
    },
    {
      id: 'republic-of-genoa-2',
      name: 'Republic of Genoa',
      baseId: 'republic-of-genoa',
      pbgid: 5000207,
      civs: ['kt'],
      costs: { food: 1200, gold: 600 },
      classes: ['age_up_upgrade', 'scar_feudal_age_upgrade'],
      age: 2,
      icon: 'icons/races/templar/technologies/republic-of-genoa-2',
    },
  ],
};

describe('Knights Templar advancement integration', () => {
  it('counts parsed commanderie choices as cumulative advancement value', () => {
    const summary = parseGameSummary({
      gameId: 231103171,
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
          name: 'Templar',
          civilization: 'knights_templar',
          team: 1,
          apm: 0,
          result: 'win',
          _stats: zeroStats,
          actions: {
            feudalAge: [264],
            castleAge: [519],
            upgradeAgeDarkCom1Tem: [264],
            upgradeAgeFeudalCom2Tem: [519],
          },
          scores: zeroScores,
          totalResourcesGathered: zeroTotals,
          totalResourcesSpent: zeroTotals,
          resources,
          buildOrder: [
            {
              id: '11265377',
              icon: 'icons/races/templar/commanderieflags/civ_icon_medium_knight_hospitalier',
              pbgid: 5000201,
              type: 'Unknown',
              finished: [264],
              constructed: [],
              destroyed: [],
            },
            {
              id: '11265385',
              icon: 'icons/races/templar/commanderieflags/civ_icon_medium_republic_of_genoa',
              pbgid: 5000207,
              type: 'Unknown',
              finished: [519],
              constructed: [],
              destroyed: [],
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
    expect(pools.player1.series.find(point => point.timestamp === 264)?.advancement).toBe(600);
    expect(pools.player1.series.find(point => point.timestamp === 519)?.advancement).toBe(2400);
    expect(pools.player1.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemLabel: 'Knights Hospitaller', deltaValue: 600 }),
      expect.objectContaining({ itemLabel: 'Republic of Genoa', deltaValue: 1800 }),
    ]));
  });
});
