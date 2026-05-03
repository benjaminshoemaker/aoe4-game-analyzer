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
  baseId?: string;
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
  // Malians - cattle are emitted in AoE4World summaries with nonstandard timestamp buckets.
  {
    pbgid: 2059966,
    name: 'Cattle',
    id: 'cattle',
    cost: { food: 0, wood: 0, gold: 90, stone: 0, total: 90 },
    classes: ['cattle'],
    civs: ['ma', 'malians']
  },
  {
    pbgid: 2076058,
    name: 'Pit Mine',
    id: 'pit-mine-1',
    cost: { food: 0, wood: 150, gold: 0, stone: 0, total: 150 },
    classes: ['building', 'economy_building', 'resource_drop_off', 'pit_mine'],
    civs: ['ma', 'malians']
  },
  {
    pbgid: 181324,
    name: 'Ger',
    id: 'ger-1',
    cost: { food: 0, wood: 100, gold: 0, stone: 0, total: 100 },
    classes: ['building', 'economy_building', 'ger', 'mill', 'resource_drop_off'],
    civs: ['mo', 'mongols']
  },
  {
    pbgid: 2074857,
    name: 'Ovoo',
    id: 'ovoo-1',
    cost: { food: 0, wood: 150, gold: 0, stone: 0, total: 150 },
    classes: ['building', 'ovoo', 'research_building'],
    civs: ['mo', 'mongols']
  },
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
    pbgid: 9001316,
    name: 'Yatai',
    id: 'yatai',
    cost: { food: 0, wood: 125, gold: 0, stone: 0, total: 125 },
    classes: ['human', 'mobile_building', 'packable_building', 'yatai'],
    civs: ['sen', 'sengoku_daimyo']
  },
  {
    pbgid: 9003449,
    name: 'Trade Cart',
    id: 'yatai-trade-cart',
    cost: { food: 0, wood: 0, gold: 0, stone: 0, total: 0 },
    classes: ['ignored', 'yatai_delivery'],
    civs: ['sen', 'sengoku_daimyo']
  },
  {
    pbgid: 5174026,
    name: 'Shinobi',
    id: 'shinobi',
    cost: { food: 80, wood: 0, gold: 60, stone: 0, total: 140 },
    classes: ['infantry', 'light', 'melee'],
    civs: ['ja', 'sengoku_daimyo']
  },
  // Nonstandard AoE4World summary entries observed in unknown timestamp buckets.
  {
    pbgid: 2762454,
    name: 'Trade Caravan',
    id: 'trade-caravan-2',
    cost: { food: 0, wood: 40, gold: 40, stone: 0, total: 80 },
    classes: ['human', 'trade_camel', 'trade_cart', 'worker'],
    civs: ['ay']
  },
  {
    pbgid: 2123482,
    name: 'Trader',
    id: 'trader-2',
    cost: { food: 0, wood: 60, gold: 60, stone: 0, total: 120 },
    classes: ['human', 'trade_cart', 'worker'],
    civs: ['fr', 'je']
  },
  {
    pbgid: 2631059,
    name: 'Imperial Official',
    id: 'imperial-official-1',
    cost: { food: 100, wood: 0, gold: 50, stone: 0, total: 150 },
    classes: ['human', 'official', 'worker'],
    civs: ['ch', 'zx']
  },
  {
    pbgid: 5000301,
    name: 'Pilgrim',
    id: 'pilgrim-1',
    cost: { food: 0, wood: 0, gold: 120, stone: 0, total: 120 },
    classes: ['human', 'pilgrim', 'worker'],
    civs: ['kt']
  },
  {
    pbgid: 2141356,
    name: 'Tower of the Sultan',
    id: 'tower-of-the-sultan-3',
    cost: { food: 0, wood: 650, gold: 350, stone: 0, total: 1000 },
    classes: ['military', 'ram', 'ram_tower', 'siege'],
    civs: ['ay']
  },
  {
    pbgid: 8635755,
    name: 'Battering Ram',
    id: 'battering-ram-2',
    cost: { food: 0, wood: 200, gold: 0, stone: 0, total: 200 },
    classes: ['military', 'ram', 'siege'],
    civs: []
  },
  {
    pbgid: 7804932,
    name: 'Mangonel',
    id: 'mangonel-3',
    cost: { food: 0, wood: 400, gold: 200, stone: 0, total: 600 },
    classes: ['military', 'mangonel', 'siege'],
    civs: []
  },
  {
    pbgid: 2140765,
    name: 'Cheirosiphon',
    id: 'cheirosiphon-3',
    cost: { food: 0, wood: 200, gold: 60, stone: 0, total: 260 },
    classes: ['military', 'ram', 'ram_greek_fire', 'siege'],
    civs: ['by']
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
