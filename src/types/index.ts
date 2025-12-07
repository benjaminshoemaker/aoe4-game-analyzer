export interface ResourceCosts {
  food?: number;
  wood?: number;
  gold?: number;
  stone?: number;
}

export interface Unit {
  id: string;
  name: string;
  baseId: string;
  civs: string[];
  costs: ResourceCosts;
  classes: string[];
  displayClasses: string[];
  age: number;
  icon: string;
}

export interface Building {
  id: string;
  name: string;
  civs: string[];
  costs: ResourceCosts;
  age: number;
  icon: string;
}

export interface Technology {
  id: string;
  name: string;
  civs: string[];
  costs: ResourceCosts;
  age: number;
  icon: string;
  effects: string[];
}

export interface StaticDataCache {
  units: Unit[];
  buildings: Building[];
  technologies: Technology[];
  fetchedAt: string;
}

export interface UpgradeEffect {
  type: string;
  bonus: number;
  level: number;
}

export type UnitTier = 'base' | 'veteran' | 'elite' | 'imperial';

export interface UnitCount {
  unitId: string;
  count: number;
  effectiveValue: number;
}

export interface CounterMatchup {
  attacker: string;
  defender: string;
  effectiveness: number;
  impact: string;
}

export interface MatchupAnalysis {
  favoredArmy: number;
  score: number;
  advantagePercent: number;
  keyMatchups: CounterMatchup[];
}

export interface UnitWithValue {
  unitId: string;
  name: string;
  count: number;
  effectiveValue: number;
  classes: string[];
}

export interface MatchupDetail {
  unit1Name: string;
  unit1Value: number;
  unit1Class: string;
  unit2Name: string;
  unit2Value: number;
  unit2Class: string;
  counterMultiplier: number;
  valueAfterCounter: number;
  impact: 'high' | 'medium' | 'low';
  narrative: string;
}

export interface UnitAdjustedSummary {
  unitName: string;
  rawTotal: number;
  adjustedTotal: number;
}

export interface ValueAdjustedMatchup {
  army1RawValue: number;
  army2RawValue: number;
  army1AdjustedValue: number;
  army2AdjustedValue: number;
  favoredArmy: 1 | 2 | 0;
  advantagePercent: number;
  keyMatchups: MatchupDetail[];
  explanation: string;
  army1Breakdown: UnitAdjustedSummary[];
  army2Breakdown: UnitAdjustedSummary[];
}
