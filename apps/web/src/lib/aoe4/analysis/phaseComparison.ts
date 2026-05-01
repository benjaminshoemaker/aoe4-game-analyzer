import { TimeSeriesResources, ScoreBreakdown } from '../parser/gameSummaryParser';
import { ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { calculateValueAdjustedMatchup } from '../data/counterMatrix';
import { reconstructArmyAt } from './armyReconstruction';
import { isVillager } from './resourceAnalysis';
import { getAgeUpTime } from './phaseIdentification';
import {
  GamePhases,
  InflectionPoint,
  PhaseComparison,
  ResourceAllocation,
  IncomeSnapshot,
} from './types';

function findNearestIndex(timestamps: number[], target: number): number {
  if (timestamps.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs(timestamps[0] - target);
  for (let i = 1; i < timestamps.length; i++) {
    const dist = Math.abs(timestamps[i] - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function scoreAt(resources: TimeSeriesResources, index: number): ScoreBreakdown {
  return {
    total: resources.total[index] ?? 0,
    military: resources.military[index] ?? 0,
    economy: resources.economy[index] ?? 0,
    technology: resources.technology[index] ?? 0,
    society: resources.society[index] ?? 0,
  };
}

function scoreDelta(a: ScoreBreakdown, b: ScoreBreakdown): ScoreBreakdown {
  return {
    total: a.total - b.total,
    military: a.military - b.military,
    economy: a.economy - b.economy,
    technology: a.technology - b.technology,
    society: a.society - b.society,
  };
}

function incomeAt(resources: TimeSeriesResources, index: number): IncomeSnapshot {
  return {
    foodPerMin: resources.foodPerMin[index] ?? 0,
    goldPerMin: resources.goldPerMin[index] ?? 0,
    woodPerMin: resources.woodPerMin[index] ?? 0,
    stonePerMin: resources.stonePerMin[index] ?? 0,
  };
}

function computeAllocation(
  build: ResolvedBuildOrder,
  startTime: number,
  endTime: number
): ResourceAllocation {
  let military = 0;
  let economy = 0;
  let technology = 0;
  let building = 0;

  for (const item of build.resolved) {
    const producedInPhase = item.produced.filter(t => t >= startTime && t < endTime).length;
    if (producedInPhase === 0) continue;

    const cost = item.cost.total * producedInPhase;

    switch (item.type) {
      case 'unit':
        if (isVillager(item)) {
          economy += cost;
        } else {
          military += cost;
        }
        break;
      case 'building':
        building += cost;
        break;
      case 'upgrade':
        technology += cost;
        break;
      default:
        break;
    }
  }

  const total = military + economy + technology + building;
  if (total === 0) {
    return { militaryPercent: 0, economyPercent: 0, technologyPercent: 0, buildingPercent: 0 };
  }

  return {
    militaryPercent: (military / total) * 100,
    economyPercent: (economy / total) * 100,
    technologyPercent: (technology / total) * 100,
    buildingPercent: (building / total) * 100,
  };
}

function countUnitsInPhase(
  build: ResolvedBuildOrder,
  startTime: number,
  endTime: number
): { name: string; count: number }[] {
  const counts: Record<string, number> = {};

  for (const item of build.resolved) {
    if (item.type !== 'unit') continue;
    if (isVillager(item)) continue;

    const producedInPhase = item.produced.filter(t => t >= startTime && t < endTime).length;
    if (producedInPhase === 0) continue;

    counts[item.name] = (counts[item.name] ?? 0) + producedInPhase;
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

export function comparePhases(
  gamePhases: GamePhases,
  p1Build: ResolvedBuildOrder,
  p2Build: ResolvedBuildOrder,
  p1Resources: TimeSeriesResources,
  p2Resources: TimeSeriesResources,
  inflections: InflectionPoint[],
  player1Civilization?: string,
  player2Civilization?: string,
  p1Actions?: Record<string, number[]>,
  p2Actions?: Record<string, number[]>
): PhaseComparison[] {
  const len = Math.min(p1Resources.timestamps.length, p2Resources.timestamps.length);
  const timestamps = p1Resources.timestamps.slice(0, len);

  return gamePhases.unifiedPhases.map(phase => {
    const startIdx = findNearestIndex(timestamps, phase.startTime);
    const endIdx = findNearestIndex(timestamps, phase.endTime);

    const p1ScoreStart = scoreAt(p1Resources, startIdx);
    const p2ScoreStart = scoreAt(p2Resources, startIdx);
    const p1ScoreEnd = scoreAt(p1Resources, endIdx);
    const p2ScoreEnd = scoreAt(p2Resources, endIdx);

    // Age-up delta: find actual age-up times from player actions
    let player1Time: number | null = null;
    let player2Time: number | null = null;
    if (phase.player1Age !== 'Dark' && p1Actions) {
      player1Time = getAgeUpTime(p1Actions, phase.player1Age);
    }
    if (phase.player2Age !== 'Dark' && p2Actions) {
      player2Time = getAgeUpTime(p2Actions, phase.player2Age);
    }

    const deltaSeconds = (player1Time !== null && player2Time !== null)
      ? player1Time - player2Time
      : null;

    // Army matchup at end of phase
    const p1Army = reconstructArmyAt(p1Build, phase.endTime);
    const p2Army = reconstructArmyAt(p2Build, phase.endTime);
    const armyMatchup = (p1Army.length > 0 && p2Army.length > 0)
      ? calculateValueAdjustedMatchup(p1Army, p2Army, {
        player1Civilization,
        player2Civilization,
      })
      : null;

    return {
      phase,
      ageUpDelta: { player1Time, player2Time, deltaSeconds },
      player1Allocation: computeAllocation(p1Build, phase.startTime, phase.endTime),
      player2Allocation: computeAllocation(p2Build, phase.startTime, phase.endTime),
      player1IncomeAtEnd: incomeAt(p1Resources, endIdx),
      player2IncomeAtEnd: incomeAt(p2Resources, endIdx),
      scoreDeltaAtStart: scoreDelta(p1ScoreStart, p2ScoreStart),
      scoreDeltaAtEnd: scoreDelta(p1ScoreEnd, p2ScoreEnd),
      player1Units: countUnitsInPhase(p1Build, phase.startTime, phase.endTime),
      player2Units: countUnitsInPhase(p2Build, phase.startTime, phase.endTime),
      inflections: inflections.filter(ip => ip.timestamp >= phase.startTime && ip.timestamp < phase.endTime),
      armyMatchup,
    };
  });
}
