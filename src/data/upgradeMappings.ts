import { UpgradeEffect, UnitTier } from '../types';

export const tierMultipliers: Record<UnitTier, number> = {
  base: 1.0, // Age 1 units, or no suffix in icon path
  veteran: 1.2, // Age 2 units, "_2" in icon path
  elite: 1.35, // Age 3 units, "_3" in icon path
  imperial: 1.5 // Age 4 units, "_4" in icon path
};

export const globalCombatUpgrades: Record<string, UpgradeEffect> = {
  // Blacksmith Melee Attack
  upgradeWeaponsDamageI: { type: 'melee_attack', bonus: 0.05, level: 1 },
  upgradeWeaponsDamageII: { type: 'melee_attack', bonus: 0.10, level: 2 },
  upgradeWeaponsDamageIII: { type: 'melee_attack', bonus: 0.15, level: 3 },
  // Alternate patterns
  upgradeWeaponsDamage1: { type: 'melee_attack', bonus: 0.05, level: 1 },
  upgradeWeaponsDamage2: { type: 'melee_attack', bonus: 0.10, level: 2 },
  upgradeWeaponsDamage3: { type: 'melee_attack', bonus: 0.15, level: 3 },

  // Blacksmith Ranged Attack
  upgradeRangedDamageI: { type: 'ranged_attack', bonus: 0.05, level: 1 },
  upgradeRangedDamageII: { type: 'ranged_attack', bonus: 0.10, level: 2 },
  upgradeRangedDamageIII: { type: 'ranged_attack', bonus: 0.15, level: 3 },
  upgradeRangedDamage1: { type: 'ranged_attack', bonus: 0.05, level: 1 },
  upgradeRangedDamage2: { type: 'ranged_attack', bonus: 0.10, level: 2 },
  upgradeRangedDamage3: { type: 'ranged_attack', bonus: 0.15, level: 3 },

  // Blacksmith Melee Armor
  upgradeMeleeArmorI: { type: 'melee_armor', bonus: 0.03, level: 1 },
  upgradeMeleeArmorII: { type: 'melee_armor', bonus: 0.06, level: 2 },
  upgradeMeleeArmorIII: { type: 'melee_armor', bonus: 0.09, level: 3 },
  upgradeMeleeArmor1: { type: 'melee_armor', bonus: 0.03, level: 1 },
  upgradeMeleeArmor2: { type: 'melee_armor', bonus: 0.06, level: 2 },
  upgradeMeleeArmor3: { type: 'melee_armor', bonus: 0.09, level: 3 },

  // Blacksmith Ranged Armor
  upgradeRangedArmorI: { type: 'ranged_armor', bonus: 0.03, level: 1 },
  upgradeRangedArmorII: { type: 'ranged_armor', bonus: 0.06, level: 2 },
  upgradeRangedArmorIII: { type: 'ranged_armor', bonus: 0.09, level: 3 },
  upgradeRangedArmor1: { type: 'ranged_armor', bonus: 0.03, level: 1 },
  upgradeRangedArmor2: { type: 'ranged_armor', bonus: 0.06, level: 2 },
  upgradeRangedArmor3: { type: 'ranged_armor', bonus: 0.09, level: 3 },

  // Siege Engineering
  upgradeSiegeEngineeringI: { type: 'siege', bonus: 0.05, level: 1 },
  upgradeSiegeEngineeringII: { type: 'siege', bonus: 0.10, level: 2 },
  upgradeSiegeEngineering1: { type: 'siege', bonus: 0.05, level: 1 },
  upgradeSiegeEngineering2: { type: 'siege', bonus: 0.10, level: 2 }
};

export function parseUnitTierFromIcon(iconPath: string): number {
  const match = iconPath.match(/_(\d)(?:\.[^/.]+)?$/);
  if (!match) {
    return tierMultipliers.base;
  }

  const tierDigit = Number(match[1]);
  switch (tierDigit) {
    case 2:
      return tierMultipliers.veteran;
    case 3:
      return tierMultipliers.elite;
    case 4:
      return tierMultipliers.imperial;
    case 1:
    default:
      return tierMultipliers.base;
  }
}

export function getUpgradeEffect(upgradeKey: string): UpgradeEffect | null {
  return globalCombatUpgrades[upgradeKey] ?? null;
}

function parseBlacksmithLevel(iconPath: string): number | null {
  const match = iconPath.match(/_(\d)(?:\.[^/.]+)?$/);
  if (!match) return null;

  const level = Number(match[1]);
  if (!Number.isFinite(level) || level < 1 || level > 3) return null;
  return level;
}

function levelBonusByType(type: UpgradeEffect['type'], level: number): UpgradeEffect | null {
  if (type === 'melee_attack' || type === 'ranged_attack') {
    return { type, level, bonus: level === 1 ? 0.05 : level === 2 ? 0.10 : 0.15 };
  }

  if (type === 'melee_armor' || type === 'ranged_armor') {
    return { type, level, bonus: level === 1 ? 0.03 : level === 2 ? 0.06 : 0.09 };
  }

  return null;
}

export function getUpgradeEffectFromIcon(iconPath: string): UpgradeEffect | null {
  const normalized = iconPath.toLowerCase();
  const level = parseBlacksmithLevel(normalized);
  if (level === null) return null;

  if (normalized.includes('melee_damage_technology_')) {
    return levelBonusByType('melee_attack', level);
  }

  if (normalized.includes('ranged_damage_technology_')) {
    return levelBonusByType('ranged_attack', level);
  }

  if (normalized.includes('melee_armor_technology_')) {
    return levelBonusByType('melee_armor', level);
  }

  if (normalized.includes('ranged_armor_technology_')) {
    return levelBonusByType('ranged_armor', level);
  }

  return null;
}
