import {
  getUpgradeEffect,
  getUpgradeEffectFromIcon,
  parseUnitTierFromIcon,
  tierMultipliers
} from '../../src/data/upgradeMappings';

describe('upgradeMappings', () => {
  describe('parseUnitTierFromIcon', () => {
    it('returns base multiplier when no suffix', () => {
      expect(parseUnitTierFromIcon('icons/races/english/units/longbowman')).toBe(tierMultipliers.base);
    });

    it('detects veteran/v2 units', () => {
      expect(parseUnitTierFromIcon('icons/races/malian/units/musofadi_2')).toBe(tierMultipliers.veteran);
    });

    it('detects elite/v3 units', () => {
      expect(parseUnitTierFromIcon('icons/races/french/units/knight_3.png')).toBe(tierMultipliers.elite);
    });

    it('detects imperial/v4 units', () => {
      expect(parseUnitTierFromIcon('icons/races/ottoman/units/janissary_4.webp')).toBe(tierMultipliers.imperial);
    });

    it('treats unknown suffix as base', () => {
      expect(parseUnitTierFromIcon('icons/races/chinese/units/zhuganunu_5')).toBe(tierMultipliers.base);
    });
  });

  describe('getUpgradeEffect', () => {
    it('returns effect for known upgrade id', () => {
      expect(getUpgradeEffect('upgradeWeaponsDamageII')).toMatchObject({
        type: 'melee_attack',
        bonus: 0.10,
        level: 2
      });
    });

    it('supports alternate naming patterns', () => {
      expect(getUpgradeEffect('upgradeWeaponsDamage2')).toMatchObject({
        type: 'melee_attack',
        bonus: 0.10,
        level: 2
      });
    });

    it('returns null for unknown upgrade', () => {
      expect(getUpgradeEffect('unknownUpgradeKey')).toBeNull();
    });
  });

  describe('getUpgradeEffectFromIcon', () => {
    it('extracts ranged armor tier from common blacksmith icon paths', () => {
      expect(getUpgradeEffectFromIcon('icons/races/common/upgrades/ranged_armor_technology_2')).toMatchObject({
        type: 'ranged_armor',
        bonus: 0.06,
        level: 2
      });
    });

    it('extracts melee attack tier from common blacksmith icon paths', () => {
      expect(getUpgradeEffectFromIcon('icons/races/common/upgrades/melee_damage_technology_1')).toMatchObject({
        type: 'melee_attack',
        bonus: 0.05,
        level: 1
      });
    });

    it('returns null for non-combat icon paths', () => {
      expect(getUpgradeEffectFromIcon('icons/races/common/upgrades/wheelbarrow')).toBeNull();
    });
  });
});
