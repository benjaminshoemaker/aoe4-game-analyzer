import { Unit, UnitCount, UnitWithValue } from '../../src/types';

export const spearmanUnit: Unit = {
  id: 'spearman',
  name: 'Spearman',
  baseId: 'spearman',
  civs: ['en'],
  costs: { food: 60, wood: 20 },
  classes: ['Spear', 'Light Melee Infantry'],
  displayClasses: ['Spear Infantry'],
  age: 1,
  icon: 'spearman.png'
};

export const knightUnit: Unit = {
  id: 'knight',
  name: 'Knight',
  baseId: 'knight',
  civs: ['fr'],
  costs: { food: 140, gold: 100 },
  classes: ['Heavy Melee Cavalry'],
  displayClasses: ['Cavalry'],
  age: 2,
  icon: 'knight.png'
};

export const horsemanUnit: Unit = {
  id: 'horseman',
  name: 'Horseman',
  baseId: 'horseman',
  civs: ['en'],
  costs: { food: 100, wood: 20 },
  classes: ['Light Melee Cavalry'],
  displayClasses: ['Cavalry'],
  age: 1,
  icon: 'horseman.png'
};

export const horseArcherUnit: Unit = {
  id: 'horse_archer',
  name: 'Horse Archer',
  baseId: 'horse_archer',
  civs: ['ru'],
  costs: { food: 120, wood: 80 },
  classes: ['Ranged Cavalry', 'Light'],
  displayClasses: ['Ranged Cavalry'],
  age: 2,
  icon: 'horse_archer.png'
};

export const crossbowmanUnit: Unit = {
  id: 'crossbowman',
  name: 'Crossbowman',
  baseId: 'crossbowman',
  civs: ['en'],
  costs: { food: 80, gold: 40 },
  classes: ['Ranged', 'Infantry', 'Light'],
  displayClasses: ['Light Ranged Infantry'],
  age: 2,
  icon: 'crossbowman.png'
};

export const manAtArmsUnit: Unit = {
  id: 'man_at_arms',
  name: 'Man-at-Arms',
  baseId: 'man_at_arms',
  civs: ['en'],
  costs: { food: 120, gold: 20 },
  classes: ['Heavy Melee Infantry'],
  displayClasses: ['Infantry'],
  age: 2,
  icon: 'maa.png'
};

export const monkUnit: Unit = {
  id: 'monk',
  name: 'Monk',
  baseId: 'monk',
  civs: ['ch'],
  costs: { gold: 150 },
  classes: ['Religious'],
  displayClasses: ['Monk'],
  age: 3,
  icon: 'monk.png'
};

export const siegeRamUnit: Unit = {
  id: 'ram',
  name: 'Battering Ram',
  baseId: 'ram',
  civs: ['en'],
  costs: { wood: 300 },
  classes: ['Siege'],
  displayClasses: ['Siege'],
  age: 2,
  icon: 'ram.png'
};

export const khanUnit: Unit = {
  id: 'khan',
  name: 'Khan',
  baseId: 'khan',
  civs: ['mo'],
  costs: { food: 0, wood: 0, gold: 0 },
  classes: ['Ranged Cavalry'],
  displayClasses: ['Ranged Cavalry', 'Hero'],
  age: 1,
  icon: 'khan.png'
};

export const counterUnits: Unit[] = [
  spearmanUnit,
  knightUnit,
  horsemanUnit,
  horseArcherUnit,
  crossbowmanUnit,
  manAtArmsUnit,
  monkUnit,
  siegeRamUnit,
  khanUnit
];

export const unitLookup: Record<string, Unit> = counterUnits.reduce((acc, unit) => {
  acc[unit.id] = unit;
  return acc;
}, {} as Record<string, Unit>);

export const sampleArmyOne: UnitCount[] = [
  { unitId: 'spearman', count: 10, effectiveValue: 1 },
  { unitId: 'crossbowman', count: 10, effectiveValue: 1 }
];

export const sampleArmyTwo: UnitCount[] = [
  { unitId: 'knight', count: 5, effectiveValue: 1.2 }
];

export const valueArmySpearsVsKnight: { army1: UnitWithValue[]; army2: UnitWithValue[] } = {
  army1: [
    { unitId: 'spearman', name: 'Spearman', count: 3, effectiveValue: 80, classes: spearmanUnit.classes }
  ],
  army2: [{ unitId: 'knight', name: 'Knight', count: 1, effectiveValue: 240, classes: knightUnit.classes }]
};

export const valueArmySingleSpearVsKnight: { army1: UnitWithValue[]; army2: UnitWithValue[] } = {
  army1: [
    { unitId: 'spearman', name: 'Spearman', count: 1, effectiveValue: 80, classes: spearmanUnit.classes }
  ],
  army2: [{ unitId: 'knight', name: 'Knight', count: 1, effectiveValue: 240, classes: knightUnit.classes }]
};

export const valueArmyOne: UnitWithValue[] = [
  { unitId: 'crossbowman', name: 'Crossbowman', count: 10, effectiveValue: 80, classes: crossbowmanUnit.classes },
  { unitId: 'spearman', name: 'Spearman', count: 5, effectiveValue: 80, classes: spearmanUnit.classes }
];

export const valueArmyTwo: UnitWithValue[] = [
  { unitId: 'knight', name: 'Knight', count: 5, effectiveValue: 240, classes: knightUnit.classes }
];
