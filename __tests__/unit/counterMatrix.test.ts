import {
  calculateValueAdjustedMatchup,
  classifyUnit,
  formatValueAdjustedMatchup,
  getCounterEffectiveness
} from '../../src/data/counterMatrix';
import {
  crossbowmanUnit,
  horsemanUnit,
  khanUnit,
  knightUnit,
  manAtArmsUnit,
  siegeRamUnit,
  spearmanUnit,
  valueArmySingleSpearVsKnight,
  valueArmySpearsVsKnight
} from '../helpers/counterSamples';

describe('counterMatrix classification and effectiveness', () => {
  describe('classifyUnit', () => {
    it('maps melee and spear units into appropriate categories', () => {
      const classes = classifyUnit(spearmanUnit);

      expect(classes).toContain('spearman');
    });

    it('detects heavy ranged infantry and heroes', () => {
      const heavyRangedClasses = classifyUnit(crossbowmanUnit);
      const heroClasses = classifyUnit(khanUnit);

      expect(heavyRangedClasses).toContain('heavy_ranged_infantry');
      expect(heroClasses).toEqual(expect.arrayContaining(['light_ranged_cavalry', 'hero']));
    });
  });

  describe('getCounterEffectiveness', () => {
    it('returns the strongest matchup for multi-class defenders', () => {
      const attackerClasses = classifyUnit(spearmanUnit);
      const defenderClasses = classifyUnit(knightUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBe(1.5);
    });

    it('applies ranged counters to armored infantry', () => {
      const attackerClasses = classifyUnit(crossbowmanUnit);
      const defenderClasses = classifyUnit(manAtArmsUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBe(1.5);
    });

    it('applies crossbow counters to heavy cavalry', () => {
      const attackerClasses = classifyUnit(crossbowmanUnit);
      const defenderClasses = classifyUnit(knightUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBeCloseTo(1.4, 2);
    });

    it('prefers the best available matchup when multiple apply', () => {
      const attackerClasses = classifyUnit(horsemanUnit);
      const defenderClasses = classifyUnit(siegeRamUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBe(1.5);
    });

    it('shows siege is vulnerable to light ranged cavalry', () => {
      const attackerClasses = classifyUnit(siegeRamUnit);
      const defenderClasses = classifyUnit(khanUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBeCloseTo(0.67, 2);
    });

    it('applies reciprocal disadvantage when countered', () => {
      const attackerClasses = classifyUnit(knightUnit);
      const defenderClasses = classifyUnit(spearmanUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBeCloseTo(0.67, 2);
    });

    it('shows knights are countered by crossbows', () => {
      const attackerClasses = classifyUnit(knightUnit);
      const defenderClasses = classifyUnit(crossbowmanUnit);

      expect(getCounterEffectiveness(attackerClasses, defenderClasses)).toBeCloseTo(0.71, 2);
    });
  });

  describe('calculateValueAdjustedMatchup', () => {
    it('amplifies value when counters align in equal-value fights', () => {
      const result = calculateValueAdjustedMatchup(
        valueArmySpearsVsKnight.army1,
        valueArmySpearsVsKnight.army2
      );

      expect(result.army1RawValue).toBeCloseTo(240);
      expect(result.army2RawValue).toBeCloseTo(240);
      expect(result.army1AdjustedValue).toBeCloseTo(360, 0);
      expect(result.army2AdjustedValue).toBeCloseTo(161, 0);
      expect(result.favoredArmy).toBe(1);
      expect(result.keyMatchups[0].counterMultiplier).toBeCloseTo(1.5, 2);
    });

    it('shows expensive units can still win through value despite counters', () => {
      const result = calculateValueAdjustedMatchup(
        valueArmySingleSpearVsKnight.army1,
        valueArmySingleSpearVsKnight.army2
      );

      expect(result.army1RawValue).toBeCloseTo(80);
      expect(result.army2RawValue).toBeCloseTo(240);
      expect(result.favoredArmy).toBe(2);
      expect(result.army2AdjustedValue).toBeGreaterThan(result.army1AdjustedValue);
      expect(result.explanation.toLowerCase()).toContain('value');
    });
  });

  describe('formatValueAdjustedMatchup', () => {
    it('produces a readable summary with key matchup details', () => {
      const matchup = calculateValueAdjustedMatchup(
        valueArmySpearsVsKnight.army1,
        valueArmySpearsVsKnight.army2
      );
      const formatted = formatValueAdjustedMatchup(matchup, 'Player A', 'Player B');

      expect(formatted).toMatch(/Raw Values:/);
      expect(formatted).toMatch(/Player A: .*240/);
      expect(formatted).toMatch(/Adjusted Values:/);
      expect(formatted).toMatch(/Player A: .*360/);
      expect(formatted).toMatch(/Favored: Player A/);
      expect(formatted).toMatch(/Spearman .*vs.* Knight/);
      expect(formatted).toMatch(/Army 1 Breakdown:/);
      expect(formatted).toMatch(/Spearman: raw 240\.00 -> adjusted 360\.00/);
    });
  });
});
