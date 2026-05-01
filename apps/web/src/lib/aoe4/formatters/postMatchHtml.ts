import { AgeMarker, PostMatchPlayerDisplay, PostMatchViewModel, SignificantTimelineEvent } from '../analysis/postMatchViewModel';
import { GatherRatePoint, PoolSeriesPoint } from '../analysis/resourcePool';
import { evaluateUnitPairCounterComputation } from '../data/combatValueEngine';
import type { PairCounterComputation } from '../data/counterMatrix';
import type { UnitWithValue } from '../types';
import { buildWebVitalsScript } from '../../webVitals';

interface BandDef {
  key: keyof Pick<
    PoolSeriesPoint,
    'economic' | 'populationCap' | 'militaryCapacity' | 'militaryActive' | 'defensive' | 'research' | 'advancement'
  >;
  label: string;
  color: string;
}

type HoverBandKey = BandDef['key'];
type BreakdownKey = HoverBandKey | 'destroyed' | 'float' | 'opportunityLost';

const bandDefs: BandDef[] = [
  { key: 'economic', label: 'Economic', color: '#5DCAA5' },
  { key: 'populationCap', label: 'Population cap', color: '#7AB8E6' },
  { key: 'militaryCapacity', label: 'Military buildings', color: '#EF9F27' },
  { key: 'militaryActive', label: 'Mil active', color: '#F0997B' },
  { key: 'defensive', label: 'Defensive', color: '#B4B2A9' },
  { key: 'research', label: 'Research', color: '#AFA9EC' },
  { key: 'advancement', label: 'Advancement', color: '#88AD6A' },
];

type AllocationCategoryKey = 'economic' | 'technology' | 'military' | 'other';
type AllocationGraphKey = 'economic' | 'technology' | 'military' | 'destroyed' | 'overall' | 'float' | 'opportunityLost';
type AllocationLeader = 'you' | 'opponent' | 'tie';

interface AllocationCategoryDef {
  key: AllocationCategoryKey;
  label: string;
  bandKeys: HoverBandKey[];
}

interface AllocationGraphDef {
  key: AllocationGraphKey;
  label: string;
  mode: 'share' | 'absolute';
}

export interface AllocationValues {
  economic: number;
  technology: number;
  military: number;
  other: number;
  destroyed: number;
  overall: number;
  float: number;
  opportunityLost: number;
}

interface AllocationComparisonRow {
  you: number;
  opponent: number;
  delta: number;
  youShare: number;
  opponentShare: number;
  shareDelta: number;
}

type AllocationComparison = Record<AllocationGraphKey | AllocationCategoryKey, AllocationComparisonRow>;

export interface AllocationLeaderSegment {
  categoryKey: AllocationGraphKey;
  start: number;
  end: number;
  hoverTimestamp: number;
  leader: AllocationLeader;
  you: number;
  opponent: number;
}

const allocationCategoryDefs: AllocationCategoryDef[] = [
  { key: 'economic', label: 'Economic', bandKeys: ['economic'] },
  { key: 'technology', label: 'Technology', bandKeys: ['research', 'advancement'] },
  { key: 'military', label: 'Military', bandKeys: ['militaryCapacity', 'militaryActive', 'defensive'] },
  { key: 'other', label: 'Other', bandKeys: ['populationCap'] },
];

const allocationGraphDefs: AllocationGraphDef[] = [
  { key: 'economic', label: 'Economic', mode: 'share' },
  { key: 'technology', label: 'Technology', mode: 'share' },
  { key: 'military', label: 'Military', mode: 'share' },
  { key: 'destroyed', label: 'Destroyed', mode: 'absolute' },
  { key: 'overall', label: 'Overall', mode: 'absolute' },
  { key: 'float', label: 'Float', mode: 'absolute' },
  { key: 'opportunityLost', label: 'Opportunity lost', mode: 'absolute' },
];
const shareAllocationKeys: Array<AllocationGraphKey | AllocationCategoryKey> = ['economic', 'technology', 'military'];
const shareAllocationKeySet = new Set<AllocationGraphKey | AllocationCategoryKey>(shareAllocationKeys);
const allocationLeaderGraphDefs = allocationGraphDefs.filter(graph =>
  shareAllocationKeySet.has(graph.key)
);

type StrategyBucketKey = 'economy' | 'military' | 'technology';
type SignificantEventPlayerKey = 'player1' | 'player2';

interface StrategyBucketDef {
  key: StrategyBucketKey;
  label: string;
}

const strategyBucketDefs: StrategyBucketDef[] = [
  { key: 'economy', label: 'Economy' },
  { key: 'military', label: 'Military' },
  { key: 'technology', label: 'Technology' },
];

const svgWidth = 980;
const poolPadding = { top: 54, right: 12, bottom: 30, left: 58 };
const poolLaneHeight = 170;
const poolLaneGap = 42;
const poolDeltaTopGap = 38;
const poolDeltaHeight = 72;
const strategyPadding = { top: 42, right: 12, bottom: 38, left: 96 };
const strategyLaneHeight = 84;
const strategyLaneGap = 24;
const strategyHeight =
  strategyPadding.top +
  allocationGraphDefs.length * strategyLaneHeight +
  (allocationGraphDefs.length - 1) * strategyLaneGap +
  strategyPadding.bottom;
const leaderStripRowHeight = 18;
const leaderStripRowGap = 8;
const leaderStripFirstRowTop = 18;
const leaderStripAxisTop = 96;
const leaderStripAxisHeight = 30;
const leaderStripHeight = leaderStripAxisTop + leaderStripAxisHeight;
const gatherPadding = { top: 16, right: 12, bottom: 24, left: 56 };
const gatherHeight = 150;
const villagerChartWidth = 470;
const villagerPadding = { top: 14, right: 10, bottom: 24, left: 42 };
const villagerHeight = 180;
const MATRIX_STRONG_THRESHOLD = 1.2;
const MATRIX_WEAK_THRESHOLD = 0.85;
const significantVillagerOpportunityTooltip =
  'Scale-adjusted future missed gathering from killed villagers in this event window. The model removes those deaths, measures the future villager death-loss avoided, then discounts each future increment by event-time deployed resources divided by deployed resources at that later time.';
const MAX_CLIENT_BAND_BREAKDOWN_ENTRIES = 12;

type RenderPlayerLabels = Record<'you' | 'opponent', PostMatchPlayerDisplay>;

interface HoverBandValues {
  economic: number;
  populationCap: number;
  militaryCapacity: number;
  militaryActive: number;
  defensive: number;
  research: number;
  advancement: number;
  destroyed?: number;
  float?: number;
  opportunityLost?: number;
  gathered?: number;
  total: number;
}

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
  bandBreakdown: Record<HoverBandKey, BandBreakdownPayload> & Partial<Record<'destroyed' | 'float' | 'opportunityLost', BandBreakdownPayload>>;
}

type ClientHoverSnapshot = Pick<
  HoverSnapshot,
  | 'timestamp'
  | 'timeLabel'
  | 'strategyX'
  | 'markers'
  | 'you'
  | 'opponent'
  | 'delta'
  | 'allocation'
  | 'totalPoolTooltip'
  | 'strategy'
  | 'gather'
  | 'significantEvent'
  | 'bandBreakdown'
>;

interface RenderPostMatchHtmlOptions {
  hoverDataUrl?: string;
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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatSigned(value: number): string {
  if (value > 0) return `+${Math.round(value)}`;
  return `${Math.round(value)}`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
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

function formatPrecise(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value.toFixed(decimals)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return 'n/a';
  return `${(value * 100).toFixed(decimals)}%`;
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

function roundToTenth(value: number): number {
  const rounded = Number(value.toFixed(1));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatStrategyShare(value: number): string {
  return `${roundToTenth(value).toFixed(1)}%`;
}

function formatSignedPercentagePoints(value: number): string {
  const rounded = roundToTenth(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}pp`;
}

function formatBetLabel(label: string): string {
  return label
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function formatAgeMetricTitle(age: string): string {
  return `${age} age`;
}

function buildAgeMetricCardsHtml(model: PostMatchViewModel): string {
  return model.metricCards.ageAnalyses
    .map(card => `
      <article class="metric-card metric-card-age">
        <div class="metric-title">${escapeHtml(formatAgeMetricTitle(card.age))}</div>
        <div class="metric-range">${escapeHtml(card.timeRangeLabel)}</div>
        <div class="metric-analysis-lines">
          <div class="metric-analysis metric-analysis-gap">${escapeHtml(card.gapSummary)}</div>
          <div class="metric-analysis">${escapeHtml(card.allocationSummary)}</div>
          <div class="metric-analysis">${escapeHtml(card.destructionSummary)}</div>
          <div class="metric-analysis">${escapeHtml(card.conversionSummary)}</div>
        </div>
      </article>`)
    .join('');
}

function poolPointAtOrBefore(series: PoolSeriesPoint[], timestamp: number): PoolSeriesPoint {
  if (series.length === 0) {
    return {
      timestamp,
      economic: 0,
      populationCap: 0,
      militaryCapacity: 0,
      militaryActive: 0,
      defensive: 0,
      research: 0,
      advancement: 0,
      total: 0,
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}

export function buildAllocationCategories(values: HoverBandValues): AllocationValues {
  const economic = Math.max(0, values.economic);
  const technology = Math.max(0, values.research + values.advancement);
  const military = Math.max(0, values.militaryCapacity + values.militaryActive + values.defensive);
  const other = Math.max(0, values.populationCap);
  const destroyed = Math.max(0, values.destroyed ?? 0);
  const float = Math.max(0, values.float ?? 0);
  const opportunityLost = Math.max(0, values.opportunityLost ?? 0);
  return {
    economic,
    technology,
    military,
    other,
    destroyed,
    overall: Math.max(0, economic + technology + military + other - destroyed),
    float,
    opportunityLost,
  };
}

function buildAllocationComparison(
  you: HoverBandValues,
  opponent: HoverBandValues
): AllocationComparison {
  const youCategories = buildAllocationCategories(you);
  const opponentCategories = buildAllocationCategories(opponent);
  const youShareTotal = Math.max(0, youCategories.economic + youCategories.technology + youCategories.military);
  const opponentShareTotal = Math.max(0, opponentCategories.economic + opponentCategories.technology + opponentCategories.military);

  const rowFor = (key: AllocationGraphKey | AllocationCategoryKey): AllocationComparisonRow => {
    const youValue = youCategories[key];
    const opponentValue = opponentCategories[key];
    const youShare = allocationShareFor(key, youValue, youShareTotal);
    const opponentShare = allocationShareFor(key, opponentValue, opponentShareTotal);

    return {
      you: youValue,
      opponent: opponentValue,
      delta: youValue - opponentValue,
      youShare,
      opponentShare,
      shareDelta: roundToTenth(youShare - opponentShare),
    };
  };

  return {
    economic: rowFor('economic'),
    technology: rowFor('technology'),
    military: rowFor('military'),
    other: rowFor('other'),
    destroyed: rowFor('destroyed'),
    overall: rowFor('overall'),
    float: rowFor('float'),
    opportunityLost: rowFor('opportunityLost'),
  };
}

function allocationShareFor(
  key: AllocationGraphKey | AllocationCategoryKey,
  value: number,
  shareTotal: number
): number {
  if (!shareAllocationKeySet.has(key) || shareTotal <= 0) return 0;
  return roundToTenth((value / shareTotal) * 100);
}

function hoverSnapshotAtOrBefore<T extends { timestamp: number }>(points: T[], timestamp: number): T {
  if (points.length === 0) {
    throw new Error('Expected at least one point for allocation segment generation');
  }

  let candidate = points[0];
  for (const point of points) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}

export function buildAllocationLeaderSegments(
  points: Array<{
    timestamp: number;
    you: HoverBandValues;
    opponent: HoverBandValues;
    accounting?: HoverSnapshot['accounting'];
  }>,
  duration: number
): AllocationLeaderSegment[] {
  if (points.length === 0) return [];

  const segmentCount = Math.max(1, Math.ceil(Math.max(1, duration) / 30));
  const segments: AllocationLeaderSegment[] = [];

  for (const graph of allocationLeaderGraphDefs) {
    for (let index = 0; index < segmentCount; index += 1) {
      const start = index * 30;
      const end = Math.min(Math.max(1, duration), (index + 1) * 30);
      const point = hoverSnapshotAtOrBefore(points, end);
      const allocation = buildAllocationComparison(
        point.accounting?.you ?? point.you,
        point.accounting?.opponent ?? point.opponent
      );
      const row = allocation[graph.key];
      const diff = row.you - row.opponent;
      const leader: AllocationLeader =
        Math.abs(diff) < 0.5 ? 'tie' : diff > 0 ? 'you' : 'opponent';

      segments.push({
        categoryKey: graph.key,
        start,
        end,
        hoverTimestamp: point.timestamp,
        leader,
        you: row.you,
        opponent: row.opponent,
      });
    }
  }

  return segments;
}

function buildStrategyShares(values: HoverBandValues): Record<StrategyBucketKey, number> {
  const categories = buildAllocationCategories(values);
  const economy = categories.economic;
  const military = categories.military;
  const technology = categories.technology;
  const total = economy + military + technology;

  if (total <= 0) {
    return {
      economy: 0,
      military: 0,
      technology: 0,
    };
  }

  return {
    economy: roundToTenth((economy / total) * 100),
    military: roundToTenth((military / total) * 100),
    technology: roundToTenth((technology / total) * 100),
  };
}

function buildStrategySnapshot(
  you: HoverBandValues,
  opponent: HoverBandValues
): HoverSnapshot['strategy'] {
  const youShares = buildStrategyShares(you);
  const opponentShares = buildStrategyShares(opponent);

  return {
    economy: {
      you: youShares.economy,
      opponent: opponentShares.economy,
      delta: roundToTenth(youShares.economy - opponentShares.economy),
    },
    military: {
      you: youShares.military,
      opponent: opponentShares.military,
      delta: roundToTenth(youShares.military - opponentShares.military),
    },
    technology: {
      you: youShares.technology,
      opponent: opponentShares.technology,
      delta: roundToTenth(youShares.technology - opponentShares.technology),
    },
  };
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

function totalPoolTooltipText(allocation: AllocationComparison, labels: RenderPlayerLabels): string {
  return [
    'Economic + Technology + Military + Other - Destroyed = Total pool',
    `${labels.you.compactLabel}: ${formatNumber(allocation.economic.you)} + ${formatNumber(allocation.technology.you)} + ${formatNumber(allocation.military.you)} + ${formatNumber(allocation.other.you)} - ${formatNumber(allocation.destroyed.you)} = ${formatNumber(allocation.overall.you)}`,
    `${labels.opponent.compactLabel}: ${formatNumber(allocation.economic.opponent)} + ${formatNumber(allocation.technology.opponent)} + ${formatNumber(allocation.military.opponent)} + ${formatNumber(allocation.other.opponent)} - ${formatNumber(allocation.destroyed.opponent)} = ${formatNumber(allocation.overall.opponent)}`,
  ].join(' | ');
}

type StrategyFocus = StrategyBucketKey | 'balanced';

function strategyDelta(snapshot: HoverSnapshot, bucket: StrategyBucketKey, side: 'you' | 'opponent'): number {
  const otherSide = side === 'you' ? 'opponent' : 'you';
  return snapshot.strategy[bucket][side] - snapshot.strategy[bucket][otherSide];
}

function topStrategyShare(snapshot: HoverSnapshot, side: 'you' | 'opponent'): { key: StrategyBucketKey; value: number } {
  const ranked = strategyBucketDefs
    .map(bucket => ({
      key: bucket.key,
      value: snapshot.strategy[bucket.key][side],
    }))
    .sort((a, b) => b.value - a.value);

  return ranked[0] ?? { key: 'economy', value: 0 };
}

function strategyFocus(snapshot: HoverSnapshot, side: 'you' | 'opponent'): StrategyFocus {
  const earlyMilitaryWindow = snapshot.timestamp <= 8 * 60;
  const earlyTechnologyWindow = snapshot.timestamp <= 12 * 60;
  const militaryShare = snapshot.strategy.military[side];
  const militaryDelta = strategyDelta(snapshot, 'military', side);
  const technologyShare = snapshot.strategy.technology[side];
  const technologyDelta = strategyDelta(snapshot, 'technology', side);

  // Early-game investments can be strategically decisive even when economy still dominates share.
  if (earlyMilitaryWindow && militaryShare >= 8 && militaryDelta >= 8) {
    return 'military';
  }
  if (earlyTechnologyWindow && technologyShare >= 5 && technologyDelta >= 5) {
    return 'technology';
  }

  const rankedDelta = strategyBucketDefs
    .map(bucket => ({
      key: bucket.key,
      delta: strategyDelta(snapshot, bucket.key, side),
    }))
    .sort((a, b) => b.delta - a.delta);
  const deltaTop = rankedDelta[0];
  const deltaSecond = rankedDelta[1];
  if (
    deltaTop &&
    deltaTop.delta >= (deltaTop.key === 'economy' ? 12 : 8) &&
    deltaTop.delta - (deltaSecond?.delta ?? 0) >= 2
  ) {
    return deltaTop.key;
  }

  const ranked = strategyBucketDefs
    .map(bucket => ({
      key: bucket.key,
      value: snapshot.strategy[bucket.key][side],
    }))
    .sort((a, b) => b.value - a.value);
  const top = ranked[0];
  const second = ranked[1];

  if (!top || !second || top.value < 45 || top.value - second.value < 8) {
    return 'balanced';
  }

  return top.key;
}

function strategyFocusLabel(focus: StrategyFocus): string {
  if (focus === 'balanced') return 'Balanced';
  return strategyBucketDefs.find(bucket => bucket.key === focus)?.label ?? focus;
}

function strategyFocusSummary(snapshot: HoverSnapshot, side: 'you' | 'opponent', focus: StrategyFocus): string {
  if (focus === 'balanced') {
    const top = topStrategyShare(snapshot, side);
    return `Balanced (top ${strategyFocusLabel(top.key)} ${formatStrategyShare(top.value)})`;
  }
  return `${strategyFocusLabel(focus)} ${formatStrategyShare(snapshot.strategy[focus][side])}`;
}

function strategyImplication(youFocus: StrategyFocus, opponentFocus: StrategyFocus): string {
  if (youFocus === opponentFocus) {
    return `Both players are optimizing for ${strategyFocusLabel(youFocus).toLowerCase()} in this window.`;
  }

  const pair = new Set([youFocus, opponentFocus]);
  if (pair.has('economy') && pair.has('military')) {
    return 'Economy vs military: watch whether the military investment converts into damage before the economy scales.';
  }
  if (pair.has('technology') && pair.has('military')) {
    return 'Technology vs military: watch whether pressure denies map access before the tech investment pays off.';
  }
  if (pair.has('economy') && pair.has('technology')) {
    return 'Economy vs technology: watch relics, sacred sites, and castle-unit timing against the economic scaling.';
  }

  return 'One side is more balanced while the other leans into a specific investment bucket.';
}

function buildStrategyStateSummary(hoverSnapshots: HoverSnapshot[]): string {
  if (hoverSnapshots.length === 0) return '';

  const changes: Array<{
    timestamp: number;
    timeLabel: string;
    youFocus: StrategyFocus;
    opponentFocus: StrategyFocus;
    youSummary: string;
    opponentSummary: string;
  }> = [];

  for (const snapshot of hoverSnapshots) {
    const youFocus = strategyFocus(snapshot, 'you');
    const opponentFocus = strategyFocus(snapshot, 'opponent');
    const previous = changes[changes.length - 1];
    if (previous && previous.youFocus === youFocus && previous.opponentFocus === opponentFocus) {
      continue;
    }
    changes.push({
      timestamp: snapshot.timestamp,
      timeLabel: snapshot.timeLabel,
      youFocus,
      opponentFocus,
      youSummary: strategyFocusSummary(snapshot, 'you', youFocus),
      opponentSummary: strategyFocusSummary(snapshot, 'opponent', opponentFocus),
    });
  }

  const visibleChanges = changes.slice(0, 8);
  const extraCount = Math.max(0, changes.length - visibleChanges.length);

  return `
    <div class="strategy-state-strip" aria-label="Strategic state changes">
      ${visibleChanges
        .map(change => `
          <article class="strategy-state-card">
            <div class="strategy-state-time">${escapeHtml(change.timeLabel)}</div>
            <div class="strategy-state-title">You ${escapeHtml(strategyFocusLabel(change.youFocus))} · Opp ${escapeHtml(strategyFocusLabel(change.opponentFocus))}</div>
            <p>${escapeHtml(strategyImplication(change.youFocus, change.opponentFocus))}</p>
            <div class="strategy-state-meta">You: ${escapeHtml(change.youSummary)} · Opp: ${escapeHtml(change.opponentSummary)}</div>
          </article>
        `)
        .join('')}
      ${extraCount > 0 ? `<article class="strategy-state-card strategy-state-card-muted"><div class="strategy-state-time">More</div><p>${extraCount} additional state changes later in the game.</p></article>` : ''}
    </div>`;
}

function uniqueSortedTimestamps(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isFinite(value) && value >= 0))]
    .sort((a, b) => a - b);
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

function gatherRateAtOrBefore(series: GatherRatePoint[], timestamp: number): number {
  if (series.length === 0) return 0;

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate.ratePerMin;
}

function adjustedMilitaryAtOrBefore(
  series: PostMatchViewModel['trajectory']['adjustedMilitarySeries'],
  timestamp: number
): PostMatchViewModel['trajectory']['adjustedMilitarySeries'][number] {
  if (series.length === 0) {
    return {
      timestamp,
      you: 0,
      opponent: 0,
      delta: 0,
      youRawMilitaryActive: 0,
      opponentRawMilitaryActive: 0,
      youCounterAdjustedMilitaryActive: 0,
      opponentCounterAdjustedMilitaryActive: 0,
      youUpgradeMultiplier: 1,
      opponentUpgradeMultiplier: 1,
      youUnitBreakdown: [],
      opponentUnitBreakdown: [],
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}

function buildHoverSnapshots(model: PostMatchViewModel, labels: RenderPlayerLabels): HoverSnapshot[] {
  const duration = model.trajectory.durationSeconds;
  const villagerDuration = Math.max(
    1,
    model.villagerOpportunity.resourceSeries.you[model.villagerOpportunity.resourceSeries.you.length - 1]?.timestamp ?? 0,
    model.villagerOpportunity.resourceSeries.opponent[model.villagerOpportunity.resourceSeries.opponent.length - 1]?.timestamp ?? 0,
    duration
  );
  return model.trajectory.hoverSnapshots.map((snapshot) => {
    const minimalMatrix = buildAdjustedMatrixPayload(
      [],
      [],
      model.header.youCivilization,
      model.header.opponentCivilization
    );
    const accounting = snapshot.accounting ?? fallbackAccountingSnapshot(snapshot.you, snapshot.opponent);
    const allocation = buildAllocationComparison(
      {
        ...accounting.you,
        opportunityLost: Math.max(0, snapshot.villagerOpportunity.you.cumulativeLoss),
      },
      {
        ...accounting.opponent,
        opportunityLost: Math.max(0, snapshot.villagerOpportunity.opponent.cumulativeLoss),
      }
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
      totalPoolTooltip: totalPoolTooltipText(allocation, labels),
      strategy: buildStrategySnapshot(accounting.you, accounting.opponent),
      gather: snapshot.gather,
      villagerOpportunity: snapshot.villagerOpportunity,
      significantEvent: snapshot.significantEvent ?? null,
      adjustedMilitary: {
        ...snapshot.adjustedMilitary,
        youUnitBreakdown: [],
        opponentUnitBreakdown: [],
        matrix: minimalMatrix,
      },
      bandBreakdown: snapshot.bandBreakdown,
    };
  });
}

function compactBandBreakdownEntries(entries: BandBreakdownEntry[]): BandBreakdownEntry[] {
  if (entries.length <= MAX_CLIENT_BAND_BREAKDOWN_ENTRIES) {
    return entries;
  }

  const sortedEntries = [...entries].sort((a, b) => b.value - a.value);
  const visibleEntries = sortedEntries.slice(0, MAX_CLIENT_BAND_BREAKDOWN_ENTRIES);
  const hiddenEntries = sortedEntries.slice(MAX_CLIENT_BAND_BREAKDOWN_ENTRIES);
  const hiddenValue = hiddenEntries.reduce((sum, entry) => sum + entry.value, 0);
  const hiddenPercent = hiddenEntries.reduce((sum, entry) => sum + entry.percent, 0);
  const hiddenCount = hiddenEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

  return [
    ...visibleEntries,
    {
      label: `Other active items (${hiddenEntries.length})`,
      value: Math.round(hiddenValue),
      percent: Math.round(hiddenPercent * 10) / 10,
      count: hiddenCount > 0 ? hiddenCount : undefined,
    },
  ];
}

function compactBandBreakdownPayload(snapshot: HoverSnapshot): ClientHoverSnapshot['bandBreakdown'] {
  const compacted: Partial<Record<BreakdownKey, BandBreakdownPayload>> = {};
  Object.entries(snapshot.bandBreakdown).forEach(([key, breakdown]) => {
    compacted[key as BreakdownKey] = {
      you: compactBandBreakdownEntries(breakdown.you),
      opponent: compactBandBreakdownEntries(breakdown.opponent),
    };
  });
  return compacted as ClientHoverSnapshot['bandBreakdown'];
}

function buildClientHoverSnapshots(hoverSnapshots: HoverSnapshot[]): ClientHoverSnapshot[] {
  return hoverSnapshots.map(snapshot => ({
    timestamp: snapshot.timestamp,
    timeLabel: snapshot.timeLabel,
    strategyX: snapshot.strategyX,
    markers: snapshot.markers,
    you: snapshot.you,
    opponent: snapshot.opponent,
    delta: snapshot.delta,
    allocation: snapshot.allocation,
    totalPoolTooltip: snapshot.totalPoolTooltip,
    strategy: snapshot.strategy,
    gather: snapshot.gather,
    significantEvent: snapshot.significantEvent,
    bandBreakdown: compactBandBreakdownPayload(snapshot),
  }));
}

export function buildPostMatchHoverPayload(model: PostMatchViewModel): ClientHoverSnapshot[] {
  const labels = renderPlayerLabels(model.header);
  return buildClientHoverSnapshots(buildHoverSnapshots(model, labels));
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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

function significantEventLossRowsHtml(items: SignificantTimelineEvent['encounterLosses']['player1']): string {
  if (items.length === 0) {
    return '<li class="event-impact-loss-row event-impact-loss-row-empty">No losses</li>';
  }

  return items
    .map(item => `
              <li class="event-impact-loss-row">
                <span class="event-impact-loss-name">${escapeHtml(item.label)} x${formatNumber(item.count)}</span>
                <span class="event-impact-loss-value">${formatNumber(item.value)}</span>
              </li>`)
    .join('');
}

function significantEventArmyRowsHtml(
  units: NonNullable<SignificantTimelineEvent['preEncounterArmies']>['player1']['units'] | undefined
): string {
  if (!units || units.length === 0) {
    return '<li class="event-impact-loss-row event-impact-loss-row-empty">No active military</li>';
  }

  return significantEventLossRowsHtml(units);
}

function significantEventLossValue(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey,
  metric: 'grossLoss' | 'immediateLoss' | 'villagerOpportunityLoss' | 'pctOfDeployed'
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

function significantEventLossSummaryHtml(
  event: SignificantTimelineEvent | null,
  playerKey: SignificantEventPlayerKey,
  playerLabel: string
): string {
  const totalLoss = significantEventLossValue(event, playerKey, 'grossLoss');
  const immediateLoss = significantEventLossValue(event, playerKey, 'immediateLoss');
  const villagerOpportunityLoss = significantEventLossValue(event, playerKey, 'villagerOpportunityLoss');
  const pctOfDeployed = significantEventLossValue(event, playerKey, 'pctOfDeployed');
  const opportunityHiddenAttr = event && villagerOpportunityLoss > 0 ? '' : ' hidden';
  const shareLabel = `Share of ${playerLabel} deployed`;
  return `
                  <dl class="event-impact-loss-summary" data-significant-event-loss-summary="${playerKey}">
                    <div><dt>Total loss</dt><dd data-significant-event-loss-total="${playerKey}">${event ? formatNumber(totalLoss) : ''}</dd></div>
                    <div><dt>Immediate loss</dt><dd data-significant-event-loss-immediate="${playerKey}">${event ? formatNumber(immediateLoss) : ''}</dd></div>
                    <div data-significant-event-loss-villager-opportunity-row="${playerKey}"${opportunityHiddenAttr}><dt><span data-villager-opportunity-event-tooltip title="${escapeHtml(significantVillagerOpportunityTooltip)}">Villager opportunity</span></dt><dd data-significant-event-loss-villager-opportunity="${playerKey}">${event ? formatNumber(villagerOpportunityLoss) : ''}</dd></div>
                    <div><dt data-significant-event-loss-share-label="${playerKey}">${escapeHtml(shareLabel)}</dt><dd data-significant-event-loss-share="${playerKey}">${event ? `${formatPrecise(pctOfDeployed, 1)}%` : ''}</dd></div>
                  </dl>`;
}

function significantEventLossesHtml(event: SignificantTimelineEvent | null): string {
  const player1Label = event?.player1Label ?? event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Label ?? event?.player2Civilization ?? 'Player 2';
  return `
            <div class="event-impact-loss-detail" data-significant-event-losses>
              <div class="event-impact-loss-detail-title">Encounter losses</div>
              <div class="event-impact-loss-columns">
                <div class="event-impact-loss-column">
                  <div class="event-impact-loss-column-heading" data-significant-event-loss-heading="player1">${escapeHtml(player1Label)} losses</div>
                  ${significantEventLossSummaryHtml(event, 'player1', player1Label)}
                  <ul class="event-impact-loss-list" data-significant-event-loss-list="player1">${significantEventLossRowsHtml(event?.encounterLosses?.player1 ?? [])}</ul>
                </div>
                <div class="event-impact-loss-column">
                  <div class="event-impact-loss-column-heading" data-significant-event-loss-heading="player2">${escapeHtml(player2Label)} losses</div>
                  ${significantEventLossSummaryHtml(event, 'player2', player2Label)}
                  <ul class="event-impact-loss-list" data-significant-event-loss-list="player2">${significantEventLossRowsHtml(event?.encounterLosses?.player2 ?? [])}</ul>
                </div>
              </div>
            </div>`;
}

function significantEventArmyValue(event: SignificantTimelineEvent | null, playerKey: SignificantEventPlayerKey): number {
  return event?.preEncounterArmies?.[playerKey]?.totalValue ?? 0;
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

function significantEventPreEncounterArmiesHtml(event: SignificantTimelineEvent | null): string {
  const player1Label = event?.player1Label ?? event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Label ?? event?.player2Civilization ?? 'Player 2';
  const hiddenAttr = event?.kind === 'fight' && event.preEncounterArmies ? '' : ' hidden';
  return `
            <div class="event-impact-loss-detail event-impact-army-detail" data-significant-event-armies${hiddenAttr}>
              <div class="event-impact-loss-detail-title">Pre-encounter armies</div>
              <div class="event-impact-loss-columns">
                <div class="event-impact-loss-column">
                  <div class="event-impact-loss-column-heading" data-significant-event-army-heading="player1">${escapeHtml(player1Label)} army before fight</div>
                  <dl class="event-impact-loss-summary">
                    <div><dt>Active military</dt><dd data-significant-event-army-total="player1">${event ? formatNumber(significantEventArmyValue(event, 'player1')) : ''}</dd></div>
                  </dl>
                  <ul class="event-impact-loss-list" data-significant-event-army-list="player1">${significantEventArmyRowsHtml(event?.preEncounterArmies?.player1.units)}</ul>
                </div>
                <div class="event-impact-loss-column">
                  <div class="event-impact-loss-column-heading" data-significant-event-army-heading="player2">${escapeHtml(player2Label)} army before fight</div>
                  <dl class="event-impact-loss-summary">
                    <div><dt>Active military</dt><dd data-significant-event-army-total="player2">${event ? formatNumber(significantEventArmyValue(event, 'player2')) : ''}</dd></div>
                  </dl>
                  <ul class="event-impact-loss-list" data-significant-event-army-list="player2">${significantEventArmyRowsHtml(event?.preEncounterArmies?.player2.units)}</ul>
                </div>
              </div>
            </div>`;
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

function significantEventAriaLabel(event: SignificantTimelineEvent): string {
  return `${event.label} at ${event.timeLabel}: ${event.headline || event.description}`;
}

function significantEventMarkerColor(event: SignificantTimelineEvent): string {
  return event.victim === 'you' ? '#378ADD' : '#D85A30';
}

function significantEventMarkerGlyph(event: SignificantTimelineEvent): string {
  if (event.kind === 'raid') return 'R';
  if (event.kind === 'fight') return 'F';
  return 'L';
}

function buildSignificantEventImpactHtml(event: SignificantTimelineEvent | null): string {
  const hiddenAttr = event ? '' : ' hidden';
  return `
          <section class="event-impact" data-significant-event${hiddenAttr}>
            <div class="event-impact-heading">Event impact</div>
            ${significantEventTitleHtml(event)}
            ${significantEventPreEncounterArmiesHtml(event)}
            ${significantEventLossesHtml(event)}
            ${significantEventUnderdogDetailsHtml(event)}
          </section>`;
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

function buildHoverInspectorHtml(snapshot: HoverSnapshot, labels: RenderPlayerLabels): string {
  function renderBreakdownList(entries: BandBreakdownEntry[], bandKey: BreakdownKey): string {
    if (entries.length === 0) {
      return '<li class="band-breakdown-empty">No active items</li>';
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
          const rows = groupEntries
            .map(entry => `
              <li>
                <span class="band-item-label band-item-label-truncated" title="${escapeHtml(entry.label)}" tabindex="0">${escapeHtml(entry.label)}</span>
                <span class="band-item-metric">${formatNumber(entry.value)} <small>(${entry.percent.toFixed(1)}%)</small></span>
              </li>
            `)
            .join('');

          return `
            <li class="band-breakdown-group">${escapeHtml(def.label)}</li>
            ${rows}
          `;
        })
        .join('');

      if (groupedHtml.length > 0) return groupedHtml;
    }

    return entries
      .map(entry => `
        <li>
          <span class="band-item-label band-item-label-truncated" title="${escapeHtml(entry.label)}" tabindex="0">${escapeHtml(entry.label)}</span>
          <span class="band-item-metric">${formatNumber(entry.value)} <small>(${entry.percent.toFixed(1)}%)</small></span>
        </li>
      `)
      .join('');
  }

  const bandByKey = new Map(bandDefs.map(band => [band.key, band]));
  const allocation = snapshot.allocation ?? buildAllocationComparison(snapshot.you, snapshot.opponent);
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

  const renderBandRow = (band: BandDef, categoryKey: AllocationCategoryKey, collapsed: boolean): string => {
      const isSelected = band.key === 'economic';
      const selectedClass = isSelected ? ' is-selected' : '';
      const subRow = '';

      return `
        <tr class="band-row${selectedClass}" data-allocation-category-child="${categoryKey}"${collapsed ? ' hidden' : ''}>
          <th>
            <button type="button" class="band-toggle" data-band-key="${band.key}" aria-pressed="${isSelected ? 'true' : 'false'}">
              <span class="legend-dot" style="background:${band.color}"></span>${escapeHtml(band.label)}
            </button>
          </th>
          <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="you.${band.key}">${formatNumber(snapshot.you[band.key])}</td>
          <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="opponent.${band.key}">${formatNumber(snapshot.opponent[band.key])}</td>
          <td data-cell-label="Delta" data-hover-field="delta.${band.key}">${formatSigned(snapshot.delta[band.key])}</td>
        </tr>
        ${subRow}
      `;
  };
  const renderDestroyedRow = (): string => {
    const row = allocation.destroyed;
    return `
        <tr class="band-row inspector-destroyed-row" data-inspector-row="destroyed">
          <th>
            <button type="button" class="band-toggle" data-band-key="destroyed" aria-pressed="false">
              <span class="legend-dot destroyed-dot"></span>Destroyed
            </button>
          </th>
          <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="allocation.destroyed.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="allocation.destroyed.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.destroyed.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };
  const renderOpportunityLostRow = (): string => {
    const row = allocation.opportunityLost;
    const tooltip = 'Total villager opportunity cost: resources missing villagers would have gathered by this timestamp. Event scores scale-adjust future gathering lost from killed villagers by the deployed-resource size at the event time; direct villager death value is shown in Destroyed.';
    return `
        <tr class="band-row inspector-opportunity-lost-row" data-inspector-row="opportunityLost">
          <th>
            <button type="button" class="band-toggle" data-band-key="opportunityLost" aria-pressed="false" title="${escapeHtml(tooltip)}">
              <span class="legend-dot opportunity-lost-dot"></span><span data-opportunity-lost-tooltip title="${escapeHtml(tooltip)}">Opportunity lost</span>
            </button>
          </th>
          <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="allocation.opportunityLost.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="allocation.opportunityLost.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.opportunityLost.delta">${formatSigned(row.delta)}</td>
        </tr>
      `;
  };

  const bandRows = allocationCategoryDefs
    .map(category => {
      const row = allocation[category.key];
      const expanded = category.key === 'economic';
      const children = category.bandKeys
        .map(key => {
          const band = bandByKey.get(key);
          return band ? renderBandRow(band, category.key, !expanded) : '';
        })
        .join('');

      return `
        <tr class="allocation-category-row" data-allocation-category-row="${category.key}">
          <th>
            <button type="button" class="allocation-category-toggle" data-allocation-category-toggle="${category.key}" aria-expanded="${expanded ? 'true' : 'false'}">
              <span class="category-caret" aria-hidden="true"></span>${escapeHtml(category.label)}
            </button>
          </th>
          <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="allocation.${category.key}.you">${formatNumber(row.you)}</td>
          <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="allocation.${category.key}.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.${category.key}.delta">${formatSigned(row.delta)}</td>
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
      ${buildMobileSelectedSummaryHtml(snapshot, labels)}
      <details class="mobile-detail-panel" data-mobile-details open>
        <summary class="mobile-detail-summary">Allocation details</summary>
        <div class="mobile-detail-content">
          ${buildSignificantEventImpactHtml(snapshot.significantEvent)}
          <div class="inspector-section-label" data-inspector-section="allocation">Allocation</div>
          <div class="inspector-table-wrap" tabindex="0" role="region" aria-label="Selected timestamp values table">
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
                ${renderDestroyedRow()}
                <tr class="inspector-total-row">
                  <th><span data-total-pool-tooltip title="${escapeHtml(snapshot.totalPoolTooltip)}">Total Pool</span></th>
                  <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="allocation.overall.you">${formatNumber(allocation.overall.you)}</td>
                  <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="allocation.overall.opponent">${formatNumber(allocation.overall.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="allocation.overall.delta">${formatSigned(allocation.overall.delta)}</td>
                </tr>
                <tr class="band-row inspector-float-row" data-inspector-row="float">
                  <th>
                    <button type="button" class="band-toggle" data-band-key="float" aria-pressed="false">
                      <span class="legend-dot float-dot"></span>Float (not deployed)
                    </button>
                  </th>
                  <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="allocation.float.you">${formatNumber(allocation.float.you)}</td>
                  <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="allocation.float.opponent">${formatNumber(allocation.float.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="allocation.float.delta">${formatSigned(allocation.float.delta)}</td>
                </tr>
                ${renderOpportunityLostRow()}
                <tr>
                  <th>Gather/min</th>
                  <td data-cell-label="${escapeHtml(youLabel)}" data-hover-field="gather.you">${formatNumber(snapshot.gather.you)}</td>
                  <td data-cell-label="${escapeHtml(opponentLabel)}" data-hover-field="gather.opponent">${formatNumber(snapshot.gather.opponent)}</td>
                  <td data-cell-label="Delta" data-hover-field="gather.delta">${formatSigned(snapshot.gather.delta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="band-breakdown">
            <div class="band-breakdown-head" data-band-breakdown-title>Economic composition</div>
            <div class="band-breakdown-summary" data-band-breakdown-summary>
              <span class="band-summary-label" data-band-summary-label>${escapeHtml(selectedBandSummary.label)}</span>
              <span>${escapeHtml(youShortLabel)} <strong data-band-summary-you>${formatNumber(selectedBandSummary.you)}</strong></span>
              <span>${escapeHtml(opponentShortLabel)} <strong data-band-summary-opponent>${formatNumber(selectedBandSummary.opponent)}</strong></span>
              <span>Delta <strong data-band-summary-delta>${formatSigned(selectedBandSummary.delta)}</strong></span>
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

function formatPoolTooltip(label: string, point: PoolSeriesPoint): string[] {
  return [
    `${label} total: ${Math.round(point.total)}`,
    `${label} Economic: ${Math.round(point.economic)}`,
    `${label} Population cap: ${Math.round(point.populationCap)}`,
    `${label} Mil cap: ${Math.round(point.militaryCapacity)}`,
    `${label} Mil active: ${Math.round(point.militaryActive)}`,
    `${label} Defensive: ${Math.round(point.defensive)}`,
    `${label} Research: ${Math.round(point.research)}`,
    `${label} Advancement: ${Math.round(point.advancement)}`,
  ];
}

function markerColor(marker: AgeMarker): string {
  return marker.player === 'you' ? '#378ADD' : '#D85A30';
}

function markerDash(marker: AgeMarker): string {
  return marker.player === 'you' ? '' : ' stroke-dasharray="7 5"';
}

function markerTextAnchor(xPos: number, width: number): string {
  if (xPos < 88) return 'start';
  if (xPos > width - 88) return 'end';
  return 'middle';
}

function assignMarkerRows(
  markers: AgeMarker[],
  x: (timestamp: number) => number,
  rowCount: number,
  minGapPx: number
): { marker: AgeMarker; xPos: number; row: number }[] {
  const lastByRow = Array.from({ length: rowCount }, () => Number.NEGATIVE_INFINITY);

  return markers.map(marker => {
    const xPos = x(marker.timestamp);
    let row = lastByRow.findIndex(last => xPos - last >= minGapPx);
    if (row === -1) {
      row = 0;
    }
    lastByRow[row] = xPos;
    return { marker, xPos, row };
  });
}

function buildAgeMarkerLayer(params: {
  markers: AgeMarker[];
  duration: number;
  x: (timestamp: number) => number;
  width: number;
  lineStartY: number;
  lineEndY: number;
  labelY?: number;
  showLabels: boolean;
}): string {
  const markers = params.markers.filter(marker => marker.timestamp >= 0 && marker.timestamp <= params.duration);
  const rowed = assignMarkerRows(markers, params.x, params.showLabels ? 4 : 1, params.showLabels ? 86 : 0);

  return rowed
    .map(({ marker, xPos, row }) => {
      const label = escapeHtml(marker.label);
      const text = params.showLabels
        ? `<text x="${xPos.toFixed(2)}" y="${((params.labelY ?? 12) + row * 12).toFixed(2)}" text-anchor="${markerTextAnchor(xPos, params.width)}" font-size="10" font-weight="700" fill="${markerColor(marker)}">${escapeHtml(marker.shortLabel)}</text>`
        : '';

      return `<g class="age-marker" data-age-marker="${label}">
        <line x1="${xPos.toFixed(2)}" y1="${params.lineStartY.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${params.lineEndY.toFixed(2)}" stroke="${markerColor(marker)}" stroke-width="1.4" opacity="0.72"${markerDash(marker)} />
        ${text}
        <title>${label}</title>
      </g>`;
    })
    .join('');
}

function uniqueSignificantEvents(hoverSnapshots: HoverSnapshot[]): SignificantTimelineEvent[] {
  const byId = new Map<string, SignificantTimelineEvent>();
  for (const snapshot of hoverSnapshots) {
    if (snapshot.significantEvent) {
      byId.set(snapshot.significantEvent.id, snapshot.significantEvent);
    }
  }
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

function buildSignificantEventMarkerLayer(params: {
  events: SignificantTimelineEvent[];
  duration: number;
  x: (timestamp: number) => number;
  lineStartY: number;
  lineEndY: number;
}): string {
  const events = params.events.filter(event => event.timestamp >= 0 && event.timestamp <= params.duration);
  if (events.length === 0) return '';

  const markerY = Math.max(18, params.lineStartY - 18);
  return `<g class="significant-event-markers" aria-label="Significant loss events">
    ${events
    .map(event => {
      const xPos = params.x(event.timestamp);
      const color = significantEventMarkerColor(event);
      const label = significantEventAriaLabel(event);
      return `<g class="significant-event-marker hover-target" data-significant-event-marker data-hover-timestamp="${event.timestamp}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
        <line class="significant-event-stem" x1="${xPos.toFixed(2)}" y1="${markerY.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${params.lineEndY.toFixed(2)}" stroke="${color}" />
        <circle class="significant-event-dot" cx="${xPos.toFixed(2)}" cy="${markerY.toFixed(2)}" r="10" fill="${color}" />
        <text class="significant-event-glyph" x="${xPos.toFixed(2)}" y="${(markerY + 3.7).toFixed(2)}" text-anchor="middle">${escapeHtml(significantEventMarkerGlyph(event))}</text>
        <title>${escapeHtml(label)}</title>
      </g>`;
    })
    .join('')}
  </g>`;
}

function buildPoolComparisonSvg(
  youSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[],
  duration: number,
  yMax: number,
  ageMarkers: AgeMarker[],
  hoverSnapshots: HoverSnapshot[]
): string {
  const width = svgWidth;
  const padding = poolPadding;
  const laneHeight = poolLaneHeight;
  const laneOneTop = padding.top;
  const laneTwoTop = laneOneTop + laneHeight + poolLaneGap;
  const deltaTop = laneTwoTop + laneHeight + poolDeltaTopGap;
  const deltaBottom = deltaTop + poolDeltaHeight;
  const height = deltaBottom + padding.bottom;
  const maxX = Math.max(duration, 1);
  const maxY = Math.max(yMax, 1);

  const x = (timestamp: number): number => scaledX(timestamp, duration, padding);
  const y = (value: number, laneTop: number): number =>
    laneTop + laneHeight - (value / maxY) * laneHeight;

  const buildLanePaths = (series: PoolSeriesPoint[], laneTop: number): string => {
    if (series.length === 0) return '';

    const cumulativeByBand: Record<BandDef['key'], number[]> = {
      economic: [],
      populationCap: [],
      militaryCapacity: [],
      militaryActive: [],
      defensive: [],
      research: [],
      advancement: [],
    };

    for (let i = 0; i < series.length; i += 1) {
      let sum = 0;
      for (const band of bandDefs) {
        sum += series[i][band.key];
        cumulativeByBand[band.key][i] = sum;
      }
    }

    const areaPaths = bandDefs.map((band, bandIndex) => {
      const upperPoints = series.map((point, idx) =>
        `${x(point.timestamp).toFixed(2)},${y(cumulativeByBand[band.key][idx], laneTop).toFixed(2)}`
      );
      const lowerPoints = series
        .map((point, idx) => {
          const lowerValue = bandIndex === 0 ? 0 : cumulativeByBand[bandDefs[bandIndex - 1].key][idx];
          return `${x(point.timestamp).toFixed(2)},${y(lowerValue, laneTop).toFixed(2)}`;
        })
        .reverse();

      const d = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;
      return `<path d="${d}" fill="${band.color}" fill-opacity="0.88" stroke="none" />`;
    });

    const totalPath = series
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${x(point.timestamp).toFixed(2)} ${y(point.total, laneTop).toFixed(2)}`)
      .join(' ');

    return `
      ${areaPaths.join('')}
      <path d="${totalPath}" fill="none" stroke="#253226" stroke-width="1.1" opacity="0.55" />`;
  };

  const buildLaneGrid = (laneTop: number): string => {
    const horizontal = [0, 0.25, 0.5, 0.75, 1]
      .map(step => {
        const value = maxY * step;
        const yPos = y(value, laneTop);
        return `<line x1="${padding.left}" y1="${yPos.toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${yPos.toFixed(2)}" stroke="#D9DDD8" stroke-width="1" />`;
      })
      .join('');

    const yLabels = [0, 0.5, 1]
      .map(step => {
        const value = Math.round(maxY * step);
        const yPos = y(value, laneTop);
        return `<text x="${(padding.left - 8).toFixed(2)}" y="${(yPos + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${value}</text>`;
      })
      .join('');

    return `
      ${horizontal}
      <line x1="${padding.left}" y1="${(laneTop + laneHeight).toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${(laneTop + laneHeight).toFixed(2)}" stroke="#5B6257" stroke-width="1.2" />
      ${yLabels}`;
  };

  const xGridAndTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return [
        `<line x1="${xPos.toFixed(2)}" y1="${laneOneTop.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${deltaBottom.toFixed(2)}" stroke="#E2E5DF" stroke-width="1" />`,
        `<line x1="${xPos.toFixed(2)}" y1="${deltaBottom.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${(deltaBottom + 4).toFixed(2)}" stroke="#7F867B" stroke-width="1" />`,
        `<text x="${xPos.toFixed(2)}" y="${(height - 8).toFixed(2)}" text-anchor="middle" font-size="11" fill="#5B6257">${formatTime(timestamp)}</text>`
      ].join('');
    })
    .join('');

  const timestamps = hoverSnapshots.map(snapshot => snapshot.timestamp);

  const deltaPoints = timestamps.map(timestamp => {
    const youPoint = poolPointAtOrBefore(youSeries, timestamp);
    const oppPoint = poolPointAtOrBefore(opponentSeries, timestamp);
    return {
      timestamp,
      value: youPoint.total - oppPoint.total,
      youPoint,
      oppPoint,
    };
  });

  const maxDelta = Math.max(1, ...deltaPoints.map(point => Math.abs(point.value)));
  const deltaMid = deltaTop + poolDeltaHeight / 2;
  const deltaScale = poolDeltaHeight / 2 - 8;
  const deltaY = (value: number): number => deltaMid - (value / maxDelta) * deltaScale;
  const defaultHover = hoverSnapshots[0];

  const deltaSegments = deltaPoints
    .slice(1)
    .map((point, idx) => {
      const prev = deltaPoints[idx];
      const color = (prev.value + point.value) / 2 >= 0 ? '#378ADD' : '#D85A30';
      return `<line x1="${x(prev.timestamp).toFixed(2)}" y1="${deltaY(prev.value).toFixed(2)}" x2="${x(point.timestamp).toFixed(2)}" y2="${deltaY(point.value).toFixed(2)}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />`;
    })
    .join('');

  const hoverColumns = timestamps
    .map((timestamp, idx) => {
      const prevTimestamp = idx === 0 ? 0 : timestamps[idx - 1];
      const nextTimestamp = idx === timestamps.length - 1 ? maxX : timestamps[idx + 1];
      const leftTimestamp = idx === 0 ? 0 : (prevTimestamp + timestamp) / 2;
      const rightTimestamp = idx === timestamps.length - 1 ? maxX : (timestamp + nextTimestamp) / 2;
      const left = x(leftTimestamp);
      const right = x(rightTimestamp);
      return `<g class="hover-column" data-hover-column data-hover-timestamp="${timestamp}">
        <line class="hover-line" x1="${x(timestamp).toFixed(2)}" y1="${laneOneTop.toFixed(2)}" x2="${x(timestamp).toFixed(2)}" y2="${deltaBottom.toFixed(2)}" stroke="#1F2A1F" stroke-width="1.1" />
        <rect class="hover-target" data-hover-timestamp="${timestamp}" x="${left.toFixed(2)}" y="${laneOneTop.toFixed(2)}" width="${Math.max(2, right - left).toFixed(2)}" height="${(deltaBottom - laneOneTop).toFixed(2)}" fill="transparent" pointer-events="all"><title>${formatTime(timestamp)} - hover for values</title></rect>
      </g>`;
    })
    .join('');

  const ageMarkerLayer = buildAgeMarkerLayer({
    markers: ageMarkers,
    duration,
    x,
    width,
    lineStartY: laneOneTop,
    lineEndY: deltaBottom,
    labelY: 14,
    showLabels: true,
  });

  return `
<svg id="pool-comparison" class="pool-chart pool-comparison-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Aligned deployed resource pool comparison chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F7FAF8" rx="8" />
  ${xGridAndTicks}
  ${buildLaneGrid(laneOneTop)}
  ${buildLaneGrid(laneTwoTop)}
  <text x="${padding.left}" y="${(laneOneTop - 10).toFixed(2)}" font-size="12" font-weight="700" fill="#378ADD">You</text>
  <text x="${padding.left}" y="${(laneTwoTop - 10).toFixed(2)}" font-size="12" font-weight="700" fill="#D85A30">Opponent</text>
  <g>${buildLanePaths(youSeries, laneOneTop)}</g>
  <g>${buildLanePaths(opponentSeries, laneTwoTop)}</g>
  <text x="${padding.left}" y="${(deltaTop - 13).toFixed(2)}" font-size="12" font-weight="700" fill="#253226">Pool delta (You - Opponent)</text>
  <line x1="${padding.left}" y1="${deltaMid.toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${deltaMid.toFixed(2)}" stroke="#7F867B" stroke-width="1" />
  <text x="${(padding.left - 8).toFixed(2)}" y="${(deltaY(maxDelta) + 4).toFixed(2)}" text-anchor="end" font-size="10" fill="#378ADD">+${Math.round(maxDelta)}</text>
  <text x="${(padding.left - 8).toFixed(2)}" y="${(deltaY(-maxDelta) + 4).toFixed(2)}" text-anchor="end" font-size="10" fill="#D85A30">-${Math.round(maxDelta)}</text>
  ${deltaSegments}
  ${ageMarkerLayer}
  <g class="hover-readouts" aria-hidden="true">
    <line data-hover-line-pool class="hover-active-line" x1="${defaultHover.poolX.toFixed(2)}" y1="${laneOneTop.toFixed(2)}" x2="${defaultHover.poolX.toFixed(2)}" y2="${deltaBottom.toFixed(2)}" />
    <text data-hover-label-time class="hover-value-label" x="${hoverLabelX(defaultHover.poolX).toFixed(2)}" y="42" text-anchor="${hoverLabelAnchor(defaultHover.poolX)}">${escapeHtml(defaultHover.timeLabel)}</text>
    <text data-hover-label-pool-total-you class="hover-value-label you-label" x="${hoverLabelX(defaultHover.poolX).toFixed(2)}" y="${(laneOneTop + 20).toFixed(2)}" text-anchor="${hoverLabelAnchor(defaultHover.poolX)}">You ${formatNumber(defaultHover.you.total)}</text>
    <text data-hover-label-pool-total-opponent class="hover-value-label opponent-label" x="${hoverLabelX(defaultHover.poolX).toFixed(2)}" y="${(laneTwoTop + 20).toFixed(2)}" text-anchor="${hoverLabelAnchor(defaultHover.poolX)}">Opp ${formatNumber(defaultHover.opponent.total)}</text>
    <text data-hover-label-pool-delta class="hover-value-label delta-label" x="${hoverLabelX(defaultHover.poolX).toFixed(2)}" y="${(deltaTop + 24).toFixed(2)}" text-anchor="${hoverLabelAnchor(defaultHover.poolX)}">Delta ${formatSigned(defaultHover.delta.total)}</text>
  </g>
  ${hoverColumns}
</svg>`;
}

function leaderColor(leader: AllocationLeader): string {
  if (leader === 'you') return '#378ADD';
  if (leader === 'opponent') return '#D85A30';
  return '#A8AEA5';
}

function roundUpAbsoluteAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const step = 10 ** Math.max(0, exponent - 1);
  return Math.ceil(value / step) * step;
}

function roundUpPercentAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10;
  return Math.min(100, Math.max(10, Math.ceil(value / 5) * 5));
}

function allocationLaneMaxY(
  graph: AllocationGraphDef,
  hoverSnapshots: HoverSnapshot[]
): number {
  const maxValue = Math.max(
    0,
    ...hoverSnapshots.flatMap(snapshot => {
      const row = snapshot.allocation[graph.key];
      return graph.mode === 'absolute'
        ? [row.you, row.opponent]
        : [row.youShare, row.opponentShare];
    })
  );

  return graph.mode === 'absolute'
    ? roundUpAbsoluteAxisMax(maxValue)
    : roundUpPercentAxisMax(maxValue);
}

function buildAllocationLeaderStripSvg(
  hoverSnapshots: HoverSnapshot[],
  duration: number,
  labels: RenderPlayerLabels
): string {
  const width = svgWidth;
  const padding = strategyPadding;
  const plotWidth = width - padding.left - padding.right;
  const maxX = Math.max(duration, 1);
  const x = (timestamp: number): number => padding.left + (timestamp / maxX) * plotWidth;
  const segments = buildAllocationLeaderSegments(hoverSnapshots, duration);

  const rows = allocationLeaderGraphDefs
    .map((category, idx) => {
      const rowTop = leaderStripFirstRowTop + idx * (leaderStripRowHeight + leaderStripRowGap);
      const segmentRects = segments
        .filter(segment => segment.categoryKey === category.key)
        .map(segment => {
          const startX = x(segment.start);
          const endX = x(segment.end);
          const widthPx = Math.max(1, endX - startX);
          const title = `${category.label} ${formatTime(segment.start)}-${formatTime(segment.end)}: ${labels.you.compactLabel} ${formatNumber(segment.you)}, ${labels.opponent.compactLabel} ${formatNumber(segment.opponent)}`;
          return `<rect class="allocation-leader-segment hover-target" data-allocation-leader-segment data-category-key="${category.key}" data-leader="${segment.leader}" data-hover-timestamp="${segment.hoverTimestamp}" x="${startX.toFixed(2)}" y="${rowTop.toFixed(2)}" width="${widthPx.toFixed(2)}" height="${leaderStripRowHeight}" fill="${leaderColor(segment.leader)}" pointer-events="all"><title>${escapeHtml(title)}</title></rect>`;
        })
        .join('');

      return `
        <g>
          <text x="12" y="${(rowTop + 13).toFixed(2)}" font-size="12" font-weight="700" fill="#253226">${escapeHtml(category.label)}</text>
          ${segmentRects}
        </g>
      `;
    })
    .join('');

  const verticalTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return `<line x1="${xPos.toFixed(2)}" y1="12" x2="${xPos.toFixed(2)}" y2="${(leaderStripAxisTop - 8).toFixed(2)}" stroke="#E4E8E1" stroke-width="1" />`;
    })
    .join('');

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return `
        <line x1="${xPos.toFixed(2)}" y1="${(leaderStripAxisTop + 3).toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${(leaderStripAxisTop + 9).toFixed(2)}" stroke="#A8AEA5" stroke-width="1" />
        <text class="leader-strip-time-label" x="${xPos.toFixed(2)}" y="${(leaderStripAxisTop + 22).toFixed(2)}" text-anchor="middle">${formatTime(timestamp)}</text>
      `;
    })
    .join('');

  return `
<svg id="allocation-leader-strip" class="leader-strip" viewBox="0 0 ${width} ${leaderStripHeight}" role="img" aria-label="Thirty-second leader strip by allocation category">
  <rect x="0" y="0" width="${width}" height="${leaderStripHeight}" fill="#F7FAF8" rx="8" />
  ${verticalTicks}
  ${rows}
  <g data-time-axis="allocation-leader">
    <rect class="leader-strip-axis-bg" x="${padding.left}" y="${(leaderStripAxisTop - 2).toFixed(2)}" width="${plotWidth.toFixed(2)}" height="${(leaderStripAxisHeight - 2).toFixed(2)}" rx="6" />
    <line x1="${padding.left}" y1="${leaderStripAxisTop.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${leaderStripAxisTop.toFixed(2)}" stroke="#CAD2C7" stroke-width="1" />
    ${xTicks}
  </g>
</svg>`;
}

function buildStrategyAllocationSvg(
  hoverSnapshots: HoverSnapshot[],
  duration: number,
  ageMarkers: AgeMarker[],
  labels: RenderPlayerLabels
): string {
  const width = svgWidth;
  const height = strategyHeight;
  const padding = strategyPadding;
  const plotWidth = width - padding.left - padding.right;
  const x = (timestamp: number): number => scaledX(timestamp, duration, padding);
  const defaultHover = hoverSnapshots[0];

  if (!defaultHover) {
    return `
<svg id="allocation-comparison" class="strategy-chart allocation-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Allocation comparison chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F7FAF8" rx="10" />
</svg>`;
  }

  const maxX = Math.max(duration, 1);
  const yFor = (value: number, laneTop: number, maxY: number): number =>
    laneTop + strategyLaneHeight - (Math.max(0, Math.min(maxY, value)) / maxY) * strategyLaneHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return `
        <line x1="${xPos.toFixed(2)}" y1="${padding.top.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="#E2E5DF" stroke-width="1" />
        <text x="${xPos.toFixed(2)}" y="${(height - 7).toFixed(2)}" text-anchor="middle" font-size="11" fill="#5B6257">${formatTime(timestamp)}</text>
      `;
    })
    .join('');

  const timestamps = hoverSnapshots.map(snapshot => snapshot.timestamp);
  const hoverColumns = hoverSnapshots
    .map((snapshot, idx) => {
      const timestamp = snapshot.timestamp;
      const prevTimestamp = idx === 0 ? 0 : timestamps[idx - 1];
      const nextTimestamp = idx === hoverSnapshots.length - 1 ? maxX : timestamps[idx + 1];
      const leftTimestamp = idx === 0 ? 0 : (prevTimestamp + timestamp) / 2;
      const rightTimestamp = idx === hoverSnapshots.length - 1 ? maxX : (timestamp + nextTimestamp) / 2;
      const left = x(leftTimestamp);
      const right = x(rightTimestamp);
      const title = allocationGraphDefs
        .map(graph => {
          const row = snapshot.allocation[graph.key];
          if (graph.mode === 'absolute') {
            return `${graph.label}: ${labels.you.compactLabel} ${formatNumber(row.you)}, ${labels.opponent.compactLabel} ${formatNumber(row.opponent)}, Delta ${formatSigned(row.delta)}`;
          }
          return `${graph.label}: ${labels.you.compactLabel} ${formatStrategyShare(row.youShare)}, ${labels.opponent.compactLabel} ${formatStrategyShare(row.opponentShare)}, Delta ${formatSignedPercentagePoints(row.shareDelta)}`;
        })
        .join(' | ');

      return `<rect class="hover-target strategy-hover-target" data-hover-timestamp="${timestamp}" x="${left.toFixed(2)}" y="${padding.top.toFixed(2)}" width="${Math.max(2, right - left).toFixed(2)}" height="${(height - padding.top - padding.bottom).toFixed(2)}" fill="transparent" pointer-events="all"><title>${formatTime(timestamp)} - ${escapeHtml(title)}</title></rect>`;
    })
    .join('');

  const lanes = allocationGraphDefs
    .map((graph, idx) => {
      const laneTop = padding.top + idx * (strategyLaneHeight + strategyLaneGap);
      const laneBottom = laneTop + strategyLaneHeight;
      const maxY = allocationLaneMaxY(graph, hoverSnapshots);
      const valueFor = (snapshot: HoverSnapshot, side: 'you' | 'opponent'): number => {
        const row = snapshot.allocation[graph.key];
        return graph.mode === 'absolute' ? row[side] : side === 'you' ? row.youShare : row.opponentShare;
      };
      const youPath = hoverSnapshots
        .map((snapshot, pointIdx) => `${pointIdx === 0 ? 'M' : 'L'} ${x(snapshot.timestamp).toFixed(2)} ${yFor(valueFor(snapshot, 'you'), laneTop, maxY).toFixed(2)}`)
        .join(' ');
      const opponentPath = hoverSnapshots
        .map((snapshot, pointIdx) => `${pointIdx === 0 ? 'M' : 'L'} ${x(snapshot.timestamp).toFixed(2)} ${yFor(valueFor(snapshot, 'opponent'), laneTop, maxY).toFixed(2)}`)
        .join(' ');
      const topLabel = graph.mode === 'absolute' ? formatNumber(maxY) : formatStrategyShare(maxY);
      const midLabel = graph.mode === 'absolute' ? formatNumber(maxY / 2) : formatStrategyShare(maxY / 2);
      const bottomLabel = graph.mode === 'absolute' ? '0' : '0%';
      const defaultRow = defaultHover.allocation[graph.key];
      const labelText = graph.mode === 'absolute'
        ? `${graph.label} Δ ${formatSigned(defaultRow.delta)}`
        : `${graph.label} Δ ${formatSignedPercentagePoints(defaultRow.shareDelta)}`;
      const readoutX = padding.left + plotWidth - 8;

      const laneClass = `allocation-lane allocation-lane-${graph.key}`;
      const laneBackground = graph.mode === 'absolute'
        ? `<rect class="allocation-lane-bg" x="${padding.left}" y="${(laneTop - 8).toFixed(2)}" width="${plotWidth.toFixed(2)}" height="${(strategyLaneHeight + 16).toFixed(2)}" rx="6" />`
        : '';
      const laneDivider = graph.mode === 'absolute'
        ? `<line class="allocation-lane-divider" x1="0" y1="${(laneTop - 14).toFixed(2)}" x2="${width}" y2="${(laneTop - 14).toFixed(2)}" />`
        : '';
      return `
        <g class="${laneClass}">
          ${laneDivider}
          ${laneBackground}
          <text x="12" y="${(laneTop + 19).toFixed(2)}" font-size="13" font-weight="800" fill="#253226">${escapeHtml(graph.label)}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneTop + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${topLabel}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneTop + strategyLaneHeight / 2 + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${midLabel}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneBottom + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${bottomLabel}</text>
          <line x1="${padding.left}" y1="${laneTop.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${laneTop.toFixed(2)}" stroke="#D9DDD8" stroke-width="1" />
          <line x1="${padding.left}" y1="${(laneTop + strategyLaneHeight / 2).toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${(laneTop + strategyLaneHeight / 2).toFixed(2)}" stroke="#D9DDD8" stroke-width="1" />
          <line x1="${padding.left}" y1="${laneBottom.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${laneBottom.toFixed(2)}" stroke="#5B6257" stroke-width="1.1" />
          <path d="${youPath}" fill="none" stroke="#378ADD" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
          <path d="${opponentPath}" fill="none" stroke="#D85A30" stroke-width="2.4" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" />
          <text data-hover-label-strategy-${graph.key} data-fixed-label="true" class="hover-value-label delta-label" x="${readoutX.toFixed(2)}" y="${(laneTop + 18).toFixed(2)}" text-anchor="end">${escapeHtml(labelText)}</text>
        </g>
      `;
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
  });
  const significantEventLayer = buildSignificantEventMarkerLayer({
    events: uniqueSignificantEvents(hoverSnapshots),
    duration,
    x,
    lineStartY: padding.top,
    lineEndY: height - padding.bottom,
  });

  return `
<svg id="allocation-comparison" class="strategy-chart allocation-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Allocation comparison chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F7FAF8" rx="10" />
  ${xTicks}
  ${ageMarkerLayer}
  ${lanes}
  <g class="hover-readouts" aria-hidden="true">
    <line data-hover-line-strategy class="hover-active-line" x1="${defaultHover.strategyX.toFixed(2)}" y1="${padding.top.toFixed(2)}" x2="${defaultHover.strategyX.toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" />
    <text data-hover-label-strategy-time class="hover-value-label" x="${hoverLabelX(defaultHover.strategyX).toFixed(2)}" y="38" text-anchor="${hoverLabelAnchor(defaultHover.strategyX)}">${escapeHtml(defaultHover.timeLabel)}</text>
  </g>
  ${hoverColumns}
  ${significantEventLayer}
</svg>`;
}

function buildGatherRateSvg(
  youSeries: GatherRatePoint[],
  opponentSeries: GatherRatePoint[],
  duration: number,
  ageMarkers: AgeMarker[],
  hoverSnapshots: HoverSnapshot[]
): string {
  const width = svgWidth;
  const height = gatherHeight;
  const padding = gatherPadding;
  const plotWidth = width - padding.left - padding.right;
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
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F7FAF8" rx="10" />
  <line x1="${padding.left}" y1="${(height - padding.bottom).toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="#5B6257" stroke-width="1.2" />
  <path d="${youPath}" fill="none" stroke="#378ADD" stroke-width="2.5" />
  <path d="${oppPath}" fill="none" stroke="#D85A30" stroke-width="2.5" stroke-dasharray="7 5" />
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
  if (series.length === 0) {
    return {
      timestamp,
      cumulativeLoss: 0,
      cumulativeResourcesGained: 0,
      cumulativeResourcesPossible: 0,
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
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
        <rect x="0" y="0" width="${width}" height="${height}" fill="#F7FAF8" rx="8" />
        ${ticks}
        <line x1="${padding.left.toFixed(2)}" y1="${(height - padding.bottom).toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="#7F867B" stroke-width="1" />
        ${yLabels}
        ${xLabels}
        <path d="${lossPath}" fill="none" stroke="#C56C52" stroke-width="1.9" />
        <path d="${gainedPath}" fill="none" stroke="#378ADD" stroke-width="1.9" />
        <path d="${possiblePath}" fill="none" stroke="#253226" stroke-width="2.4" />
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
        <span class="line-chip"><span class="line-swatch" style="border-color:#253226"></span>Resources possible</span>
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

function buildHoverInteractionScript(
  hoverSnapshots: ClientHoverSnapshot[],
  labels: RenderPlayerLabels,
  hoverDataUrl?: string
): string {
  const hoverDataUrlScript = hoverDataUrl
    ? `\n  <script id="post-match-hover-data-url" type="application/json">${escapeJsonForScript({ url: hoverDataUrl })}</script>`
    : '';

  return `
  <script id="post-match-hover-data" type="application/json">${escapeJsonForScript(hoverSnapshots)}</script>${hoverDataUrlScript}
  <script>
    (function () {
      var payloadEl = document.getElementById('post-match-hover-data');
      if (!payloadEl || !payloadEl.textContent) return;

      var hoverData = [];
      var byTimestamp = new Map();
      var pinned = false;
      var selectedBand = 'economic';
      var currentTimestamp = null;
      var scheduledTimestamp = null;
      var framePending = false;
      var playerLabels = ${escapeJsonForScript({
        you: labels.you.compactShortLabel,
        opponent: labels.opponent.compactShortLabel,
      })};
      var bandLabels = {
        economic: 'Economic',
        populationCap: 'Population cap',
        militaryCapacity: 'Military buildings',
        militaryActive: 'Mil active',
        defensive: 'Defensive',
        research: 'Research',
        advancement: 'Advancement',
        destroyed: 'Destroyed',
        float: 'Float',
        opportunityLost: 'Opportunity lost'
      };
      var allocationGraphDefs = {
        economic: { label: 'Economic', mode: 'share' },
        technology: { label: 'Technology', mode: 'share' },
        military: { label: 'Military', mode: 'share' },
        destroyed: { label: 'Destroyed', mode: 'absolute' },
        overall: { label: 'Overall', mode: 'absolute' },
        float: { label: 'Float', mode: 'absolute' },
        opportunityLost: { label: 'Opportunity lost', mode: 'absolute' }
      };

      function formatNumber(value) {
        return Math.round(Number(value) || 0).toLocaleString('en-US');
      }

      function formatSigned(value) {
        var rounded = Math.round(Number(value) || 0);
        return rounded > 0 ? '+' + rounded.toLocaleString('en-US') : rounded.toLocaleString('en-US');
      }

      function formatPrecise(value, decimals) {
        var digits = Number.isFinite(decimals) ? decimals : 2;
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'n/a';
        return numeric.toLocaleString('en-US', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function labelX(x) {
        return x > 810 ? x - 8 : x + 8;
      }

      function labelAnchor(x) {
        return x > 810 ? 'end' : 'start';
      }

      function replaceTimestampInUrl(timestamp) {
        try {
          var url = new URL(window.location.href);
          if (timestamp === null || timestamp === undefined || Number.isNaN(Number(timestamp))) {
            url.searchParams.delete('t');
          } else {
            url.searchParams.set('t', String(Math.max(0, Math.round(Number(timestamp)))));
          }
          var nextHref = url.pathname + (url.search || '') + (url.hash || '');
          window.history.replaceState({}, '', nextHref);
        } catch (_error) {
          // no-op on malformed browser URL parsing
        }
      }

      function requestedTimestampFromUrl() {
        try {
          var url = new URL(window.location.href);
          if (!url.searchParams.has('t')) return null;
          var value = Number(url.searchParams.get('t'));
          return Number.isFinite(value) ? value : null;
        } catch (_error) {
          return null;
        }
      }

      function nearestTimestamp(target) {
        if (!Number.isFinite(target) || hoverData.length === 0) return null;
        var closest = hoverData[0].timestamp;
        var minDistance = Math.abs(target - closest);
        for (var idx = 1; idx < hoverData.length; idx += 1) {
          var timestamp = Number(hoverData[idx].timestamp);
          var distance = Math.abs(target - timestamp);
          if (distance < minDistance) {
            closest = timestamp;
            minDistance = distance;
          }
        }
        return closest;
      }

      function setHoverData(nextHoverData) {
        hoverData = Array.isArray(nextHoverData) ? nextHoverData : [];
        byTimestamp = new Map(hoverData.map(function (point) { return [String(point.timestamp), point]; }));
        currentTimestamp = hoverData[0] ? hoverData[0].timestamp : null;
      }

      function pointIndexForTimestamp(timestamp) {
        for (var idx = 0; idx < hoverData.length; idx += 1) {
          if (String(hoverData[idx].timestamp) === String(timestamp)) return idx;
        }
        return 0;
      }

      function setText(selector, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.textContent = text;
        });
      }

      function setField(name, text) {
        setText('[data-hover-field="' + name + '"]', text);
      }

      function setTitle(selector, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.setAttribute('title', text);
        });
      }

      function mobileContext(point) {
        return point.markers && point.markers.length > 0
          ? point.markers.join(' · ')
          : 'Use the slider or step buttons to inspect a timestamp.';
      }

      function setMobileSummary(key, row) {
        var safeRow = row || { you: 0, opponent: 0, delta: 0 };
        setText('[data-mobile-summary-value="' + key + '"]', formatSigned(safeRow.delta));
        setText(
          '[data-mobile-summary-detail="' + key + '"]',
          playerLabels.you + ' ' + formatNumber(safeRow.you) + ' · ' + playerLabels.opponent + ' ' + formatNumber(safeRow.opponent)
        );
      }

      function syncMobileTimeline(point) {
        var currentIndex = pointIndexForTimestamp(point.timestamp);
        var maxIndex = Math.max(0, hoverData.length - 1);

        document.querySelectorAll('[data-mobile-timeline-slider]').forEach(function (slider) {
          slider.setAttribute('max', String(maxIndex));
          slider.value = String(currentIndex);
          slider.disabled = hoverData.length <= 1;
        });
        document.querySelectorAll('[data-mobile-timeline-step]').forEach(function (button) {
          var step = Number(button.getAttribute('data-mobile-timeline-step') || 0);
          button.disabled = hoverData.length <= 1 ||
            (step < 0 && currentIndex <= 0) ||
            (step > 0 && currentIndex >= maxIndex);
        });

        setText('[data-mobile-current-time]', point.timeLabel);
        setText('[data-mobile-current-context]', mobileContext(point));
        var allocation = point.allocation || {};
        setMobileSummary('overall', allocation.overall);
        setMobileSummary('technology', allocation.technology);
        setMobileSummary('military', allocation.military);
        setMobileSummary('destroyed', allocation.destroyed);
      }

      function setSvgLabel(selector, x, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          if (!el.hasAttribute('data-fixed-label')) {
            el.setAttribute('x', String(labelX(x)));
            el.setAttribute('text-anchor', labelAnchor(x));
          }
          el.textContent = text;
        });
      }

      function setVerticalLine(selector, x) {
        document.querySelectorAll(selector).forEach(function (line) {
          line.setAttribute('x1', String(x));
          line.setAttribute('x2', String(x));
        });
      }

      function renderBandBreakdown(point) {
        var bandData = point.bandBreakdown && point.bandBreakdown[selectedBand]
          ? point.bandBreakdown[selectedBand]
          : { you: [], opponent: [] };
        var bandLabel = bandLabels[selectedBand] || selectedBand;
        var selectedValues = selectedBand === 'destroyed' || selectedBand === 'float' || selectedBand === 'opportunityLost'
          ? ((point.allocation && point.allocation[selectedBand]) || { you: 0, opponent: 0, delta: 0 })
          : {
              you: point.you && Number.isFinite(Number(point.you[selectedBand])) ? Number(point.you[selectedBand]) : 0,
              opponent: point.opponent && Number.isFinite(Number(point.opponent[selectedBand])) ? Number(point.opponent[selectedBand]) : 0,
              delta: point.delta && Number.isFinite(Number(point.delta[selectedBand])) ? Number(point.delta[selectedBand]) : 0
            };

        var titleEl = document.querySelector('[data-band-breakdown-title]');
        if (titleEl) {
          titleEl.textContent = selectedBand === 'opportunityLost'
            ? 'Opportunity lost buckets'
            : bandLabel + ' composition';
        }
        setText('[data-band-summary-label]', bandLabel);
        setText('[data-band-summary-you]', formatNumber(selectedValues.you));
        setText('[data-band-summary-opponent]', formatNumber(selectedValues.opponent));
        setText('[data-band-summary-delta]', formatSigned(selectedValues.delta));

        function listHtml(entries, bandKey) {
          if (!entries || entries.length === 0) {
            return '<li class="band-breakdown-empty">No active items</li>';
          }

          function displayLabel(entry) {
            if (bandKey === 'research' || bandKey === 'advancement') {
              return entry.label;
            }
            var count = Number(entry.count || 0);
            if (!Number.isFinite(count) || count <= 0) {
              return entry.label;
            }
            return entry.label + ' (' + formatNumber(count) + ')';
          }

          if (bandKey === 'research') {
            var categoryDefs = [
              { key: 'military', label: 'Military research' },
              { key: 'economic', label: 'Economic research' },
              { key: 'other', label: 'Other research' }
            ];

            var grouped = categoryDefs.map(function (def) {
              var groupEntries = entries.filter(function (entry) {
                return (entry.category || 'other') === def.key;
              });
              if (groupEntries.length === 0) return '';
              var rows = groupEntries.map(function (entry) {
                var label = displayLabel(entry);
                var percent = Number(entry.percent || 0).toFixed(1);
                return '<li><span class="band-item-label band-item-label-truncated" title="' + escapeHtml(label) + '" tabindex="0">' + escapeHtml(label) + '</span><span class="band-item-metric">' + formatNumber(entry.value) + ' <small>(' + percent + '%)</small></span></li>';
              }).join('');
              return '<li class="band-breakdown-group">' + escapeHtml(def.label) + '</li>' + rows;
            }).join('');

            if (grouped.length > 0) return grouped;
          }

          return entries.map(function (entry) {
            var label = displayLabel(entry);
            var percent = Number(entry.percent || 0).toFixed(1);
            return '<li><span class="band-item-label band-item-label-truncated" title="' + escapeHtml(label) + '" tabindex="0">' + escapeHtml(label) + '</span><span class="band-item-metric">' + formatNumber(entry.value) + ' <small>(' + percent + '%)</small></span></li>';
          }).join('');
        }

        var youList = document.querySelector('[data-band-breakdown-list="you"]');
        var oppList = document.querySelector('[data-band-breakdown-list="opponent"]');
        if (youList) youList.innerHTML = listHtml(bandData.you, selectedBand);
        if (oppList) oppList.innerHTML = listHtml(bandData.opponent, selectedBand);
      }

      function syncBandSelection() {
        document.querySelectorAll('.band-toggle[data-band-key]').forEach(function (button) {
          var key = button.getAttribute('data-band-key');
          var isSelected = key === selectedBand;
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          var row = button.closest('tr.band-row');
          if (row) {
            if (isSelected) row.classList.add('is-selected');
            else row.classList.remove('is-selected');
          }
        });
      }

      function setCategoryCollapsed(key, collapsed) {
        document.querySelectorAll('[data-allocation-category-child="' + key + '"]').forEach(function (row) {
          row.hidden = collapsed;
        });
        document.querySelectorAll('[data-allocation-category-toggle="' + key + '"]').forEach(function (button) {
          button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
      }

      function formatStrategyShare(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) numeric = 0;
        return numeric.toFixed(1) + '%';
      }

      function formatSignedPercentagePoints(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) numeric = 0;
        var rounded = Math.round(numeric * 10) / 10;
        if (Object.is(rounded, -0)) rounded = 0;
        var sign = rounded > 0 ? '+' : '';
        return sign + rounded.toFixed(1) + 'pp';
      }

      function significantEventLossRowsHtml(items) {
        if (!Array.isArray(items) || items.length === 0) {
          return '<li class="event-impact-loss-row event-impact-loss-row-empty">No losses</li>';
        }
        return items.map(function (item) {
          return '<li class="event-impact-loss-row">' +
            '<span class="event-impact-loss-name">' + escapeHtml(item.label || 'Loss') + ' x' + formatNumber(item.count || 0) + '</span>' +
            '<span class="event-impact-loss-value">' + formatNumber(item.value || 0) + '</span>' +
            '</li>';
        }).join('');
      }

      function significantEventArmyRowsHtml(items) {
        if (!Array.isArray(items) || items.length === 0) {
          return '<li class="event-impact-loss-row event-impact-loss-row-empty">No active military</li>';
        }
        return significantEventLossRowsHtml(items);
      }

      function significantEventArmyValue(event, playerKey) {
        var armies = event && event.preEncounterArmies ? event.preEncounterArmies : null;
        var army = armies ? armies[playerKey] : null;
        return army && Number.isFinite(Number(army.totalValue)) ? Number(army.totalValue) : 0;
      }

      function updateSignificantEventUnderdog(event) {
        var context = event && event.favorableUnderdogFight ? event.favorableUnderdogFight : null;
        document.querySelectorAll('[data-significant-event-underdog-toggle]').forEach(function (el) {
          el.hidden = !context;
        });
        document.querySelectorAll('[data-significant-event-underdog-details]').forEach(function (el) {
          el.hidden = !context;
          if (!context) el.open = false;
        });
        document.querySelectorAll('[data-significant-event-underdog-details-text]').forEach(function (el) {
          el.textContent = context ? context.details || '' : '';
        });
      }

      function significantEventLossValue(event, playerKey, metric) {
        if (!event) return 0;
        var impact = event.playerImpacts ? event.playerImpacts[playerKey] : null;
        if (impact && Number.isFinite(Number(impact[metric]))) {
          return Number(impact[metric]);
        }
        if (metric === 'immediateLoss' || metric === 'grossLoss') {
          var losses = event.encounterLosses && Array.isArray(event.encounterLosses[playerKey])
            ? event.encounterLosses[playerKey]
            : [];
          return losses.reduce(function (sum, item) {
            return sum + Number(item.value || 0);
          }, 0);
        }
        return 0;
      }

      function setSignificantLossSummaryText(attr, playerKey, value) {
        document.querySelectorAll('[data-significant-event-loss-' + attr + '="' + playerKey + '"]').forEach(function (el) {
          el.textContent = value;
        });
      }

      function updateSignificantEventLossSummary(event, playerKey, playerLabel) {
        var totalLoss = significantEventLossValue(event, playerKey, 'grossLoss');
        var immediateLoss = significantEventLossValue(event, playerKey, 'immediateLoss');
        var villagerOpportunityLoss = significantEventLossValue(event, playerKey, 'villagerOpportunityLoss');
        var pctOfDeployed = significantEventLossValue(event, playerKey, 'pctOfDeployed');
        setSignificantLossSummaryText('total', playerKey, event ? formatNumber(totalLoss) : '');
        setSignificantLossSummaryText('immediate', playerKey, event ? formatNumber(immediateLoss) : '');
        setSignificantLossSummaryText('villager-opportunity', playerKey, event ? formatNumber(villagerOpportunityLoss) : '');
        setSignificantLossSummaryText('share', playerKey, event ? formatPrecise(pctOfDeployed, 1) + '%' : '');
        document.querySelectorAll('[data-significant-event-loss-share-label="' + playerKey + '"]').forEach(function (el) {
          el.textContent = 'Share of ' + playerLabel + ' deployed';
        });
        document.querySelectorAll('[data-significant-event-loss-villager-opportunity-row="' + playerKey + '"]').forEach(function (el) {
          el.hidden = !event || villagerOpportunityLoss <= 0;
        });
      }

      function updateSignificantEventLosses(event) {
        var player1Label = event && (event.player1Label || event.player1Civilization) ? (event.player1Label || event.player1Civilization) : 'Player 1';
        var player2Label = event && (event.player2Label || event.player2Civilization) ? (event.player2Label || event.player2Civilization) : 'Player 2';
        document.querySelectorAll('[data-significant-event-loss-heading="player1"]').forEach(function (el) {
          el.textContent = player1Label + ' losses';
        });
        document.querySelectorAll('[data-significant-event-loss-heading="player2"]').forEach(function (el) {
          el.textContent = player2Label + ' losses';
        });
        document.querySelectorAll('[data-significant-event-loss-list="player1"]').forEach(function (el) {
          el.innerHTML = significantEventLossRowsHtml(event && event.encounterLosses ? event.encounterLosses.player1 : []);
        });
        document.querySelectorAll('[data-significant-event-loss-list="player2"]').forEach(function (el) {
          el.innerHTML = significantEventLossRowsHtml(event && event.encounterLosses ? event.encounterLosses.player2 : []);
        });
        updateSignificantEventLossSummary(event, 'player1', player1Label);
        updateSignificantEventLossSummary(event, 'player2', player2Label);
      }

      function updateSignificantEventArmies(event) {
        var showArmies = !!(event && event.kind === 'fight' && event.preEncounterArmies);
        var player1Label = event && (event.player1Label || event.player1Civilization) ? (event.player1Label || event.player1Civilization) : 'Player 1';
        var player2Label = event && (event.player2Label || event.player2Civilization) ? (event.player2Label || event.player2Civilization) : 'Player 2';
        document.querySelectorAll('[data-significant-event-armies]').forEach(function (el) {
          el.hidden = !showArmies;
        });
        document.querySelectorAll('[data-significant-event-army-heading="player1"]').forEach(function (el) {
          el.textContent = player1Label + ' army before fight';
        });
        document.querySelectorAll('[data-significant-event-army-heading="player2"]').forEach(function (el) {
          el.textContent = player2Label + ' army before fight';
        });
        document.querySelectorAll('[data-significant-event-army-total="player1"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player1')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-total="player2"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player2')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-list="player1"]').forEach(function (el) {
          el.innerHTML = significantEventArmyRowsHtml(event && event.preEncounterArmies ? event.preEncounterArmies.player1.units : []);
        });
        document.querySelectorAll('[data-significant-event-army-list="player2"]').forEach(function (el) {
          el.innerHTML = significantEventArmyRowsHtml(event && event.preEncounterArmies ? event.preEncounterArmies.player2.units : []);
        });
      }

      function updateSignificantEvent(point) {
        var event = point.significantEvent || null;
        document.querySelectorAll('[data-significant-event]').forEach(function (el) {
          el.hidden = !event;
        });
        if (!event) {
          setField('significantEvent.label', '');
          updateSignificantEventUnderdog(null);
          updateSignificantEventArmies(null);
          updateSignificantEventLosses(null);
          return;
        }

        setField('significantEvent.label', event.headline || ((event.victimLabel ? event.victimLabel + ' ' : '') + (event.label || 'Event')));
        updateSignificantEventUnderdog(event);
        updateSignificantEventArmies(event);
        updateSignificantEventLosses(event);
      }

      function updateInspector(timestamp) {
        var point = byTimestamp.get(String(timestamp));
        if (!point) return;
        currentTimestamp = point.timestamp;

        setField('timeLabel', point.timeLabel);
        var contextEl = document.querySelector('[data-hover-context]');
        if (contextEl) {
          contextEl.textContent = mobileContext(point);
        }
        updateSignificantEvent(point);

        ['economic', 'populationCap', 'militaryCapacity', 'militaryActive', 'defensive', 'research', 'advancement', 'total'].forEach(function (key) {
          setField('you.' + key, formatNumber(point.you[key]));
          setField('opponent.' + key, formatNumber(point.opponent[key]));
          setField('delta.' + key, formatSigned(point.delta[key]));
        });
        ['economic', 'technology', 'military', 'other', 'destroyed', 'overall', 'float', 'opportunityLost'].forEach(function (key) {
          var allocationRow = point.allocation && point.allocation[key]
            ? point.allocation[key]
            : { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 };
          setField('allocation.' + key + '.you', formatNumber(allocationRow.you));
          setField('allocation.' + key + '.opponent', formatNumber(allocationRow.opponent));
          setField('allocation.' + key + '.delta', formatSigned(allocationRow.delta));
        });
        setTitle(
          '[data-total-pool-tooltip]',
          point.totalPoolTooltip || 'Economic + Technology + Military + Other - Destroyed = Total pool'
        );
        setField('gather.you', formatNumber(point.gather.you));
        setField('gather.opponent', formatNumber(point.gather.opponent));
        setField('gather.delta', formatSigned(point.gather.delta));
        ['economy', 'military', 'technology'].forEach(function (key) {
          var strategyRow = point.strategy && point.strategy[key]
            ? point.strategy[key]
            : { you: 0, opponent: 0, delta: 0 };
          setField('strategy.' + key + '.you', formatStrategyShare(strategyRow.you));
          setField('strategy.' + key + '.opponent', formatStrategyShare(strategyRow.opponent));
          setField('strategy.' + key + '.delta', formatSignedPercentagePoints(strategyRow.delta));
        });
        Object.keys(allocationGraphDefs).forEach(function (key) {
          var def = allocationGraphDefs[key];
          var allocationRow = point.allocation && point.allocation[key]
            ? point.allocation[key]
            : { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 };
          var labelText = def.mode === 'absolute'
            ? def.label + ' Δ ' + formatSigned(allocationRow.delta)
            : def.label + ' Δ ' + formatSignedPercentagePoints(allocationRow.shareDelta);
          setSvgLabel('[data-hover-label-strategy-' + key + ']', point.strategyX, labelText);
        });

        setVerticalLine('[data-hover-line-strategy]', point.strategyX);
        setSvgLabel('[data-hover-label-strategy-time]', point.strategyX, point.timeLabel);
        renderBandBreakdown(point);
        syncMobileTimeline(point);
      }

      function selectPointByIndex(index, shouldUpdateUrl) {
        if (hoverData.length === 0) return;
        var safeIndex = Math.max(0, Math.min(hoverData.length - 1, Number(index) || 0));
        var point = hoverData[safeIndex];
        if (!point) return;
        pinned = true;
        document.body.setAttribute('data-hover-pinned', 'true');
        updateInspector(point.timestamp);
        if (shouldUpdateUrl) replaceTimestampInUrl(point.timestamp);
      }

      function selectTimestamp(timestamp, shouldUpdateUrl) {
        var nearest = nearestTimestamp(Number(timestamp));
        if (nearest === null) return;
        selectPointByIndex(pointIndexForTimestamp(nearest), shouldUpdateUrl);
      }

      function scheduleInspector(timestamp) {
        scheduledTimestamp = timestamp;
        if (framePending) return;
        framePending = true;
        var run = function () {
          framePending = false;
          if (!pinned && scheduledTimestamp !== null) updateInspector(scheduledTimestamp);
        };
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(run);
        } else {
          window.setTimeout(run, 16);
        }
      }

      document.querySelectorAll('.band-toggle[data-band-key]').forEach(function (button) {
        button.addEventListener('click', function () {
          var key = button.getAttribute('data-band-key');
          if (!key) return;
          selectedBand = key;
          syncBandSelection();
          if (currentTimestamp !== null) {
            updateInspector(currentTimestamp);
          }
        });
      });

      document.querySelectorAll('[data-allocation-category-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          var key = button.getAttribute('data-allocation-category-toggle');
          if (!key) return;
          var collapsed = button.getAttribute('aria-expanded') !== 'false';
          setCategoryCollapsed(key, collapsed);
        });
      });

      document.querySelectorAll('.inspector-table-wrap').forEach(function (wrap) {
        wrap.addEventListener('keydown', function (event) {
          if (event.key === 'ArrowRight') {
            wrap.scrollLeft += 40;
            event.preventDefault();
            return;
          }
          if (event.key === 'ArrowLeft') {
            wrap.scrollLeft -= 40;
            event.preventDefault();
          }
        });
      });

      document.querySelectorAll('[data-mobile-timeline-slider]').forEach(function (slider) {
        slider.addEventListener('input', function () {
          selectPointByIndex(Number(slider.value), true);
        });
      });

      document.querySelectorAll('[data-mobile-timeline-step]').forEach(function (button) {
        button.addEventListener('click', function () {
          var step = Number(button.getAttribute('data-mobile-timeline-step') || 0);
          selectPointByIndex(pointIndexForTimestamp(currentTimestamp) + step, true);
        });
      });

      document.querySelectorAll('[data-mobile-details] > summary').forEach(function (summary) {
        summary.addEventListener('click', function () {
          var details = summary.parentElement;
          if (details) details.setAttribute('data-mobile-user-toggled', 'true');
        });
      });

      document.querySelectorAll('[data-significant-event-underdog-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('[data-significant-event-underdog-details]').forEach(function (details) {
            if (details.hidden) return;
            details.open = true;
            if (details.scrollIntoView) details.scrollIntoView({ block: 'nearest' });
          });
        });
      });

      function syncMobileDetailsForViewport() {
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 520px)').matches;
        document.querySelectorAll('[data-mobile-details]').forEach(function (details) {
          if (isMobile) {
            if (!details.hasAttribute('data-mobile-user-toggled')) details.removeAttribute('open');
            return;
          }
          details.setAttribute('open', '');
        });
      }

      if (window.addEventListener) {
        window.addEventListener('resize', syncMobileDetailsForViewport);
      }

      document.querySelectorAll('.hover-target[data-hover-timestamp]').forEach(function (target) {
        target.addEventListener('pointerenter', function () {
          if (!pinned) scheduleInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('pointermove', function () {
          if (!pinned) scheduleInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('click', function () {
          var selectedTimestamp = Number(target.getAttribute('data-hover-timestamp'));
          selectTimestamp(selectedTimestamp, true);
        });
        target.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          var selectedTimestamp = Number(target.getAttribute('data-hover-timestamp'));
          selectTimestamp(selectedTimestamp, true);
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        pinned = false;
        document.body.removeAttribute('data-hover-pinned');
        replaceTimestampInUrl(null);
        if (hoverData[0]) updateInspector(hoverData[0].timestamp);
      });

      function initializeSelection() {
        syncBandSelection();
        var requestedTimestamp = requestedTimestampFromUrl();
        if (requestedTimestamp !== null) {
          var nearest = nearestTimestamp(requestedTimestamp);
          if (nearest !== null) {
            pinned = true;
            document.body.setAttribute('data-hover-pinned', 'true');
            replaceTimestampInUrl(nearest);
            updateInspector(nearest);
            syncMobileDetailsForViewport();
            return;
          }
        }
        if (hoverData[0]) updateInspector(hoverData[0].timestamp);
        syncMobileDetailsForViewport();
      }

      setHoverData(JSON.parse(payloadEl.textContent));
      var payloadSourceEl = document.getElementById('post-match-hover-data-url');
      var payloadSourceUrl = null;
      if (payloadSourceEl && payloadSourceEl.textContent) {
        try {
          payloadSourceUrl = JSON.parse(payloadSourceEl.textContent).url || null;
        } catch (_error) {
          payloadSourceUrl = null;
        }
      }

      if (payloadSourceUrl && window.fetch) {
        fetch(payloadSourceUrl, {
          credentials: 'same-origin',
          headers: { accept: 'application/json' }
        })
          .then(function (response) {
            if (!response.ok) throw new Error('Failed to load hover data');
            return response.json();
          })
          .then(function (payload) {
            setHoverData(Array.isArray(payload) ? payload : payload.hoverSnapshots);
            initializeSelection();
          })
          .catch(function () {
            initializeSelection();
          });
        return;
      }
      initializeSelection();
    }());
  </script>`;
}

export function renderPostMatchHtml(
  model: PostMatchViewModel,
  options: RenderPostMatchHtmlOptions = {}
): string {
  const playerLabels = renderPlayerLabels(model.header);
  const hoverSnapshots = buildHoverSnapshots(model, playerLabels);
  const defaultHoverSnapshot = hoverSnapshots[0];
  const clientHoverSnapshots = buildClientHoverSnapshots(hoverSnapshots);
  const inlineHoverSnapshots = options.hoverDataUrl
    ? clientHoverSnapshots.slice(0, 1)
    : clientHoverSnapshots;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Post-Match Analysis</title>
  <style>
    :root {
      --color-background: #f2f4ee;
      --color-background-secondary: #eef2e7;
      --color-card: #fbfcf9;
      --color-text: #1f2a1f;
      --color-muted: #5b6257;
      --color-border: #d6ddd1;
      --you: #378ADD;
      --opponent: #D85A30;
      --report-max-width: 1440px;
      --inspector-min-width: 380px;
      --inspector-max-width: 460px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--color-text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
      background: radial-gradient(circle at 8% -12%, #d8e6d6, transparent 34%),
        radial-gradient(circle at 92% -8%, #f0ddd0, transparent 32%),
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
      border-radius: 10px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(32, 43, 32, 0.08);
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
      background: #fff;
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
      color: #253226;
      text-align: right;
    }

    .banner {
      background: #fff7dc;
      border: 1px solid #f1d57d;
      color: #6d4a00;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }

    .metric-card {
      min-width: 0;
      border: 1px solid var(--color-border);
      background: #fff;
      border-radius: 8px;
      padding: 12px;
    }

    .metric-card-final {
      grid-column: -2 / -1;
    }

    .metric-title {
      font-size: 13px;
      color: var(--color-muted);
      margin-bottom: 8px;
      overflow-wrap: anywhere;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
    }

    .metric-range {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }

    .metric-analysis {
      margin-top: 8px;
      color: #253226;
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .metric-analysis-lines {
      margin-top: 8px;
      display: grid;
      gap: 5px;
    }

    .metric-analysis-lines .metric-analysis {
      margin-top: 0;
    }

    .metric-analysis-gap {
      font-weight: 700;
    }

    .metric-sub {
      margin-top: 6px;
      font-size: 12px;
      color: var(--color-muted);
      overflow-wrap: anywhere;
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

    .allocation-read-guide {
      margin: 8px 0 10px;
      border: 1px solid #dde6da;
      border-radius: 8px;
      background: #fff;
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
      color: #253226;
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
      border-bottom: 1px solid #edf1ea;
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
      color: #253226;
      font-weight: 800;
    }

    .allocation-read-guide-item {
      min-width: 0;
    }

    .allocation-read-guide-item strong {
      display: block;
      color: #253226;
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
      background: #fff;
      padding: 4px 9px;
      font-size: 12px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      display: inline-block;
    }

    .destroyed-dot {
      background: #a85e42;
    }

    .opportunity-lost-dot {
      background: #C56C52;
    }

    .float-dot {
      background: #9C7A35;
    }

    .chart-head {
      font-size: 12px;
      margin: 10px 0 5px;
      color: #253226;
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
      background: #fff;
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
      background: #fff;
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
      stroke: #fff;
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

    .mobile-timeline-control {
      display: none;
      gap: 10px;
      margin-top: 10px;
      border: 1px solid #dfe6dc;
      border-radius: 8px;
      background: #fff;
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
      color: #253226;
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
      border-radius: 8px;
      background: #f8faf6;
      color: #253226;
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
      border-radius: 8px;
      background: #fff;
      max-height: calc(100vh - 24px);
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(32, 43, 32, 0.08);
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
      color: #253226;
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
      border-radius: 8px;
      background: #fff8f5;
    }

    .event-impact-heading {
      margin-bottom: 5px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #7b3f32;
    }

    .event-impact-title {
      display: flex;
      gap: 6px;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      color: #253226;
    }

    .event-impact-help-button {
      flex: none;
      width: 18px;
      height: 18px;
      border: 1px solid #d8bdae;
      border-radius: 999px;
      background: #fff;
      color: #7b3f32;
      font: inherit;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
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

    .event-impact-loss-detail {
      margin: 8px 0;
      padding: 7px;
      border: 1px solid #eadbd4;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.62);
    }

    .event-impact-loss-detail-title {
      margin-bottom: 5px;
      color: #7b3f32;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .event-impact-loss-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .event-impact-loss-column {
      min-width: 0;
    }

    .event-impact-loss-column-heading {
      margin-bottom: 3px;
      color: #465447;
      font-size: 11px;
      font-weight: 800;
    }

    .event-impact-loss-summary {
      display: grid;
      gap: 3px;
      margin: 0 0 6px;
      padding: 0 0 6px;
      border-bottom: 1px solid #f0e2dc;
      font-variant-numeric: tabular-nums;
    }

    .event-impact-loss-summary div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 7px;
      align-items: baseline;
    }

    .event-impact-loss-summary dt {
      min-width: 0;
      color: var(--color-muted);
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }

    .event-impact-loss-summary dd {
      margin: 0;
      color: #253226;
      font-size: 12px;
      font-weight: 800;
    }

    .event-impact-loss-list {
      display: grid;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .event-impact-loss-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: baseline;
      color: #253226;
      font-size: 12px;
    }

    .event-impact-loss-name {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .event-impact-loss-value {
      color: #7b3f32;
      font-variant-numeric: tabular-nums;
      font-weight: 800;
    }

    .event-impact-loss-row-empty {
      display: block;
      color: var(--color-muted);
    }

    @media (max-width: 760px) {
      .event-impact-loss-columns {
        grid-template-columns: 1fr;
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
      border-radius: 8px;
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
      color: #253226;
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
      color: #253226;
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
      border-top: 1px solid #edf1ea;
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

    .band-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin: -2px 0;
      padding: 2px 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }

    .band-row.is-selected th,
    .band-row.is-selected td {
      background: #f1f6fb;
    }

    .band-row.is-selected th {
      box-shadow: inset 3px 0 0 var(--you);
      color: #1f3551;
    }

    .allocation-category-row th,
    .allocation-category-row td {
      background: #f5f8f2;
      color: #253226;
      font-weight: 800;
    }

    .allocation-category-toggle {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      margin: -2px 0;
      padding: 2px 0;
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
      display: inline-block;
      margin: 0;
      padding: 0 0 0 18px;
      border: 0;
      background: transparent;
      color: #1f3551;
      font: inherit;
      font-size: 11px;
      text-align: left;
      text-decoration: underline;
      cursor: pointer;
    }

    .inspector-table th:first-child .legend-dot {
      margin-right: 6px;
      vertical-align: -1px;
    }

    .inspector-total-row th,
    .inspector-total-row td {
      color: #253226;
      font-weight: 800;
      border-top-color: #d6ddd1;
    }

    .inspector-destroyed-row th,
    .inspector-destroyed-row td {
      color: #5e2f22;
      font-weight: 800;
      border-top-color: #d6ddd1;
    }

    .inspector-float-row th,
    .inspector-float-row td {
      color: #5c4720;
      font-weight: 800;
      border-top-color: #d6ddd1;
    }

    .inspector-opportunity-lost-row th,
    .inspector-opportunity-lost-row td {
      color: #7b3f32;
      font-weight: 800;
      border-top-color: #d6ddd1;
    }

    .band-breakdown {
      margin-top: 12px;
      border-top: 1px solid #dfe6dc;
      padding-top: 10px;
    }

    .band-breakdown-head {
      font-size: 13px;
      font-weight: 700;
      color: #253226;
      margin-bottom: 6px;
    }

    .band-breakdown-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) repeat(3, auto);
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

    .band-breakdown-summary strong {
      color: #253226;
      font-variant-numeric: tabular-nums;
    }

    .band-summary-label {
      min-width: 0;
      color: #253226;
      font-weight: 800;
      overflow-wrap: anywhere;
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
      border-bottom: 1px dashed #edf1ea;
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
      color: #253226;
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
      background: #fff;
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

    .significant-event-dot {
      stroke: #fff;
      stroke-width: 2;
      filter: drop-shadow(0 1px 2px rgba(32, 43, 32, 0.24));
    }

    .significant-event-glyph {
      fill: #fff;
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
      stroke: #F7FAF8;
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
      fill: #1f3551;
    }

    .you-label { fill: var(--you); }
    .opponent-label { fill: var(--opponent); }
    .delta-label { fill: #253226; }

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
      border-radius: 8px;
      background: #fff;
      padding: 10px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .strategy-readout-card h3 {
      margin: 0 0 8px;
      font-size: 13px;
      color: #253226;
    }

    .strategy-readout-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid #edf1ea;
      padding-top: 4px;
      margin-top: 4px;
      color: var(--color-muted);
    }

    .strategy-readout-row strong {
      color: #253226;
    }

    .strategy-state-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .strategy-state-card {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #fff;
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
      color: #253226;
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

    .line-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: #fff;
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

    @media (max-width: 1160px) {
      .trajectory-grid { grid-template-columns: 1fr; }
      .hover-inspector { position: static; max-height: none; }
    }

    @media (max-width: 980px) {
      body { padding: 16px; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .metric-card-final { grid-column: -2 / -1; }
      .header-row { grid-template-columns: 1fr; }
      .outcome { text-align: left; }
      .band-breakdown-cols { grid-template-columns: 1fr; }
      .allocation-read-guide-grid { grid-template-columns: 1fr; }
      .strategy-readout-grid { grid-template-columns: 1fr; }
      .strategy-state-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
        border-top: 1px solid #edf1ea;
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
        color: #253226;
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
        border-top-color: #d6ddd1;
      }
    }

    @media (max-width: 520px) {
      body { padding: 12px; }
      .wrap { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }
      .panel { padding: 12px; }
      .chips { flex-direction: column; align-items: stretch; }
      .civ-chip { width: 100%; }
      .metrics { grid-template-columns: 1fr; }
      .metric-card-final { grid-column: auto; }
      .section-title { font-size: 19px; }
      .chart-stack { overflow-x: hidden; }
      .chart-stack .leader-strip,
      .chart-stack .strategy-chart { min-width: 0; }
      .mobile-timeline-control { display: grid; }
      .hover-target { pointer-events: none; }
      .significant-event-marker.hover-target { pointer-events: all; }
      .mobile-selected-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .mobile-detail-summary { display: flex; }
      .mobile-detail-content { margin-top: 8px; }
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
          </div>
          <div class="meta-line">${escapeHtml(model.header.mode)} · ${escapeHtml(model.header.durationLabel)} · ${escapeHtml(model.header.map)}</div>
          <div class="chips">
            <span class="civ-chip"><span class="swatch" style="background:${escapeHtml(playerLabels.you.color)}"></span>${escapeHtml(playerLabels.you.label)}</span>
            <span class="civ-chip"><span class="swatch" style="background:${escapeHtml(playerLabels.opponent.color)}"></span>${escapeHtml(playerLabels.opponent.label)}</span>
          </div>
        </div>
        <div class="outcome">${escapeHtml(model.header.outcome)}</div>
      </div>
      ${model.deferredBanner ? `<div class="banner" style="margin-top:12px">${escapeHtml(model.deferredBanner)}</div>` : ''}
    </section>

    <section class="panel">
      <h2 class="section-title">Allocation lead and mix over time</h2>
      <p class="section-note">Bands are remapped into Economic, Technology, Military, and Other. The first three charts show share of strategic allocation; Overall is absolute deployed resource value after subtracting Destroyed.</p>
      <details class="allocation-read-guide" aria-label="Allocation chart legend">
        <summary class="allocation-read-guide-summary">How to read this chart</summary>
        <div class="allocation-read-guide-grid">
          <div class="allocation-read-guide-item" aria-label="Leader strip: absolute deployed-value leader by 30-second block">
            <strong>Leader strip</strong>
            <span>Absolute deployed-value leader by 30-second block.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Economic, Technology, and Military: percentage share of strategic allocation">
            <strong>Category lanes</strong>
            <span>Economic, Technology, and Military show percentage share.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Destroyed: cumulative value removed from the tracked deployed pool">
            <strong>Destroyed lane</strong>
            <span>Destroyed is cumulative value removed from the tracked deployed pool.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Overall: absolute deployed resource value, including Other">
            <strong>Overall lane</strong>
            <span>Overall: absolute deployed resource value after subtracting Destroyed.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Float (not deployed): live stockpile resources not currently committed">
            <strong>Float lane</strong>
            <span>Float (not deployed) is live stockpile resources not currently committed.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Opportunity lost: total villager opportunity cost">
            <strong>Opportunity lost lane</strong>
            <span>Total villager opportunity cost.</span>
          </div>
        </div>
      </details>
      <div class="age-legend">
        <strong>Age timings</strong>
        <span class="age-key"><span class="age-line" style="border-color:${escapeHtml(playerLabels.you.color)}"></span>${escapeHtml(playerLabels.you.ageLabel)} age-up</span>
        <span class="age-key"><span class="age-line dashed" style="border-color:${escapeHtml(playerLabels.opponent.color)}"></span>${escapeHtml(playerLabels.opponent.ageLabel)} age-up</span>
      </div>
      <div class="trajectory-grid">
        <div class="chart-stack">
          ${buildAllocationLeaderStripSvg(hoverSnapshots, model.trajectory.durationSeconds, playerLabels)}
          ${buildStrategyAllocationSvg(
            hoverSnapshots,
            model.trajectory.durationSeconds,
            model.trajectory.ageMarkers,
            playerLabels
          )}
          ${buildMobileTimelineControlHtml(hoverSnapshots, defaultHoverSnapshot)}
        </div>
        ${buildHoverInspectorHtml(defaultHoverSnapshot, playerLabels)}
      </div>
    </section>

    <section class="panel metrics">
      ${buildAgeMetricCardsHtml(model)}
      <article class="metric-card metric-card-final">
        <div class="metric-title">Final pool delta</div>
        <div class="metric-value">${formatSigned(model.metricCards.finalPoolDelta)}</div>
        <div class="metric-sub">at surrender/end</div>
      </article>
    </section>

  </main>
  ${buildHoverInteractionScript(inlineHoverSnapshots, playerLabels, options.hoverDataUrl)}
  <script id="web-vitals-monitor">${buildWebVitalsScript('/api/web-vitals')}</script>
</body>
</html>`;
}
