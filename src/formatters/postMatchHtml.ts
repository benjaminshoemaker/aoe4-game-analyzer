import { AgeMarker, PostMatchViewModel, SignificantTimelineEvent } from '../analysis/postMatchViewModel';
import { GatherRatePoint, PoolSeriesPoint } from '../analysis/resourcePool';
import { evaluateUnitPairCounterComputation } from '../data/combatValueEngine';
import type { PairCounterComputation } from '../data/counterMatrix';
import type { UnitWithValue } from '../types';

interface BandDef {
  key: keyof Pick<
    PoolSeriesPoint,
    'economic' | 'populationCap' | 'militaryCapacity' | 'militaryActive' | 'defensive' | 'research' | 'advancement'
  >;
  label: string;
  color: string;
}

type HoverBandKey = BandDef['key'];
type BreakdownKey = HoverBandKey | 'destroyed';

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
type AllocationGraphKey = 'economic' | 'technology' | 'military' | 'destroyed' | 'overall' | 'float';
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
const leaderStripHeight = 26 + allocationLeaderGraphDefs.length * 18 + (allocationLeaderGraphDefs.length - 1) * 8;
const gatherPadding = { top: 16, right: 12, bottom: 24, left: 56 };
const gatherHeight = 150;
const villagerChartWidth = 470;
const villagerPadding = { top: 14, right: 10, bottom: 24, left: 42 };
const villagerHeight = 180;
const MATRIX_STRONG_THRESHOLD = 1.2;
const MATRIX_WEAK_THRESHOLD = 0.85;
const significantVillagerOpportunityTooltip =
  'Scale-adjusted future missed gathering from killed villagers in this event window. The model removes those deaths, measures the future villager death-loss avoided, then discounts each future increment by event-time deployed resources divided by deployed resources at that later time.';

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
  bandBreakdown: Record<HoverBandKey, BandBreakdownPayload> & Partial<Record<'destroyed', BandBreakdownPayload>>;
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
  return {
    economic,
    technology,
    military,
    other,
    destroyed,
    overall: Math.max(0, economic + technology + military + other - destroyed),
    float,
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

function totalPoolTooltipText(allocation: AllocationComparison): string {
  return [
    'Economic + Technology + Military + Other - Destroyed = Total pool',
    `You: ${formatNumber(allocation.economic.you)} + ${formatNumber(allocation.technology.you)} + ${formatNumber(allocation.military.you)} + ${formatNumber(allocation.other.you)} - ${formatNumber(allocation.destroyed.you)} = ${formatNumber(allocation.overall.you)}`,
    `Opp: ${formatNumber(allocation.economic.opponent)} + ${formatNumber(allocation.technology.opponent)} + ${formatNumber(allocation.military.opponent)} + ${formatNumber(allocation.other.opponent)} - ${formatNumber(allocation.destroyed.opponent)} = ${formatNumber(allocation.overall.opponent)}`,
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

function buildHoverSnapshots(model: PostMatchViewModel): HoverSnapshot[] {
  const duration = model.trajectory.durationSeconds;
  const villagerDuration = Math.max(
    1,
    model.villagerOpportunity.resourceSeries.you[model.villagerOpportunity.resourceSeries.you.length - 1]?.timestamp ?? 0,
    model.villagerOpportunity.resourceSeries.opponent[model.villagerOpportunity.resourceSeries.opponent.length - 1]?.timestamp ?? 0,
    duration
  );
  return model.trajectory.hoverSnapshots.map((snapshot) => {
    const matrix = buildAdjustedMatrixPayload(
      snapshot.adjustedMilitary.youUnitBreakdown,
      snapshot.adjustedMilitary.opponentUnitBreakdown,
      model.header.youCivilization,
      model.header.opponentCivilization
    );
    const accounting = snapshot.accounting ?? fallbackAccountingSnapshot(snapshot.you, snapshot.opponent);
    const allocation = buildAllocationComparison(accounting.you, accounting.opponent);

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
      totalPoolTooltip: totalPoolTooltipText(allocation),
      strategy: buildStrategySnapshot(accounting.you, accounting.opponent),
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

function significantEventTopLossesText(event: SignificantTimelineEvent | null): string {
  if (!event || event.topLosses.length === 0) return 'No itemized losses';
  return event.topLosses
    .map(item => `${item.label} x${formatNumber(item.count)} (${formatNumber(item.value)})`)
    .join(' · ');
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
  const player1Label = event?.player1Civilization ?? 'Player 1';
  const player2Label = event?.player2Civilization ?? 'Player 2';
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
        <div class="event-impact-title" data-hover-field="significantEvent.label">${escapeHtml(significantEventTitle(event))}</div>
        ${significantEventLossesHtml(event)}
        <p class="event-impact-description" data-hover-field="significantEvent.description">${escapeHtml(event?.description ?? '')}</p>
        <dl class="event-impact-metrics">
          <div><dt>Gross impact</dt><dd data-hover-field="significantEvent.grossLoss">${event ? formatNumber(event.grossImpact ?? event.grossLoss) : ''}</dd></div>
        </dl>
        <div class="event-impact-losses" data-hover-field="significantEvent.topLosses">${escapeHtml(significantEventTopLossesText(event))}</div>
      </section>`;
}

function buildHoverInspectorHtml(snapshot: HoverSnapshot): string {
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

  const renderBandRow = (band: BandDef, categoryKey: AllocationCategoryKey, collapsed: boolean): string => {
      const isSelected = band.key === 'economic';
      const selectedClass = isSelected ? ' is-selected' : '';
      const subRow = band.key === 'militaryActive'
        ? `
          <tr class="band-sub-row inspector-adjusted-row" data-allocation-category-child="${categoryKey}"${collapsed ? ' hidden' : ''}>
            <th><button type="button" class="band-sub-link" data-open-adjusted-explainer>Adjusted mil active</button></th>
            <td data-cell-label="You" data-hover-field="adjustedMilitary.you"><span class="inspector-adjusted-value-main">${formatNumber(snapshot.adjustedMilitary.you)}</span><small class="inspector-adjusted-value-pct">(${formatSignedPercent(snapshot.adjustedMilitary.youPct)})</small></td>
            <td data-cell-label="Opp" data-hover-field="adjustedMilitary.opponent"><span class="inspector-adjusted-value-main">${formatNumber(snapshot.adjustedMilitary.opponent)}</span><small class="inspector-adjusted-value-pct">(${formatSignedPercent(snapshot.adjustedMilitary.opponentPct)})</small></td>
            <td data-cell-label="Delta" data-hover-field="adjustedMilitary.delta">${formatSigned(snapshot.adjustedMilitary.delta)}</td>
          </tr>
        `
        : '';

      return `
        <tr class="band-row${selectedClass}" data-allocation-category-child="${categoryKey}"${collapsed ? ' hidden' : ''}>
          <th>
            <button type="button" class="band-toggle" data-band-key="${band.key}" aria-pressed="${isSelected ? 'true' : 'false'}">
              <span class="legend-dot" style="background:${band.color}"></span>${escapeHtml(band.label)}
            </button>
          </th>
          <td data-cell-label="You" data-hover-field="you.${band.key}">${formatNumber(snapshot.you[band.key])}</td>
          <td data-cell-label="Opp" data-hover-field="opponent.${band.key}">${formatNumber(snapshot.opponent[band.key])}</td>
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
          <td data-cell-label="You" data-hover-field="allocation.destroyed.you">${formatNumber(row.you)}</td>
          <td data-cell-label="Opp" data-hover-field="allocation.destroyed.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.destroyed.delta">${formatSigned(row.delta)}</td>
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
          <td data-cell-label="You" data-hover-field="allocation.${category.key}.you">${formatNumber(row.you)}</td>
          <td data-cell-label="Opp" data-hover-field="allocation.${category.key}.opponent">${formatNumber(row.opponent)}</td>
          <td data-cell-label="Delta" data-hover-field="allocation.${category.key}.delta">${formatSigned(row.delta)}</td>
        </tr>
        ${children}
      `;
    })
    .join('');

  const defaultBand = snapshot.bandBreakdown.economic;

  return `
    <aside id="hover-inspector" class="hover-inspector" aria-live="polite">
      <div class="inspector-eyebrow">Hover inspector</div>
      <div class="inspector-time" data-hover-field="timeLabel">${escapeHtml(snapshot.timeLabel)}</div>
      <div class="inspector-context" data-hover-context>${snapshot.markers.length > 0 ? escapeHtml(snapshot.markers.join(' · ')) : 'Click to pin · Esc to clear'}</div>
      ${buildSignificantEventImpactHtml(snapshot.significantEvent)}
      <div class="inspector-table-wrap" tabindex="0" role="region" aria-label="Hover inspector values table">
        <table class="inspector-table">
          <thead>
            <tr>
              <th>Category / band</th>
              <th>You</th>
              <th>Opp</th>
              <th>Delta</th>
            </tr>
          </thead>
          <tbody>
            ${bandRows}
            ${renderDestroyedRow()}
            <tr class="inspector-total-row">
              <th><span data-total-pool-tooltip title="${escapeHtml(snapshot.totalPoolTooltip)}">Total Pool</span></th>
              <td data-cell-label="You" data-hover-field="allocation.overall.you">${formatNumber(allocation.overall.you)}</td>
              <td data-cell-label="Opp" data-hover-field="allocation.overall.opponent">${formatNumber(allocation.overall.opponent)}</td>
              <td data-cell-label="Delta" data-hover-field="allocation.overall.delta">${formatSigned(allocation.overall.delta)}</td>
            </tr>
            <tr class="inspector-float-row">
              <th>Float (not deployed)</th>
              <td data-cell-label="You" data-hover-field="allocation.float.you">${formatNumber(allocation.float.you)}</td>
              <td data-cell-label="Opp" data-hover-field="allocation.float.opponent">${formatNumber(allocation.float.opponent)}</td>
              <td data-cell-label="Delta" data-hover-field="allocation.float.delta">${formatSigned(allocation.float.delta)}</td>
            </tr>
            <tr>
              <th>Gather/min</th>
              <td data-cell-label="You" data-hover-field="gather.you">${formatNumber(snapshot.gather.you)}</td>
              <td data-cell-label="Opp" data-hover-field="gather.opponent">${formatNumber(snapshot.gather.opponent)}</td>
              <td data-cell-label="Delta" data-hover-field="gather.delta">${formatSigned(snapshot.gather.delta)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="band-breakdown">
        <div class="band-breakdown-head" data-band-breakdown-title>Economic composition</div>
        <div class="band-breakdown-cols">
          <section>
            <h4>You</h4>
            <ul class="band-breakdown-list" data-band-breakdown-list="you">${renderBreakdownList(defaultBand.you, 'economic')}</ul>
          </section>
          <section>
            <h4>Opponent</h4>
            <ul class="band-breakdown-list" data-band-breakdown-list="opponent">${renderBreakdownList(defaultBand.opponent, 'economic')}</ul>
          </section>
        </div>
      </div>
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
    <details class="panel secondary-panel" id="adjusted-military-explainer" data-secondary-section="adjusted-military">
      <summary class="secondary-summary">
        <span class="section-title">Adjusted military active method</span>
        <span class="secondary-summary-meta">Composition matchup math</span>
      </summary>
      <div class="secondary-body">
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
      </div>
    </details>`;
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
  duration: number
): string {
  const width = svgWidth;
  const padding = strategyPadding;
  const plotWidth = width - padding.left - padding.right;
  const maxX = Math.max(duration, 1);
  const rowHeight = 18;
  const rowGap = 8;
  const firstRowTop = 18;
  const x = (timestamp: number): number => padding.left + (timestamp / maxX) * plotWidth;
  const segments = buildAllocationLeaderSegments(hoverSnapshots, duration);

  const rows = allocationLeaderGraphDefs
    .map((category, idx) => {
      const rowTop = firstRowTop + idx * (rowHeight + rowGap);
      const segmentRects = segments
        .filter(segment => segment.categoryKey === category.key)
        .map(segment => {
          const startX = x(segment.start);
          const endX = x(segment.end);
          const widthPx = Math.max(1, endX - startX);
          const title = `${category.label} ${formatTime(segment.start)}-${formatTime(segment.end)}: You ${formatNumber(segment.you)}, Opp ${formatNumber(segment.opponent)}`;
          return `<rect class="allocation-leader-segment hover-target" data-allocation-leader-segment data-category-key="${category.key}" data-leader="${segment.leader}" data-hover-timestamp="${segment.hoverTimestamp}" x="${startX.toFixed(2)}" y="${rowTop.toFixed(2)}" width="${widthPx.toFixed(2)}" height="${rowHeight}" fill="${leaderColor(segment.leader)}" pointer-events="all"><title>${escapeHtml(title)}</title></rect>`;
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

  const xTicks = [0, 0.25, 0.5, 0.75, 1]
    .map(step => {
      const timestamp = Math.round(maxX * step);
      const xPos = x(timestamp);
      return `
        <line x1="${xPos.toFixed(2)}" y1="12" x2="${xPos.toFixed(2)}" y2="${(leaderStripHeight - 16).toFixed(2)}" stroke="#E4E8E1" stroke-width="1" />
        <text x="${xPos.toFixed(2)}" y="${(leaderStripHeight - 4).toFixed(2)}" text-anchor="middle" font-size="10" fill="#5B6257">${formatTime(timestamp)}</text>
      `;
    })
    .join('');

  return `
<svg id="allocation-leader-strip" class="leader-strip" viewBox="0 0 ${width} ${leaderStripHeight}" role="img" aria-label="Thirty-second leader strip by allocation category">
  <rect x="0" y="0" width="${width}" height="${leaderStripHeight}" fill="#F7FAF8" rx="8" />
  ${xTicks}
  ${rows}
</svg>`;
}

function buildStrategyAllocationSvg(
  hoverSnapshots: HoverSnapshot[],
  duration: number,
  ageMarkers: AgeMarker[]
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
            return `${graph.label}: You ${formatNumber(row.you)}, Opp ${formatNumber(row.opponent)}, Delta ${formatSigned(row.delta)}`;
          }
          return `${graph.label}: You ${formatStrategyShare(row.youShare)}, Opp ${formatStrategyShare(row.opponentShare)}, Delta ${formatSignedPercentagePoints(row.shareDelta)}`;
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
    <details class="panel secondary-panel" id="villager-opportunity" data-secondary-section="villager-opportunity">
      <summary class="secondary-summary">
        <span class="section-title">Villager opportunity cost</span>
        <span class="secondary-summary-meta">Counterfactual economy detail</span>
      </summary>
      <div class="secondary-body">
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
      </div>
    </details>
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

function buildHoverInteractionScript(hoverSnapshots: HoverSnapshot[]): string {
  return `
  <script id="post-match-hover-data" type="application/json">${escapeJsonForScript(hoverSnapshots)}</script>
  <script>
    (function () {
      var payloadEl = document.getElementById('post-match-hover-data');
      if (!payloadEl || !payloadEl.textContent) return;

      var hoverData = JSON.parse(payloadEl.textContent);
      var byTimestamp = new Map(hoverData.map(function (point) { return [String(point.timestamp), point]; }));
      var pinned = false;
      var selectedBand = 'economic';
      var currentTimestamp = hoverData[0] ? hoverData[0].timestamp : null;
      var bandLabels = {
        economic: 'Economic',
        populationCap: 'Population cap',
        militaryCapacity: 'Military buildings',
        militaryActive: 'Mil active',
        defensive: 'Defensive',
        research: 'Research',
        advancement: 'Advancement',
        destroyed: 'Destroyed'
      };
      var allocationGraphDefs = {
        economic: { label: 'Economic', mode: 'share' },
        technology: { label: 'Technology', mode: 'share' },
        military: { label: 'Military', mode: 'share' },
        destroyed: { label: 'Destroyed', mode: 'absolute' },
        overall: { label: 'Overall', mode: 'absolute' },
        float: { label: 'Float', mode: 'absolute' }
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

      function formatMultiplier(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'n/a';
        return formatPrecise(numeric, 3) + 'x';
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

      function setAdjustedField(name, text) {
        setText('[data-adjusted-field="' + name + '"]', text);
      }

      function setAdjustedFieldHtml(name, html) {
        document.querySelectorAll('[data-adjusted-field="' + name + '"]').forEach(function (el) {
          el.innerHTML = html;
        });
      }

      function setFieldHtml(name, html) {
        document.querySelectorAll('[data-hover-field="' + name + '"]').forEach(function (el) {
          el.innerHTML = html;
        });
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

        var titleEl = document.querySelector('[data-band-breakdown-title]');
        if (titleEl) {
          titleEl.textContent = (bandLabels[selectedBand] || selectedBand) + ' composition';
        }

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

      function matrixWhyHtmlFromCell(cell) {
        if (typeof cell.whyHtml === 'string' && cell.whyHtml.length > 0) {
          return cell.whyHtml;
        }
        return '<div class="adjusted-matrix-why-title">Select a matchup cell</div><p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell\\'s exact computation and explanation.</p>';
      }

      function adjustedMatrixHtml(point) {
        var matrix = point.adjustedMilitary && point.adjustedMilitary.matrix
          ? point.adjustedMilitary.matrix
          : null;
        if (!matrix) {
          return '<p class="section-note adjusted-matrix-note">Not enough military-active units to render the matchup matrix at this timestamp.</p>';
        }

        if (matrix.emptyMessage) {
          return '<p class="section-note adjusted-matrix-note">' + escapeHtml(matrix.emptyMessage) + '</p>';
        }

        var columns = Array.isArray(matrix.columns) ? matrix.columns : [];
        var rows = Array.isArray(matrix.rows) ? matrix.rows : [];
        if (columns.length === 0 || rows.length === 0) {
          return '<p class="section-note adjusted-matrix-note">Not enough military-active units to render the matchup matrix at this timestamp.</p>';
        }

        var header = '<tr><th>Unit</th>' + columns.map(function (unitName) {
          return '<th>' + escapeHtml(unitName) + '</th>';
        }).join('') + '</tr>';

        var body = rows.map(function (row) {
          var cells = (row.cells || []).map(function (cell) {
            var whyHtml = matrixWhyHtmlFromCell(cell);
            return '<td class="adjusted-matrix-cell"><button type="button" class="adjusted-matrix-cell-btn ' + escapeHtml(cell.heatClass || 'is-even') + '"' +
              ' data-matrix-why-html="' + escapeHtml(whyHtml) + '"' +
              '>' + formatPrecise(cell.score, 2) + 'x</button></td>';
          }).join('');
          return '<tr><th>' + escapeHtml(row.unitName || '') + '</th>' + cells + '</tr>';
        }).join('');

        var defaultWhy = typeof matrix.defaultWhyHtml === 'string' && matrix.defaultWhyHtml.length > 0
          ? matrix.defaultWhyHtml
          : '<div class="adjusted-matrix-why-title">Select a matchup cell</div><p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell\\'s exact computation and explanation.</p>';
        var matrixNote = typeof matrix.note === 'string' && matrix.note.length > 0
          ? matrix.note
          : 'Rows are your top military units. Columns are opponent top military units. Each cell is a direct pairwise interaction.';

        return '<p class="section-note adjusted-matrix-note">' + escapeHtml(matrixNote) + '</p>' +
          '<table class="adjusted-matrix-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>' +
          '<div class="adjusted-matrix-why" data-adjusted-field="matrixWhy">' + defaultWhy + '</div>';
      }

      function wireAdjustedMatrixInteractions() {
        var container = document.querySelector('[data-adjusted-field="matrixMock"]');
        if (!container) return;
        var buttons = container.querySelectorAll('.adjusted-matrix-cell-btn');
        if (!buttons || buttons.length === 0) return;

        function applyFromButton(button) {
          var whyHtml = button.getAttribute('data-matrix-why-html') || '';
          if (whyHtml) {
            setAdjustedFieldHtml('matrixWhy', whyHtml);
          }
          buttons.forEach(function (btn) {
            btn.classList.remove('is-selected');
          });
          button.classList.add('is-selected');
        }

        buttons.forEach(function (button) {
          button.addEventListener('click', function () {
            applyFromButton(button);
          });
        });

        applyFromButton(buttons[0]);
      }

      function adjustedPctText(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'n/a';
        var rounded = Math.round(Number(value) * 10) / 10;
        var sign = rounded > 0 ? '+' : '';
        return sign + rounded.toFixed(1) + '%';
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

      function significantTopLossesText(event) {
        if (!event || !Array.isArray(event.topLosses) || event.topLosses.length === 0) {
          return 'No itemized losses';
        }
        return event.topLosses.map(function (item) {
          return (item.label || 'Loss') + ' x' + formatNumber(item.count) + ' (' + formatNumber(item.value) + ')';
        }).join(' · ');
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
        var player1Label = event && event.player1Civilization ? event.player1Civilization : 'Player 1';
        var player2Label = event && event.player2Civilization ? event.player2Civilization : 'Player 2';
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

      function updateSignificantEvent(point) {
        var event = point.significantEvent || null;
        document.querySelectorAll('[data-significant-event]').forEach(function (el) {
          el.hidden = !event;
        });
        if (!event) {
          setField('significantEvent.label', '');
          setField('significantEvent.description', '');
          setField('significantEvent.grossLoss', '');
          setField('significantEvent.topLosses', '');
          updateSignificantEventLosses(null);
          return;
        }

        setField('significantEvent.label', event.headline || ((event.victimLabel ? event.victimLabel + ' ' : '') + (event.label || 'Event')));
        setField('significantEvent.description', event.description || '');
        setField('significantEvent.grossLoss', formatNumber(event.grossImpact ?? event.grossLoss));
        setField('significantEvent.topLosses', significantTopLossesText(event));
        updateSignificantEventLosses(event);
      }

      function updateInspector(timestamp) {
        var point = byTimestamp.get(String(timestamp));
        if (!point) return;
        currentTimestamp = point.timestamp;

        setField('timeLabel', point.timeLabel);
        var contextEl = document.querySelector('[data-hover-context]');
        if (contextEl) {
          var markerText = point.markers && point.markers.length > 0 ? point.markers.join(' · ') : '';
          contextEl.textContent = pinned
            ? (markerText ? 'Pinned · ' + markerText + ' · Esc to clear' : 'Pinned · Esc to clear')
            : (markerText || 'Click to pin · Esc to clear');
        }
        updateSignificantEvent(point);

        ['economic', 'populationCap', 'militaryCapacity', 'militaryActive', 'defensive', 'research', 'advancement', 'total'].forEach(function (key) {
          setField('you.' + key, formatNumber(point.you[key]));
          setField('opponent.' + key, formatNumber(point.opponent[key]));
          setField('delta.' + key, formatSigned(point.delta[key]));
        });
        ['economic', 'technology', 'military', 'other', 'destroyed', 'overall', 'float'].forEach(function (key) {
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
        setFieldHtml('adjustedMilitary.you', '<span class=\"inspector-adjusted-value-main\">' + formatNumber(point.adjustedMilitary.you) + '</span><small class=\"inspector-adjusted-value-pct\">(' + adjustedPctText(point.adjustedMilitary.youPct) + ')</small>');
        setFieldHtml('adjustedMilitary.opponent', '<span class=\"inspector-adjusted-value-main\">' + formatNumber(point.adjustedMilitary.opponent) + '</span><small class=\"inspector-adjusted-value-pct\">(' + adjustedPctText(point.adjustedMilitary.opponentPct) + ')</small>');
        setField('adjustedMilitary.delta', formatSigned(point.adjustedMilitary.delta));
        setAdjustedField('timeLabel', point.timeLabel);
        setAdjustedField('you.raw', formatNumber(point.adjustedMilitary.youRaw));
        setAdjustedField('you.counterMultiplier', formatMultiplier(point.adjustedMilitary.youCounterMultiplier));
        setAdjustedField('you.counterAdjusted', formatPrecise(point.adjustedMilitary.youCounterAdjusted, 2));
        setAdjustedField('you.upgradeMultiplier', formatMultiplier(point.adjustedMilitary.youUpgradeMultiplier));
        setAdjustedField('you.final', formatNumber(point.adjustedMilitary.you));
        setAdjustedField(
          'you.formula',
          'You: ' + formatNumber(point.adjustedMilitary.youRaw) + ' × ' +
          formatMultiplier(point.adjustedMilitary.youCounterMultiplier) + ' × ' +
          formatMultiplier(point.adjustedMilitary.youUpgradeMultiplier) + ' = ' +
          formatNumber(point.adjustedMilitary.you)
        );
        setAdjustedField('opponent.raw', formatNumber(point.adjustedMilitary.opponentRaw));
        setAdjustedField('opponent.counterMultiplier', formatMultiplier(point.adjustedMilitary.opponentCounterMultiplier));
        setAdjustedField('opponent.counterAdjusted', formatPrecise(point.adjustedMilitary.opponentCounterAdjusted, 2));
        setAdjustedField('opponent.upgradeMultiplier', formatMultiplier(point.adjustedMilitary.opponentUpgradeMultiplier));
        setAdjustedField('opponent.final', formatNumber(point.adjustedMilitary.opponent));
        setAdjustedField(
          'opponent.formula',
          'Opponent: ' + formatNumber(point.adjustedMilitary.opponentRaw) + ' × ' +
          formatMultiplier(point.adjustedMilitary.opponentCounterMultiplier) + ' × ' +
          formatMultiplier(point.adjustedMilitary.opponentUpgradeMultiplier) + ' = ' +
          formatNumber(point.adjustedMilitary.opponent)
        );
        setAdjustedFieldHtml('matrixMock', adjustedMatrixHtml(point));
        wireAdjustedMatrixInteractions();
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
          setSvgLabel(
            '[data-hover-label-strategy-' + key + ']',
            point.strategyX,
            (key === 'economy' ? 'Economic' : key.charAt(0).toUpperCase() + key.slice(1)) + ' Δ ' + formatSignedPercentagePoints(strategyRow.delta)
          );
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

        setVerticalLine('[data-hover-line-pool]', point.poolX);
        setVerticalLine('[data-hover-line-strategy]', point.strategyX);
        setVerticalLine('[data-hover-line-gather]', point.gatherX);
        setVerticalLine('[data-hover-line-villager-you]', point.villagerX);
        setVerticalLine('[data-hover-line-villager-opponent]', point.villagerX);
        setSvgLabel('[data-hover-label-time]', point.poolX, point.timeLabel);
        setSvgLabel('[data-hover-label-strategy-time]', point.strategyX, point.timeLabel);
        setSvgLabel('[data-hover-label-pool-total-you]', point.poolX, 'You ' + formatNumber(point.you.total));
        setSvgLabel('[data-hover-label-pool-total-opponent]', point.poolX, 'Opp ' + formatNumber(point.opponent.total));
        setSvgLabel('[data-hover-label-pool-delta]', point.poolX, 'Delta ' + formatSigned(point.delta.total));
        setSvgLabel('[data-hover-label-gather-you]', point.gatherX, 'You ' + formatNumber(point.gather.you) + '/min');
        setSvgLabel('[data-hover-label-gather-opponent]', point.gatherX, 'Opp ' + formatNumber(point.gather.opponent) + '/min');
        setSvgLabel('[data-hover-label-villager-you-loss]', point.villagerX, 'Loss ' + formatNumber(point.villagerOpportunity.you.cumulativeLoss));
        setSvgLabel('[data-hover-label-villager-you-gained]', point.villagerX, 'Gained ' + formatNumber(point.villagerOpportunity.you.cumulativeResourcesGained));
        setSvgLabel('[data-hover-label-villager-you-possible]', point.villagerX, 'Possible ' + formatNumber(point.villagerOpportunity.you.cumulativeResourcesPossible));
        setSvgLabel('[data-hover-label-villager-opponent-loss]', point.villagerX, 'Loss ' + formatNumber(point.villagerOpportunity.opponent.cumulativeLoss));
        setSvgLabel('[data-hover-label-villager-opponent-gained]', point.villagerX, 'Gained ' + formatNumber(point.villagerOpportunity.opponent.cumulativeResourcesGained));
        setSvgLabel('[data-hover-label-villager-opponent-possible]', point.villagerX, 'Possible ' + formatNumber(point.villagerOpportunity.opponent.cumulativeResourcesPossible));
        renderBandBreakdown(point);
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
          var expanded = button.getAttribute('aria-expanded') !== 'false';
          setCategoryCollapsed(key, expanded);
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

      document.querySelectorAll('.hover-target[data-hover-timestamp]').forEach(function (target) {
        target.addEventListener('pointerenter', function () {
          if (!pinned) updateInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('pointermove', function () {
          if (!pinned) updateInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('click', function () {
          pinned = true;
          document.body.setAttribute('data-hover-pinned', 'true');
          updateInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          pinned = true;
          document.body.setAttribute('data-hover-pinned', 'true');
          updateInspector(target.getAttribute('data-hover-timestamp'));
        });
      });

      document.querySelectorAll('[data-open-adjusted-explainer]').forEach(function (button) {
        button.addEventListener('click', function () {
          var explainer = document.getElementById('adjusted-military-explainer');
          if (!explainer) return;
          if ('open' in explainer) explainer.open = true;
          explainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          explainer.classList.add('focus-pulse');
          window.setTimeout(function () {
            explainer.classList.remove('focus-pulse');
          }, 1300);
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        pinned = false;
        document.body.removeAttribute('data-hover-pinned');
        if (hoverData[0]) updateInspector(hoverData[0].timestamp);
      });

      syncBandSelection();
      if (hoverData[0]) updateInspector(hoverData[0].timestamp);
    }());
  </script>`;
}

export function renderPostMatchHtml(model: PostMatchViewModel): string {
  const castleDelta = model.metricCards.castleAgeDeltaSeconds;
  const castleLabel = castleDelta === null
    ? 'N/A'
    : `${castleDelta >= 0 ? '+' : '-'}${formatTime(Math.abs(castleDelta))}`;
  const castleSub = castleDelta === null
    ? 'Castle timing unavailable'
    : `${castleDelta >= 0 ? 'later' : 'earlier'} than opponent`;

  const yourBet = model.metricCards.yourBet;
  const oppBet = model.metricCards.opponentBet;

  const eventsHtml = model.events.length > 0
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

  const legendHtml = bandDefs
    .map(band => `<span class="legend-chip"><span class="legend-dot" style="background:${band.color}"></span>${band.label}</span>`)
    .join('');
  const hoverSnapshots = buildHoverSnapshots(model);
  const defaultHoverSnapshot = hoverSnapshots[0];

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
      width: min(100%, 1240px);
      max-width: 1240px;
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
      font-size: 12px;
      font-weight: 700;
      color: #0c447c;
      text-decoration: none;
      border: 1px solid #bcd3ea;
      border-radius: 999px;
      background: #f2f7fc;
      padding: 3px 9px;
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .metric-card {
      min-width: 0;
      border: 1px solid var(--color-border);
      background: #fff;
      border-radius: 8px;
      padding: 12px;
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

	    .pool-chart,
	    .strategy-chart,
	    .leader-strip,
	    .gather-chart {
	      width: 100%;
	      max-width: 100%;
	      height: auto;
	      display: block;
	    }

	    .leader-strip {
	      margin-bottom: 10px;
	    }

	    .allocation-leader-segment {
	      opacity: 0.9;
	      transition: opacity 160ms ease;
	    }

		    .allocation-leader-segment:hover {
		      opacity: 1;
		    }

		    .allocation-lane-bg {
		      fill: #edf4f6;
		      opacity: 0.7;
		    }

		    .allocation-lane-destroyed .allocation-lane-bg {
		      fill: #f8ece7;
		    }

		    .allocation-lane-overall .allocation-lane-bg {
		      fill: #eef3f5;
		    }

		    .allocation-lane-float .allocation-lane-bg {
		      fill: #ecf5ed;
		    }

		    .allocation-lane-divider {
		      stroke: #b8c3bd;
		      stroke-width: 1;
		      stroke-dasharray: 4 5;
		    }

		    .allocation-lane-overall path {
		      stroke-width: 2.8;
		    }

	    .trajectory-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(300px, 30vw, 340px);
      gap: 12px;
      align-items: start;
    }

    .chart-stack {
      min-width: 0;
      overflow-x: auto;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
    }

    .hover-inspector {
      position: sticky;
      top: 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #fff;
      max-height: calc(100vh - 24px);
      padding: 10px 12px;
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
      font-size: 13px;
      font-weight: 800;
      color: #253226;
    }

    .event-impact-description {
      margin: 4px 0 8px;
      color: #465447;
      font-size: 12px;
      line-height: 1.35;
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

    .event-impact-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 10px;
      margin: 0;
    }

    .event-impact-metrics div {
      min-width: 0;
    }

    .event-impact-metrics dt {
      color: var(--color-muted);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .event-impact-metrics dd {
      margin: 1px 0 0;
      color: #253226;
      font-size: 13px;
      font-weight: 800;
    }

    .event-impact-losses {
      margin-top: 7px;
      color: var(--color-muted);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
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

	    .allocation-category-row th,
	    .allocation-category-row td {
	      color: #253226;
	      font-weight: 800;
	      border-top-color: #d6ddd1;
	      background: #f6f8f4;
	    }

	    .allocation-category-toggle {
	      display: inline-flex;
	      align-items: center;
	      gap: 7px;
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

	    .category-caret {
	      width: 0;
	      height: 0;
	      border-top: 4px solid transparent;
	      border-bottom: 4px solid transparent;
	      border-left: 6px solid #5B6257;
	      transform: rotate(90deg);
	      transition: transform 140ms ease;
	      flex: none;
	    }

	    .allocation-category-toggle[aria-expanded="false"] .category-caret {
	      transform: rotate(0deg);
	    }

	    .allocation-category-toggle:focus-visible,
	    .band-toggle:focus-visible {
	      outline: 2px solid #8fb6dc;
	      outline-offset: 2px;
	      border-radius: 4px;
	    }

    .band-row.is-selected th,
    .band-row.is-selected td {
      background: #f1f6fb;
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

    .inspector-adjusted-row th,
    .inspector-adjusted-row td {
      color: #1f3551;
      font-weight: 700;
      border-top-color: #d6ddd1;
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

    .band-breakdown-cols {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
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
      align-items: baseline;
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
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-radius: 3px;
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
      font-size: 12px;
      font-weight: 800;
      paint-order: stroke;
      stroke: #F7FAF8;
      stroke-width: 3.5px;
      stroke-linejoin: round;
      font-variant-numeric: tabular-nums;
    }

    .you-label { fill: var(--you); }
    .opponent-label { fill: var(--opponent); }
    .delta-label { fill: #253226; }
    .villager-loss-label { fill: #C56C52; }
    .villager-gained-label { fill: #378ADD; }
    .villager-possible-label { fill: #253226; }

    body[data-hover-pinned="true"] .hover-inspector {
      border-color: #9bbce0;
      box-shadow: 0 0 0 2px rgba(55, 138, 221, 0.12);
    }

    .gather-legend {
      margin-top: 8px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
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

    .villager-opportunity-legend {
      margin: 0 0 10px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
    }

    .villager-opportunity-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .villager-opportunity-card {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #fff;
      padding: 10px;
    }

    .villager-opportunity-card h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .villager-opportunity-chart {
      width: 100%;
      height: auto;
      display: block;
      margin-bottom: 8px;
    }

    .villager-opportunity-metrics {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 4px;
      font-size: 12px;
    }

    .villager-opportunity-metrics li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid #edf1ea;
      padding-top: 4px;
      font-variant-numeric: tabular-nums;
    }

    .villager-opportunity-metrics strong {
      color: #253226;
    }

    .events-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .event-card {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 11px;
      background: #fff;
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

    .secondary-panel {
      padding: 0;
      overflow: hidden;
    }

    .secondary-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 48px;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
      list-style: none;
    }

    .secondary-summary::-webkit-details-marker {
      display: none;
    }

    .secondary-summary::before {
      content: "";
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 7px solid #5B6257;
      transition: transform 140ms ease;
      flex: none;
    }

    .secondary-panel[open] .secondary-summary {
      border-bottom: 1px solid var(--color-border);
    }

    .secondary-panel[open] .secondary-summary::before {
      transform: rotate(90deg);
    }

    .secondary-summary .section-title {
      flex: 1;
    }

    .secondary-summary-meta {
      color: var(--color-muted);
      font-size: 13px;
      font-weight: 600;
      text-align: right;
    }

    .secondary-body {
      padding: 12px 16px 16px;
    }

    .story-label {
      font-size: 12px;
      color: var(--color-muted);
      margin-bottom: 7px;
    }

    .story-body {
      font-size: 16px;
      line-height: 1.4;
      margin: 0;
    }

    .adjusted-breakdown-title {
      font-size: 13px;
      font-weight: 700;
      color: #253226;
      margin: 8px 0 8px;
    }

    .adjusted-breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .adjusted-breakdown-table th,
    .adjusted-breakdown-table td {
      border-top: 1px solid #edf1ea;
      padding: 6px 4px;
      text-align: right;
      white-space: nowrap;
    }

    .adjusted-breakdown-table th:first-child,
    .adjusted-breakdown-table td:first-child {
      text-align: left;
    }

    .adjusted-breakdown-formulae {
      margin-top: 8px;
      display: grid;
      gap: 4px;
      font-size: 12px;
      color: #354235;
      font-variant-numeric: tabular-nums;
    }

    .adjusted-breakdown-formulae p {
      margin: 0;
    }

    .adjusted-subhead {
      margin: 14px 0 8px;
      font-size: 13px;
      color: #253226;
    }

    .adjusted-matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .adjusted-matrix-table th,
    .adjusted-matrix-table td {
      border-top: 1px solid #edf1ea;
      padding: 6px 4px;
      text-align: right;
      white-space: nowrap;
    }

    .adjusted-matrix-table th:first-child,
    .adjusted-matrix-table td:first-child {
      text-align: left;
    }

    .adjusted-matrix-cell {
      padding: 0;
    }

    .adjusted-matrix-cell-btn {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 6px 4px;
      text-align: right;
      font: inherit;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
    }

    .adjusted-matrix-cell-btn.is-selected {
      outline: 2px solid #1f3551;
      outline-offset: -2px;
    }

    .adjusted-matrix-note {
      margin: 0 0 6px;
    }

    .adjusted-matrix-cell-btn.is-strong {
      background: #e8f4ea;
      color: #1f5f30;
      font-weight: 700;
    }

    .adjusted-matrix-cell-btn.is-weak {
      background: #faece7;
      color: #7a2f1b;
      font-weight: 700;
    }

    .adjusted-matrix-cell-btn.is-even {
      background: #f3f6f5;
      color: #3a4740;
    }

    .adjusted-matrix-why {
      margin-top: 8px;
      border-top: 1px solid #edf1ea;
      padding-top: 8px;
    }

    .adjusted-matrix-why-title {
      font-size: 12px;
      font-weight: 700;
      color: #253226;
      margin-bottom: 4px;
    }

    .adjusted-matrix-why-note {
      margin: 0 0 4px;
      font-size: 12px;
    }

    .adjusted-matrix-why-summary {
      margin-bottom: 8px;
      font-size: 12px;
    }

    .adjusted-matrix-why-subhead {
      font-size: 12px;
      font-weight: 700;
      color: #253226;
      margin: 2px 0 4px;
    }

    .adjusted-matrix-why-list {
      margin-top: 2px;
      font-size: 12px;
      padding-left: 16px;
    }

    .method-list {
      margin: 0;
      padding-left: 18px;
      color: #253226;
      font-size: 13px;
      line-height: 1.45;
    }

    .focus-pulse {
      box-shadow: 0 0 0 2px rgba(55, 138, 221, 0.18), 0 6px 18px rgba(32, 43, 32, 0.05);
      transition: box-shadow 220ms ease;
    }

    @media (max-width: 980px) {
      body { padding: 16px; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .events-grid { grid-template-columns: 1fr; }
      .header-row { grid-template-columns: 1fr; }
      .outcome { text-align: left; }
      .trajectory-grid { grid-template-columns: 1fr; }
      .hover-inspector { position: static; }
	      .band-breakdown-cols { grid-template-columns: 1fr; }
	      .allocation-read-guide-grid { grid-template-columns: 1fr; }
	      .strategy-readout-grid { grid-template-columns: 1fr; }
      .strategy-state-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .villager-opportunity-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 760px) {
      .strategy-state-strip { grid-template-columns: 1fr; }

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

      .inspector-adjusted-row td {
        align-items: flex-start;
      }

      .inspector-total-row {
        border-top-color: #d6ddd1;
      }

      .adjusted-breakdown-table {
        font-size: 11px;
      }

      .adjusted-breakdown-table th,
      .adjusted-breakdown-table td {
        padding: 5px 3px;
      }

      .adjusted-matrix-table {
        font-size: 11px;
      }

      .adjusted-matrix-table th,
      .adjusted-matrix-table td {
        padding: 5px 3px;
      }

      .adjusted-matrix-cell-btn {
        padding: 5px 3px;
      }
    }

    @media (max-width: 520px) {
      body { padding: 12px; }
      .wrap { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }
      .panel { padding: 12px; }
      .chips { flex-direction: column; align-items: stretch; }
      .civ-chip { width: 100%; }
      .metrics { grid-template-columns: 1fr; }
      .section-title { font-size: 19px; }
      .chart-stack .leader-strip,
      .chart-stack .strategy-chart { min-width: 680px; }
      .secondary-summary {
        align-items: flex-start;
        padding: 12px;
      }
      .secondary-summary-meta { display: none; }
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
            <span class="civ-chip"><span class="swatch" style="background:#378ADD"></span>You · ${escapeHtml(model.header.youCivilization)}</span>
            <span class="civ-chip"><span class="swatch" style="background:#D85A30"></span>Opponent · ${escapeHtml(model.header.opponentCivilization)}</span>
          </div>
        </div>
        <div class="outcome">${escapeHtml(model.header.outcome)}</div>
      </div>
      ${model.deferredBanner ? `<div class="banner" style="margin-top:12px">${escapeHtml(model.deferredBanner)}</div>` : ''}
    </section>

    <section class="panel metrics">
      <article class="metric-card">
        <div class="metric-title">Final pool delta</div>
        <div class="metric-value">${formatSigned(model.metricCards.finalPoolDelta)}</div>
        <div class="metric-sub">at surrender/end</div>
      </article>
      <article class="metric-card">
        <div class="metric-title">Castle age delta</div>
        <div class="metric-value">${escapeHtml(castleLabel)}</div>
        <div class="metric-sub">${escapeHtml(castleSub)}</div>
      </article>
      <article class="metric-card">
        <div class="metric-title">Your bet at Castle</div>
        <div class="metric-value">${yourBet ? escapeHtml(formatBetLabel(yourBet.label)) : 'N/A'}</div>
        <div class="metric-sub">${yourBet ? `${yourBet.subtitlePercent}% of pool` : 'Castle data unavailable'}</div>
      </article>
      <article class="metric-card">
        <div class="metric-title">Opp bet at Castle</div>
        <div class="metric-value">${oppBet ? escapeHtml(formatBetLabel(oppBet.label)) : 'N/A'}</div>
        <div class="metric-sub">${oppBet ? `${oppBet.subtitlePercent}% of pool` : 'Castle data unavailable'}</div>
      </article>
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
          <div class="allocation-read-guide-item" aria-label="Destroyed: cumulative value assumed destroyed by opponent">
            <strong>Destroyed lane</strong>
            <span>Destroyed is cumulative value assumed destroyed by opponent.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Overall: absolute deployed resource value, including Other">
            <strong>Overall lane</strong>
            <span>Overall: absolute deployed resource value after subtracting Destroyed.</span>
          </div>
          <div class="allocation-read-guide-item" aria-label="Float (not deployed): gathered resources not currently committed">
            <strong>Float lane</strong>
            <span>Float (not deployed) is gathered resources not currently committed.</span>
          </div>
        </div>
      </details>
      <div class="age-legend">
        <strong>Age timings</strong>
        <span class="age-key"><span class="age-line" style="border-color:#378ADD"></span>You age-up</span>
        <span class="age-key"><span class="age-line dashed" style="border-color:#D85A30"></span>Opponent age-up</span>
      </div>
      <div class="trajectory-grid">
        <div class="chart-stack">
          ${buildAllocationLeaderStripSvg(hoverSnapshots, model.trajectory.durationSeconds)}
          ${buildStrategyAllocationSvg(
            hoverSnapshots,
            model.trajectory.durationSeconds,
            model.trajectory.ageMarkers
          )}
        </div>
        ${buildHoverInspectorHtml(defaultHoverSnapshot)}
      </div>
    </section>

    <details class="panel secondary-panel" data-secondary-section="gather-rate">
      <summary class="secondary-summary">
        <span class="section-title">Gather rate</span>
        <span class="secondary-summary-meta">Income trajectory detail</span>
      </summary>
      <div class="secondary-body">
      <p class="section-note">Villager losses live here — as flat spots and slow recovery — rather than as large pool drops.</p>
      ${buildGatherRateSvg(
        model.gatherRate.youSeries,
        model.gatherRate.opponentSeries,
        model.gatherRate.durationSeconds,
        model.trajectory.ageMarkers,
        hoverSnapshots
      )}
      <div class="gather-legend">
        <span class="line-chip"><span class="line-swatch" style="border-color:#378ADD"></span>You</span>
        <span class="line-chip"><span class="line-swatch dashed" style="border-color:#D85A30"></span>Opponent</span>
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
      <div class="events-grid">${eventsHtml}</div>
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
  </main>
  ${buildHoverInteractionScript(hoverSnapshots)}
</body>
</html>`;
}
