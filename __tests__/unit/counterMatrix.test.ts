import {
  analyzeArmyMatchup,
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
  unitLookup,
  valueArmySingleSpearVsKnight,
  valueArmySpearsVsKnight
} from '../helpers/counterSamples';
import { Unit } from '../../src/types';

const staticUnits: Unit[] = [
  {
    id: 'archer-3',
    baseId: 'archer',
    name: 'Veteran Archer',
    civs: ['mo'],
    costs: { food: 30, wood: 50 },
    classes: ['infantry', 'ranged', 'ranged_infantry'],
    displayClasses: ['Light Ranged Infantry'],
    age: 3,
    icon: '',
    description: 'Cheap ranged infantry. Countered by Horsemen.',
    hitpoints: 80,
    armor: [],
    weapons: [{ name: 'Bow', type: 'ranged', damage: 7, speed: 1.625, range: { min: 0, max: 5 }, modifiers: [] }],
    movement: { speed: 1.25 },
  },
  {
    id: 'crossbowman-3',
    baseId: 'crossbowman',
    name: 'Crossbowman',
    civs: ['mo'],
    costs: { food: 80, gold: 40 },
    classes: ['infantry', 'ranged', 'ranged_infantry', 'crossbowman'],
    displayClasses: ['Light Ranged Infantry'],
    age: 3,
    icon: '',
    description: 'High damage ranged unit best against heavy targets.',
    hitpoints: 80,
    armor: [],
    weapons: [{
      name: 'Crossbow',
      type: 'ranged',
      damage: 11,
      speed: 2.125,
      range: { min: 0, max: 5 },
      modifiers: [{
        property: 'rangedAttack',
        target: { class: [['heavy']] },
        effect: 'change',
        value: 10,
        type: 'passive',
      }],
    }],
    movement: { speed: 1.125 },
  },
  {
    id: 'crossbowman-4',
    baseId: 'crossbowman',
    name: 'Elite Crossbowman',
    civs: ['mo'],
    costs: { food: 80, gold: 40 },
    classes: ['infantry', 'ranged', 'ranged_infantry', 'crossbowman'],
    displayClasses: ['Light Ranged Infantry'],
    age: 4,
    icon: '',
    description: 'High damage ranged unit best against heavy targets.',
    hitpoints: 95,
    armor: [],
    weapons: [{
      name: 'Crossbow',
      type: 'ranged',
      damage: 14,
      speed: 2.125,
      range: { min: 0, max: 5 },
      modifiers: [{
        property: 'rangedAttack',
        target: { class: [['heavy']] },
        effect: 'change',
        value: 12,
        type: 'passive',
      }],
    }],
    movement: { speed: 1.125 },
  },
  {
    id: 'man-at-arms-4',
    baseId: 'man-at-arms',
    name: 'Elite Man-at-Arms',
    civs: ['mo'],
    costs: { food: 100, gold: 20 },
    classes: ['infantry', 'heavy', 'armored', 'manatarms', 'melee', 'melee_infantry'],
    displayClasses: ['Heavy Melee Infantry'],
    age: 4,
    icon: '',
    description: 'Heavy infantry. Countered by Crossbowmen.',
    hitpoints: 180,
    armor: [{ type: 'melee', value: 5 }, { type: 'ranged', value: 6 }],
    weapons: [{
      name: 'Sword',
      type: 'melee',
      damage: 14,
      speed: 1.375,
      range: { min: 0, max: 0.295 },
      modifiers: [],
    }],
    movement: { speed: 1.125 },
  },
  {
    id: 'knight-4',
    baseId: 'knight',
    name: 'Elite Knight',
    civs: ['mo'],
    costs: { food: 140, gold: 100 },
    classes: ['cavalry', 'heavy', 'armored', 'cavalry_armored', 'melee', 'knight'],
    displayClasses: ['Heavy Melee Cavalry'],
    age: 4,
    icon: '',
    description: 'Powerful heavy cavalry. Countered by Spearmen and Crossbowmen.',
    hitpoints: 270,
    armor: [{ type: 'melee', value: 5 }, { type: 'ranged', value: 5 }],
    weapons: [{
      name: 'Sword',
      type: 'melee',
      damage: 29,
      speed: 1.5,
      range: { min: 0, max: 0.295 },
      modifiers: [],
    }],
    movement: { speed: 1.625 },
  },
  {
    id: 'handcannoneer-4',
    baseId: 'handcannoneer',
    name: 'Handcannoneer',
    civs: ['mo'],
    costs: { food: 120, gold: 120 },
    classes: ['infantry', 'ranged', 'gunpowder', 'handcannon', 'ranged_infantry'],
    displayClasses: ['Ranged Gunpowder Infantry'],
    age: 4,
    icon: '',
    description: 'Ranged gunpowder infantry with high damage against armored targets.',
    hitpoints: 130,
    armor: [],
    weapons: [{
      name: 'Handcannon',
      type: 'ranged',
      damage: 38,
      speed: 2.125,
      range: { min: 0, max: 4 },
      modifiers: [],
    }],
    movement: { speed: 1.125 },
  },
  {
    id: 'horseman-4',
    baseId: 'horseman',
    name: 'Elite Horseman',
    civs: ['mo'],
    costs: { food: 100, wood: 20 },
    classes: ['cavalry', 'cavalry_light', 'melee', 'military_cavalry'],
    displayClasses: ['Light Melee Cavalry'],
    age: 4,
    icon: '',
    description: 'Fast raiding cavalry. Countered by Spearmen.',
    hitpoints: 180,
    armor: [{ type: 'ranged', value: 5 }],
    weapons: [{
      name: 'Spear',
      type: 'melee',
      damage: 13,
      speed: 1.75,
      range: { min: 0, max: 0.295 },
      modifiers: [
        { property: 'meleeAttack', target: { class: [['ranged']] }, effect: 'change', value: 13, type: 'passive' },
        { property: 'meleeAttack', target: { class: [['siege']] }, effect: 'change', value: 13, type: 'passive' },
      ],
    }],
    movement: { speed: 1.56 },
  },
  {
    id: 'spearman-3',
    baseId: 'spearman',
    name: 'Veteran Spearman',
    civs: ['mo'],
    costs: { food: 60, wood: 20 },
    classes: ['infantry', 'melee', 'light_melee_infantry', 'spearman'],
    displayClasses: ['Light Melee Infantry'],
    age: 3,
    icon: '',
    description: 'Infantry with bonus damage against cavalry.',
    hitpoints: 110,
    armor: [],
    weapons: [{
      name: 'Spear',
      type: 'melee',
      damage: 9,
      speed: 1.875,
      range: { min: 0, max: 0.295 },
      modifiers: [{ property: 'meleeAttack', target: { class: [['cavalry']] }, effect: 'change', value: 23, type: 'passive' }],
    }],
    movement: { speed: 1.25 },
  },
  {
    id: 'keshik-3',
    baseId: 'keshik',
    name: 'Veteran Keshik',
    civs: ['mo'],
    costs: { food: 140, gold: 60 },
    classes: ['heavy', 'cavalry', 'cavalry_armored', 'melee', 'knight'],
    displayClasses: ['Heavy Melee Cavalry'],
    age: 3,
    icon: '',
    description: 'Expensive cavalry with high damage and a powerful charge attack. Countered by Spearmen and Crossbowmen.',
    hitpoints: 155,
    armor: [{ type: 'melee', value: 4 }, { type: 'ranged', value: 4 }],
    weapons: [
      { name: 'Sword', type: 'melee', damage: 19, speed: 1.375, range: { min: 0, max: 0.295 }, modifiers: [] },
      { name: 'Lance', type: 'melee', damage: 29, speed: 0.525, range: { min: 0, max: 0.295 }, modifiers: [] },
    ],
    movement: { speed: 1.5 },
  },
  {
    id: 'mangudai-3',
    baseId: 'mangudai',
    name: 'Veteran Mangudai',
    civs: ['mo'],
    costs: { food: 120, wood: 0, gold: 40 },
    classes: ['cavalry', 'ranged', 'cavalry_archer'],
    displayClasses: ['Light Ranged Cavalry'],
    age: 3,
    icon: '',
    description: 'Mobile ranged cavalry.',
    hitpoints: 95,
    armor: [],
    weapons: [{ name: 'Bow', type: 'ranged', damage: 6, speed: 0.875, range: { min: 0, max: 4 }, modifiers: [] }],
    movement: { speed: 1.88 },
  },
];
const unitById = new Map(staticUnits.map(unit => [unit.id, unit]));

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

    it('does not classify non-siege marker classes as siege units', () => {
      const classes = classifyUnit({
        id: 'horseman-2',
        baseId: 'horseman',
        name: 'Horseman',
        civs: ['en'],
        costs: { food: 100, wood: 20 },
        classes: ['find_non_siege_land_military', 'cavalry', 'melee'],
        displayClasses: ['Light Melee Cavalry'],
        age: 2,
        icon: '',
      });

      expect(classes).not.toContain('siege');
      expect(classes).toContain('light_melee_cavalry');
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
      expect(result.army1AdjustedValue).not.toBeCloseTo(result.army1RawValue, 2);
      expect(result.army2AdjustedValue).not.toBeCloseTo(result.army2RawValue, 2);
      expect(result.keyMatchups.length).toBeGreaterThan(0);
      expect(result.keyMatchups[0].counterMultiplier).not.toBeCloseTo(1, 2);
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

    it('uses real unit modifiers so crossbowmen perform better than archers into keshik (heavy cavalry)', () => {
      const crossbow = unitById.get('crossbowman-3');
      const archer = unitById.get('archer-3');
      const keshik = unitById.get('keshik-3');
      expect(crossbow).toBeDefined();
      expect(archer).toBeDefined();
      expect(keshik).toBeDefined();

      const crossbowResult = calculateValueAdjustedMatchup(
        [{
          unitId: 'crossbowman-3',
          name: crossbow?.name ?? 'Crossbowman',
          count: 17,
          effectiveValue: 120,
          classes: crossbow?.classes ?? [],
        }],
        [{
          unitId: 'keshik-3',
          name: keshik?.name ?? 'Veteran Keshik',
          count: 10,
          effectiveValue: 200,
          classes: keshik?.classes ?? [],
        }],
        { unitCatalog: staticUnits }
      );

      const archerResult = calculateValueAdjustedMatchup(
        [{
          unitId: 'archer-3',
          name: archer?.name ?? 'Veteran Archer',
          count: 25,
          effectiveValue: 80,
          classes: archer?.classes ?? [],
        }],
        [{
          unitId: 'keshik-3',
          name: keshik?.name ?? 'Veteran Keshik',
          count: 10,
          effectiveValue: 200,
          classes: keshik?.classes ?? [],
        }],
        { unitCatalog: staticUnits }
      );

      const crossbowVsKeshik = crossbowResult.keyMatchups.find(
        detail => detail.unit1Name.toLowerCase().includes('crossbow') &&
          detail.unit2Name.toLowerCase().includes('keshik')
      );
      const archerVsKeshik = archerResult.keyMatchups.find(
        detail => detail.unit1Name.toLowerCase().includes('archer') &&
          detail.unit2Name.toLowerCase().includes('keshik')
      );

      expect(crossbowVsKeshik).toBeDefined();
      expect(archerVsKeshik).toBeDefined();
      expect(crossbowResult.army1AdjustedValue).toBeGreaterThan(archerResult.army1AdjustedValue);
      expect(crossbowVsKeshik?.counterMultiplier ?? 1).toBeGreaterThan(archerVsKeshik?.counterMultiplier ?? 1);
    });

    it('favors horseman+spear mass into keshik+mangudai in the 24:36 composition check', () => {
      const horseman = unitById.get('horseman-4');
      const spearman = unitById.get('spearman-3');
      const keshik = unitById.get('keshik-3');
      const mangudai = unitById.get('mangudai-3');
      expect(horseman).toBeDefined();
      expect(spearman).toBeDefined();
      expect(keshik).toBeDefined();
      expect(mangudai).toBeDefined();

      const result = calculateValueAdjustedMatchup(
        [
          {
            unitId: 'horseman-4',
            name: horseman?.name ?? 'Elite Horseman',
            count: 44,
            effectiveValue: 120,
            classes: horseman?.classes ?? [],
          },
          {
            unitId: 'spearman-3',
            name: spearman?.name ?? 'Veteran Spearman',
            count: 46,
            effectiveValue: 80,
            classes: spearman?.classes ?? [],
          },
        ],
        [
          {
            unitId: 'keshik-3',
            name: keshik?.name ?? 'Veteran Keshik',
            count: 41,
            effectiveValue: 200,
            classes: keshik?.classes ?? [],
          },
          {
            unitId: 'mangudai-3',
            name: mangudai?.name ?? 'Veteran Mangudai',
            count: 24,
            effectiveValue: 120,
            classes: mangudai?.classes ?? [],
          },
        ],
        {
          unitCatalog: staticUnits,
          player1Effects: [
            { property: 'meleeAttack', effect: 'change', value: 2 },
            { property: 'meleeArmor', effect: 'change', value: 1 },
            { property: 'rangedArmor', effect: 'change', value: 2 },
          ],
        }
      );

      expect(result.favoredArmy).toBe(1);
      expect(result.army1AdjustedValue).toBeGreaterThan(result.army2AdjustedValue);
    });

    it('favors 24 hardened spearmen over 6 knights + 6 archers at equal resources under equal-resource pair modeling', () => {
      const equalResourceUnits: Unit[] = [
        {
          id: 'spearman-2',
          baseId: 'spearman',
          name: 'Hardened Spearman',
          civs: ['en'],
          costs: { food: 60, wood: 20 },
          classes: ['infantry', 'melee', 'light_melee_infantry', 'spearman'],
          displayClasses: ['Light Melee Infantry'],
          age: 2,
          icon: '',
          description: 'Infantry with bonus damage against cavalry.',
          hitpoints: 90,
          armor: [{ type: 'melee', value: 0 }, { type: 'ranged', value: 0 }],
          weapons: [{
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
          }],
          movement: { speed: 1.1 },
        },
        {
          id: 'knight-3',
          baseId: 'knight',
          name: 'Knight',
          civs: ['fr'],
          costs: { food: 140, gold: 100 },
          classes: ['cavalry', 'heavy', 'armored', 'cavalry_armored', 'melee', 'knight'],
          displayClasses: ['Heavy Melee Cavalry'],
          age: 3,
          icon: '',
          description: 'Heavy cavalry. Countered by Spearmen and Crossbowmen.',
          hitpoints: 190,
          armor: [{ type: 'melee', value: 2 }, { type: 'ranged', value: 2 }],
          weapons: [{
            name: 'Sword',
            type: 'melee',
            damage: 19,
            speed: 1.38,
            range: { min: 0, max: 0.3 },
            modifiers: [],
          }],
          movement: { speed: 1.25 },
        },
        {
          id: 'archer-2',
          baseId: 'archer',
          name: 'Archer',
          civs: ['en'],
          costs: { food: 30, wood: 50 },
          classes: ['infantry', 'ranged', 'ranged_infantry'],
          displayClasses: ['Light Ranged Infantry'],
          age: 2,
          icon: '',
          description: 'Ranged infantry. Countered by Horsemen.',
          hitpoints: 70,
          armor: [{ type: 'melee', value: 0 }, { type: 'ranged', value: 0 }],
          weapons: [{
            name: 'Bow',
            type: 'ranged',
            damage: 5,
            speed: 1.5,
            range: { min: 0, max: 5 },
            modifiers: [{
              property: 'rangedAttack',
              target: { class: [['light_melee_infantry']] },
              effect: 'change',
              value: 5,
              type: 'passive',
            }],
          }],
          movement: { speed: 1.25 },
        },
      ];

      const result = calculateValueAdjustedMatchup(
        [{
          unitId: 'spearman-2',
          name: 'Hardened Spearman',
          count: 24,
          effectiveValue: 80,
          classes: ['infantry', 'melee', 'light_melee_infantry', 'spearman'],
        }],
        [
          {
            unitId: 'knight-3',
            name: 'Knight',
            count: 6,
            effectiveValue: 240,
            classes: ['cavalry', 'heavy', 'armored', 'cavalry_armored', 'melee', 'knight'],
          },
          {
            unitId: 'archer-2',
            name: 'Archer',
            count: 6,
            effectiveValue: 80,
            classes: ['infantry', 'ranged', 'ranged_infantry'],
          },
        ],
        { unitCatalog: equalResourceUnits }
      );

      expect(result.army1RawValue).toBeCloseTo(result.army2RawValue, 6);
      expect(result.favoredArmy).toBe(1);
      expect(result.army1AdjustedValue).toBeGreaterThan(result.army2AdjustedValue);
    });

    it('keeps handcannoneer vs elite man-at-arms close at equal resources', () => {
      const handcannon = unitById.get('handcannoneer-4');
      const maa = unitById.get('man-at-arms-4');
      expect(handcannon).toBeDefined();
      expect(maa).toBeDefined();

      // Equal resources: 1x handcannon (240) vs 2x MAA (240)
      const result = calculateValueAdjustedMatchup(
        [{
          unitId: 'handcannoneer-4',
          name: handcannon?.name ?? 'Handcannoneer',
          count: 1,
          effectiveValue: 240,
          classes: handcannon?.classes ?? [],
        }],
        [{
          unitId: 'man-at-arms-4',
          name: maa?.name ?? 'Elite Man-at-Arms',
          count: 2,
          effectiveValue: 120,
          classes: maa?.classes ?? [],
        }],
        { unitCatalog: staticUnits }
      );

      expect(result.army1RawValue).toBeCloseTo(result.army2RawValue, 6);
      expect(Math.abs(result.advantagePercent)).toBeLessThan(0.2);
    });

    it('does not change pair scoring from tooltip counter text when combat stats are present', () => {
      const noTooltipCatalog: Unit[] = [
        {
          id: 'tooltip-spear',
          baseId: 'tooltip-spear',
          name: 'Tooltip Spear',
          civs: ['en'],
          costs: { food: 100 },
          classes: ['infantry', 'melee'],
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
          classes: ['infantry', 'melee'],
          displayClasses: ['Infantry'],
          age: 2,
          icon: '',
          description: 'Test infantry.',
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

      const withTooltipCatalog = noTooltipCatalog.map((unit) => (
        unit.id === 'tooltip-sword'
          ? { ...unit, description: 'Test infantry. Countered by Tooltip Spear.' }
          : unit
      ));

      const withTooltip = calculateValueAdjustedMatchup(
        [{
          unitId: 'tooltip-spear',
          name: 'Tooltip Spear',
          count: 10,
          effectiveValue: 100,
          classes: ['infantry', 'melee'],
        }],
        [{
          unitId: 'tooltip-sword',
          name: 'Tooltip Sword',
          count: 10,
          effectiveValue: 100,
          classes: ['infantry', 'melee'],
        }],
        { unitCatalog: withTooltipCatalog }
      );

      const withoutTooltip = calculateValueAdjustedMatchup(
        [{
          unitId: 'tooltip-spear',
          name: 'Tooltip Spear',
          count: 10,
          effectiveValue: 100,
          classes: ['infantry', 'melee'],
        }],
        [{
          unitId: 'tooltip-sword',
          name: 'Tooltip Sword',
          count: 10,
          effectiveValue: 100,
          classes: ['infantry', 'melee'],
        }],
        { unitCatalog: noTooltipCatalog }
      );

      expect(withTooltip.army1AdjustedValue).toBeCloseTo(withoutTooltip.army1AdjustedValue, 6);
      expect(withTooltip.army2AdjustedValue).toBeCloseTo(withoutTooltip.army2AdjustedValue, 6);
    });

    it('does not apply class priors when both units have full combat stats and no intrinsic counters', () => {
      const symmetricUnits: Unit[] = [
        {
          id: 'test-spear',
          baseId: 'test-spear',
          name: 'Test Spear',
          civs: ['en'],
          costs: { food: 100 },
          classes: ['infantry', 'melee', 'spearman'],
          displayClasses: ['Infantry'],
          age: 2,
          icon: '',
          description: 'Test melee infantry.',
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
          id: 'test-knight',
          baseId: 'test-knight',
          name: 'Test Knight',
          civs: ['fr'],
          costs: { food: 100 },
          classes: ['cavalry', 'heavy', 'knight'],
          displayClasses: ['Cavalry'],
          age: 2,
          icon: '',
          description: 'Test cavalry.',
          hitpoints: 120,
          armor: [{ type: 'melee', value: 0 }, { type: 'ranged', value: 0 }],
          weapons: [{
            name: 'Blade',
            type: 'melee',
            damage: 12,
            speed: 1.5,
            range: { min: 0, max: 0.295 },
            modifiers: [],
          }],
          movement: { speed: 1.25 },
        },
      ];

      const result = calculateValueAdjustedMatchup(
        [{
          unitId: 'test-spear',
          name: 'Test Spear',
          count: 10,
          effectiveValue: 100,
          classes: ['infantry', 'melee', 'spearman'],
        }],
        [{
          unitId: 'test-knight',
          name: 'Test Knight',
          count: 10,
          effectiveValue: 100,
          classes: ['cavalry', 'heavy', 'knight'],
        }],
        { unitCatalog: symmetricUnits }
      );

      expect(result.army1RawValue).toBeCloseTo(1000, 6);
      expect(result.army2RawValue).toBeCloseTo(1000, 6);
      expect(result.army1AdjustedValue).toBeCloseTo(result.army1RawValue, 6);
      expect(result.army2AdjustedValue).toBeCloseTo(result.army2RawValue, 6);
      expect(result.favoredArmy).toBe(0);
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
      expect(formatted).toMatch(/Player A: \d+\.\d{2}/);
      expect(formatted).toMatch(/Favored: Player [AB]|Favored: Even/);
      expect(formatted).toMatch(/Spearman .*vs.* Knight/);
      expect(formatted).toMatch(/Army 1 Breakdown:/);
      expect(formatted).toMatch(/Spearman: raw 240\.00 -> adjusted /);
    });
  });

  describe('analyzeArmyMatchup', () => {
    it('includes key matchups when player 2 is favored', () => {
      const analysis = analyzeArmyMatchup(
        [{ unitId: 'spearman', count: 1, effectiveValue: 80 }],
        [{ unitId: 'knight', count: 1, effectiveValue: 240 }],
        unitLookup
      );

      expect(analysis.favoredArmy).toBe(2);
      expect(analysis.keyMatchups.length).toBeGreaterThan(0);
      expect(analysis.keyMatchups[0].attacker.toLowerCase()).toContain('knight');
    });

    it('uses class fallback when provided unit catalog lacks combat stat fields', () => {
      const analysis = analyzeArmyMatchup(
        [{ unitId: 'spearman', count: 3, effectiveValue: 80 }],
        [{ unitId: 'knight', count: 1, effectiveValue: 240 }],
        unitLookup
      );

      expect(analysis.favoredArmy).toBe(1);
      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.keyMatchups.length).toBeGreaterThan(0);
      expect(analysis.keyMatchups[0].attacker.toLowerCase()).toContain('spear');
    });
  });
});
