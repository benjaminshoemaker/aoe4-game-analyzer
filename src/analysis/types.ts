import { ScoreBreakdown, ResourceTotals } from '../parser/gameSummaryParser';
import { UnitWithValue, ValueAdjustedMatchup } from '../types';
import { DeployedResourcePools } from './resourcePool';

export type AgeName = 'Dark' | 'Feudal' | 'Castle' | 'Imperial';

export interface UnifiedPhase {
  label: string;
  startTime: number;
  endTime: number;
  player1Age: AgeName;
  player2Age: AgeName;
}

export interface GamePhases {
  unifiedPhases: UnifiedPhase[];
  gameDuration: number;
}

export interface ArmySnapshot {
  timestamp: number;
  units: UnitWithValue[];
  totalValue: number;
}

export interface DestructionCluster {
  timestamp: number;
  windowSeconds: number;
  player1Losses: { name: string; count: number; valueLost: number }[];
  player2Losses: { name: string; count: number; valueLost: number }[];
}

export interface InflectionPoint {
  timestamp: number;
  scoreType: 'military' | 'economy' | 'total';
  deltaShift: number;
  magnitude: number;
  favoredPlayer: 1 | 2;
  destructionCluster: DestructionCluster | null;
}

export interface ResourceAllocation {
  militaryPercent: number;
  economyPercent: number;
  technologyPercent: number;
  buildingPercent: number;
}

export interface IncomeSnapshot {
  foodPerMin: number;
  goldPerMin: number;
  woodPerMin: number;
  stonePerMin: number;
}

export interface PhaseComparison {
  phase: UnifiedPhase;
  ageUpDelta: { player1Time: number | null; player2Time: number | null; deltaSeconds: number | null };
  player1Allocation: ResourceAllocation;
  player2Allocation: ResourceAllocation;
  player1IncomeAtEnd: IncomeSnapshot;
  player2IncomeAtEnd: IncomeSnapshot;
  scoreDeltaAtStart: ScoreBreakdown;
  scoreDeltaAtEnd: ScoreBreakdown;
  player1Units: { name: string; count: number }[];
  player2Units: { name: string; count: number }[];
  inflections: InflectionPoint[];
  armyMatchup: ValueAdjustedMatchup | null;
}

export interface PlayerAnalysisSummary {
  name: string;
  civilization: string;
  result: 'win' | 'loss';
  apm: number;
  scores: ScoreBreakdown;
  totalGathered: ResourceTotals;
  totalSpent: ResourceTotals;
  kills: number;
  deaths: number;
  unitsProduced: number;
}

export interface CombatAdjustedMilitaryPoint {
  timestamp: number;
  player1RawMilitaryActive: number;
  player2RawMilitaryActive: number;
  player1CounterAdjustedMilitaryActive: number;
  player2CounterAdjustedMilitaryActive: number;
  player1AdjustedMilitaryActive: number;
  player2AdjustedMilitaryActive: number;
  player1UpgradeMultiplier: number;
  player2UpgradeMultiplier: number;
  player1UnitBreakdown: Array<{
    unitId: string;
    unitName: string;
    count: number;
    rawValue: number;
    counterFactor: number;
    upgradeFactor: number;
    adjustedValue: number;
    deltaValue: number;
    why: string;
  }>;
  player2UnitBreakdown: Array<{
    unitId: string;
    unitName: string;
    count: number;
    rawValue: number;
    counterFactor: number;
    upgradeFactor: number;
    adjustedValue: number;
    deltaValue: number;
    why: string;
  }>;
}

export interface GameAnalysis {
  gameId: number;
  mapName: string;
  mapBiome: string;
  duration: number;
  winReason: string;
  player1: PlayerAnalysisSummary;
  player2: PlayerAnalysisSummary;
  phases: GamePhases;
  phaseComparisons: PhaseComparison[];
  inflectionPoints: InflectionPoint[];
  finalArmyMatchup: ValueAdjustedMatchup | null;
  combatAdjustedMilitarySeries: CombatAdjustedMilitaryPoint[];
  deployedResourcePools: DeployedResourcePools;
  bottomLine: string | null;
}
