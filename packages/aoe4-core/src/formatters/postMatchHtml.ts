import { AgeMarker, PostMatchPlayerDisplay, PostMatchViewModel, SignificantTimelineEvent } from '../analysis/postMatchViewModel';
import { GatherRatePoint, PoolSeriesPoint } from '../analysis/resourcePool';
import { pointAtOrBefore } from '../analysis/timeSeries';
import { evaluateUnitPairCounterComputation } from '../data/combatValueEngine';
import type { PairCounterComputation } from '../data/counterMatrix';
import type { UnitWithValue } from '../types';
import {
  AllocationCategoryKey,
  AllocationGraphKey,
  buildAgeMarkerLayer,
  buildAllocationLeaderStripSvg,
  buildStrategyAllocationSvg,
  POST_MATCH_SVG_WIDTH,
  strategyPadding,
} from './postMatchAllocationCharts';
import { buildHoverInteractionScript } from './postMatchInteractionScript';
import {
  escapeHtml,
  formatNumber,
  formatPercent,
  formatPrecise,
  formatSigned,
  formatTime,
  REDDIT_FEEDBACK_HREF,
} from './sharedFormatters';
import {
  allocationCategoryDefs,
  AllocationCategoryAccounting,
  AllocationCategoryDef,
  AllocationComparison,
  AllocationComparisonRow,
  AllocationValues,
  buildAllocationCategories,
  buildAllocationCategoryAccounting,
  buildAllocationComparison,
  buildAllocationComparisonRow,
  buildAllocationLeaderSegments,
  buildStrategySnapshot,
  EconomicAllocationBasis,
  EconomicRole,
  HoverBandValues,
  OpportunityLostComponents,
  StrategyBucketKey,
} from '../presentation/postMatchPresentation';

interface BandDef {
  key: keyof Pick<
    PoolSeriesPoint,
    'economic' | 'populationCap' | 'militaryCapacity' | 'militaryActive' | 'defensive' | 'research' | 'advancement'
  >;
  label: string;
  color: string;
}

type HoverBandKey = BandDef['key'];
type CategoryDestroyedBreakdownKey =
  | 'economicDestroyed'
  | 'technologyDestroyed'
  | 'militaryDestroyed'
  | 'otherDestroyed';
type BreakdownKey = HoverBandKey | CategoryDestroyedBreakdownKey | 'destroyed' | 'float' | 'opportunityLost';

const bandDefs: BandDef[] = [
  { key: 'economic', label: 'Economic', color: '#5DCAA5' },
  { key: 'populationCap', label: 'Population cap', color: '#7AB8E6' },
  { key: 'militaryCapacity', label: 'Military buildings', color: '#EF9F27' },
  { key: 'militaryActive', label: 'Mil active', color: '#F0997B' },
  { key: 'defensive', label: 'Defensive', color: '#B4B2A9' },
  { key: 'research', label: 'Research', color: '#AFA9EC' },
  { key: 'advancement', label: 'Advancement', color: '#88AD6A' },
];

const faviconHref = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20width='32'%20height='32'%20rx='6'%20fill='%239b2f1f'/%3E%3Cpath%20d='M8%2022h16v3H8zM10%208h12l-2%2012h-8z'%20fill='%23fff9f5'/%3E%3C/svg%3E";

const TC_IDLE_SECONDS_TOOLTIP = 'Town-center idle seconds behind expected villager production. Resource loss can be much larger because delayed villagers miss gather time after they would have existed.';
type SignificantEventPlayerKey = 'player1' | 'player2';

const embeddedAoeTokenCss = `
      --aoe-color-bg: #f7f2e8;
      --aoe-color-bg-accent: #efe1cb;
      --aoe-color-surface: #fffdf9;
      --aoe-color-report-bg: #f2f4ee;
      --aoe-color-report-bg-secondary: #eef2e7;
      --aoe-color-report-surface: #fbfcf9;
      --aoe-color-text: #1f1a14;
      --aoe-color-report-text: #1f2a1f;
      --aoe-color-report-strong: #253226;
      --aoe-color-muted: #5f5345;
      --aoe-color-report-muted: #5b6257;
      --aoe-color-border: #d9c9ad;
      --aoe-color-report-border: #d6ddd1;
      --aoe-color-report-border-subtle: #edf1ea;
      --aoe-color-report-border-strong: #cad2c7;
      --aoe-color-report-chart-bg: #f7faf8;
      --aoe-color-report-control-bg: #ffffff;
      --aoe-color-report-control-hover: #f1f6fb;
      --aoe-color-report-control-selected: #f5f8f2;
      --aoe-color-report-link: #1f3551;
      --aoe-color-report-focus: #1f6fb7;
      --aoe-color-primary: #9d2f1b;
      --aoe-color-primary-border: #7f2014;
      --aoe-color-primary-contrast: #fff9f5;
      --aoe-color-field-bg: #ffffff;
      --aoe-color-error: #8f2714;
      --aoe-color-home-glow-primary: rgba(157, 47, 27, 0.08);
      --aoe-color-home-glow-secondary: rgba(39, 107, 80, 0.07);
      --aoe-color-you: #378add;
      --aoe-color-opponent: #d85a30;
      --aoe-radius-sm: 4px;
      --aoe-radius-md: 8px;
      --aoe-radius-lg: 10px;
      --aoe-space-1: 4px;
      --aoe-space-2: 8px;
      --aoe-space-3: 12px;
      --aoe-space-4: 16px;
      --aoe-space-6: 24px;
      --aoe-shadow-panel: 0 1px 3px rgba(32, 43, 32, 0.08);
      --aoe-shadow-home-panel: 0 10px 30px rgba(62, 45, 22, 0.08);
      --aoe-font-display: "Trebuchet MS", "Avenir Next", "Gill Sans", sans-serif;
      --aoe-font-report: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`.trim();

const svgWidth = POST_MATCH_SVG_WIDTH;
const poolPadding = { top: 54, right: 12, bottom: 30, left: 58 };
const gatherPadding = { top: 16, right: 12, bottom: 24, left: 56 };
const gatherHeight = 150;
const villagerChartWidth = 470;
const villagerPadding = { top: 14, right: 10, bottom: 24, left: 42 };
const villagerHeight = 180;
const MATRIX_STRONG_THRESHOLD = 1.2;
const MATRIX_WEAK_THRESHOLD = 0.85;
const significantVillagerOpportunityTooltip =
  'Scale-adjusted future missed gathering from killed villagers in this event window. The model removes those deaths, measures the future villager death-loss avoided, then discounts each future increment by event-time deployed resources divided by deployed resources at that later time.';
const destroyedRowTooltip =
  'Destroyed rows show value destroyed for the team in that column, not by that team. The opponent destroyed that value.';
const MAX_CLIENT_BAND_BREAKDOWN_ENTRIES = 8;
const OPPORTUNITY_LOST_VILLAGERS_LOST_CATEGORY = 'villagers-lost';
const OPPORTUNITY_LOST_UNDERPRODUCTION_CATEGORY = 'villager-underproduction';

export type RenderPlayerLabels = Record<'you' | 'opponent', PostMatchPlayerDisplay>;

export { buildAllocationCategories, buildAllocationLeaderSegments };

type AccountingSnapshot = NonNullable<PostMatchViewModel['trajectory']['hoverSnapshots'][number]['accounting']>;
type AccountingValues = AccountingSnapshot['you'];

interface HoverSnapshot {
  timestamp: number;
  timeLabel: string;
  poolX: number;
  strategyX: number;
  gatherX: number;
  villagerX: number;
  markers: string[];
  you: HoverBandValues;
  opponent: HoverBandValues;
  delta: HoverBandValues;
  accounting: AccountingSnapshot;
  allocation: AllocationComparison;
  allocationCategory: AllocationCategoryAccounting;
  opportunityLostComponents: OpportunityLostComponents;
  totalPoolTooltip: string;
  strategy: Record<StrategyBucketKey, {
    you: number;
    opponent: number;
    delta: number;
  }>;
  gather: {
    you: number;
    opponent: number;
    delta: number;
  };
  villagerOpportunity: PostMatchViewModel['trajectory']['hoverSnapshots'][number]['villagerOpportunity'];
  significantEvent: SignificantTimelineEvent | null;
  adjustedMilitary: {
    you: number;
    opponent: number;
    delta: number;
    youRaw: number;
    opponentRaw: number;
    youCounterAdjusted: number;
    opponentCounterAdjusted: number;
    youCounterMultiplier: number | null;
    opponentCounterMultiplier: number | null;
    youUpgradeMultiplier: number;
    opponentUpgradeMultiplier: number;
    youPct: number | null;
    opponentPct: number | null;
    youUnitBreakdown: Array<{
      unitId: string;
      unitName: string;
      count: number;
      rawValue: number;
      counterFactor: number;
      upgradeFactor: number;
      adjustedValue: number;
      deltaValue: number;
      why: string;
    }>;
    opponentUnitBreakdown: Array<{
      unitId: string;
      unitName: string;
      count: number;
      rawValue: number;
      counterFactor: number;
      upgradeFactor: number;
      adjustedValue: number;
      deltaValue: number;
      why: string;
    }>;
    matrix: AdjustedMatrixPayload;
  };
  bandBreakdown: Record<HoverBandKey, BandBreakdownPayload> & Partial<Record<CategoryDestroyedBreakdownKey | 'destroyed' | 'float' | 'opportunityLost', BandBreakdownPayload>>;
}

export type ClientHoverSnapshot = Pick<
  HoverSnapshot,
  | 'timestamp'
  | 'timeLabel'
  | 'strategyX'
  | 'markers'
  | 'you'
  | 'opponent'
  | 'delta'
  | 'allocation'
  | 'allocationCategory'
  | 'opportunityLostComponents'
  | 'totalPoolTooltip'
  | 'strategy'
  | 'gather'
  | 'significantEvent'
  | 'bandBreakdown'
> & {
  accounting?: HoverSnapshot['accounting'];
  adjustedMilitary?: HoverSnapshot['adjustedMilitary'];
};

interface RenderPostMatchHtmlOptions {
  surface?: 'web-mvp' | 'full';
  analyticsScript?: string;
  webVitalsScript?: string;
}

interface BandBreakdownPayload {
  you: BandBreakdownEntry[];
  opponent: BandBreakdownEntry[];
}

interface BandBreakdownEntry {
  label: string;
  value: number;
  percent: number;
  count?: number;
  category?: string;
  economicRole?: EconomicRole;
}

interface AdjustedMatrixCellPayload {
  score: number;
  heatClass: string;
  rowUnit: string;
  colUnit: string;
  whyHtml: string;
}

interface AdjustedMatrixRowPayload {
  unitName: string;
  cells: AdjustedMatrixCellPayload[];
}

interface AdjustedMatrixPayload {
  note: string;
  defaultWhyHtml: string;
  rows: AdjustedMatrixRowPayload[];
  columns: string[];
  emptyMessage?: string;
}

function fallbackPlayerDisplay(
  name: string,
  civilization: string,
  color: string
): PostMatchPlayerDisplay {
  const safeName = name.trim() || 'Player';
  const safeCivilization = civilization.trim() || 'Unknown civilization';
  return {
    name: safeName,
    civilization: safeCivilization,
    label: `${safeName} · ${safeCivilization}`,
    shortLabel: safeName,
    compactLabel: safeCivilization,
    compactShortLabel: safeCivilization,
    ageLabel: `${safeName} · ${safeCivilization}`,
    ageShortLabel: safeName,
    color,
  };
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function renderPlayerLabels(header: PostMatchViewModel['header']): RenderPlayerLabels {
  const partialHeader = header as Partial<PostMatchViewModel['header']>;
  const you = partialHeader.youPlayer
    ?? fallbackPlayerDisplay('Player 1', header.youCivilization, '#378ADD');
  const opponent = partialHeader.opponentPlayer
    ?? fallbackPlayerDisplay('Player 2', header.opponentCivilization, '#D85A30');
  const usePlayerNamesForCompactLabels =
    normalizeLabel(you.civilization) === normalizeLabel(opponent.civilization);
  const withPolicy = (display: PostMatchPlayerDisplay): PostMatchPlayerDisplay => ({
    ...display,
    compactLabel: usePlayerNamesForCompactLabels ? display.name : display.civilization,
    compactShortLabel: usePlayerNamesForCompactLabels ? display.shortLabel : display.civilization,
    ageLabel: display.label,
    ageShortLabel: display.shortLabel,
  });

  return {
    you: withPolicy(you),
    opponent: withPolicy(opponent),
  };
}

function formatMultiplier(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return `${formatPrecise(value, 3)}x`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return 'n/a';
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

function fallbackAccountingValues(values: HoverBandValues): AccountingValues {
  const destroyed = Math.max(0, Math.round(values.destroyed ?? 0));
  const float = Math.max(0, Math.round(values.float ?? 0));
  const gathered = Math.max(0, Math.round(values.gathered ?? values.total + destroyed + float));

  return {
    economic: Math.max(0, Math.round(values.economic)),
    populationCap: Math.max(0, Math.round(values.populationCap)),
    militaryCapacity: Math.max(0, Math.round(values.militaryCapacity)),
    militaryActive: Math.max(0, Math.round(values.militaryActive)),
    defensive: Math.max(0, Math.round(values.defensive)),
    research: Math.max(0, Math.round(values.research)),
    advancement: Math.max(0, Math.round(values.advancement)),
    destroyed,
    float,
    gathered,
    total: Math.max(0, Math.round(values.total)),
  };
}

function deltaAccountingValues(you: AccountingValues, opponent: AccountingValues): AccountingValues {
  return {
    economic: you.economic - opponent.economic,
    populationCap: you.populationCap - opponent.populationCap,
    militaryCapacity: you.militaryCapacity - opponent.militaryCapacity,
    militaryActive: you.militaryActive - opponent.militaryActive,
    defensive: you.defensive - opponent.defensive,
    research: you.research - opponent.research,
    advancement: you.advancement - opponent.advancement,
    destroyed: you.destroyed - opponent.destroyed,
    float: you.float - opponent.float,
    gathered: you.gathered - opponent.gathered,
    total: you.total - opponent.total,
  };
}

function fallbackAccountingSnapshot(
  you: HoverBandValues,
  opponent: HoverBandValues
): AccountingSnapshot {
  const accountingYou = fallbackAccountingValues(you);
  const accountingOpponent = fallbackAccountingValues(opponent);

  return {
    you: accountingYou,
    opponent: accountingOpponent,
    delta: deltaAccountingValues(accountingYou, accountingOpponent),
  };
}

function totalPoolTooltipText(
  allocationCategory: AllocationCategoryAccounting,
  labels: RenderPlayerLabels
): string {
  const youTotal =
    allocationCategory.economic.net.you +
    allocationCategory.technology.net.you +
    allocationCategory.military.net.you +
    allocationCategory.other.net.you;
  const opponentTotal =
    allocationCategory.economic.net.opponent +
    allocationCategory.technology.net.opponent +
    allocationCategory.military.net.opponent +
    allocationCategory.other.net.opponent;

  return [
    'Economic net + Technology net + Military net + Other net = Total pool',
    'Investment rows reconcile net + destroyed inside each category.',
    `${labels.you.compactLabel}: ${formatNumber(allocationCategory.economic.net.you)} + ${formatNumber(allocationCategory.technology.net.you)} + ${formatNumber(allocationCategory.military.net.you)} + ${formatNumber(allocationCategory.other.net.you)} = ${formatNumber(youTotal)}`,
    `${labels.opponent.compactLabel}: ${formatNumber(allocationCategory.economic.net.opponent)} + ${formatNumber(allocationCategory.technology.net.opponent)} + ${formatNumber(allocationCategory.military.net.opponent)} + ${formatNumber(allocationCategory.other.net.opponent)} = ${formatNumber(opponentTotal)}`,
  ].join(' | ');
}

function scaledX(timestamp: number, duration: number, padding: { left: number; right: number }): number {
  const maxX = Math.max(duration, 1);
  const plotWidth = svgWidth - padding.left - padding.right;
  return padding.left + (timestamp / maxX) * plotWidth;
}

function scaledVillagerX(timestamp: number, duration: number): number {
  const maxX = Math.max(duration, 1);
  const plotWidth = villagerChartWidth - villagerPadding.left - villagerPadding.right;
  return villagerPadding.left + (timestamp / maxX) * plotWidth;
}

function sumEconomicRole(entries: BandBreakdownEntry[], role: EconomicRole): number {
  return entries.reduce((sum, entry) => {
    const entryRole = entry.economicRole ?? 'resourceInfrastructure';
    return entryRole === role ? sum + Math.max(0, entry.value) : sum;
  }, 0);
}

function sumBreakdownValues(entries: BandBreakdownEntry[] | undefined): number {
  return (entries ?? []).reduce((sum, entry) => sum + Math.max(0, entry.value), 0);
}

function cumulativeUnderproductionOpportunityLoss(
  point: HoverSnapshot['villagerOpportunity']['you']
): number {
  if (typeof point.cumulativeUnderproductionLoss === 'number') {
    return Math.max(0, Math.round(point.cumulativeUnderproductionLoss));
  }
  if (typeof point.cumulativeDeathLoss === 'number') {
    return Math.max(0, Math.round(point.cumulativeLoss - point.cumulativeDeathLoss));
  }
  return 0;
}

function cumulativeUnderproductionSeconds(
  point: HoverSnapshot['villagerOpportunity']['you']
): number {
  return Math.max(0, Math.round(point.cumulativeUnderproductionSeconds ?? 0));
}

function formatSeconds(value: number): string {
  return `${formatNumber(value)}s`;
}

function formatSignedSeconds(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}s`;
}

function economicRoleTotalsFromBreakdown(
  breakdown?: BandBreakdownPayload
): Record<EconomicAllocationBasis, { you: number; opponent: number }> {
  const youEntries = breakdown?.you ?? [];
  const opponentEntries = breakdown?.opponent ?? [];
  return {
    resourceGeneration: {
      you: sumEconomicRole(youEntries, 'resourceGenerator'),
      opponent: sumEconomicRole(opponentEntries, 'resourceGenerator'),
    },
    resourceInfrastructure: {
      you: sumEconomicRole(youEntries, 'resourceInfrastructure'),
      opponent: sumEconomicRole(opponentEntries, 'resourceInfrastructure'),
    },
  };
}

type SignificantEventPlayerImpact = SignificantTimelineEvent['playerImpacts']['player1'];

function displaysSamePlayer(a: PostMatchPlayerDisplay, b: PostMatchPlayerDisplay): boolean {
  return a.name === b.name && a.civilization === b.civilization;
}

function gatherDisruptionResourceValue(impact?: SignificantEventPlayerImpact): number {
  const value = impact?.gatherDisruption?.value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function gatherDisruptionForPerspective(
  event: SignificantTimelineEvent,
  model: PostMatchViewModel
): { you: number; opponent: number } {
  const player1 = gatherDisruptionResourceValue(event.playerImpacts.player1);
  const player2 = gatherDisruptionResourceValue(event.playerImpacts.player2);
  if (
    displaysSamePlayer(model.header.youPlayer, model.header.player1) &&
    displaysSamePlayer(model.header.opponentPlayer, model.header.player2)
  ) {
    return { you: player1, opponent: player2 };
  }
  if (
    displaysSamePlayer(model.header.youPlayer, model.header.player2) &&
    displaysSamePlayer(model.header.opponentPlayer, model.header.player1)
  ) {
    return { you: player2, opponent: player1 };
  }
  return { you: player1, opponent: player2 };
}

function cumulativeGatherDisruptionAt(
  events: SignificantTimelineEvent[],
  timestamp: number,
  model: PostMatchViewModel
): { you: number; opponent: number } {
  return events.reduce((total, event) => {
    if (event.timestamp > timestamp) return total;
    const disruption = gatherDisruptionForPerspective(event, model);
    return {
      you: total.you + disruption.you,
      opponent: total.opponent + disruption.opponent,
    };
  }, { you: 0, opponent: 0 });
}

function buildHoverSnapshots(model: PostMatchViewModel, labels: RenderPlayerLabels): HoverSnapshot[] {
  const duration = model.trajectory.durationSeconds;
  const villagerDuration = Math.max(
    1,
    model.villagerOpportunity.resourceSeries.you[model.villagerOpportunity.resourceSeries.you.length - 1]?.timestamp ?? 0,
    model.villagerOpportunity.resourceSeries.opponent[model.villagerOpportunity.resourceSeries.opponent.length - 1]?.timestamp ?? 0,
    duration
  );
  const significantEvents = model.trajectory.significantEvents ?? [];
  return model.trajectory.hoverSnapshots.map((snapshot) => {
    const matrix = buildAdjustedMatrixPayload(
      snapshot.adjustedMilitary.youUnitBreakdown,
      snapshot.adjustedMilitary.opponentUnitBreakdown,
      model.header.youCivilization,
      model.header.opponentCivilization
    );
    const accounting = snapshot.accounting ?? fallbackAccountingSnapshot(snapshot.you, snapshot.opponent);
    const netAllocation = buildAllocationComparison(snapshot.you, snapshot.opponent);
    const opportunityLostBreakdown = snapshot.bandBreakdown.opportunityLost;
    const youVillagersLost = sumBreakdownValues(opportunityLostBreakdown?.you);
    const opponentVillagersLost = sumBreakdownValues(opportunityLostBreakdown?.opponent);
    const youUnderproduction = cumulativeUnderproductionOpportunityLoss(snapshot.villagerOpportunity.you);
    const opponentUnderproduction = cumulativeUnderproductionOpportunityLoss(snapshot.villagerOpportunity.opponent);
    const youUnderproductionSeconds = cumulativeUnderproductionSeconds(snapshot.villagerOpportunity.you);
    const opponentUnderproductionSeconds = cumulativeUnderproductionSeconds(snapshot.villagerOpportunity.opponent);
    const gatherDisruption = cumulativeGatherDisruptionAt(significantEvents, snapshot.timestamp, model);
    const opportunityLostComponents: OpportunityLostComponents = {
      villagersLost: buildAllocationComparisonRow(
        'opportunityLost',
        youVillagersLost,
        opponentVillagersLost,
        0,
        0
      ),
      underproduction: buildAllocationComparisonRow(
        'opportunityLost',
        youUnderproduction,
        opponentUnderproduction,
        0,
        0
      ),
      gatherDisruption: buildAllocationComparisonRow(
        'opportunityLost',
        gatherDisruption.you,
        gatherDisruption.opponent,
        0,
        0
      ),
      lowUnderproduction: buildAllocationComparisonRow(
        'opportunityLost',
        youUnderproductionSeconds,
        opponentUnderproductionSeconds,
        0,
        0
      ),
    };
    const investmentAllocation = buildAllocationComparison(
      {
        ...accounting.you,
        opportunityLost: youVillagersLost + youUnderproduction + gatherDisruption.you,
      },
      {
        ...accounting.opponent,
        opportunityLost: opponentVillagersLost + opponentUnderproduction + gatherDisruption.opponent,
      }
    );
    const allocation: AllocationComparison = {
      ...netAllocation,
      destroyed: investmentAllocation.destroyed,
      float: investmentAllocation.float,
      opportunityLost: investmentAllocation.opportunityLost,
    };
    const allocationCategory = buildAllocationCategoryAccounting(
      netAllocation,
      investmentAllocation,
      economicRoleTotalsFromBreakdown(snapshot.bandBreakdown.economic)
    );

    return {
      timestamp: snapshot.timestamp,
      timeLabel: snapshot.timeLabel,
      poolX: scaledX(snapshot.timestamp, duration, poolPadding),
      strategyX: scaledX(snapshot.timestamp, duration, strategyPadding),
      gatherX: scaledX(snapshot.timestamp, model.gatherRate.durationSeconds, gatherPadding),
      villagerX: scaledVillagerX(snapshot.timestamp, villagerDuration),
      markers: snapshot.markers,
      you: snapshot.you,
      opponent: snapshot.opponent,
      delta: snapshot.delta,
      accounting,
      allocation,
      allocationCategory,
      opportunityLostComponents,
      totalPoolTooltip: totalPoolTooltipText(allocationCategory, labels),
      strategy: buildStrategySnapshot(snapshot.you, snapshot.opponent),
      gather: snapshot.gather,
      villagerOpportunity: snapshot.villagerOpportunity,
      significantEvent: snapshot.significantEvent ?? null,
      adjustedMilitary: {
        ...snapshot.adjustedMilitary,
        matrix,
      },
      bandBreakdown: snapshot.bandBreakdown,
    };
  });
}

function opportunityLostBucketStartSeconds(entry: BandBreakdownEntry): number | null {
  const match = entry.label.match(/^(\d+):(\d{2})(?=-)/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeOpportunityLostCategory(entry: BandBreakdownEntry): string {
  if (entry.category === OPPORTUNITY_LOST_UNDERPRODUCTION_CATEGORY) {
    return OPPORTUNITY_LOST_UNDERPRODUCTION_CATEGORY;
  }
  return OPPORTUNITY_LOST_VILLAGERS_LOST_CATEGORY;
}

function opportunityLostCategoryRank(entry: BandBreakdownEntry): number {
  return normalizeOpportunityLostCategory(entry) === OPPORTUNITY_LOST_UNDERPRODUCTION_CATEGORY ? 1 : 0;
}

function orderOpportunityLostBreakdownEntries(entries: BandBreakdownEntry[]): BandBreakdownEntry[] {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      startSeconds: opportunityLostBucketStartSeconds(entry),
    }))
    .sort((a, b) => {
      const aStart = a.startSeconds ?? Number.POSITIVE_INFINITY;
      const bStart = b.startSeconds ?? Number.POSITIVE_INFINITY;
      return opportunityLostCategoryRank(a.entry) - opportunityLostCategoryRank(b.entry) ||
        aStart - bStart ||
        a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function compactBandBreakdownEntries(entries: BandBreakdownEntry[], bandKey: BreakdownKey): BandBreakdownEntry[] {
  const orderedEntries = bandKey === 'opportunityLost'
    ? orderOpportunityLostBreakdownEntries(entries)
    : entries;

  if (orderedEntries.length <= MAX_CLIENT_BAND_BREAKDOWN_ENTRIES) {
    return orderedEntries;
  }

  const sortedEntries = bandKey === 'opportunityLost'
    ? orderedEntries
    : [...orderedEntries].sort((a, b) => b.value - a.value);
  const visibleEntries = sortedEntries.slice(0, MAX_CLIENT_BAND_BREAKDOWN_ENTRIES);
  const hiddenEntries = sortedEntries.slice(MAX_CLIENT_BAND_BREAKDOWN_ENTRIES);
  if (bandKey === 'economic') {
    return [
      ...visibleEntries,
      ...compactHiddenEconomicEntries(hiddenEntries),
    ];
  }

  const hiddenValue = hiddenEntries.reduce((sum, entry) => sum + entry.value, 0);
  const hiddenPercent = hiddenEntries.reduce((sum, entry) => sum + entry.percent, 0);
  const hiddenCount = hiddenEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
  const hiddenLabel = bandKey === 'opportunityLost'
    ? `Later opportunity-loss buckets (${hiddenEntries.length})`
    : `Other active items (${hiddenEntries.length})`;
  const hiddenCategory = bandKey === 'opportunityLost' &&
    hiddenEntries.length > 0 &&
    hiddenEntries.every(entry => normalizeOpportunityLostCategory(entry) === normalizeOpportunityLostCategory(hiddenEntries[0]))
    ? normalizeOpportunityLostCategory(hiddenEntries[0])
    : undefined;

  return [
    ...visibleEntries,
    {
      label: hiddenLabel,
      value: Math.round(hiddenValue),
      percent: Math.round(hiddenPercent * 10) / 10,
      count: hiddenCount > 0 ? hiddenCount : undefined,
      category: hiddenCategory,
    },
  ];
}

function compactHiddenEconomicEntries(hiddenEntries: BandBreakdownEntry[]): BandBreakdownEntry[] {
  const roleDefs: Array<{ role: EconomicRole; label: string }> = [
    { role: 'resourceGenerator', label: 'Other resource generation items' },
    { role: 'resourceInfrastructure', label: 'Other resource infrastructure items' },
  ];

  return roleDefs
    .flatMap(def => {
      const entries = hiddenEntries.filter(entry =>
        (entry.economicRole ?? 'resourceInfrastructure') === def.role
      );
      if (entries.length === 0) return [];

      const hiddenValue = entries.reduce((sum, entry) => sum + entry.value, 0);
      const hiddenPercent = entries.reduce((sum, entry) => sum + entry.percent, 0);
      const hiddenCount = entries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

      const aggregate: BandBreakdownEntry = {
        label: `${def.label} (${entries.length})`,
        value: Math.round(hiddenValue),
        percent: Math.round(hiddenPercent * 10) / 10,
        count: hiddenCount > 0 ? hiddenCount : undefined,
        economicRole: def.role,
      };

      return [aggregate];
    });
}

function compactBandBreakdownPayload(snapshot: HoverSnapshot): ClientHoverSnapshot['bandBreakdown'] {
  const compacted: Partial<Record<BreakdownKey, BandBreakdownPayload>> = {};
  Object.entries(snapshot.bandBreakdown).forEach(([key, breakdown]) => {
    if (key === 'destroyed') return;
    compacted[key as BreakdownKey] = {
      you: compactBandBreakdownEntries(breakdown.you, key as BreakdownKey),
      opponent: compactBandBreakdownEntries(breakdown.opponent, key as BreakdownKey),
    };
  });
  return compacted as ClientHoverSnapshot['bandBreakdown'];
}

const hoverInteractionIntervalSeconds = 30;

function hoverSnapshotAtOrBefore<T extends { timestamp: number }>(points: T[], timestamp: number): T {
  if (points.length === 0) {
    throw new Error('Expected at least one hover snapshot');
  }

  let candidate = points[0];
  for (const point of points) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}

function selectInteractionHoverSnapshots(hoverSnapshots: HoverSnapshot[]): HoverSnapshot[] {
  if (hoverSnapshots.length <= 1) return hoverSnapshots;

  const selected = new Map<number, HoverSnapshot>();
  const addSnapshot = (snapshot: HoverSnapshot | undefined) => {
    if (!snapshot) return;
    selected.set(snapshot.timestamp, snapshot);
  };
  const finalTimestamp = Math.max(0, hoverSnapshots[hoverSnapshots.length - 1].timestamp);

  addSnapshot(hoverSnapshots[0]);
  addSnapshot(hoverSnapshots[hoverSnapshots.length - 1]);

  for (let timestamp = 0; timestamp <= finalTimestamp; timestamp += hoverInteractionIntervalSeconds) {
    addSnapshot(hoverSnapshotAtOrBefore(hoverSnapshots, timestamp));
  }

  for (const snapshot of hoverSnapshots) {
    if (snapshot.significantEvent || snapshot.markers.length > 0) {
      addSnapshot(snapshot);
    }
  }

  hoverSnapshots.forEach((snapshot, index) => {
    const previous = index > 0 ? hoverSnapshots[index - 1] : null;
    const next = index < hoverSnapshots.length - 1 ? hoverSnapshots[index + 1] : null;
    const previousGap = previous ? snapshot.timestamp - previous.timestamp : 0;
    const nextGap = next ? next.timestamp - snapshot.timestamp : 0;
    if (previousGap > 1 || nextGap > 1) {
      addSnapshot(snapshot);
    }
  });

  return [...selected.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function buildClientHoverSnapshots(
  hoverSnapshots: HoverSnapshot[],
  options: { includeAccounting?: boolean; includeAdjustedMilitary?: boolean } = {}
): ClientHoverSnapshot[] {
  return selectInteractionHoverSnapshots(hoverSnapshots).map(snapshot => {
    const payload: ClientHoverSnapshot = {
      timestamp: snapshot.timestamp,
      timeLabel: snapshot.timeLabel,
      strategyX: snapshot.strategyX,
      markers: snapshot.markers,
      you: snapshot.you,
      opponent: snapshot.opponent,
      delta: snapshot.delta,
      allocation: snapshot.allocation,
      allocationCategory: snapshot.allocationCategory,
      opportunityLostComponents: snapshot.opportunityLostComponents,
      totalPoolTooltip: snapshot.totalPoolTooltip,
      strategy: snapshot.strategy,
      gather: snapshot.gather,
      significantEvent: snapshot.significantEvent,
      bandBreakdown: compactBandBreakdownPayload(snapshot),
    };
    if (options.includeAccounting) {
      payload.accounting = snapshot.accounting;
    }
    if (options.includeAdjustedMilitary) {
      payload.adjustedMilitary = snapshot.adjustedMilitary;
    }
    return payload;
  });
}

export function buildPostMatchHoverPayload(model: PostMatchViewModel): ClientHoverSnapshot[] {
  const labels = renderPlayerLabels(model.header);
  return buildClientHoverSnapshots(buildHoverSnapshots(model, labels));
}

function hoverLabelX(xPos: number): number {
  return xPos > svgWidth - 170 ? xPos - 8 : xPos + 8;
}

function hoverLabelAnchor(xPos: number): string {
  return xPos > svgWidth - 170 ? 'end' : 'start';
}

function significantEventTitle(event: SignificantTimelineEvent | null): string {
  if (!event) return '';
  if (event.headline) return event.headline;
  return `${event.victimLabel} ${event.label}`;
}

function significantEventLossNameHtml(item: SignificantTimelineEvent['encounterLosses']['player1'][number]): string {
  const countLabel = item.showCount === false || item.count <= 0
    ? ''
    : ` <span class="event-impact-item-count">x${formatNumber(item.count)}</span>`;
  const helpButton = item.title
    ? `<button type="button" class="event-impact-help-button event-impact-inline-help-button" data-significant-event-loss-row-help aria-label="What is ${escapeHtml(item.label)}?" title="${escapeHtml(item.title)}">?</button>`
    : '';
  return `${escapeHtml(item.label)}${countLabel}${helpButton}${item.detail ? `<small class="event-impact-loss-note">${escapeHtml(item.detail)}</small>` : ''}`;
}

function significantEventLossTableRowsHtml(
  player1Items: SignificantTimelineEvent['encounterLosses']['player1'],
  player2Items: SignificantTimelineEvent['encounterLosses']['player2']
): string {
  const rowCount = Math.max(player1Items.length, player2Items.length, 1);
  let player1EmptyRendered = false;
  let player2EmptyRendered = false;
  return Array.from({ length: rowCount }, (_, index) => {
    const player1Item = player1Items[index];
    const player2Item = player2Items[index];
    const player1Cells = player1Item
      ? `
                <td class="event-impact-loss-name">${significantEventLossNameHtml(player1Item)}</td>
                <td class="event-impact-loss-value">${formatNumber(player1Item.value)}</td>`
      : !player1EmptyRendered
        ? `<td class="event-impact-loss-empty-side event-impact-loss-empty-side-player1" colspan="2" rowspan="${rowCount - index}">No losses</td>`
        : '';
    const player2Cells = player2Item
      ? `
                <td class="event-impact-loss-name">${significantEventLossNameHtml(player2Item)}</td>
                <td class="event-impact-loss-value">${formatNumber(player2Item.value)}</td>`
      : !player2EmptyRendered
        ? `<td class="event-impact-loss-empty-side event-impact-loss-empty-side-player2" colspan="2" rowspan="${rowCount - index}">No losses</td>`
        : '';
    if (!player1Item) player1EmptyRendered = true;
    if (!player2Item) player2EmptyRendered = true;
    return `
              <tr>
                ${player1Cells}
                ${player2Cells}
              </tr>`;
  }).join('');
}

function significantEventArmyTableRowsHtml(
  units: NonNullable<SignificantTimelineEvent['preEncounterArmies']>['player1']['units'] | undefined
): string {
  if (!units || units.length === 0) {
    return `
              <tr>
                <td class="event-impact-loss-row-empty">No active military</td>
                <td></td>
              </tr>`;
  }

  return units.map(unit => `
              <tr>
                <td class="event-impact-loss-name">${significantEventLossNameHtml(unit)}</td>
                <td class="event-impact-loss-value">${formatNumber(unit.value)}</td>
              </tr>`).join('');
}

function significantEventLossValue(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey,
  metric: 'grossLoss' | 'immediateLoss' | 'villagerOpportunityLoss' | 'denominator'
): number {
  if (!event) return 0;
  const impact = event.playerImpacts?.[playerKey];
  if (impact && Number.isFinite(impact[metric])) {
    return impact[metric];
  }
  if (metric === 'immediateLoss' || metric === 'grossLoss') {
    return (event.encounterLosses?.[playerKey] ?? [])
      .reduce((sum, item) => sum + item.value, 0);
  }
  return 0;
}

function significantEventGatherDisruption(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey
): NonNullable<SignificantTimelineEvent['playerImpacts']>['player1']['gatherDisruption'] | undefined {
  return event?.playerImpacts?.[playerKey]?.gatherDisruption;
}

function significantEventDisplayedTotalLoss(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey
): number {
  return significantEventLossValue(event, playerKey, 'grossLoss') +
    (significantEventGatherDisruption(event, playerKey)?.value ?? 0);
}

function significantEventDisplayedImmediateLoss(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey
): number {
  return significantEventLossValue(event, playerKey, 'immediateLoss') +
    (significantEventGatherDisruption(event, playerKey)?.value ?? 0);
}

function significantEventDisplayedPctOfDeployed(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey
): number {
  const denominator = significantEventLossValue(event, playerKey, 'denominator');
  if (denominator <= 0) return 0;
  return (significantEventDisplayedTotalLoss(event, playerKey) / denominator) * 100;
}

function significantEventLossPill(event: SignificantTimelineEvent | null): string {
  if (!event) return '';
  return `${formatNumber(significantEventDisplayedTotalLoss(event, 'player1'))} vs ${formatNumber(significantEventDisplayedTotalLoss(event, 'player2'))}`;
}

function significantEventArmyPill(event: SignificantTimelineEvent | null): string {
  if (!event) return '';
  return `Start ${formatNumber(significantEventArmyValue(event, 'player1', 'start'))} / ${formatNumber(significantEventArmyValue(event, 'player2', 'start'))} -> End ${formatNumber(significantEventArmyValue(event, 'player1', 'end'))} / ${formatNumber(significantEventArmyValue(event, 'player2', 'end'))}`;
}

function significantEventSummaryHtml(event: SignificantTimelineEvent | null): string {
  const player1Label = event?.player1Label ?? event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Label ?? event?.player2Civilization ?? 'Player 2';
  const showArmies = !!(event?.kind === 'fight' && (event.preEncounterArmies || event.postEncounterArmies));
  const player1OpportunityLoss = significantEventLossValue(event, 'player1', 'villagerOpportunityLoss');
  const player2OpportunityLoss = significantEventLossValue(event, 'player2', 'villagerOpportunityLoss');
  const showOpportunity = !!event && (player1OpportunityLoss > 0 || player2OpportunityLoss > 0);
  const armyHiddenAttr = showArmies ? '' : ' hidden';
  const opportunityHiddenAttr = showOpportunity ? '' : ' hidden';
  return `
            <div class="event-impact-summary" data-significant-event-summary>
              <div class="event-impact-loss-detail-title">Event summary</div>
              <table class="event-impact-summary-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col" data-significant-event-summary-heading="player1">${escapeHtml(player1Label)}</th>
                    <th scope="col" data-significant-event-summary-heading="player2">${escapeHtml(player2Label)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-significant-event-summary-army-row${armyHiddenAttr}>
                    <th scope="row">Window start active military</th>
                    <td data-significant-event-army-total="player1">${event ? formatNumber(significantEventArmyValue(event, 'player1', 'start')) : ''}</td>
                    <td data-significant-event-army-total="player2">${event ? formatNumber(significantEventArmyValue(event, 'player2', 'start')) : ''}</td>
                  </tr>
                  <tr data-significant-event-summary-army-row${armyHiddenAttr}>
                    <th scope="row">Window end active military</th>
                    <td data-significant-event-army-end-total="player1">${event ? formatNumber(significantEventArmyValue(event, 'player1', 'end')) : ''}</td>
                    <td data-significant-event-army-end-total="player2">${event ? formatNumber(significantEventArmyValue(event, 'player2', 'end')) : ''}</td>
                  </tr>
                  <tr>
                    <th scope="row">Total loss</th>
                    <td data-significant-event-loss-total="player1">${event ? formatNumber(significantEventDisplayedTotalLoss(event, 'player1')) : ''}</td>
                    <td data-significant-event-loss-total="player2">${event ? formatNumber(significantEventDisplayedTotalLoss(event, 'player2')) : ''}</td>
                  </tr>
                  <tr>
                    <th scope="row">Immediate loss</th>
                    <td data-significant-event-loss-immediate="player1">${event ? formatNumber(significantEventDisplayedImmediateLoss(event, 'player1')) : ''}</td>
                    <td data-significant-event-loss-immediate="player2">${event ? formatNumber(significantEventDisplayedImmediateLoss(event, 'player2')) : ''}</td>
                  </tr>
                  <tr data-significant-event-summary-villager-opportunity-row${opportunityHiddenAttr}>
                    <th scope="row"><span data-villager-opportunity-event-tooltip title="${escapeHtml(significantVillagerOpportunityTooltip)}">Villager opportunity</span></th>
                    <td data-significant-event-loss-villager-opportunity="player1">${event ? formatNumber(player1OpportunityLoss) : ''}</td>
                    <td data-significant-event-loss-villager-opportunity="player2">${event ? formatNumber(player2OpportunityLoss) : ''}</td>
                  </tr>
                  <tr>
                    <th scope="row" data-significant-event-loss-share-label>Share of deployed resources lost</th>
                    <td data-significant-event-loss-share="player1">${event ? `${formatPrecise(significantEventDisplayedPctOfDeployed(event, 'player1'), 1)}%` : ''}</td>
                    <td data-significant-event-loss-share="player2">${event ? `${formatPrecise(significantEventDisplayedPctOfDeployed(event, 'player2'), 1)}%` : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>`;
}

function significantEventLossesHtml(event: SignificantTimelineEvent | null): string {
  const player1Label = event?.player1Label ?? event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Label ?? event?.player2Civilization ?? 'Player 2';
  return `
            <details class="event-impact-detail-disclosure event-impact-loss-detail" data-significant-event-losses>
              <summary class="event-impact-detail-summary">
                <span class="event-impact-detail-summary-main">
                  <span class="event-impact-detail-summary-title">Encounter loss details</span>
                  <span class="event-impact-detail-summary-caption">Itemized unit and villager losses by player</span>
                </span>
                <span class="event-impact-detail-summary-value" data-significant-event-loss-pill>${escapeHtml(significantEventLossPill(event))}</span>
              </summary>
              <div class="event-impact-detail-body">
                <table class="event-impact-detail-table event-impact-loss-table">
                  <thead>
                    <tr>
                      <th scope="col" data-significant-event-loss-heading="player1">${escapeHtml(player1Label)} loss</th>
                      <th scope="col">Value</th>
                      <th scope="col" data-significant-event-loss-heading="player2">${escapeHtml(player2Label)} loss</th>
                      <th scope="col">Value</th>
                    </tr>
                  </thead>
                  <tbody data-significant-event-loss-table>
                    ${significantEventLossTableRowsHtml(event?.encounterLosses?.player1 ?? [], event?.encounterLosses?.player2 ?? [])}
                  </tbody>
                </table>
              </div>
            </details>`;
}

function significantEventArmyValue(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey,
  phase: 'start' | 'end'
): number {
  const armies = phase === 'start' ? event?.preEncounterArmies : event?.postEncounterArmies;
  return armies?.[playerKey]?.totalValue ?? 0;
}

function significantEventTitleHtml(event: SignificantTimelineEvent | null): string {
  const context = event?.favorableUnderdogFight;
  const hiddenAttr = context ? '' : ' hidden';
  return `
            <div class="event-impact-title">
              <span data-hover-field="significantEvent.label">${escapeHtml(significantEventTitle(event))}</span>
              <button type="button" class="event-impact-help-button" data-significant-event-underdog-toggle${hiddenAttr} aria-controls="event-impact-underdog-details" aria-label="Why did the smaller army win this fight?" title="Why did the smaller army win this fight?">?</button>
            </div>`;
}

function significantEventWindowArmiesHtml(event: SignificantTimelineEvent | null): string {
  const player1Label = event?.player1Label ?? event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Label ?? event?.player2Civilization ?? 'Player 2';
  const hiddenAttr = event?.kind === 'fight' && (event.preEncounterArmies || event.postEncounterArmies) ? '' : ' hidden';
  return `
            <details class="event-impact-detail-disclosure event-impact-army-detail" data-significant-event-armies${hiddenAttr}>
              <summary class="event-impact-detail-summary">
                <span class="event-impact-detail-summary-main">
                  <span class="event-impact-detail-summary-title">Event window army lists</span>
                  <span class="event-impact-detail-summary-caption">Start and end active-military compositions</span>
                </span>
                <span class="event-impact-detail-summary-value" data-significant-event-army-pill>${escapeHtml(significantEventArmyPill(event))}</span>
              </summary>
              <div class="event-impact-detail-body">
                <div class="event-impact-army-grid">
                  <div class="event-impact-army-table">
                    <h4 data-significant-event-army-heading="player1">Window start: ${escapeHtml(player1Label)}</h4>
                    <table>
                      <tbody data-significant-event-army-list="player1">${significantEventArmyTableRowsHtml(event?.preEncounterArmies?.player1.units)}</tbody>
                    </table>
                  </div>
                  <div class="event-impact-army-table">
                    <h4 data-significant-event-army-heading="player2">Window start: ${escapeHtml(player2Label)}</h4>
                    <table>
                      <tbody data-significant-event-army-list="player2">${significantEventArmyTableRowsHtml(event?.preEncounterArmies?.player2.units)}</tbody>
                    </table>
                  </div>
                  <div class="event-impact-army-table">
                    <h4 data-significant-event-army-end-heading="player1">Window end: ${escapeHtml(player1Label)}</h4>
                    <table>
                      <tbody data-significant-event-army-end-list="player1">${significantEventArmyTableRowsHtml(event?.postEncounterArmies?.player1.units)}</tbody>
                    </table>
                  </div>
                  <div class="event-impact-army-table">
                    <h4 data-significant-event-army-end-heading="player2">Window end: ${escapeHtml(player2Label)}</h4>
                    <table>
                      <tbody data-significant-event-army-end-list="player2">${significantEventArmyTableRowsHtml(event?.postEncounterArmies?.player2.units)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </details>`;
}

function significantEventUnderdogDetailsHtml(event: SignificantTimelineEvent | null): string {
  const context = event?.favorableUnderdogFight;
  const hiddenAttr = context ? '' : ' hidden';
  return `
            <details id="event-impact-underdog-details" class="event-impact-underdog-details" data-significant-event-underdog-details${hiddenAttr}>
              <summary>Why this fight is notable</summary>
              <p data-significant-event-underdog-details-text>${escapeHtml(context?.details ?? '')}</p>
            </details>`;
}

function playerColor(labels: RenderPlayerLabels, player: keyof RenderPlayerLabels): string {
  return labels[player].color;
}

function buildSignificantEventImpactHtml(event: SignificantTimelineEvent | null): string {
  const hiddenAttr = event ? '' : ' hidden';
  return `
          <details class="event-impact" data-significant-event${hiddenAttr} open>
            <summary class="event-impact-heading">Event impact</summary>
            ${significantEventTitleHtml(event)}
            ${significantEventSummaryHtml(event)}
            ${significantEventLossesHtml(event)}
            ${significantEventWindowArmiesHtml(event)}
            ${significantEventUnderdogDetailsHtml(event)}
          </details>`;
}

function mobileSummaryDetail(row: AllocationComparisonRow, labels: RenderPlayerLabels): string {
  return `${labels.you.compactShortLabel} ${formatNumber(row.you)} · ${labels.opponent.compactShortLabel} ${formatNumber(row.opponent)}`;
}

function buildMobileSummaryCard(
  key: AllocationGraphKey,
  label: string,
  row: AllocationComparisonRow,
  labels: RenderPlayerLabels
): string {
  return `
        <article class="mobile-summary-card" data-mobile-summary="${key}">
          <span class="mobile-summary-label">${escapeHtml(label)}</span>
          <strong data-mobile-summary-value="${key}">${formatSigned(row.delta)}</strong>
          <small data-mobile-summary-detail="${key}">${escapeHtml(mobileSummaryDetail(row, labels))}</small>
        </article>`;
}

function buildMobileSelectedSummaryHtml(snapshot: HoverSnapshot, labels: RenderPlayerLabels): string {
  const allocation = snapshot.allocation ?? buildAllocationComparison(snapshot.you, snapshot.opponent);
  return `
      <div class="mobile-selected-summary" aria-label="Selected timestamp summary">
        ${buildMobileSummaryCard('overall', 'Total pool', allocation.overall, labels)}
        ${buildMobileSummaryCard('technology', 'Technology', allocation.technology, labels)}
        ${buildMobileSummaryCard('military', 'Military', allocation.military, labels)}
        ${buildMobileSummaryCard('destroyed', 'Destroyed', allocation.destroyed, labels)}
      </div>`;
}

function buildMobileTimelineControlHtml(hoverSnapshots: HoverSnapshot[], defaultHover: HoverSnapshot): string {
  const maxIndex = Math.max(0, hoverSnapshots.length - 1);
  const context = defaultHover.markers.length > 0
    ? defaultHover.markers.join(' · ')
    : 'Use the slider or step buttons to inspect a timestamp.';

  return `
          <div class="mobile-timeline-control" aria-label="Match timeline controls">
            <div class="mobile-timeline-meta">
              <span>Selected time</span>
              <strong data-mobile-current-time>${escapeHtml(defaultHover.timeLabel)}</strong>
            </div>
            <div class="mobile-timeline-actions">
              <button type="button" class="mobile-timeline-button" data-mobile-timeline-step="-1" aria-label="Previous timestamp">Prev</button>
              <input
                class="mobile-timeline-slider"
                data-mobile-timeline-slider
                type="range"
                min="0"
                max="${maxIndex}"
                step="1"
                value="0"
                aria-label="Select match timestamp"
              />
              <button type="button" class="mobile-timeline-button" data-mobile-timeline-step="1" aria-label="Next timestamp">Next</button>
            </div>
            <div class="mobile-timeline-context" data-mobile-current-context>${escapeHtml(context)}</div>
          </div>`;
}

function buildMobileSnapshotControlsHtml(
  hoverSnapshots: HoverSnapshot[],
  defaultHover: HoverSnapshot,
  labels: RenderPlayerLabels
): string {
  return `
      <div class="mobile-snapshot-controls" data-mobile-snapshot-controls aria-label="Selected timestamp controls">
        ${buildMobileTimelineControlHtml(hoverSnapshots, defaultHover)}
        ${buildMobileSelectedSummaryHtml(defaultHover, labels)}
      </div>`;
}

function buildHoverInspectorHtml(
  snapshot: HoverSnapshot,
  labels: RenderPlayerLabels,
  options: { includeAdjustedMilitary?: boolean } = {}
): string {
  function displayBreakdownLabel(entry: BandBreakdownEntry): string {
    const countSuffix = typeof entry.count === 'number' && entry.count > 0
      ? ` (${formatNumber(entry.count)})`
      : '';
    return `${entry.label}${countSuffix}`;
  }

  function breakdownRowHtml(entry: BandBreakdownEntry): string {
    const label = displayBreakdownLabel(entry);
    return `
        <li>
          <span class="band-item-label band-item-label-truncated" title="${escapeHtml(label)}" tabindex="0">${escapeHtml(label)}</span>
          <span class="band-item-metric">${formatNumber(entry.value)}</span>
        </li>
      `;
  }

  function renderBreakdownList(entries: BandBreakdownEntry[], bandKey: BreakdownKey): string {
    if (entries.length === 0) {
      return bandKey === 'opportunityLost'
        ? '<li class="band-breakdown-empty">No villager deaths</li>'
        : '<li class="band-breakdown-empty">No active items</li>';
    }

    if (bandKey === 'research') {
      const categoryDefs: Array<{ key: string; label: string }> = [
        { key: 'military', label: 'Military research' },
        { key: 'economic', label: 'Economic research' },
        { key: 'other', label: 'Other research' },
      ];
      const groupedHtml = categoryDefs
        .map(def => {
          const groupEntries = entries.filter(entry => (entry.category ?? 'other') === def.key);
          if (groupEntries.length === 0) return '';
          const rows = groupEntries.map(entry => breakdownRowHtml(entry)).join('');

          return `
            <li class="band-breakdown-group">${escapeHtml(def.label)}</li>
            ${rows}
          `;
        })
        .join('');

      if (groupedHtml.length > 0) return groupedHtml;
    }

    if (bandKey === 'opportunityLost') {
      const categoryDefs: Array<{ key: string; label: string }> = [
        { key: OPPORTUNITY_LOST_VILLAGERS_LOST_CATEGORY, label: 'Villagers lost' },
        { key: OPPORTUNITY_LOST_UNDERPRODUCTION_CATEGORY, label: 'Villager underproduction' },
      ];
      const groupedHtml = categoryDefs
        .map(def => {
          const groupEntries = entries.filter(entry => normalizeOpportunityLostCategory(entry) === def.key);
          if (groupEntries.length === 0) return '';
          const rows = groupEntries.map(entry => breakdownRowHtml(entry)).join('');

          return `
            <li class="band-breakdown-group">${escapeHtml(def.label)}</li>
            ${rows}
          `;
        })
        .join('');

      if (groupedHtml.length > 0) return groupedHtml;
    }

    return entries.map(entry => breakdownRowHtml(entry)).join('');
  }

  const bandByKey = new Map(bandDefs.map(band => [band.key, band]));
  const allocation = snapshot.allocation ?? buildAllocationComparison(snapshot.you, snapshot.opponent);
  const allocationCategory = snapshot.allocationCategory
    ?? buildAllocationCategoryAccounting(
      buildAllocationComparison(snapshot.you, snapshot.opponent),
      allocation
    );
  const opportunityLostComponents = snapshot.opportunityLostComponents;
  const selectedBandSummary = {
    label: 'Economic',
    you: snapshot.you.economic,
    opponent: snapshot.opponent.economic,
    delta: snapshot.you.economic - snapshot.opponent.economic,
  };
  const youLabel = labels.you.compactLabel;
  const opponentLabel = labels.opponent.compactLabel;
  const youShortLabel = labels.you.compactShortLabel;
  const opponentShortLabel = labels.opponent.compactShortLabel;
  const youCellLabel = options.includeAdjustedMilitary ? 'You' : escapeHtml(youLabel);
  const opponentCellLabel = options.includeAdjustedMilitary ? 'Opp' : escapeHtml(opponentLabel);
  const inspectorTableLabel = options.includeAdjustedMilitary
    ? 'Hover inspector values table'
    : 'Selected timestamp values table';
  const destroyedBandKeyByCategory: Record<AllocationCategoryKey, CategoryDestroyedBreakdownKey> = {
    economic: 'economicDestroyed',
    technology: 'technologyDestroyed',
    military: 'militaryDestroyed',
    other: 'otherDestroyed',
  };

  const renderBandRow = (band: BandDef, categoryKey: AllocationCategoryKey, collapsed: boolean): string => {
      const isSelected = band.key === 'economic';
      const selectedClass = isSelected ? ' is-selected' : '';
      const subRow = options.includeAdjustedMilitary && band.key === 'militaryActive'
        ? `
          <tr class="band-sub-row inspector-adjusted-row" data-allocation-category-child="${categoryKey}"${collapsed ? ' hidden' : ''}>
            <th><button type="button" class="band-sub-link" data-open-adjusted-explainer>Adjusted mil active</button></th>
            <td data-cell-label="${youCellLabel}" data-hover-field="adjustedMilitary.you"><span class="inspector-adjusted-value-main">${formatNumber(snapshot.adjustedMilitary.you)}</span><small class="inspector-adjusted-value-pct">(${formatSignedPercent(snapshot.adjustedMilitary.youPct)})</small></td>
            <td data-cell-label="${opponentCellLabel}" data-hover-field="adjustedMilitary.opponent"><span class="inspector-adjusted-value-main">${formatNumber(snapshot.adjustedMilitary.opponent)}</span><small class="inspector-adjusted-value-pct">(${formatSignedPercent(snapshot.adjustedMilitary.opponentPct)})</small></td>
            <td data-cell-label="Delta" data-hover-field="adjustedMilitary.delta">${formatSigned(snapshot.adjustedMilitary.delta)}</td>
          </tr>
        `
        : '';

      return `
        <tr class="band-row${selectedClass}" data-allocation-category-child="${categoryKey}"${collapsed ? ' hidden' : ''}>
          <th>
            <button type="button" class="band-toggle" data-band-key="${band.key}" aria-pressed="${isSelected ? 'true' : 'false'}">
              ${escapeHtml(band.label)}
            </button>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="you.${band.key}">${formatNumber(snapshot.you[band.key])}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="opponent.${band.key}">${formatNumber(snapshot.opponent[band.key])}</td>
          <td data-cell-label="Delta" data-hover-field="delta.${band.key}">${formatSigned(snapshot.delta[band.key])}</td>
        </tr>
        ${subRow}
      `;
  };

  const renderCategoryDestroyedRow = (category: AllocationCategoryDef, collapsed: boolean): string => {
    const row = allocationCategory[category.key].destroyed;
    const destroyedBandKey = destroyedBandKeyByCategory[category.key];
    const rowEmpty = row.you <= 0 && row.opponent <= 0;
    const rowHidden = collapsed || rowEmpty;
    const label = category.key === 'technology'
      ? 'Advancement destroyed'
      : `${category.label} destroyed`;
    return `
        <tr class="band-row allocation-category-accounting-row allocation-category-destroyed-row" data-allocation-category-child="${category.key}" data-allocation-category-accounting="${category.key}-destroyed" data-destroyed-row-category="${category.key}" data-destroyed-row-empty="${rowEmpty ? 'true' : 'false'}"${rowHidden ? ' hidden' : ''}>
          <th>
            <div class="destroyed-row-label">
              <button type="button" class="band-toggle" data-band-key="${destroyedBandKey}" aria-pressed="false">
                <span data-destroyed-row-label>${escapeHtml(label)}</span>
              </button>
              <button type="button" class="event-impact-help-button destroyed-row-help-button" data-destroyed-help-button data-destroyed-tooltip-copy="${escapeHtml(destroyedRowTooltip)}" data-tooltip-open="false" aria-expanded="false" aria-controls="destroyed-row-tooltip-${category.key}" aria-label="What does ${escapeHtml(label)} mean?" title="What does ${escapeHtml(label)} mean?">?</button>
              <span id="destroyed-row-tooltip-${category.key}" class="destroyed-row-tooltip" role="tooltip" hidden>${escapeHtml(destroyedRowTooltip)}</span>
            </div>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="allocationCategory.${category.key}.destroyed.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="allocationCategory.${category.key}.destroyed.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocationCategory.${category.key}.destroyed.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };

  const renderCategoryInvestmentRow = (category: AllocationCategoryDef, collapsed: boolean): string => {
    const row = allocationCategory[category.key].investment;
    const investmentBandKey = `${category.key}Investment`;
    return `
        <tr class="band-row allocation-category-accounting-row allocation-category-investment-row" data-allocation-category-child="${category.key}" data-allocation-category-accounting="${category.key}-investment"${collapsed ? ' hidden' : ''}>
          <th>
            <button type="button" class="band-toggle" data-band-key="${investmentBandKey}" data-allocation-investment-category="${category.key}" aria-pressed="false">
              Total ${escapeHtml(category.label)} Investment
            </button>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="allocationCategory.${category.key}.investment.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="allocationCategory.${category.key}.investment.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocationCategory.${category.key}.investment.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };

  const renderEconomicRoleRow = (
    basis: EconomicAllocationBasis,
    label: string,
    accountingKey: string,
    roleFilter: EconomicRole,
    collapsed: boolean
  ): string => {
    const row = allocationCategory.economic[basis] ?? buildAllocationComparisonRow('economic', 0, 0, 0, 0);
    return `
        <tr class="band-row allocation-category-accounting-row allocation-category-investment-row" data-allocation-category-child="economic" data-allocation-category-accounting="${accountingKey}"${collapsed ? ' hidden' : ''}>
          <th>
            <button type="button" class="band-toggle" data-band-key="economic" data-economic-role-filter="${roleFilter}" aria-pressed="false">
              ${escapeHtml(label)}
            </button>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="allocationCategory.economic.${basis}.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="allocationCategory.economic.${basis}.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocationCategory.economic.${basis}.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };

  const renderOpportunityLostRow = (): string => {
    const row = allocation.opportunityLost;
    const tooltip = 'Opportunity lost is split into Villagers lost and Villager underproduction. Values show resources lost by selected time. The bucket list shows actual villager-death windows; underproduction is shown in the summary.';
    return `
        <tr class="band-row inspector-opportunity-lost-row" data-inspector-row="opportunityLost">
          <th>
            <button type="button" class="band-toggle" data-band-key="opportunityLost" aria-pressed="false" title="${escapeHtml(tooltip)}">
              <span data-opportunity-lost-tooltip title="${escapeHtml(tooltip)}">Opportunity lost by selected time</span>
            </button>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="allocation.opportunityLost.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="allocation.opportunityLost.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.opportunityLost.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };

  const bandRows = allocationCategoryDefs
    .map(category => {
      const row = allocationCategory[category.key].net;
      const expanded = category.key === 'economic';
      const allocationChildren = category.key === 'economic'
        ? renderEconomicRoleRow('resourceGeneration', 'Resource generation', 'economic-resource-generation', 'resourceGenerator', !expanded) +
          renderEconomicRoleRow('resourceInfrastructure', 'Resource infrastructure', 'economic-resource-infrastructure', 'resourceInfrastructure', !expanded)
        : category.bandKeys
          .map(key => {
            const band = bandByKey.get(key);
            return band ? renderBandRow(band, category.key, !expanded) : '';
          })
          .join('');
      const children = allocationChildren +
        renderCategoryDestroyedRow(category, !expanded) +
        renderCategoryInvestmentRow(category, !expanded);

      return `
        <tr class="allocation-category-row" data-allocation-category-row="${category.key}">
          <th>
            <button type="button" class="allocation-category-toggle" data-allocation-category-toggle="${category.key}" aria-expanded="${expanded ? 'true' : 'false'}">
              <span class="category-caret" aria-hidden="true"></span>${escapeHtml(category.label)} net
            </button>
          </th>
          <td data-cell-label="${youCellLabel}" data-hover-field="allocationCategory.${category.key}.net.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${opponentCellLabel}" data-hover-field="allocationCategory.${category.key}.net.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocationCategory.${category.key}.net.delta">${formatSigned(row.delta)}</td>
        </tr>
        ${children}
      `;
    })
    .join('');

  const defaultBand = snapshot.bandBreakdown.economic;
  const inspectorContext = snapshot.markers.length > 0
    ? snapshot.markers.join(' · ')
    : 'Select a timestamp to inspect allocation values.';

  return `
    <aside id="hover-inspector" class="hover-inspector" aria-live="polite">
      <div class="inspector-eyebrow">Selected time</div>
      <div class="inspector-time" data-hover-field="timeLabel">${escapeHtml(snapshot.timeLabel)}</div>
      <div class="inspector-context" data-hover-context>${escapeHtml(inspectorContext)}</div>
      <details class="mobile-detail-panel" data-mobile-details open>
        <summary class="mobile-detail-summary">Allocation details</summary>
        <div class="mobile-detail-content">
          ${buildSignificantEventImpactHtml(snapshot.significantEvent)}
          <div class="inspector-section-label" data-inspector-section="allocation">Allocation</div>
          <div class="inspector-table-wrap" tabindex="0" role="region" aria-label="${inspectorTableLabel}">
            <table class="inspector-table">
              <thead>
                <tr>
                  <th>Category / band</th>
                  <th>${escapeHtml(youLabel)}</th>
                  <th>${escapeHtml(opponentLabel)}</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                ${bandRows}
                <tr class="inspector-total-row">
                  <th><span data-total-pool-tooltip title="${escapeHtml(snapshot.totalPoolTooltip)}">Total net pool</span></th>
                  <td data-cell-label="${youCellLabel}" data-hover-field="allocation.overall.you">${formatNumber(allocation.overall.you)}</td>
                  <td data-cell-label="${opponentCellLabel}" data-hover-field="allocation.overall.opponent">${formatNumber(allocation.overall.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="allocation.overall.delta">${formatSigned(allocation.overall.delta)}</td>
                </tr>
                <tr class="band-row inspector-float-row" data-inspector-row="float">
                  <th>
                    <button type="button" class="band-toggle" data-band-key="float" aria-pressed="false">
                      Float (not deployed)
                    </button>
                  </th>
                  <td data-cell-label="${youCellLabel}" data-hover-field="allocation.float.you">${formatNumber(allocation.float.you)}</td>
                  <td data-cell-label="${opponentCellLabel}" data-hover-field="allocation.float.opponent">${formatNumber(allocation.float.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="allocation.float.delta">${formatSigned(allocation.float.delta)}</td>
                </tr>
                ${renderOpportunityLostRow()}
                <tr>
                  <th>Gather/min</th>
                  <td data-cell-label="${youCellLabel}" data-hover-field="gather.you">${formatNumber(snapshot.gather.you)}</td>
                  <td data-cell-label="${opponentCellLabel}" data-hover-field="gather.opponent">${formatNumber(snapshot.gather.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="gather.delta">${formatSigned(snapshot.gather.delta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="band-breakdown">
            <div class="band-breakdown-head" data-band-breakdown-title>Economic composition</div>
            <div class="band-breakdown-summary" data-band-breakdown-summary>
              <span class="band-summary-label" data-band-summary-label>${escapeHtml(selectedBandSummary.label)}</span>
              <span data-band-summary-value>${escapeHtml(youShortLabel)} <strong data-band-summary-you>${formatNumber(selectedBandSummary.you)}</strong></span>
              <span data-band-summary-value>${escapeHtml(opponentShortLabel)} <strong data-band-summary-opponent>${formatNumber(selectedBandSummary.opponent)}</strong></span>
              <span data-band-summary-value>Delta <strong data-band-summary-delta>${formatSigned(selectedBandSummary.delta)}</strong></span>
              <table class="opportunity-lost-components" data-opportunity-lost-components aria-label="Opportunity lost components by civilization" style="--opportunity-you-color:${escapeHtml(labels.you.color)};--opportunity-opponent-color:${escapeHtml(labels.opponent.color)}" hidden>
                <colgroup>
                  <col class="opportunity-lost-component-col">
                  <col class="opportunity-lost-value-col">
                  <col class="opportunity-lost-value-col">
                  <col class="opportunity-lost-gap-col">
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Component</th>
                    <th scope="col">${escapeHtml(youShortLabel)}</th>
                    <th scope="col">${escapeHtml(opponentShortLabel)}</th>
                    <th scope="col">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-opportunity-lost-component="total">
                    <th scope="row">Total</th>
                    <td><strong data-opportunity-lost-component-total-you>${formatNumber(allocation.opportunityLost.you)}</strong></td>
                    <td><strong data-opportunity-lost-component-total-opponent>${formatNumber(allocation.opportunityLost.opponent)}</strong></td>
                    <td><strong data-opportunity-lost-component-total-delta>${formatSigned(allocation.opportunityLost.delta)}</strong></td>
                  </tr>
                  <tr data-opportunity-lost-component="villagersLost">
                    <th scope="row">Villagers lost</th>
                    <td><strong data-opportunity-lost-component-villagers-lost-you>${formatNumber(opportunityLostComponents.villagersLost.you)}</strong></td>
                    <td><strong data-opportunity-lost-component-villagers-lost-opponent>${formatNumber(opportunityLostComponents.villagersLost.opponent)}</strong></td>
                    <td><strong data-opportunity-lost-component-villagers-lost-delta>${formatSigned(opportunityLostComponents.villagersLost.delta)}</strong></td>
                  </tr>
                  <tr data-opportunity-lost-component="underproduction">
                    <th scope="row"><span title="Villager underproduction">Under-production</span></th>
                    <td><strong data-opportunity-lost-component-underproduction-you>${formatNumber(opportunityLostComponents.underproduction.you)}</strong></td>
                    <td><strong data-opportunity-lost-component-underproduction-opponent>${formatNumber(opportunityLostComponents.underproduction.opponent)}</strong></td>
                    <td><strong data-opportunity-lost-component-underproduction-delta>${formatSigned(opportunityLostComponents.underproduction.delta)}</strong></td>
                  </tr>
                  <tr data-opportunity-lost-component="gather-disruption">
                    <th scope="row">Gather disruption</th>
                    <td><strong data-opportunity-lost-component-gather-disruption-you>${formatNumber(opportunityLostComponents.gatherDisruption.you)}</strong></td>
                    <td><strong data-opportunity-lost-component-gather-disruption-opponent>${formatNumber(opportunityLostComponents.gatherDisruption.opponent)}</strong></td>
                    <td><strong data-opportunity-lost-component-gather-disruption-delta>${formatSigned(opportunityLostComponents.gatherDisruption.delta)}</strong></td>
                  </tr>
                  <tr data-opportunity-lost-component="low-underproduction">
                    <th scope="row"><span title="${escapeHtml(TC_IDLE_SECONDS_TOOLTIP)}">TC idle seconds</span></th>
                    <td><strong data-opportunity-lost-component-low-underproduction-you>${formatSeconds(opportunityLostComponents.lowUnderproduction.you)}</strong></td>
                    <td><strong data-opportunity-lost-component-low-underproduction-opponent>${formatSeconds(opportunityLostComponents.lowUnderproduction.opponent)}</strong></td>
                    <td><strong data-opportunity-lost-component-low-underproduction-delta>${formatSignedSeconds(opportunityLostComponents.lowUnderproduction.delta)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="band-breakdown-cols">
              <section>
                <h4>${escapeHtml(youLabel)}</h4>
                <ul class="band-breakdown-list" data-band-breakdown-list="you">${renderBreakdownList(defaultBand.you, 'economic')}</ul>
              </section>
              <section>
                <h4>${escapeHtml(opponentLabel)}</h4>
                <ul class="band-breakdown-list" data-band-breakdown-list="opponent">${renderBreakdownList(defaultBand.opponent, 'economic')}</ul>
              </section>
            </div>
          </div>
        </div>
      </details>
    </aside>`;
}

function matrixHeatClass(value: number): string {
  if (value >= MATRIX_STRONG_THRESHOLD) return 'is-strong';
  if (value <= MATRIX_WEAK_THRESHOLD) return 'is-weak';
  return 'is-even';
}

function unitValueFromBreakdownRow(
  row: HoverSnapshot['adjustedMilitary']['youUnitBreakdown'][number]
): UnitWithValue {
  const perUnitValue = row.count > 0
    ? row.rawValue / row.count
    : row.rawValue;

  return {
    unitId: row.unitId,
    name: row.unitName,
    count: 1,
    effectiveValue: Number(perUnitValue.toFixed(6)),
    classes: [],
  };
}

function matchupMeaning(multiplier: number, rowUnit: string, colUnit: string): string {
  if (multiplier >= 1.35) {
    return `${rowUnit} is strongly favored in this direct trade at equal resource spend.`;
  }
  if (multiplier >= 1.1) {
    return `${rowUnit} is modestly favored in this direct trade at equal resource spend.`;
  }
  if (multiplier <= (1 / 1.35)) {
    return `${colUnit} is strongly favored in this direct trade at equal resource spend.`;
  }
  if (multiplier <= (1 / 1.1)) {
    return `${colUnit} is modestly favored in this direct trade at equal resource spend.`;
  }
  return 'This direct trade is close to even at equal resource spend.';
}

function edgeLabel(edge: number, rowUnit: string, colUnit: string): string {
  if (!Number.isFinite(edge) || edge <= 0) return 'n/a';
  if (edge >= 1) return `${formatPrecise(edge, 2)}x in ${rowUnit}'s favor`;
  return `${formatPrecise(1 / edge, 2)}x in ${colUnit}'s favor`;
}

function displayedScoreLabel(pair: PairCounterComputation): string {
  if (!Number.isFinite(pair.multiplier)) return 'n/a';

  const base = `${formatPrecise(pair.multiplier, 2)}x`;
  if (pair.forcedResultReason) {
    return `${base} (fallback path: ${pair.forcedResultReason})`;
  }

  const cappedHigh = pair.unclampedMultiplier > pair.clampMax + 1e-9;
  const cappedLow = pair.unclampedMultiplier < pair.clampMin - 1e-9;
  if (cappedHigh || cappedLow) {
    return `${base} (compressed to ${formatPrecise(pair.unclampedMultiplier, 2)}x, then clamped to ${formatPrecise(pair.clampMin, 2)}-${formatPrecise(pair.clampMax, 2)}x)`;
  }

  return `${base} (raw edge compressed with exponent ${formatPrecise(pair.duelRootExponent, 2)})`;
}

function dpsFormula(value: PairCounterComputation['attacker']): string {
  const terms: string[] = [`${formatPrecise(value.sustainedDps, 2)}×${formatPrecise(value.meleeUptime, 2)}`];
  if (Math.abs(value.chargeOpeningDps) >= 0.01) {
    terms.push(formatPrecise(value.chargeOpeningDps, 2));
  }
  if (Math.abs(value.rangedOpeningDps) >= 0.01) {
    terms.push(formatPrecise(value.rangedOpeningDps, 2));
  }
  return `${terms.join(' + ')} = ${formatPrecise(value.totalDps, 2)}`;
}

function buildMatrixWhyHtml(params: {
  rowUnit: string;
  colUnit: string;
  pair: PairCounterComputation;
}): string {
  const pair = params.pair;
  const a = pair.attacker;
  const d = pair.defender;

  if (pair.forcedResultReason) {
    return `
      <div class="adjusted-matrix-why-title">${escapeHtml(params.rowUnit)} vs ${escapeHtml(params.colUnit)} · ${formatPrecise(pair.multiplier, 2)}x</div>
      <p class="section-note adjusted-matrix-why-note">This cell uses a direct ${escapeHtml(params.rowUnit)} ↔ ${escapeHtml(params.colUnit)} interaction only.</p>
      <ul class="method-list adjusted-matrix-why-summary">
        <li><strong>What this means:</strong> ${escapeHtml(matchupMeaning(pair.multiplier, params.rowUnit, params.colUnit))}</li>
        <li><strong>Effective DPS:</strong> unavailable in fallback mode</li>
        <li><strong>Survivability:</strong> unavailable in fallback mode</li>
        <li><strong>Efficiency per resources:</strong> unavailable in fallback mode</li>
        <li><strong>Raw edge:</strong> unavailable in fallback mode</li>
        <li><strong>Displayed score:</strong> ${escapeHtml(displayedScoreLabel(pair))}</li>
      </ul>
      <div class="adjusted-matrix-why-subhead">Key math inputs</div>
      <ul class="method-list adjusted-matrix-why-list">
        <li>Detailed combat stat math is unavailable for this pair in the current catalog snapshot.</li>
        <li>Fallback source: <code>${escapeHtml(pair.forcedResultReason)}</code></li>
        <li>Fallback multiplier: <code>${formatPrecise(pair.multiplier, 4)}x</code></li>
      </ul>
    `;
  }

  return `
    <div class="adjusted-matrix-why-title">${escapeHtml(params.rowUnit)} vs ${escapeHtml(params.colUnit)} · ${formatPrecise(pair.multiplier, 2)}x</div>
    <p class="section-note adjusted-matrix-why-note">This cell uses a direct ${escapeHtml(params.rowUnit)} ↔ ${escapeHtml(params.colUnit)} interaction only.</p>
    <ul class="method-list adjusted-matrix-why-summary">
      <li><strong>What this means:</strong> ${escapeHtml(matchupMeaning(pair.multiplier, params.rowUnit, params.colUnit))}</li>
      <li><strong>Effective DPS:</strong> ${escapeHtml(params.rowUnit)} ${formatPrecise(a.totalDps, 2)} vs ${escapeHtml(params.colUnit)} ${formatPrecise(d.totalDps, 2)}</li>
      <li><strong>Survivability:</strong> ${escapeHtml(params.rowUnit)} HP ${formatPrecise(pair.attackerHitpoints, 0)} vs ${escapeHtml(params.colUnit)} HP ${formatPrecise(pair.defenderHitpoints, 0)}</li>
      <li><strong>Model unit values:</strong> ${escapeHtml(params.rowUnit)} ${formatPrecise(pair.attackerUnitValue, 0)} vs ${escapeHtml(params.colUnit)} ${formatPrecise(pair.defenderUnitValue, 0)}</li>
      <li><strong>Efficiency per resources:</strong> ${escapeHtml(params.rowUnit)} ${formatPrecise(pair.attackerPerResource, 2)} vs ${escapeHtml(params.colUnit)} ${formatPrecise(pair.defenderPerResource, 2)}</li>
      <li><strong>Raw edge:</strong> ${escapeHtml(edgeLabel(pair.equalResourceAdvantage, params.rowUnit, params.colUnit))}</li>
      <li><strong>Displayed score:</strong> ${escapeHtml(displayedScoreLabel(pair))}</li>
    </ul>
    <div class="adjusted-matrix-why-subhead">Key math inputs</div>
    <ul class="method-list adjusted-matrix-why-list">
      <li>Hit damage / attack interval: <code>${escapeHtml(params.rowUnit)} ${formatPrecise(a.hitDamage, 2)} / ${formatPrecise(a.interval, 2)} = ${formatPrecise(a.sustainedDps, 2)} DPS</code>; <code>${escapeHtml(params.colUnit)} ${formatPrecise(d.hitDamage, 2)} / ${formatPrecise(d.interval, 2)} = ${formatPrecise(d.sustainedDps, 2)} DPS</code></li>
      <li>Contact uptime: <code>${escapeHtml(params.rowUnit)} clamp(1 - ${formatPrecise(a.meleeRangeGap, 2)}×${formatPrecise(a.meleeRangePenaltyPerTile, 2)} + ${formatPrecise(a.meleeSpeedDelta, 2)}×${formatPrecise(a.meleeSpeedCoefficient, 2)}, ${formatPrecise(a.meleeUptimeFloor, 2)}, 1) = ${formatPrecise(a.meleeUptime, 2)}</code>; <code>${escapeHtml(params.colUnit)} uptime ${formatPrecise(d.meleeUptime, 2)}</code></li>
      <li>Effective DPS: <code>${escapeHtml(params.rowUnit)} ${dpsFormula(a)}</code>; <code>${escapeHtml(params.colUnit)} ${dpsFormula(d)}</code></li>
      <li>Per-resource score: <code>${escapeHtml(params.rowUnit)} (${formatPrecise(a.totalDps, 2)}×${formatPrecise(pair.attackerHitpoints, 0)}) / ${formatPrecise(pair.attackerUnitValue, 0)} = ${formatPrecise(pair.attackerPerResource, 2)}</code>; <code>${escapeHtml(params.colUnit)} (${formatPrecise(d.totalDps, 2)}×${formatPrecise(pair.defenderHitpoints, 0)}) / ${formatPrecise(pair.defenderUnitValue, 0)} = ${formatPrecise(pair.defenderPerResource, 2)}</code></li>
      <li>Raw edge: <code>${formatPrecise(pair.attackerPerResource, 2)} / ${formatPrecise(pair.defenderPerResource, 2)} = ${formatPrecise(pair.equalResourceAdvantage, 2)}x</code></li>
      <li>Displayed score: <code>clamp(${formatPrecise(pair.equalResourceAdvantage, 2)}^${formatPrecise(pair.duelRootExponent, 2)}, ${formatPrecise(pair.clampMin, 2)}, ${formatPrecise(pair.clampMax, 2)}) = ${formatPrecise(pair.multiplier, 2)}x</code></li>
    </ul>
  `;
}

function buildAdjustedMatrixPayload(
  youUnitBreakdown: HoverSnapshot['adjustedMilitary']['youUnitBreakdown'],
  opponentUnitBreakdown: HoverSnapshot['adjustedMilitary']['opponentUnitBreakdown'],
  youCivilization: string,
  opponentCivilization: string
): AdjustedMatrixPayload {
  const rowUnits = youUnitBreakdown.slice(0, 3);
  const colUnits = opponentUnitBreakdown.slice(0, 3);

  if (rowUnits.length === 0 || colUnits.length === 0) {
    return {
      note: 'Rows are your top military units. Columns are opponent top military units. Each cell is a direct pairwise interaction.',
      defaultWhyHtml: `
        <div class="adjusted-matrix-why-title">Select a matchup cell</div>
        <p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell's exact computation and explanation.</p>
      `,
      rows: [],
      columns: [],
      emptyMessage: 'Not enough military-active units to render the matchup matrix at this timestamp.',
    };
  }

  const rows: AdjustedMatrixRowPayload[] = rowUnits.map(row => {
    const cells: AdjustedMatrixCellPayload[] = colUnits.map(col => {
      const pair = evaluateUnitPairCounterComputation(
        unitValueFromBreakdownRow(row),
        unitValueFromBreakdownRow(col),
        {
          player1Civilization: youCivilization,
          player2Civilization: opponentCivilization,
        }
      );
      const score = pair.multiplier;
      const whyHtml = buildMatrixWhyHtml({
        rowUnit: row.unitName,
        colUnit: col.unitName,
        pair,
      });

      return {
        score,
        heatClass: matrixHeatClass(score),
        rowUnit: row.unitName,
        colUnit: col.unitName,
        whyHtml,
      };
    });

    return {
      unitName: row.unitName,
      cells,
    };
  });

  return {
    note: 'Rows are your top military units. Columns are opponent top military units. Each cell is a direct pairwise interaction.',
    defaultWhyHtml: `
      <div class="adjusted-matrix-why-title">Select a matchup cell</div>
      <p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell's exact computation and explanation.</p>
    `,
    rows,
    columns: colUnits.map(unit => unit.unitName),
  };
}

function buildAdjustedMatrixHtml(snapshot: HoverSnapshot): string {
  const matrix = snapshot.adjustedMilitary.matrix;

  if (matrix.emptyMessage) {
    return `<p class="section-note adjusted-matrix-note">${escapeHtml(matrix.emptyMessage)}</p>`;
  }

  const header = `
    <tr>
      <th>Unit</th>
      ${matrix.columns.map(unitName => `<th>${escapeHtml(unitName)}</th>`).join('')}
    </tr>
  `;

  const body = matrix.rows
    .map(row => {
      const cells = row.cells.map(cell => {
        return `
          <td class="adjusted-matrix-cell">
            <button
              type="button"
              class="adjusted-matrix-cell-btn ${cell.heatClass}"
              data-matrix-why-html="${escapeHtml(cell.whyHtml)}"
            >${formatPrecise(cell.score, 2)}x</button>
          </td>
        `;
      }).join('');

      return `<tr><th>${escapeHtml(row.unitName)}</th>${cells}</tr>`;
    })
    .join('');

  return `
    <p class="section-note adjusted-matrix-note">${escapeHtml(matrix.note)}</p>
    <table class="adjusted-matrix-table">
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
    <div class="adjusted-matrix-why" data-adjusted-field="matrixWhy">${matrix.defaultWhyHtml}</div>
  `;
}

function buildAdjustedMilitaryBreakdownSection(snapshot: HoverSnapshot): string {
  return `
    <section class="panel" id="adjusted-military-explainer">
      <h2 class="section-title">Adjusted military active method</h2>
      <p class="section-note">
        Adjusted military active estimates clash-ready strength by combining composition matchups with completed military upgrades.
        Computed at <strong data-adjusted-field="timeLabel">${escapeHtml(snapshot.timeLabel)}</strong> using
        <code>Adjusted = CounterAdjustedArmyValue × UpgradeMultiplier</code>.
      </p>
      <div class="adjusted-action-row">
        <span>Adjusted mil active</span>
        <button type="button" data-open-adjusted-explainer>Adjusted military active method</button>
      </div>
      <div class="adjusted-breakdown-title">Adjusted military active breakdown</div>
      <table class="adjusted-breakdown-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Raw mil active</th>
            <th>Counter factor</th>
            <th>Counter-adjusted</th>
            <th>Upgrade multiplier</th>
            <th>Final adjusted</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>You</th>
            <td data-adjusted-field="you.raw">${formatNumber(snapshot.adjustedMilitary.youRaw)}</td>
            <td data-adjusted-field="you.counterMultiplier">${formatMultiplier(snapshot.adjustedMilitary.youCounterMultiplier)}</td>
            <td data-adjusted-field="you.counterAdjusted">${formatPrecise(snapshot.adjustedMilitary.youCounterAdjusted, 2)}</td>
            <td data-adjusted-field="you.upgradeMultiplier">${formatMultiplier(snapshot.adjustedMilitary.youUpgradeMultiplier)}</td>
            <td data-adjusted-field="you.final">${formatNumber(snapshot.adjustedMilitary.you)}</td>
          </tr>
          <tr>
            <th>Opponent</th>
            <td data-adjusted-field="opponent.raw">${formatNumber(snapshot.adjustedMilitary.opponentRaw)}</td>
            <td data-adjusted-field="opponent.counterMultiplier">${formatMultiplier(snapshot.adjustedMilitary.opponentCounterMultiplier)}</td>
            <td data-adjusted-field="opponent.counterAdjusted">${formatPrecise(snapshot.adjustedMilitary.opponentCounterAdjusted, 2)}</td>
            <td data-adjusted-field="opponent.upgradeMultiplier">${formatMultiplier(snapshot.adjustedMilitary.opponentUpgradeMultiplier)}</td>
            <td data-adjusted-field="opponent.final">${formatNumber(snapshot.adjustedMilitary.opponent)}</td>
          </tr>
        </tbody>
      </table>
      <div class="adjusted-breakdown-formulae">
        <p data-adjusted-field="you.formula">
          You: ${formatNumber(snapshot.adjustedMilitary.youRaw)} × ${formatMultiplier(snapshot.adjustedMilitary.youCounterMultiplier)} × ${formatMultiplier(snapshot.adjustedMilitary.youUpgradeMultiplier)} = ${formatNumber(snapshot.adjustedMilitary.you)}
        </p>
        <p data-adjusted-field="opponent.formula">
          Opponent: ${formatNumber(snapshot.adjustedMilitary.opponentRaw)} × ${formatMultiplier(snapshot.adjustedMilitary.opponentCounterMultiplier)} × ${formatMultiplier(snapshot.adjustedMilitary.opponentUpgradeMultiplier)} = ${formatNumber(snapshot.adjustedMilitary.opponent)}
        </p>
      </div>
      <h3 class="adjusted-subhead">Matchup matrix</h3>
      <div data-adjusted-field="matrixMock">
        ${buildAdjustedMatrixHtml(snapshot)}
      </div>
    </section>`;
}

function buildGatherRateSvg(
  youSeries: GatherRatePoint[],
  opponentSeries: GatherRatePoint[],
  duration: number,
  ageMarkers: AgeMarker[],
  hoverSnapshots: HoverSnapshot[],
  labels: RenderPlayerLabels
): string {
  const width = svgWidth;
  const height = gatherHeight;
  const padding = gatherPadding;
  const plotHeight = height - padding.top - padding.bottom;
  const maxX = Math.max(duration, 1);
  const maxRate = Math.max(
    1,
    ...youSeries.map(point => point.ratePerMin),
    ...opponentSeries.map(point => point.ratePerMin)
  ) * 1.1;

  const x = (timestamp: number): number => scaledX(timestamp, duration, padding);
  const y = (value: number): number => padding.top + plotHeight - (value / maxRate) * plotHeight;

  const linePath = (series: GatherRatePoint[]): string =>
    series
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${x(point.timestamp).toFixed(2)} ${y(point.ratePerMin).toFixed(2)}`)
      .join(' ');

  const youPath = linePath(youSeries);
  const oppPath = linePath(opponentSeries);
  const youColor = escapeHtml(playerColor(labels, 'you'));
  const opponentColor = escapeHtml(playerColor(labels, 'opponent'));

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return `<text x="${xPos.toFixed(2)}" y="${(height - 4).toFixed(2)}" text-anchor="middle" font-size="11" fill="#5B6257">${formatTime(timestamp)}</text>`;
    })
    .join('');

  const yTicks = [0, 0.5, 1]
    .map(step => {
      const value = Math.round(maxRate * step);
      const yPos = y(value);
      return `<text x="${(padding.left - 8).toFixed(2)}" y="${(yPos + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${value}</text>`;
    })
    .join('');

  const ageMarkerLayer = buildAgeMarkerLayer({
    markers: ageMarkers,
    duration,
    x,
    width,
    lineStartY: padding.top,
    lineEndY: height - padding.bottom,
    showLabels: false,
    labels,
  });
  const defaultHover = hoverSnapshots[0];
  const timestamps = hoverSnapshots.map(snapshot => snapshot.timestamp);
  const hoverColumns = timestamps
    .map((timestamp, idx) => {
      const prevTimestamp = idx === 0 ? 0 : timestamps[idx - 1];
      const nextTimestamp = idx === timestamps.length - 1 ? maxX : timestamps[idx + 1];
      const leftTimestamp = idx === 0 ? 0 : (prevTimestamp + timestamp) / 2;
      const rightTimestamp = idx === timestamps.length - 1 ? maxX : (timestamp + nextTimestamp) / 2;
      const left = x(leftTimestamp);
      const right = x(rightTimestamp);

      return `<rect class="hover-target gather-hover-target" data-hover-timestamp="${timestamp}" x="${left.toFixed(2)}" y="${padding.top.toFixed(2)}" width="${Math.max(2, right - left).toFixed(2)}" height="${plotHeight.toFixed(2)}" fill="transparent" pointer-events="all"><title>${formatTime(timestamp)} - hover for values</title></rect>`;
    })
    .join('');

  return `
<svg class="gather-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gather rate chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="var(--color-chart-bg)" rx="10" />
  <line x1="${padding.left}" y1="${(height - padding.bottom).toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="#5B6257" stroke-width="1.2" />
  <path d="${youPath}" fill="none" stroke="${youColor}" stroke-width="2.5" />
  <path d="${oppPath}" fill="none" stroke="${opponentColor}" stroke-width="2.5" stroke-dasharray="7 5" />
  ${ageMarkerLayer}
  ${xTicks}
  ${yTicks}
  <g class="hover-readouts" aria-hidden="true">
    <line data-hover-line-gather class="hover-active-line" x1="${defaultHover.gatherX.toFixed(2)}" y1="${padding.top.toFixed(2)}" x2="${defaultHover.gatherX.toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" />
    <text data-hover-label-gather-you class="hover-value-label you-label" x="${hoverLabelX(defaultHover.gatherX).toFixed(2)}" y="${(padding.top + 18).toFixed(2)}" text-anchor="${hoverLabelAnchor(defaultHover.gatherX)}">You ${formatNumber(defaultHover.gather.you)}/min</text>
    <text data-hover-label-gather-opponent class="hover-value-label opponent-label" x="${hoverLabelX(defaultHover.gatherX).toFixed(2)}" y="${(padding.top + 34).toFixed(2)}" text-anchor="${hoverLabelAnchor(defaultHover.gatherX)}">Opp ${formatNumber(defaultHover.gather.opponent)}/min</text>
  </g>
  ${hoverColumns}
</svg>`;
}

function buildOpportunityPath<T extends { timestamp: number }>(
  points: T[],
  valueFor: (point: T) => number,
  x: (timestamp: number) => number,
  y: (value: number) => number
): string {
  return points
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${x(point.timestamp).toFixed(2)} ${y(valueFor(point)).toFixed(2)}`)
    .join(' ');
}

function villagerResourceAtOrBefore(
  series: PostMatchViewModel['villagerOpportunity']['resourceSeries']['you'],
  timestamp: number
): PostMatchViewModel['villagerOpportunity']['resourceSeries']['you'][number] {
  return pointAtOrBefore(series, timestamp, {
    timestamp,
    cumulativeLoss: 0,
    cumulativeResourcesGained: 0,
    cumulativeResourcesPossible: 0,
  });
}

function cumulativeVillagerDeficitSeconds(
  series: PostMatchViewModel['villagerOpportunity']['you']['series']
): number {
  if (series.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];
    const elapsed = Math.max(0, current.timestamp - previous.timestamp);
    total += Math.max(0, previous.totalDeficit) * elapsed;
  }

  return total;
}

function buildVillagerOpportunityCard(
  playerLabel: 'You' | 'Opponent',
  cardId: string,
  playerKey: 'you' | 'opponent',
  series: PostMatchViewModel['villagerOpportunity']['you']['series'],
  resourceSeries: PostMatchViewModel['villagerOpportunity']['resourceSeries']['you'],
  context: PostMatchViewModel['villagerOpportunity']['context']['you'],
  hoverSnapshots: HoverSnapshot[]
): string {
  const safeSeries = series.length > 0
    ? series
    : [{
      timestamp: 0,
      expectedVillagerRateRpm: 0,
      expectedVillagers: 0,
      producedVillagers: 0,
      aliveVillagers: 0,
      underproductionDeficit: 0,
      deathDeficit: 0,
      totalDeficit: 0,
      underproductionLossPerMin: 0,
      deathLossPerMin: 0,
      totalLossPerMin: 0,
      cumulativeUnderproductionLoss: 0,
      cumulativeDeathLoss: 0,
      cumulativeTotalLoss: 0,
    }];
  const width = villagerChartWidth;
  const height = villagerHeight;
  const padding = villagerPadding;
  const safeResourceSeries = resourceSeries.length > 0
    ? resourceSeries
    : safeSeries.map(point => ({
      timestamp: point.timestamp,
      cumulativeLoss: Math.max(0, point.cumulativeTotalLoss),
      cumulativeResourcesGained: 0,
      cumulativeResourcesPossible: Math.max(0, point.cumulativeTotalLoss),
    }));
  const duration = Math.max(1, safeResourceSeries[safeResourceSeries.length - 1].timestamp);
  const maxY = Math.max(
    1,
    ...safeResourceSeries.map(point =>
      Math.max(point.cumulativeLoss, point.cumulativeResourcesGained, point.cumulativeResourcesPossible)
    )
  );
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (timestamp: number): number => padding.left + (timestamp / duration) * plotWidth;
  const y = (value: number): number => padding.top + plotHeight - (value / maxY) * plotHeight;
  const finalPoint = safeSeries[safeSeries.length - 1];
  const observedVillagerDeaths = Math.max(0, finalPoint.producedVillagers - finalPoint.aliveVillagers);
  const unrecoveredVillagerSeconds = cumulativeVillagerDeficitSeconds(safeSeries);
  const safeHoverSnapshots = hoverSnapshots.length > 0
    ? hoverSnapshots
    : [{
      timestamp: 0,
      timeLabel: '0:00',
      poolX: 0,
      gatherX: 0,
      villagerX: x(0),
      markers: [],
      you: {
        economic: 0,
        populationCap: 0,
        militaryCapacity: 0,
        militaryActive: 0,
        defensive: 0,
        research: 0,
        advancement: 0,
        total: 0,
      },
      opponent: {
        economic: 0,
        populationCap: 0,
        militaryCapacity: 0,
        militaryActive: 0,
        defensive: 0,
        research: 0,
        advancement: 0,
        total: 0,
      },
      delta: {
        economic: 0,
        populationCap: 0,
        militaryCapacity: 0,
        militaryActive: 0,
        defensive: 0,
        research: 0,
        advancement: 0,
        total: 0,
      },
      gather: { you: 0, opponent: 0, delta: 0 },
      villagerOpportunity: {
        you: { timestamp: 0, cumulativeLoss: 0, cumulativeResourcesGained: 0, cumulativeResourcesPossible: 0 },
        opponent: { timestamp: 0, cumulativeLoss: 0, cumulativeResourcesGained: 0, cumulativeResourcesPossible: 0 },
      },
      adjustedMilitary: {
        you: 0,
        opponent: 0,
        delta: 0,
        youRaw: 0,
        opponentRaw: 0,
        youCounterAdjusted: 0,
        opponentCounterAdjusted: 0,
        youCounterMultiplier: null,
        opponentCounterMultiplier: null,
        youUpgradeMultiplier: 1,
        opponentUpgradeMultiplier: 1,
        youPct: null,
        opponentPct: null,
      },
      bandBreakdown: {
        economic: { you: [], opponent: [] },
        populationCap: { you: [], opponent: [] },
        militaryCapacity: { you: [], opponent: [] },
        militaryActive: { you: [], opponent: [] },
        defensive: { you: [], opponent: [] },
        research: { you: [], opponent: [] },
        advancement: { you: [], opponent: [] },
        destroyed: { you: [], opponent: [] },
      },
    }];
  const defaultHover = safeHoverSnapshots[0];
  const defaultResourcePoint = villagerResourceAtOrBefore(safeResourceSeries, defaultHover.timestamp);

  const lossPath = buildOpportunityPath(safeResourceSeries, point => point.cumulativeLoss, x, y);
  const gainedPath = buildOpportunityPath(safeResourceSeries, point => point.cumulativeResourcesGained, x, y);
  const possiblePath = buildOpportunityPath(safeResourceSeries, point => point.cumulativeResourcesPossible, x, y);

  const ticks = [0, 0.5, 1].map(step => {
    const value = maxY * step;
    const yPos = y(value);
    return `<line x1="${padding.left.toFixed(2)}" y1="${yPos.toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${yPos.toFixed(2)}" stroke="#E5EAE1" stroke-width="1" />`;
  }).join('');

  const yLabels = [0, 1].map(step => {
    const value = Math.round(maxY * step);
    const yPos = y(value);
    return `<text x="${(padding.left - 6).toFixed(2)}" y="${(yPos + 4).toFixed(2)}" text-anchor="end" font-size="10" fill="#5B6257">${value}</text>`;
  }).join('');

  const xLabels = [0, 0.5, 1].map(step => {
    const timestamp = Math.round(duration * step);
    const xPos = x(timestamp);
    return `<text x="${xPos.toFixed(2)}" y="${(height - 5).toFixed(2)}" text-anchor="middle" font-size="10" fill="#5B6257">${formatTime(timestamp)}</text>`;
  }).join('');
  const hoverColumns = safeHoverSnapshots
    .map((snapshot, idx) => {
      const timestamp = Math.max(0, Math.min(duration, snapshot.timestamp));
      const prevTimestamp = idx === 0 ? 0 : Math.max(0, Math.min(duration, safeHoverSnapshots[idx - 1].timestamp));
      const nextTimestamp = idx === safeHoverSnapshots.length - 1
        ? duration
        : Math.max(0, Math.min(duration, safeHoverSnapshots[idx + 1].timestamp));
      const leftTimestamp = idx === 0 ? 0 : (prevTimestamp + timestamp) / 2;
      const rightTimestamp = idx === safeHoverSnapshots.length - 1 ? duration : (timestamp + nextTimestamp) / 2;
      const left = x(leftTimestamp);
      const right = x(rightTimestamp);

      return `<rect class="hover-target villager-hover-target" data-hover-timestamp="${snapshot.timestamp}" x="${left.toFixed(2)}" y="${padding.top.toFixed(2)}" width="${Math.max(2, right - left).toFixed(2)}" height="${plotHeight.toFixed(2)}" fill="transparent" pointer-events="all"><title>${formatTime(snapshot.timestamp)} - hover for values</title></rect>`;
    })
    .join('');

  return `
    <article class="villager-opportunity-card" id="${cardId}">
      <h3>${playerLabel}</h3>
      <svg class="villager-opportunity-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${playerLabel} villager opportunity resource chart">
        <rect x="0" y="0" width="${width}" height="${height}" fill="var(--color-chart-bg)" rx="8" />
        ${ticks}
        <line x1="${padding.left.toFixed(2)}" y1="${(height - padding.bottom).toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="#7F867B" stroke-width="1" />
        ${yLabels}
        ${xLabels}
        <path d="${lossPath}" fill="none" stroke="#C56C52" stroke-width="1.9" />
        <path d="${gainedPath}" fill="none" stroke="#378ADD" stroke-width="1.9" />
        <path d="${possiblePath}" fill="none" stroke="var(--color-strong)" stroke-width="2.4" />
        <g class="hover-readouts" aria-hidden="true">
          <line data-hover-line-villager-${playerKey} class="hover-active-line" x1="${x(defaultHover.timestamp).toFixed(2)}" y1="${padding.top.toFixed(2)}" x2="${x(defaultHover.timestamp).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" />
          <text data-hover-label-villager-${playerKey}-loss class="hover-value-label villager-loss-label" x="${hoverLabelX(x(defaultHover.timestamp)).toFixed(2)}" y="${(padding.top + 18).toFixed(2)}" text-anchor="${hoverLabelAnchor(x(defaultHover.timestamp))}">Loss ${formatNumber(defaultResourcePoint.cumulativeLoss)}</text>
          <text data-hover-label-villager-${playerKey}-gained class="hover-value-label villager-gained-label" x="${hoverLabelX(x(defaultHover.timestamp)).toFixed(2)}" y="${(padding.top + 34).toFixed(2)}" text-anchor="${hoverLabelAnchor(x(defaultHover.timestamp))}">Gained ${formatNumber(defaultResourcePoint.cumulativeResourcesGained)}</text>
          <text data-hover-label-villager-${playerKey}-possible class="hover-value-label villager-possible-label" x="${hoverLabelX(x(defaultHover.timestamp)).toFixed(2)}" y="${(padding.top + 50).toFixed(2)}" text-anchor="${hoverLabelAnchor(x(defaultHover.timestamp))}">Possible ${formatNumber(defaultResourcePoint.cumulativeResourcesPossible)}</text>
        </g>
        ${hoverColumns}
      </svg>
      <ul class="villager-opportunity-metrics">
        <li><span>Expected villager rate</span><strong>${formatPrecise(finalPoint.expectedVillagerRateRpm, 1)}/min</strong></li>
        <li><span>Unrecovered villager-seconds</span><strong>${formatNumber(unrecoveredVillagerSeconds)}s</strong></li>
        <li><span>Underproduction deficit</span><strong>${formatNumber(finalPoint.underproductionDeficit)}</strong></li>
        <li><span>Villagers lost</span><strong>${formatNumber(observedVillagerDeaths)}</strong></li>
        <li><span>Cumulative loss</span><strong>${formatNumber(finalPoint.cumulativeTotalLoss)}</strong></li>
        <li><span>Loss of possible gather</span><strong>${formatPercent(context.lossShareOfPossible)}</strong></li>
        <li><span>Damage dealt to opponent eco</span><strong>${formatPercent(context.damageDealtToOpponentShare)}</strong></li>
      </ul>
    </article>
  `;
}

function buildVillagerOpportunitySection(model: PostMatchViewModel, hoverSnapshots: HoverSnapshot[]): string {
  return `
    <section class="panel" id="villager-opportunity">
      <h2 class="section-title">Villager opportunity cost</h2>
      <p class="section-note">Counterfactual villager production is capped at ${formatNumber(model.villagerOpportunity.targetVillagers)} villagers. The chart compares cumulative villager-opportunity loss, cumulative resources gained, and cumulative possible resources (gained + loss). Underproduction is the counterfactual gap versus expected villagers; Villagers lost is observed villager deaths from the summary. Cumulative loss still includes interim loss from dead villagers even if they are replaced later. Percentage metrics normalize against each player&apos;s total gathered resources, and damage dealt uses opponent death-loss as the villager-kill impact proxy.</p>
      <div class="villager-opportunity-legend">
        <span class="line-chip"><span class="line-swatch" style="border-color:#C56C52"></span>Cumulative loss</span>
        <span class="line-chip"><span class="line-swatch" style="border-color:#378ADD"></span>Resources gained</span>
        <span class="line-chip"><span class="line-swatch" style="border-color:var(--color-strong)"></span>Resources possible</span>
      </div>
      <div class="villager-opportunity-grid">
        ${buildVillagerOpportunityCard(
          'You',
          'villager-opportunity-you',
          'you',
          model.villagerOpportunity.you.series,
          model.villagerOpportunity.resourceSeries.you,
          model.villagerOpportunity.context.you,
          hoverSnapshots
        )}
        ${buildVillagerOpportunityCard(
          'Opponent',
          'villager-opportunity-opponent',
          'opponent',
          model.villagerOpportunity.opponent.series,
          model.villagerOpportunity.resourceSeries.opponent,
          model.villagerOpportunity.context.opponent,
          hoverSnapshots
        )}
      </div>
    </section>
  `;
}

function badgeClass(category: string): string {
  if (category === 'Timing') return 'badge-timing';
  if (category === 'Bet shape') return 'badge-blue';
  if (category === 'Economy') return 'badge-blue';
  if (category === 'Engagement') return 'badge-coral';
  if (category === 'Civ overlay') return 'badge-green';
  return 'badge-coral';
}

function buildEventsHtml(model: PostMatchViewModel): string {
  return model.events.length > 0
    ? model.events
      .map(event => `
        <article class="event-card">
          <div class="event-meta">${formatTime(event.timestamp)} · ${escapeHtml(event.phase)}</div>
          <div class="event-badge ${badgeClass(event.category)}">${escapeHtml(event.category)}</div>
          <p>${escapeHtml(event.description)}</p>
        </article>
      `)
      .join('')
    : '<article class="event-card"><p>No high-signal events met the v1 thresholds for this sample.</p></article>';
}

function buildFullSurfaceSections(
  model: PostMatchViewModel,
  hoverSnapshots: HoverSnapshot[],
  defaultHoverSnapshot: HoverSnapshot,
  labels: RenderPlayerLabels
): string {
  return `
    <details class="panel secondary-panel" data-secondary-section="gather-rate">
      <summary class="secondary-summary">
        <span class="section-title">Gather rate</span>
        <span class="secondary-summary-meta">Income trajectory detail</span>
      </summary>
      <div class="secondary-body">
        <p class="section-note">Villager losses live here as flat spots and slow recovery rather than as large pool drops.</p>
        ${buildGatherRateSvg(
          model.gatherRate.youSeries,
          model.gatherRate.opponentSeries,
          model.gatherRate.durationSeconds,
          model.trajectory.ageMarkers,
          hoverSnapshots,
          labels
        )}
        <div class="gather-legend">
          <span class="line-chip"><span class="line-swatch" style="border-color:${escapeHtml(labels.you.color)}"></span>${escapeHtml(labels.you.compactShortLabel)}</span>
          <span class="line-chip"><span class="line-swatch dashed" style="border-color:${escapeHtml(labels.opponent.color)}"></span>${escapeHtml(labels.opponent.compactShortLabel)}</span>
        </div>
        <div class="section-note">Rate / min</div>
      </div>
    </details>

    ${buildVillagerOpportunitySection(model, hoverSnapshots)}

    ${buildAdjustedMilitaryBreakdownSection(defaultHoverSnapshot)}

    <details class="panel secondary-panel" data-secondary-section="gap-events">
      <summary class="secondary-summary">
        <span class="section-title">Where the gap came from</span>
        <span class="secondary-summary-meta">Event-level explanations</span>
      </summary>
      <div class="secondary-body">
        <div class="events-grid">${buildEventsHtml(model)}</div>
      </div>
    </details>

    <details class="panel secondary-panel story-card" data-secondary-section="one-line-story">
      <summary class="secondary-summary">
        <span class="section-title">One-line story</span>
        <span class="secondary-summary-meta">Generated summary</span>
      </summary>
      <div class="secondary-body">
        <p class="story-body">${escapeHtml(model.oneLineStory)}</p>
      </div>
    </details>
  `;
}


export function renderPostMatchHtml(
  model: PostMatchViewModel,
  options: RenderPostMatchHtmlOptions = {}
): string {
  const playerLabels = renderPlayerLabels(model.header);
  const hoverSnapshots = selectInteractionHoverSnapshots(buildHoverSnapshots(model, playerLabels));
  const defaultHoverSnapshot = hoverSnapshots[0];
  const surface = options.surface ?? 'web-mvp';
  const includeAdjustedMilitary = surface === 'full';
  const clientHoverSnapshots = buildClientHoverSnapshots(hoverSnapshots, {
    includeAccounting: surface === 'full',
    includeAdjustedMilitary,
  });
  const inlineHoverSnapshots = clientHoverSnapshots;
  const destroyedGuideText = 'Destroyed: cumulative tracked value removed by the opponent. This is where raids and fights show lasting damage';
  const fullSurfaceStyles = surface === 'full' ? `
    .secondary-panel {
      padding: 0;
      overflow: hidden;
    }

    .secondary-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
    }

    .secondary-body {
      border-top: 1px solid var(--color-border);
      padding: 14px 16px;
    }

    .secondary-summary-meta {
      color: var(--color-muted);
      font-size: 12px;
    }

    .gather-legend,
    .villager-opportunity-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .villager-opportunity-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .villager-opportunity-card {
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      padding: 12px;
    }

    .villager-opportunity-card h3 {
      margin: 0 0 8px;
      font-size: 15px;
    }

    .villager-opportunity-chart,
    .gather-chart {
      width: 100%;
      height: auto;
      display: block;
    }

    .villager-opportunity-metrics {
      list-style: none;
      margin: 10px 0 0;
      padding: 0;
      display: grid;
      gap: 4px;
      font-size: 12px;
    }

    .villager-opportunity-metrics li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid var(--color-border-subtle);
      padding-top: 4px;
      font-variant-numeric: tabular-nums;
    }

    .events-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .event-card {
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      padding: 11px;
      background: var(--color-control-bg);
    }

    .event-card p {
      margin: 0;
    }

    .event-meta {
      font-size: 12px;
      color: var(--color-muted);
      margin-bottom: 8px;
    }

    .event-badge {
      display: inline-block;
      border-radius: 999px;
      font-size: 12px;
      padding: 3px 8px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .badge-timing { background: #FAEEDA; color: #854F0B; }
    .badge-blue { background: #E6F1FB; color: #0C447C; }
    .badge-coral { background: #FAECE7; color: #712B13; }
    .badge-green { background: #EAF3DE; color: #27500A; }

    .story-card {
      background: var(--color-background-secondary);
    }

    .story-body {
      margin: 0;
    }

    .line-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-control-bg);
      padding: 4px 10px;
    }

    .line-swatch {
      width: 16px;
      height: 0;
      border-top: 2px solid;
      display: inline-block;
    }

    .line-swatch.dashed {
      border-top-style: dashed;
    }
` : '';
  const fullSurfaceNarrowStyles = surface === 'full' ? `
      .villager-opportunity-grid,
      .events-grid { grid-template-columns: 1fr; }
` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Post-Match Analysis</title>
  <link rel="icon" href="${faviconHref}" />
  <style>
    :root {
      ${embeddedAoeTokenCss}
      --color-background: var(--aoe-color-report-bg);
      --color-background-secondary: var(--aoe-color-report-bg-secondary);
      --color-card: var(--aoe-color-report-surface);
      --color-text: var(--aoe-color-report-text);
      --color-strong: var(--aoe-color-report-strong);
      --color-muted: var(--aoe-color-report-muted);
      --color-border: var(--aoe-color-report-border);
      --color-border-subtle: var(--aoe-color-report-border-subtle);
      --color-border-strong: var(--aoe-color-report-border-strong);
      --color-chart-bg: var(--aoe-color-report-chart-bg);
      --color-control-bg: var(--aoe-color-report-control-bg);
      --color-control-hover: var(--aoe-color-report-control-hover);
      --color-control-selected: var(--aoe-color-report-control-selected);
      --color-link: var(--aoe-color-report-link);
      --color-focus: var(--aoe-color-report-focus);
      --you: ${escapeHtml(playerLabels.you.color)};
      --opponent: ${escapeHtml(playerLabels.opponent.color)};
      --report-max-width: 1440px;
      --inspector-min-width: 380px;
      --inspector-max-width: 460px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--color-text);
      font-family: var(--aoe-font-report);
      font-size: 14px;
      line-height: 1.45;
      background: radial-gradient(circle at 8% -12%, var(--color-background-secondary), transparent 34%),
        radial-gradient(circle at 92% -8%, var(--aoe-color-bg-accent), transparent 32%),
        var(--color-background);
      padding: 22px;
    }

    .wrap {
      width: min(100%, var(--report-max-width));
      max-width: var(--report-max-width);
      margin: 0 auto;
      display: grid;
      gap: 14px;
      min-width: 0;
    }

    .panel {
      min-width: 0;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-lg);
      padding: 14px 16px;
      box-shadow: var(--aoe-shadow-panel);
    }

    .header-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: start;
      min-width: 0;
    }

    .title {
      font-size: 25px;
      margin: 0;
      letter-spacing: 0.2px;
    }

    .recap-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
    }

    .recap-link {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: #0c447c;
      text-decoration: none;
      border: 1px solid #bcd3ea;
      border-radius: 999px;
      background: #f2f7fc;
      min-height: 44px;
      padding: 0 12px;
    }

    .recap-link:hover,
    .recap-link:focus-visible {
      background: #e4f0fb;
      border-color: #8eb6de;
      outline: none;
    }

    .meta-line {
      margin-top: 6px;
      font-size: 13px;
      color: var(--color-muted);
    }

    .chips {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    .civ-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      padding: 6px 10px;
      background: var(--color-control-bg);
      max-width: 100%;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    .swatch {
      width: 11px;
      height: 11px;
      border-radius: 999px;
    }

    .outcome {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-strong);
      text-align: right;
    }

    .banner {
      background: #fff7dc;
      border: 1px solid #f1d57d;
      color: #6d4a00;
      border-radius: var(--aoe-radius-lg);
      padding: 10px 12px;
      font-size: 13px;
    }

    .section-title {
      margin: 0;
      font-size: 21px;
    }

    .section-note {
      max-width: 76ch;
      margin: 6px 0 10px;
      color: var(--color-muted);
      font-size: 14px;
      line-height: 1.45;
    }

    .allocation-section-note {
      max-width: none;
      width: 100%;
    }

    .allocation-read-guide {
      margin: 8px 0 10px;
      border: 1px solid #dde6da;
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      color: var(--color-muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .allocation-read-guide-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 8px 10px;
      color: var(--color-strong);
      font-weight: 800;
      cursor: pointer;
      user-select: none;
    }

    .allocation-read-guide-summary::-webkit-details-marker {
      display: none;
    }

    .allocation-read-guide-summary::before {
      content: "";
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid #5B6257;
      transition: transform 140ms ease;
      flex: none;
    }

    .allocation-read-guide[open] .allocation-read-guide-summary {
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .allocation-read-guide[open] .allocation-read-guide-summary::before {
      transform: rotate(90deg);
    }

    .allocation-read-guide-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 12px;
      padding: 10px;
    }

    .allocation-read-guide-title {
      grid-column: 1 / -1;
      color: var(--color-strong);
      font-weight: 800;
    }

    .allocation-read-guide-item {
      min-width: 0;
    }

    .allocation-read-guide-item strong {
      display: block;
      color: var(--color-strong);
      font-size: 13px;
      margin-bottom: 1px;
    }

    .allocation-read-guide-item span {
      display: block;
      overflow-wrap: anywhere;
    }

    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-control-bg);
      padding: 4px 9px;
      font-size: 12px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      display: inline-block;
    }

    .chart-head {
      font-size: 12px;
      margin: 10px 0 5px;
      color: var(--color-strong);
    }

    .age-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin: 0 0 10px;
      font-size: 12px;
      color: var(--color-muted);
    }

    .age-key {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-control-bg);
      padding: 4px 9px;
    }

    .age-line {
      width: 18px;
      height: 0;
      border-top: 2px solid;
      display: inline-block;
    }

    .age-line.dashed {
      border-top-style: dashed;
    }

    .player-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 999px;
      padding: 4px 8px;
      background: var(--color-control-bg);
      border: 1px solid var(--color-border);
      font-size: 12px;
    }

    .strategy-chart,
    .leader-strip {
      width: 100%;
      max-width: 100%;
      height: auto;
      display: block;
    }

    .leader-strip {
      margin-bottom: 10px;
    }

    .leader-strip-axis-bg {
      fill: rgba(255, 255, 255, 0.92);
      stroke: #e1e7de;
      stroke-width: 1;
    }

    .leader-strip-time-label {
      font-size: 11px;
      font-weight: 700;
      fill: #4f5a50;
      paint-order: stroke;
      stroke: var(--color-control-bg);
      stroke-width: 3px;
      stroke-linejoin: round;
      font-variant-numeric: tabular-nums;
    }

    .allocation-leader-segment {
      opacity: 0.9;
      transition: opacity 160ms ease;
    }

    .allocation-leader-segment:hover {
      opacity: 1;
    }

    .trajectory-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(var(--inspector-min-width), 32vw, var(--inspector-max-width));
      gap: 16px;
      align-items: start;
    }

    .chart-stack {
      min-width: 0;
      overflow-x: auto;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-snapshot-controls {
      display: none;
      gap: 10px;
      margin: 10px 0 12px;
    }

    .mobile-snapshot-controls .mobile-timeline-control {
      margin-top: 0;
    }

    .mobile-timeline-control {
      display: none;
      gap: 10px;
      margin-top: 10px;
      border: 1px solid #dfe6dc;
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      padding: 10px;
    }

    .mobile-timeline-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .mobile-timeline-meta strong {
      color: var(--color-strong);
      font-size: 18px;
      font-variant-numeric: tabular-nums;
    }

    .mobile-timeline-actions {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
    }

    .mobile-timeline-button {
      min-width: 56px;
      min-height: 44px;
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      background: #f8faf6;
      color: var(--color-strong);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    .mobile-timeline-button:disabled {
      color: #9aa49a;
      cursor: default;
      opacity: 0.62;
    }

    .mobile-timeline-slider {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      accent-color: var(--you);
    }

    .mobile-timeline-context {
      color: var(--color-muted);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .hover-inspector {
      position: sticky;
      top: 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      max-height: calc(100vh - 24px);
      padding: 12px 14px;
      box-shadow: var(--aoe-shadow-panel);
      font-variant-numeric: tabular-nums;
      overflow: auto;
    }

    .inspector-eyebrow {
      color: var(--color-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .inspector-time {
      margin-top: 3px;
      font-size: 22px;
      font-weight: 700;
      color: var(--color-strong);
    }

    .inspector-context {
      min-height: 18px;
      margin: 4px 0 10px;
      color: var(--color-muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .event-impact {
      margin: 8px 0 12px;
      padding: 9px 10px;
      border: 1px solid #ecd2c7;
      border-radius: var(--aoe-radius-md);
      background: #fff8f5;
    }

    .event-impact-heading {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
      color: #7b3f32;
      cursor: pointer;
      list-style: none;
      user-select: none;
    }

    .event-impact[open] .event-impact-heading {
      margin-bottom: 5px;
    }

    .event-impact-heading::-webkit-details-marker {
      display: none;
    }

    .event-impact-heading::before {
      content: "";
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid #7b3f32;
      transition: transform 140ms ease;
      flex: none;
    }

    .event-impact[open] .event-impact-heading::before {
      transform: rotate(90deg);
    }

    .event-impact-title {
      display: flex;
      gap: 6px;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--color-strong);
    }

    .event-impact-help-button {
      flex: none;
      width: 18px;
      height: 18px;
      border: 1px solid #d8bdae;
      border-radius: 999px;
      background: var(--color-control-bg);
      color: #7b3f32;
      font: inherit;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
    }

    .event-impact-inline-help-button {
      width: 12px;
      height: 12px;
      padding: 0;
      font-size: 8px;
    }

    .event-impact-underdog-details {
      margin-top: 8px;
      padding-top: 7px;
      border-top: 1px solid #eadbd4;
      color: #465447;
      font-size: 12px;
      line-height: 1.35;
    }

    .event-impact-underdog-details summary {
      color: #7b3f32;
      font-weight: 800;
      cursor: pointer;
    }

    .event-impact-underdog-details p {
      margin: 6px 0 0;
    }

    .event-impact-summary {
      margin: 8px 0;
      padding: 7px;
      border: 1px solid #eadbd4;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.62);
    }

    .event-impact-summary-table,
    .event-impact-detail-table,
    .event-impact-army-table table {
      width: 100%;
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
    }

    .event-impact-loss-table {
      table-layout: fixed;
    }

    .event-impact-army-table table {
      table-layout: fixed;
    }

    .event-impact-summary-table th,
    .event-impact-summary-table td,
    .event-impact-detail-table th,
    .event-impact-detail-table td,
    .event-impact-army-table td {
      padding: 4px 0;
      border-top: 1px solid #f0e2dc;
      vertical-align: top;
    }

    .event-impact-summary-table thead th,
    .event-impact-detail-table thead th {
      padding-top: 0;
      border-top: 0;
      color: #465447;
      font-size: 10px;
      font-weight: 800;
      text-align: right;
    }

    .event-impact-summary-table thead th:first-child,
    .event-impact-detail-table thead th:first-child {
      text-align: left;
    }

    .event-impact-summary-table tbody th,
    .event-impact-detail-table tbody th {
      color: var(--color-muted);
      font-size: 10px;
      font-weight: 800;
      text-align: left;
      text-transform: uppercase;
    }

    .event-impact-summary-table td,
    .event-impact-detail-table td {
      color: var(--color-strong);
      font-size: 12px;
      font-weight: 800;
      text-align: right;
    }

    .event-impact-detail-disclosure {
      margin: 8px 0;
      border: 1px solid #eadbd4;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.62);
      overflow: hidden;
    }

    .event-impact-detail-summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 7px;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      list-style: none;
    }

    .event-impact-detail-summary::-webkit-details-marker {
      display: none;
    }

    .event-impact-detail-summary::before {
      content: "+";
      display: grid;
      width: 16px;
      height: 16px;
      place-items: center;
      border: 1px solid #d8c4bb;
      border-radius: 50%;
      color: #7b3f32;
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }

    .event-impact-detail-disclosure[open] .event-impact-detail-summary::before {
      content: "-";
    }

    .event-impact-detail-summary-main {
      display: grid;
      gap: 1px;
      min-width: 0;
    }

    .event-impact-detail-summary-title {
      color: #7b3f32;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .event-impact-detail-summary-caption {
      color: var(--color-muted);
      font-size: 11px;
      line-height: 1.25;
    }

    .event-impact-detail-summary-value {
      color: var(--color-strong);
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .event-impact-detail-body {
      padding: 0 8px 8px;
    }

    .event-impact-loss-detail-title {
      margin-bottom: 5px;
      color: #7b3f32;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .event-impact-loss-name {
      min-width: 0;
      text-align: left;
      overflow-wrap: anywhere;
    }

    .event-impact-loss-name .event-impact-inline-help-button {
      margin-left: 4px;
      vertical-align: middle;
    }

    .event-impact-item-count {
      white-space: nowrap;
    }

    .event-impact-loss-table th:nth-child(1),
    .event-impact-loss-table td:nth-child(1),
    .event-impact-loss-table th:nth-child(3),
    .event-impact-loss-table td:nth-child(3) {
      width: 38%;
      padding-left: 12px;
      text-align: left;
    }

    .event-impact-loss-table th:nth-child(1),
    .event-impact-loss-table td:nth-child(1) {
      padding-left: 0;
    }

    .event-impact-loss-table th:nth-child(2),
    .event-impact-loss-table td:nth-child(2) {
      width: 12%;
      padding-left: 10px;
      padding-right: 12px;
      border-left: 1px solid #f5e8e2;
    }

    .event-impact-loss-table th:nth-child(4),
    .event-impact-loss-table td:nth-child(4) {
      width: 12%;
      padding-left: 10px;
      border-left: 1px solid #f5e8e2;
    }

    .event-impact-loss-table .event-impact-loss-empty-side {
      padding: 10px 8px;
      border-left: 1px solid #f5e8e2;
      color: var(--color-muted);
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      background: rgba(250, 246, 243, 0.64);
    }

    .event-impact-loss-table .event-impact-loss-empty-side-player1 {
      border-left: 0;
      border-right: 1px solid #f5e8e2;
    }

    .event-impact-loss-note {
      display: block;
      margin-top: 2px;
      color: var(--color-muted);
      font-size: 11px;
      font-weight: 500;
      line-height: 1.3;
    }

    .event-impact-loss-value {
      color: #7b3f32;
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      white-space: nowrap;
    }

    .event-impact-loss-row-empty {
      display: block;
      color: var(--color-muted);
    }

    .event-impact-army-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 12px;
    }

    .event-impact-army-table {
      min-width: 0;
    }

    .event-impact-army-table table {
      table-layout: fixed;
    }

    .event-impact-army-table h4 {
      margin: 0 0 4px;
      color: #465447;
      font-size: 11px;
      font-weight: 800;
    }

    .event-impact-army-table td {
      color: var(--color-strong);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }

    .event-impact-army-table td:first-child {
      width: calc(100% - 64px);
      padding-right: 8px;
      text-align: left;
    }

    .event-impact-army-table td:last-child {
      width: 64px;
      padding-left: 8px;
      border-left: 1px solid #f5e8e2;
      text-align: right;
    }

    @media (max-width: 760px) {
      .event-impact-army-grid {
        grid-template-columns: 1fr;
      }

      .event-impact-detail-summary {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .event-impact-detail-summary-value {
        grid-column: 2;
      }
    }

    .mobile-selected-summary {
      display: none;
      gap: 8px;
      margin: 10px 0;
    }

    .mobile-summary-card {
      min-width: 0;
      border: 1px solid #e5ebe1;
      border-radius: var(--aoe-radius-md);
      background: #f8faf6;
      padding: 9px;
      font-variant-numeric: tabular-nums;
    }

    .mobile-summary-label,
    .mobile-summary-card small {
      display: block;
      color: var(--color-muted);
      font-size: 11px;
      line-height: 1.25;
    }

    .mobile-summary-card strong {
      display: block;
      color: var(--color-strong);
      font-size: 18px;
      line-height: 1.15;
      margin: 3px 0;
    }

    .mobile-detail-panel {
      display: block;
    }

    .mobile-detail-summary {
      display: none;
      align-items: center;
      min-height: 44px;
      color: var(--color-strong);
      font-weight: 800;
      cursor: pointer;
      user-select: none;
    }

    .mobile-detail-summary::-webkit-details-marker {
      display: none;
    }

    .mobile-detail-summary::before {
      content: "";
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid #5B6257;
      margin-right: 8px;
      transition: transform 140ms ease;
      flex: none;
    }

    .mobile-detail-panel[open] .mobile-detail-summary::before {
      transform: rotate(90deg);
    }

    .inspector-section-label {
      margin: 8px 0 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #465447;
    }

    .inspector-table-wrap {
      overflow-x: auto;
      border-radius: 6px;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
    }

    .inspector-table-wrap:focus-visible {
      outline: 2px solid #8fb6dc;
      outline-offset: 2px;
    }

    .inspector-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 13px;
    }

    .inspector-table th,
    .inspector-table td {
      padding: 6px 0;
      border-top: 1px solid var(--color-border-subtle);
      text-align: right;
      white-space: nowrap;
    }

    .inspector-table th:first-child {
      text-align: left;
      color: var(--color-muted);
      font-weight: 600;
      width: 46%;
    }

    .inspector-table th:not(:first-child),
    .inspector-table td:not(:first-child) {
      width: 18%;
    }

    .inspector-table thead th {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.15;
      vertical-align: bottom;
    }

    .inspector-table tbody th:first-child {
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .inspector-table tbody td {
      white-space: nowrap;
    }

    .band-toggle,
    .allocation-category-toggle,
    .band-sub-link {
      min-height: 36px;
      border-radius: var(--aoe-radius-sm);
      transition: background-color 160ms ease, color 160ms ease;
    }

    .band-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      position: relative;
      width: 100%;
      margin: -6px 0;
      padding: 6px 4px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }

    .destroyed-row-label {
      position: relative;
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }

    .destroyed-row-label .band-toggle {
      flex: 1 1 auto;
      min-width: 0;
    }

    .destroyed-row-help-button {
      margin-left: 2px;
    }

    .destroyed-row-tooltip {
      position: absolute;
      left: 0;
      top: calc(100% + 6px);
      z-index: 80;
      width: min(300px, calc(100vw - 48px));
      padding: 8px 10px;
      border: 1px solid rgba(255, 249, 245, 0.22);
      border-radius: var(--aoe-radius-sm);
      background: #1f2a1f;
      box-shadow: 0 10px 26px rgba(31, 42, 31, 0.28);
      color: #fffdf9;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      opacity: 0;
      pointer-events: none;
      text-align: left;
      transform: translateY(-2px);
      transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease;
      visibility: hidden;
      white-space: normal;
    }

    .destroyed-row-help-button[data-tooltip-open="true"] + .destroyed-row-tooltip {
      opacity: 1;
      transform: translateY(0);
      visibility: visible;
    }

    .band-row.is-selected th,
    .band-row.is-selected td {
      background: var(--color-control-hover);
    }

    .band-row.is-selected th {
      box-shadow: inset 3px 0 0 var(--you);
      color: var(--color-link);
    }

    .allocation-category-row th,
    .allocation-category-row td {
      background: var(--color-control-selected);
      color: var(--color-strong);
      font-weight: 800;
    }

    .allocation-category-toggle {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      margin: -6px 0;
      padding: 6px 4px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }

    .category-caret::before {
      content: "▾";
      display: inline-block;
      color: #64705f;
      font-size: 10px;
      transition: transform 120ms ease;
    }

    .allocation-category-toggle[aria-expanded="false"] .category-caret::before {
      transform: rotate(-90deg);
    }

    .band-sub-row th {
      color: #4a5767;
      font-weight: 600;
    }

    .band-sub-label {
      display: inline-block;
      padding-left: 18px;
      font-size: 11px;
    }

    .band-sub-link {
      display: inline-flex;
      align-items: center;
      width: 100%;
      margin: -6px 0;
      padding: 6px 4px 6px 18px;
      border: 0;
      background: transparent;
      color: var(--color-link);
      font: inherit;
      font-size: 11px;
      text-align: left;
      text-decoration: underline;
      cursor: pointer;
    }

    .band-toggle:hover,
    .allocation-category-toggle:hover,
    .band-sub-link:hover {
      background: var(--color-control-hover);
      color: var(--color-link);
    }

    .recap-link:focus-visible,
    .allocation-read-guide-summary:focus-visible,
    .mobile-timeline-button:focus-visible,
    .mobile-timeline-slider:focus-visible,
    .mobile-detail-summary:focus-visible,
    .allocation-category-toggle:focus-visible,
    .band-toggle:focus-visible,
    .band-sub-link:focus-visible,
    .event-impact-heading:focus-visible,
    .event-impact-help-button:focus-visible,
    [data-significant-event-underdog-toggle]:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }

    .inspector-total-row th,
    .inspector-total-row td {
      color: var(--color-strong);
      font-weight: 800;
      border-top-color: var(--color-border);
    }

    .allocation-category-destroyed-row th,
    .allocation-category-destroyed-row td {
      color: #5e2f22;
      font-weight: 800;
      border-top-color: var(--color-border);
    }

    .allocation-category-investment-row th,
    .allocation-category-investment-row td {
      color: var(--color-strong);
      font-weight: 800;
      background: #fafbf8;
    }

    .inspector-adjusted-row th,
    .inspector-adjusted-row td {
      color: var(--color-link);
      font-weight: 700;
      border-top-color: var(--color-border);
      white-space: normal;
      line-height: 1.2;
    }

    .inspector-adjusted-value-main {
      display: block;
      font-variant-numeric: tabular-nums;
    }

    .inspector-adjusted-value-pct {
      display: block;
      font-size: 10px;
      color: #5f6f82;
      overflow-wrap: anywhere;
    }

    .inspector-float-row th,
    .inspector-float-row td {
      color: #5c4720;
      font-weight: 800;
      border-top-color: var(--color-border);
    }

    .inspector-opportunity-lost-row th,
    .inspector-opportunity-lost-row td {
      color: #7b3f32;
      font-weight: 800;
      border-top-color: var(--color-border);
    }

    .band-breakdown {
      margin-top: 12px;
      border-top: 1px solid #dfe6dc;
      padding-top: 10px;
    }

    .band-breakdown-head {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-strong);
      margin-bottom: 6px;
    }

    .band-breakdown-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: 6px 10px;
      align-items: baseline;
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #e5ebe1;
      border-radius: 6px;
      background: #f8faf6;
      color: #465447;
      font-size: 12px;
    }

    .band-breakdown-summary > span:not(.band-summary-label) {
      min-width: 0;
      overflow-wrap: break-word;
    }

    .band-breakdown-summary strong {
      color: var(--color-strong);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .band-summary-label {
      grid-column: 1 / -1;
      min-width: 0;
      color: var(--color-strong);
      font-weight: 800;
      overflow-wrap: normal;
      word-break: normal;
    }

    .opportunity-lost-components {
      grid-column: 1 / -1;
      width: 100%;
      margin-top: 2px;
      border-top: 1px solid #e0e7dc;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }

    .opportunity-lost-component-col {
      width: 32%;
    }

    .opportunity-lost-value-col {
      width: 25%;
    }

    .opportunity-lost-gap-col {
      width: 18%;
    }

    .opportunity-lost-components[hidden] {
      display: none;
    }

    .opportunity-lost-components th,
    .opportunity-lost-components td {
      min-width: 0;
      padding: 5px 6px 0 0;
      text-align: right;
      vertical-align: baseline;
      overflow-wrap: break-word;
    }

    .opportunity-lost-components th:first-child {
      text-align: left;
    }

    .opportunity-lost-components thead th {
      color: #5f6b5b;
      font-weight: 700;
    }

    .opportunity-lost-components thead th:nth-child(2) {
      color: var(--opportunity-you-color, var(--you));
    }

    .opportunity-lost-components thead th:nth-child(3) {
      color: var(--opportunity-opponent-color, var(--opponent));
    }

    .opportunity-lost-components tbody th {
      color: var(--color-strong);
      font-weight: 800;
    }

    .opportunity-lost-components tbody tr[data-opportunity-lost-component="total"] th,
    .opportunity-lost-components tbody tr[data-opportunity-lost-component="total"] td {
      padding-bottom: 5px;
      border-bottom: 1px solid #dfe6dc;
      color: var(--color-strong);
      font-weight: 900;
    }

    .band-breakdown-cols {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .band-breakdown-cols h4 {
      margin: 0 0 4px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-muted);
    }

    .band-breakdown-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 160px;
      overflow: auto;
      display: grid;
      gap: 5px;
      font-size: 12px;
    }

    .band-breakdown-list li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: flex-start;
      border-bottom: 1px dashed var(--color-border-subtle);
      padding-bottom: 2px;
      min-width: 0;
    }

    .band-breakdown-list .band-breakdown-group {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #5b6257;
      border-bottom: 0;
      padding-top: 4px;
      padding-bottom: 0;
    }

    .band-item-label {
      color: var(--color-strong);
      flex: 1;
      min-width: 0;
    }

    .band-item-label-truncated {
      display: block;
      max-width: 100%;
      overflow: visible;
      text-overflow: clip;
      white-space: normal;
      border-radius: 3px;
      line-height: 1.25;
    }

    .band-item-label-truncated:hover,
    .band-item-label-truncated:focus-visible {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      outline: 1px solid #c8d6c3;
      outline-offset: 1px;
      background: var(--color-control-bg);
      padding: 1px 2px;
    }

    .band-item-metric {
      color: #465447;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      flex: none;
      text-align: right;
    }

    .band-item-metric small {
      color: #6f7a70;
    }

    .band-breakdown-empty {
      color: var(--color-muted);
      border-bottom: 0;
      padding-bottom: 0;
    }

    .hover-line {
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .hover-column:hover .hover-line {
      opacity: 0.75;
    }

    .hover-target {
      cursor: crosshair;
    }

    .significant-event-marker {
      cursor: pointer;
      outline: none;
    }

    .significant-event-stem {
      stroke-width: 1.4;
      stroke-dasharray: 3 4;
      opacity: 0.72;
      pointer-events: none;
    }

    .significant-event-window {
      pointer-events: none;
    }

    .significant-event-dot {
      stroke: var(--color-control-bg);
      stroke-width: 2;
      filter: drop-shadow(0 1px 2px rgba(32, 43, 32, 0.24));
    }

    .significant-event-glyph {
      fill: var(--color-control-bg);
      font-size: 10px;
      font-weight: 900;
      pointer-events: none;
    }

    .significant-event-marker:hover .significant-event-dot,
    .significant-event-marker:focus-visible .significant-event-dot {
      stroke: #1f2a1f;
      stroke-width: 2.4;
    }

    .hover-active-line {
      stroke: #1F2A1F;
      stroke-width: 1.35;
      opacity: 0.78;
      pointer-events: none;
    }

    .hover-value-label {
      pointer-events: none;
      font-size: 11px;
      font-weight: 800;
      paint-order: stroke;
      stroke: var(--color-chart-bg);
      stroke-width: 3px;
      stroke-linejoin: round;
      font-variant-numeric: tabular-nums;
    }

    .allocation-lane-bg {
      fill: #edf4f6;
      opacity: 0.7;
    }

    .allocation-lane-destroyed .allocation-lane-bg {
      fill: #f8ece7;
    }

    .allocation-lane-float .allocation-lane-bg {
      fill: #ecf5ed;
    }

    .allocation-lane-opportunityLost .allocation-lane-bg {
      fill: #f8e8e4;
    }

    .allocation-lane-divider {
      stroke: #cfd9d6;
      stroke-width: 1;
      stroke-dasharray: 3 4;
    }

    .allocation-lane-overall .delta-label {
      fill: var(--color-link);
    }

    .you-label { fill: var(--you); }
    .opponent-label { fill: var(--opponent); }
    .delta-label { fill: var(--color-strong); }

    body[data-hover-pinned="true"] .hover-inspector {
      border-color: #9bbce0;
      box-shadow: 0 0 0 2px rgba(55, 138, 221, 0.12);
    }

    .strategy-readout-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .strategy-readout-card {
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      padding: 10px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .strategy-readout-card h3 {
      margin: 0 0 8px;
      font-size: 13px;
      color: var(--color-strong);
    }

    .strategy-readout-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid var(--color-border-subtle);
      padding-top: 4px;
      margin-top: 4px;
      color: var(--color-muted);
    }

    .strategy-readout-row strong {
      color: var(--color-strong);
    }

    .strategy-state-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .strategy-state-card {
      border: 1px solid var(--color-border);
      border-radius: var(--aoe-radius-md);
      background: var(--color-control-bg);
      padding: 9px;
      font-size: 12px;
    }

    .strategy-state-card-muted {
      background: #f4f7f1;
      color: var(--color-muted);
    }

    .strategy-state-time {
      color: var(--color-muted);
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .strategy-state-title {
      color: var(--color-strong);
      font-weight: 800;
      margin-bottom: 4px;
    }

    .strategy-state-card p {
      margin: 0 0 6px;
      line-height: 1.35;
    }

    .strategy-state-meta {
      color: var(--color-muted);
      font-variant-numeric: tabular-nums;
    }

${fullSurfaceStyles}

    @media (max-width: 1160px) {
      .trajectory-grid { grid-template-columns: 1fr; }
      .hover-inspector { position: static; max-height: none; }
    }

    @media (max-width: 980px) {
      body { padding: 16px; }
      .header-row { grid-template-columns: 1fr; }
      .outcome { text-align: left; }
      .band-breakdown-cols { grid-template-columns: 1fr; }
      .allocation-read-guide-grid { grid-template-columns: 1fr; }
      .strategy-readout-grid { grid-template-columns: 1fr; }
      .strategy-state-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
${fullSurfaceNarrowStyles}
    }

    @media (max-width: 760px) {
      .strategy-state-strip { grid-template-columns: 1fr; }

      .band-toggle,
      .allocation-category-toggle,
      .band-sub-link {
        min-height: 44px;
        padding-top: 10px;
        padding-bottom: 10px;
      }

      .inspector-table thead {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        clip-path: inset(50%);
      }

      .inspector-table,
      .inspector-table tbody,
      .inspector-table tr,
      .inspector-table th,
      .inspector-table td {
        display: block;
        width: 100%;
      }

      .inspector-table tr {
        border-top: 1px solid var(--color-border-subtle);
        padding: 6px 0;
      }

      .inspector-table th,
      .inspector-table td {
        border-top: 0;
        padding: 2px 0;
        white-space: normal;
      }

      .inspector-table th:first-child {
        width: 100%;
        color: var(--color-strong);
        font-weight: 700;
        margin-bottom: 2px;
      }

      .inspector-table th:not(:first-child),
      .inspector-table td:not(:first-child) {
        width: 100%;
      }

      .inspector-table td {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: baseline;
        text-align: right;
      }

      .inspector-table td::before {
        content: attr(data-cell-label);
        color: var(--color-muted);
        font-size: 11px;
        font-weight: 600;
      }

      .inspector-total-row {
        border-top-color: var(--color-border);
      }
    }

    @media (max-width: 760px), (pointer: coarse) {
      .mobile-snapshot-controls { display: grid; }
      .chart-stack { overflow-x: hidden; }
      .chart-stack .leader-strip,
      .chart-stack .strategy-chart { min-width: 0; }
      .hover-target { pointer-events: none; }
      .significant-event-marker.hover-target { pointer-events: all; }
      .mobile-timeline-control { display: grid; }
      .mobile-selected-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hover-inspector > .inspector-eyebrow,
      .hover-inspector > .inspector-time,
      .hover-inspector > .inspector-context { display: none; }
      .mobile-detail-summary { display: flex; }
      .mobile-detail-content { margin-top: 8px; }
    }

    @media (max-width: 520px) {
      body { padding: 12px; }
      .wrap { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }
      .panel { padding: 12px; }
      .chips { flex-direction: column; align-items: stretch; }
      .civ-chip { width: 100%; }
      .section-title { font-size: 19px; }
      .chart-stack { overflow-x: hidden; }
      .chart-stack .leader-strip,
      .chart-stack .strategy-chart { min-width: 0; }
      .opportunity-lost-components { font-size: 10px; }
      .opportunity-lost-components th,
      .opportunity-lost-components td { padding-right: 4px; }
      .mobile-timeline-control { display: grid; }
      .hover-target { pointer-events: none; }
      .significant-event-marker.hover-target { pointer-events: all; }
      .mobile-selected-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .mobile-detail-summary { display: flex; }
      .mobile-detail-content { margin-top: 8px; }
    }

    @media (max-width: 340px) {
      .mobile-selected-summary { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="panel">
      <div class="header-row">
        <div>
          <div class="recap-heading">
            <h1 class="title">Match recap</h1>
            <a class="recap-link" href="${escapeHtml(model.header.summaryUrl)}" target="_blank" rel="noreferrer noopener">AoE4World summary</a>
            <a class="recap-link feedback-link" href="${REDDIT_FEEDBACK_HREF}" target="_blank" rel="noreferrer noopener">Feedback? DM me on Reddit</a>
          </div>
          <div class="meta-line">${escapeHtml(model.header.mode)} · ${escapeHtml(model.header.durationLabel)} · ${escapeHtml(model.header.map)}</div>
          <div class="chips">
            <span class="civ-chip"><span class="swatch" style="background:${escapeHtml(playerLabels.you.color)}"></span>${escapeHtml(playerLabels.you.label)}</span>
            <span class="civ-chip"><span class="swatch" style="background:${escapeHtml(playerLabels.opponent.color)}"></span>${escapeHtml(playerLabels.opponent.label)}</span>
          </div>
        </div>
        <div class="outcome">${escapeHtml(playerLabels.you.label)} · ${escapeHtml(model.header.outcomeLowercase)}</div>
      </div>
      ${model.deferredBanner ? `<div class="banner" style="margin-top:12px">${escapeHtml(model.deferredBanner)}</div>` : ''}
    </section>

    <section class="panel">
      <h2 class="section-title">Resource state over time</h2>
      <p class="section-note allocation-section-note">This chart shows how each player's resources became game state. Economic, Technology, and Military are live net deployed value: what is still contributing at that time after destroyed value is removed. Use the lanes to find when one player's economy, tech, army, float, or losses started separating from the other player.</p>
      <details class="allocation-read-guide" aria-label="Allocation chart legend">
        <summary class="allocation-read-guide-summary">How to read this chart</summary>
        <div class="allocation-read-guide-grid">
          <div class="allocation-read-guide-item" aria-label="Leader strip: who has the larger current tracked deployed pool in each 30-second block">
            <strong>Leader strip</strong>
            <span>Who has the larger current tracked deployed pool in each 30-second block.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Economic, Technology, and Military: shares of each player's current net pool, not gross spending totals">
            <strong>Category lanes</strong>
            <span>Economic, Technology, and Military show what each player's live deployed value is made of. These are shares of the current net pool, not gross spending totals.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="${escapeHtml(destroyedGuideText)}">
            <strong>Destroyed lane</strong>
            <span>${escapeHtml(destroyedGuideText)}.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Overall: total current tracked deployed value across modeled categories after destroyed value is removed">
            <strong>Overall lane</strong>
            <span>Total current tracked deployed value across the modeled categories after destroyed value is removed.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Float: resources in the bank that have not become useful game state yet">
            <strong>Float lane</strong>
            <span>Resources in the bank that have not become useful game state yet.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Opportunity lost: resources missing because of villager deaths or villager underproduction by selected time">
            <strong>Opportunity lost lane</strong>
            <span>Resources missing because of villager deaths or villager underproduction by selected time.</span>
          </div>
        </div>
      </details>
      <div class="age-legend">
        <strong>Age timings</strong>
        <span class="age-key"><span class="age-line" style="border-color:${escapeHtml(playerLabels.you.color)}"></span>${escapeHtml(playerLabels.you.ageLabel)} age-up</span>
        <span class="age-key"><span class="age-line dashed" style="border-color:${escapeHtml(playerLabels.opponent.color)}"></span>${escapeHtml(playerLabels.opponent.ageLabel)} age-up</span>
      </div>
      ${buildMobileSnapshotControlsHtml(hoverSnapshots, defaultHoverSnapshot, playerLabels)}
      <div class="trajectory-grid">
        <div class="chart-stack">
          ${buildAllocationLeaderStripSvg(
            buildAllocationLeaderSegments(hoverSnapshots, model.trajectory.durationSeconds),
            model.trajectory.durationSeconds,
            playerLabels
          )}
          ${buildStrategyAllocationSvg(
            hoverSnapshots,
            model.trajectory.durationSeconds,
            model.trajectory.ageMarkers,
            playerLabels
          )}
        </div>
        ${buildHoverInspectorHtml(defaultHoverSnapshot, playerLabels, { includeAdjustedMilitary })}
      </div>
    </section>

    ${surface === 'full' ? buildFullSurfaceSections(model, hoverSnapshots, defaultHoverSnapshot, playerLabels) : ''}

  </main>
  ${options.analyticsScript ? `<script id="posthog-analytics">${options.analyticsScript}</script>` : ''}
  ${buildHoverInteractionScript(inlineHoverSnapshots, playerLabels, { includeAdjustedMilitary })}
  ${options.webVitalsScript ? `<script id="web-vitals-monitor">${options.webVitalsScript}</script>` : ''}
</body>
</html>`;
}
