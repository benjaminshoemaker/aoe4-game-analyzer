import { TimeSeriesResources } from '../parser/gameSummaryParser';
import { ResolvedBuildOrder } from '../parser/buildOrderResolver';
import { InflectionPoint, DestructionCluster } from './types';
import { isVillager } from './resourceAnalysis';

interface DeltaCandidate {
  index: number;
  timestamp: number;
  scoreType: 'military' | 'economy' | 'total';
  deltaShift: number;
  rate: number;
}

function computeDeltas(p1Scores: number[], p2Scores: number[], len: number): number[] {
  const deltas: number[] = [];
  for (let i = 0; i < len; i++) {
    deltas.push((p1Scores[i] ?? 0) - (p2Scores[i] ?? 0));
  }
  return deltas;
}

function findCandidates(
  deltas: number[],
  timestamps: number[],
  scoreType: 'military' | 'economy' | 'total'
): DeltaCandidate[] {
  const candidates: DeltaCandidate[] = [];
  for (let i = 1; i < deltas.length; i++) {
    const change = deltas[i] - deltas[i - 1];
    const dt = (timestamps[i] - timestamps[i - 1]) || 1;
    const rate = Math.abs(change) / dt;

    if (Math.abs(change) < 1) continue;

    candidates.push({
      index: i,
      timestamp: timestamps[i],
      scoreType,
      deltaShift: change,
      rate,
    });
  }
  return candidates;
}

function mergeNearbyCandidates(candidates: DeltaCandidate[], windowSeconds: number): DeltaCandidate[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => b.rate - a.rate);
  const merged: DeltaCandidate[] = [];

  for (const candidate of sorted) {
    const tooClose = merged.some(m => Math.abs(m.timestamp - candidate.timestamp) < windowSeconds);
    if (!tooClose) {
      merged.push(candidate);
    }
  }

  return merged;
}

function buildDestructionCluster(
  timestamp: number,
  windowSeconds: number,
  p1Build: ResolvedBuildOrder,
  p2Build: ResolvedBuildOrder
): DestructionCluster | null {
  const halfWindow = windowSeconds;

  function gatherLosses(build: ResolvedBuildOrder): { name: string; count: number; valueLost: number }[] {
    const allItems = [...build.startingAssets, ...build.resolved];
    const lossByName: Record<string, { count: number; valueLost: number }> = {};

    for (const item of allItems) {
      if (item.type !== 'unit') continue;
      if (isVillager(item)) continue;

      const destroyedNearby = item.destroyed.filter(
        t => t >= timestamp - halfWindow && t <= timestamp + halfWindow
      );
      if (destroyedNearby.length === 0) continue;

      const value = item.cost.total * item.tierMultiplier;
      if (!lossByName[item.name]) {
        lossByName[item.name] = { count: 0, valueLost: 0 };
      }
      lossByName[item.name].count += destroyedNearby.length;
      lossByName[item.name].valueLost += destroyedNearby.length * value;
    }

    return Object.entries(lossByName).map(([name, data]) => ({
      name,
      count: data.count,
      valueLost: data.valueLost,
    }));
  }

  const player1Losses = gatherLosses(p1Build);
  const player2Losses = gatherLosses(p2Build);

  if (player1Losses.length === 0 && player2Losses.length === 0) {
    return null;
  }

  return {
    timestamp,
    windowSeconds: halfWindow * 2,
    player1Losses,
    player2Losses,
  };
}

export function detectInflectionPoints(
  p1Resources: TimeSeriesResources,
  p2Resources: TimeSeriesResources,
  p1Build: ResolvedBuildOrder,
  p2Build: ResolvedBuildOrder,
  maxPoints: number = 3
): InflectionPoint[] {
  const len = Math.min(p1Resources.timestamps.length, p2Resources.timestamps.length);
  if (len < 2) return [];

  const timestamps = p1Resources.timestamps.slice(0, len);

  const totalDeltas = computeDeltas(p1Resources.total, p2Resources.total, len);
  const militaryDeltas = computeDeltas(p1Resources.military, p2Resources.military, len);

  const allCandidates: DeltaCandidate[] = [
    ...findCandidates(totalDeltas, timestamps, 'total'),
    ...findCandidates(militaryDeltas, timestamps, 'military'),
  ];

  const merged = mergeNearbyCandidates(allCandidates, 60);
  const topN = merged.slice(0, maxPoints);

  return topN.map(candidate => {
    const cluster = buildDestructionCluster(candidate.timestamp, 20, p1Build, p2Build);

    return {
      timestamp: candidate.timestamp,
      scoreType: candidate.scoreType,
      deltaShift: candidate.deltaShift,
      magnitude: Math.abs(candidate.deltaShift),
      favoredPlayer: candidate.deltaShift > 0 ? 1 : 2,
      destructionCluster: cluster,
    };
  });
}
