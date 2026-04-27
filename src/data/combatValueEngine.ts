import { Unit, UnitWithValue } from '../types';
import {
  calculatePairCounterComputation,
  calculateValueAdjustedMatchup,
  PairCounterComputation,
  ValueAdjustedMatchupOptions
} from './counterMatrix';

export interface CombatValueEvaluation {
  matchup: ReturnType<typeof calculateValueAdjustedMatchup>;
  army1CounterRatio: number;
  army2CounterRatio: number;
}

function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 1;
  return numerator / denominator;
}

export function unitMarketValueFromStaticUnit(unit: Unit): number {
  const costs = unit.costs ?? {};
  const total =
    (costs.food ?? 0) +
    (costs.wood ?? 0) +
    (costs.gold ?? 0) +
    (costs.stone ?? 0);

  return Math.max(1, total);
}

export function evaluateCombatValue(
  army1: UnitWithValue[],
  army2: UnitWithValue[],
  options: ValueAdjustedMatchupOptions = {}
): CombatValueEvaluation {
  const matchup = calculateValueAdjustedMatchup(army1, army2, options);
  return {
    matchup,
    army1CounterRatio: safeRatio(matchup.army1AdjustedValue, matchup.army1RawValue),
    army2CounterRatio: safeRatio(matchup.army2AdjustedValue, matchup.army2RawValue),
  };
}

function unitToSingleValueRow(unit: Unit): UnitWithValue {
  return {
    unitId: unit.id,
    name: unit.name,
    count: 1,
    effectiveValue: unitMarketValueFromStaticUnit(unit),
    classes: unit.classes ?? [],
  };
}

function unitCivilization(unit: Unit): string | undefined {
  const civs = unit.civs ?? [];
  return civs.find(civ => civ.trim().length > 0);
}

export function evaluateUnitPairCounterMultiplier(
  attacker: Unit,
  defender: Unit,
  unitCatalog: Unit[]
): number {
  const evaluation = evaluateCombatValue(
    [unitToSingleValueRow(attacker)],
    [unitToSingleValueRow(defender)],
    {
      unitCatalog,
      player1Civilization: unitCivilization(attacker),
      player2Civilization: unitCivilization(defender),
    }
  );

  if (!Number.isFinite(evaluation.army1CounterRatio) || evaluation.army1CounterRatio <= 0) return 1;
  return Number(evaluation.army1CounterRatio.toFixed(4));
}

export function evaluateUnitPairCounterComputation(
  attacker: UnitWithValue,
  defender: UnitWithValue,
  options: ValueAdjustedMatchupOptions = {}
): PairCounterComputation {
  return calculatePairCounterComputation(attacker, defender, options);
}
