import { buildPlayerDeployedPoolSeries } from '../../src/lib/aoe4/analysis/resourcePool';
import { resolveAllBuildOrders } from '../../src/lib/aoe4/parser/buildOrderResolver';
import { BuildOrderEntry, PlayerSummary, TimeSeriesResources } from '../../src/lib/aoe4/parser/gameSummaryParser';
import { StaticDataCache } from '../../src/lib/aoe4/types';

function makeResources(): TimeSeriesResources {
  return {
    timestamps: [0, 264, 360],
    food: [0, 0, 0],
    gold: [0, 0, 0],
    stone: [0, 0, 0],
    wood: [0, 0, 0],
    foodPerMin: [0, 0, 0],
    goldPerMin: [0, 0, 0],
    stonePerMin: [0, 0, 0],
    woodPerMin: [0, 0, 0],
    total: [0, 0, 0],
    military: [0, 0, 0],
    economy: [0, 0, 0],
    technology: [0, 0, 0],
    society: [0, 0, 0],
  };
}

function makePlayer(buildOrder: BuildOrderEntry[]): PlayerSummary {
  return {
    profileId: 1,
    name: 'Templar',
    civilization: 'knights_templar',
    team: 1,
    apm: 0,
    result: 'win',
    _stats: {
      ekills: 0,
      edeaths: 0,
      sqprod: 0,
      sqlost: 0,
      bprod: 0,
      upg: 0,
      totalcmds: 0,
    },
    actions: {
      feudalAge: [264],
      upgradeAgeDarkCom1Tem: [264],
    },
    scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
    totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
    resources: makeResources(),
    buildOrder,
  };
}

function makeStaticData(): StaticDataCache {
  return {
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
    ],
  };
}

describe('resolveAllBuildOrders (web)', () => {
  it('resolves Knights Templar unknown commanderie age-up choices by PBGID', () => {
    const player = makePlayer([{
      id: '11265377',
      icon: 'icons/races/templar/commanderieflags/civ_icon_medium_knight_hospitalier',
      pbgid: 5000201,
      type: 'Unknown',
      finished: [264],
      constructed: [],
      destroyed: [],
    }]);

    const resolved = resolveAllBuildOrders(player, makeStaticData());
    const pool = buildPlayerDeployedPoolSeries(player, resolved, 360);

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.resolved[0]).toEqual(expect.objectContaining({
      type: 'upgrade',
      name: 'Knights Hospitaller',
      produced: [264],
    }));
    expect(pool.series.find(point => point.timestamp === 264)?.advancement).toBe(600);
    expect(pool.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 264,
        band: 'advancement',
        itemLabel: 'Knights Hospitaller',
        deltaValue: 600,
      }),
    ]));
  });

  it('resolves Sengoku Yatai production from AoE4World unknown bucket 14', () => {
    const player = makePlayer([{
      id: '11266336',
      icon: 'icons/races/sengoku/units/yatai',
      pbgid: 9001316,
      type: 'Unit',
      finished: [],
      constructed: [],
      destroyed: [],
      unknown: {
        '14': [61, 116, 159],
      },
    }]);
    player.name = 'Sengoku';
    player.civilization = 'sengoku_daimyo';

    const resolved = resolveAllBuildOrders(player, makeStaticData());
    const pool = buildPlayerDeployedPoolSeries(player, resolved, 360);

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.resolved[0]).toEqual(expect.objectContaining({
      type: 'unit',
      name: 'Yatai',
      cost: expect.objectContaining({ wood: 125, total: 125 }),
      produced: [61, 116, 159],
    }));
    expect(pool.series.find(point => point.timestamp === 159)?.economic).toBe(375);
    expect(pool.series.find(point => point.timestamp === 159)?.militaryActive).toBe(0);
    expect(pool.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 61,
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: 125,
      }),
    ]));
  });
});
