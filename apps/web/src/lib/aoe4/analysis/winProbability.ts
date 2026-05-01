import { GameSummary } from '../parser/gameSummaryParser';
import {
  PostMatchHoverSnapshot,
  PostMatchViewModel,
  ResourceAccountingValues,
} from './postMatchViewModel';

export const WIN_PROBABILITY_FEATURE_SCHEMA_VERSION = 'wp-state-v1';

export type WinProbabilityPerspective = 'you' | 'opponent';

export interface MatchSkillBracket {
  label: string;
  lowerBound: number | null;
  upperBound: number | null;
  averageElo: number | null;
  source: 'average-lobby-elo' | 'unknown';
}

export interface WinProbabilityCutoff {
  stateCutoffSeconds: number;
  usesFutureState: false;
  outcomeLabelUsesFinalResult: true;
  excludedFutureFields: string[];
}

export interface WinProbabilityFeatures {
  ownEconomicValue: number;
  opponentEconomicValue: number;
  deltaEconomicValue: number;
  ownTechnologyValue: number;
  opponentTechnologyValue: number;
  deltaTechnologyValue: number;
  ownMilitaryValue: number;
  opponentMilitaryValue: number;
  deltaMilitaryValue: number;
  ownOtherValue: number;
  opponentOtherValue: number;
  deltaOtherValue: number;
  ownDestroyedValue: number;
  opponentDestroyedValue: number;
  deltaDestroyedValue: number;
  ownOverallValue: number;
  opponentOverallValue: number;
  deltaOverallValue: number;
  ownFloatValue: number;
  opponentFloatValue: number;
  deltaFloatValue: number;
  ownOpportunityLostValue: number;
  opponentOpportunityLostValue: number;
  deltaOpportunityLostValue: number;
  ownGatheredValue: number;
  opponentGatheredValue: number;
  deltaGatheredValue: number;
  ownEconomicShare: number;
  opponentEconomicShare: number;
  deltaEconomicShare: number;
  ownTechnologyShare: number;
  opponentTechnologyShare: number;
  deltaTechnologyShare: number;
  ownMilitaryShare: number;
  opponentMilitaryShare: number;
  deltaMilitaryShare: number;
  ownGatherRate: number;
  opponentGatherRate: number;
  deltaGatherRate: number;
  ownAdjustedMilitaryValue: number;
  opponentAdjustedMilitaryValue: number;
  deltaAdjustedMilitaryValue: number;
  ownRawMilitaryValue: number;
  opponentRawMilitaryValue: number;
  deltaRawMilitaryValue: number;
  ownCounterAdjustedMilitaryValue: number;
  opponentCounterAdjustedMilitaryValue: number;
  deltaCounterAdjustedMilitaryValue: number;
  ownUpgradeMultiplier: number;
  opponentUpgradeMultiplier: number;
  deltaUpgradeMultiplier: number;
  ownOverallValueChange60s: number;
  opponentOverallValueChange60s: number;
  deltaOverallValueChange60s: number;
  ownMilitaryValueChange60s: number;
  opponentMilitaryValueChange60s: number;
  deltaMilitaryValueChange60s: number;
  ownEconomicValueChange60s: number;
  opponentEconomicValueChange60s: number;
  deltaEconomicValueChange60s: number;
  ownGatherRateChange60s: number;
  opponentGatherRateChange60s: number;
  deltaGatherRateChange60s: number;
  ownDestroyedValueChange60s: number;
  opponentDestroyedValueChange60s: number;
  deltaDestroyedValueChange60s: number;
  ownOpportunityLostValueChange60s: number;
  opponentOpportunityLostValueChange60s: number;
  deltaOpportunityLostValueChange60s: number;
}

export interface WinProbabilityExample {
  gameId: number;
  leaderboard: string;
  timestampSeconds: number;
  perspective: WinProbabilityPerspective;
  playerProfileId: number;
  opponentProfileId: number;
  playerCivilization: string;
  opponentCivilization: string;
  matchSkillBracket: MatchSkillBracket;
  featureSchemaVersion: typeof WIN_PROBABILITY_FEATURE_SCHEMA_VERSION;
  label: {
    eventualWin: boolean;
    result: 'win' | 'loss';
  };
  features: WinProbabilityFeatures;
  cutoff: WinProbabilityCutoff;
  warnings: string[];
}

export interface BuildWinProbabilityExamplesParams {
  summary: GameSummary;
  model: PostMatchViewModel;
  perspectiveProfileId: string | number;
  matchAverageElo?: number | null;
  bracketSize?: number;
  lookbackSeconds?: number;
}

interface AllocationState {
  economic: number;
  technology: number;
  military: number;
  other: number;
  destroyed: number;
  overall: number;
  float: number;
  opportunityLost: number;
  gathered: number;
  economicShare: number;
  technologyShare: number;
  militaryShare: number;
  gatherRate: number;
  adjustedMilitary: number;
  rawMilitary: number;
  counterAdjustedMilitary: number;
  upgradeMultiplier: number;
}

const EXCLUDED_FUTURE_FIELDS = [
  'finalPoolDelta',
  'finalDuration',
  'finalScore',
  'oneLineStory',
  'significantEvent.futureImpact',
];

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildMatchSkillBracket(
  averageElo: number | null | undefined,
  bracketSize = 100
): MatchSkillBracket {
  const finiteAverage = finiteOrNull(averageElo);
  if (finiteAverage === null || bracketSize <= 0) {
    return {
      label: 'unknown',
      lowerBound: null,
      upperBound: null,
      averageElo: null,
      source: 'unknown',
    };
  }

  const roundedAverage = Math.round(finiteAverage);
  const lowerBound = Math.floor(roundedAverage / bracketSize) * bracketSize;
  const upperBound = lowerBound + bracketSize - 1;

  return {
    label: `${lowerBound}-${upperBound}`,
    lowerBound,
    upperBound,
    averageElo: roundedAverage,
    source: 'average-lobby-elo',
  };
}

function normalizeToken(input: string): string {
  return input.trim().toLowerCase();
}

function perspectiveIndex(summary: GameSummary, perspectiveProfileId: string | number): 0 | 1 {
  const raw = String(perspectiveProfileId);
  const asNumber = Number(raw);

  if (!Number.isNaN(asNumber)) {
    const matched = summary.players.findIndex(player => player.profileId === asNumber);
    if (matched === 0 || matched === 1) return matched as 0 | 1;
  }

  const numericPrefixMatch = raw.match(/^(\d+)/);
  if (numericPrefixMatch) {
    const prefixedId = Number(numericPrefixMatch[1]);
    const matched = summary.players.findIndex(player => player.profileId === prefixedId);
    if (matched === 0 || matched === 1) return matched as 0 | 1;
  }

  const byName = summary.players.findIndex(player => normalizeToken(player.name) === normalizeToken(raw));
  if (byName === 0 || byName === 1) return byName as 0 | 1;

  return 0;
}

function fallbackAccounting(
  snapshot: PostMatchHoverSnapshot,
  side: WinProbabilityPerspective
): ResourceAccountingValues {
  const values = snapshot[side];
  return {
    economic: values.economic,
    populationCap: values.populationCap,
    militaryCapacity: values.militaryCapacity,
    militaryActive: values.militaryActive,
    defensive: values.defensive,
    research: values.research,
    advancement: values.advancement,
    destroyed: 0,
    float: 0,
    gathered: values.total,
    total: values.total,
  };
}

function allocationState(
  snapshot: PostMatchHoverSnapshot,
  side: WinProbabilityPerspective
): AllocationState {
  const accounting = snapshot.accounting?.[side] ?? fallbackAccounting(snapshot, side);
  const economic = Math.max(0, accounting.economic);
  const technology = Math.max(0, accounting.research + accounting.advancement);
  const military = Math.max(0, accounting.militaryCapacity + accounting.militaryActive + accounting.defensive);
  const other = Math.max(0, accounting.populationCap);
  const destroyed = Math.max(0, accounting.destroyed);
  const overall = Math.max(0, economic + technology + military + other - destroyed);
  const float = Math.max(0, accounting.float);
  const opportunityLost = Math.max(0, snapshot.villagerOpportunity[side].cumulativeLoss);
  const gathered = Math.max(0, accounting.gathered);
  const shareTotal = economic + technology + military;

  return {
    economic,
    technology,
    military,
    other,
    destroyed,
    overall,
    float,
    opportunityLost,
    gathered,
    economicShare: shareTotal > 0 ? roundToTenth((economic / shareTotal) * 100) : 0,
    technologyShare: shareTotal > 0 ? roundToTenth((technology / shareTotal) * 100) : 0,
    militaryShare: shareTotal > 0 ? roundToTenth((military / shareTotal) * 100) : 0,
    gatherRate: snapshot.gather[side],
    adjustedMilitary: snapshot.adjustedMilitary[side],
    rawMilitary: side === 'you'
      ? snapshot.adjustedMilitary.youRaw
      : snapshot.adjustedMilitary.opponentRaw,
    counterAdjustedMilitary: side === 'you'
      ? snapshot.adjustedMilitary.youCounterAdjusted
      : snapshot.adjustedMilitary.opponentCounterAdjusted,
    upgradeMultiplier: side === 'you'
      ? snapshot.adjustedMilitary.youUpgradeMultiplier
      : snapshot.adjustedMilitary.opponentUpgradeMultiplier,
  };
}

function pointAtOrBefore(
  snapshots: PostMatchHoverSnapshot[],
  timestamp: number
): PostMatchHoverSnapshot {
  let candidate = snapshots[0];
  for (const snapshot of snapshots) {
    if (snapshot.timestamp > timestamp) break;
    candidate = snapshot;
  }

  return candidate;
}

function change(current: number, previous: number): number {
  return roundToTenth(current - previous);
}

function buildFeatures(
  snapshot: PostMatchHoverSnapshot,
  previousSnapshot: PostMatchHoverSnapshot,
  perspective: WinProbabilityPerspective
): WinProbabilityFeatures {
  const opponent: WinProbabilityPerspective = perspective === 'you' ? 'opponent' : 'you';
  const own = allocationState(snapshot, perspective);
  const opp = allocationState(snapshot, opponent);
  const previousOwn = allocationState(previousSnapshot, perspective);
  const previousOpp = allocationState(previousSnapshot, opponent);

  const delta = (ownValue: number, opponentValue: number) => roundToTenth(ownValue - opponentValue);
  const trendDelta = (
    ownCurrent: number,
    ownPrevious: number,
    opponentCurrent: number,
    opponentPrevious: number
  ) => change(delta(ownCurrent, opponentCurrent), delta(ownPrevious, opponentPrevious));

  return {
    ownEconomicValue: own.economic,
    opponentEconomicValue: opp.economic,
    deltaEconomicValue: delta(own.economic, opp.economic),
    ownTechnologyValue: own.technology,
    opponentTechnologyValue: opp.technology,
    deltaTechnologyValue: delta(own.technology, opp.technology),
    ownMilitaryValue: own.military,
    opponentMilitaryValue: opp.military,
    deltaMilitaryValue: delta(own.military, opp.military),
    ownOtherValue: own.other,
    opponentOtherValue: opp.other,
    deltaOtherValue: delta(own.other, opp.other),
    ownDestroyedValue: own.destroyed,
    opponentDestroyedValue: opp.destroyed,
    deltaDestroyedValue: delta(own.destroyed, opp.destroyed),
    ownOverallValue: own.overall,
    opponentOverallValue: opp.overall,
    deltaOverallValue: delta(own.overall, opp.overall),
    ownFloatValue: own.float,
    opponentFloatValue: opp.float,
    deltaFloatValue: delta(own.float, opp.float),
    ownOpportunityLostValue: own.opportunityLost,
    opponentOpportunityLostValue: opp.opportunityLost,
    deltaOpportunityLostValue: delta(own.opportunityLost, opp.opportunityLost),
    ownGatheredValue: own.gathered,
    opponentGatheredValue: opp.gathered,
    deltaGatheredValue: delta(own.gathered, opp.gathered),
    ownEconomicShare: own.economicShare,
    opponentEconomicShare: opp.economicShare,
    deltaEconomicShare: delta(own.economicShare, opp.economicShare),
    ownTechnologyShare: own.technologyShare,
    opponentTechnologyShare: opp.technologyShare,
    deltaTechnologyShare: delta(own.technologyShare, opp.technologyShare),
    ownMilitaryShare: own.militaryShare,
    opponentMilitaryShare: opp.militaryShare,
    deltaMilitaryShare: delta(own.militaryShare, opp.militaryShare),
    ownGatherRate: own.gatherRate,
    opponentGatherRate: opp.gatherRate,
    deltaGatherRate: delta(own.gatherRate, opp.gatherRate),
    ownAdjustedMilitaryValue: own.adjustedMilitary,
    opponentAdjustedMilitaryValue: opp.adjustedMilitary,
    deltaAdjustedMilitaryValue: delta(own.adjustedMilitary, opp.adjustedMilitary),
    ownRawMilitaryValue: own.rawMilitary,
    opponentRawMilitaryValue: opp.rawMilitary,
    deltaRawMilitaryValue: delta(own.rawMilitary, opp.rawMilitary),
    ownCounterAdjustedMilitaryValue: own.counterAdjustedMilitary,
    opponentCounterAdjustedMilitaryValue: opp.counterAdjustedMilitary,
    deltaCounterAdjustedMilitaryValue: delta(own.counterAdjustedMilitary, opp.counterAdjustedMilitary),
    ownUpgradeMultiplier: own.upgradeMultiplier,
    opponentUpgradeMultiplier: opp.upgradeMultiplier,
    deltaUpgradeMultiplier: delta(own.upgradeMultiplier, opp.upgradeMultiplier),
    ownOverallValueChange60s: change(own.overall, previousOwn.overall),
    opponentOverallValueChange60s: change(opp.overall, previousOpp.overall),
    deltaOverallValueChange60s: trendDelta(own.overall, previousOwn.overall, opp.overall, previousOpp.overall),
    ownMilitaryValueChange60s: change(own.military, previousOwn.military),
    opponentMilitaryValueChange60s: change(opp.military, previousOpp.military),
    deltaMilitaryValueChange60s: trendDelta(own.military, previousOwn.military, opp.military, previousOpp.military),
    ownEconomicValueChange60s: change(own.economic, previousOwn.economic),
    opponentEconomicValueChange60s: change(opp.economic, previousOpp.economic),
    deltaEconomicValueChange60s: trendDelta(own.economic, previousOwn.economic, opp.economic, previousOpp.economic),
    ownGatherRateChange60s: change(own.gatherRate, previousOwn.gatherRate),
    opponentGatherRateChange60s: change(opp.gatherRate, previousOpp.gatherRate),
    deltaGatherRateChange60s: trendDelta(own.gatherRate, previousOwn.gatherRate, opp.gatherRate, previousOpp.gatherRate),
    ownDestroyedValueChange60s: change(own.destroyed, previousOwn.destroyed),
    opponentDestroyedValueChange60s: change(opp.destroyed, previousOpp.destroyed),
    deltaDestroyedValueChange60s: trendDelta(own.destroyed, previousOwn.destroyed, opp.destroyed, previousOpp.destroyed),
    ownOpportunityLostValueChange60s: change(own.opportunityLost, previousOwn.opportunityLost),
    opponentOpportunityLostValueChange60s: change(opp.opportunityLost, previousOpp.opportunityLost),
    deltaOpportunityLostValueChange60s: trendDelta(
      own.opportunityLost,
      previousOwn.opportunityLost,
      opp.opportunityLost,
      previousOpp.opportunityLost
    ),
  };
}

function hasCumulativeGatheredSeries(summary: GameSummary): boolean {
  return summary.players.every(player =>
    Boolean(
      player.resources.foodGathered?.length ||
      player.resources.woodGathered?.length ||
      player.resources.goldGathered?.length ||
      player.resources.stoneGathered?.length ||
      player.resources.oliveoilGathered?.length
    )
  );
}

function warningsFor(summary: GameSummary, bracket: MatchSkillBracket): string[] {
  const warnings: string[] = [];
  if (bracket.source === 'unknown') {
    warnings.push('Match average Elo was not provided; examples are not bracket-conditioned.');
  }
  if (!hasCumulativeGatheredSeries(summary)) {
    warnings.push('Summary lacks cumulative gathered series for at least one player; float features may depend on the post-match gathered fallback.');
  }

  return warnings;
}

export function buildWinProbabilityExamples(
  params: BuildWinProbabilityExamplesParams
): WinProbabilityExample[] {
  const bracket = buildMatchSkillBracket(params.matchAverageElo, params.bracketSize);
  const lookbackSeconds = params.lookbackSeconds ?? 60;
  const snapshots = [...params.model.trajectory.hoverSnapshots]
    .sort((a, b) => a.timestamp - b.timestamp);
  if (snapshots.length === 0 || params.summary.players.length < 2) return [];

  const youIndex = perspectiveIndex(params.summary, params.perspectiveProfileId);
  const opponentIndex = youIndex === 0 ? 1 : 0;
  const players = {
    you: params.summary.players[youIndex],
    opponent: params.summary.players[opponentIndex],
  };
  const warnings = warningsFor(params.summary, bracket);

  return snapshots.flatMap(snapshot => {
    const previousSnapshot = pointAtOrBefore(
      snapshots,
      Math.max(0, snapshot.timestamp - lookbackSeconds)
    );

    return (['you', 'opponent'] as const).map(perspective => {
      const opponent = perspective === 'you' ? 'opponent' : 'you';
      const player = players[perspective];
      const opponentPlayer = players[opponent];

      return {
        gameId: params.summary.gameId,
        leaderboard: params.summary.leaderboard,
        timestampSeconds: snapshot.timestamp,
        perspective,
        playerProfileId: player.profileId,
        opponentProfileId: opponentPlayer.profileId,
        playerCivilization: player.civilization,
        opponentCivilization: opponentPlayer.civilization,
        matchSkillBracket: bracket,
        featureSchemaVersion: WIN_PROBABILITY_FEATURE_SCHEMA_VERSION,
        label: {
          eventualWin: player.result === 'win',
          result: player.result,
        },
        features: buildFeatures(snapshot, previousSnapshot, perspective),
        cutoff: {
          stateCutoffSeconds: snapshot.timestamp,
          usesFutureState: false,
          outcomeLabelUsesFinalResult: true,
          excludedFutureFields: EXCLUDED_FUTURE_FIELDS,
        },
        warnings,
      };
    });
  });
}
