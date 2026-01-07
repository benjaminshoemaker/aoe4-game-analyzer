import { PlayerSummary, ResourceTotals } from '../parser/gameSummaryParser';
import { ResolvedBuildItem } from '../parser/buildOrderResolver';

export interface SpendingItem {
  name: string;
  count: number;
  unitCost: ResourceTotals;
  totalCost: ResourceTotals;
}

export interface SpendingCategory {
  count: number;
  cost: ResourceTotals;
  items: SpendingItem[];
}

export interface ResourceExpenditure {
  totalGathered: ResourceTotals;
  totalSpent: ResourceTotals;
  unspent: ResourceTotals;

  breakdown: {
    ageUps: SpendingCategory;
    buildings: SpendingCategory;
    militaryUnits: SpendingCategory;
    villagers: SpendingCategory;
    upgrades: SpendingCategory;
    other: SpendingCategory;
  };
}

function isLandmark(item: ResolvedBuildItem): boolean {
  // Check classes array for landmark/wonder indicators (most reliable)
  const classesLower = item.classes.map(c => c.toLowerCase());
  if (classesLower.includes('landmark')) return true;
  if (classesLower.includes('wonder')) return true;
  if (classesLower.some(c => c.includes('landmark'))) return true;
  if (classesLower.some(c => c.includes('wonder'))) return true;

  // Check icon path for landmark indicators
  const iconLower = item.originalEntry.icon.toLowerCase();
  if (iconLower.includes('landmark') || iconLower.includes('wonder')) return true;

  // Check id/name as fallback
  const idLower = item.id.toLowerCase();
  const nameLower = item.name.toLowerCase();
  if (idLower.includes('landmark') || nameLower.includes('landmark')) return true;

  return false;
}

function isVillager(item: ResolvedBuildItem): boolean {
  const nameLower = item.name.toLowerCase();
  const classesLower = item.classes.map(c => c.toLowerCase());

  // Check for villager-specific identifiers
  if (nameLower.includes('villager')) return true;
  if (classesLower.includes('worker')) return true;
  if (classesLower.includes('villager')) return true;

  // Check icon path
  const iconLower = item.originalEntry.icon.toLowerCase();
  return iconLower.includes('villager');
}

function createEmptyTotals(): ResourceTotals {
  return { food: 0, gold: 0, stone: 0, wood: 0, total: 0 };
}

function addResources(a: ResourceTotals, b: ResourceTotals): ResourceTotals {
  return {
    food: a.food + b.food,
    gold: a.gold + b.gold,
    stone: a.stone + b.stone,
    wood: a.wood + b.wood,
    total: a.total + b.total
  };
}

function subtractResources(a: ResourceTotals, b: ResourceTotals): ResourceTotals {
  return {
    food: a.food - b.food,
    gold: a.gold - b.gold,
    stone: a.stone - b.stone,
    wood: a.wood - b.wood,
    total: a.total - b.total
  };
}

function multiplyResources(r: ResourceTotals, count: number): ResourceTotals {
  return {
    food: r.food * count,
    gold: r.gold * count,
    stone: r.stone * count,
    wood: r.wood * count,
    total: r.total * count
  };
}

function itemCostToResourceTotals(cost: { food: number; wood: number; gold: number; stone: number; total: number }): ResourceTotals {
  return {
    food: cost.food,
    gold: cost.gold,
    stone: cost.stone,
    wood: cost.wood,
    total: cost.total
  };
}

function createEmptyCategory(): SpendingCategory {
  return {
    count: 0,
    cost: createEmptyTotals(),
    items: []
  };
}

function addToCategory(category: SpendingCategory, item: ResolvedBuildItem): void {
  const count = item.produced.length;
  if (count === 0) return;

  const unitCost = itemCostToResourceTotals(item.cost);
  const totalCost = multiplyResources(unitCost, count);

  category.count += count;
  category.cost = addResources(category.cost, totalCost);

  // Check if we already have this item in the list
  const existing = category.items.find(i => i.name === item.name);
  if (existing) {
    existing.count += count;
    existing.totalCost = addResources(existing.totalCost, totalCost);
  } else {
    category.items.push({
      name: item.name,
      count,
      unitCost,
      totalCost
    });
  }
}

export function calculateResourceExpenditure(
  player: PlayerSummary,
  resolvedBuild: ResolvedBuildItem[]
): ResourceExpenditure {
  const breakdown = {
    ageUps: createEmptyCategory(),
    buildings: createEmptyCategory(),
    militaryUnits: createEmptyCategory(),
    villagers: createEmptyCategory(),
    upgrades: createEmptyCategory(),
    other: createEmptyCategory()
  };

  for (const item of resolvedBuild) {
    // Skip items with no production (starting assets handled separately)
    if (item.produced.length === 0) continue;

    switch (item.type) {
      case 'age':
        // Age markers have no cost - the landmark captures the actual spending
        // Skip them entirely
        break;

      case 'building':
        if (isLandmark(item)) {
          addToCategory(breakdown.ageUps, item);
        } else {
          addToCategory(breakdown.buildings, item);
        }
        break;

      case 'unit':
        if (isVillager(item)) {
          addToCategory(breakdown.villagers, item);
        } else {
          addToCategory(breakdown.militaryUnits, item);
        }
        break;

      case 'upgrade':
        addToCategory(breakdown.upgrades, item);
        break;

      case 'animal':
      default:
        addToCategory(breakdown.other, item);
        break;
    }
  }

  // Calculate totals from player data
  const totalGathered = player.totalResourcesGathered;
  const totalSpent = player.totalResourcesSpent;
  const unspent = subtractResources(totalGathered, totalSpent);

  return {
    totalGathered,
    totalSpent,
    unspent,
    breakdown
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatResourceLine(label: string, r: ResourceTotals, width: number = 10): string {
  const parts: string[] = [];
  if (r.food > 0 || label !== '') parts.push(`${formatNumber(r.food).padStart(5)} Food`);
  if (r.gold > 0 || label !== '') parts.push(`${formatNumber(r.gold).padStart(5)} Gold`);
  if (r.stone > 0 || label !== '') parts.push(`${formatNumber(r.stone).padStart(5)} Stone`);
  if (r.wood > 0 || label !== '') parts.push(`${formatNumber(r.wood).padStart(5)} Wood`);

  return `${label.padEnd(width)}${parts.join(' | ')} | Total: ${formatNumber(r.total).padStart(6)}`;
}

function formatCategoryHeader(name: string, category: SpendingCategory): string {
  const costParts: string[] = [];
  if (category.cost.food > 0) costParts.push(`${formatNumber(category.cost.food)} Food`);
  if (category.cost.gold > 0) costParts.push(`${formatNumber(category.cost.gold)} Gold`);
  if (category.cost.stone > 0) costParts.push(`${formatNumber(category.cost.stone)} Stone`);
  if (category.cost.wood > 0) costParts.push(`${formatNumber(category.cost.wood)} Wood`);

  const costStr = costParts.length > 0 ? costParts.join(' | ') : '0';
  return `${name} (${category.count}):`.padEnd(24) + `${costStr} | Total: ${formatNumber(category.cost.total)}`;
}

function formatCostParts(cost: ResourceTotals): string {
  const parts: string[] = [];
  if (cost.food > 0) parts.push(`${cost.food}F`);
  if (cost.wood > 0) parts.push(`${cost.wood}W`);
  if (cost.gold > 0) parts.push(`${cost.gold}G`);
  if (cost.stone > 0) parts.push(`${cost.stone}S`);
  return parts.join('/');
}

function formatCategoryItems(category: SpendingCategory, maxItems?: number): string[] {
  const lines: string[] = [];

  // Sort by total cost descending
  const sorted = [...category.items].sort((a, b) => b.totalCost.total - a.totalCost.total);

  const limit = maxItems ?? sorted.length;

  for (let i = 0; i < Math.min(sorted.length, limit); i++) {
    const item = sorted[i];

    const unitCostStr = formatCostParts(item.unitCost);
    const unitCostDisplay = unitCostStr ? ` (${unitCostStr})` : '';

    if (item.count > 1) {
      const totalCostStr = formatCostParts(item.totalCost);
      lines.push(`  • ${item.name}${unitCostDisplay} x${item.count} (${totalCostStr} total)`);
    } else {
      lines.push(`  • ${item.name}${unitCostDisplay}`);
    }
  }

  if (maxItems !== undefined && sorted.length > limit) {
    lines.push(`  • ... and ${sorted.length - limit} more`);
  }

  return lines;
}

export interface FormatOptions {
  verbose?: boolean;
}

export function formatResourceBreakdown(
  expenditure: ResourceExpenditure,
  playerName: string,
  civilization: string,
  options: FormatOptions = {}
): string {
  const lines: string[] = [];
  const divider = '═'.repeat(55);
  const thinDivider = '─'.repeat(55);

  // In verbose mode, show all items; otherwise limit to 5
  const maxItems = options.verbose ? undefined : 5;

  lines.push(`Resource Expenditure - ${playerName} (${civilization})`);
  lines.push(divider);

  // Summary
  lines.push(formatResourceLine('Gathered: ', expenditure.totalGathered));
  lines.push(formatResourceLine('Spent:    ', expenditure.totalSpent));
  lines.push(formatResourceLine('Unspent:  ', expenditure.unspent));

  lines.push('');
  lines.push('Breakdown by Category:');
  lines.push(thinDivider);

  const { breakdown } = expenditure;

  // Landmarks (age-up buildings)
  if (breakdown.ageUps.count > 0) {
    lines.push(formatCategoryHeader('Landmarks', breakdown.ageUps));
    lines.push(...formatCategoryItems(breakdown.ageUps, maxItems));
  }

  // Buildings
  if (breakdown.buildings.count > 0) {
    lines.push(formatCategoryHeader('Buildings', breakdown.buildings));
    lines.push(...formatCategoryItems(breakdown.buildings, maxItems));
  }

  // Military Units
  if (breakdown.militaryUnits.count > 0) {
    lines.push(formatCategoryHeader('Military Units', breakdown.militaryUnits));
    lines.push(...formatCategoryItems(breakdown.militaryUnits, maxItems));
  }

  // Villagers
  if (breakdown.villagers.count > 0) {
    lines.push(formatCategoryHeader('Villagers', breakdown.villagers));
    lines.push(...formatCategoryItems(breakdown.villagers, maxItems));
  }

  // Upgrades
  if (breakdown.upgrades.count > 0) {
    lines.push(formatCategoryHeader('Upgrades', breakdown.upgrades));
    lines.push(...formatCategoryItems(breakdown.upgrades, maxItems));
  }

  // Other
  if (breakdown.other.count > 0) {
    lines.push(formatCategoryHeader('Other', breakdown.other));
    lines.push(...formatCategoryItems(breakdown.other, maxItems));
  }

  // Calculate total from breakdown
  let calculatedTotal = createEmptyTotals();
  for (const category of Object.values(breakdown)) {
    calculatedTotal = addResources(calculatedTotal, category.cost);
  }

  lines.push(thinDivider);
  lines.push(`Calculated from build order: ${formatNumber(calculatedTotal.total)} resources`);
  lines.push(`Reported spent:              ${formatNumber(expenditure.totalSpent.total)} resources`);

  const diff = expenditure.totalSpent.total - calculatedTotal.total;
  if (Math.abs(diff) > 0) {
    lines.push(`Difference:                  ${formatNumber(diff)} (untracked spending)`);
  }

  return lines.join('\n');
}
