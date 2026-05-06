import {
  evaluateCombatValue,
  evaluateUnitPairCounterComputation,
  evaluateUnitPairCounterMultiplier,
  unitMarketValueFromStaticUnit
} from '../../packages/aoe4-core/src/data/combatValueEngine';
import { Unit, UnitWithValue } from '../../packages/aoe4-core/src/types';

describe('combatValueEngine', () => {
  const spearman: Unit = {
    id: 'spearman-2',
    baseId: 'spearman',
    name: 'Hardened Spearman',
    pbgid: 11,
    civs: ['ja'],
    costs: { food: 60, wood: 20 },
    classes: ['infantry', 'melee', 'spearman'],
    displayClasses: ['Infantry'],
    age: 2,
    icon: 'spearman-2.png',
    hitpoints: 90,
    armor: [
      { type: 'melee', value: 0 },
      { type: 'ranged', value: 0 },
      { type: 'fire', value: 0 },
    ],
    weapons: [
      {
        name: 'Spear',
        type: 'melee',
        damage: 8,
        speed: 1.5,
        range: { min: 0, max: 0.3 },
        modifiers: [{
          property: 'meleeAttack',
          target: { class: [['cavalry']] },
          effect: 'change',
          value: 20,
          type: 'passive',
        }],
      }
    ],
    movement: { speed: 1.1 },
  };

  const knight: Unit = {
    id: 'knight-3',
    baseId: 'knight',
    name: 'Knight',
    pbgid: 12,
    civs: ['fr'],
    costs: { food: 140, gold: 100 },
    classes: ['cavalry', 'heavy_melee_cavalry', 'melee'],
    displayClasses: ['Cavalry'],
    age: 3,
    icon: 'knight-3.png',
    hitpoints: 190,
    armor: [
      { type: 'melee', value: 2 },
      { type: 'ranged', value: 2 },
      { type: 'fire', value: 0 },
    ],
    weapons: [
      {
        name: 'Sword',
        type: 'melee',
        damage: 19,
        speed: 1.38,
        range: { min: 0, max: 0.3 },
        modifiers: [],
      }
    ],
    movement: { speed: 1.25 },
  };

  it('exposes counter ratios from one shared evaluator call', () => {
    const army1: UnitWithValue[] = [{
      unitId: spearman.id,
      name: spearman.name,
      count: 3,
      effectiveValue: 80,
      classes: spearman.classes,
    }];

    const army2: UnitWithValue[] = [{
      unitId: knight.id,
      name: knight.name,
      count: 1,
      effectiveValue: 240,
      classes: knight.classes,
    }];

    const evaluation = evaluateCombatValue(army1, army2, {
      unitCatalog: [spearman, knight],
      player1Civilization: 'ja',
      player2Civilization: 'fr',
    });

    expect(evaluation.matchup.army1RawValue).toBe(240);
    expect(evaluation.matchup.army2RawValue).toBe(240);
    expect(evaluation.army1CounterRatio).not.toBeCloseTo(1, 2);
    expect(evaluation.army2CounterRatio).not.toBeCloseTo(1, 2);
    expect(evaluation.army1CounterRatio * evaluation.army2CounterRatio).toBeCloseTo(1, 2);
    expect(evaluation.matchup.army1AdjustedValue).toBeCloseTo(
      evaluation.matchup.army1RawValue * evaluation.army1CounterRatio,
      2
    );
  });

  it('computes pair multipliers using the same evaluator path as runtime matchup', () => {
    const multiplier = evaluateUnitPairCounterMultiplier(spearman, knight, [spearman, knight]);
    const evaluation = evaluateCombatValue(
      [{
        unitId: spearman.id,
        name: spearman.name,
        count: 1,
        effectiveValue: 80,
        classes: spearman.classes,
      }],
      [{
        unitId: knight.id,
        name: knight.name,
        count: 1,
        effectiveValue: 240,
        classes: knight.classes,
      }],
      { unitCatalog: [spearman, knight] }
    );

    expect(multiplier).toBeGreaterThan(0);
    expect(multiplier).toBeCloseTo(evaluation.army1CounterRatio, 4);
    expect(multiplier).not.toBeCloseTo(1, 2);
  });

  it('exposes per-cell derivation terms for pairwise matrix explanations', () => {
    const pair = evaluateUnitPairCounterComputation(
      {
        unitId: spearman.id,
        name: spearman.name,
        count: 1,
        effectiveValue: 80,
        classes: spearman.classes,
      },
      {
        unitId: knight.id,
        name: knight.name,
        count: 1,
        effectiveValue: 240,
        classes: knight.classes,
      },
      {
        unitCatalog: [spearman, knight],
        player1Civilization: 'ja',
        player2Civilization: 'fr',
      }
    );

    expect(pair.attacker.sustainedDps).toBeCloseTo(17.333333, 6);
    expect(pair.attacker.meleeUptime).toBeCloseTo(0.988, 3);
    expect(pair.attacker.totalDps).toBeCloseTo(17.125333, 6);
    expect(pair.defender.totalDps).toBeCloseTo(13.768116, 6);
    expect(pair.attackerPerResource).toBeCloseTo((pair.attacker.totalDps * pair.attackerHitpoints) / pair.attackerUnitValue, 6);
    expect(pair.equalResourceAdvantage).toBeCloseTo(pair.attackerPerResource / pair.defenderPerResource, 6);
    expect(pair.multiplier).toBeCloseTo(Math.sqrt(pair.equalResourceAdvantage), 6);
    expect(pair.forcedResultReason).toBeNull();
  });

  it('derives unit market value from static costs', () => {
    expect(unitMarketValueFromStaticUnit(spearman)).toBe(80);
    expect(unitMarketValueFromStaticUnit(knight)).toBe(240);
  });
});
