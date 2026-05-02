import { ResolvedBuildItem } from '../parser/buildOrderResolver';
import { BuildOrderEntry } from '../parser/gameSummaryParser';

const VILLAGER_TOKENS = ['villager', 'worker', 'peasant', 'serf'];

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function hasVillagerToken(values: string[]): boolean {
  const haystack = values.map(normalizeText).join(' ');
  return VILLAGER_TOKENS.some(token => haystack.includes(token));
}

export function isVillagerBuildOrderEntry(entry: BuildOrderEntry): boolean {
  if (entry.type !== 'Unit') return false;
  return hasVillagerToken([entry.id, entry.icon]);
}

export function isVillagerResolvedItem(item: ResolvedBuildItem): boolean {
  if (item.type !== 'unit') return false;

  const classValues = item.classes.map(normalizeText);
  if (classValues.includes('worker') || classValues.includes('villager')) return true;

  return hasVillagerToken([
    item.id,
    item.name,
    item.originalEntry.id,
    item.originalEntry.icon,
    ...item.classes,
  ]);
}
