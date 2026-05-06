import { calculateValueAdjustedMatchup } from '../../packages/aoe4-core/src/data/counterMatrix';
import { MatchupDetail } from '../../packages/aoe4-core/src/types';
import { valueArmyOne, valueArmyTwo } from '../helpers/counterSamples';

describe('calculateValueAdjustedMatchup integration', () => {
  it('evaluates mixed armies with cost-aware counters', () => {
    const analysis = calculateValueAdjustedMatchup(valueArmyOne, valueArmyTwo);

    expect(analysis.army1RawValue).toBeCloseTo(1200);
    expect(analysis.army2RawValue).toBeCloseTo(1200);
    expect(analysis.favoredArmy).not.toBe(0);
    expect(analysis.advantagePercent).toBeGreaterThan(0);
    expect(analysis.army1Breakdown.length).toBeGreaterThan(0);

    const spearVsKnight = analysis.keyMatchups.find(
      (matchup: MatchupDetail) => matchup.unit1Name === 'Spearman' && matchup.unit2Name === 'Knight'
    );
    const crossbowVsMaa = analysis.keyMatchups.find(
      (matchup: MatchupDetail) => matchup.unit1Name === 'Crossbowman' && matchup.unit2Name === 'Knight'
    );

    expect(spearVsKnight).toBeDefined();
    expect(crossbowVsMaa).toBeDefined();
    expect(spearVsKnight?.counterMultiplier).not.toBeCloseTo(1, 2);
    expect(crossbowVsMaa?.counterMultiplier).not.toBeCloseTo(1, 2);
  });

  it('does not inject tooltip or class-prior bias when full combat stats are available', () => {
    const withTooltipCatalog = [
      {
        id: 'tooltip-spear',
        baseId: 'tooltip-spear',
        name: 'Tooltip Spear',
        civs: ['en'],
        costs: { food: 100 },
        classes: ['infantry', 'melee', 'spearman'],
        displayClasses: ['Infantry'],
        age: 2,
        icon: '',
        description: 'Test infantry.',
        hitpoints: 120,
        armor: [{ type: 'melee', value: 0 }, { type: 'ranged', value: 0 }],
        weapons: [{
          name: 'Spear',
          type: 'melee',
          damage: 12,
          speed: 1.5,
          range: { min: 0, max: 0.295 },
          modifiers: [],
        }],
        movement: { speed: 1.25 },
      },
      {
        id: 'tooltip-sword',
        baseId: 'tooltip-sword',
        name: 'Tooltip Sword',
        civs: ['fr'],
        costs: { food: 100 },
        classes: ['cavalry', 'heavy', 'knight'],
        displayClasses: ['Cavalry'],
        age: 2,
        icon: '',
        description: 'Test infantry. Countered by Tooltip Spear.',
        hitpoints: 120,
        armor: [{ type: 'melee', value: 0 }, { type: 'ranged', value: 0 }],
        weapons: [{
          name: 'Sword',
          type: 'melee',
          damage: 12,
          speed: 1.5,
          range: { min: 0, max: 0.295 },
          modifiers: [],
        }],
        movement: { speed: 1.25 },
      },
    ];

    const noBiasCatalog = withTooltipCatalog.map((unit) => (
      unit.id === 'tooltip-spear'
        ? { ...unit, classes: ['infantry', 'melee'] }
        : {
          ...unit,
          classes: ['infantry', 'melee'],
          description: 'Test infantry.',
        }
    ));

    const withBiases = calculateValueAdjustedMatchup(
      [{ unitId: 'tooltip-spear', name: 'Tooltip Spear', count: 10, effectiveValue: 100, classes: ['infantry', 'melee', 'spearman'] }],
      [{ unitId: 'tooltip-sword', name: 'Tooltip Sword', count: 10, effectiveValue: 100, classes: ['cavalry', 'heavy', 'knight'] }],
      { unitCatalog: withTooltipCatalog }
    );

    const noBiases = calculateValueAdjustedMatchup(
      [{ unitId: 'tooltip-spear', name: 'Tooltip Spear', count: 10, effectiveValue: 100, classes: ['infantry', 'melee'] }],
      [{ unitId: 'tooltip-sword', name: 'Tooltip Sword', count: 10, effectiveValue: 100, classes: ['infantry', 'melee'] }],
      { unitCatalog: noBiasCatalog }
    );

    expect(withBiases.army1AdjustedValue).toBeCloseTo(noBiases.army1AdjustedValue, 6);
    expect(withBiases.army2AdjustedValue).toBeCloseTo(noBiases.army2AdjustedValue, 6);
    expect(withBiases.favoredArmy).toBe(0);
    expect(noBiases.favoredArmy).toBe(0);
  });
});
