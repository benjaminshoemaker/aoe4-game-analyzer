import { StaticDataCache, Unit, Building, Technology } from '../types';
import { BuildOrderEntry, PlayerSummary } from './gameSummaryParser';
import { parseUnitTierFromIcon, tierMultipliers } from '../data/upgradeMappings';
import { manualMappings, ManualMapping } from '../data/manualMappings';

const MALIAN_CATTLE_PBGID = 2059966;
const MALIAN_CATTLE_PRODUCED_UNKNOWN_BUCKET = '14';
const SENGOKU_YATAI_PBGID = 9001316;
const SENGOKU_YATAI_PRODUCED_UNKNOWN_BUCKET = '14';
const SENGOKU_YATAI_DESTROYED_UNKNOWN_BUCKET = '15';
const TRADE_CART_IGNORED_UNKNOWN_BUCKET = '15';
const AGE_PRODUCED_UNKNOWN_BUCKET = '10';
const RESOURCE_GENERATOR_PRODUCED_UNKNOWN_BUCKET = '14';
const RESOURCE_GENERATOR_DESTROYED_UNKNOWN_BUCKET = '15';
const producedUnknownBucketByPbgid = new Map<number, string>([
  [2762454, '14'],
  [2631059, '14'],
  [5000301, '15'],
  [2141356, '6'],
  [8635755, '6'],
  [7804932, '6'],
  [2140765, '6'],
  [MALIAN_CATTLE_PBGID, MALIAN_CATTLE_PRODUCED_UNKNOWN_BUCKET],
  [SENGOKU_YATAI_PBGID, SENGOKU_YATAI_PRODUCED_UNKNOWN_BUCKET],
]);
const destroyedUnknownBucketByPbgid = new Map<number, string>([
  [SENGOKU_YATAI_PBGID, SENGOKU_YATAI_DESTROYED_UNKNOWN_BUCKET],
]);
const ignoredUnknownBucketsByPbgid = new Map<number, Set<string>>([
  [9003449, new Set([TRADE_CART_IGNORED_UNKNOWN_BUCKET])],
]);

export type UnknownBuildOrderBucketHandling = 'produced' | 'destroyed' | 'ignored' | null;

interface UnknownBucketItemContext {
  type?: string;
  id?: string;
  baseId?: string;
  name?: string;
  classes?: string[];
}

function normalizeTokenText(value: string): string {
  return value.toLowerCase().replace(/[_\s]+/g, '-');
}

function includesAnyToken(value: string, tokens: string[]): boolean {
  const normalized = normalizeTokenText(value);
  return tokens.some(token => normalized.includes(normalizeTokenText(token)));
}

function hasClassToken(classes: string[] | undefined, tokens: string[]): boolean {
  if (!classes) return false;
  const tokenSet = new Set(tokens.map(token => token.toLowerCase()));
  return classes.some(cls => tokenSet.has(cls.toLowerCase()));
}

const resourceGeneratorIdNameTokens = [
  'villager',
  'trader',
  'trade-caravan',
  'trade-cart',
  'trade-ship',
  'fishing-boat',
  'fishing-ship',
  'worker-elephant',
  'cattle',
  'yatai',
  'pilgrim',
];

const resourceGeneratorClassTokens = [
  'villager',
  'trade_cart',
  'trade_camel',
  'naval_trade_ship',
  'naval_fishing_ship',
  'cattle',
  'yatai',
  'pilgrim',
];

function isResourceGeneratorUnit(
  entryType: BuildOrderEntry['type'] | string | undefined,
  item?: UnknownBucketItemContext | null
): boolean {
  const type = item?.type ?? entryType;
  if (type !== 'Unit' && type !== 'unit') return false;

  const values = [
    item?.id,
    item?.baseId,
    item?.name,
  ].filter((value): value is string => typeof value === 'string');

  return (
    values.some(value => includesAnyToken(value, resourceGeneratorIdNameTokens)) ||
    hasClassToken(item?.classes, resourceGeneratorClassTokens)
  );
}

function inferUnknownBuildOrderBucketHandling(
  pbgid: number,
  bucket: string,
  entryType?: BuildOrderEntry['type'],
  item?: UnknownBucketItemContext | null
): UnknownBuildOrderBucketHandling {
  if (!isResourceGeneratorUnit(entryType, item)) return null;
  if (bucket === RESOURCE_GENERATOR_PRODUCED_UNKNOWN_BUCKET) return 'produced';
  if (bucket === RESOURCE_GENERATOR_DESTROYED_UNKNOWN_BUCKET) return 'destroyed';
  return null;
}

export function getUnknownBuildOrderBucketHandling(
  pbgid: number,
  bucket: string,
  entryType?: BuildOrderEntry['type'],
  item?: UnknownBucketItemContext | null
): UnknownBuildOrderBucketHandling {
  if (entryType === 'Age' && bucket === AGE_PRODUCED_UNKNOWN_BUCKET) return 'produced';
  if (producedUnknownBucketByPbgid.get(pbgid) === bucket) return 'produced';
  if (destroyedUnknownBucketByPbgid.get(pbgid) === bucket) return 'destroyed';
  if (ignoredUnknownBucketsByPbgid.get(pbgid)?.has(bucket)) return 'ignored';
  const inferred = inferUnknownBuildOrderBucketHandling(pbgid, bucket, entryType, item);
  if (inferred) return inferred;
  return null;
}

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
  baseId?: string;
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

function mergeTimestamps(...groups: number[][]): number[] {
  return groups
    .flat()
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function getProducedTimestamps(
  entry: BuildOrderEntry,
  type: ResolvedBuildItem['type'],
  item?: UnknownBucketItemContext | null
): number[] {
  if (type === 'age') {
    return mergeTimestamps(entry.finished, entry.unknown?.[AGE_PRODUCED_UNKNOWN_BUCKET] ?? []);
  }

  const unknownBucket = producedUnknownBucketByPbgid.get(entry.pbgid);
  if (unknownBucket) {
    return mergeTimestamps(entry.finished, entry.unknown?.[unknownBucket] ?? []);
  }

  const inferredHandling = getUnknownBuildOrderBucketHandling(entry.pbgid, RESOURCE_GENERATOR_PRODUCED_UNKNOWN_BUCKET, entry.type, {
    ...item,
    type,
  });
  if (inferredHandling === 'produced') {
    return mergeTimestamps(entry.finished, entry.unknown?.[RESOURCE_GENERATOR_PRODUCED_UNKNOWN_BUCKET] ?? []);
  }

  if (type === 'building') {
    return entry.constructed;
  }

  return entry.finished;
}

function getDestroyedTimestamps(
  entry: BuildOrderEntry,
  type?: ResolvedBuildItem['type'],
  item?: UnknownBucketItemContext | null
): number[] {
  const unknownBucket = destroyedUnknownBucketByPbgid.get(entry.pbgid);
  if (unknownBucket) {
    return mergeTimestamps(entry.destroyed, entry.unknown?.[unknownBucket] ?? []);
  }

  const inferredHandling = getUnknownBuildOrderBucketHandling(entry.pbgid, RESOURCE_GENERATOR_DESTROYED_UNKNOWN_BUCKET, entry.type, {
    ...item,
    type,
  });
  if (inferredHandling === 'destroyed') {
    return mergeTimestamps(entry.destroyed, entry.unknown?.[RESOURCE_GENERATOR_DESTROYED_UNKNOWN_BUCKET] ?? []);
  }

  return entry.destroyed;
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
    baseId: mapping.baseId,
    name: mapping.name,
    cost: normalizeCost(mapping.cost),
    tier,
    tierMultiplier: multiplier,
    classes: mapping.classes ?? [],
    produced: getProducedTimestamps(entry, entryType, mapping),
    destroyed: getDestroyedTimestamps(entry, entryType, mapping),
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
      produced: getProducedTimestamps(entry, 'age'),
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
        baseId: unit.baseId,
        name: unit.name,
        cost: normalizeCost(unit.costs),
        tier,
        tierMultiplier: multiplier,
        classes: unit.classes ?? [],
        produced: getProducedTimestamps(entry, 'unit', unit),
        destroyed: getDestroyedTimestamps(entry, 'unit', unit),
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
        baseId: building.baseId,
        name: building.name,
        cost: normalizeCost(building.costs),
        tier,
        tierMultiplier: multiplier,
        classes: building.classes ?? [],
        produced: getProducedTimestamps(entry, 'building', building),
        destroyed: getDestroyedTimestamps(entry, 'building', building),
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
        baseId: tech.baseId,
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

  if (entry.type === 'Unknown') {
    const tech = index.technologies.get(entry.pbgid);
    if (tech) {
      return {
        originalEntry: entry,
        type: 'upgrade',
        id: tech.id,
        baseId: tech.baseId,
        name: tech.name,
        cost: normalizeCost(tech.costs),
        tier,
        tierMultiplier: multiplier,
        classes: tech.classes ?? [],
        produced: getProducedTimestamps(entry, 'upgrade', tech),
        destroyed: [],
        civs: tech.civs
      };
    }

    const building = index.buildings.get(entry.pbgid);
    if (building) {
      return {
        originalEntry: entry,
        type: 'building',
        id: building.id,
        baseId: building.baseId,
        name: building.name,
        cost: normalizeCost(building.costs),
        tier,
        tierMultiplier: multiplier,
        classes: building.classes ?? [],
        produced: getProducedTimestamps(entry, 'building', building),
        destroyed: getDestroyedTimestamps(entry, 'building', building),
        civs: building.civs
      };
    }

    const unit = index.units.get(entry.pbgid);
    if (unit) {
      return {
        originalEntry: entry,
        type: 'unit',
        id: unit.id,
        baseId: unit.baseId,
        name: unit.name,
        cost: normalizeCost(unit.costs),
        tier,
        tierMultiplier: multiplier,
        classes: unit.classes ?? [],
        produced: getProducedTimestamps(entry, 'unit', unit),
        destroyed: getDestroyedTimestamps(entry, 'unit', unit),
        civs: unit.civs
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
      baseId: item.baseId,
      name: item.name,
      cost: normalizeCost(item.costs),
      tier,
      tierMultiplier: multiplier,
      classes: (item as Unit).classes ?? (item as Building).classes ?? [],
      produced: getProducedTimestamps(entry, type, item),
      destroyed: getDestroyedTimestamps(entry, type, item),
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
    const hasStarting = startingTimestamps.length > 0;
    const hasBuildOrder = buildOrderTimestamps.length > 0;
    const hasDestroyedOnlyBuildOrder = !hasStarting && !hasBuildOrder && result.destroyed.length > 0;

    const firstBuildOrderTimestamp = hasBuildOrder
      ? Math.min(...buildOrderTimestamps)
      : Number.POSITIVE_INFINITY;
    const startingDestroyed = hasStarting && hasBuildOrder
      ? result.destroyed.filter(ts => ts < firstBuildOrderTimestamp)
      : hasStarting
        ? result.destroyed
        : [];
    const buildOrderDestroyed = hasStarting && hasBuildOrder
      ? result.destroyed.filter(ts => ts >= firstBuildOrderTimestamp)
      : (hasBuildOrder || hasDestroyedOnlyBuildOrder)
        ? result.destroyed
        : [];

    if (startingTimestamps.length > 0) {
      // Create a copy for starting assets
      startingAssets.push({
        ...result,
        produced: startingTimestamps,
        destroyed: startingDestroyed
      });
    }

    if (buildOrderTimestamps.length > 0 || hasDestroyedOnlyBuildOrder) {
      // Keep destroyed-only upgraded rows so lifecycle accounting can subtract the prior tier.
      resolved.push({
        ...result,
        produced: buildOrderTimestamps,
        destroyed: buildOrderDestroyed
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
