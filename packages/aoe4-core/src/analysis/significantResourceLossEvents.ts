import resourceBandConfigJson from '../data/resourceBandConfig.json';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { GameSummary, PlayerSummary } from '../parser/gameSummaryParser';
import { classifyResolvedItemBand, DeployedResourcePools, GatherRatePoint, PlayerDeployedPoolSeries, PoolBand } from './resourcePool';
import {
  buildLifecycleEvents,
  findFallbackLifecycleContext as findSharedFallbackLifecycleContext,
  LifecycleEvent,
  unitLineKey,
} from './resourceLifecycle';
import { buildVillagerOpportunityForPlayer, VILLAGER_RATE_BASELINE_RPM, VillagerOpportunityForPlayer } from './villagerOpportunity';
import { isVillagerBuildOrderEntry } from './villagerClassifier';

export const SIGNIFICANT_RESOURCE_LOSS_THRESHOLD = 0.075;
export const SIGNIFICANT_RESOURCE_LOSS_WINDOW_SECONDS = 60;
export const SIGNIFICANT_RESOURCE_LOSS_MIN_GROSS = 100;
const GATHER_DISRUPTION_MIN_BASELINE_RATE = 300;
const GATHER_DISRUPTION_MIN_DROP_RATIO = 0.10;
const GATHER_DISRUPTION_MIN_SHORTFALL = 100;

export type SignificantResourceLossKind = 'raid' | 'fight' | 'loss';

export interface SignificantResourceLossItem {
  label: string;
  value: number;
  count: number;
  band: PoolBand;
  showCount?: boolean;
  detail?: string;
  title?: string;
}

export interface SignificantResourceLossGatherDisruption {
  label: string;
  value: number;
  baselineRatePerMin: number;
  minRatePerMin: number;
  dropPercent: number;
  idleEquivalentVillagerSeconds: number;
  windowStart: number;
  windowEnd: number;
}

export interface SignificantResourceMilitarySituation {
  totalValue: number;
  units: SignificantResourceLossItem[];
}

export interface SignificantResourceLossPlayerImpact {
  immediateLoss: number;
  villagerOpportunityLoss: number;
  grossLoss: number;
  denominator: number;
  pctOfDeployed: number;
  villagerDeaths: number;
  gatherDisruption?: SignificantResourceLossGatherDisruption;
  losses: SignificantResourceLossItem[];
  topLosses: SignificantResourceLossItem[];
}

export interface SignificantResourceLossEvent {
  id: string;
  victimPlayer: 1 | 2;
  timestamp: number;
  windowStart: number;
  windowEnd: number;
  kind: SignificantResourceLossKind;
  label: string;
  shortLabel: string;
  description: string;
  impactSummary: string;
  grossImpact: number;
  grossLoss: number;
  immediateLoss: number;
  villagerOpportunityLoss: number;
  denominator: number;
  pctOfDeployed: number;
  villagerDeaths: number;
  topLosses: SignificantResourceLossItem[];
  playerImpacts: {
    player1: SignificantResourceLossPlayerImpact;
    player2: SignificantResourceLossPlayerImpact;
  };
  preEncounterArmies?: {
    player1: SignificantResourceMilitarySituation;
    player2: SignificantResourceMilitarySituation;
  };
  postEncounterArmies?: {
    player1: SignificantResourceMilitarySituation;
    player2: SignificantResourceMilitarySituation;
  };
}

export interface DetectSignificantResourceLossEventsParams {
  summary: GameSummary;
  deployedResourcePools: DeployedResourcePools;
  player1Build: ResolvedBuildOrder;
  player2Build: ResolvedBuildOrder;
  threshold?: number;
  windowSeconds?: number;
  minGrossLoss?: number;
}

interface GrossLossEvent {
  timestamp: number;
  band: PoolBand;
  label: string;
  value: number;
}

interface LossItemContext {
  item: ResolvedBuildItem;
  band: PoolBand;
  value: number;
  lineKey: string;
  order: number;
}

interface LifecycleLossEvent extends LifecycleEvent {
  context: LossItemContext;
}

interface CandidateWindow {
  victimPlayer: 1 | 2;
  start: number;
  end: number;
  primaryTimestamp: number;
  impact: WindowImpact;
}

interface LossContext {
  victimPlayer: 1 | 2;
  player: PlayerSummary;
  pool: PlayerDeployedPoolSeries;
  build: ResolvedBuildOrder;
  grossLossEvents: GrossLossEvent[];
  villagerDeathTimes: number[];
  opportunityCostForWindow: (start: number, end: number, deathTimes: number[]) => number;
}

interface WindowImpact {
  immediateEvents: GrossLossEvent[];
  immediateLoss: number;
  villagerOpportunityLoss: number;
  villagerDeaths: number;
  gatherDisruption?: SignificantResourceLossGatherDisruption;
  grossLoss: number;
  denominator: number;
  pct: number;
  losses: SignificantResourceLossItem[];
  topLosses: SignificantResourceLossItem[];
}

const bandConfig = resourceBandConfigJson as {
  unit?: {
    marketValueByIdTokens?: Array<{ token: string; value: number }>;
  };
};

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function itemMarketValue(item: ResolvedBuildItem): number {
  if (item.type !== 'unit') {
    return item.cost.total;
  }

  const override = (bandConfig.unit?.marketValueByIdTokens ?? []).find(rule =>
    normalizeText(item.id).includes(normalizeText(rule.token))
  );
  const baseCost = item.cost.total > 0
    ? item.cost.total
    : override?.value ?? item.cost.total;

  return baseCost;
}

function hasNavalMilitaryProduction(build: ResolvedBuildOrder): boolean {
  return [...build.startingAssets, ...build.resolved].some(item => {
    if (item.type !== 'unit') return false;
    if (item.produced.length === 0) return false;
    const classText = item.classes.map(normalizeText).join(' ');
    const nameText = `${item.id} ${item.name}`.toLowerCase();
    const looksNaval = classText.includes('naval') || classText.includes('ship') || nameText.includes('ship');
    const looksEconomic = classText.includes('worker') || classText.includes('villager') || classText.includes('trade');
    return looksNaval && !looksEconomic;
  });
}

function activeCountForContext(activeCounts: Map<LossItemContext, number>, context: LossItemContext): number {
  return activeCounts.get(context) ?? 0;
}

function findFallbackLossContext(
  eventContext: LossItemContext,
  contexts: LossItemContext[],
  activeCounts: Map<LossItemContext, number>
): LossItemContext | null {
  return findSharedFallbackLifecycleContext({
    eventContext,
    contexts,
    activeCount: context => activeCountForContext(activeCounts, context),
    samePool: (context, currentEventContext) => context.band === currentEventContext.band,
  });
}

function buildLossLifecycleContext(build: ResolvedBuildOrder): {
  contexts: LossItemContext[];
  events: LifecycleLossEvent[];
} {
  const classifierContext = { hasNavalMilitaryProduction: hasNavalMilitaryProduction(build) };
  const contexts: LossItemContext[] = [];
  const events: LifecycleLossEvent[] = [];

  for (const [order, item] of [...build.startingAssets, ...build.resolved].entries()) {
    const band = classifyResolvedItemBand(item, classifierContext);
    if (!band || band === 'research') continue;

    const value = itemMarketValue(item);
    if (!Number.isFinite(value) || value <= 0) continue;

    const context: LossItemContext = {
      item,
      band,
      value,
      lineKey: unitLineKey(item),
      order,
    };
    contexts.push(context);
    events.push(...buildLifecycleEvents(item).map(event => ({ ...event, context })));
  }

  events.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.kind !== b.kind) return a.kind === 'produced' ? -1 : 1;
    return a.context.order - b.context.order;
  });

  return { contexts, events };
}

function buildGrossLossEvents(build: ResolvedBuildOrder): GrossLossEvent[] {
  const { contexts, events: lifecycleEvents } = buildLossLifecycleContext(build);
  const events: GrossLossEvent[] = [];
  const activeCounts = new Map<LossItemContext, number>();

  for (const event of lifecycleEvents) {
    if (event.kind === 'produced') {
      activeCounts.set(event.context, activeCountForContext(activeCounts, event.context) + 1);
      continue;
    }

    const lossContext = activeCountForContext(activeCounts, event.context) > 0
      ? event.context
      : findFallbackLossContext(event.context, contexts, activeCounts);
    if (!lossContext) continue;

    activeCounts.set(lossContext, activeCountForContext(activeCounts, lossContext) - 1);
    events.push({
      timestamp: event.timestamp,
      band: lossContext.band,
      label: lossContext.item.name,
      value: lossContext.value,
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp || a.label.localeCompare(b.label));
}

function activeCountsAtWindowStart(
  lifecycleEvents: LifecycleLossEvent[],
  contexts: LossItemContext[],
  timestamp: number
): Map<LossItemContext, number> {
  const activeCounts = new Map<LossItemContext, number>();

  for (const event of lifecycleEvents) {
    if (event.timestamp > timestamp) break;
    if (event.kind === 'produced') {
      activeCounts.set(event.context, activeCountForContext(activeCounts, event.context) + 1);
      continue;
    }

    if (event.timestamp < timestamp) {
      const lossContext = activeCountForContext(activeCounts, event.context) > 0
        ? event.context
        : findFallbackLossContext(event.context, contexts, activeCounts);
      if (lossContext) {
        activeCounts.set(lossContext, activeCountForContext(activeCounts, lossContext) - 1);
      }
    }
  }

  return activeCounts;
}

function activeCountsAtWindowEnd(
  lifecycleEvents: LifecycleLossEvent[],
  contexts: LossItemContext[],
  timestamp: number
): Map<LossItemContext, number> {
  const activeCounts = new Map<LossItemContext, number>();

  for (const event of lifecycleEvents) {
    if (event.timestamp > timestamp) break;
    if (event.kind === 'produced') {
      activeCounts.set(event.context, activeCountForContext(activeCounts, event.context) + 1);
      continue;
    }

    const lossContext = activeCountForContext(activeCounts, event.context) > 0
      ? event.context
      : findFallbackLossContext(event.context, contexts, activeCounts);
    if (lossContext) {
      activeCounts.set(lossContext, activeCountForContext(activeCounts, lossContext) - 1);
    }
  }

  return activeCounts;
}

function buildMilitarySituationFromActiveCounts(
  contexts: LossItemContext[],
  activeCounts: Map<LossItemContext, number>
): SignificantResourceMilitarySituation {
  const byLabel = new Map<string, SignificantResourceLossItem>();

  for (const itemContext of contexts) {
    if (itemContext.band !== 'militaryActive') continue;
    const count = activeCountForContext(activeCounts, itemContext);
    if (count <= 0) continue;

    const value = itemContext.value;
    if (!Number.isFinite(value) || value <= 0) continue;

    const existing = byLabel.get(itemContext.item.name) ?? {
      label: itemContext.item.name,
      value: 0,
      count: 0,
      band: itemContext.band,
    };
    existing.value += value * count;
    existing.count += count;
    byLabel.set(itemContext.item.name, existing);
  }

  const allUnits = [...byLabel.values()]
    .map(item => ({
      ...item,
      value: Math.round(item.value),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  return {
    totalValue: allUnits.reduce((sum, item) => sum + item.value, 0),
    units: allUnits.slice(0, 4),
  };
}

function buildMilitarySituationAtWindowStart(
  context: LossContext,
  timestamp: number
): SignificantResourceMilitarySituation {
  const { contexts, events } = buildLossLifecycleContext(context.build);
  return buildMilitarySituationFromActiveCounts(
    contexts,
    activeCountsAtWindowStart(events, contexts, timestamp)
  );
}

function buildMilitarySituationAtWindowEnd(
  context: LossContext,
  timestamp: number
): SignificantResourceMilitarySituation {
  const { contexts, events } = buildLossLifecycleContext(context.build);
  return buildMilitarySituationFromActiveCounts(
    contexts,
    activeCountsAtWindowEnd(events, contexts, timestamp)
  );
}

function valueAtOrBefore(series: PlayerDeployedPoolSeries['series'], timestamp: number): number {
  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate?.total ?? 0;
}

function gatherRateAtOrBefore(series: GatherRatePoint[], timestamp: number): number {
  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate?.ratePerMin ?? 0;
}

function gatherDisruptionForWindow(
  series: GatherRatePoint[],
  start: number,
  end: number
): SignificantResourceLossGatherDisruption | undefined {
  if (series.length === 0 || end <= start) return undefined;

  const baselineRatePerMin = gatherRateAtOrBefore(series, start);
  if (baselineRatePerMin < GATHER_DISRUPTION_MIN_BASELINE_RATE) return undefined;

  const boundaries = [
    start,
    ...series
      .map(point => point.timestamp)
      .filter(timestamp => timestamp > start && timestamp < end),
    end,
  ].sort((a, b) => a - b);

  let shortfall = 0;
  let minRatePerMin = baselineRatePerMin;
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const segmentStart = boundaries[i];
    const segmentEnd = boundaries[i + 1];
    const ratePerMin = gatherRateAtOrBefore(series, segmentStart);
    minRatePerMin = Math.min(minRatePerMin, ratePerMin);
    shortfall += Math.max(0, baselineRatePerMin - ratePerMin) * ((segmentEnd - segmentStart) / 60);
  }
  minRatePerMin = Math.min(minRatePerMin, gatherRateAtOrBefore(series, end));

  const dropRatio = baselineRatePerMin > 0
    ? Math.max(0, (baselineRatePerMin - minRatePerMin) / baselineRatePerMin)
    : 0;
  if (dropRatio < GATHER_DISRUPTION_MIN_DROP_RATIO || shortfall < GATHER_DISRUPTION_MIN_SHORTFALL) {
    return undefined;
  }

  return {
    label: 'Gather disruption',
    value: Math.round(shortfall),
    baselineRatePerMin: Math.round(baselineRatePerMin),
    minRatePerMin: Math.round(minRatePerMin),
    dropPercent: Number((dropRatio * 100).toFixed(1)),
    idleEquivalentVillagerSeconds: Math.round((shortfall / VILLAGER_RATE_BASELINE_RPM) * 60),
    windowStart: start,
    windowEnd: end,
  };
}

function collectVillagerDeathTimes(player: PlayerSummary): number[] {
  return player.buildOrder
    .filter(isVillagerBuildOrderEntry)
    .flatMap(entry => entry.destroyed)
    .filter(timestamp => Number.isFinite(timestamp) && timestamp >= 0)
    .sort((a, b) => a - b);
}

function finalDeathLoss(opportunity: VillagerOpportunityForPlayer): number {
  return opportunity.series[opportunity.series.length - 1]?.cumulativeDeathLoss ?? 0;
}

function deathLossAtOrBefore(opportunity: VillagerOpportunityForPlayer, timestamp: number): number {
  let candidate = opportunity.series[0];
  for (const point of opportunity.series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate?.cumulativeDeathLoss ?? 0;
}

function removeVillagerDeathsInWindow(player: PlayerSummary, start: number, end: number): PlayerSummary {
  return {
    ...player,
    buildOrder: player.buildOrder.map(entry => {
      if (!isVillagerBuildOrderEntry(entry)) return entry;
      return {
        ...entry,
        destroyed: entry.destroyed.filter(timestamp => timestamp < start || timestamp > end),
      };
    }),
  };
}

function opportunityCostTimestamps(
  original: VillagerOpportunityForPlayer,
  counterfactual: VillagerOpportunityForPlayer,
  pool: PlayerDeployedPoolSeries,
  start: number,
  duration: number
): number[] {
  return [...new Set([
    ...original.series.map(point => point.timestamp),
    ...counterfactual.series.map(point => point.timestamp),
    ...pool.series.map(point => point.timestamp),
    duration,
  ])]
    .filter(timestamp => Number.isFinite(timestamp) && timestamp >= start)
    .sort((a, b) => a - b);
}

function scaledOpportunityCost(params: {
  original: VillagerOpportunityForPlayer;
  counterfactual: VillagerOpportunityForPlayer;
  pool: PlayerDeployedPoolSeries;
  start: number;
  duration: number;
}): number {
  const baseDeployed = Math.max(0, valueAtOrBefore(params.pool.series, params.start));
  let previousSavedLoss = 0;
  let scaledCost = 0;

  for (const timestamp of opportunityCostTimestamps(
    params.original,
    params.counterfactual,
    params.pool,
    params.start,
    params.duration
  )) {
    const originalLoss = deathLossAtOrBefore(params.original, timestamp);
    const counterfactualLoss = deathLossAtOrBefore(params.counterfactual, timestamp);
    const savedLoss = Math.max(0, originalLoss - counterfactualLoss);
    const increment = Math.max(0, savedLoss - previousSavedLoss);
    if (increment > 0) {
      const deployedAtIncrement = Math.max(1, valueAtOrBefore(params.pool.series, timestamp));
      const scaleWeight = baseDeployed > 0
        ? Math.min(1, baseDeployed / deployedAtIncrement)
        : 1;
      scaledCost += increment * scaleWeight;
    }
    previousSavedLoss = savedLoss;
  }

  return scaledCost;
}

function createOpportunityCostCalculator(
  player: PlayerSummary,
  duration: number,
  pool: PlayerDeployedPoolSeries
): (start: number, end: number, deathTimes: number[]) => number {
  const original = buildVillagerOpportunityForPlayer({ player, duration });
  const originalFinalDeathLoss = finalDeathLoss(original);
  const cache = new Map<string, number>();

  return (start, end, deathTimes) => {
    if (deathTimes.length === 0) return 0;
    const key = `${start}-${end}-${deathTimes.join(',')}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const counterfactual = buildVillagerOpportunityForPlayer({
      player: removeVillagerDeathsInWindow(player, start, end),
      duration,
    });
    const unscaledSaved = Math.max(0, originalFinalDeathLoss - finalDeathLoss(counterfactual));
    const saved = Math.min(unscaledSaved, scaledOpportunityCost({
      original,
      counterfactual,
      pool,
      start,
      duration,
    }));
    cache.set(key, saved);
    return saved;
  };
}

function windowStartsFor(lossTimestamps: number[], duration: number, windowSeconds: number): number[] {
  const maxStart = Math.max(0, Math.floor(duration - windowSeconds));
  const starts = new Set<number>();
  for (const timestamp of lossTimestamps) {
    const minStart = Math.max(0, Math.floor(timestamp - windowSeconds));
    const maxForTimestamp = Math.min(maxStart, Math.floor(timestamp));
    for (let start = minStart; start <= maxForTimestamp; start += 1) {
      starts.add(start);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

function aggregateLosses(events: GrossLossEvent[]): SignificantResourceLossItem[] {
  const byKey = new Map<string, SignificantResourceLossItem>();
  for (const event of events) {
    const key = `${event.band}|${event.label}`;
    const existing = byKey.get(key) ?? {
      label: event.label,
      value: 0,
      count: 0,
      band: event.band,
    };
    existing.value += event.value;
    existing.count += 1;
    byKey.set(key, existing);
  }

  return [...byKey.values()]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .map(item => ({
      ...item,
      value: Math.round(item.value),
    }));
}

function topLossesFrom(losses: SignificantResourceLossItem[]): SignificantResourceLossItem[] {
  return losses.slice(0, 4);
}

function primaryTimestampForWindow(
  immediateEvents: GrossLossEvent[],
  villagerDeathTimes: number[],
  start: number,
  end: number
): number {
  const valueByTimestamp = new Map<number, number>();
  for (const event of immediateEvents) {
    valueByTimestamp.set(event.timestamp, (valueByTimestamp.get(event.timestamp) ?? 0) + event.value);
  }

  let primaryTimestamp: number | null = null;
  let primaryValue = Number.NEGATIVE_INFINITY;
  for (const [timestamp, value] of valueByTimestamp) {
    if (value > primaryValue || (value === primaryValue && (primaryTimestamp === null || timestamp < primaryTimestamp))) {
      primaryTimestamp = timestamp;
      primaryValue = value;
    }
  }

  if (primaryTimestamp !== null) return primaryTimestamp;
  return villagerDeathTimes[0] ?? Math.round((start + end) / 2);
}

function overlaps(a: CandidateWindow, b: CandidateWindow): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function impactMilitaryLoss(impact: WindowImpact): number {
  return impact.topLosses
    .filter(item => item.band === 'militaryActive')
    .reduce((sum, item) => sum + item.value, 0);
}

function impactVillagerLoss(impact: WindowImpact): number {
  const directVillagerLoss = impact.immediateEvents
    .filter(event => {
      const label = normalizeText(event.label);
      return label.includes('villager') || label.includes('worker');
    })
    .reduce((sum, event) => sum + event.value, 0);
  return directVillagerLoss + impact.villagerOpportunityLoss;
}

function classifyKind(impacts: [WindowImpact, WindowImpact], grossImpact: number): SignificantResourceLossKind {
  const raidLoss = impacts.reduce((sum, impact) => sum + impactVillagerLoss(impact), 0);
  const militaryLoss = impacts.reduce((sum, impact) => sum + impactMilitaryLoss(impact), 0);
  const otherLoss = Math.max(0, grossImpact - raidLoss - militaryLoss);

  if (raidLoss > 0 && raidLoss >= militaryLoss && raidLoss >= otherLoss) return 'raid';
  if (militaryLoss >= Math.max(100, raidLoss, otherLoss)) return 'fight';

  return 'loss';
}

function labelForKind(kind: SignificantResourceLossKind): string {
  if (kind === 'raid') return 'Raid';
  if (kind === 'fight') return 'Fight';
  return 'Loss';
}

function describeWindow(params: {
  kind: SignificantResourceLossKind;
  windowSeconds: number;
  grossImpact: number;
  primaryImpact: WindowImpact;
  secondaryImpact: WindowImpact;
}): {
  description: string;
  impactSummary: string;
} {
  const { kind, windowSeconds, grossImpact, primaryImpact, secondaryImpact } = params;
  const label = labelForKind(kind).toLowerCase();
  const pct = primaryImpact.pct * 100;
  const topLossText = primaryImpact.topLosses.length > 0
    ? ` Top losses: ${primaryImpact.topLosses.map(item => `${item.label} x${item.count}`).join(', ')}.`
    : '';
  const opportunityText = primaryImpact.villagerOpportunityLoss > 0
    ? ` This includes ${Math.round(primaryImpact.villagerOpportunityLoss)} villager opportunity cost.`
    : '';
  const fightText = kind === 'fight'
    ? ` Both sides lost value: ${Math.round(primaryImpact.grossLoss)} vs ${Math.round(secondaryImpact.grossLoss)}.`
    : '';
  const description = `${labelForKind(kind)}: ${Math.round(grossImpact)} gross impact over ${windowSeconds} seconds (${pct.toFixed(1)}% of the primary victim's deployed resources).${fightText}${opportunityText}${topLossText}`;
  const impactSummary = `${Math.round(grossImpact)} gross impact, ${Math.round(primaryImpact.immediateLoss)} immediate loss for the primary victim, ${pct.toFixed(1)}% of deployed pool.`;

  return {
    description: description.replace(`${labelForKind(kind)}:`, `${label.charAt(0).toUpperCase() + label.slice(1)}:`),
    impactSummary,
  };
}

function buildLossContext(params: {
  victimPlayer: 1 | 2;
  pool: PlayerDeployedPoolSeries;
  build: ResolvedBuildOrder;
  summary: GameSummary;
}): LossContext | null {
  const player = params.summary.players[params.victimPlayer - 1];
  if (!player) return null;

  const grossLossEvents = buildGrossLossEvents(params.build);
  const villagerDeathTimes = collectVillagerDeathTimes(player);
  const opportunityCostForWindow = createOpportunityCostCalculator(player, params.summary.duration, params.pool);

  return {
    victimPlayer: params.victimPlayer,
    player,
    pool: params.pool,
    build: params.build,
    grossLossEvents,
    villagerDeathTimes,
    opportunityCostForWindow,
  };
}

function evaluateWindowImpact(context: LossContext, start: number, end: number): WindowImpact {
  const immediateEvents = context.grossLossEvents.filter(event => event.timestamp >= start && event.timestamp <= end);
  const immediateLoss = immediateEvents.reduce((sum, event) => sum + event.value, 0);
  const deathsInWindow = context.villagerDeathTimes.filter(timestamp => timestamp >= start && timestamp <= end);
  const villagerOpportunityLoss = context.opportunityCostForWindow(start, end, deathsInWindow);
  const gatherDisruption = gatherDisruptionForWindow(context.pool.gatherRateSeries, start, end);
  const grossLoss = immediateLoss + villagerOpportunityLoss;
  const denominator = valueAtOrBefore(context.pool.series, start);
  const pct = denominator > 0 ? grossLoss / denominator : 0;

  const losses = aggregateLosses(immediateEvents);
  return {
    immediateEvents,
    immediateLoss,
    villagerOpportunityLoss,
    villagerDeaths: deathsInWindow.length,
    gatherDisruption,
    grossLoss,
    denominator,
    pct,
    losses,
    topLosses: topLossesFrom(losses),
  };
}

function buildPlayerCandidates(params: {
  context: LossContext;
  summary: GameSummary;
  threshold: number;
  windowSeconds: number;
  minGrossLoss: number;
}): CandidateWindow[] {
  const context = params.context;
  const starts = windowStartsFor(
    [...context.grossLossEvents.map(event => event.timestamp), ...context.villagerDeathTimes],
    params.summary.duration,
    params.windowSeconds
  );
  const candidates: CandidateWindow[] = [];

  for (const start of starts) {
    const end = start + params.windowSeconds;
    const impact = evaluateWindowImpact(context, start, end);
    const passesAbsoluteGuard = impact.grossLoss >= params.minGrossLoss || impact.villagerOpportunityLoss > 0;

    if (!passesAbsoluteGuard || impact.pct < params.threshold) continue;

    candidates.push({
      victimPlayer: context.victimPlayer,
      start,
      end,
      primaryTimestamp: primaryTimestampForWindow(
        impact.immediateEvents,
        context.villagerDeathTimes.filter(timestamp => timestamp >= start && timestamp <= end),
        start,
        end
      ),
      impact,
    });
  }

  return candidates;
}

function selectNonOverlappingCandidates(candidates: CandidateWindow[]): CandidateWindow[] {
  const selected: CandidateWindow[] = [];
  const sorted = [...candidates].sort((a, b) =>
    b.impact.pct - a.impact.pct ||
    b.impact.grossLoss - a.impact.grossLoss ||
    a.start - b.start
  );

  for (const candidate of sorted) {
    if (selected.some(existing => overlaps(existing, candidate))) continue;
    selected.push(candidate);
  }

  return selected.sort((a, b) => a.primaryTimestamp - b.primaryTimestamp || a.victimPlayer - b.victimPlayer);
}

export function detectSignificantResourceLossEvents(params: DetectSignificantResourceLossEventsParams): SignificantResourceLossEvent[] {
  const threshold = params.threshold ?? SIGNIFICANT_RESOURCE_LOSS_THRESHOLD;
  const windowSeconds = params.windowSeconds ?? SIGNIFICANT_RESOURCE_LOSS_WINDOW_SECONDS;
  const minGrossLoss = params.minGrossLoss ?? SIGNIFICANT_RESOURCE_LOSS_MIN_GROSS;

  const player1Context = buildLossContext({
    summary: params.summary,
    victimPlayer: 1,
    pool: params.deployedResourcePools.player1,
    build: params.player1Build,
  });
  const player2Context = buildLossContext({
    summary: params.summary,
    victimPlayer: 2,
    pool: params.deployedResourcePools.player2,
    build: params.player2Build,
  });
  if (!player1Context || !player2Context) return [];

  const candidates = [
    ...buildPlayerCandidates({ context: player1Context, summary: params.summary, threshold, windowSeconds, minGrossLoss }),
    ...buildPlayerCandidates({ context: player2Context, summary: params.summary, threshold, windowSeconds, minGrossLoss }),
  ];

  return selectNonOverlappingCandidates(candidates).map((candidate, index) => {
    const player1Impact = evaluateWindowImpact(player1Context, candidate.start, candidate.end);
    const player2Impact = evaluateWindowImpact(player2Context, candidate.start, candidate.end);
    const primaryImpact = player1Impact.grossLoss >= player2Impact.grossLoss ? player1Impact : player2Impact;
    const secondaryImpact = primaryImpact === player1Impact ? player2Impact : player1Impact;
    const victimPlayer: 1 | 2 = primaryImpact === player1Impact ? 1 : 2;
    const grossImpact = player1Impact.grossLoss + player2Impact.grossLoss;
    const kind = classifyKind([player1Impact, player2Impact], grossImpact);
    const label = labelForKind(kind);
    const preEncounterArmies = kind === 'fight'
      ? {
          player1: buildMilitarySituationAtWindowStart(player1Context, candidate.start),
          player2: buildMilitarySituationAtWindowStart(player2Context, candidate.start),
        }
      : undefined;
    const postEncounterArmies = kind === 'fight'
      ? {
          player1: buildMilitarySituationAtWindowEnd(player1Context, candidate.end),
          player2: buildMilitarySituationAtWindowEnd(player2Context, candidate.end),
        }
      : undefined;
    const { description, impactSummary } = describeWindow({
      kind,
      windowSeconds,
      grossImpact,
      primaryImpact,
      secondaryImpact,
    });
    const primaryTimestamp = primaryTimestampForWindow(
      [...player1Impact.immediateEvents, ...player2Impact.immediateEvents],
      [
        ...player1Context.villagerDeathTimes.filter(timestamp => timestamp >= candidate.start && timestamp <= candidate.end),
        ...player2Context.villagerDeathTimes.filter(timestamp => timestamp >= candidate.start && timestamp <= candidate.end),
      ],
      candidate.start,
      candidate.end
    );

    return {
      id: `significant-loss-p${victimPlayer}-${Math.round(primaryTimestamp)}-${index}`,
      victimPlayer,
      timestamp: primaryTimestamp,
      windowStart: candidate.start,
      windowEnd: candidate.end,
      kind,
      label,
      shortLabel: label,
      description,
      impactSummary,
      grossImpact: Math.round(grossImpact),
      grossLoss: Math.round(primaryImpact.grossLoss),
      immediateLoss: Math.round(primaryImpact.immediateLoss),
      villagerOpportunityLoss: Math.round(primaryImpact.villagerOpportunityLoss),
      denominator: Math.round(primaryImpact.denominator),
      pctOfDeployed: Number((primaryImpact.pct * 100).toFixed(1)),
      villagerDeaths: primaryImpact.villagerDeaths,
      topLosses: primaryImpact.topLosses,
      playerImpacts: {
        player1: {
          immediateLoss: Math.round(player1Impact.immediateLoss),
          villagerOpportunityLoss: Math.round(player1Impact.villagerOpportunityLoss),
          grossLoss: Math.round(player1Impact.grossLoss),
          denominator: Math.round(player1Impact.denominator),
          pctOfDeployed: Number((player1Impact.pct * 100).toFixed(1)),
          villagerDeaths: player1Impact.villagerDeaths,
          gatherDisruption: player1Impact.gatherDisruption,
          losses: player1Impact.losses,
          topLosses: player1Impact.topLosses,
        },
        player2: {
          immediateLoss: Math.round(player2Impact.immediateLoss),
          villagerOpportunityLoss: Math.round(player2Impact.villagerOpportunityLoss),
          grossLoss: Math.round(player2Impact.grossLoss),
          denominator: Math.round(player2Impact.denominator),
          pctOfDeployed: Number((player2Impact.pct * 100).toFixed(1)),
          villagerDeaths: player2Impact.villagerDeaths,
          gatherDisruption: player2Impact.gatherDisruption,
          losses: player2Impact.losses,
          topLosses: player2Impact.topLosses,
        },
      },
      ...(preEncounterArmies ? { preEncounterArmies } : {}),
      ...(postEncounterArmies ? { postEncounterArmies } : {}),
    };
  });
}
