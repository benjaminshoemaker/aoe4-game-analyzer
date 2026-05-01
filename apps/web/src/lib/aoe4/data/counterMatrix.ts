import fs from 'fs';
import path from 'path';
import counterMatrixConfigJson from './counterMatrixConfig.json';
import {
  CounterMatchup,
  MatchupAnalysis,
  MatchupDetail,
  Unit,
  UnitCount,
  UnitAdjustedSummary,
  UnitWithValue,
  ValueAdjustedMatchup
} from '../types';

export const unitClassCategories = [
  'heavy_melee_infantry',
  'light_melee_infantry',
  'spearman',
  'heavy_melee_cavalry',
  'light_melee_cavalry',
  'ranged_infantry',
  'heavy_ranged_infantry',
  'light_ranged_cavalry',
  'siege',
  'monk',
  'hero'
] as const;

export type UnitClassCategory = (typeof unitClassCategories)[number];

export interface CombatEffectSelector {
  id?: string[];
  class?: string[][];
}

export interface CombatEffect {
  property: string;
  effect: 'change' | 'multiply' | string;
  value: number;
  type?: string;
  select?: CombatEffectSelector;
  target?: CombatEffectSelector;
}

export interface ValueAdjustedMatchupOptions {
  player1Effects?: CombatEffect[];
  player2Effects?: CombatEffect[];
  player1Civilization?: string;
  player2Civilization?: string;
  unitCatalog?: Unit[];
}

export interface PairDpsBreakdown {
  weaponName: string | null;
  hitDamage: number;
  interval: number;
  sustainedDps: number;
  meleeUptime: number;
  meleeUptimeRaw: number;
  meleeUptimeFloor: number;
  meleeRangeGap: number;
  meleeRangePenaltyPerTile: number;
  meleeSpeedDelta: number;
  meleeSpeedCoefficient: number;
  meleeSpeedAdjustment: number;
  chargeOpeningDps: number;
  rangedOpeningDps: number;
  totalDps: number;
}

export interface PairCounterComputation {
  attackerUnitId: string;
  defenderUnitId: string;
  attackerUnitName: string;
  defenderUnitName: string;
  attacker: PairDpsBreakdown;
  defender: PairDpsBreakdown;
  attackerHitpoints: number;
  defenderHitpoints: number;
  attackerUnitValue: number;
  defenderUnitValue: number;
  attackerPerResource: number;
  defenderPerResource: number;
  equalResourceAdvantage: number;
  duelRootExponent: number;
  unclampedMultiplier: number;
  multiplier: number;
  clampMin: number;
  clampMax: number;
  usedFallback: boolean;
  forcedResultReason: string | null;
}

const STATIC_DATA_PATH = path.resolve(__dirname, './staticData.json');

interface CounterMatrixConfig {
  multiplierFloor: number;
  multiplierCeiling: number;
  duelRootExponent: number;
  classPriorExponent: number;
  valueNormalizationExponent: number;
  tooltipCounterBias: number;
  softCounterThreshold: number;
  softCounterMinMultiplier: number;
  softCounterReciprocalMax: number;
  hardCounterThreshold: number;
  hardCounterMinMultiplier: number;
  hardCounterReciprocalMax: number;
  meleeUptimeFloor: number;
  meleeRangePenaltyPerTile: number;
  meleeSpeedBonusPerDelta: number;
  meleeSpeedPenaltyPerDelta: number;
  rangedOpeningShotCap: number;
  charge: {
    contactProbability: number;
    engagementSeconds: number;
  };
}

const counterMatrixConfig = counterMatrixConfigJson as CounterMatrixConfig;

const classCounterMatrix: Record<UnitClassCategory, Partial<Record<UnitClassCategory, number>>> = {
  heavy_melee_infantry: {},
  light_melee_infantry: {},
  spearman: {},
  heavy_melee_cavalry: {},
  light_melee_cavalry: {},
  ranged_infantry: {},
  heavy_ranged_infantry: {},
  light_ranged_cavalry: {},
  siege: {},
  monk: {},
  hero: {}
};

function setClassEffectiveness(attacker: UnitClassCategory, defender: UnitClassCategory, value: number): void {
  classCounterMatrix[attacker][defender] = value;
}

function setSymmetricClassEffect(attacker: UnitClassCategory, defender: UnitClassCategory, value: number): void {
  setClassEffectiveness(attacker, defender, value);
  const reciprocal = Number((1 / value).toFixed(2));
  setClassEffectiveness(defender, attacker, reciprocal);
}

const baseCounterPairs: Array<[UnitClassCategory, UnitClassCategory, number]> = [
  ['spearman', 'heavy_melee_cavalry', 1.5],
  ['spearman', 'light_melee_cavalry', 1.4],
  ['spearman', 'light_ranged_cavalry', 1.4],
  ['heavy_ranged_infantry', 'heavy_melee_infantry', 1.5],
  ['heavy_ranged_infantry', 'heavy_melee_cavalry', 1.4],
  ['heavy_ranged_infantry', 'light_melee_infantry', 0.9],
  ['heavy_ranged_infantry', 'light_melee_cavalry', 0.7],
  ['heavy_ranged_infantry', 'siege', 1.1],
  ['heavy_ranged_infantry', 'monk', 1.2],
  ['heavy_melee_infantry', 'light_melee_infantry', 1.3],
  ['heavy_melee_cavalry', 'ranged_infantry', 1.4],
  ['heavy_melee_cavalry', 'light_melee_infantry', 1.3],
  ['heavy_melee_cavalry', 'light_melee_cavalry', 1.1],
  ['heavy_melee_cavalry', 'siege', 1.5],
  ['heavy_melee_cavalry', 'monk', 1.3],
  ['light_melee_cavalry', 'siege', 1.5],
  ['light_ranged_cavalry', 'siege', 1.5],
  ['light_melee_cavalry', 'monk', 1.5],
  ['light_ranged_cavalry', 'monk', 1.5],
  ['ranged_infantry', 'light_melee_infantry', 1.25],
  ['ranged_infantry', 'spearman', 1.25],
  ['heavy_melee_infantry', 'ranged_infantry', 1.25]
];

baseCounterPairs.forEach(([attacker, defender, value]) => setSymmetricClassEffect(attacker, defender, value));

function normalizeValues(values: string[]): string[] {
  return values
    .filter(Boolean)
    .map((value) => value.toLowerCase().replace(/[_-]/g, ' '))
    .map((value) => value.replace(/[^a-z0-9\s]/g, '').trim());
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasStandaloneKeyword(values: string[], keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`);
  const negatedPattern = new RegExp(`\\bnon\\s+${escapeRegex(keyword)}\\b`);
  return values.some(value => pattern.test(value) && !negatedPattern.test(value));
}

function hasKeyword(values: string[], keyword: string): boolean {
  const token = keyword.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (!token) return false;
  return values.some(value => value.includes(token));
}

function hasAllKeywords(values: string[], keywords: string[]): boolean {
  return values.some((value) => keywords.every((keyword) => value.includes(keyword)));
}

export function classifyUnit(unit: Unit): UnitClassCategory[] {
  const normalized = normalizeValues([...(unit.classes ?? []), ...(unit.displayClasses ?? []), unit.name, unit.baseId]);

  const categories: UnitClassCategory[] = [];
  const addCategory = (category: UnitClassCategory): void => {
    if (!categories.includes(category)) categories.push(category);
  };

  if (hasStandaloneKeyword(normalized, 'hero') || hasStandaloneKeyword(normalized, 'jeanne') || hasStandaloneKeyword(normalized, 'khan') || hasStandaloneKeyword(normalized, 'daimyo')) {
    addCategory('hero');
  }

  if (hasStandaloneKeyword(normalized, 'monk') || hasStandaloneKeyword(normalized, 'imam') || hasStandaloneKeyword(normalized, 'prelate') || hasStandaloneKeyword(normalized, 'scholar') || hasStandaloneKeyword(normalized, 'religious')) {
    addCategory('monk');
  }

  if (
    hasStandaloneKeyword(normalized, 'siege') ||
    hasStandaloneKeyword(normalized, 'ram') ||
    hasStandaloneKeyword(normalized, 'bombard') ||
    hasStandaloneKeyword(normalized, 'mangonel') ||
    hasStandaloneKeyword(normalized, 'trebuchet') ||
    hasStandaloneKeyword(normalized, 'springald')
  ) {
    addCategory('siege');
  }

  if (
    hasStandaloneKeyword(normalized, 'spear') ||
    hasStandaloneKeyword(normalized, 'spearman') ||
    hasStandaloneKeyword(normalized, 'pike') ||
    hasStandaloneKeyword(normalized, 'pikeman')
  ) {
    addCategory('spearman');
  }

  if (hasKeyword(normalized, 'crossbow') || hasKeyword(normalized, 'arbaletrier') || hasKeyword(normalized, 'handcannon')) {
    addCategory('heavy_ranged_infantry');
  } else if (hasAllKeywords(normalized, ['heavy', 'ranged', 'infantry'])) {
    addCategory('heavy_ranged_infantry');
  }

  if (hasAllKeywords(normalized, ['ranged', 'cavalry']) || hasKeyword(normalized, 'horse archer') || hasKeyword(normalized, 'mangudai')) {
    addCategory('light_ranged_cavalry');
  }

  if (hasAllKeywords(normalized, ['light', 'melee', 'cavalry']) || hasStandaloneKeyword(normalized, 'horseman') || hasStandaloneKeyword(normalized, 'sofa')) {
    addCategory('light_melee_cavalry');
  }

  if (hasAllKeywords(normalized, ['heavy', 'melee', 'cavalry']) || hasStandaloneKeyword(normalized, 'knight') || hasStandaloneKeyword(normalized, 'lancer')) {
    addCategory('heavy_melee_cavalry');
  }

  if (hasAllKeywords(normalized, ['heavy', 'melee', 'infantry']) || hasStandaloneKeyword(normalized, 'man at arms') || hasStandaloneKeyword(normalized, 'samurai')) {
    addCategory('heavy_melee_infantry');
  }

  if (!categories.includes('heavy_ranged_infantry') && (hasStandaloneKeyword(normalized, 'archer') || hasAllKeywords(normalized, ['ranged', 'infantry']))) {
    addCategory('ranged_infantry');
  }

  if (!categories.includes('spearman') && (hasAllKeywords(normalized, ['light', 'melee', 'infantry']) || hasStandaloneKeyword(normalized, 'musofadi') || hasStandaloneKeyword(normalized, 'warrior'))) {
    addCategory('light_melee_infantry');
  }

  return categories;
}

function evaluateClassCounter(attackerClasses: UnitClassCategory[], defenderClasses: UnitClassCategory[]): {
  value: number;
  attackerClass: UnitClassCategory | null;
  defenderClass: UnitClassCategory | null;
} {
  let bestValue = 1.0;
  let bestMagnitude = 0;
  let bestAttacker: UnitClassCategory | null = null;
  let bestDefender: UnitClassCategory | null = null;

  attackerClasses.forEach((attacker) => {
    defenderClasses.forEach((defender) => {
      const effectiveness = classCounterMatrix[attacker]?.[defender];
      if (effectiveness === undefined) return;

      const magnitude = Math.abs(Math.log(Math.max(0.0001, effectiveness)));
      const shouldReplace = magnitude > bestMagnitude + 1e-9;
      if (shouldReplace) {
        bestValue = effectiveness;
        bestMagnitude = magnitude;
        bestAttacker = attacker;
        bestDefender = defender;
      }
    });
  });

  return { value: bestValue, attackerClass: bestAttacker, defenderClass: bestDefender };
}

export function getCounterEffectiveness(attackerClasses: string[], defenderClasses: string[]): number {
  const { value } = evaluateClassCounter(
    attackerClasses as UnitClassCategory[],
    defenderClasses as UnitClassCategory[]
  );
  return value;
}

interface CombatUnitIndex {
  byId: Record<string, Unit[]>;
  byBaseId: Record<string, Unit[]>;
}

interface CombatWeapon {
  name: string;
  type: string;
  attribName?: string;
  damage: number;
  interval: number;
  maxRange: number;
  isCharge: boolean;
  modifiers: CombatEffect[];
}

interface CombatUnitProfile {
  id: string;
  baseId: string;
  name: string;
  description?: string;
  classes: string[];
  unitValue: number;
  hitpoints: number;
  meleeArmor: number;
  rangedArmor: number;
  fireArmor: number;
  rangedResistance: number;
  weapons: CombatWeapon[];
  movementSpeed: number;
  canAttackUnits: boolean;
  source: 'catalog' | 'fallback';
}

interface MatchupScore {
  attackerId: string;
  defenderId: string;
  effectiveness: number;
  impactValue: number;
}

let cachedUnitIndexFromDisk: CombatUnitIndex | null = null;

function normalizeIdToken(value: string): string {
  return value.toLowerCase().trim();
}

function readUnitCatalogFromDisk(): Unit[] {
  try {
    const raw = fs.readFileSync(STATIC_DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { units?: Unit[] } | Unit[];
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.units)) return parsed.units;
    return [];
  } catch {
    return [];
  }
}

function buildUnitIndex(units: Unit[]): CombatUnitIndex {
  const byId: Record<string, Unit[]> = {};
  const byBaseId: Record<string, Unit[]> = {};

  units.forEach((unit) => {
    const idKey = normalizeIdToken(unit.id);
    byId[idKey] = byId[idKey] ?? [];
    byId[idKey].push(unit);
    if (unit.baseId) {
      const baseKey = normalizeIdToken(unit.baseId);
      byBaseId[baseKey] = byBaseId[baseKey] ?? [];
      byBaseId[baseKey].push(unit);
    }
  });

  return { byId, byBaseId };
}

function getUnitIndex(explicitCatalog?: Unit[]): CombatUnitIndex {
  if (explicitCatalog && explicitCatalog.length > 0) {
    return buildUnitIndex(explicitCatalog);
  }

  if (!cachedUnitIndexFromDisk) {
    cachedUnitIndexFromDisk = buildUnitIndex(readUnitCatalogFromDisk());
  }

  return cachedUnitIndexFromDisk;
}

function stripTierSuffix(id: string): string {
  return id.replace(/-\d+$/, '');
}

const civilizationAliasMap: Record<string, string> = {
  abbasiddynasty: 'ab',
  abbasid: 'ab',
  ayyubids: 'ay',
  ayyubid: 'ay',
  byzantines: 'by',
  byzantine: 'by',
  chinese: 'ch',
  delhisultanate: 'de',
  delhi: 'de',
  english: 'en',
  french: 'fr',
  goldenhorde: 'gol',
  holyromanempire: 'hr',
  hre: 'hr',
  japanese: 'ja',
  jeannedarc: 'je',
  knightstemplar: 'kt',
  malians: 'ma',
  malian: 'ma',
  mongols: 'mo',
  orderofthedragon: 'od',
  ottomans: 'ot',
  ottoman: 'ot',
  rus: 'ru',
  zhuxislegacy: 'zx',
};

function normalizeCivilizationTokens(civilization?: string): string[] {
  if (!civilization) return [];
  const normalized = civilization.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return [];

  const tokens = new Set<string>([normalized]);
  if (civilizationAliasMap[normalized]) {
    tokens.add(civilizationAliasMap[normalized]);
  }
  if (normalized.length === 2) {
    tokens.add(normalized);
  }

  return [...tokens];
}

function normalizeCivilizationList(civs: string[] | undefined): string[] {
  return (civs ?? [])
    .map(civ => civ.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
}

function selectUnitVariantForCivilization(candidates: Unit[], civilization?: string): Unit | null {
  if (candidates.length === 0) return null;
  const civTokens = normalizeCivilizationTokens(civilization);
  if (civTokens.length === 0) return candidates[0];

  let bestCandidate: Unit | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const civs = normalizeCivilizationList(candidate.civs);
    let score = 0;
    if (civs.length === 0) {
      score = 1;
    } else if (civTokens.some(token => civs.includes(token))) {
      score = 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate ?? candidates[0];
}

function resolveUnitDefinition(unitId: string, index: CombatUnitIndex, civilization?: string): Unit | null {
  const exactKey = normalizeIdToken(unitId);
  const exact = index.byId[exactKey];
  if (exact) return selectUnitVariantForCivilization(exact, civilization);

  const stripped = stripTierSuffix(exactKey);
  const byBase = index.byBaseId[stripped] ?? index.byId[stripped];
  if (byBase) return selectUnitVariantForCivilization(byBase, civilization);

  return null;
}

function normalizeClassList(classes: string[]): string[] {
  return classes
    .map(value => value.toLowerCase().replace(/[_-]/g, ' '))
    .map(value => value.replace(/[^a-z0-9\s]/g, '').trim())
    .filter(Boolean);
}

function classListFromUnit(unit: Unit): string[] {
  return normalizeClassList([...(unit.classes ?? []), ...(unit.displayClasses ?? []), unit.name, unit.baseId]);
}

function getArmorValue(unit: Unit, type: 'melee' | 'ranged' | 'fire'): number {
  const armor = unit.armor ?? [];
  return armor.find(entry => entry.type === type)?.value ?? 0;
}

function normalizeWeaponModifiers(rawModifiers: unknown): CombatEffect[] {
  if (!Array.isArray(rawModifiers)) return [];

  const isObjectModifier = (modifier: unknown): modifier is {
    property: string;
    target?: CombatEffectSelector;
    effect: string;
    value: number;
    type?: string;
  } => {
    if (!modifier || typeof modifier !== 'object') return false;
    const candidate = modifier as Record<string, unknown>;
    return (
      typeof candidate.property === 'string' &&
      candidate.property.trim().length > 0 &&
      typeof candidate.effect === 'string' &&
      candidate.effect.trim().length > 0 &&
      Number.isFinite(candidate.value)
    );
  };

  return rawModifiers
    .filter(isObjectModifier)
    .map(modifier => ({
      property: modifier.property,
      target: modifier.target,
      effect: modifier.effect,
      value: Number(modifier.value ?? 0),
      type: modifier.type,
    }))
    .filter(modifier => Number.isFinite(modifier.value));
}

function unitCanOnlyAttackBuildings(unit: Unit): boolean {
  const description = (unit.description ?? '').toLowerCase();
  return description.includes('can only attack buildings');
}

function isChargeWeapon(weapon: {
  name: string;
  attribName?: string;
}): boolean {
  const name = weapon.name.toLowerCase();
  const attrib = (weapon.attribName ?? '').toLowerCase();
  return name.includes('lance') || attrib.includes('charge');
}

function normalizeWeapons(unit: Unit): CombatWeapon[] {
  if (unitCanOnlyAttackBuildings(unit)) return [];

  const weapons = unit.weapons ?? [];
  return weapons
    .filter(weapon => Number.isFinite(weapon.damage) && weapon.damage > 0)
    .filter(weapon => Number.isFinite(weapon.speed) && weapon.speed > 0)
    .filter(weapon => !weapon.name.toLowerCase().includes('torch'))
    .map(weapon => ({
      name: weapon.name,
      type: weapon.type,
      attribName: weapon.attribName,
      damage: weapon.damage,
      interval: weapon.speed,
      maxRange: weapon.range?.max ?? 0,
      isCharge: isChargeWeapon(weapon),
      modifiers: normalizeWeaponModifiers(weapon.modifiers),
    }));
}

function fallbackProfile(unit: UnitWithValue): CombatUnitProfile {
  const normalizedClasses = normalizeClassList(unit.classes);
  const looksReligious = normalizedClasses.some(cls => cls.includes('monk') || cls.includes('religious') || cls.includes('imam') || cls.includes('priest') || cls.includes('scholar') || cls.includes('prelate'));
  const basePower = Math.max(1, unit.effectiveValue / Math.max(1, unit.count));

  return {
    id: unit.unitId,
    baseId: stripTierSuffix(unit.unitId),
    name: unit.name,
    description: undefined,
    classes: normalizedClasses,
    unitValue: Math.max(1, unit.effectiveValue),
    hitpoints: Number(Math.max(1, basePower).toFixed(2)),
    meleeArmor: 0,
    rangedArmor: 0,
    fireArmor: 0,
    rangedResistance: 0,
    weapons: [],
    movementSpeed: 1.125,
    canAttackUnits: !looksReligious,
    source: 'fallback',
  };
}

function profileFromUnit(unit: UnitWithValue, index: CombatUnitIndex, civilization?: string): CombatUnitProfile {
  const definition = resolveUnitDefinition(unit.unitId, index, civilization);
  if (!definition) {
    return fallbackProfile(unit);
  }

  const normalizedClasses = classListFromUnit(definition);
  const weapons = normalizeWeapons(definition);
  if (weapons.length === 0) {
    const looksReligious = normalizedClasses.some(cls => cls.includes('monk') || cls.includes('religious') || cls.includes('imam') || cls.includes('priest') || cls.includes('scholar') || cls.includes('prelate'));
    const buildingOnlyAttacker = unitCanOnlyAttackBuildings(definition);

    if (looksReligious || buildingOnlyAttacker) {
      return {
        ...fallbackProfile({
          ...unit,
          unitId: definition.id,
          name: definition.name,
          classes: normalizedClasses,
        }),
        id: definition.id,
        baseId: definition.baseId,
        name: definition.name,
        description: definition.description,
        classes: normalizedClasses,
        unitValue: Math.max(1, unit.effectiveValue),
        movementSpeed: definition.movement?.speed ?? 1.125,
        canAttackUnits: false,
        source: 'catalog',
      };
    }

    return fallbackProfile({
      ...unit,
      unitId: definition.id,
      name: definition.name,
      classes: normalizedClasses,
    });
  }

  return {
    id: definition.id,
    baseId: definition.baseId,
    name: definition.name,
    description: definition.description,
    classes: normalizedClasses,
    unitValue: Math.max(1, unit.effectiveValue),
    hitpoints: definition.hitpoints ?? Math.max(1, unit.effectiveValue / Math.max(1, unit.count)),
    meleeArmor: getArmorValue(definition, 'melee'),
    rangedArmor: getArmorValue(definition, 'ranged'),
    fireArmor: getArmorValue(definition, 'fire'),
    rangedResistance: 0,
    weapons,
    movementSpeed: definition.movement?.speed ?? 1.125,
    canAttackUnits: weapons.length > 0,
    source: 'catalog',
  };
}

function matchesClassSelector(classValues: string[], selectorClasses: string[][]): boolean {
  if (selectorClasses.length === 0) return true;

  return selectorClasses.some(group =>
    group.every(rawToken => {
      const token = rawToken.toLowerCase().replace(/[_-]/g, ' ').trim();
      if (!token) return false;
      const pattern = new RegExp(`\\b${escapeRegex(token)}\\b`);
      return classValues.some(cls => pattern.test(cls));
    })
  );
}

function matchesIdSelector(profile: CombatUnitProfile, ids: string[]): boolean {
  if (ids.length === 0) return true;

  const unitId = normalizeIdToken(profile.id);
  const baseId = normalizeIdToken(profile.baseId);

  return ids.some(raw => {
    const token = normalizeIdToken(raw);
    return (
      token === unitId ||
      token === baseId ||
      unitId.startsWith(`${token}-`) ||
      baseId.startsWith(token)
    );
  });
}

function matchesSelector(profile: CombatUnitProfile, selector?: CombatEffectSelector): boolean {
  if (!selector) return true;

  const classMatch = selector.class ? matchesClassSelector(profile.classes, selector.class) : true;
  const idMatch = selector.id ? matchesIdSelector(profile, selector.id) : true;

  return classMatch && idMatch;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeEffects(effects: CombatEffect[] | undefined): CombatEffect[] {
  if (!effects) return [];
  return effects
    .filter(effect => effect && typeof effect === 'object')
    .map(effect => ({ ...effect, value: Number(effect.value) }))
    .filter(effect => effect.property && isFiniteNumber(effect.value));
}

function collectEffects(
  effects: CombatEffect[],
  property: string,
  unit: CombatUnitProfile,
  opponent: CombatUnitProfile | null,
  includeTargeted: boolean
): CombatEffect[] {
  return effects.filter(effect => {
    if (effect.property !== property) return false;
    if (!matchesSelector(unit, effect.select)) return false;

    if (effect.target) {
      if (!includeTargeted || !opponent) return false;
      return matchesSelector(opponent, effect.target);
    }

    return true;
  });
}

function applyEffects(base: number, effects: CombatEffect[]): number {
  if (effects.length === 0) return base;

  let additive = 0;
  let multiplier = 1;

  effects.forEach((effect) => {
    if (effect.effect === 'change') additive += effect.value;
    if (effect.effect === 'multiply') multiplier *= effect.value;
  });

  return (base + additive) * multiplier;
}

function weaponAttackProperty(weaponType: string): 'meleeAttack' | 'rangedAttack' | 'siegeAttack' | 'fireAttack' {
  if (weaponType === 'ranged') return 'rangedAttack';
  if (weaponType === 'siege') return 'siegeAttack';
  if (weaponType === 'fire') return 'fireAttack';
  return 'meleeAttack';
}

function weaponArmorType(weaponType: string): 'melee' | 'ranged' | 'fire' {
  if (weaponType === 'ranged' || weaponType === 'siege') return 'ranged';
  if (weaponType === 'fire') return 'fire';
  return 'melee';
}

function defenderArmorForType(defender: CombatUnitProfile, armorType: 'melee' | 'ranged' | 'fire', effects: CombatEffect[]): number {
  if (armorType === 'ranged') {
    const value = applyEffects(defender.rangedArmor, collectEffects(effects, 'rangedArmor', defender, null, false));
    return Number(value.toFixed(4));
  }
  if (armorType === 'fire') {
    const value = applyEffects(defender.fireArmor, collectEffects(effects, 'fireArmor', defender, null, false));
    return Number(value.toFixed(4));
  }
  const value = applyEffects(defender.meleeArmor, collectEffects(effects, 'meleeArmor', defender, null, false));
  return Number(value.toFixed(4));
}

function defenderRangedResistance(defender: CombatUnitProfile, effects: CombatEffect[]): number {
  const value = applyEffects(defender.rangedResistance, collectEffects(effects, 'rangedResistance', defender, null, false));
  return Number(value.toFixed(4));
}

function weaponCombatValuesAgainst(
  weapon: CombatWeapon,
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): { hitDamage: number; interval: number; dps: number } {
  const attackProperty = weaponAttackProperty(weapon.type);
  let damage = weapon.damage;

  const genericAttackEffects = collectEffects(attackerEffects, attackProperty, attacker, null, false);
  const targetedAttackEffects = collectEffects(attackerEffects, attackProperty, attacker, defender, true);
  damage = applyEffects(damage, [...genericAttackEffects, ...targetedAttackEffects]);

  const intrinsicGeneric = weapon.modifiers.filter(modifier => modifier.property === attackProperty && !modifier.target);
  const intrinsicTargeted = weapon.modifiers.filter(modifier => modifier.property === attackProperty && modifier.target && matchesSelector(defender, modifier.target));
  damage = applyEffects(damage, [...intrinsicGeneric, ...intrinsicTargeted]);

  const armorType = weaponArmorType(weapon.type);
  const armorValue = defenderArmorForType(defender, armorType, defenderEffects);
  let hitDamage = Math.max(1, damage - armorValue);

  if (weapon.type === 'ranged') {
    const resistancePct = defenderRangedResistance(defender, defenderEffects);
    hitDamage *= Math.max(0, 1 - (resistancePct / 100));
  }

  const speedEffects = collectEffects(attackerEffects, 'attackSpeed', attacker, null, false)
    .concat(collectEffects(attackerEffects, 'attackSpeed', attacker, defender, true))
    .concat(weapon.modifiers.filter(modifier => modifier.property === 'attackSpeed' && !modifier.target))
    .concat(weapon.modifiers.filter(modifier => modifier.property === 'attackSpeed' && modifier.target && matchesSelector(defender, modifier.target)));

  const interval = Math.max(0.2, applyEffects(weapon.interval, speedEffects));
  return {
    hitDamage: Number(hitDamage.toFixed(4)),
    interval: Number(interval.toFixed(4)),
    dps: Number((hitDamage / interval).toFixed(6)),
  };
}

interface SustainedDpsBreakdown {
  weaponName: string | null;
  hitDamage: number;
  interval: number;
  dps: number;
}

function sustainedDpsBreakdownAgainst(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): SustainedDpsBreakdown {
  const nonChargeWeapons = attacker.weapons.filter(weapon => !weapon.isCharge);
  const sustainedWeapons = nonChargeWeapons.length > 0 ? nonChargeWeapons : attacker.weapons;
  if (sustainedWeapons.length === 0) {
    return {
      weaponName: null,
      hitDamage: 0,
      interval: 1,
      dps: 0,
    };
  }

  return sustainedWeapons.reduce<SustainedDpsBreakdown>((best, weapon) => {
    const { hitDamage, interval, dps } = weaponCombatValuesAgainst(
      weapon,
      attacker,
      defender,
      attackerEffects,
      defenderEffects
    );
    if (dps <= best.dps) return best;
    return {
      weaponName: weapon.name,
      hitDamage: Number(hitDamage.toFixed(6)),
      interval: Number(interval.toFixed(6)),
      dps: Number(dps.toFixed(6)),
    };
  }, {
    weaponName: null,
    hitDamage: 0,
    interval: 1,
    dps: 0,
  });
}

function sustainedDpsAgainst(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): number {
  return sustainedDpsBreakdownAgainst(attacker, defender, attackerEffects, defenderEffects).dps;
}

function chargeOpeningDpsAgainst(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): number {
  const chargeWeapons = attacker.weapons.filter(weapon => weapon.isCharge);
  if (chargeWeapons.length === 0) return 0;

  const bestChargeHit = chargeWeapons.reduce((best, weapon) => {
    const { hitDamage } = weaponCombatValuesAgainst(weapon, attacker, defender, attackerEffects, defenderEffects);
    return Math.max(best, hitDamage);
  }, 0);

  if (bestChargeHit <= 0) return 0;

  const contactProbability = Math.min(1, Math.max(0, counterMatrixConfig.charge.contactProbability));
  const engagementSeconds = Math.max(1, counterMatrixConfig.charge.engagementSeconds);
  return (bestChargeHit * contactProbability) / engagementSeconds;
}

function maxWeaponRange(profile: CombatUnitProfile): number {
  return profile.weapons.reduce((maxRange, weapon) => Math.max(maxRange, weapon.maxRange ?? 0), 0);
}

function hasMeleeWeapon(profile: CombatUnitProfile): boolean {
  return profile.weapons.some(weapon => weapon.type === 'melee');
}

function hasRangedWeapon(profile: CombatUnitProfile): boolean {
  return profile.weapons.some(weapon => weapon.type === 'ranged');
}

interface MeleeUptimeBreakdown {
  value: number;
  raw: number;
  floor: number;
  rangeGap: number;
  rangePenaltyPerTile: number;
  speedDelta: number;
  speedCoefficient: number;
  speedAdjustment: number;
}

function meleeUptimeBreakdown(attacker: CombatUnitProfile, defender: CombatUnitProfile): MeleeUptimeBreakdown {
  if (!hasMeleeWeapon(attacker)) {
    return {
      value: 1,
      raw: 1,
      floor: 1,
      rangeGap: 0,
      rangePenaltyPerTile: 0,
      speedDelta: 0,
      speedCoefficient: 0,
      speedAdjustment: 0,
    };
  }

  const attackerRange = maxWeaponRange(attacker);
  const defenderRange = maxWeaponRange(defender);
  const rangeGap = Math.max(0, defenderRange - attackerRange);
  const speedDelta = (attacker.movementSpeed ?? 1.125) - (defender.movementSpeed ?? 1.125);
  const rangePenaltyPerTile = Math.max(0, counterMatrixConfig.meleeRangePenaltyPerTile);
  const speedCoefficient = speedDelta >= 0
    ? Math.max(0, counterMatrixConfig.meleeSpeedBonusPerDelta)
    : Math.max(0, counterMatrixConfig.meleeSpeedPenaltyPerDelta);
  const speedAdjustment = speedDelta * speedCoefficient;

  let uptime = 1 - (rangeGap * rangePenaltyPerTile);

  uptime += speedAdjustment;

  const floor = Math.max(0.1, Math.min(1, counterMatrixConfig.meleeUptimeFloor));
  const value = Math.max(floor, Math.min(1, uptime));

  return {
    value: Number(value.toFixed(6)),
    raw: Number(uptime.toFixed(6)),
    floor: Number(floor.toFixed(6)),
    rangeGap: Number(rangeGap.toFixed(6)),
    rangePenaltyPerTile: Number(rangePenaltyPerTile.toFixed(6)),
    speedDelta: Number(speedDelta.toFixed(6)),
    speedCoefficient: Number(speedCoefficient.toFixed(6)),
    speedAdjustment: Number(speedAdjustment.toFixed(6)),
  };
}

function meleeUptimeFactor(attacker: CombatUnitProfile, defender: CombatUnitProfile): number {
  return meleeUptimeBreakdown(attacker, defender).value;
}

function rangedOpeningDpsAgainst(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): number {
  if (!hasRangedWeapon(attacker) || !hasMeleeWeapon(defender)) return 0;

  const rangedWeapons = attacker.weapons.filter(weapon => weapon.type === 'ranged' && !weapon.isCharge);
  if (rangedWeapons.length === 0) return 0;

  const bestOpening = rangedWeapons.reduce((best, weapon) => {
    const values = weaponCombatValuesAgainst(weapon, attacker, defender, attackerEffects, defenderEffects);
    if (values.hitDamage <= 0) return best;
    const defenderRange = maxWeaponRange(defender);
    const rangeLead = Math.max(0, weapon.maxRange - defenderRange);
    if (rangeLead <= 0) return best;

    const openingShots = Math.max(
      0,
      Math.min(
        Math.max(1, counterMatrixConfig.rangedOpeningShotCap),
        Math.ceil(rangeLead / 1.6)
      )
    );
    if (openingShots <= 0) return best;
    const openingDamage = values.hitDamage * openingShots;
    const openingDps = openingDamage / Math.max(1, counterMatrixConfig.charge.engagementSeconds);
    return Math.max(best, openingDps);
  }, 0);

  return Number(bestOpening.toFixed(6));
}

function valueNormalizationMultiplier(attacker: CombatUnitProfile, defender: CombatUnitProfile): number {
  const attackerUnitValue = Math.max(1, attacker.unitValue);
  const defenderUnitValue = Math.max(1, defender.unitValue);
  const ratio = defenderUnitValue / attackerUnitValue;
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  const exponent = Math.max(0, counterMatrixConfig.valueNormalizationExponent) * 0.2;
  const normalized = Math.pow(ratio, exponent);
  return Number(Math.max(0.75, Math.min(1.25, normalized)).toFixed(6));
}

function equalResourceAdvantageRatio(
  attackerDps: number,
  attackerHp: number,
  attackerUnitValue: number,
  defenderDps: number,
  defenderHp: number,
  defenderUnitValue: number
): number {
  const attackerPerResource = (attackerDps * attackerHp) / Math.max(1, attackerUnitValue);
  const defenderPerResource = (defenderDps * defenderHp) / Math.max(1, defenderUnitValue);
  if (!Number.isFinite(attackerPerResource) || !Number.isFinite(defenderPerResource)) return 1;
  if (attackerPerResource <= 0 || defenderPerResource <= 0) return 1;
  return attackerPerResource / defenderPerResource;
}

function effectiveHitpoints(unit: CombatUnitProfile, effects: CombatEffect[]): number {
  const hp = applyEffects(unit.hitpoints, collectEffects(effects, 'hitpoints', unit, null, false));
  return Math.max(1, hp);
}

function primaryClass(profile: CombatUnitProfile): string {
  const pseudo: Unit = {
    id: profile.id,
    name: profile.name,
    baseId: profile.baseId,
    civs: [],
    costs: {},
    classes: profile.classes,
    displayClasses: profile.classes,
    age: 0,
    icon: '',
  };
  return classifyUnit(pseudo)[0] ?? 'unknown';
}

function profileCategories(profile: CombatUnitProfile): UnitClassCategory[] {
  const pseudo: Unit = {
    id: profile.id,
    name: profile.name,
    baseId: profile.baseId,
    civs: [],
    costs: {},
    classes: profile.classes,
    displayClasses: profile.classes,
    age: 0,
    icon: '',
  };
  return classifyUnit(pseudo);
}

function normalizeCounterToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/men$/g, 'man')
    .replace(/s$/g, '');
}

function tooltipCounterTokens(profile: CombatUnitProfile): string[] {
  const description = profile.description ?? '';
  const match = description.match(/countered by\s+([^.]+)/i);
  if (!match) return [];

  return match[1]
    .split(/,| and /i)
    .map(token => normalizeCounterToken(token))
    .filter(Boolean);
}

function isTooltipCounter(attacker: CombatUnitProfile, defender: CombatUnitProfile): boolean {
  const tokens = tooltipCounterTokens(defender);
  if (tokens.length === 0) return false;
  const attackerName = normalizeCounterToken(attacker.name);
  const attackerBaseId = normalizeCounterToken(attacker.baseId.replace(/-/g, ' '));

  return tokens.some((token) => (
    token === attackerName ||
    token === attackerBaseId ||
    attackerName.includes(token) ||
    attackerBaseId.includes(token) ||
    token.includes(attackerName) ||
    token.includes(attackerBaseId)
  ));
}

function dpsBreakdownAgainst(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): PairDpsBreakdown {
  const sustained = sustainedDpsBreakdownAgainst(attacker, defender, attackerEffects, defenderEffects);
  const meleeUptime = meleeUptimeBreakdown(attacker, defender);
  const chargeOpening = chargeOpeningDpsAgainst(attacker, defender, attackerEffects, defenderEffects);
  const rangedOpening = rangedOpeningDpsAgainst(attacker, defender, attackerEffects, defenderEffects);
  const total = (sustained.dps * meleeUptime.value) + chargeOpening + rangedOpening;

  return {
    weaponName: sustained.weaponName,
    hitDamage: Number(sustained.hitDamage.toFixed(6)),
    interval: Number(sustained.interval.toFixed(6)),
    sustainedDps: Number(sustained.dps.toFixed(6)),
    meleeUptime: Number(meleeUptime.value.toFixed(6)),
    meleeUptimeRaw: Number(meleeUptime.raw.toFixed(6)),
    meleeUptimeFloor: Number(meleeUptime.floor.toFixed(6)),
    meleeRangeGap: Number(meleeUptime.rangeGap.toFixed(6)),
    meleeRangePenaltyPerTile: Number(meleeUptime.rangePenaltyPerTile.toFixed(6)),
    meleeSpeedDelta: Number(meleeUptime.speedDelta.toFixed(6)),
    meleeSpeedCoefficient: Number(meleeUptime.speedCoefficient.toFixed(6)),
    meleeSpeedAdjustment: Number(meleeUptime.speedAdjustment.toFixed(6)),
    chargeOpeningDps: Number(chargeOpening.toFixed(6)),
    rangedOpeningDps: Number(rangedOpening.toFixed(6)),
    totalDps: Number(total.toFixed(6)),
  };
}

function pairComputationFromProfiles(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): PairCounterComputation {
  const floor = counterMatrixConfig.multiplierFloor;
  const ceiling = counterMatrixConfig.multiplierCeiling;
  const duelRootExponent = Math.max(0.1, counterMatrixConfig.duelRootExponent);
  const classMultiplier = evaluateClassCounter(profileCategories(attacker), profileCategories(defender)).value;
  const attackerHitpoints = effectiveHitpoints(attacker, attackerEffects);
  const defenderHitpoints = effectiveHitpoints(defender, defenderEffects);
  const attackerUnitValue = Math.max(1, attacker.unitValue);
  const defenderUnitValue = Math.max(1, defender.unitValue);

  const base: PairCounterComputation = {
    attackerUnitId: attacker.id,
    defenderUnitId: defender.id,
    attackerUnitName: attacker.name,
    defenderUnitName: defender.name,
    attacker: dpsBreakdownAgainst(attacker, defender, attackerEffects, defenderEffects),
    defender: dpsBreakdownAgainst(defender, attacker, defenderEffects, attackerEffects),
    attackerHitpoints: Number(attackerHitpoints.toFixed(6)),
    defenderHitpoints: Number(defenderHitpoints.toFixed(6)),
    attackerUnitValue: Number(attackerUnitValue.toFixed(6)),
    defenderUnitValue: Number(defenderUnitValue.toFixed(6)),
    attackerPerResource: 0,
    defenderPerResource: 0,
    equalResourceAdvantage: 1,
    duelRootExponent: Number(duelRootExponent.toFixed(6)),
    unclampedMultiplier: 1,
    multiplier: 1,
    clampMin: Number(floor.toFixed(6)),
    clampMax: Number(ceiling.toFixed(6)),
    usedFallback: false,
    forcedResultReason: null,
  };

  if (attacker.source === 'fallback' || defender.source === 'fallback') {
    base.usedFallback = true;
    base.forcedResultReason = 'catalog-fallback';
    base.unclampedMultiplier = Number(classMultiplier.toFixed(6));
    base.multiplier = Number(classMultiplier.toFixed(6));
    return base;
  }

  if (!attacker.canAttackUnits && !defender.canAttackUnits) {
    base.forcedResultReason = 'both-non-combat';
    return base;
  }
  if (!attacker.canAttackUnits) {
    base.forcedResultReason = 'attacker-non-combat';
    base.unclampedMultiplier = Number(floor.toFixed(6));
    base.multiplier = Number(floor.toFixed(6));
    return base;
  }
  if (!defender.canAttackUnits) {
    base.forcedResultReason = 'defender-non-combat';
    base.unclampedMultiplier = Number(ceiling.toFixed(6));
    base.multiplier = Number(ceiling.toFixed(6));
    return base;
  }

  const attackerDps = base.attacker.totalDps;
  const defenderDps = base.defender.totalDps;
  if (attackerDps <= 0 && defenderDps <= 0) {
    base.forcedResultReason = 'zero-dps-both';
    return base;
  }
  if (attackerDps <= 0) {
    base.forcedResultReason = 'zero-dps-attacker';
    base.unclampedMultiplier = Number(floor.toFixed(6));
    base.multiplier = Number(floor.toFixed(6));
    return base;
  }
  if (defenderDps <= 0) {
    base.forcedResultReason = 'zero-dps-defender';
    base.unclampedMultiplier = Number(ceiling.toFixed(6));
    base.multiplier = Number(ceiling.toFixed(6));
    return base;
  }

  const attackerPerResource = (attackerDps * attackerHitpoints) / attackerUnitValue;
  const defenderPerResource = (defenderDps * defenderHitpoints) / defenderUnitValue;
  const equalResourceAdvantage = equalResourceAdvantageRatio(
    attackerDps,
    attackerHitpoints,
    attackerUnitValue,
    defenderDps,
    defenderHitpoints,
    defenderUnitValue
  );
  const unclampedMultiplier = Math.pow(
    Math.max(0.0001, equalResourceAdvantage),
    duelRootExponent
  );
  const multiplier = Math.min(ceiling, Math.max(floor, unclampedMultiplier));

  base.attackerPerResource = Number(attackerPerResource.toFixed(6));
  base.defenderPerResource = Number(defenderPerResource.toFixed(6));
  base.equalResourceAdvantage = Number(equalResourceAdvantage.toFixed(6));
  base.unclampedMultiplier = Number(unclampedMultiplier.toFixed(6));
  base.multiplier = Number(multiplier.toFixed(6));

  return base;
}

function computePairMultiplier(
  attacker: CombatUnitProfile,
  defender: CombatUnitProfile,
  attackerEffects: CombatEffect[],
  defenderEffects: CombatEffect[]
): number {
  return pairComputationFromProfiles(attacker, defender, attackerEffects, defenderEffects).multiplier;
}

function impactLabel(multiplier: number, weight: number, rawValue: number): 'high' | 'medium' | 'low' {
  const deviation = Math.abs(multiplier - 1);
  const impactScore = deviation * weight * rawValue;
  if (impactScore >= rawValue * 0.2 * weight) return 'high';
  if (impactScore >= rawValue * 0.1 * weight) return 'medium';
  return 'low';
}

function combatEligibleArmy(
  army: UnitWithValue[],
  profiles: Map<string, CombatUnitProfile>
): UnitWithValue[] {
  return army.filter((unit) => {
    const profile = profiles.get(unit.unitId);
    return profile ? profile.canAttackUnits : true;
  });
}

function computeValueAdjustedArmy(
  attackingArmy: UnitWithValue[],
  defendingArmy: UnitWithValue[],
  defendingRawTotal: number,
  attackingEffects: CombatEffect[],
  defendingEffects: CombatEffect[],
  attackingProfiles: Map<string, CombatUnitProfile>,
  defendingProfiles: Map<string, CombatUnitProfile>
): { adjusted: number; details: MatchupDetail[]; breakdown: UnitAdjustedSummary[] } {
  const details: MatchupDetail[] = [];
  const perUnitTotals: Record<string, { raw: number; adjusted: number; name: string }> = {};

  const adjusted = attackingArmy.reduce((sum, attacker) => {
    const attackerProfile = attackingProfiles.get(attacker.unitId);
    if (!attackerProfile) return sum;

    const attackerRaw = attacker.count * attacker.effectiveValue;
    perUnitTotals[attacker.unitId] = perUnitTotals[attacker.unitId] ?? { raw: attackerRaw, adjusted: 0, name: attacker.name };

    if (defendingRawTotal === 0) {
      perUnitTotals[attacker.unitId].adjusted += attackerRaw;
      return sum + attackerRaw;
    }

    defendingArmy.forEach((defender) => {
      const defenderProfile = defendingProfiles.get(defender.unitId);
      if (!defenderProfile) return;

      const defenderRaw = defender.count * defender.effectiveValue;
      const defenderWeight = defendingRawTotal === 0 ? 0 : defenderRaw / defendingRawTotal;
      const counterMultiplier = computePairMultiplier(attackerProfile, defenderProfile, attackingEffects, defendingEffects);
      const valueAfterCounter = attackerRaw * counterMultiplier * defenderWeight;

      perUnitTotals[attacker.unitId].adjusted += valueAfterCounter;
      details.push({
        unit1Name: attacker.name,
        unit1Value: attackerRaw,
        unit1Class: primaryClass(attackerProfile),
        unit2Name: defender.name,
        unit2Value: defenderRaw,
        unit2Class: primaryClass(defenderProfile),
        counterMultiplier: Number(counterMultiplier.toFixed(2)),
        valueAfterCounter: Number(valueAfterCounter.toFixed(2)),
        impact: impactLabel(counterMultiplier, defenderWeight, attackerRaw),
        narrative: counterMultiplier === 1
          ? `${attacker.name} trades evenly into ${defender.name}`
          : `${attacker.name} ${counterMultiplier > 1 ? 'exploits' : 'is punished by'} ${defender.name} (${counterMultiplier.toFixed(2)}x)`
      });

      sum += valueAfterCounter;
    });

    return sum;
  }, 0);

  const breakdown: UnitAdjustedSummary[] = Object.values(perUnitTotals).map((entry) => ({
    unitName: entry.name,
    rawTotal: Number(entry.raw.toFixed(2)),
    adjustedTotal: Number(entry.adjusted.toFixed(2))
  }));

  return { adjusted, details, breakdown };
}

function summarizeExplanation(
  favoredArmy: 1 | 2 | 0,
  army1Raw: number,
  army2Raw: number,
  keyMatchups: MatchupDetail[]
): string {
  if (favoredArmy === 0) {
    return 'Direct engagement is roughly even after adjusting for combat stats and upgrades.';
  }

  const rawGap = army1Raw - army2Raw;
  const favoredHasRawDeficit = (favoredArmy === 1 && rawGap < 0) || (favoredArmy === 2 && rawGap > 0);
  const driver = keyMatchups[0]?.narrative ?? 'combat stat advantages';
  if (favoredHasRawDeficit) {
    return 'Combat stats and upgrades overcome the raw value disadvantage: ' + driver;
  }
  return 'Raw value lead is reinforced by ' + driver;
}

function selectKeyMatchups(
  favoredArmy: number,
  army1Matchups: MatchupScore[],
  army2Matchups: MatchupScore[]
): CounterMatchup[] {
  const source = favoredArmy === 2
    ? army2Matchups
    : favoredArmy === 1
      ? army1Matchups
      : [...army1Matchups, ...army2Matchups];

  return source
    .filter((item) => Math.abs(item.effectiveness - 1) > 0.01)
    .sort((a, b) => Math.abs(b.impactValue) - Math.abs(a.impactValue))
    .slice(0, 5)
    .map((item) => ({
      attacker: item.attackerId,
      defender: item.defenderId,
      effectiveness: Number(item.effectiveness.toFixed(2)),
      impact: `Weighted impact ${item.impactValue >= 0 ? '+' : ''}${item.impactValue.toFixed(2)}`
    }));
}

export function calculateValueAdjustedMatchup(
  army1: UnitWithValue[],
  army2: UnitWithValue[],
  options: ValueAdjustedMatchupOptions = {}
): ValueAdjustedMatchup {
  const unitIndex = getUnitIndex(options.unitCatalog);
  const player1Profiles = new Map<string, CombatUnitProfile>();
  const player2Profiles = new Map<string, CombatUnitProfile>();

  army1.forEach((unit) => {
    if (!player1Profiles.has(unit.unitId)) {
      player1Profiles.set(
        unit.unitId,
        profileFromUnit(unit, unitIndex, options.player1Civilization)
      );
    }
  });

  army2.forEach((unit) => {
    if (!player2Profiles.has(unit.unitId)) {
      player2Profiles.set(
        unit.unitId,
        profileFromUnit(unit, unitIndex, options.player2Civilization)
      );
    }
  });

  const combatArmy1 = combatEligibleArmy(army1, player1Profiles);
  const combatArmy2 = combatEligibleArmy(army2, player2Profiles);

  const army1Effects = normalizeEffects(options.player1Effects);
  const army2Effects = normalizeEffects(options.player2Effects);

  const army1RawValue = combatArmy1.reduce((sum, unit) => sum + unit.count * unit.effectiveValue, 0);
  const army2RawValue = combatArmy2.reduce((sum, unit) => sum + unit.count * unit.effectiveValue, 0);

  const army1Result = computeValueAdjustedArmy(
    combatArmy1,
    combatArmy2,
    army2RawValue,
    army1Effects,
    army2Effects,
    player1Profiles,
    player2Profiles
  );
  const army2Result = computeValueAdjustedArmy(
    combatArmy2,
    combatArmy1,
    army1RawValue,
    army2Effects,
    army1Effects,
    player2Profiles,
    player1Profiles
  );

  const army1AdjustedValue = Number(army1Result.adjusted.toFixed(2));
  const army2AdjustedValue = Number(army2Result.adjusted.toFixed(2));

  const favoredArmy: 1 | 2 | 0 =
    army1AdjustedValue > army2AdjustedValue + 0.01 ? 1 : army2AdjustedValue > army1AdjustedValue + 0.01 ? 2 : 0;

  const favoredValue = favoredArmy === 1 ? army1AdjustedValue : army2AdjustedValue;
  const underdogValue = favoredArmy === 1 ? army2AdjustedValue : army1AdjustedValue;
  const advantagePercent =
    favoredArmy === 0 || underdogValue === 0 ? 0 : Number(((favoredValue - underdogValue) / underdogValue).toFixed(4));

  const allDetails = [...army1Result.details, ...army2Result.details].sort((a, b) => {
    const aImpact = Math.abs(a.counterMultiplier - 1) * a.valueAfterCounter;
    const bImpact = Math.abs(b.counterMultiplier - 1) * b.valueAfterCounter;
    return bImpact - aImpact;
  });
  const keyMatchups = allDetails.slice(0, 5);

  return {
    army1RawValue: Number(army1RawValue.toFixed(2)),
    army2RawValue: Number(army2RawValue.toFixed(2)),
    army1AdjustedValue,
    army2AdjustedValue,
    favoredArmy,
    advantagePercent,
    keyMatchups,
    explanation: summarizeExplanation(favoredArmy, army1RawValue, army2RawValue, keyMatchups),
    army1Breakdown: army1Result.breakdown,
    army2Breakdown: army2Result.breakdown
  };
}

export function calculatePairCounterComputation(
  attacker: UnitWithValue,
  defender: UnitWithValue,
  options: ValueAdjustedMatchupOptions = {}
): PairCounterComputation {
  const unitIndex = getUnitIndex(options.unitCatalog);
  const attackerProfile = profileFromUnit(attacker, unitIndex, options.player1Civilization);
  const defenderProfile = profileFromUnit(defender, unitIndex, options.player2Civilization);
  const attackerEffects = normalizeEffects(options.player1Effects);
  const defenderEffects = normalizeEffects(options.player2Effects);

  return pairComputationFromProfiles(
    attackerProfile,
    defenderProfile,
    attackerEffects,
    defenderEffects
  );
}

export function analyzeArmyMatchup(
  army1: UnitCount[],
  army2: UnitCount[],
  unitsById?: Record<string, Unit>
): MatchupAnalysis {
  const index = getUnitIndex();
  const lookup = unitsById ?? index.byId;
  const unitCatalog: Unit[] = unitsById
    ? Object.values(unitsById)
    : Object.values(index.byId)
      .map(units => units[0])
      .filter((unit): unit is Unit => Boolean(unit));

  const toValueArmy = (army: UnitCount[]): UnitWithValue[] =>
    army.map((entry) => {
      const id = normalizeIdToken(entry.unitId);
      const primaryMatch = lookup[id];
      const baseMatch = index.byBaseId[stripTierSuffix(id)];
      const unit = Array.isArray(primaryMatch)
        ? primaryMatch[0]
        : (primaryMatch ?? baseMatch?.[0]);
      return {
        unitId: entry.unitId,
        name: unit?.name ?? entry.unitId,
        count: entry.count,
        effectiveValue: entry.effectiveValue,
        classes: unit?.classes ?? []
      };
    });

  const valueArmy1 = toValueArmy(army1);
  const valueArmy2 = toValueArmy(army2);
  const matchup = calculateValueAdjustedMatchup(valueArmy1, valueArmy2, {
    unitCatalog
  });

  const score = Number((matchup.army1AdjustedValue - matchup.army2AdjustedValue).toFixed(2));

  const toMatchupScore = (item: MatchupDetail): MatchupScore => ({
    attackerId: item.unit1Name,
    defenderId: item.unit2Name,
    effectiveness: item.counterMultiplier,
    impactValue: Math.abs(item.counterMultiplier - 1) * item.valueAfterCounter
  });
  const matchupScores = matchup.keyMatchups.map(toMatchupScore);

  const army1UnitNames = new Set(valueArmy1.map(unit => unit.name));
  const army2UnitNames = new Set(valueArmy2.map(unit => unit.name));
  const army1Matchups = matchup.keyMatchups
    .filter(item => army1UnitNames.has(item.unit1Name))
    .map(toMatchupScore);
  const army2Matchups = matchup.keyMatchups
    .filter(item => army2UnitNames.has(item.unit1Name))
    .map(toMatchupScore);

  return {
    favoredArmy: matchup.favoredArmy,
    score,
    advantagePercent: matchup.advantagePercent,
    keyMatchups: selectKeyMatchups(
      matchup.favoredArmy,
      army1Matchups.length > 0 ? army1Matchups : matchupScores,
      army2Matchups.length > 0 ? army2Matchups : matchupScores
    )
  };
}

export function formatValueAdjustedMatchup(
  matchup: ValueAdjustedMatchup,
  player1Name: string,
  player2Name: string
): string {
  const favoredLabel =
    matchup.favoredArmy === 1 ? player1Name : matchup.favoredArmy === 2 ? player2Name : 'Even';
  const advantageLabel =
    matchup.favoredArmy === 0
      ? ''
      : ` (+${(matchup.advantagePercent * 100).toFixed(1)}% adjusted edge)`;

  const lines = [
    'Raw Values:',
    `  ${player1Name}: ${matchup.army1RawValue.toFixed(2)}`,
    `  ${player2Name}: ${matchup.army2RawValue.toFixed(2)}`,
    '',
    'Adjusted Values:',
    `  ${player1Name}: ${matchup.army1AdjustedValue.toFixed(2)}`,
    `  ${player2Name}: ${matchup.army2AdjustedValue.toFixed(2)}`,
    '',
    `Favored: ${favoredLabel}${advantageLabel}`,
    `Explanation: ${matchup.explanation}`,
    '',
    'Key Matchups:'
  ];

  matchup.keyMatchups.forEach((md) => {
    lines.push(
      `  - ${md.unit1Name} (${md.unit1Class}) vs ${md.unit2Name} (${md.unit2Class}): ` +
        `${md.counterMultiplier.toFixed(2)}x -> ${md.valueAfterCounter.toFixed(2)} (${md.narrative}) [impact: ${md.impact}]`
    );
  });

  lines.push('', 'Army 1 Breakdown:');
  matchup.army1Breakdown.forEach((entry) => {
    lines.push(`  - ${entry.unitName}: raw ${entry.rawTotal.toFixed(2)} -> adjusted ${entry.adjustedTotal.toFixed(2)}`);
  });
  lines.push('', 'Army 2 Breakdown:');
  matchup.army2Breakdown.forEach((entry) => {
    lines.push(`  - ${entry.unitName}: raw ${entry.rawTotal.toFixed(2)} -> adjusted ${entry.adjustedTotal.toFixed(2)}`);
  });

  return lines.join('\n');
}
