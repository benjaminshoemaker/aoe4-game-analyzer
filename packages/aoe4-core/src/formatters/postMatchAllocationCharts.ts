import type { AgeMarker, PostMatchPlayerDisplay, SignificantTimelineEvent } from '../analysis/postMatchViewModel';
import {
  escapeHtml,
  formatNumber,
  formatSigned,
  formatSignedPercentagePoints,
  formatStrategyShare,
  formatTime,
} from './sharedFormatters';

export const POST_MATCH_SVG_WIDTH = 980;

export type AllocationCategoryKey = 'economic' | 'technology' | 'military' | 'other';
export type AllocationGraphKey = 'economic' | 'technology' | 'military' | 'destroyed' | 'overall' | 'float' | 'opportunityLost';
export type AllocationLeader = 'you' | 'opponent' | 'tie';
export type AllocationChartPlayerLabels = Record<'you' | 'opponent', PostMatchPlayerDisplay>;

export interface AllocationGraphDef {
  key: AllocationGraphKey;
  label: string;
  mode: 'share' | 'absolute';
}

export interface AllocationChartComparisonRow {
  you: number;
  opponent: number;
  delta: number;
  youShare: number;
  opponentShare: number;
  shareDelta: number;
}

export interface AllocationChartSnapshot {
  timestamp: number;
  timeLabel: string;
  strategyX: number;
  allocation: Record<AllocationGraphKey, AllocationChartComparisonRow>;
  significantEvent: SignificantTimelineEvent | null;
}

export interface AllocationLeaderSegment {
  categoryKey: AllocationGraphKey;
  start: number;
  end: number;
  hoverTimestamp: number;
  leader: AllocationLeader;
  you: number;
  opponent: number;
}

export const allocationGraphDefs: AllocationGraphDef[] = [
  { key: 'economic', label: 'Economic', mode: 'share' },
  { key: 'technology', label: 'Technology', mode: 'share' },
  { key: 'military', label: 'Military', mode: 'share' },
  { key: 'destroyed', label: 'Destroyed', mode: 'absolute' },
  { key: 'overall', label: 'Overall', mode: 'absolute' },
  { key: 'float', label: 'Float', mode: 'absolute' },
  { key: 'opportunityLost', label: 'Opportunity lost', mode: 'absolute' },
];

export const shareAllocationKeys: Array<AllocationGraphKey | AllocationCategoryKey> = ['economic', 'technology', 'military'];
export const shareAllocationKeySet = new Set<AllocationGraphKey | AllocationCategoryKey>(shareAllocationKeys);
export const allocationLeaderGraphDefs = allocationGraphDefs.filter(graph =>
  shareAllocationKeySet.has(graph.key)
);

export const strategyPadding = { top: 42, right: 12, bottom: 38, left: 96 };
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
type ChartPadding = typeof strategyPadding;

function scaledX(timestamp: number, duration: number, padding: { left: number; right: number }): number {
  const maxX = Math.max(duration, 1);
  const plotWidth = POST_MATCH_SVG_WIDTH - padding.left - padding.right;
  return padding.left + (timestamp / maxX) * plotWidth;
}

function hoverLabelX(xPos: number): number {
  return xPos > POST_MATCH_SVG_WIDTH - 170 ? xPos - 8 : xPos + 8;
}

function hoverLabelAnchor(xPos: number): string {
  return xPos > POST_MATCH_SVG_WIDTH - 170 ? 'end' : 'start';
}

function playerColor(labels: AllocationChartPlayerLabels, player: keyof AllocationChartPlayerLabels): string {
  return labels[player].color;
}

function markerColor(marker: AgeMarker, labels: AllocationChartPlayerLabels): string {
  return playerColor(labels, marker.player);
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

export function buildAgeMarkerLayer(params: {
  markers: AgeMarker[];
  duration: number;
  x: (timestamp: number) => number;
  width: number;
  lineStartY: number;
  lineEndY: number;
  labelY?: number;
  showLabels: boolean;
  labels: AllocationChartPlayerLabels;
}): string {
  const markers = params.markers.filter(marker => marker.timestamp >= 0 && marker.timestamp <= params.duration);
  const rowed = assignMarkerRows(markers, params.x, params.showLabels ? 4 : 1, params.showLabels ? 86 : 0);

  return rowed
    .map(({ marker, xPos, row }) => {
      const label = escapeHtml(marker.label);
      const color = escapeHtml(markerColor(marker, params.labels));
      const text = params.showLabels
        ? `<text x="${xPos.toFixed(2)}" y="${((params.labelY ?? 12) + row * 12).toFixed(2)}" text-anchor="${markerTextAnchor(xPos, params.width)}" font-size="10" font-weight="700" fill="${color}">${escapeHtml(marker.shortLabel)}</text>`
        : '';

      return `<g class="age-marker" data-age-marker="${label}">
        <line x1="${xPos.toFixed(2)}" y1="${params.lineStartY.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${params.lineEndY.toFixed(2)}" stroke="${color}" stroke-width="1.4" opacity="0.72"${markerDash(marker)} />
        ${text}
        <title>${label}</title>
      </g>`;
    })
    .join('');
}

function uniqueSignificantEvents(hoverSnapshots: AllocationChartSnapshot[]): SignificantTimelineEvent[] {
  const byId = new Map<string, SignificantTimelineEvent>();
  for (const snapshot of hoverSnapshots) {
    if (snapshot.significantEvent) {
      byId.set(snapshot.significantEvent.id, snapshot.significantEvent);
    }
  }
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

function significantEventAriaLabel(event: SignificantTimelineEvent): string {
  return `${event.label} at ${event.timeLabel}: ${event.headline || event.description}`;
}

function significantEventMarkerColor(
  event: SignificantTimelineEvent,
  labels: AllocationChartPlayerLabels
): string {
  const favorablePlayer = event.victim === 'you' ? 'opponent' : 'you';
  return playerColor(labels, favorablePlayer);
}

function significantEventMarkerGlyph(event: SignificantTimelineEvent): string {
  if (event.kind === 'raid') return 'R';
  if (event.kind === 'fight') return 'F';
  return 'L';
}

function buildSignificantEventWindowLayer(params: {
  events: SignificantTimelineEvent[];
  duration: number;
  x: (timestamp: number) => number;
  lineStartY: number;
  lineEndY: number;
  labels: AllocationChartPlayerLabels;
}): string {
  const events = params.events.filter(event => event.timestamp >= 0 && event.timestamp <= params.duration);
  if (events.length === 0) return '';

  return events
    .map(event => {
      const boundedStart = Math.max(0, Math.min(params.duration, Math.min(event.windowStart, event.windowEnd)));
      const boundedEnd = Math.max(0, Math.min(params.duration, Math.max(event.windowStart, event.windowEnd)));
      const startX = params.x(boundedStart);
      const endX = params.x(boundedEnd);
      const width = Math.max(2, endX - startX);
      const color = escapeHtml(significantEventMarkerColor(event, params.labels));
      const label = `${event.label} window ${formatTime(boundedStart)}-${formatTime(boundedEnd)}`;

      return `<rect class="significant-event-window" data-significant-event-window data-significant-event-id="${escapeHtml(event.id)}" x="${startX.toFixed(2)}" y="${params.lineStartY.toFixed(2)}" width="${width.toFixed(2)}" height="${(params.lineEndY - params.lineStartY).toFixed(2)}" rx="6" fill="${color}" opacity="0.14" stroke="${color}" stroke-width="1.2" stroke-opacity="0.34" pointer-events="none" display="none" aria-hidden="true"><title>${escapeHtml(label)}</title></rect>`;
    })
    .join('');
}

function buildSignificantEventMarkerLayer(params: {
  events: SignificantTimelineEvent[];
  duration: number;
  x: (timestamp: number) => number;
  lineStartY: number;
  lineEndY: number;
  labels: AllocationChartPlayerLabels;
}): string {
  const events = params.events.filter(event => event.timestamp >= 0 && event.timestamp <= params.duration);
  if (events.length === 0) return '';

  const markerY = Math.max(18, params.lineStartY - 18);
  const markerRadius = 10;
  // Stems are rendered separately from markers so the marker <g> bbox stays
  // tight around the visible icon. Otherwise auto-targeted clicks (e.g. from
  // Playwright, or imprecise user clicks on the stem) land on a transparent
  // strategy-hover-target rect underneath because the stem itself has
  // pointer-events: none.
  const stems = events
    .map(event => {
      const xPos = params.x(event.timestamp);
      const color = escapeHtml(significantEventMarkerColor(event, params.labels));
      return `<line class="significant-event-stem" aria-hidden="true" x1="${xPos.toFixed(2)}" y1="${markerY.toFixed(2)}" x2="${xPos.toFixed(2)}" y2="${params.lineEndY.toFixed(2)}" stroke="${color}" />`;
    })
    .join('');
  const markers = events
    .map(event => {
      const xPos = params.x(event.timestamp);
      const color = escapeHtml(significantEventMarkerColor(event, params.labels));
      const label = significantEventAriaLabel(event);
      // The transparent <rect> overlays the dot so the clickable bbox is
      // exactly the visible icon (with a small slop margin). Combined with
      // restricting the marker <g> to icon-sized children, this guarantees
      // bbox-center clicks land on the marker itself.
      const hitLeft = xPos - markerRadius;
      const hitTop = markerY - markerRadius;
      const hitSize = markerRadius * 2;
      return `<g class="significant-event-marker hover-target" data-significant-event-marker data-hover-timestamp="${event.timestamp}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
        <rect class="significant-event-hit" x="${hitLeft.toFixed(2)}" y="${hitTop.toFixed(2)}" width="${hitSize.toFixed(2)}" height="${hitSize.toFixed(2)}" fill="transparent" pointer-events="all" />
        <circle class="significant-event-dot" cx="${xPos.toFixed(2)}" cy="${markerY.toFixed(2)}" r="${markerRadius}" fill="${color}" />
        <text class="significant-event-glyph" x="${xPos.toFixed(2)}" y="${(markerY + 3.7).toFixed(2)}" text-anchor="middle">${escapeHtml(significantEventMarkerGlyph(event))}</text>
        <title>${escapeHtml(label)}</title>
      </g>`;
    })
    .join('');
  return `<g class="significant-event-stems" aria-hidden="true">${stems}</g><g class="significant-event-markers" aria-label="Significant loss events">${markers}</g>`;
}

function leaderColor(leader: AllocationLeader, labels: AllocationChartPlayerLabels): string {
  if (leader === 'you') return playerColor(labels, 'you');
  if (leader === 'opponent') return playerColor(labels, 'opponent');
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
  hoverSnapshots: AllocationChartSnapshot[]
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

export function buildAllocationLeaderStripSvg(
  segments: AllocationLeaderSegment[],
  duration: number,
  labels: AllocationChartPlayerLabels
): string {
  const width = POST_MATCH_SVG_WIDTH;
  const padding = strategyPadding;
  const plotWidth = width - padding.left - padding.right;
  const maxX = Math.max(duration, 1);
  const x = (timestamp: number): number => padding.left + (timestamp / maxX) * plotWidth;

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
          return `<rect class="allocation-leader-segment hover-target" data-allocation-leader-segment data-category-key="${category.key}" data-leader="${segment.leader}" data-hover-timestamp="${segment.hoverTimestamp}" x="${startX.toFixed(2)}" y="${rowTop.toFixed(2)}" width="${widthPx.toFixed(2)}" height="${leaderStripRowHeight}" fill="${escapeHtml(leaderColor(segment.leader, labels))}" pointer-events="all"><title>${escapeHtml(title)}</title></rect>`;
        })
        .join('');

      return `
        <g>
          <text x="12" y="${(rowTop + 13).toFixed(2)}" font-size="12" font-weight="700" fill="var(--color-strong)">${escapeHtml(category.label)}</text>
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
  <rect x="0" y="0" width="${width}" height="${leaderStripHeight}" fill="var(--color-chart-bg)" rx="8" />
  ${verticalTicks}
  ${rows}
  <g data-time-axis="allocation-leader">
    <rect class="leader-strip-axis-bg" x="${padding.left}" y="${(leaderStripAxisTop - 2).toFixed(2)}" width="${plotWidth.toFixed(2)}" height="${(leaderStripAxisHeight - 2).toFixed(2)}" rx="6" />
    <line x1="${padding.left}" y1="${leaderStripAxisTop.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${leaderStripAxisTop.toFixed(2)}" stroke="#CAD2C7" stroke-width="1" />
    ${xTicks}
  </g>
</svg>`;
}

function allocationValueFor(
  graph: AllocationGraphDef,
  snapshot: AllocationChartSnapshot,
  side: 'you' | 'opponent'
): number {
  const row = snapshot.allocation[graph.key];
  return graph.mode === 'absolute' ? row[side] : side === 'you' ? row.youShare : row.opponentShare;
}

function buildStrategyHoverTitle(
  snapshot: AllocationChartSnapshot,
  labels: AllocationChartPlayerLabels
): string {
  return allocationGraphDefs
    .map(graph => {
      const row = snapshot.allocation[graph.key];
      if (graph.mode === 'absolute') {
        return `${graph.label}: ${labels.you.compactLabel} ${formatNumber(row.you)}, ${labels.opponent.compactLabel} ${formatNumber(row.opponent)}, Delta ${formatSigned(row.delta)}`;
      }
      return `${graph.label}: ${labels.you.compactLabel} ${formatStrategyShare(row.youShare)}, ${labels.opponent.compactLabel} ${formatStrategyShare(row.opponentShare)}, Delta ${formatSignedPercentagePoints(row.shareDelta)}`;
    })
    .join(' | ');
}

function buildAllocationHoverColumns(params: {
  hoverSnapshots: AllocationChartSnapshot[];
  maxX: number;
  x: (timestamp: number) => number;
  padding: ChartPadding;
  height: number;
  labels: AllocationChartPlayerLabels;
}): string {
  const { hoverSnapshots, maxX, x, padding, height, labels } = params;
  const timestamps = hoverSnapshots.map(snapshot => snapshot.timestamp);

  return hoverSnapshots
    .map((snapshot, idx) => {
      const timestamp = snapshot.timestamp;
      const prevTimestamp = idx === 0 ? 0 : timestamps[idx - 1];
      const nextTimestamp = idx === hoverSnapshots.length - 1 ? maxX : timestamps[idx + 1];
      const leftTimestamp = idx === 0 ? 0 : (prevTimestamp + timestamp) / 2;
      const rightTimestamp = idx === hoverSnapshots.length - 1 ? maxX : (timestamp + nextTimestamp) / 2;
      const left = x(leftTimestamp);
      const right = x(rightTimestamp);
      const title = buildStrategyHoverTitle(snapshot, labels);

      return `<rect class="hover-target strategy-hover-target" data-hover-timestamp="${timestamp}" x="${left.toFixed(2)}" y="${padding.top.toFixed(2)}" width="${Math.max(2, right - left).toFixed(2)}" height="${(height - padding.top - padding.bottom).toFixed(2)}" fill="transparent" pointer-events="all"><title>${formatTime(timestamp)} - ${escapeHtml(title)}</title></rect>`;
    })
    .join('');
}

function buildAllocationLane(params: {
  graph: AllocationGraphDef;
  index: number;
  hoverSnapshots: AllocationChartSnapshot[];
  defaultHover: AllocationChartSnapshot;
  x: (timestamp: number) => number;
  padding: ChartPadding;
  plotWidth: number;
  width: number;
  youColor: string;
  opponentColor: string;
}): string {
  const { graph, index, hoverSnapshots, defaultHover, x, padding, plotWidth, width, youColor, opponentColor } = params;
  const laneTop = padding.top + index * (strategyLaneHeight + strategyLaneGap);
  const laneBottom = laneTop + strategyLaneHeight;
  const maxY = allocationLaneMaxY(graph, hoverSnapshots);
  const yFor = (value: number): number =>
    laneTop + strategyLaneHeight - (Math.max(0, Math.min(maxY, value)) / maxY) * strategyLaneHeight;
  const pathFor = (side: 'you' | 'opponent'): string =>
    hoverSnapshots
      .map((snapshot, pointIdx) => `${pointIdx === 0 ? 'M' : 'L'} ${x(snapshot.timestamp).toFixed(2)} ${yFor(allocationValueFor(graph, snapshot, side)).toFixed(2)}`)
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
          <text x="12" y="${(laneTop + 19).toFixed(2)}" font-size="13" font-weight="800" fill="var(--color-strong)">${escapeHtml(graph.label)}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneTop + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${topLabel}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneTop + strategyLaneHeight / 2 + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${midLabel}</text>
          <text x="${(padding.left - 8).toFixed(2)}" y="${(laneBottom + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#5B6257">${bottomLabel}</text>
          <line x1="${padding.left}" y1="${laneTop.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${laneTop.toFixed(2)}" stroke="#D9DDD8" stroke-width="1" />
          <line x1="${padding.left}" y1="${(laneTop + strategyLaneHeight / 2).toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${(laneTop + strategyLaneHeight / 2).toFixed(2)}" stroke="#D9DDD8" stroke-width="1" />
          <line x1="${padding.left}" y1="${laneBottom.toFixed(2)}" x2="${(padding.left + plotWidth).toFixed(2)}" y2="${laneBottom.toFixed(2)}" stroke="#5B6257" stroke-width="1.1" />
          <path d="${pathFor('you')}" fill="none" stroke="${youColor}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
          <path d="${pathFor('opponent')}" fill="none" stroke="${opponentColor}" stroke-width="2.4" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" />
          <text data-hover-label-strategy-${graph.key} data-fixed-label="true" class="hover-value-label delta-label" x="${readoutX.toFixed(2)}" y="${(laneTop + 18).toFixed(2)}" text-anchor="end">${escapeHtml(labelText)}</text>
        </g>
      `;
}

function buildAllocationLanes(params: {
  hoverSnapshots: AllocationChartSnapshot[];
  defaultHover: AllocationChartSnapshot;
  x: (timestamp: number) => number;
  padding: ChartPadding;
  plotWidth: number;
  width: number;
  youColor: string;
  opponentColor: string;
}): string {
  return allocationGraphDefs
    .map((graph, index) => buildAllocationLane({ ...params, graph, index }))
    .join('');
}

export function buildStrategyAllocationSvg(
  hoverSnapshots: AllocationChartSnapshot[],
  duration: number,
  ageMarkers: AgeMarker[],
  labels: AllocationChartPlayerLabels
): string {
  const width = POST_MATCH_SVG_WIDTH;
  const height = strategyHeight;
  const padding = strategyPadding;
  const plotWidth = width - padding.left - padding.right;
  const youColor = escapeHtml(playerColor(labels, 'you'));
  const opponentColor = escapeHtml(playerColor(labels, 'opponent'));
  const x = (timestamp: number): number => scaledX(timestamp, duration, padding);
  const defaultHover = hoverSnapshots[0];

  if (!defaultHover) {
    return `
<svg id="allocation-comparison" class="strategy-chart allocation-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Allocation comparison chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="var(--color-chart-bg)" rx="10" />
</svg>`;
  }

  const maxX = Math.max(duration, 1);
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

  const hoverColumns = buildAllocationHoverColumns({ hoverSnapshots, maxX, x, padding, height, labels });
  const lanes = buildAllocationLanes({
    hoverSnapshots,
    defaultHover,
    x,
    padding,
    plotWidth,
    width,
    youColor,
    opponentColor,
  });

  const significantEvents = uniqueSignificantEvents(hoverSnapshots);
  const significantEventWindowLayer = buildSignificantEventWindowLayer({
    events: significantEvents,
    duration,
    x,
    lineStartY: padding.top,
    lineEndY: height - padding.bottom,
    labels,
  });
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
  const significantEventLayer = buildSignificantEventMarkerLayer({
    events: significantEvents,
    duration,
    x,
    lineStartY: padding.top,
    lineEndY: height - padding.bottom,
    labels,
  });

  return `
<svg id="allocation-comparison" class="strategy-chart allocation-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Allocation comparison chart">
  <rect x="0" y="0" width="${width}" height="${height}" fill="var(--color-chart-bg)" rx="10" />
  ${significantEventWindowLayer}
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
