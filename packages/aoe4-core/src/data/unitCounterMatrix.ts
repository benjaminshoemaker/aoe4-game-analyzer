import fs from 'fs';
import path from 'path';
import { evaluateUnitPairCounterMultiplier } from './combatValueEngine';
import { Unit } from '../types';

export interface UnitCounterProfileRow {
  unit: Unit;
  bonusTargets: string[];
  weaknesses: string[];
}

export interface UnitCounterMatrixData {
  units: Unit[];
  unitRows: UnitCounterProfileRow[];
  values: number[][];
}

const BUILDING_ONLY_ATTACK_TEXT = 'can only attack buildings';

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim();
}

function isCombatCapable(unit: Unit): boolean {
  if ((unit.description ?? '').toLowerCase().includes(BUILDING_ONLY_ATTACK_TEXT)) {
    return false;
  }

  const weapons = unit.weapons ?? [];
  return weapons.some((weapon) => {
    const name = (weapon.name ?? '').toLowerCase();
    if (name.includes('torch')) return false;
    return (
      Number.isFinite(weapon.damage) &&
      weapon.damage > 0 &&
      Number.isFinite(weapon.speed) &&
      weapon.speed > 0
    );
  });
}

export function parseUnitCatalogFromJson(payload: unknown): Unit[] {
  if (Array.isArray(payload)) {
    return payload as Unit[];
  }

  if (payload && typeof payload === 'object') {
    const wrapped = payload as { units?: unknown };
    if (Array.isArray(wrapped.units)) {
      return wrapped.units as Unit[];
    }
  }

  throw new Error('Expected unit catalog JSON as an array or an object with a units[] field');
}

export function extractUnitWeaknesses(unit: Unit): string[] {
  const description = unit.description ?? '';
  const match = description.match(/countered by\s+([^.]+)/i);
  if (!match) return [];

  return [...new Set(
    match[1]
      .split(/,| and /i)
      .map(token => normalizeToken(token))
      .filter(Boolean)
  )];
}

export function extractUnitBonusTargets(unit: Unit): string[] {
  const formatted = new Set<string>();
  const weapons = unit.weapons ?? [];

  for (const weapon of weapons) {
    const modifiers = weapon.modifiers ?? [];
    for (const modifier of modifiers) {
      if (!modifier || typeof modifier !== 'object' || !modifier.target) continue;
      const rawValue = Number(modifier.value ?? 0);
      if (!Number.isFinite(rawValue)) continue;
      if (modifier.effect === 'change' && rawValue <= 0) continue;
      if (modifier.effect === 'multiply' && rawValue <= 1) continue;

      const targets: string[] = [];
      const classTargets = modifier.target.class ?? [];
      for (const classGroup of classTargets) {
        if (!Array.isArray(classGroup)) continue;
        const normalizedGroup = classGroup
          .map(token => normalizeToken(token))
          .filter(Boolean);
        if (normalizedGroup.length === 0) continue;
        targets.push(`class:${normalizedGroup.join('&')}`);
      }

      const idTargets = modifier.target.id ?? [];
      for (const rawId of idTargets) {
        const normalizedId = normalizeToken(rawId);
        if (!normalizedId) continue;
        targets.push(`id:${normalizedId}`);
      }

      if (targets.length === 0) continue;
      const property = sanitizeCell(modifier.property ?? weapon.type ?? 'attack');
      const effectLabel =
        modifier.effect === 'multiply'
          ? `x${Number(rawValue.toFixed(2))}`
          : `+${Number(rawValue.toFixed(2))}`;
      for (const target of targets) {
        formatted.add(`${property} ${effectLabel} vs ${target}`);
      }
    }
  }

  return [...formatted].sort((a, b) => a.localeCompare(b));
}

function representativeScore(unit: Unit): number {
  const descriptionScore = (unit.description ?? '').length;
  const weapons = unit.weapons ?? [];
  const weaponScore = weapons.length * 100;
  const modifierScore = weapons.reduce((sum, weapon) => sum + (weapon.modifiers?.length ?? 0), 0) * 1000;
  const classScore = (unit.classes?.length ?? 0) * 10;
  return modifierScore + weaponScore + classScore + descriptionScore;
}

function pickRepresentativeUnits(units: Unit[], includeNonCombat: boolean): Unit[] {
  const byId = new Map<string, Unit>();

  for (const unit of units) {
    if (!includeNonCombat && !isCombatCapable(unit)) continue;
    const existing = byId.get(unit.id);
    if (!existing) {
      byId.set(unit.id, unit);
      continue;
    }

    if (representativeScore(unit) > representativeScore(existing)) {
      byId.set(unit.id, unit);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function attackerMultiplier(attacker: Unit, defender: Unit, unitCatalog: Unit[]): number {
  return evaluateUnitPairCounterMultiplier(attacker, defender, unitCatalog);
}

export function buildUnitCounterMatrix(
  units: Unit[],
  options: { includeNonCombat?: boolean } = {}
): UnitCounterMatrixData {
  const includeNonCombat = options.includeNonCombat ?? false;
  const selectedUnits = pickRepresentativeUnits(units, includeNonCombat);
  const unitRows: UnitCounterProfileRow[] = selectedUnits.map(unit => ({
    unit,
    bonusTargets: extractUnitBonusTargets(unit),
    weaknesses: extractUnitWeaknesses(unit),
  }));

  const values = selectedUnits.map((attacker, attackerIndex) =>
    selectedUnits.map((defender, defenderIndex) => {
      if (attackerIndex === defenderIndex) return 1;
      return attackerMultiplier(attacker, defender, units);
    })
  );

  return {
    units: selectedUnits,
    unitRows,
    values,
  };
}

export function formatUnitCounterMatrixTsv(matrix: UnitCounterMatrixData): string {
  const header = ['attacker_vs_defender', ...matrix.units.map(unit => unit.id)].join('\t');
  const rows = matrix.units.map((attacker, attackerIndex) => {
    const values = matrix.values[attackerIndex].map(value => value.toFixed(4));
    return [attacker.id, ...values].join('\t');
  });

  return `${[header, ...rows].join('\n')}\n`;
}

export function formatUnitCounterProfilesTsv(matrix: UnitCounterMatrixData): string {
  const header = 'unit_id\tunit_name\tcivs\tbonus_targets\tweaknesses';
  const rows = matrix.unitRows.map(({ unit, bonusTargets, weaknesses }) => {
    const civs = sanitizeCell((unit.civs ?? []).join(','));
    const bonuses = sanitizeCell(bonusTargets.join(' | '));
    const weak = sanitizeCell(weaknesses.join(' | '));
    return [
      sanitizeCell(unit.id),
      sanitizeCell(unit.name),
      civs,
      bonuses,
      weak,
    ].join('\t');
  });

  return `${[header, ...rows].join('\n')}\n`;
}

export function writeUnitCounterMatrixArtifacts(params: {
  units: Unit[];
  outPath: string;
  profilesOutPath: string;
  includeNonCombat?: boolean;
}): UnitCounterMatrixData {
  const matrix = buildUnitCounterMatrix(params.units, {
    includeNonCombat: params.includeNonCombat,
  });
  const matrixTsv = formatUnitCounterMatrixTsv(matrix);
  const profileTsv = formatUnitCounterProfilesTsv(matrix);

  fs.mkdirSync(path.dirname(params.outPath), { recursive: true });
  fs.mkdirSync(path.dirname(params.profilesOutPath), { recursive: true });
  fs.writeFileSync(params.outPath, matrixTsv, 'utf-8');
  fs.writeFileSync(params.profilesOutPath, profileTsv, 'utf-8');

  return matrix;
}
