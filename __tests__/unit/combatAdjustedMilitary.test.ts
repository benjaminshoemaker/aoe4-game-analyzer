import { buildCombatAdjustedSeries } from '../../src/analysis/combatAdjustedMilitary';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../../src/parser/buildOrderResolver';
import { Technology, Unit, UnitWithValue } from '../../src/types';
import { evaluateCombatValue } from '../../src/data/combatValueEngine';

function makeUnit(params: {
  id: string;
  name: string;
  cost: number;
  classes: string[];
  produced: number[];
  destroyed?: number[];
}): ResolvedBuildItem {
  return {
    originalEntry: {
      id: params.id,
      icon: `${params.id}.png`,
      pbgid: 1,
      type: 'Unit',
      finished: params.produced,
      constructed: [],
      destroyed: params.destroyed ?? [],
    },
    type: 'unit',
    id: params.id,
    name: params.name,
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: params.cost },
    tier: 1,
    tierMultiplier: 1,
    classes: params.classes,
    produced: params.produced,
    destroyed: params.destroyed ?? [],
    civs: [],
  };
}

function makeUpgrade(params: { id: string; icon: string; produced: number[] }): ResolvedBuildItem {
  return {
    originalEntry: {
      id: params.id,
      icon: params.icon,
      pbgid: 2,
      type: 'Upgrade',
      finished: params.produced,
      constructed: [],
      destroyed: [],
    },
    type: 'upgrade',
    id: params.id,
    name: params.id,
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 175 },
    tier: 1,
    tierMultiplier: 1,
    classes: ['military_upgrade'],
    produced: params.produced,
    destroyed: [],
    civs: [],
  };
}

function buildOrder(items: ResolvedBuildItem[]): ResolvedBuildOrder {
  return {
    startingAssets: [],
    resolved: items,
    unresolved: [],
  };
}

describe('buildCombatAdjustedSeries', () => {
  const bloomeryTech: Technology = {
    id: 'bloomery-2',
    baseId: 'bloomery',
    pbgid: 1,
    name: 'Bloomery',
    age: 2,
    civs: ['ja'],
    costs: { food: 100, wood: 0, gold: 0, stone: 0 },
    classes: ['military_upgrade'],
    icon: 'bloomery.png',
    effects: [
      {
        property: 'meleeAttack',
        select: {
          class: [['melee']]
        },
        effect: 'change',
        value: 1,
        type: 'passive',
      }
    ]
  };

  const spearmanCatalogUnit: Unit = {
    id: 'spearman-2',
    name: 'Hardened Spearman',
    baseId: 'spearman',
    pbgid: 11,
    civs: ['ja'],
    costs: { food: 60, wood: 20 },
    classes: ['infantry', 'melee', 'spearman'],
    displayClasses: ['Infantry'],
    age: 2,
    icon: 'spearman-2.png',
    hitpoints: 90,
    armor: [
      { type: 'melee', value: 0 },
      { type: 'ranged', value: 0 },
      { type: 'fire', value: 0 },
    ],
    weapons: [
      {
        name: 'Spear',
        type: 'melee',
        damage: 8,
        speed: 1.5,
        range: { min: 0, max: 0.3 },
        modifiers: [],
      }
    ],
    movement: { speed: 1.1 },
  };

  const knightCatalogUnit: Unit = {
    id: 'knight',
    name: 'Knight',
    baseId: 'knight',
    pbgid: 12,
    civs: ['fr'],
    costs: { food: 140, gold: 100 },
    classes: ['cavalry', 'heavy_melee_cavalry', 'melee'],
    displayClasses: ['Cavalry'],
    age: 2,
    icon: 'knight.png',
    hitpoints: 190,
    armor: [
      { type: 'melee', value: 2 },
      { type: 'ranged', value: 2 },
      { type: 'fire', value: 0 },
    ],
    weapons: [
      {
        name: 'Sword',
        type: 'melee',
        damage: 19,
        speed: 1.38,
        range: { min: 0, max: 0.3 },
        modifiers: [],
      }
    ],
    movement: { speed: 1.25 },
  };

  it('adds upgrade influence on top of counter-adjusted military values over time', () => {
    const player1 = buildOrder([
      makeUnit({
        id: 'spearman',
        name: 'Spearman',
        cost: 80,
        classes: ['Spear', 'Light Melee Infantry'],
        produced: [0],
      }),
      makeUnit({
        id: 'spearman',
        name: 'Spearman',
        cost: 80,
        classes: ['Spear', 'Light Melee Infantry'],
        produced: [0],
      }),
      makeUnit({
        id: 'spearman',
        name: 'Spearman',
        cost: 80,
        classes: ['Spear', 'Light Melee Infantry'],
        produced: [0],
      }),
      makeUpgrade({
        id: 'upgrade-melee-damage-1',
        icon: 'icons/races/common/upgrades/melee_damage_technology_1',
        produced: [10],
      }),
    ]);

    const player2 = buildOrder([
      makeUnit({
        id: 'knight',
        name: 'Knight',
        cost: 240,
        classes: ['Heavy Melee Cavalry'],
        produced: [0],
      }),
    ]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        },
        {
          timestamp: 20,
          militaryActive: 240,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        },
        {
          timestamp: 20,
          militaryActive: 240,
        }
      ],
      timelineTimestamps: [0, 20],
      duration: 20,
      technologyCatalog: [bloomeryTech],
    });

    const atZero = points.find(point => point.timestamp === 0);
    const atTwenty = points.find(point => point.timestamp === 20);

    expect(atZero).toBeDefined();
    expect(atTwenty).toBeDefined();
    expect((atTwenty?.player1AdjustedMilitaryActive ?? 0)).toBeGreaterThan(
      atZero?.player1AdjustedMilitaryActive ?? 0
    );
    expect((atTwenty?.player1UpgradeMultiplier ?? 1)).toBeGreaterThan(1);
    expect((atZero?.player1CounterAdjustedMilitaryActive ?? 0)).toBeCloseTo(
      atTwenty?.player1CounterAdjustedMilitaryActive ?? 0,
      2
    );
    expect((atTwenty?.player1CounterAdjustedMilitaryActive ?? 0) * (atTwenty?.player1UpgradeMultiplier ?? 0))
      .toBeCloseTo(atTwenty?.player1AdjustedMilitaryActive ?? 0, 1);
  });

  it('uses military-active raw values from pool series as the single raw source', () => {
    const player1 = buildOrder([
      makeUnit({
        id: 'spearman',
        name: 'Spearman',
        cost: 80,
        classes: ['Spear', 'Light Melee Infantry'],
        produced: [0],
      }),
    ]);

    const player2 = buildOrder([
      makeUnit({
        id: 'knight',
        name: 'Knight',
        cost: 240,
        classes: ['Heavy Melee Cavalry'],
        produced: [0],
      }),
    ]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 999,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 333,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
    });

    const atZero = points.find(point => point.timestamp === 0);
    expect(atZero).toBeDefined();
    expect(atZero?.player1RawMilitaryActive).toBe(999);
    expect(atZero?.player2RawMilitaryActive).toBe(333);
    expect((atZero?.player1CounterAdjustedMilitaryActive ?? 0)).toBeGreaterThan(0);
    expect((atZero?.player2CounterAdjustedMilitaryActive ?? 0)).toBeGreaterThan(0);
    expect((atZero?.player1AdjustedMilitaryActive ?? 0)).toBeCloseTo(
      atZero?.player1CounterAdjustedMilitaryActive ?? 0,
      2
    );
    expect((atZero?.player2AdjustedMilitaryActive ?? 0)).toBeCloseTo(
      atZero?.player2CounterAdjustedMilitaryActive ?? 0,
      2
    );
  });

  it('derives counter ratios from military-active composition and excludes economic units', () => {
    const player1 = buildOrder([
      makeUnit({
        id: 'monk',
        name: 'Monk',
        cost: 100,
        classes: ['Monk', 'Religious Unit'],
        produced: [0],
      }),
    ]);

    const player2 = buildOrder([
      makeUnit({
        id: 'knight',
        name: 'Knight',
        cost: 240,
        classes: ['Heavy Melee Cavalry'],
        produced: [0],
      }),
    ]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 400,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 400,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
    });

    const atZero = points.find(point => point.timestamp === 0);
    expect(atZero).toBeDefined();
    expect(atZero?.player1CounterAdjustedMilitaryActive).toBeCloseTo(400, 2);
    expect(atZero?.player2CounterAdjustedMilitaryActive).toBeCloseTo(400, 2);
    expect(atZero?.player1AdjustedMilitaryActive).toBeCloseTo(400, 2);
    expect(atZero?.player2AdjustedMilitaryActive).toBeCloseTo(400, 2);
  });

  it('applies combat upgrades discovered from static-data technologies (for example bloomery)', () => {
    const player1 = buildOrder([
      makeUnit({
        id: 'spearman-2',
        name: 'Hardened Spearman',
        cost: 96,
        classes: ['infantry', 'melee', 'spearman'],
        produced: [0],
      }),
      makeUnit({
        id: 'spearman-2',
        name: 'Hardened Spearman',
        cost: 96,
        classes: ['infantry', 'melee', 'spearman'],
        produced: [0],
      }),
      makeUpgrade({
        id: 'bloomery-2',
        icon: 'icons/custom/not_in_upgrade_mappings',
        produced: [10],
      }),
    ]);

    const player2 = buildOrder([
      makeUnit({
        id: 'spearman-2',
        name: 'Hardened Spearman',
        cost: 96,
        classes: ['infantry', 'melee', 'spearman'],
        produced: [0],
      }),
      makeUnit({
        id: 'spearman-2',
        name: 'Hardened Spearman',
        cost: 96,
        classes: ['infantry', 'melee', 'spearman'],
        produced: [0],
      }),
    ]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 192,
        },
        {
          timestamp: 20,
          militaryActive: 192,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 192,
        },
        {
          timestamp: 20,
          militaryActive: 192,
        }
      ],
      player1MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 96,
          deltaCount: 1,
        },
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 96,
          deltaCount: 1,
        },
      ],
      player2MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 96,
          deltaCount: 1,
        },
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 96,
          deltaCount: 1,
        },
      ],
      timelineTimestamps: [0, 20],
      duration: 20,
      unitCatalog: [spearmanCatalogUnit],
      technologyCatalog: [bloomeryTech],
    });

    const atZero = points.find(point => point.timestamp === 0);
    const atTwenty = points.find(point => point.timestamp === 20);

    expect(atZero).toBeDefined();
    expect(atTwenty).toBeDefined();
    expect(atZero?.player1UpgradeMultiplier).toBeCloseTo(1, 4);
    expect((atTwenty?.player1UpgradeMultiplier ?? 1)).toBeGreaterThan(1);
    expect((atTwenty?.player1AdjustedMilitaryActive ?? 0)).toBeGreaterThan(
      atTwenty?.player1CounterAdjustedMilitaryActive ?? 0
    );
  });

  it('derives matchup composition from military-active band deltas when provided', () => {
    const player1 = buildOrder([
      makeUnit({
        id: 'monk',
        name: 'Monk',
        cost: 100,
        classes: ['Monk', 'Religious Unit'],
        produced: [0],
      }),
    ]);

    const player2 = buildOrder([
      makeUnit({
        id: 'knight',
        name: 'Knight',
        cost: 240,
        classes: ['Heavy Melee Cavalry'],
        produced: [0],
      }),
    ]);

    const baselinePoints = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
      unitCatalog: [spearmanCatalogUnit, knightCatalogUnit],
    });

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      player1MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 240,
          deltaCount: 3,
        }
      ],
      player2MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:knight',
          itemLabel: 'Knight',
          deltaValue: 240,
          deltaCount: 1,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
      unitCatalog: [spearmanCatalogUnit, knightCatalogUnit],
    });

    const baselineAtZero = baselinePoints.find(point => point.timestamp === 0);
    const atZero = points.find(point => point.timestamp === 0);
    expect(baselineAtZero).toBeDefined();
    expect(atZero).toBeDefined();
    expect(atZero?.player1RawMilitaryActive).toBe(240);
    expect(atZero?.player2RawMilitaryActive).toBe(240);
    expect((atZero?.player1CounterAdjustedMilitaryActive ?? 0)).not.toBeCloseTo(
      baselineAtZero?.player1CounterAdjustedMilitaryActive ?? 0,
      6
    );
    expect((atZero?.player2CounterAdjustedMilitaryActive ?? 0)).not.toBeCloseTo(
      baselineAtZero?.player2CounterAdjustedMilitaryActive ?? 0,
      6
    );
  });

  it('matches shared combat evaluator ratios for military-active composition input', () => {
    const player1 = buildOrder([]);
    const player2 = buildOrder([]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1Civilization: 'ja',
      player2Civilization: 'fr',
      player1MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      player2MilitaryActiveSeries: [
        {
          timestamp: 0,
          militaryActive: 240,
        }
      ],
      player1MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 240,
          deltaCount: 3,
        }
      ],
      player2MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:knight',
          itemLabel: 'Knight',
          deltaValue: 240,
          deltaCount: 1,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
      unitCatalog: [spearmanCatalogUnit, knightCatalogUnit],
    });

    const atZero = points.find(point => point.timestamp === 0);
    expect(atZero).toBeDefined();

    const p1Army: UnitWithValue[] = [{
      unitId: 'spearman-2',
      name: 'Hardened Spearman',
      count: 3,
      effectiveValue: 80,
      classes: ['infantry', 'melee', 'spearman'],
    }];
    const p2Army: UnitWithValue[] = [{
      unitId: 'knight',
      name: 'Knight',
      count: 1,
      effectiveValue: 240,
      classes: ['cavalry', 'heavy_melee_cavalry', 'melee'],
    }];

    const expected = evaluateCombatValue(p1Army, p2Army, {
      unitCatalog: [spearmanCatalogUnit, knightCatalogUnit],
      player1Civilization: 'ja',
      player2Civilization: 'fr',
    });

    const actualP1Ratio = (atZero?.player1CounterAdjustedMilitaryActive ?? 0) / Math.max(1, atZero?.player1RawMilitaryActive ?? 1);
    const actualP2Ratio = (atZero?.player2CounterAdjustedMilitaryActive ?? 0) / Math.max(1, atZero?.player2RawMilitaryActive ?? 1);
    expect(actualP1Ratio).toBeCloseTo(expected.army1CounterRatio, 2);
    expect(actualP2Ratio).toBeCloseTo(expected.army2CounterRatio, 2);
  });

  it('emits per-unit adjusted breakdown rows with factors and explanations', () => {
    const player1 = buildOrder([]);
    const player2 = buildOrder([]);

    const points = buildCombatAdjustedSeries({
      player1Build: player1,
      player2Build: player2,
      player1Civilization: 'ja',
      player2Civilization: 'fr',
      player1MilitaryActiveSeries: [{ timestamp: 0, militaryActive: 240 }],
      player2MilitaryActiveSeries: [{ timestamp: 0, militaryActive: 240 }],
      player1MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:spearman-2',
          itemLabel: 'Hardened Spearman',
          deltaValue: 240,
          deltaCount: 3,
        }
      ],
      player2MilitaryActiveBandItemDeltas: [
        {
          timestamp: 0,
          band: 'militaryActive',
          itemKey: 'unit:knight',
          itemLabel: 'Knight',
          deltaValue: 240,
          deltaCount: 1,
        }
      ],
      timelineTimestamps: [0],
      duration: 0,
      unitCatalog: [spearmanCatalogUnit, knightCatalogUnit],
    });

    const atZero = points.find(point => point.timestamp === 0);
    expect(atZero).toBeDefined();
    expect(atZero?.player1UnitBreakdown.length).toBeGreaterThan(0);
    expect(atZero?.player2UnitBreakdown.length).toBeGreaterThan(0);

    const p1Row = atZero?.player1UnitBreakdown[0];
    const p2Row = atZero?.player2UnitBreakdown[0];
    expect(p1Row?.unitName).toContain('Spearman');
    expect(p1Row?.count).toBe(3);
    expect(p1Row?.rawValue).toBeCloseTo(240, 2);
    expect(typeof p1Row?.why).toBe('string');
    expect((p1Row?.why ?? '').length).toBeGreaterThan(0);
    expect(p2Row?.unitName).toContain('Knight');
    expect(p2Row?.count).toBe(1);
    expect(p2Row?.rawValue).toBeCloseTo(240, 2);
    expect(typeof p2Row?.why).toBe('string');
    expect((p2Row?.why ?? '').length).toBeGreaterThan(0);
  });
});
