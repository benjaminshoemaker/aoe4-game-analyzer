import fs from 'fs';
import path from 'path';
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

const STATIC_DATA_PATH = path.resolve(__dirname, './staticData.json');
let cachedUnits: Record<string, Unit> | null = null;

const counterMatrix: Record<UnitClassCategory, Partial<Record<UnitClassCategory, number>>> = {
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

function setEffectiveness(attacker: UnitClassCategory, defender: UnitClassCategory, value: number): void {
  counterMatrix[attacker][defender] = value;
}

function setSymmetricEffect(attacker: UnitClassCategory, defender: UnitClassCategory, value: number): void {
  setEffectiveness(attacker, defender, value);
  const reciprocal = Number((1 / value).toFixed(2));
  setEffectiveness(defender, attacker, reciprocal);
}

const baseCounterPairs: Array<[UnitClassCategory, UnitClassCategory, number]> = [
  // Spearmen vs cavalry
  ['spearman', 'heavy_melee_cavalry', 1.5],
  ['spearman', 'light_melee_cavalry', 1.4],
  ['spearman', 'light_ranged_cavalry', 1.4],
  // Crossbows / gunpowder vs heavy armor
  ['heavy_ranged_infantry', 'heavy_melee_infantry', 1.5],
  ['heavy_ranged_infantry', 'heavy_melee_cavalry', 1.4],
  ['heavy_ranged_infantry', 'light_melee_infantry', 0.9],
  ['heavy_ranged_infantry', 'light_melee_cavalry', 0.7],
  ['heavy_ranged_infantry', 'siege', 1.1],
  ['heavy_ranged_infantry', 'monk', 1.2],
  // Stat advantages
  ['heavy_melee_infantry', 'light_melee_infantry', 1.3],
  // Cavalry dives ranged and light infantry (but countered by crossbows)
  ['heavy_melee_cavalry', 'ranged_infantry', 1.4],
  ['heavy_melee_cavalry', 'light_melee_infantry', 1.3],
  ['heavy_melee_cavalry', 'light_melee_cavalry', 1.1],
  ['heavy_melee_cavalry', 'siege', 1.5],
  ['heavy_melee_cavalry', 'monk', 1.3],
  // Light cav cleanup
  ['light_melee_cavalry', 'siege', 1.5],
  ['light_ranged_cavalry', 'siege', 1.5],
  ['light_melee_cavalry', 'monk', 1.5],
  ['light_ranged_cavalry', 'monk', 1.5],
  // Archers vs light infantry
  ['ranged_infantry', 'light_melee_infantry', 1.25],
  ['ranged_infantry', 'spearman', 1.25],
  // Men-at-Arms vs archers
  ['heavy_melee_infantry', 'ranged_infantry', 1.25]
];

baseCounterPairs.forEach(([attacker, defender, value]) => setSymmetricEffect(attacker, defender, value));

function normalizeValues(values: string[]): string[] {
  return values
    .filter(Boolean)
    .map((value) => value.toLowerCase().replace(/[_-]/g, ' '))
    .map((value) => value.replace(/[^a-z0-9\s]/g, '').trim());
}

function loadUnitsFromDisk(): Record<string, Unit> {
  if (cachedUnits) {
    return cachedUnits;
  }

  try {
    const raw = fs.readFileSync(STATIC_DATA_PATH, 'utf-8');
    const data = JSON.parse(raw) as { units?: Unit[] };
    cachedUnits = (data.units ?? []).reduce((acc, unit) => {
      acc[unit.id] = unit;
      return acc;
    }, {} as Record<string, Unit>);
  } catch {
    cachedUnits = {};
  }

  return cachedUnits;
}

export function classifyUnit(unit: Unit): UnitClassCategory[] {
  const normalized = normalizeValues([...(unit.classes ?? []), ...(unit.displayClasses ?? []), unit.name, unit.baseId]);

  const categories: UnitClassCategory[] = [];
  const addCategory = (category: UnitClassCategory): void => {
    if (!categories.includes(category)) {
      categories.push(category);
    }
  };

  const hasKeyword = (keyword: string): boolean => normalized.some((value) => value.includes(keyword));
  const hasAllKeywords = (keywords: string[]): boolean =>
    normalized.some((value) => keywords.every((keyword) => value.includes(keyword)));

  if (hasKeyword('hero') || hasKeyword('jeanne') || hasKeyword('khan') || hasKeyword('daimyo')) {
    addCategory('hero');
  }

  if (hasKeyword('monk') || hasKeyword('imam') || hasKeyword('prelate') || hasKeyword('scholar') || hasKeyword('religious')) {
    addCategory('monk');
  }

  if (
    hasKeyword('siege') ||
    hasKeyword('ram') ||
    hasKeyword('bombard') ||
    hasKeyword('mangonel') ||
    hasKeyword('trebuchet') ||
    hasKeyword('springald')
  ) {
    addCategory('siege');
  }

  if (hasKeyword('spear') || hasKeyword('pike')) {
    addCategory('spearman');
  }

  if (hasKeyword('crossbow') || hasKeyword('arbaletrier') || hasKeyword('handcannon')) {
    addCategory('heavy_ranged_infantry');
  } else if (hasAllKeywords(['heavy', 'ranged', 'infantry'])) {
    addCategory('heavy_ranged_infantry');
  }

  if (hasAllKeywords(['ranged', 'cavalry']) || hasKeyword('horse archer') || hasKeyword('mangudai')) {
    addCategory('light_ranged_cavalry');
  }

  if (hasAllKeywords(['light', 'melee', 'cavalry']) || hasKeyword('horseman') || hasKeyword('sofa')) {
    addCategory('light_melee_cavalry');
  }

  if (hasAllKeywords(['heavy', 'melee', 'cavalry']) || hasKeyword('knight') || hasKeyword('lancer')) {
    addCategory('heavy_melee_cavalry');
  }

  if (hasAllKeywords(['heavy', 'melee', 'infantry']) || hasKeyword('man at arms') || hasKeyword('samurai')) {
    addCategory('heavy_melee_infantry');
  }

  if (!categories.includes('heavy_ranged_infantry') && (hasKeyword('archer') || (hasKeyword('ranged') && hasKeyword('infantry')))) {
    addCategory('ranged_infantry');
  }

  if (!categories.includes('spearman') && (hasAllKeywords(['light', 'melee', 'infantry']) || hasKeyword('musofadi') || hasKeyword('warrior'))) {
    addCategory('light_melee_infantry');
  }

  return categories;
}

function classifyUnitWithValue(unit: UnitWithValue): UnitClassCategory[] {
  const pseudoUnit: Unit = {
    id: unit.unitId,
    name: unit.name,
    baseId: unit.unitId,
    civs: [],
    costs: {},
    classes: unit.classes,
    displayClasses: unit.classes,
    age: 0,
    icon: ''
  };
  return classifyUnit(pseudoUnit);
}

function evaluateCounter(attackerClasses: UnitClassCategory[], defenderClasses: UnitClassCategory[]): {
  value: number;
  attackerClass: UnitClassCategory | null;
  defenderClass: UnitClassCategory | null;
} {
  let bestValue = 1.0;
  let bestAttacker: UnitClassCategory | null = null;
  let bestDefender: UnitClassCategory | null = null;

  attackerClasses.forEach((attacker) => {
    defenderClasses.forEach((defender) => {
      const effectiveness = counterMatrix[attacker]?.[defender];
      if (effectiveness === undefined) {
        return;
      }

      const shouldReplace = effectiveness > bestValue || (bestValue === 1.0 && effectiveness < 1.0);
      if (shouldReplace) {
        bestValue = effectiveness;
        bestAttacker = attacker;
        bestDefender = defender;
      }
    });
  });

  return { value: bestValue, attackerClass: bestAttacker, defenderClass: bestDefender };
}

export function getCounterEffectiveness(attackerClasses: string[], defenderClasses: string[]): number {
  const { value } = evaluateCounter(
    attackerClasses as UnitClassCategory[],
    defenderClasses as UnitClassCategory[]
  );
  return value;
}

interface MatchupScore {
  attackerId: string;
  defenderId: string;
  effectiveness: number;
  impactValue: number;
}

function computeArmyScore(
  attackingArmy: UnitCount[],
  defendingArmy: UnitCount[],
  unitsById: Record<string, Unit>,
  classCache: Record<string, UnitClassCategory[]>
): { totalScore: number; matchups: MatchupScore[] } {
  const defendingStrength = defendingArmy.reduce((sum, unit) => sum + unit.count * unit.effectiveValue, 0);
  const matchups: MatchupScore[] = [];

  const resolveClasses = (unitId: string): UnitClassCategory[] => {
    if (classCache[unitId]) {
      return classCache[unitId];
    }
    const unit = unitsById[unitId];
    const classes = unit ? classifyUnit(unit) : [];
    classCache[unitId] = classes;
    return classes;
  };

  const totalScore = attackingArmy.reduce((score, attacker) => {
    const attackerClasses = resolveClasses(attacker.unitId);
    const attackerPower = attacker.count * attacker.effectiveValue;
    if (defendingStrength === 0) {
      return score + attackerPower;
    }

    let weightedEffectiveness = 0;

    defendingArmy.forEach((defender) => {
      const defenderClasses = resolveClasses(defender.unitId);
      const defenderWeight = (defender.count * defender.effectiveValue) / defendingStrength;
      const { value: effectiveness } = evaluateCounter(attackerClasses, defenderClasses);
      const impactValue = attackerPower * defenderWeight * (effectiveness - 1);

      weightedEffectiveness += effectiveness * defenderWeight;
      if (Math.abs(impactValue) > 0.001) {
        matchups.push({
          attackerId: attacker.unitId,
          defenderId: defender.unitId,
          effectiveness,
          impactValue
        });
      }
    });

    return score + attackerPower * weightedEffectiveness;
  }, 0);

  return { totalScore, matchups };
}

function selectKeyMatchups(
  favoredArmy: number,
  army1Matchups: MatchupScore[],
  army2Matchups: MatchupScore[]
): CounterMatchup[] {
  const source = favoredArmy === 2 ? army2Matchups : favoredArmy === 1 ? army1Matchups : [...army1Matchups, ...army2Matchups];
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

export function analyzeArmyMatchup(
  army1: UnitCount[],
  army2: UnitCount[],
  unitsById?: Record<string, Unit>
): MatchupAnalysis {
  const lookup = unitsById ?? loadUnitsFromDisk();
  const classCache: Record<string, UnitClassCategory[]> = {};

  const army1Result = computeArmyScore(army1, army2, lookup, classCache);
  const army2Result = computeArmyScore(army2, army1, lookup, classCache);

  const scoreDifference = army1Result.totalScore - army2Result.totalScore;
  const totalScore = army1Result.totalScore + army2Result.totalScore;
  const advantagePercent = totalScore === 0 ? 0 : Math.abs(scoreDifference) / totalScore;

  const favoredArmy = scoreDifference > 0.001 ? 1 : scoreDifference < -0.001 ? 2 : 0;

  return {
    favoredArmy,
    score: Number(scoreDifference.toFixed(2)),
    advantagePercent: Number(advantagePercent.toFixed(4)),
    keyMatchups: selectKeyMatchups(favoredArmy, army1Result.matchups, army2Result.matchups)
  };
}

function impactLabel(multiplier: number, weight: number, rawValue: number): 'high' | 'medium' | 'low' {
  const deviation = Math.abs(multiplier - 1);
  const impactScore = deviation * weight * rawValue;
  if (impactScore >= rawValue * 0.2 * weight) {
    return 'high';
  }
  if (impactScore >= rawValue * 0.1 * weight) {
    return 'medium';
  }
  return 'low';
}

function computeValueAdjustedArmy(
  attackingArmy: UnitWithValue[],
  defendingArmy: UnitWithValue[],
  defendingRawTotal: number,
  classCache: Record<string, UnitClassCategory[]>
): { adjusted: number; details: MatchupDetail[]; breakdown: UnitAdjustedSummary[] } {
  const details: MatchupDetail[] = [];
  const perUnitTotals: Record<string, { raw: number; adjusted: number; name: string }> = {};

  const adjusted = attackingArmy.reduce((sum, attacker) => {
    const attackerClasses = classCache[attacker.unitId] ?? classifyUnitWithValue(attacker);
    classCache[attacker.unitId] = attackerClasses;
    const attackerRaw = attacker.count * attacker.effectiveValue;
    perUnitTotals[attacker.unitId] = perUnitTotals[attacker.unitId] ?? { raw: attackerRaw, adjusted: 0, name: attacker.name };

    if (defendingRawTotal === 0) {
      return sum + attackerRaw;
    }

    defendingArmy.forEach((defender) => {
      const defenderClasses = classCache[defender.unitId] ?? classifyUnitWithValue(defender);
      classCache[defender.unitId] = defenderClasses;
      const defenderRaw = defender.count * defender.effectiveValue;
      const defenderWeight = defendingRawTotal === 0 ? 0 : defenderRaw / defendingRawTotal;
      const { value, attackerClass, defenderClass } = evaluateCounter(attackerClasses, defenderClasses);
      const valueAfterCounter = attackerRaw * value * defenderWeight;
      perUnitTotals[attacker.unitId].adjusted += valueAfterCounter;

      details.push({
        unit1Name: attacker.name,
        unit1Value: attackerRaw,
        unit1Class: attackerClass ?? (attackerClasses[0] ?? 'unknown'),
        unit2Name: defender.name,
        unit2Value: defenderRaw,
        unit2Class: defenderClass ?? (defenderClasses[0] ?? 'unknown'),
        counterMultiplier: Number(value.toFixed(2)),
        valueAfterCounter: Number(valueAfterCounter.toFixed(2)),
        impact: impactLabel(value, defenderWeight, attackerRaw),
        narrative: value === 1
          ? `${attacker.name} trades evenly into ${defender.name}`
          : `${attacker.name} ${value > 1 ? 'exploits' : 'is punished by'} ${defender.name} (${value.toFixed(2)}x)`
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
    return 'Direct engagement is roughly even after adjusting for counters and value.';
  }

  const rawGap = army1Raw - army2Raw;
  const favoredHasRawDeficit = (favoredArmy === 1 && rawGap < 0) || (favoredArmy === 2 && rawGap > 0);
  const driver = keyMatchups[0]?.narrative ?? 'counter advantages';
  if (favoredHasRawDeficit) {
    return 'Counters overcome the raw value disadvantage: ' + driver;
  }
  return 'Raw value lead is reinforced by ' + driver;
}

export function calculateValueAdjustedMatchup(
  army1: UnitWithValue[],
  army2: UnitWithValue[]
): ValueAdjustedMatchup {
  const army1RawValue = army1.reduce((sum, unit) => sum + unit.count * unit.effectiveValue, 0);
  const army2RawValue = army2.reduce((sum, unit) => sum + unit.count * unit.effectiveValue, 0);
  const classCache: Record<string, UnitClassCategory[]> = {};

  const army1Result = computeValueAdjustedArmy(army1, army2, army2RawValue, classCache);
  const army2Result = computeValueAdjustedArmy(army2, army1, army1RawValue, classCache);

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
