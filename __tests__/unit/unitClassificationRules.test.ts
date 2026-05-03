import {
  classifyUnitByRules,
  unitClassCategories,
} from '../../packages/aoe4-core/src/data/unitClassificationRules';
import type { Unit } from '../../packages/aoe4-core/src/types';

function unit(overrides: Partial<Unit>): Unit {
  return {
    id: overrides.id ?? 'test-unit',
    name: overrides.name ?? 'Test Unit',
    baseId: overrides.baseId ?? overrides.id ?? 'test-unit',
    civs: [],
    costs: {},
    classes: overrides.classes ?? [],
    displayClasses: overrides.displayClasses ?? [],
    age: 2,
    icon: '',
    ...overrides,
  };
}

describe('unit classification rules', () => {
  it('keeps the stable category order used by the counter matrix', () => {
    expect(unitClassCategories).toEqual([
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
      'hero',
    ]);
  });

  it('classifies common unit families from names and display classes', () => {
    expect(classifyUnitByRules(unit({ name: 'Crossbowman', displayClasses: ['Ranged Infantry'] }))).toEqual([
      'heavy_ranged_infantry',
    ]);
    expect(classifyUnitByRules(unit({ name: 'Horseman', displayClasses: ['Light Melee Cavalry'] }))).toEqual([
      'light_melee_cavalry',
    ]);
    expect(classifyUnitByRules(unit({ name: 'Camel Archer', displayClasses: ['Ranged Cavalry'] }))).toEqual([
      'light_ranged_cavalry',
      'ranged_infantry',
    ]);
    expect(classifyUnitByRules(unit({ name: 'Spearman', displayClasses: ['Light Melee Infantry'] }))).toEqual([
      'spearman',
    ]);
  });

  it('keeps special-role classes and negated keywords distinct', () => {
    expect(classifyUnitByRules(unit({ name: 'The Khan', classes: ['hero'] }))).toContain('hero');
    expect(classifyUnitByRules(unit({ name: 'Scholar', classes: ['religious'] }))).toContain('monk');
    expect(classifyUnitByRules(unit({ name: 'Non Spear Archer', displayClasses: ['Ranged Infantry'] }))).toEqual([
      'ranged_infantry',
    ]);
  });
});
