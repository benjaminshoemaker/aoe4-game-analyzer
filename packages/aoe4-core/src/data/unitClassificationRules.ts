import type { Unit } from '../types';

export const unitClassCategories = [
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
  'hero'
] as const;

export type UnitClassCategory = (typeof unitClassCategories)[number];

interface UnitClassificationRule {
  category: UnitClassCategory;
  standaloneAny?: string[];
  containsAny?: string[];
  allKeywordsAny?: string[][];
  unlessPresent?: UnitClassCategory[];
}

const unitClassificationRules: UnitClassificationRule[] = [
  { category: 'hero', standaloneAny: ['hero', 'jeanne', 'khan', 'daimyo'] },
  { category: 'monk', standaloneAny: ['monk', 'imam', 'prelate', 'scholar', 'religious'] },
  { category: 'siege', standaloneAny: ['siege', 'ram', 'bombard', 'mangonel', 'trebuchet', 'springald'] },
  { category: 'spearman', standaloneAny: ['spear', 'spearman', 'pike', 'pikeman'] },
  {
    category: 'heavy_ranged_infantry',
    containsAny: ['crossbow', 'arbaletrier', 'handcannon'],
    allKeywordsAny: [['heavy', 'ranged', 'infantry']],
  },
  {
    category: 'light_ranged_cavalry',
    containsAny: ['horse archer', 'mangudai'],
    allKeywordsAny: [['ranged', 'cavalry']],
  },
  {
    category: 'light_melee_cavalry',
    standaloneAny: ['horseman', 'sofa'],
    allKeywordsAny: [['light', 'melee', 'cavalry']],
  },
  {
    category: 'heavy_melee_cavalry',
    standaloneAny: ['knight', 'lancer'],
    allKeywordsAny: [['heavy', 'melee', 'cavalry']],
  },
  {
    category: 'heavy_melee_infantry',
    standaloneAny: ['man at arms', 'samurai'],
    allKeywordsAny: [['heavy', 'melee', 'infantry']],
  },
  {
    category: 'ranged_infantry',
    standaloneAny: ['archer'],
    allKeywordsAny: [['ranged', 'infantry']],
    unlessPresent: ['heavy_ranged_infantry'],
  },
  {
    category: 'light_melee_infantry',
    standaloneAny: ['musofadi', 'warrior'],
    allKeywordsAny: [['light', 'melee', 'infantry']],
    unlessPresent: ['spearman'],
  },
];

function normalizeValues(values: string[]): string[] {
  return values
    .filter(Boolean)
    .map((value) => value.toLowerCase().replace(/[_-]/g, ' '))
    .map((value) => value.replace(/[^a-z0-9\s]/g, '').trim());
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasStandaloneKeyword(values: string[], keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`);
  const negatedPattern = new RegExp(`\\bnon\\s+${escapeRegex(keyword)}\\b`);
  return values.some(value => pattern.test(value) && !negatedPattern.test(value));
}

function hasKeyword(values: string[], keyword: string): boolean {
  const token = keyword.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (!token) return false;
  return values.some(value => value.includes(token));
}

function hasAllKeywords(values: string[], keywords: string[]): boolean {
  return values.some((value) => keywords.every((keyword) => value.includes(keyword)));
}

function ruleMatches(
  rule: UnitClassificationRule,
  normalized: string[],
  categories: UnitClassCategory[]
): boolean {
  if (rule.unlessPresent?.some(category => categories.includes(category))) return false;

  return (
    (rule.standaloneAny ?? []).some(keyword => hasStandaloneKeyword(normalized, keyword)) ||
    (rule.containsAny ?? []).some(keyword => hasKeyword(normalized, keyword)) ||
    (rule.allKeywordsAny ?? []).some(keywords => hasAllKeywords(normalized, keywords))
  );
}

export function classifyUnitByRules(unit: Unit): UnitClassCategory[] {
  const normalized = normalizeValues([...(unit.classes ?? []), ...(unit.displayClasses ?? []), unit.name, unit.baseId]);
  const categories: UnitClassCategory[] = [];

  for (const rule of unitClassificationRules) {
    if (ruleMatches(rule, normalized, categories)) {
      categories.push(rule.category);
    }
  }

  return categories;
}
