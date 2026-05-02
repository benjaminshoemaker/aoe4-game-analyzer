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
        '15': [170],
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
      destroyed: [170],
    }));
    expect(pool.series.find(point => point.timestamp === 159)?.economic).toBe(375);
    expect(pool.series.find(point => point.timestamp === 170)?.economic).toBe(250);
    expect(pool.series.find(point => point.timestamp === 159)?.militaryActive).toBe(0);
    expect(pool.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 61,
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: 125,
      }),
      expect.objectContaining({
        timestamp: 170,
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: -125,
        deltaCount: -1,
      }),
    ]));
  });

  it('resolves confirmed nonstandard unknown buckets as deployed production timestamps', () => {
    const player = makePlayer([
      {
        id: '11119584',
        icon: 'icons/hud/age/age_display_persistent_2',
        pbgid: 108171,
        type: 'Age',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '10': [275] },
      },
      {
        id: 'generic-age-entry',
        icon: 'icons/hud/age/age_display_persistent_3',
        pbgid: 5000999,
        type: 'Age',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '10': [600] },
      },
      {
        id: '11191836',
        icon: 'icons/races/campaign/units/camel_trader',
        pbgid: 2762454,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '14': [100, 200] },
      },
      {
        id: '11160584',
        icon: 'icons/races/chinese/units/imperial_official',
        pbgid: 2631059,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '14': [0, 253, 333] },
      },
      {
        id: '11265429',
        icon: 'icons/races/templar/units/pilgrim',
        pbgid: 5000301,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '15': [355, 415] },
      },
      {
        id: '11254919',
        icon: 'icons/races/abbasid_historic/units/tower_of_the_sultan',
        pbgid: 2141356,
        type: 'Unit',
        finished: [],
        constructed: [1145],
        destroyed: [],
        unknown: { '6': [1344] },
      },
      {
        id: '11142995',
        icon: 'icons/races/common/units/ram',
        pbgid: 8635755,
        type: 'Unit',
        finished: [],
        constructed: [1128],
        destroyed: [],
        unknown: { '6': [1254] },
      },
      {
        id: '11258380',
        icon: 'icons/races/common/units/mangonel',
        pbgid: 7804932,
        type: 'Unit',
        finished: [],
        constructed: [1442],
        destroyed: [],
        unknown: { '6': [1613] },
      },
      {
        id: '11245398',
        icon: 'icons/races/byzantine/units/chierosiphon',
        pbgid: 2140765,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '6': [2505] },
      },
    ]);
    player.civilization = 'ayyubids';

    const resolved = resolveAllBuildOrders(player, {
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [],
    });
    const pool = buildPlayerDeployedPoolSeries(player, resolved, 2600);

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.resolved).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Feudal Age', produced: [275] }),
      expect.objectContaining({ name: 'Castle Age', produced: [600] }),
      expect.objectContaining({ name: 'Trade Caravan', produced: [100, 200] }),
      expect.objectContaining({ name: 'Imperial Official', produced: [253, 333] }),
      expect.objectContaining({ name: 'Pilgrim', produced: [355, 415] }),
      expect.objectContaining({ name: 'Tower of the Sultan', produced: [1344] }),
      expect.objectContaining({ name: 'Battering Ram', produced: [1254] }),
      expect.objectContaining({ name: 'Mangonel', produced: [1613] }),
      expect.objectContaining({ name: 'Cheirosiphon', produced: [2505] }),
    ]));
    expect(resolved.startingAssets).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Imperial Official', produced: [0] }),
    ]));
    expect(pool.series.find(point => point.timestamp === 415)?.economic).toBe(850);
    expect(pool.series.find(point => point.timestamp === 2505)?.militaryActive).toBe(2060);
  });
});
