import { buildPlayerDeployedPoolSeries, classifyResolvedItemBand, getDeferredCivilizationNotices } from '../../src/analysis/resourcePool';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../../src/parser/buildOrderResolver';
import { PlayerSummary } from '../../src/parser/gameSummaryParser';

function makeItem(overrides: Partial<ResolvedBuildItem>): ResolvedBuildItem {
  return {
    originalEntry: {
      id: overrides.id ?? 'test-item',
      icon: 'icons/test.png',
      pbgid: 1,
      type: 'Unit',
      finished: [],
      constructed: [],
      destroyed: []
    },
    type: 'unit',
    id: 'test-item',
    name: 'Test Item',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    tier: 1,
    tierMultiplier: 1,
    classes: [],
    produced: [],
    destroyed: [],
    civs: [],
    ...overrides
  };
}

function makePlayer(civilization: string = 'English'): PlayerSummary {
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
      totalcmds: 0
    },
    actions: {},
    scores: {
      total: 0,
      military: 0,
      economy: 0,
      technology: 0,
      society: 0
    },
    totalResourcesGathered: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0
    },
    totalResourcesSpent: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0
    },
    resources: {
      timestamps: [0, 60, 120],
      food: [0, 0, 0],
      gold: [0, 0, 0],
      stone: [0, 0, 0],
      wood: [0, 0, 0],
      foodPerMin: [200, 220, 210],
      goldPerMin: [100, 110, 90],
      stonePerMin: [20, 20, 20],
      woodPerMin: [180, 190, 195],
      total: [0, 0, 0],
      military: [0, 0, 0],
      economy: [0, 0, 0],
      technology: [0, 0, 0],
      society: [0, 0, 0],
      oliveoil: [0, 10, 20],
      oliveoilPerMin: [0, 30, 40]
    },
    buildOrder: []
  };
}

function makeBuildOrder(items: ResolvedBuildItem[]): ResolvedBuildOrder {
  return {
    startingAssets: [],
    resolved: items,
    unresolved: []
  };
}

describe('resource pool band classifier', () => {
  it('classifies villagers as economic', () => {
    const villager = makeItem({
      type: 'unit',
      id: 'villager-1',
      name: 'Villager',
      classes: ['worker', 'villager']
    });

    expect(classifyResolvedItemBand(villager, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies Chinese Imperial Official as economic', () => {
    const official = makeItem({
      type: 'unit',
      id: 'imperial-official-1',
      name: 'Imperial Official',
      classes: ['official', 'worker']
    });

    expect(classifyResolvedItemBand(official, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('marks economic entries as resource generators or infrastructure', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Chinese'),
      makeBuildOrder([
        makeItem({
          type: 'unit',
          id: 'villager-1',
          name: 'Villager',
          classes: ['worker', 'villager'],
          cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
          produced: [0],
        }),
        makeItem({
          type: 'building',
          id: 'farm-1',
          name: 'Farm',
          classes: ['building', 'farm', 'economy_building'],
          cost: { food: 0, wood: 75, gold: 0, stone: 0, total: 75 },
          produced: [30],
        }),
        makeItem({
          type: 'unit',
          id: 'imperial-official-1',
          name: 'Imperial Official',
          classes: ['official', 'worker'],
          cost: { food: 0, wood: 0, gold: 150, stone: 0, total: 150 },
          produced: [60],
        }),
      ]),
      120
    );

    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Villager',
        itemEconomicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Farm',
        itemEconomicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Imperial Official',
        itemEconomicRole: 'resourceInfrastructure',
      }),
    ]));

    const economicSnapshot = result.bandItemSnapshots
      ?.find(point => point.timestamp === 120)
      ?.bands.economic;

    expect(economicSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemLabel: 'Villager',
        itemEconomicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        itemLabel: 'Farm',
        itemEconomicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        itemLabel: 'Imperial Official',
        itemEconomicRole: 'resourceInfrastructure',
      }),
    ]));
  });

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
          '14': [61, 116, 159]
        }
      },
      type: 'unit',
      id: 'yatai',
      name: 'Yatai',
      classes: ['human', 'mobile_building', 'packable_building', 'yatai'],
      cost: { food: 0, wood: 125, gold: 0, stone: 0, total: 125 },
      produced: [61, 116, 159]
    });

    expect(classifyResolvedItemBand(yatai, { hasNavalMilitaryProduction: false })).toBe('economic');

    const result = buildPlayerDeployedPoolSeries(
      makePlayer('sengoku_daimyo'),
      makeBuildOrder([yatai]),
      180
    );

    expect(result.series.find(point => point.timestamp === 159)?.economic).toBe(375);
    expect(result.series.find(point => point.timestamp === 159)?.militaryActive).toBe(0);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 61,
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: 125
      })
    ]));
  });

  it('classifies military production buildings as military capacity', () => {
    const barracks = makeItem({
      type: 'building',
      id: 'barracks-1',
      name: 'Barracks',
      classes: ['building', 'military_production_building', 'military_only_production']
    });

    expect(classifyResolvedItemBand(barracks, { hasNavalMilitaryProduction: false })).toBe('militaryCapacity');
  });

  it('classifies non-landmark Town Center as economic even with town_center_or_landmark class', () => {
    const townCenter = makeItem({
      type: 'building',
      id: 'town-center-1',
      name: 'Town Center',
      classes: ['building', 'town_center', 'town_center_non_capital', 'town_center_or_landmark']
    });

    expect(classifyResolvedItemBand(townCenter, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies defensive structures as defensive', () => {
    const keep = makeItem({
      type: 'building',
      id: 'keep-3',
      name: 'Keep',
      classes: ['building', 'defensive_structure', 'castle']
    });

    expect(classifyResolvedItemBand(keep, { hasNavalMilitaryProduction: false })).toBe('defensive');
  });

  it('classifies technologies as research', () => {
    const upgrade = makeItem({
      type: 'upgrade',
      id: 'wheelbarrow-2',
      name: 'Wheelbarrow',
      classes: ['economic_upgrade']
    });

    expect(classifyResolvedItemBand(upgrade, { hasNavalMilitaryProduction: false })).toBe('research');
  });

  it('classifies Blacksmith as military capacity', () => {
    const blacksmith = makeItem({
      type: 'building',
      id: 'blacksmith-2',
      name: 'Blacksmith',
      classes: ['building', 'blacksmith', 'research_building']
    });

    expect(classifyResolvedItemBand(blacksmith, { hasNavalMilitaryProduction: false })).toBe('militaryCapacity');
  });

  it('classifies population-only buildings as population cap', () => {
    const house = makeItem({
      type: 'building',
      id: 'house-1',
      name: 'House',
      classes: ['building', 'house']
    });

    expect(classifyResolvedItemBand(house, { hasNavalMilitaryProduction: false })).toBe('populationCap');
  });

  it('classifies Manor as economic (not population cap)', () => {
    const manor = makeItem({
      type: 'building',
      id: 'manor-2',
      name: 'Manor',
      classes: ['building', 'house', 'economy_building']
    });

    expect(classifyResolvedItemBand(manor, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies Ryokan as advancement (not population cap)', () => {
    const ryokan = makeItem({
      type: 'building',
      id: 'ryokan-2',
      name: 'Ryokan',
      classes: ['building', 'landmark', 'house']
    });

    expect(classifyResolvedItemBand(ryokan, { hasNavalMilitaryProduction: false })).toBe('advancement');
  });

  it('classifies Ger and Pasture as economic (not population cap)', () => {
    const ger = makeItem({
      type: 'building',
      id: 'ger-2',
      name: 'Ger',
      classes: ['building', 'population_building', 'resource_drop_off']
    });
    const pasture = makeItem({
      type: 'building',
      id: 'pasture-2',
      name: 'Pasture',
      classes: ['building', 'population_building', 'economy_building']
    });

    expect(classifyResolvedItemBand(ger, { hasNavalMilitaryProduction: false })).toBe('economic');
    expect(classifyResolvedItemBand(pasture, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies non-landmark monastery as economic', () => {
    const monastery = makeItem({
      type: 'building',
      id: 'monastery-2',
      name: 'Monastery',
      classes: ['building', 'monastery', 'religious_building']
    });

    expect(classifyResolvedItemBand(monastery, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies religious units as military army value', () => {
    const monk = makeItem({
      type: 'unit',
      id: 'monk-3',
      name: 'Monk',
      classes: ['monk', 'land_military', 'military']
    });
    const imam = makeItem({
      type: 'unit',
      id: 'imam-2',
      name: 'Imam',
      classes: ['imam', 'land_military', 'military']
    });

    expect(classifyResolvedItemBand(monk, { hasNavalMilitaryProduction: false })).toBe('militaryActive');
    expect(classifyResolvedItemBand(imam, { hasNavalMilitaryProduction: false })).toBe('militaryActive');
  });

  it('classifies Malian cattle as economic units', () => {
    const cattle = makeItem({
      type: 'unit',
      id: 'cattle',
      name: 'Cattle',
      classes: ['cattle'],
      cost: { food: 0, wood: 0, gold: 90, stone: 0, total: 90 }
    });

    expect(classifyResolvedItemBand(cattle, { hasNavalMilitaryProduction: false })).toBe('economic');
  });

  it('classifies Shaolin Monastery landmark as advancement', () => {
    const shaolin = makeItem({
      type: 'building',
      id: 'shaolin-monastery-2',
      name: 'Shaolin Monastery',
      classes: ['building', 'landmark', 'monastery', 'military_production_building']
    });

    expect(classifyResolvedItemBand(shaolin, { hasNavalMilitaryProduction: false })).toBe('advancement');
  });

  it('classifies age-up upgrades as advancement', () => {
    const ageUp = makeItem({
      type: 'upgrade',
      id: 'age-up-to-castle',
      name: 'Castle Age',
      classes: ['age_up_upgrade']
    });

    expect(classifyResolvedItemBand(ageUp, { hasNavalMilitaryProduction: false })).toBe('advancement');
  });

  it('treats docks as economic unless naval military production exists', () => {
    const dock = makeItem({
      type: 'building',
      id: 'dock-1',
      name: 'Dock',
      classes: ['building', 'naval_production_building', 'military_only_production', 'resource_drop_off', 'trade_dock']
    });

    expect(classifyResolvedItemBand(dock, { hasNavalMilitaryProduction: false })).toBe('economic');
    expect(classifyResolvedItemBand(dock, { hasNavalMilitaryProduction: true })).toBe('militaryCapacity');
  });
});

describe('buildPlayerDeployedPoolSeries', () => {
  it('reconstructs pool bands over time with immediate destruction subtraction', () => {
    const items: ResolvedBuildItem[] = [
      makeItem({
        type: 'unit',
        id: 'villager-1',
        name: 'Villager',
        classes: ['worker', 'villager'],
        cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
        produced: [0, 10],
        destroyed: [20]
      }),
      makeItem({
        type: 'building',
        id: 'barracks-1',
        name: 'Barracks',
        classes: ['military_production_building', 'military_only_production'],
        cost: { food: 0, wood: 150, gold: 0, stone: 0, total: 150 },
        produced: [30],
        destroyed: []
      }),
      makeItem({
        type: 'building',
        id: 'house-1',
        name: 'House',
        classes: ['building', 'house'],
        cost: { food: 0, wood: 50, gold: 0, stone: 0, total: 50 },
        produced: [35],
        destroyed: []
      }),
      makeItem({
        type: 'unit',
        id: 'spearman-1',
        name: 'Spearman',
        classes: ['military', 'infantry'],
        cost: { food: 60, wood: 20, gold: 0, stone: 0, total: 80 },
        produced: [40, 80],
        destroyed: [100]
      }),
      makeItem({
        type: 'building',
        id: 'keep-3',
        name: 'Keep',
        classes: ['defensive_structure', 'castle'],
        cost: { food: 0, wood: 0, gold: 0, stone: 800, total: 800 },
        produced: [50],
        destroyed: [110]
      }),
      makeItem({
        type: 'upgrade',
        id: 'wheelbarrow-2',
        name: 'Wheelbarrow',
        classes: ['economic_upgrade'],
        cost: { food: 200, wood: 0, gold: 0, stone: 0, total: 200 },
        produced: [60],
        destroyed: []
      }),
      makeItem({
        type: 'upgrade',
        id: 'castle-age-advancement',
        name: 'Castle Age',
        classes: ['age_up_upgrade'],
        cost: { food: 1200, wood: 0, gold: 0, stone: 0, total: 1200 },
        produced: [70],
        destroyed: []
      })
    ];

    const result = buildPlayerDeployedPoolSeries(makePlayer(), makeBuildOrder(items), 120);

    const at120 = result.series.find((point) => point.timestamp === 120);
    expect(at120).toBeDefined();
    expect(at120?.economic).toBe(50);
    expect(at120?.populationCap).toBe(50);
    expect(at120?.militaryCapacity).toBe(150);
    expect(at120?.militaryActive).toBe(80);
    expect(at120?.defensive).toBe(0);
    expect(at120?.research).toBe(200);
    expect(at120?.advancement).toBe(1200);
    expect(at120?.total).toBe(1730);

    for (const point of result.series) {
      expect(point.total).toBe(
        point.economic +
        point.populationCap +
        point.militaryCapacity +
        point.militaryActive +
        point.defensive +
        point.research +
        point.advancement
      );
    }

    expect((result.bandItemDeltas ?? []).length).toBeGreaterThan(0);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Villager',
        deltaCount: 1,
      }),
      expect.objectContaining({
        band: 'militaryActive',
        itemLabel: 'Spearman',
        deltaCount: 1,
      }),
      expect.objectContaining({
        band: 'research',
        itemLabel: 'Wheelbarrow',
        deltaCount: 1,
      }),
      expect.objectContaining({
        band: 'advancement',
        itemLabel: 'Castle Age',
        deltaCount: 1,
      }),
    ]));

    const snapshotAt120 = (result.bandItemSnapshots ?? []).find(point => point.timestamp === 120);
    expect(snapshotAt120).toBeDefined();
    const economicSum = (snapshotAt120?.bands.economic ?? []).reduce((sum, entry) => sum + entry.value, 0);
    const militaryActiveSum = (snapshotAt120?.bands.militaryActive ?? []).reduce((sum, entry) => sum + entry.value, 0);
    expect(economicSum).toBeCloseTo(at120?.economic ?? 0, 2);
    expect(militaryActiveSum).toBeCloseTo(at120?.militaryActive ?? 0, 2);
  });

  it('splits Japanese Farmhouse investment across economic and population cap', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Japanese'),
      makeBuildOrder([
        makeItem({
          type: 'building',
          id: 'farmhouse-2',
          name: 'Farmhouse',
          classes: ['building', 'house', 'economy_building', 'resource_drop_off'],
          cost: { food: 0, wood: 75, gold: 0, stone: 0, total: 75 },
          produced: [30],
          destroyed: []
        })
      ]),
      120
    );

    const at120 = result.series.find(point => point.timestamp === 120);
    expect(at120).toBeDefined();
    expect(at120?.economic).toBeCloseTo(37.5, 5);
    expect(at120?.populationCap).toBeCloseTo(37.5, 5);
    expect(at120?.total).toBeCloseTo(75, 5);
  });

  it('does not apply tier multipliers to building costs in pool accounting', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Mongols'),
      makeBuildOrder([
        makeItem({
          type: 'building',
          id: 'deer-stones-2',
          name: 'Deer Stones',
          classes: ['building', 'landmark'],
          cost: { food: 0, wood: 400, gold: 200, stone: 0, total: 600 },
          tier: 2,
          tierMultiplier: 2,
          produced: [100],
          destroyed: []
        })
      ]),
      240
    );

    const at240 = result.series.find(point => point.timestamp === 240);
    expect(at240).toBeDefined();
    expect(at240?.advancement).toBe(600);
    expect(at240?.total).toBe(600);
  });

  it('uses base army value and applies upgraded-unit deaths to older active tiers', () => {
    const player = makePlayer('English');
    player.resources.timestamps = [0, 10, 20, 30, 90, 100, 110, 120];

    const result = buildPlayerDeployedPoolSeries(
      player,
      makeBuildOrder([
        makeItem({
          type: 'unit',
          id: 'spearman-2',
          name: 'Hardened Spearman',
          classes: ['military', 'infantry', 'spearman'],
          cost: { food: 60, wood: 20, gold: 0, stone: 0, total: 80 },
          tier: 2,
          tierMultiplier: 1.2,
          produced: [10, 20, 30],
          destroyed: []
        }),
        makeItem({
          type: 'unit',
          id: 'spearman-3',
          name: 'Veteran Spearman',
          classes: ['military', 'infantry', 'spearman'],
          cost: { food: 60, wood: 20, gold: 0, stone: 0, total: 80 },
          tier: 3,
          tierMultiplier: 1.35,
          produced: [100],
          destroyed: [90, 110, 120]
        })
      ]),
      120
    );

    expect(result.series.find(point => point.timestamp === 30)?.militaryActive).toBe(240);
    expect(result.series.find(point => point.timestamp === 90)?.militaryActive).toBe(160);
    expect(result.series.find(point => point.timestamp === 120)?.militaryActive).toBe(80);
    expect(result.bandItemSnapshots?.find(point => point.timestamp === 120)?.bands.militaryActive).toEqual([
      expect.objectContaining({
        itemLabel: 'Hardened Spearman',
        value: 80,
        count: 1,
      }),
    ]);
  });

  it('ignores destroyed events that arrive before an item is produced', () => {
    const player = makePlayer('Macedonian Dynasty');
    player.resources.timestamps = [0, 175, 283, 360];

    const result = buildPlayerDeployedPoolSeries(
      player,
      makeBuildOrder([
        makeItem({
          type: 'building',
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
    const player = makePlayer();
    player.resources.timestamps = [0, 100, 120];

    const result = buildPlayerDeployedPoolSeries(
      player,
      makeBuildOrder([
        makeItem({
          type: 'unit',
          id: 'mounted-samurai-1',
          name: 'Mounted Samurai',
          classes: ['military', 'cavalry'],
          cost: { food: 189, wood: 0, gold: 135, stone: 0, total: 324 },
          produced: [100],
          destroyed: [100]
        })
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
        deltaCount: 1
      }),
      expect.objectContaining({
        timestamp: 100,
        band: 'militaryActive',
        itemLabel: 'Mounted Samurai',
        deltaValue: -324,
        deltaCount: -1
      })
    ]));
    expect(result.bandItemSnapshots?.find(point => point.timestamp === 100)?.bands.militaryActive).toEqual([]);
  });

  it('attaches research categories for breakdown rendering', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      makeBuildOrder([
        makeItem({
          type: 'upgrade',
          id: 'wheelbarrow-2',
          name: 'Wheelbarrow',
          classes: ['economic_upgrade'],
          cost: { food: 150, wood: 0, gold: 0, stone: 0, total: 150 },
          produced: [90],
          destroyed: []
        }),
        makeItem({
          type: 'upgrade',
          id: 'steeled-arrow-2',
          name: 'Steeled Arrow',
          classes: ['military_upgrade', 'ranged_attack_upgrade'],
          cost: { food: 0, wood: 0, gold: 175, stone: 0, total: 175 },
          produced: [100],
          destroyed: []
        })
      ]),
      180
    );

    const categories = (result.bandItemDeltas ?? [])
      .filter(event => event.band === 'research')
      .map(event => event.itemCategory);

    expect(categories).toEqual(expect.arrayContaining(['economic', 'military']));
  });

  it('includes starting assets in band breakdown deltas for single-source composition', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      {
        startingAssets: [makeItem({
          type: 'building',
          id: 'town-center-1',
          name: 'Town Center',
          classes: ['building', 'town_center'],
          cost: { food: 0, wood: 400, gold: 0, stone: 350, total: 750 },
          produced: [0],
          destroyed: []
        })],
        resolved: [makeItem({
          type: 'unit',
          id: 'villager-1',
          name: 'Villager',
          classes: ['worker', 'villager'],
          cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
          produced: [15],
          destroyed: []
        })],
        unresolved: []
      },
      120
    );

    const labels = (result.bandItemDeltas ?? []).map(event => event.itemLabel);
    expect(labels).toContain('Villager');
    expect(labels).toContain('Town Center');
  });

  it('includes landmark town centers in band breakdown deltas when produced later', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer(),
      {
        startingAssets: [],
        resolved: [makeItem({
          type: 'building',
          id: 'capital-town-center-1',
          name: 'Capital Town Center',
          classes: ['building', 'landmark', 'town_center_or_landmark'],
          cost: { food: 0, wood: 400, gold: 0, stone: 350, total: 750 },
          produced: [500],
          destroyed: []
        })],
        unresolved: []
      },
      1200
    );

    const labels = (result.bandItemDeltas ?? []).map(event => event.itemLabel);
    expect(labels).toContain('Capital Town Center');
  });

  it('includes non-landmark Town Center in economic band breakdown when produced later', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Knights Templar'),
      {
        startingAssets: [],
        resolved: [makeItem({
          type: 'building',
          id: 'town-center-1',
          name: 'Town Center',
          classes: ['building', 'town_center', 'town_center_non_capital', 'town_center_or_landmark'],
          cost: { food: 0, wood: 400, gold: 0, stone: 350, total: 750 },
          produced: [320],
          destroyed: []
        })],
        unresolved: []
      },
      1200
    );

    const tcEntry = (result.bandItemDeltas ?? []).find(event => event.itemLabel === 'Town Center' && event.band === 'economic');
    expect(tcEntry).toBeDefined();
    expect(tcEntry?.deltaValue).toBe(750);
    expect(tcEntry?.deltaCount).toBe(1);
  });

  it('injects a baseline Imperial Official for Chinese when AoE4World build order omits it', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Chinese'),
      makeBuildOrder([]),
      120
    );

    const at120 = result.series.find(point => point.timestamp === 120);
    expect(at120).toBeDefined();
    expect(at120?.economic).toBe(150);
    const officialEntry = (result.bandItemDeltas ?? []).find(event => event.itemLabel === 'Imperial Official');
    expect(officialEntry).toBeDefined();
    expect(officialEntry?.band).toBe('economic');
    expect(officialEntry?.deltaValue).toBe(150);
    expect(officialEntry?.deltaCount).toBe(1);
  });

  it('includes olive oil in gather-rate-per-minute totals when present', () => {
    const result = buildPlayerDeployedPoolSeries(makePlayer('Byzantines'), makeBuildOrder([]), 120);

    expect(result.gatherRateSeries).toEqual([
      { timestamp: 0, ratePerMin: 500 },
      { timestamp: 60, ratePerMin: 570 },
      { timestamp: 120, ratePerMin: 555 }
    ]);
  });

  it('counts produced Malian cattle as economic deployed value', () => {
    const result = buildPlayerDeployedPoolSeries(
      makePlayer('Malians'),
      makeBuildOrder([
        makeItem({
          type: 'unit',
          id: 'cattle',
          name: 'Cattle',
          classes: ['cattle'],
          cost: { food: 0, wood: 0, gold: 90, stone: 0, total: 90 },
          produced: [120, 180],
          destroyed: []
        })
      ]),
      240
    );

    const at240 = result.series.find(point => point.timestamp === 240);
    expect(at240?.economic).toBe(180);
    expect(at240?.militaryActive).toBe(0);
    expect(result.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Cattle',
        deltaValue: 90,
        deltaCount: 1,
      }),
    ]));
  });
});

describe('getDeferredCivilizationNotices', () => {
  it('flags Delhi and Jeanne d\'Arc civilizations as deferred', () => {
    expect(getDeferredCivilizationNotices('Delhi Sultanate').length).toBeGreaterThan(0);
    expect(getDeferredCivilizationNotices('jeanne_darc').length).toBeGreaterThan(0);
    expect(getDeferredCivilizationNotices('English')).toEqual([]);
  });
});
