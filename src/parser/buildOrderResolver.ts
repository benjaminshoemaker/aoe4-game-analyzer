import { StaticDataCache, Unit, Building, Technology } from '../types';
import { BuildOrderEntry, PlayerSummary } from './gameSummaryParser';
import { parseUnitTierFromIcon, tierMultipliers } from '../data/upgradeMappings';
import { manualMappings, ManualMapping } from '../data/manualMappings';

export interface ItemCost {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  total: number;
}

export interface ResolvedBuildItem {
  originalEntry: BuildOrderEntry;
  type: 'unit' | 'building' | 'upgrade' | 'age' | 'animal';
  id: string;
  name: string;
  cost: ItemCost;
  tier: number;
  tierMultiplier: number;
  classes: string[];
  produced: number[];
  destroyed: number[];
  civs: string[];
}

export interface ResolvedBuildOrder {
  startingAssets: ResolvedBuildItem[];
  resolved: ResolvedBuildItem[];
  unresolved: BuildOrderEntry[];
}

interface PbgidIndex {
  units: Map<number, Unit>;
  buildings: Map<number, Building>;
  technologies: Map<number, Technology>;
}

function buildPbgidIndex(staticData: StaticDataCache): PbgidIndex {
  const units = new Map<number, Unit>();
  const buildings = new Map<number, Building>();
  const technologies = new Map<number, Technology>();

  for (const unit of staticData.units) {
    if (unit.pbgid !== undefined) {
      units.set(unit.pbgid, unit);
    }
  }

  for (const building of staticData.buildings) {
    if (building.pbgid !== undefined) {
      buildings.set(building.pbgid, building);
    }
  }

  for (const tech of staticData.technologies) {
    if (tech.pbgid !== undefined) {
      technologies.set(tech.pbgid, tech);
    }
  }

  return { units, buildings, technologies };
}

function extractIconBaseName(iconPath: string): string {
  // Extract filename without extension and tier suffix
  // e.g., "icons/races/japanese/units/yumi_ashigaru_2" -> "yumi_ashigaru"
  const filename = iconPath.split('/').pop() ?? iconPath;
  const withoutExt = filename.replace(/\.(png|webp|jpg)$/i, '');
  // Remove tier suffixes like _2, _3, _4
  return withoutExt.replace(/_[2-5]$/, '');
}

function matchByIconPath(
  iconPath: string,
  staticData: StaticDataCache
): { item: Unit | Building | Technology; type: 'unit' | 'building' | 'upgrade' } | null {
  const baseName = extractIconBaseName(iconPath).toLowerCase();

  // Try to match units
  for (const unit of staticData.units) {
    const unitBaseName = extractIconBaseName(unit.icon).toLowerCase();
    if (unitBaseName === baseName) {
      return { item: unit, type: 'unit' };
    }
  }

  // Try to match buildings
  for (const building of staticData.buildings) {
    const buildingBaseName = extractIconBaseName(building.icon).toLowerCase();
    if (buildingBaseName === baseName) {
      return { item: building, type: 'building' };
    }
  }

  // Try to match technologies
  for (const tech of staticData.technologies) {
    const techBaseName = extractIconBaseName(tech.icon).toLowerCase();
    if (techBaseName === baseName) {
      return { item: tech, type: 'upgrade' };
    }
  }

  return null;
}

function getTierFromIcon(iconPath: string): { tier: number; multiplier: number } {
  const multiplier = parseUnitTierFromIcon(iconPath);
  let tier = 1;
  if (multiplier === tierMultipliers.veteran) tier = 2;
  else if (multiplier === tierMultipliers.elite) tier = 3;
  else if (multiplier === tierMultipliers.imperial) tier = 4;

  return { tier, multiplier };
}

function normalizeCost(costs: { food?: number; wood?: number; gold?: number; stone?: number; total?: number } | undefined): ItemCost {
  const food = costs?.food ?? 0;
  const wood = costs?.wood ?? 0;
  const gold = costs?.gold ?? 0;
  const stone = costs?.stone ?? 0;
  const total = costs?.total ?? (food + wood + gold + stone);
  return { food, wood, gold, stone, total };
}

function resolveFromManualMapping(entry: BuildOrderEntry): ResolvedBuildItem | null {
  const mapping = manualMappings.find(m => m.pbgid === entry.pbgid);
  if (!mapping) return null;

  const { tier, multiplier } = getTierFromIcon(entry.icon);
  const entryTypeLower = entry.type.toLowerCase();
  const validTypes = ['unit', 'building', 'upgrade', 'age', 'animal'];
  const entryType: ResolvedBuildItem['type'] = validTypes.includes(entryTypeLower)
    ? (entryTypeLower as ResolvedBuildItem['type'])
    : 'unit';

  return {
    originalEntry: entry,
    type: entryType,
    id: mapping.id ?? entry.id,
    name: mapping.name,
    cost: normalizeCost(mapping.cost),
    tier,
    tierMultiplier: multiplier,
    classes: mapping.classes ?? [],
    produced: [...entry.finished, ...entry.constructed],
    destroyed: entry.destroyed,
    civs: mapping.civs ?? []
  };
}

export function resolveBuildOrderItem(
  entry: BuildOrderEntry,
  staticData: StaticDataCache,
  pbgidIndex?: PbgidIndex
): ResolvedBuildItem | null {
  // Handle Age entries specially - they don't have costs
  if (entry.type === 'Age') {
    const ageMatch = entry.icon.match(/age_display_persistent_(\d)/);
    const ageNum = ageMatch ? parseInt(ageMatch[1], 10) : 1;
    const ageNames: Record<number, string> = {
      1: 'Dark Age',
      2: 'Feudal Age',
      3: 'Castle Age',
      4: 'Imperial Age'
    };

    return {
      originalEntry: entry,
      type: 'age',
      id: `age-${ageNum}`,
      name: ageNames[ageNum] ?? `Age ${ageNum}`,
      cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
      tier: ageNum,
      tierMultiplier: 1.0,
      classes: ['age'],
      produced: entry.finished,
      destroyed: [],
      civs: []
    };
  }

  // Handle Animal entries - no cost
  if (entry.type === 'Animal') {
    const animalName = extractIconBaseName(entry.icon);
    return {
      originalEntry: entry,
      type: 'animal',
      id: entry.id,
      name: animalName.charAt(0).toUpperCase() + animalName.slice(1),
      cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
      tier: 1,
      tierMultiplier: 1.0,
      classes: ['animal'],
      produced: entry.finished,
      destroyed: entry.destroyed,
      civs: []
    };
  }

  // Check manual mappings first
  const manualResult = resolveFromManualMapping(entry);
  if (manualResult) return manualResult;

  // Build index if not provided
  const index = pbgidIndex ?? buildPbgidIndex(staticData);
  const { tier, multiplier } = getTierFromIcon(entry.icon);

  // Try to match by pbgid first (primary key)
  if (entry.type === 'Unit') {
    const unit = index.units.get(entry.pbgid);
    if (unit) {
      return {
        originalEntry: entry,
        type: 'unit',
        id: unit.id,
        name: unit.name,
        cost: normalizeCost(unit.costs),
        tier,
        tierMultiplier: multiplier,
        classes: unit.classes ?? [],
        produced: entry.finished,
        destroyed: entry.destroyed,
        civs: unit.civs
      };
    }
  }

  if (entry.type === 'Building') {
    const building = index.buildings.get(entry.pbgid);
    if (building) {
      return {
        originalEntry: entry,
        type: 'building',
        id: building.id,
        name: building.name,
        cost: normalizeCost(building.costs),
        tier,
        tierMultiplier: multiplier,
        classes: building.classes ?? [],
        produced: entry.constructed,
        destroyed: entry.destroyed,
        civs: building.civs
      };
    }
  }

  if (entry.type === 'Upgrade') {
    const tech = index.technologies.get(entry.pbgid);
    if (tech) {
      return {
        originalEntry: entry,
        type: 'upgrade',
        id: tech.id,
        name: tech.name,
        cost: normalizeCost(tech.costs),
        tier,
        tierMultiplier: multiplier,
        classes: tech.classes ?? [],
        produced: entry.finished,
        destroyed: [],
        civs: tech.civs
      };
    }
  }

  // Fallback: try to match by icon path
  const iconMatch = matchByIconPath(entry.icon, staticData);
  if (iconMatch) {
    const { item, type } = iconMatch;
    return {
      originalEntry: entry,
      type,
      id: item.id,
      name: item.name,
      cost: normalizeCost(item.costs),
      tier,
      tierMultiplier: multiplier,
      classes: (item as Unit).classes ?? (item as Building).classes ?? [],
      produced: type === 'building' ? entry.constructed : entry.finished,
      destroyed: entry.destroyed,
      civs: item.civs
    };
  }

  // Could not resolve
  return null;
}

export function resolveAllBuildOrders(
  player: PlayerSummary,
  staticData: StaticDataCache
): ResolvedBuildOrder {
  const startingAssets: ResolvedBuildItem[] = [];
  const resolved: ResolvedBuildItem[] = [];
  const unresolved: BuildOrderEntry[] = [];

  // Build index once for efficiency
  const pbgidIndex = buildPbgidIndex(staticData);

  for (const entry of player.buildOrder) {
    const result = resolveBuildOrderItem(entry, staticData, pbgidIndex);
    if (!result) {
      unresolved.push(entry);
      continue;
    }

    // Separate starting assets (timestamp 0) from build order
    const startingTimestamps = result.produced.filter(ts => ts === 0);
    const buildOrderTimestamps = result.produced.filter(ts => ts > 0);

    if (startingTimestamps.length > 0) {
      // Create a copy for starting assets
      startingAssets.push({
        ...result,
        produced: startingTimestamps
      });
    }

    if (buildOrderTimestamps.length > 0) {
      // Only include in build order if there are non-zero timestamps
      resolved.push({
        ...result,
        produced: buildOrderTimestamps
      });
    }
  }

  return { startingAssets, resolved, unresolved };
}

export function validateAllItemsResolved(resolved: ResolvedBuildOrder): void {
  if (resolved.unresolved.length === 0) return;

  const itemDetails = resolved.unresolved.map(entry => {
    return `${entry.type}:${entry.icon} (pbgid=${entry.pbgid})`;
  });

  const message = [
    `FATAL: Could not resolve ${resolved.unresolved.length} build order items:`,
    ...itemDetails.map(d => `  - ${d}`),
    '',
    'Please update static data or add manual mappings in src/data/manualMappings.ts'
  ].join('\n');

  throw new Error(message);
}
