/**
 * Manual mappings for build order items that are not found in the static data.
 * This can happen for:
 * - New units/buildings added in recent patches
 * - Special items with non-standard pbgids
 * - Variant units with different pbgids than their base version
 */

export interface ManualMapping {
  pbgid: number;
  name: string;
  id?: string;
  cost?: {
    food?: number;
    wood?: number;
    gold?: number;
    stone?: number;
    total?: number;
  };
  classes?: string[];
  civs?: string[];
}

/**
 * Add manual mappings here when items fail to resolve.
 * The error message will show the pbgid and icon path for unresolved items.
 *
 * Example:
 * {
 *   pbgid: 12345678,
 *   name: "New Unit Name",
 *   cost: { food: 100, gold: 50, total: 150 },
 *   classes: ["infantry", "melee"],
 *   civs: ["en", "fr"]
 * }
 */
export const manualMappings: ManualMapping[] = [
  // Sengoku Daimyo (Japanese variant) - clan selection widgets (no cost, UI elements)
  {
    pbgid: 9003595,
    name: 'Takeda Clan',
    id: 'takeda-clan',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    classes: ['widget', 'clan'],
    civs: ['sengoku_daimyo']
  },
  {
    pbgid: 9003594,
    name: 'Oda Clan',
    id: 'oda-clan',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    classes: ['widget', 'clan'],
    civs: ['sengoku_daimyo']
  },
  // Sengoku Daimyo units
  {
    pbgid: 5174026,
    name: 'Shinobi',
    id: 'shinobi',
    cost: { food: 80, wood: 0, gold: 60, stone: 0, total: 140 },
    classes: ['infantry', 'light', 'melee'],
    civs: ['ja', 'sengoku_daimyo']
  },
  {
    pbgid: 9001370,
    name: 'Daimyo',
    id: 'daimyo-2',
    cost: { food: 100, wood: 0, gold: 100, stone: 0, total: 200 },
    classes: ['hero', 'cavalry'],
    civs: ['sengoku_daimyo']
  },
  // Sengoku buildings
  {
    pbgid: 9004275,
    name: 'Toko Koji Mat',
    id: 'toko-koji-mat',
    cost: { food: 0, wood: 50, gold: 0, stone: 0, total: 50 },
    classes: ['building'],
    civs: ['sengoku_daimyo']
  },
  // Japanese upgrades
  {
    pbgid: 2127611,
    name: 'Yumi Ashigaru Upgrade',
    id: 'yumi-ashigaru-upgrade-3',
    cost: { food: 100, wood: 0, gold: 250, stone: 0, total: 350 },
    classes: ['upgrade', 'unit_upgrade'],
    civs: ['ja', 'sengoku_daimyo']
  },
  // Common upgrades
  {
    pbgid: 2146730,
    name: 'Veteran Spearman',
    id: 'spearman-upgrade-2',
    cost: { food: 50, wood: 0, gold: 125, stone: 0, total: 175 },
    classes: ['upgrade', 'unit_upgrade'],
    civs: []
  }
];
