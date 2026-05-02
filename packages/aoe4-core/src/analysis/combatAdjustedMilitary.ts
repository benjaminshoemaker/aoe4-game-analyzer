import { CombatEffect } from '../data/counterMatrix';
import combatAdjustedConfigJson from '../data/combatAdjustedConfig.json';
import { getUpgradeEffect, getUpgradeEffectFromIcon } from '../data/upgradeMappings';
import { ResolvedBuildItem, ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { Technology, UnitWithValue, UpgradeEffect, Unit } from '../types';
import { BandItemDeltaEvent, PoolSeriesPoint } from './resourcePool';
import { evaluateCombatValue } from '../data/combatValueEngine';

interface CombatAdjustedConfig {
  upgradeImpactScale: number;
  upgradeImpactCap: number;
}

const combatAdjustedConfig = combatAdjustedConfigJson as CombatAdjustedConfig;

type CombatUpgradeType =
  | 'melee_attack'
  | 'ranged_attack'
  | 'melee_armor'
  | 'ranged_armor'
  | 'siege';

const supportedTechnologyEffectTypes = new Set(['passive', 'bonus']);
const supportedTechnologyProperties = new Set([
  'meleeAttack',
  'rangedAttack',
  'siegeAttack',
  'fireAttack',
  'attackSpeed',
  'maxRange',
  'meleeArmor',
  'rangedArmor',
  'fireArmor',
  'rangedResistance',
  'hitpoints',
]);

export interface CombatAdjustedMilitaryPoint {
  timestamp: number;
  player1RawMilitaryActive: number;
  player2RawMilitaryActive: number;
  player1CounterAdjustedMilitaryActive: number;
  player2CounterAdjustedMilitaryActive: number;
  player1AdjustedMilitaryActive: number;
  player2AdjustedMilitaryActive: number;
  player1UpgradeMultiplier: number;
  player2UpgradeMultiplier: number;
  player1UnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
  player2UnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
}

export interface AdjustedMilitaryUnitBreakdownRow {
  unitId: string;
  unitName: string;
  count: number;
  rawValue: number;
  counterFactor: number;
  upgradeFactor: number;
  adjustedValue: number;
  deltaValue: number;
  why: string;
}

export interface BuildCombatAdjustedSeriesParams {
  player1Build: ResolvedBuildOrder;
  player2Build: ResolvedBuildOrder;
  player1Civilization?: string;
  player2Civilization?: string;
  player1MilitaryActiveSeries: Pick<PoolSeriesPoint, 'timestamp' | 'militaryActive'>[];
  player2MilitaryActiveSeries: Pick<PoolSeriesPoint, 'timestamp' | 'militaryActive'>[];
  player1MilitaryActiveBandItemDeltas?: BandItemDeltaEvent[];
  player2MilitaryActiveBandItemDeltas?: BandItemDeltaEvent[];
  timelineTimestamps: number[];
  duration: number;
  unitCatalog?: Unit[];
  technologyCatalog?: Technology[];
}

interface TechnologyIndex {
  byId: Map<string, Technology[]>;
}

interface PlayerEffectsAtTimestamp {
  effects: CombatEffect[];
  hasCatalogEffects: boolean;
}

type StructuredTechnologyEffect = Exclude<NonNullable<Technology['effects']>[number], string>;

function toRounded(value: number): number {
  return Number(value.toFixed(2));
}

function uniqueSortedTimestamps(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isFinite(value) && value >= 0))]
    .sort((a, b) => a - b);
}

function isCombatUpgradeType(value: string): value is CombatUpgradeType {
  return (
    value === 'melee_attack' ||
    value === 'ranged_attack' ||
    value === 'melee_armor' ||
    value === 'ranged_armor' ||
    value === 'siege'
  );
}

function resolveUpgradeEffects(item: ResolvedBuildItem): UpgradeEffect[] {
  const effects = new Map<string, UpgradeEffect>();

  function addEffect(effect: UpgradeEffect | null): void {
    if (!effect || !isCombatUpgradeType(effect.type)) return;
    const key = `${effect.type}:${effect.level}`;
    effects.set(key, effect);
  }

  addEffect(getUpgradeEffect(item.id));
  addEffect(getUpgradeEffect(item.originalEntry.id));
  addEffect(getUpgradeEffectFromIcon(item.originalEntry.icon));

  return [...effects.values()];
}

function legacyCombatUpgradeBonusAt(build: ResolvedBuildOrder, timestamp: number): number {
  const allItems = [...build.startingAssets, ...build.resolved];
  let totalBonus = 0;

  for (const item of allItems) {
    if (item.type !== 'upgrade') continue;

    const completions = item.produced.filter(value => value <= timestamp).length;
    if (completions <= 0) continue;

    const effects = resolveUpgradeEffects(item);
    if (effects.length === 0) continue;

    const perCompletionBonus = effects.reduce((sum, effect) => sum + effect.bonus, 0);
    totalBonus += perCompletionBonus * completions;
  }

  return totalBonus;
}

function legacyUpgradeMultiplier(build: ResolvedBuildOrder, timestamp: number): number {
  const bonus = legacyCombatUpgradeBonusAt(build, timestamp);
  const scaled = Math.min(combatAdjustedConfig.upgradeImpactCap, bonus * combatAdjustedConfig.upgradeImpactScale);
  return Number((1 + scaled).toFixed(4));
}

function militaryActiveAtOrBefore(
  series: Pick<PoolSeriesPoint, 'timestamp' | 'militaryActive'>[],
  timestamp: number
): number {
  if (series.length === 0) return 0;

  let candidate = series[0].militaryActive;
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point.militaryActive;
  }

  return candidate;
}

interface MilitaryBandAccumulatorEntry {
  itemId: string;
  label: string;
  count: number;
  value: number;
}

interface MilitaryBandGroupedEntry {
  representativeId: string;
  label: string;
  rank: number;
  count: number;
  value: number;
}

function parseItemId(itemKey: string): string {
  const separator = itemKey.indexOf(':');
  return separator >= 0 ? itemKey.slice(separator + 1) : itemKey;
}

function tierRankForUnit(unitId: string, label: string): number {
  const idMatch = unitId.match(/-(\d+)$/);
  if (idMatch) return Number(idMatch[1]);

  const lower = label.toLowerCase();
  if (lower.startsWith('imperial ')) return 4;
  if (lower.startsWith('elite ')) return 3;
  if (lower.startsWith('veteran ')) return 2;
  if (lower.startsWith('hardened ')) return 1;
  return 0;
}

function normalizeMilitaryLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/^(imperial|elite|veteran|hardened)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyMilitaryBandDelta(
  accumulator: Map<string, MilitaryBandAccumulatorEntry>,
  event: BandItemDeltaEvent
): void {
  if (event.band !== 'militaryActive') return;
  const itemId = parseItemId(event.itemKey);
  const existing = accumulator.get(event.itemKey) ?? {
    itemId,
    label: event.itemLabel,
    count: 0,
    value: 0,
  };

  existing.count += event.deltaCount;
  existing.value += event.deltaValue;
  existing.label = event.itemLabel;

  const shouldRemove = existing.count <= 0 || existing.value <= 1e-9;
  if (shouldRemove) {
    accumulator.delete(event.itemKey);
    return;
  }

  accumulator.set(event.itemKey, existing);
}

function militaryArmyFromBandAccumulator(
  accumulator: Map<string, MilitaryBandAccumulatorEntry>,
  rawMilitaryActive: number
): UnitWithValue[] {
  const grouped = new Map<string, MilitaryBandGroupedEntry>();

  for (const entry of accumulator.values()) {
    if (entry.count <= 0 || entry.value <= 0) continue;
    const canonicalKey = stripTierSuffix(entry.itemId) || normalizeMilitaryLabel(entry.label);
    const rank = tierRankForUnit(entry.itemId, entry.label);
    const existing = grouped.get(canonicalKey);

    if (!existing) {
      grouped.set(canonicalKey, {
        representativeId: entry.itemId,
        label: entry.label,
        rank,
        count: entry.count,
        value: entry.value,
      });
      continue;
    }

    existing.count += entry.count;
    existing.value += entry.value;
    if (rank >= existing.rank) {
      existing.rank = rank;
      existing.representativeId = entry.itemId;
      existing.label = entry.label;
    }
  }

  const groupedEntries = [...grouped.values()].filter(entry => entry.count > 0 && entry.value > 0);
  if (groupedEntries.length === 0) return [];

  const derivedTotal = groupedEntries.reduce((sum, entry) => sum + entry.value, 0);
  const scale = rawMilitaryActive > 0 && derivedTotal > 0 ? rawMilitaryActive / derivedTotal : 1;

  return groupedEntries.map((entry) => {
    const scaledTotal = entry.value * scale;
    const effectiveValue = scaledTotal / Math.max(1, entry.count);
    return {
      unitId: entry.representativeId,
      name: entry.label,
      count: entry.count,
      effectiveValue,
      classes: [],
    };
  });
}

function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}

function stripTierSuffix(value: string): string {
  return value.replace(/-\d+$/, '');
}

function buildTechnologyIndex(catalog: Technology[] | undefined): TechnologyIndex {
  const byId = new Map<string, Technology[]>();
  const add = (key: string, tech: Technology): void => {
    const normalized = normalizeKey(key);
    if (!normalized) return;
    const existing = byId.get(normalized) ?? [];
    existing.push(tech);
    byId.set(normalized, existing);
  };

  for (const tech of catalog ?? []) {
    add(tech.id, tech);
    if (tech.baseId) add(tech.baseId, tech);
    add(stripTierSuffix(tech.id), tech);
  }

  return { byId };
}

function isStructuredTechnologyEffect(
  effect: NonNullable<Technology['effects']>[number]
): effect is StructuredTechnologyEffect {
  if (typeof effect !== 'object' || effect === null) return false;
  if (typeof effect.property !== 'string') return false;
  if (typeof effect.effect !== 'string') return false;
  return Number.isFinite(effect.value);
}

function normalizeTechnologyEffects(tech: Technology): CombatEffect[] {
  return (tech.effects ?? [])
    .filter(isStructuredTechnologyEffect)
    .filter(effect => {
      if (!supportedTechnologyProperties.has(effect.property)) return false;
      if (!effect.type) return true;
      return supportedTechnologyEffectTypes.has(effect.type);
    })
    .map(effect => ({
      property: effect.property,
      effect: effect.effect,
      value: Number(effect.value),
      type: effect.type,
      select: effect.select,
      target: effect.target,
    }));
}

function resolveTechnologyEffectsForItem(item: ResolvedBuildItem, techIndex: TechnologyIndex): CombatEffect[] {
  const keys = [
    item.id,
    item.originalEntry.id,
    stripTierSuffix(item.id),
    stripTierSuffix(item.originalEntry.id),
  ];

  for (const key of keys) {
    const matches = techIndex.byId.get(normalizeKey(key)) ?? [];
    if (matches.length === 0) continue;

    const effects = matches
      .map(tech => normalizeTechnologyEffects(tech))
      .sort((a, b) => b.length - a.length)[0] ?? [];

    if (effects.length > 0) {
      return effects;
    }
  }

  return [];
}

function effectsAtTimestamp(
  build: ResolvedBuildOrder,
  timestamp: number,
  techIndex: TechnologyIndex
): PlayerEffectsAtTimestamp {
  const allItems = [...build.startingAssets, ...build.resolved];
  const effects: CombatEffect[] = [];
  let hasCatalogEffects = false;

  for (const item of allItems) {
    if (item.type !== 'upgrade') continue;

    const completions = item.produced.filter(value => value <= timestamp).length;
    if (completions <= 0) continue;

    const techEffects = resolveTechnologyEffectsForItem(item, techIndex);
    if (techEffects.length <= 0) continue;

    hasCatalogEffects = true;
    for (let i = 0; i < completions; i += 1) {
      effects.push(...techEffects);
    }
  }

  return { effects, hasCatalogEffects };
}

function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 1;
  return numerator / denominator;
}

function breakdownMapByName(
  breakdown: Array<{ unitName: string; rawTotal: number; adjustedTotal: number }>
): Map<string, { rawTotal: number; adjustedTotal: number }> {
  const result = new Map<string, { rawTotal: number; adjustedTotal: number }>();
  for (const entry of breakdown) {
    const existing = result.get(entry.unitName) ?? { rawTotal: 0, adjustedTotal: 0 };
    existing.rawTotal += entry.rawTotal;
    existing.adjustedTotal += entry.adjustedTotal;
    result.set(entry.unitName, existing);
  }
  return result;
}

function reasonMapByAttacker(
  keyMatchups: Array<{ unit1Name: string; narrative: string; valueAfterCounter: number; counterMultiplier: number }>
): Map<string, string> {
  const sorted = [...keyMatchups].sort((a, b) => {
    const aImpact = Math.abs(a.counterMultiplier - 1) * a.valueAfterCounter;
    const bImpact = Math.abs(b.counterMultiplier - 1) * b.valueAfterCounter;
    return bImpact - aImpact;
  });

  const result = new Map<string, string>();
  for (const item of sorted) {
    if (!result.has(item.unit1Name)) {
      result.set(item.unit1Name, item.narrative);
    }
  }
  return result;
}

function defaultReason(counterFactor: number): string {
  if (counterFactor >= 1.05) return 'Favorable trades into parts of the opposing composition.';
  if (counterFactor <= 0.95) return 'Punished by parts of the opposing composition.';
  return 'Mostly even trades across the opposing composition.';
}

function withUpgradeReason(baseReason: string, upgradeFactor: number): string {
  if (upgradeFactor >= 1.02) {
    return `${baseReason} Completed military techs amplify this unit further.`;
  }

  if (upgradeFactor <= 0.98) {
    return `${baseReason} Upgrade interactions reduce this unit relative to baseline trades.`;
  }

  return baseReason;
}

function buildAdjustedUnitBreakdown(
  army: UnitWithValue[],
  baseBreakdown: Array<{ unitName: string; rawTotal: number; adjustedTotal: number }>,
  upgradedBreakdown: Array<{ unitName: string; rawTotal: number; adjustedTotal: number }>,
  reasonByUnit: Map<string, string>,
): AdjustedMilitaryUnitBreakdownRow[] {
  const baseByName = breakdownMapByName(baseBreakdown);
  const upgradedByName = breakdownMapByName(upgradedBreakdown);

  return army
    .map((unit) => {
      const rawValue = unit.count * unit.effectiveValue;
      const baseAdjusted = baseByName.get(unit.name)?.adjustedTotal ?? rawValue;
      const upgradedAdjusted = upgradedByName.get(unit.name)?.adjustedTotal ?? baseAdjusted;
      const counterFactor = safeRatio(baseAdjusted, rawValue);
      const upgradeFactor = safeRatio(upgradedAdjusted, baseAdjusted);
      const reason = reasonByUnit.get(unit.name) ?? defaultReason(counterFactor);

      return {
        unitId: unit.unitId,
        unitName: unit.name,
        count: unit.count,
        rawValue: toRounded(rawValue),
        counterFactor: Number(counterFactor.toFixed(4)),
        upgradeFactor: Number(upgradeFactor.toFixed(4)),
        adjustedValue: toRounded(upgradedAdjusted),
        deltaValue: toRounded(upgradedAdjusted - rawValue),
        why: withUpgradeReason(reason, upgradeFactor),
      };
    })
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 8);
}

export function buildCombatAdjustedSeries(params: BuildCombatAdjustedSeriesParams): CombatAdjustedMilitaryPoint[] {
  const timestamps = uniqueSortedTimestamps([
    0,
    params.duration,
    ...params.timelineTimestamps,
  ]);

  const technologyIndex = buildTechnologyIndex(params.technologyCatalog);
  const player1BandEvents = [...(params.player1MilitaryActiveBandItemDeltas ?? [])]
    .filter(event => event.band === 'militaryActive')
    .sort((a, b) => a.timestamp - b.timestamp || a.itemKey.localeCompare(b.itemKey));
  const player2BandEvents = [...(params.player2MilitaryActiveBandItemDeltas ?? [])]
    .filter(event => event.band === 'militaryActive')
    .sort((a, b) => a.timestamp - b.timestamp || a.itemKey.localeCompare(b.itemKey));

  const player1BandAccumulator = new Map<string, MilitaryBandAccumulatorEntry>();
  const player2BandAccumulator = new Map<string, MilitaryBandAccumulatorEntry>();
  let player1BandIndex = 0;
  let player2BandIndex = 0;

  return timestamps.map(timestamp => {
    const player1RawMilitaryActive = toRounded(
      militaryActiveAtOrBefore(params.player1MilitaryActiveSeries, timestamp)
    );
    const player2RawMilitaryActive = toRounded(
      militaryActiveAtOrBefore(params.player2MilitaryActiveSeries, timestamp)
    );

    while (player1BandIndex < player1BandEvents.length && player1BandEvents[player1BandIndex].timestamp <= timestamp) {
      applyMilitaryBandDelta(player1BandAccumulator, player1BandEvents[player1BandIndex]);
      player1BandIndex += 1;
    }

    while (player2BandIndex < player2BandEvents.length && player2BandEvents[player2BandIndex].timestamp <= timestamp) {
      applyMilitaryBandDelta(player2BandAccumulator, player2BandEvents[player2BandIndex]);
      player2BandIndex += 1;
    }

    const player1Army = militaryArmyFromBandAccumulator(player1BandAccumulator, player1RawMilitaryActive);
    const player2Army = militaryArmyFromBandAccumulator(player2BandAccumulator, player2RawMilitaryActive);

    const baseEvaluation = evaluateCombatValue(player1Army, player2Army, {
      unitCatalog: params.unitCatalog,
      player1Civilization: params.player1Civilization,
      player2Civilization: params.player2Civilization,
    });

    const player1EffectsAt = effectsAtTimestamp(params.player1Build, timestamp, technologyIndex);
    const player2EffectsAt = effectsAtTimestamp(params.player2Build, timestamp, technologyIndex);

    const upgradedEvaluation = evaluateCombatValue(player1Army, player2Army, {
      unitCatalog: params.unitCatalog,
      player1Effects: player1EffectsAt.effects,
      player2Effects: player2EffectsAt.effects,
      player1Civilization: params.player1Civilization,
      player2Civilization: params.player2Civilization,
    });

    const player1CounterRatio = baseEvaluation.army1CounterRatio;
    const player2CounterRatio = baseEvaluation.army2CounterRatio;

    const player1UpgradedCounterRatio = upgradedEvaluation.army1CounterRatio;
    const player2UpgradedCounterRatio = upgradedEvaluation.army2CounterRatio;

    const player1TechUpgradeMultiplier = safeRatio(player1UpgradedCounterRatio, player1CounterRatio);
    const player2TechUpgradeMultiplier = safeRatio(player2UpgradedCounterRatio, player2CounterRatio);

    const player1LegacyUpgradeMultiplier = legacyUpgradeMultiplier(params.player1Build, timestamp);
    const player2LegacyUpgradeMultiplier = legacyUpgradeMultiplier(params.player2Build, timestamp);

    const player1UpgradeMultiplier = player1EffectsAt.hasCatalogEffects
      ? player1TechUpgradeMultiplier
      : player1LegacyUpgradeMultiplier;
    const player2UpgradeMultiplier = player2EffectsAt.hasCatalogEffects
      ? player2TechUpgradeMultiplier
      : player2LegacyUpgradeMultiplier;

    const player1CounterAdjusted = player1RawMilitaryActive * player1CounterRatio;
    const player2CounterAdjusted = player2RawMilitaryActive * player2CounterRatio;
    const player1ReasonByUnit = reasonMapByAttacker(baseEvaluation.matchup.keyMatchups);
    const player2ReasonByUnit = reasonMapByAttacker(
      baseEvaluation.matchup.keyMatchups
        .filter(matchup => player2Army.some(unit => unit.name === matchup.unit1Name))
    );

    const player1UnitBreakdown = buildAdjustedUnitBreakdown(
      player1Army,
      baseEvaluation.matchup.army1Breakdown,
      upgradedEvaluation.matchup.army1Breakdown,
      player1ReasonByUnit
    );

    const player2UnitBreakdown = buildAdjustedUnitBreakdown(
      player2Army,
      baseEvaluation.matchup.army2Breakdown,
      upgradedEvaluation.matchup.army2Breakdown,
      player2ReasonByUnit
    );

    return {
      timestamp,
      player1RawMilitaryActive,
      player2RawMilitaryActive,
      player1CounterAdjustedMilitaryActive: toRounded(player1CounterAdjusted),
      player2CounterAdjustedMilitaryActive: toRounded(player2CounterAdjusted),
      player1AdjustedMilitaryActive: toRounded(player1CounterAdjusted * player1UpgradeMultiplier),
      player2AdjustedMilitaryActive: toRounded(player2CounterAdjusted * player2UpgradeMultiplier),
      player1UpgradeMultiplier: Number(player1UpgradeMultiplier.toFixed(4)),
      player2UpgradeMultiplier: Number(player2UpgradeMultiplier.toFixed(4)),
      player1UnitBreakdown,
      player2UnitBreakdown,
    };
  });
}
