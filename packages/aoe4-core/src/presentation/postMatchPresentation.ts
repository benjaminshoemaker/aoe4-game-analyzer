import type {
  AllocationCategoryKey,
  AllocationGraphKey,
  AllocationLeader,
  AllocationLeaderSegment,
} from '../formatters/postMatchAllocationCharts';
import {
  allocationLeaderGraphDefs,
  shareAllocationKeySet,
} from '../formatters/postMatchAllocationCharts';
import { roundToTenth } from '../formatters/sharedFormatters';

export type EconomicRole = 'resourceGenerator' | 'resourceInfrastructure';

export interface HoverBandValues {
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

export interface AllocationComparisonRow {
  you: number;
  opponent: number;
  delta: number;
  youShare: number;
  opponentShare: number;
  shareDelta: number;
}

export interface AllocationCategoryDef {
  key: AllocationCategoryKey;
  label: string;
  bandKeys: Array<
    'economic' |
    'populationCap' |
    'militaryCapacity' |
    'militaryActive' |
    'defensive' |
    'research' |
    'advancement'
  >;
}

export type AllocationComparison = Record<AllocationGraphKey | AllocationCategoryKey, AllocationComparisonRow>;
export type OpportunityLostComponents = Record<'villagersLost' | 'underproduction' | 'lowUnderproduction', AllocationComparisonRow>;
export type AllocationCategoryBasis = 'net' | 'destroyed' | 'investment';
export type EconomicAllocationBasis = 'resourceGeneration' | 'resourceInfrastructure';
export type AllocationCategoryRows = Record<AllocationCategoryBasis, AllocationComparisonRow> &
  Partial<Record<EconomicAllocationBasis, AllocationComparisonRow>>;
export type AllocationCategoryAccounting = Record<AllocationCategoryKey, AllocationCategoryRows>;
export type StrategyBucketKey = 'economy' | 'military' | 'technology';

export const allocationCategoryDefs: AllocationCategoryDef[] = [
  { key: 'economic', label: 'Economic', bandKeys: ['economic'] },
  { key: 'technology', label: 'Technology', bandKeys: ['research', 'advancement'] },
  { key: 'military', label: 'Military', bandKeys: ['militaryCapacity', 'militaryActive', 'defensive'] },
  { key: 'other', label: 'Other', bandKeys: ['populationCap'] },
];

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

export function buildAllocationComparisonRow(
  key: AllocationGraphKey | AllocationCategoryKey,
  youValue: number,
  opponentValue: number,
  youShareTotal: number,
  opponentShareTotal: number
): AllocationComparisonRow {
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
}

export function buildAllocationComparison(
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
    return buildAllocationComparisonRow(key, youValue, opponentValue, youShareTotal, opponentShareTotal);
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

export function buildAllocationCategoryAccounting(
  net: AllocationComparison,
  investment: AllocationComparison,
  economicRoles?: Record<EconomicAllocationBasis, { you: number; opponent: number }>
): AllocationCategoryAccounting {
  const destroyedValues = allocationCategoryDefs.map(category => ({
    key: category.key,
    you: Math.max(0, investment[category.key].you - net[category.key].you),
    opponent: Math.max(0, investment[category.key].opponent - net[category.key].opponent),
  }));
  const youDestroyedTotal = destroyedValues.reduce((sum, row) => sum + row.you, 0);
  const opponentDestroyedTotal = destroyedValues.reduce((sum, row) => sum + row.opponent, 0);
  const rows = {} as AllocationCategoryAccounting;

  for (const category of allocationCategoryDefs) {
    const destroyed = destroyedValues.find(row => row.key === category.key) ?? {
      key: category.key,
      you: 0,
      opponent: 0,
    };

    rows[category.key] = {
      net: net[category.key],
      resourceGeneration: buildAllocationComparisonRow(category.key, 0, 0, 0, 0),
      resourceInfrastructure: buildAllocationComparisonRow(category.key, 0, 0, 0, 0),
      destroyed: buildAllocationComparisonRow(
        category.key,
        destroyed.you,
        destroyed.opponent,
        youDestroyedTotal,
        opponentDestroyedTotal
      ),
      investment: investment[category.key],
    };
  }

  if (economicRoles) {
    const youEconomicRoleTotal = Math.max(
      0,
      economicRoles.resourceGeneration.you + economicRoles.resourceInfrastructure.you
    );
    const opponentEconomicRoleTotal = Math.max(
      0,
      economicRoles.resourceGeneration.opponent + economicRoles.resourceInfrastructure.opponent
    );

    rows.economic.resourceGeneration = buildAllocationComparisonRow(
      'economic',
      economicRoles.resourceGeneration.you,
      economicRoles.resourceGeneration.opponent,
      youEconomicRoleTotal,
      opponentEconomicRoleTotal
    );
    rows.economic.resourceInfrastructure = buildAllocationComparisonRow(
      'economic',
      economicRoles.resourceInfrastructure.you,
      economicRoles.resourceInfrastructure.opponent,
      youEconomicRoleTotal,
      opponentEconomicRoleTotal
    );
  }

  return rows;
}

export function allocationShareFor(
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
      const allocation = buildAllocationComparison(point.you, point.opponent);
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

export function buildStrategyShares(values: HoverBandValues): Record<StrategyBucketKey, number> {
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

export function buildStrategySnapshot(
  you: HoverBandValues,
  opponent: HoverBandValues
): Record<StrategyBucketKey, {
  you: number;
  opponent: number;
  delta: number;
}> {
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
