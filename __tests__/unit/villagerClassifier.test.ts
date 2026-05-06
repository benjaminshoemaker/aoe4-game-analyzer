import { BuildOrderEntry } from '../../packages/aoe4-core/src/parser/gameSummaryParser';
import { ResolvedBuildItem } from '../../packages/aoe4-core/src/parser/buildOrderResolver';
import { isVillagerBuildOrderEntry, isVillagerResolvedItem } from '../../packages/aoe4-core/src/analysis/villagerClassifier';

describe('villagerClassifier', () => {
  it('detects villager-like build-order units via id/icon tokens', () => {
    const entry: BuildOrderEntry = {
      id: 'feudal_peasant',
      icon: 'icons/races/rus/units/feudal_peasant',
      pbgid: 1,
      type: 'Unit',
      finished: [10],
      constructed: [],
      destroyed: [],
    };

    expect(isVillagerBuildOrderEntry(entry)).toBe(true);
  });

  it('does not classify non-worker combat build-order units as villagers', () => {
    const entry: BuildOrderEntry = {
      id: 'spearman',
      icon: 'icons/races/english/units/spearman',
      pbgid: 2,
      type: 'Unit',
      finished: [10],
      constructed: [],
      destroyed: [],
    };

    expect(isVillagerBuildOrderEntry(entry)).toBe(false);
  });

  it('detects resolved villager units via worker classes and names', () => {
    const item: ResolvedBuildItem = {
      originalEntry: {
        id: 'serf',
        icon: 'icons/races/rus/units/serf',
        pbgid: 3,
        type: 'Unit',
        finished: [0],
        constructed: [],
        destroyed: [],
      },
      type: 'unit',
      id: 'serf',
      name: 'Serf',
      cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
      tier: 1,
      tierMultiplier: 1,
      classes: ['worker'],
      produced: [0],
      destroyed: [],
      civs: ['ru'],
    };

    expect(isVillagerResolvedItem(item)).toBe(true);
  });

  it('does not classify non-unit resolved items as villagers', () => {
    const item: ResolvedBuildItem = {
      originalEntry: {
        id: 'town_center',
        icon: 'icons/races/common/buildings/town_center',
        pbgid: 4,
        type: 'Building',
        finished: [],
        constructed: [0],
        destroyed: [],
      },
      type: 'building',
      id: 'town-center',
      name: 'Town Center',
      cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
      tier: 1,
      tierMultiplier: 1,
      classes: ['town_center'],
      produced: [0],
      destroyed: [],
      civs: [],
    };

    expect(isVillagerResolvedItem(item)).toBe(false);
  });
});
