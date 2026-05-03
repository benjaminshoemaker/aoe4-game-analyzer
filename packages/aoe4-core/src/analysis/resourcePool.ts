import resourceBandConfigJson from '../data/resourceBandConfig.json';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { GameSummary, PlayerSummary } from '../parser/gameSummaryParser';
import {
  buildLifecycleEvents,
  findFallbackLifecycleContext as findSharedFallbackLifecycleContext,
  LifecycleEvent,
  unitLineKey,
} from './resourceLifecycle';
import { isVillagerResolvedItem } from './villagerClassifier';

export type PoolBand =
  | 'economic'
  | 'populationCap'
  | 'militaryCapacity'
  | 'militaryActive'
  | 'defensive'
  | 'research'
  | 'advancement';

export type EconomicRole = 'resourceGenerator' | 'resourceInfrastructure';

export interface PoolSeriesPoint {
  timestamp: number;
  economic: number;
  populationCap: number;
  militaryCapacity: number;
  militaryActive: number;
  defensive: number;
  research: number;
  advancement: number;
  total: number;
}

export interface GatherRatePoint {
  timestamp: number;
  ratePerMin: number;
}

export interface FreeProductionPoint {
  timestamp: number;
  cumulativeValue: number;
}

export interface BandItemDeltaEvent {
  timestamp: number;
  band: PoolBand;
  itemKey: string;
  itemLabel: string;
  itemCategory?: string;
  itemEconomicRole?: EconomicRole;
  deltaValue: number;
  deltaCount: number;
}

export interface BandItemSnapshotEntry {
  itemKey: string;
  itemLabel: string;
  itemCategory?: string;
  itemEconomicRole?: EconomicRole;
  value: number;
  count: number;
  percent: number;
}

export type BandItemSnapshotBands = Record<PoolBand, BandItemSnapshotEntry[]>;

export interface BandItemSnapshotPoint {
  timestamp: number;
  bands: BandItemSnapshotBands;
}

export interface PlayerDeployedPoolSeries {
  profileId: number;
  playerName: string;
  civilization: string;
  deferredNotices: string[];
  gatherRateSeries: GatherRatePoint[];
  freeProductionSeries?: FreeProductionPoint[];
  bandItemDeltas?: BandItemDeltaEvent[];
  bandItemSnapshots?: BandItemSnapshotPoint[];
  series: PoolSeriesPoint[];
  peakTotal: number;
}

export interface DeployedResourcePools {
  player1: PlayerDeployedPoolSeries;
  player2: PlayerDeployedPoolSeries;
  sharedYAxisMax: number;
}

interface BandClassifierContext {
  hasNavalMilitaryProduction: boolean;
}

interface BandRuleBlock {
  bandById?: Record<string, PoolBand>;
  populationCapIdTokens: string[];
  populationCapNameTokens: string[];
  populationCapClassTokens: string[];
  populationCapExcludeIdTokens: string[];
  advancementIdTokens: string[];
  advancementNameTokens: string[];
  advancementClassTokens: string[];
  economicIdTokens: string[];
  economicNameTokens: string[];
  economicClassTokens: string[];
  defensiveIdTokens: string[];
  defensiveNameTokens: string[];
  defensiveClassTokens: string[];
  militaryCapacityIdTokens: string[];
  militaryCapacityNameTokens: string[];
  militaryCapacityClassTokens: string[];
  dockIdTokens: string[];
  dockNameTokens: string[];
  dockClassTokens: string[];
}

interface BandClassifierConfig {
  unit: {
    economicIdTokens: string[];
    economicNameTokens: string[];
    economicClassTokens: string[];
    marketValueByIdTokens?: Array<{ token: string; value: number }>;
    navalMilitaryClassTokens: string[];
    navalEconomicClassTokens: string[];
  };
  building: BandRuleBlock;
  technology: {
    advancementIdTokens: string[];
    advancementClassTokens: string[];
    defensiveIdTokens: string[];
    defensiveClassTokens: string[];
  };
}

const bandConfig = resourceBandConfigJson as BandClassifierConfig;

const militaryResearchTokens = [
  'military',
  'weapon',
  'armor',
  'infantry',
  'archer',
  'cavalry',
  'siege',
  'damage',
  'attack',
  'combat',
];

const economicResearchTokens = [
  'economic',
  'economy',
  'villager',
  'food',
  'wood',
  'gold',
  'stone',
  'gather',
  'gathering',
  'farm',
  'lumber',
  'mining',
  'trade',
];

const economicGeneratorIdTokens = [
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

const economicGeneratorNameTokens = [
  'villager',
  'trader',
  'trade caravan',
  'trade cart',
  'trade ship',
  'fishing boat',
  'fishing ship',
  'worker elephant',
  'cattle',
  'yatai',
  'pilgrim',
];

const economicGeneratorClassTokens = [
  'villager',
  'trade_cart',
  'trade_camel',
  'naval_trade_ship',
  'naval_fishing_ship',
  'cattle',
  'yatai',
  'pilgrim',
];

const economicInfrastructureUnitTokens = [
  'imperial-official',
  'official',
  'atabeg',
  'monk',
  'imam',
  'scholar',
  'prelate',
  'priest',
];

const poolBands: PoolBand[] = [
  'economic',
  'populationCap',
  'militaryCapacity',
  'militaryActive',
  'defensive',
  'research',
  'advancement',
];

interface BandAllocation {
  band: PoolBand;
  ratio: number;
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function normalizeCivilization(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function matchesTokens(text: string, tokens: string[]): boolean {
  return tokens.some(token => text.includes(token));
}

function hasClassToken(classes: string[], tokens: string[]): boolean {
  const classesLower = classes.map(normalizeText);
  return classesLower.some(cls => tokens.some(token => cls.includes(token)));
}

function hasExactClassToken(classes: string[], tokens: string[]): boolean {
  const tokenSet = new Set(tokens.map(normalizeText));
  return classes.map(normalizeText).some(cls => tokenSet.has(cls));
}

function hasLandmarkClass(classes: string[]): boolean {
  return classes
    .map(normalizeText)
    .some(cls => cls.includes('landmark') && cls !== 'town_center_or_landmark');
}

function isEconomicUnit(item: ResolvedBuildItem): boolean {
  if (isVillagerResolvedItem(item)) return true;

  const id = normalizeText(item.id);
  const name = normalizeText(item.name);

  if (matchesTokens(id, bandConfig.unit.economicIdTokens)) return true;
  if (matchesTokens(name, bandConfig.unit.economicNameTokens)) return true;
  if (hasClassToken(item.classes, bandConfig.unit.economicClassTokens)) return true;

  return false;
}

function isDockBuilding(item: ResolvedBuildItem): boolean {
  if (item.type !== 'building') return false;

  const id = normalizeText(item.id);
  const name = normalizeText(item.name);

  return (
    matchesTokens(id, bandConfig.building.dockIdTokens) ||
    matchesTokens(name, bandConfig.building.dockNameTokens) ||
    hasClassToken(item.classes, bandConfig.building.dockClassTokens)
  );
}

function isNavalMilitaryUnit(item: ResolvedBuildItem): boolean {
  if (item.type !== 'unit') return false;
  if (item.produced.length === 0) return false;
  if (isEconomicUnit(item)) return false;

  const hasNavalTag = hasClassToken(item.classes, bandConfig.unit.navalMilitaryClassTokens);
  const hasEconomicNavalTag = hasClassToken(item.classes, bandConfig.unit.navalEconomicClassTokens);

  return hasNavalTag && !hasEconomicNavalTag;
}

function classifyBuildingBand(item: ResolvedBuildItem, context: BandClassifierContext): PoolBand {
  const id = normalizeText(item.id);
  const name = normalizeText(item.name);
  const overrideBand = bandConfig.building.bandById?.[id];
  if (overrideBand) return overrideBand;

  if (matchesTokens(id, bandConfig.building.advancementIdTokens)) return 'advancement';
  if (matchesTokens(name, bandConfig.building.advancementNameTokens)) return 'advancement';
  if (hasLandmarkClass(item.classes)) return 'advancement';
  const nonLandmarkAdvancementTokens = bandConfig.building.advancementClassTokens.filter(token => token !== 'landmark');
  if (nonLandmarkAdvancementTokens.length > 0 && hasClassToken(item.classes, nonLandmarkAdvancementTokens)) return 'advancement';

  const excludedFromPopulationCap = matchesTokens(id, bandConfig.building.populationCapExcludeIdTokens);
  if (!excludedFromPopulationCap) {
    if (matchesTokens(id, bandConfig.building.populationCapIdTokens)) return 'populationCap';
    if (matchesTokens(name, bandConfig.building.populationCapNameTokens)) return 'populationCap';
    if (hasClassToken(item.classes, bandConfig.building.populationCapClassTokens)) return 'populationCap';
  }

  if (matchesTokens(id, bandConfig.building.economicIdTokens)) return 'economic';
  if (matchesTokens(name, bandConfig.building.economicNameTokens)) return 'economic';

  if (isDockBuilding(item)) {
    return context.hasNavalMilitaryProduction ? 'militaryCapacity' : 'economic';
  }

  if (matchesTokens(id, bandConfig.building.defensiveIdTokens)) return 'defensive';
  if (matchesTokens(name, bandConfig.building.defensiveNameTokens)) return 'defensive';
  if (hasClassToken(item.classes, bandConfig.building.defensiveClassTokens)) return 'defensive';

  if (hasClassToken(item.classes, bandConfig.building.economicClassTokens)) return 'economic';

  if (matchesTokens(id, bandConfig.building.militaryCapacityIdTokens)) return 'militaryCapacity';
  if (matchesTokens(name, bandConfig.building.militaryCapacityNameTokens)) return 'militaryCapacity';
  if (hasClassToken(item.classes, bandConfig.building.militaryCapacityClassTokens)) return 'militaryCapacity';

  return 'economic';
}

function classifyUpgradeBand(item: ResolvedBuildItem): PoolBand {
  const id = normalizeText(item.id);

  if (matchesTokens(id, bandConfig.technology.advancementIdTokens)) return 'advancement';
  if (hasClassToken(item.classes, bandConfig.technology.advancementClassTokens)) return 'advancement';
  if (matchesTokens(id, bandConfig.technology.defensiveIdTokens)) return 'defensive';
  if (hasClassToken(item.classes, bandConfig.technology.defensiveClassTokens)) return 'defensive';

  return 'research';
}

export function classifyResolvedItemBand(
  item: ResolvedBuildItem,
  context: BandClassifierContext
): PoolBand | null {
  if (item.type === 'age' || item.type === 'animal') {
    return null;
  }

  if (item.type === 'upgrade') {
    return classifyUpgradeBand(item);
  }

  if (item.type === 'building') {
    return classifyBuildingBand(item, context);
  }

  if (item.type === 'unit') {
    return isEconomicUnit(item) ? 'economic' : 'militaryActive';
  }

  return null;
}

function resolveBandAllocations(
  item: ResolvedBuildItem,
  context: BandClassifierContext
): BandAllocation[] {
  const band = classifyResolvedItemBand(item, context);
  if (!band) return [];

  if (item.type === 'building') {
    const id = normalizeText(item.id);
    const name = normalizeText(item.name);
    const isJapaneseFarmhouse = id.includes('farmhouse') || name.includes('farmhouse');
    if (isJapaneseFarmhouse) {
      // Japanese Farmhouse is both a resource dropoff and pop-cap source.
      return [
        { band: 'economic', ratio: 0.5 },
        { band: 'populationCap', ratio: 0.5 },
      ];
    }
  }

  return [{ band, ratio: 1 }];
}

function createZeroBands(): Record<PoolBand, number> {
  return {
    economic: 0,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
  };
}

function applyDelta(
  deltasByTimestamp: Map<number, Record<PoolBand, number>>,
  timestamp: number,
  band: PoolBand,
  deltaValue: number
): void {
  const existing = deltasByTimestamp.get(timestamp) ?? createZeroBands();
  existing[band] += deltaValue;
  deltasByTimestamp.set(timestamp, existing);
}

function applyBandItemDelta(
  deltasByKey: Map<string, BandItemDeltaEvent>,
  event: BandItemDeltaEvent
): void {
  const direction = event.deltaValue < 0 || event.deltaCount < 0 ? 'loss' : 'gain';
  const key = `${event.timestamp}|${event.band}|${event.itemKey}|${direction}`;
  const existing = deltasByKey.get(key);
  if (existing) {
    existing.deltaValue += event.deltaValue;
    existing.deltaCount += event.deltaCount;
    deltasByKey.set(key, existing);
    return;
  }

  deltasByKey.set(key, { ...event });
}

function addTimestamp(timestampSet: Set<number>, value: number): void {
  if (!Number.isFinite(value)) return;
  if (value < 0) return;
  timestampSet.add(value);
}

function producedTimestampsForPool(item: ResolvedBuildItem, countStartedAdvancement: boolean): number[] {
  if (countStartedAdvancement && item.type === 'upgrade' && item.originalEntry.constructed.length > 0) {
    return item.originalEntry.constructed;
  }

  return item.produced;
}

interface PoolItemContext {
  item: ResolvedBuildItem;
  itemKey: string;
  itemLabel: string;
  allocations: BandAllocation[];
  allocationSignature: string;
  baseValue: number;
  lineKey: string;
  order: number;
}

interface LifecyclePoolEvent extends LifecycleEvent {
  context: PoolItemContext;
}

function allocationSignature(allocations: BandAllocation[]): string {
  return [...allocations]
    .sort((a, b) => a.band.localeCompare(b.band) || a.ratio - b.ratio)
    .map(allocation => `${allocation.band}:${allocation.ratio}`)
    .join('|');
}

function itemMarketValue(item: ResolvedBuildItem): number {
  if (item.type !== 'unit') {
    return item.cost.total;
  }

  const configuredOverride = (bandConfig.unit.marketValueByIdTokens ?? []).find(rule =>
    normalizeText(item.id).includes(normalizeText(rule.token))
  );
  const baseCost = item.cost.total > 0
    ? item.cost.total
    : configuredOverride?.value ?? item.cost.total;

  return baseCost;
}

function classifyResearchCategory(item: ResolvedBuildItem): string {
  const id = normalizeText(item.id);
  const name = normalizeText(item.name);
  const classes = item.classes.map(normalizeText);
  const valuesToScan = [id, name, ...classes];

  if (valuesToScan.some(value => militaryResearchTokens.some(token => value.includes(token)))) {
    return 'military';
  }

  if (valuesToScan.some(value => economicResearchTokens.some(token => value.includes(token)))) {
    return 'economic';
  }

  return 'other';
}

function classifyEconomicRole(item: ResolvedBuildItem): EconomicRole {
  if (item.type !== 'unit') {
    return 'resourceInfrastructure';
  }

  const id = normalizeText(item.id);
  const name = normalizeText(item.name);

  if (
    matchesTokens(id, economicInfrastructureUnitTokens) ||
    matchesTokens(name, economicInfrastructureUnitTokens)
  ) {
    return 'resourceInfrastructure';
  }

  if (isVillagerResolvedItem(item)) return 'resourceGenerator';
  if (matchesTokens(id, economicGeneratorIdTokens)) return 'resourceGenerator';
  if (matchesTokens(name, economicGeneratorNameTokens)) return 'resourceGenerator';
  if (hasExactClassToken(item.classes, economicGeneratorClassTokens)) return 'resourceGenerator';

  return 'resourceInfrastructure';
}

function economicRoleForBand(item: ResolvedBuildItem, band: PoolBand): EconomicRole | undefined {
  return band === 'economic' ? classifyEconomicRole(item) : undefined;
}

function activeCountForContext(activeCounts: Map<string, number>, context: PoolItemContext): number {
  return activeCounts.get(context.itemKey) ?? 0;
}

function findFallbackLifecycleContext(
  eventContext: PoolItemContext,
  contexts: PoolItemContext[],
  activeCounts: Map<string, number>
): PoolItemContext | null {
  return findSharedFallbackLifecycleContext({
    eventContext,
    contexts,
    activeCount: context => activeCountForContext(activeCounts, context),
    samePool: (context, currentEventContext) =>
      context.itemKey !== currentEventContext.itemKey &&
      context.allocationSignature === currentEventContext.allocationSignature,
  });
}

function includesAnyToken(value: string, tokens: string[]): boolean {
  const lower = normalizeText(value);
  return tokens.some(token => lower.includes(token));
}

function detectFreeProductionAt(
  playerCiv: string,
  item: ResolvedBuildItem,
  producedTimestamp: number,
  militarySchoolConstructedAt: number[]
): boolean {
  if (item.type !== 'unit') return false;

  const civ = normalizeCivilization(playerCiv);
  const id = normalizeText(item.id);
  const name = normalizeText(item.name);
  const classes = item.classes.map(normalizeText);

  const isByzantine = civ === 'by' || civ.includes('byzantine');
  if (isByzantine) {
    if (classes.some(cls => cls.includes('mercenary_byz') || cls.includes('mercenary'))) return true;
    if (includesAnyToken(id, ['mercenary']) || includesAnyToken(name, ['mercenary'])) return true;
  }

  const isOttoman = civ === 'ot' || civ.includes('ottoman');
  if (isOttoman) {
    const janissaryLike = includesAnyToken(id, ['janissary']) || includesAnyToken(name, ['janissary']);
    if (!janissaryLike) return false;
    return militarySchoolConstructedAt.some(ts => ts <= producedTimestamp);
  }

  return false;
}

function isLandmarkTownCenter(item: ResolvedBuildItem): boolean {
  if (item.type !== 'building') return false;
  const id = normalizeText(item.id);
  const name = normalizeText(item.name);
  const classes = item.classes;

  const isTownCenterLike = id.includes('town-center') || name.includes('town center');
  const isLandmark = hasExactClassToken(classes, ['landmark']) || name.includes('capital town center');
  return isTownCenterLike && isLandmark;
}

function isChineseOrZhuXi(civilization: string): boolean {
  const normalized = normalizeCivilization(civilization);
  return (
    normalized === 'ch' ||
    normalized.includes('chinese') ||
    normalized === 'zx' ||
    normalized.includes('zhu_xi')
  );
}

function hasTrackedImperialOfficial(items: ResolvedBuildItem[]): boolean {
  return items.some(item => {
    if (item.type !== 'unit') return false;
    const id = normalizeText(item.id);
    const name = normalizeText(item.name);
    return id.includes('imperial-official') || name.includes('imperial official');
  });
}

function createSyntheticImperialOfficial(): ResolvedBuildItem {
  return {
    originalEntry: {
      id: 'imperial-official-1',
      icon: 'synthetic://imperial-official',
      pbgid: -1,
      type: 'Unit',
      finished: [0],
      constructed: [],
      destroyed: []
    },
    type: 'unit',
    id: 'imperial-official-1',
    name: 'Imperial Official',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    tier: 1,
    tierMultiplier: 1,
    classes: ['official', 'worker'],
    produced: [0],
    destroyed: [],
    civs: ['ch', 'zx']
  };
}

interface BandItemAccumulatorEntry {
  itemKey: string;
  itemLabel: string;
  itemCategory?: string;
  itemEconomicRole?: EconomicRole;
  value: number;
  count: number;
}

function createBandItemAccumulator(): Record<PoolBand, Map<string, BandItemAccumulatorEntry>> {
  return {
    economic: new Map(),
    populationCap: new Map(),
    militaryCapacity: new Map(),
    militaryActive: new Map(),
    defensive: new Map(),
    research: new Map(),
    advancement: new Map(),
  };
}

function applyBandItemAccumulatorDelta(
  accumulator: Record<PoolBand, Map<string, BandItemAccumulatorEntry>>,
  event: BandItemDeltaEvent
): void {
  const bandMap = accumulator[event.band];
  const existing = bandMap.get(event.itemKey) ?? {
    itemKey: event.itemKey,
    itemLabel: event.itemLabel,
    itemCategory: event.itemCategory,
    itemEconomicRole: event.itemEconomicRole,
    value: 0,
    count: 0,
  };

  existing.value += event.deltaValue;
  existing.count += event.deltaCount;
  existing.itemLabel = event.itemLabel;
  if (event.itemCategory) existing.itemCategory = event.itemCategory;
  if (event.itemEconomicRole) existing.itemEconomicRole = event.itemEconomicRole;

  const shouldRemove = existing.count <= 0 || Math.abs(existing.value) < 1e-9;
  if (shouldRemove) {
    bandMap.delete(event.itemKey);
    return;
  }

  bandMap.set(event.itemKey, existing);
}

function buildBandItemSnapshotBands(
  accumulator: Record<PoolBand, Map<string, BandItemAccumulatorEntry>>,
  totals: Record<PoolBand, number>
): BandItemSnapshotBands {
  const result = {
    economic: [] as BandItemSnapshotEntry[],
    populationCap: [] as BandItemSnapshotEntry[],
    militaryCapacity: [] as BandItemSnapshotEntry[],
    militaryActive: [] as BandItemSnapshotEntry[],
    defensive: [] as BandItemSnapshotEntry[],
    research: [] as BandItemSnapshotEntry[],
    advancement: [] as BandItemSnapshotEntry[],
  };

  for (const band of poolBands) {
    const entries = [...accumulator[band].values()]
      .filter(entry => entry.value > 0 && entry.count > 0)
      .sort((a, b) => b.value - a.value || a.itemLabel.localeCompare(b.itemLabel));

    const denominator = totals[band] > 0 ? totals[band] : 1;
    result[band] = entries.map(entry => ({
      itemKey: entry.itemKey,
      itemLabel: entry.itemLabel,
      itemCategory: entry.itemCategory,
      itemEconomicRole: entry.itemEconomicRole,
      value: Number(entry.value.toFixed(2)),
      count: entry.count,
      percent: Number(((entry.value / denominator) * 100).toFixed(1)),
    }));
  }

  return result;
}

function buildGatherRateSeries(player: PlayerSummary): GatherRatePoint[] {
  const { resources } = player;
  const timestamps = resources.timestamps;
  const oliveOilPerMin = resources.oliveoilPerMin ?? [];

  const points: GatherRatePoint[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const ratePerMin =
      (resources.foodPerMin[i] ?? 0) +
      (resources.woodPerMin[i] ?? 0) +
      (resources.goldPerMin[i] ?? 0) +
      (resources.stonePerMin[i] ?? 0) +
      (oliveOilPerMin[i] ?? 0);

    points.push({
      timestamp: timestamps[i] ?? 0,
      ratePerMin,
    });
  }

  return points;
}

function roundUpToCleanNumber(value: number): number {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const step = magnitude / 2;

  return Math.ceil(value / step) * step;
}

function computeHasNavalMilitaryProduction(items: ResolvedBuildItem[]): boolean {
  return items.some(item => isNavalMilitaryUnit(item));
}

export function getDeferredCivilizationNotices(civilization: string): string[] {
  const normalized = normalizeCivilization(civilization);
  const notices: string[] = [];

  if (normalized === 'de' || normalized.includes('delhi')) {
    notices.push('Delhi analysis is deferred in v1; pool accounting may be incomplete for this player.');
  }

  if (
    normalized === 'je' ||
    normalized.includes('jeanne') ||
    normalized.includes('jeanne_d_arc') ||
    normalized.includes('jeanne_darc')
  ) {
    notices.push("Jeanne d'Arc analysis is deferred in v1; pool accounting may be incomplete for this player.");
  }

  return notices;
}

export function buildPlayerDeployedPoolSeries(
  player: PlayerSummary,
  build: ResolvedBuildOrder,
  gameDuration: number
): PlayerDeployedPoolSeries {
  const items: ResolvedBuildItem[] = [
    ...build.startingAssets,
    ...build.resolved,
  ];
  if (isChineseOrZhuXi(player.civilization) && !hasTrackedImperialOfficial(items)) {
    items.push(createSyntheticImperialOfficial());
  }
  const allItems = items;
  const hasNavalMilitaryProduction = computeHasNavalMilitaryProduction(allItems);
  const militarySchoolConstructedAt = allItems
    .filter(item => item.type === 'building')
    .filter(item => {
      const id = normalizeText(item.id);
      const classes = item.classes.map(normalizeText);
      return id.includes('military-school') || classes.some(cls => cls.includes('military_school_ott'));
    })
    .flatMap(item => item.produced)
    .sort((a, b) => a - b);

  const context: BandClassifierContext = { hasNavalMilitaryProduction };
  const deltasByTimestamp = new Map<number, Record<PoolBand, number>>();
  const bandItemDeltasByKey = new Map<string, BandItemDeltaEvent>();
  const freeValueByTimestamp = new Map<number, number>();
  const timestampSet = new Set<number>();

  addTimestamp(timestampSet, 0);
  addTimestamp(timestampSet, gameDuration);
  for (const timestamp of player.resources.timestamps) {
    addTimestamp(timestampSet, timestamp);
  }

  const lifecycleContexts: PoolItemContext[] = [];
  const lifecycleEvents: LifecyclePoolEvent[] = [];

  for (const [order, item] of items.entries()) {
    const allocations = resolveBandAllocations(item, context);
    if (allocations.length === 0) continue;

    const baseValue = itemMarketValue(item);
    if (!Number.isFinite(baseValue) || baseValue === 0) continue;
    const itemKey = `${item.type}:${item.id}`;
    const itemContext: PoolItemContext = {
      item,
      itemKey,
      itemLabel: item.name,
      allocations,
      allocationSignature: allocationSignature(allocations),
      baseValue,
      lineKey: unitLineKey(item),
      order,
    };
    lifecycleContexts.push(itemContext);

    const countStartedAdvancement = allocations.some(allocation => allocation.band === 'advancement');
    lifecycleEvents.push(
      ...buildLifecycleEvents(item, {
        producedTimestamps: producedTimestampsForPool(item, countStartedAdvancement),
      })
        .map(event => ({ ...event, context: itemContext }))
    );
  }

  lifecycleEvents.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.kind !== b.kind) return a.kind === 'produced' ? -1 : 1;
    return a.context.order - b.context.order;
  });

  const activeCounts = new Map<string, number>();
  for (const event of lifecycleEvents) {
    if (event.kind === 'produced') {
      const { context: eventContext } = event;
      const item = eventContext.item;
      activeCounts.set(eventContext.itemKey, activeCountForContext(activeCounts, eventContext) + 1);
      addTimestamp(timestampSet, event.timestamp);
      for (const allocation of eventContext.allocations) {
        const value = eventContext.baseValue * allocation.ratio;
        if (!Number.isFinite(value) || value === 0) continue;

        applyDelta(deltasByTimestamp, event.timestamp, allocation.band, value);
        applyBandItemDelta(bandItemDeltasByKey, {
          timestamp: event.timestamp,
          band: allocation.band,
          itemKey: eventContext.itemKey,
          itemLabel: eventContext.itemLabel,
          itemCategory: allocation.band === 'research' ? classifyResearchCategory(item) : undefined,
          itemEconomicRole: economicRoleForBand(item, allocation.band),
          deltaValue: value,
          deltaCount: 1,
        });
      }

      if (detectFreeProductionAt(player.civilization, item, event.timestamp, militarySchoolConstructedAt)) {
        const existing = freeValueByTimestamp.get(event.timestamp) ?? 0;
        freeValueByTimestamp.set(event.timestamp, existing + eventContext.baseValue);
      }
      continue;
    }

    const lossContext = activeCountForContext(activeCounts, event.context) > 0
      ? event.context
      : findFallbackLifecycleContext(event.context, lifecycleContexts, activeCounts);
    if (!lossContext) continue;
    activeCounts.set(lossContext.itemKey, activeCountForContext(activeCounts, lossContext) - 1);

    for (const allocation of lossContext.allocations) {
      if (allocation.band === 'research') continue;

      const value = lossContext.baseValue * allocation.ratio;
      if (!Number.isFinite(value) || value === 0) continue;

      addTimestamp(timestampSet, event.timestamp);
      applyDelta(deltasByTimestamp, event.timestamp, allocation.band, -value);
      applyBandItemDelta(bandItemDeltasByKey, {
        timestamp: event.timestamp,
        band: allocation.band,
        itemKey: lossContext.itemKey,
        itemLabel: lossContext.itemLabel,
        itemEconomicRole: economicRoleForBand(lossContext.item, allocation.band),
        deltaValue: -value,
        deltaCount: -1,
      });
    }
  }

  const timestamps = [...timestampSet].sort((a, b) => a - b);
  const running = createZeroBands();
  const series: PoolSeriesPoint[] = [];
  let peakTotal = 0;

  for (const timestamp of timestamps) {
    const delta = deltasByTimestamp.get(timestamp);
    if (delta) {
      for (const band of poolBands) {
        running[band] += delta[band];
        if (Math.abs(running[band]) < 1e-9) {
          running[band] = 0;
        }
      }
    }

    const total =
      running.economic +
      running.populationCap +
      running.militaryCapacity +
      running.militaryActive +
      running.defensive +
      running.research +
      running.advancement;

    peakTotal = Math.max(peakTotal, total);

    series.push({
      timestamp,
      economic: running.economic,
      populationCap: running.populationCap,
      militaryCapacity: running.militaryCapacity,
      militaryActive: running.militaryActive,
      defensive: running.defensive,
      research: running.research,
      advancement: running.advancement,
      total,
    });
  }

  const freeSeriesTimestamps = [0, ...freeValueByTimestamp.keys()].sort((a, b) => a - b);
  const uniqueFreeTimestamps = freeSeriesTimestamps.filter((value, index, arr) => index === 0 || arr[index - 1] !== value);
  let cumulativeFree = 0;
  const freeProductionSeries: FreeProductionPoint[] = uniqueFreeTimestamps.map(timestamp => {
    cumulativeFree += freeValueByTimestamp.get(timestamp) ?? 0;
    return {
      timestamp,
      cumulativeValue: cumulativeFree,
    };
  });

  const bandItemDeltas = [...bandItemDeltasByKey.values()]
    .filter(event => Math.abs(event.deltaValue) > 1e-9)
    .sort((a, b) =>
      a.timestamp - b.timestamp ||
      a.band.localeCompare(b.band) ||
      a.itemKey.localeCompare(b.itemKey) ||
      Number(a.deltaValue < 0) - Number(b.deltaValue < 0)
    );

  const bandItemEventsByTimestamp = new Map<number, BandItemDeltaEvent[]>();
  for (const event of bandItemDeltas) {
    const events = bandItemEventsByTimestamp.get(event.timestamp) ?? [];
    events.push(event);
    bandItemEventsByTimestamp.set(event.timestamp, events);
  }

  const bandItemAccumulator = createBandItemAccumulator();
  const bandItemSnapshots: BandItemSnapshotPoint[] = [];
  for (const point of series) {
    const events = bandItemEventsByTimestamp.get(point.timestamp) ?? [];
    for (const event of events) {
      applyBandItemAccumulatorDelta(bandItemAccumulator, event);
    }

    bandItemSnapshots.push({
      timestamp: point.timestamp,
      bands: buildBandItemSnapshotBands(bandItemAccumulator, {
        economic: point.economic,
        populationCap: point.populationCap,
        militaryCapacity: point.militaryCapacity,
        militaryActive: point.militaryActive,
        defensive: point.defensive,
        research: point.research,
        advancement: point.advancement,
      }),
    });
  }

  return {
    profileId: player.profileId,
    playerName: player.name,
    civilization: player.civilization,
    deferredNotices: getDeferredCivilizationNotices(player.civilization),
    gatherRateSeries: buildGatherRateSeries(player),
    freeProductionSeries,
    bandItemDeltas,
    bandItemSnapshots,
    series,
    peakTotal,
  };
}

export function buildDeployedResourcePools(
  summary: GameSummary,
  player1Build: ResolvedBuildOrder,
  player2Build: ResolvedBuildOrder
): DeployedResourcePools {
  const player1 = buildPlayerDeployedPoolSeries(summary.players[0], player1Build, summary.duration);
  const player2 = buildPlayerDeployedPoolSeries(summary.players[1], player2Build, summary.duration);

  const maxPeak = Math.max(player1.peakTotal, player2.peakTotal);
  const sharedYAxisMax = roundUpToCleanNumber(maxPeak * 1.1);

  return {
    player1,
    player2,
    sharedYAxisMax,
  };
}
