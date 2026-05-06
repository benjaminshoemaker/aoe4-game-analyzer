import { reconstructArmyAt } from '../../packages/aoe4-core/src/analysis/armyReconstruction';
import { ResolvedBuildOrder } from '../../packages/aoe4-core/src/parser/buildOrderResolver';

function makeResolvedBuildOrder(overrides?: Partial<ResolvedBuildOrder>): ResolvedBuildOrder {
  return {
    startingAssets: [],
    resolved: [],
    unresolved: [],
    ...overrides
  };
}

function makeUnit(name: string, produced: number[], destroyed: number[], cost = 100) {
  return {
    originalEntry: { id: name.toLowerCase(), icon: `${name.toLowerCase()}.png`, pbgid: 1, type: 'Unit' as const, finished: produced, constructed: [], destroyed },
    type: 'unit' as const,
    id: name.toLowerCase(),
    name,
    cost: { food: cost, wood: 0, gold: 0, stone: 0, total: cost },
    tier: 1,
    tierMultiplier: 1.0,
    classes: ['Infantry'],
    produced,
    destroyed,
    civs: ['en']
  };
}

function makeVillager(produced: number[], destroyed: number[]) {
  return {
    originalEntry: { id: 'villager', icon: 'villager.png', pbgid: 2, type: 'Unit' as const, finished: produced, constructed: [], destroyed },
    type: 'unit' as const,
    id: 'villager',
    name: 'Villager',
    cost: { food: 50, wood: 0, gold: 0, stone: 0, total: 50 },
    tier: 1,
    tierMultiplier: 1.0,
    classes: ['Worker', 'Villager'],
    produced,
    destroyed,
    civs: ['en']
  };
}

describe('reconstructArmyAt', () => {
  it('returns empty array when no units exist', () => {
    const build = makeResolvedBuildOrder();
    const result = reconstructArmyAt(build, 500);
    expect(result).toEqual([]);
  });

  it('counts produced units alive at given timestamp', () => {
    const build = makeResolvedBuildOrder({
      resolved: [makeUnit('Spearman', [100, 200, 300], [])]
    });

    const atT250 = reconstructArmyAt(build, 250);
    expect(atT250).toHaveLength(1);
    expect(atT250[0].name).toBe('Spearman');
    expect(atT250[0].count).toBe(2);
  });

  it('subtracts destroyed units', () => {
    const build = makeResolvedBuildOrder({
      resolved: [makeUnit('Spearman', [100, 200, 300], [250])]
    });

    const atT350 = reconstructArmyAt(build, 350);
    expect(atT350).toHaveLength(1);
    expect(atT350[0].count).toBe(2); // 3 produced - 1 destroyed
  });

  it('excludes villagers from army', () => {
    const build = makeResolvedBuildOrder({
      resolved: [
        makeUnit('Spearman', [100], []),
        makeVillager([50, 80, 110], [])
      ]
    });

    const result = reconstructArmyAt(build, 200);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Spearman');
  });

  it('includes starting assets (scouts at t=0)', () => {
    const scout = {
      originalEntry: { id: 'scout', icon: 'scout.png', pbgid: 3, type: 'Unit' as const, finished: [0], constructed: [], destroyed: [] },
      type: 'unit' as const,
      id: 'scout',
      name: 'Scout',
      cost: { food: 60, wood: 0, gold: 0, stone: 0, total: 60 },
      tier: 1,
      tierMultiplier: 1.0,
      classes: ['Light Melee Cavalry'],
      produced: [0],
      destroyed: [],
      civs: ['en']
    };

    const build = makeResolvedBuildOrder({
      startingAssets: [scout]
    });

    const result = reconstructArmyAt(build, 100);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Scout');
    expect(result[0].count).toBe(1);
  });

  it('returns empty when all units are destroyed', () => {
    const build = makeResolvedBuildOrder({
      resolved: [makeUnit('Spearman', [100], [200])]
    });

    const result = reconstructArmyAt(build, 300);
    expect(result).toHaveLength(0);
  });

  it('computes effective value with tier multiplier', () => {
    const tieredUnit = {
      ...makeUnit('Knight', [100], [], 240),
      tier: 2,
      tierMultiplier: 1.2
    };

    const build = makeResolvedBuildOrder({
      resolved: [tieredUnit]
    });

    const result = reconstructArmyAt(build, 200);
    expect(result[0].effectiveValue).toBeCloseTo(288); // 240 * 1.2
  });

  it('excludes buildings and upgrades', () => {
    const building = {
      ...makeUnit('Barracks', [100], []),
      type: 'building' as const,
    };
    const upgrade = {
      ...makeUnit('ArmorUpgrade', [200], []),
      type: 'upgrade' as const,
    };

    const build = makeResolvedBuildOrder({
      resolved: [building, upgrade, makeUnit('Spearman', [100], [])]
    });

    const result = reconstructArmyAt(build, 300);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Spearman');
  });
});
