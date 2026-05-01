import { UnitWithValue } from '../types';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { isVillager } from './resourceAnalysis';

export function reconstructArmyAt(
  resolvedBuild: ResolvedBuildOrder,
  timestamp: number
): UnitWithValue[] {
  const allItems = [...resolvedBuild.startingAssets, ...resolvedBuild.resolved];
  const units: UnitWithValue[] = [];

  for (const item of allItems) {
    if (item.type !== 'unit') continue;
    if (isVillager(item)) continue;

    const produced = item.produced.filter(t => t <= timestamp).length;
    const destroyed = item.destroyed.filter(t => t <= timestamp).length;
    const alive = produced - destroyed;

    if (alive <= 0) continue;

    units.push({
      unitId: item.id,
      name: item.name,
      count: alive,
      effectiveValue: item.cost.total * item.tierMultiplier,
      classes: item.classes,
    });
  }

  return units;
}
