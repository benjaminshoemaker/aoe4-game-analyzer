import {
  buildLifecycleEvents,
  findFallbackLifecycleContext,
  unitLineKey,
} from '../../packages/aoe4-core/src/analysis/resourceLifecycle';
import type { ResolvedBuildItem } from '../../packages/aoe4-core/src/parser/buildOrderResolver';

function buildItem(overrides: Partial<ResolvedBuildItem> = {}): ResolvedBuildItem {
  return {
    originalEntry: { constructed: [] } as any,
    type: 'unit',
    id: 'spearman_2',
    baseId: 'spearman_2',
    name: 'Hardened Spearman',
    cost: { food: 60, wood: 20, gold: 0, stone: 0, total: 80 },
    tier: 2,
    tierMultiplier: 1,
    classes: ['infantry'],
    produced: [10],
    destroyed: [],
    civs: ['english'],
    ...overrides,
  };
}

describe('resource lifecycle helpers', () => {
  it('normalizes unit line keys from base ids, ids, and tiered names', () => {
    expect(unitLineKey(buildItem({ baseId: 'longbowman_3', id: 'longbowman_3' }))).toBe('longbowman');
    expect(unitLineKey(buildItem({ baseId: undefined, id: 'horseman-4', name: 'Elite Horseman' }))).toBe('horseman');
    expect(unitLineKey(buildItem({ baseId: undefined, id: '', name: 'Elite Man-at-Arms' }))).toBe('man-at-arms');
    expect(unitLineKey(buildItem({ type: 'building', id: 'outpost_2', baseId: undefined }))).toBe('building:outpost');
  });

  it('sorts lifecycle events and allows callers to override produced timestamps', () => {
    const item = buildItem({
      produced: [999],
      destroyed: [20, 15],
    });

    expect(buildLifecycleEvents(item, { producedTimestamps: [20, 10] })).toEqual([
      { timestamp: 10, kind: 'produced' },
      { timestamp: 15, kind: 'destroyed' },
      { timestamp: 20, kind: 'produced' },
      { timestamp: 20, kind: 'destroyed' },
    ]);
  });

  it('finds an active same-line fallback context without crossing pool boundaries', () => {
    const destroyedContext = {
      item: buildItem({ id: 'spearman_3', baseId: 'spearman_3', tier: 3 }),
      itemKey: 'spearman_3',
      lineKey: 'spearman',
      allocationSignature: 'militaryActive:1',
      order: 3,
    };
    const lowerTierContext = {
      item: buildItem({ id: 'spearman_2', baseId: 'spearman_2', tier: 2 }),
      itemKey: 'spearman_2',
      lineKey: 'spearman',
      allocationSignature: 'militaryActive:1',
      order: 2,
    };
    const higherTierContext = {
      item: buildItem({ id: 'spearman_4', baseId: 'spearman_4', tier: 4 }),
      itemKey: 'spearman_4',
      lineKey: 'spearman',
      allocationSignature: 'militaryActive:1',
      order: 4,
    };
    const differentPoolContext = {
      item: buildItem({ id: 'spearman_2', baseId: 'spearman_2', tier: 2 }),
      itemKey: 'spearman_2_research',
      lineKey: 'spearman',
      allocationSignature: 'research:1',
      order: 5,
    };
    const activeCounts = new Map<string, number>([
      [lowerTierContext.itemKey, 1],
      [higherTierContext.itemKey, 1],
      [differentPoolContext.itemKey, 3],
    ]);

    const fallback = findFallbackLifecycleContext({
      eventContext: destroyedContext,
      contexts: [destroyedContext, higherTierContext, differentPoolContext, lowerTierContext],
      activeCount: context => activeCounts.get(context.itemKey) ?? 0,
      samePool: (context, eventContext) =>
        context.itemKey !== eventContext.itemKey &&
        context.allocationSignature === eventContext.allocationSignature,
    });

    expect(fallback).toBe(lowerTierContext);
  });
});
