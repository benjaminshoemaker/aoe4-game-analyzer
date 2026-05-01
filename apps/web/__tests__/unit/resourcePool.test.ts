import { buildPlayerDeployedPoolSeries, classifyResolvedItemBand } from '../../src/lib/aoe4/analysis/resourcePool';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../../src/lib/aoe4/parser/buildOrderResolver';
import { PlayerSummary } from '../../src/lib/aoe4/parser/gameSummaryParser';

function makeItem(overrides: Partial<ResolvedBuildItem>): ResolvedBuildItem {
  return {
    originalEntry: {
      id: overrides.id ?? 'test-item',
      icon: 'icons/test.png',
      pbgid: 1,
      type: 'Building',
      finished: [],
      constructed: [],
      destroyed: [],
    },
    type: 'building',
    id: 'test-item',
    name: 'Test Item',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    tier: 1,
    tierMultiplier: 1,
    classes: [],
    produced: [],
    destroyed: [],
    civs: [],
    ...overrides,
  };
}

function makePlayer(civilization = 'Macedonian Dynasty'): PlayerSummary {
  return {
    profileId: 1,
    name: 'Player',
    civilization,
    team: 1,
    apm: 100,
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
    actions: {},
    scores: {
      total: 0,
      military: 0,
      economy: 0,
      technology: 0,
      society: 0,
    },
    totalResourcesGathered: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    totalResourcesSpent: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    resources: {
      timestamps: [0, 175, 283, 360],
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
      oliveoil: [0, 0, 0, 0],
      oliveoilPerMin: [0, 0, 0, 0],
    },
    buildOrder: [],
  };
}

function makeBuildOrder(items: ResolvedBuildItem[]): ResolvedBuildOrder {
  return {
    startingAssets: [],
    resolved: items,
    unresolved: [],
  };
}

describe('buildPlayerDeployedPoolSeries (web)', () => {
  it('classifies Sengoku Yatai as deployed economic value', () => {
    const yatai = makeItem({
      originalEntry: {
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
      },
      type: 'unit',
      id: 'yatai',
      name: 'Yatai',
      classes: ['human', 'mobile_building', 'packable_building', 'yatai'],
      cost: { food: 0, wood: 125, gold: 0, stone: 0, total: 125 },
      produced: [61, 116, 159],
    });

    expect(classifyResolvedItemBand(yatai, { hasNavalMilitaryProduction: false })).toBe('economic');

    const result = buildPlayerDeployedPoolSeries(
      makePlayer('sengoku_daimyo'),
      makeBuildOrder([yatai]),
      360
    );

    expect(result.series.find(point => point.timestamp === 159)?.economic).toBe(375);
    expect(result.series.find(point => point.timestamp === 159)?.militaryActive).toBe(0);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 61,
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: 125,
      }),
    ]));
  });

  it('ignores destroyed events that arrive before an item is produced', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      makeBuildOrder([
        makeItem({
          id: 'hippodrome-of-constantinople-2',
          name: 'Hippodrome of Constantinople',
          classes: ['building', 'landmark'],
          cost: { food: 0, wood: 400, gold: 200, stone: 0, total: 600 },
          produced: [283],
          destroyed: [175],
        }),
      ]),
      360
    );

    const beforeProduced = result.series.find(point => point.timestamp === 175);
    const afterProduced = result.series.find(point => point.timestamp === 283);

    expect(beforeProduced?.advancement).toBe(0);
    expect(beforeProduced?.total).toBe(0);
    expect(afterProduced?.advancement).toBe(600);
    expect(afterProduced?.total).toBe(600);
    expect(result.bandItemDeltas).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'advancement',
        itemLabel: 'Hippodrome of Constantinople',
        deltaValue: -600,
      }),
    ]));
  });

  it('preserves same-timestamp production and destruction as separate item deltas', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      makeBuildOrder([
        makeItem({
          type: 'unit',
          id: 'mounted-samurai-1',
          name: 'Mounted Samurai',
          classes: ['military', 'cavalry'],
          cost: { food: 189, wood: 0, gold: 135, stone: 0, total: 324 },
          produced: [100],
          destroyed: [100],
        }),
      ]),
      120
    );

    const at100 = result.series.find(point => point.timestamp === 100);
    expect(at100?.militaryActive).toBe(0);
    expect(at100?.total).toBe(0);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 100,
        band: 'militaryActive',
        itemLabel: 'Mounted Samurai',
        deltaValue: 324,
        deltaCount: 1,
      }),
      expect.objectContaining({
        timestamp: 100,
        band: 'militaryActive',
        itemLabel: 'Mounted Samurai',
        deltaValue: -324,
        deltaCount: -1,
      }),
    ]));
    expect(result.bandItemSnapshots?.find(point => point.timestamp === 100)?.bands.militaryActive).toEqual([]);
  });

  it('counts started advancement upgrades before completion when the summary exposes constructed timestamps', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      makeBuildOrder([
        makeItem({
          originalEntry: {
            id: 'castle-wing',
            icon: 'icons/castle-wing.png',
            pbgid: 2,
            type: 'Upgrade',
            constructed: [283],
            finished: [360],
            destroyed: [],
          },
          type: 'upgrade',
          id: 'castle-age-up-wing',
          name: 'Castle Age Wing',
          classes: ['age_up_upgrade'],
          cost: { food: 1200, wood: 0, gold: 600, stone: 0, total: 1800 },
          produced: [360],
        }),
      ]),
      420
    );

    const started = result.series.find(point => point.timestamp === 283);
    const finished = result.series.find(point => point.timestamp === 360);

    expect(started?.advancement).toBe(1800);
    expect(started?.total).toBe(1800);
    expect(finished?.advancement).toBe(1800);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 283,
        band: 'advancement',
        itemLabel: 'Castle Age Wing',
        deltaValue: 1800,
      }),
    ]));
    expect(result.bandItemDeltas).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 360,
        band: 'advancement',
        itemLabel: 'Castle Age Wing',
        deltaValue: 1800,
      }),
    ]));
  });
});
