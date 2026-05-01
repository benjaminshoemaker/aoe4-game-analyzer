import resourceBandConfigJson from '../data/resourceBandConfig.json';
import postMatchStoryConfigJson from '../data/postMatchStoryConfig.json';
import { GameAnalysis } from './types';
import { getAgeUpTime } from './phaseIdentification';
import { GameSummary } from '../parser/gameSummaryParser';
import { BandItemDeltaEvent, BandItemSnapshotPoint, GatherRatePoint, PoolBand, PoolSeriesPoint } from './resourcePool';
import {
  buildVillagerOpportunityForPlayer,
  VillagerOpportunityForPlayer,
  VillagerOpportunityPoint
} from './villagerOpportunity';
import { SignificantResourceLossEvent, SignificantResourceLossItem, SignificantResourceLossKind } from './significantResourceLossEvents';

export type BetShapeLabel =
  | 'economic-heavy'
  | 'economic'
  | 'balanced'
  | 'military'
  | 'military-heavy'
  | 'defensive';

export type EventCategory = 'Timing' | 'Bet shape' | 'Economy' | 'Engagement' | 'Civ overlay' | 'Destruction';

export interface BandShares {
  economic: number;
  populationCap: number;
  militaryCapacity: number;
  militaryActive: number;
  defensive: number;
  research: number;
  advancement: number;
}

export interface BetShapeResult {
  label: BetShapeLabel;
  economicShare: number;
  militaryShare: number;
  defensiveShare: number;
  primaryShare: number;
}

export interface PostMatchEventCard {
  id: string;
  timestamp: number;
  phase: string;
  category: EventCategory;
  description: string;
  score: number;
  magnitude: number;
}

export interface MetricBetCard {
  label: BetShapeLabel;
  subtitlePercent: number;
  economicPercent: number;
  militaryPercent: number;
}

export type PostMatchPlayerKey = 'you' | 'opponent';
export type AgeMarkerAge = 'Feudal' | 'Castle' | 'Imperial';

export interface AgeMarker {
  player: PostMatchPlayerKey;
  age: AgeMarkerAge;
  timestamp: number;
  label: string;
  shortLabel: string;
  timeLabel: string;
}

export interface FavorableUnderdogFightContext {
  summary: string;
  details: string;
}

export interface SignificantTimelineEvent extends Omit<SignificantResourceLossEvent, 'victimPlayer' | 'kind'> {
  victim: PostMatchPlayerKey;
  victimLabel: string;
  victimCivilization: string;
  actorCivilization: string;
  player1Civilization: string;
  player2Civilization: string;
  encounterLosses: {
    player1: SignificantResourceLossItem[];
    player2: SignificantResourceLossItem[];
  };
  kind: SignificantResourceLossKind;
  timeLabel: string;
  headline: string;
  favorableUnderdogFight?: FavorableUnderdogFightContext;
}

export interface AdjustedMilitarySeriesPoint {
  timestamp: number;
  you: number;
  opponent: number;
  delta: number;
  youRawMilitaryActive: number;
  opponentRawMilitaryActive: number;
  youCounterAdjustedMilitaryActive: number;
  opponentCounterAdjustedMilitaryActive: number;
  youUpgradeMultiplier: number;
  opponentUpgradeMultiplier: number;
  youUnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
  opponentUnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
}

export interface AdjustedMilitaryUnitBreakdownRow {
  unitId: string;
  unitName: string;
  count: number;
  rawValue: number;
  counterFactor: number;
  upgradeFactor: number;
  adjustedValue: number;
  deltaValue: number;
  why: string;
}

export interface VillagerOpportunityContext {
  totalResourcesGathered: number;
  totalPossibleResources: number;
  cumulativeLoss: number;
  lossShareOfPossible: number;
  damageDealtToOpponent: number;
  damageDealtToOpponentPossible: number;
  damageDealtToOpponentShare: number;
  netEcoSwing: number;
}

export interface VillagerOpportunityResourcePoint {
  timestamp: number;
  cumulativeLoss: number;
  cumulativeResourcesGained: number;
  cumulativeResourcesPossible: number;
}

export interface HoverBandBreakdownEntry {
  label: string;
  value: number;
  percent: number;
  count?: number;
  category?: string;
}

export interface ResourceAccountingValues {
  economic: number;
  populationCap: number;
  militaryCapacity: number;
  militaryActive: number;
  defensive: number;
  research: number;
  advancement: number;
  destroyed: number;
  float: number;
  gathered: number;
  total: number;
}

export interface ResourceAccountingSnapshot {
  you: ResourceAccountingValues;
  opponent: ResourceAccountingValues;
  delta: ResourceAccountingValues;
}

export interface PostMatchHoverSnapshot {
  timestamp: number;
  timeLabel: string;
  markers: string[];
  you: {
    economic: number;
    populationCap: number;
    militaryCapacity: number;
    militaryActive: number;
    defensive: number;
    research: number;
    advancement: number;
    total: number;
  };
  opponent: {
    economic: number;
    populationCap: number;
    militaryCapacity: number;
    militaryActive: number;
    defensive: number;
    research: number;
    advancement: number;
    total: number;
  };
  delta: {
    economic: number;
    populationCap: number;
    militaryCapacity: number;
    militaryActive: number;
    defensive: number;
    research: number;
    advancement: number;
    total: number;
  };
  accounting?: ResourceAccountingSnapshot;
  gather: {
    you: number;
    opponent: number;
    delta: number;
  };
  villagerOpportunity: {
    you: VillagerOpportunityResourcePoint;
    opponent: VillagerOpportunityResourcePoint;
  };
  adjustedMilitary: {
    you: number;
    opponent: number;
    delta: number;
    youRaw: number;
    opponentRaw: number;
    youCounterAdjusted: number;
    opponentCounterAdjusted: number;
    youCounterMultiplier: number | null;
    opponentCounterMultiplier: number | null;
    youUpgradeMultiplier: number;
    opponentUpgradeMultiplier: number;
    youPct: number | null;
    opponentPct: number | null;
    youUnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
    opponentUnitBreakdown: AdjustedMilitaryUnitBreakdownRow[];
  };
  bandBreakdown: {
    economic: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    populationCap: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    militaryCapacity: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    militaryActive: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    defensive: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    research: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    advancement: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
    destroyed?: {
      you: HoverBandBreakdownEntry[];
      opponent: HoverBandBreakdownEntry[];
    };
  };
  significantEvent?: SignificantTimelineEvent | null;
}

export interface PostMatchViewModel {
  header: {
    mode: string;
    durationLabel: string;
    map: string;
    summaryUrl: string;
    youCivilization: string;
    opponentCivilization: string;
    outcome: string;
  };
  deferredBanner: string | null;
  metricCards: {
    finalPoolDelta: number;
    castleAgeDeltaSeconds: number | null;
    yourBet: MetricBetCard | null;
    opponentBet: MetricBetCard | null;
  };
  trajectory: {
    durationSeconds: number;
    yAxisMax: number;
    youSeries: PoolSeriesPoint[];
    opponentSeries: PoolSeriesPoint[];
    adjustedMilitarySeries: AdjustedMilitarySeriesPoint[];
    youBandItemDeltas: BandItemDeltaEvent[];
    opponentBandItemDeltas: BandItemDeltaEvent[];
    hoverSnapshots: PostMatchHoverSnapshot[];
    ageMarkers: AgeMarker[];
    significantEvents?: SignificantTimelineEvent[];
  };
  gatherRate: {
    durationSeconds: number;
    youSeries: GatherRatePoint[];
    opponentSeries: GatherRatePoint[];
  };
  villagerOpportunity: {
    targetVillagers: number;
    you: VillagerOpportunityForPlayer;
    opponent: VillagerOpportunityForPlayer;
    resourceSeries: {
      you: VillagerOpportunityResourcePoint[];
      opponent: VillagerOpportunityResourcePoint[];
    };
    context: {
      you: VillagerOpportunityContext;
      opponent: VillagerOpportunityContext;
    };
  };
  events: PostMatchEventCard[];
  oneLineStory: string;
}

export interface StoryBuildInput {
  yourBetLabel: BetShapeLabel;
  oppBetLabel: BetShapeLabel;
  yourEconomicPercent: number;
  oppEconomicPercent: number;
  gapAtCastlePercentPoints: number;
  topDestructiveEventSentence: string;
  civOverlaySentence?: string;
  finalPoolDelta: number;
}

interface StoryConfig {
  betConsequenceClauses: Record<string, string>;
  defaultClauses: Record<BetShapeLabel, string>;
}

interface ThresholdConfig {
  economicHeavy: number;
  economic: number;
  balancedSingleBandMax: number;
  balancedTopTwoMax: number;
  military: number;
  militaryHeavy: number;
  defensive: number;
}

interface EventCandidate {
  id: string;
  timestamp: number;
  category: EventCategory;
  description: string;
  magnitude: number;
  score: number;
  phase?: string;
}

const storyConfig = postMatchStoryConfigJson as StoryConfig;
const thresholdConfig = resourceBandConfigJson.betShapeThresholds as ThresholdConfig;

function finalVillagerOpportunityPoint(opportunity: VillagerOpportunityForPlayer): VillagerOpportunityPoint {
  return (
    opportunity.series[opportunity.series.length - 1] ?? {
      timestamp: 0,
      expectedVillagerRateRpm: 0,
      expectedVillagers: 0,
      producedVillagers: 0,
      aliveVillagers: 0,
      underproductionDeficit: 0,
      deathDeficit: 0,
      totalDeficit: 0,
      underproductionLossPerMin: 0,
      deathLossPerMin: 0,
      totalLossPerMin: 0,
      cumulativeUnderproductionLoss: 0,
      cumulativeDeathLoss: 0,
      cumulativeTotalLoss: 0,
    }
  );
}

function buildVillagerOpportunityContext(
  ownOpportunity: VillagerOpportunityForPlayer,
  opponentOpportunity: VillagerOpportunityForPlayer,
  ownTotalGathered: number,
  opponentTotalGathered: number
): VillagerOpportunityContext {
  const ownFinal = finalVillagerOpportunityPoint(ownOpportunity);
  const opponentFinal = finalVillagerOpportunityPoint(opponentOpportunity);
  const ownLoss = ownFinal.cumulativeTotalLoss;
  const damageDealtToOpponent = opponentFinal.cumulativeDeathLoss;

  const totalPossibleResources = ownTotalGathered + ownLoss;
  const damageDealtToOpponentPossible = opponentTotalGathered + damageDealtToOpponent;

  const lossShareOfPossible =
    totalPossibleResources > 0
      ? ownLoss / totalPossibleResources
      : 0;

  const damageDealtToOpponentShare =
    damageDealtToOpponentPossible > 0
      ? damageDealtToOpponent / damageDealtToOpponentPossible
      : 0;

  return {
    totalResourcesGathered: ownTotalGathered,
    totalPossibleResources,
    cumulativeLoss: ownLoss,
    lossShareOfPossible,
    damageDealtToOpponent,
    damageDealtToOpponentPossible,
    damageDealtToOpponentShare,
    netEcoSwing: damageDealtToOpponent - ownLoss,
  };
}

interface CumulativeGatheredPoint {
  timestamp: number;
  value: number;
}

function normalizeCumulativeGatheredSeries(
  points: CumulativeGatheredPoint[],
  duration: number
): CumulativeGatheredPoint[] {
  const bounded = points
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .map(point => ({
      timestamp: Math.max(0, Math.min(duration, point.timestamp)),
      value: Math.max(0, point.value),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const deduped: CumulativeGatheredPoint[] = [];
  for (const point of bounded) {
    const last = deduped[deduped.length - 1];
    if (last && last.timestamp === point.timestamp) {
      last.value = point.value;
    } else {
      deduped.push({ ...point });
    }
  }

  if (deduped.length === 0) {
    deduped.push({ timestamp: 0, value: 0 });
  }

  if (deduped[0].timestamp > 0) {
    deduped.unshift({ timestamp: 0, value: 0 });
  }

  const last = deduped[deduped.length - 1];
  if (last.timestamp < duration) {
    deduped.push({ timestamp: duration, value: last.value });
  }

  let runningMax = 0;
  return deduped.map(point => {
    runningMax = Math.max(runningMax, point.value);
    return {
      timestamp: point.timestamp,
      value: runningMax,
    };
  });
}

function cumulativeValueAtOrBefore(series: CumulativeGatheredPoint[], timestamp: number): number {
  if (series.length === 0) return 0;

  let candidate = series[0].value;
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point.value;
  }

  return candidate;
}

function buildCumulativeGatheredSeries(
  player: GameSummary['players'][number],
  duration: number
): CumulativeGatheredPoint[] {
  const sourceTimestamps = player.resources.timestamps
    .filter(value => Number.isFinite(value))
    .map(value => Math.max(0, Math.min(duration, value)));

  const hasGatheredSeries = Boolean(
    player.resources.foodGathered?.length ||
    player.resources.woodGathered?.length ||
    player.resources.goldGathered?.length ||
    player.resources.stoneGathered?.length ||
    player.resources.oliveoilGathered?.length
  );

  const points: CumulativeGatheredPoint[] = [];

  if (hasGatheredSeries) {
    for (let i = 0; i < sourceTimestamps.length; i += 1) {
      const gatheredAtIndex =
        (player.resources.foodGathered?.[i] ?? 0) +
        (player.resources.woodGathered?.[i] ?? 0) +
        (player.resources.goldGathered?.[i] ?? 0) +
        (player.resources.stoneGathered?.[i] ?? 0) +
        (player.resources.oliveoilGathered?.[i] ?? 0);

      points.push({
        timestamp: sourceTimestamps[i],
        value: Math.max(0, gatheredAtIndex),
      });
    }
  } else {
    const timestamps = sourceTimestamps.length > 0
      ? sourceTimestamps
      : [0, duration];
    let cumulative = 0;
    points.push({ timestamp: timestamps[0] ?? 0, value: 0 });

    for (let i = 1; i < timestamps.length; i += 1) {
      const elapsed = Math.max(0, timestamps[i] - timestamps[i - 1]);
      const rpm =
        (player.resources.foodPerMin[i - 1] ?? 0) +
        (player.resources.woodPerMin[i - 1] ?? 0) +
        (player.resources.goldPerMin[i - 1] ?? 0) +
        (player.resources.stonePerMin[i - 1] ?? 0) +
        (player.resources.oliveoilPerMin?.[i - 1] ?? 0);
      cumulative += (Math.max(0, rpm) / 60) * elapsed;
      points.push({
        timestamp: timestamps[i],
        value: cumulative,
      });
    }
  }

  const normalized = normalizeCumulativeGatheredSeries(points, duration);
  const lastValue = normalized[normalized.length - 1]?.value ?? 0;
  const reportedTotalGathered = Math.max(0, player.totalResourcesGathered.total);

  if (lastValue > 0 && reportedTotalGathered > 0) {
    const scale = reportedTotalGathered / lastValue;
    return normalized.map(point => ({
      timestamp: point.timestamp,
      value: point.value * scale,
    }));
  }

  if (reportedTotalGathered > 0) {
    return normalizeCumulativeGatheredSeries([
      { timestamp: 0, value: 0 },
      { timestamp: duration, value: reportedTotalGathered },
    ], duration);
  }

  return normalized;
}

function buildVillagerOpportunityResourceSeries(
  opportunity: VillagerOpportunityForPlayer,
  player: GameSummary['players'][number],
  duration: number
): VillagerOpportunityResourcePoint[] {
  const fallbackSeries: VillagerOpportunityPoint[] = [{
    timestamp: 0,
    expectedVillagerRateRpm: 0,
    expectedVillagers: 0,
    producedVillagers: 0,
    aliveVillagers: 0,
    underproductionDeficit: 0,
    deathDeficit: 0,
    totalDeficit: 0,
    underproductionLossPerMin: 0,
    deathLossPerMin: 0,
    totalLossPerMin: 0,
    cumulativeUnderproductionLoss: 0,
    cumulativeDeathLoss: 0,
    cumulativeTotalLoss: 0,
  }];
  const points = opportunity.series.length > 0 ? opportunity.series : fallbackSeries;
  const cumulativeGatheredSeries = buildCumulativeGatheredSeries(player, duration);

  return points.map(point => {
    const cumulativeResourcesGained = cumulativeValueAtOrBefore(cumulativeGatheredSeries, point.timestamp);
    const cumulativeLoss = Math.max(0, point.cumulativeTotalLoss);
    return {
      timestamp: point.timestamp,
      cumulativeLoss,
      cumulativeResourcesGained,
      cumulativeResourcesPossible: cumulativeResourcesGained + cumulativeLoss,
    };
  });
}

function normalizeToken(input: string): string {
  return input.trim().toLowerCase();
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function buildAgeMarkers(summary: GameSummary, youIndex: 0 | 1): AgeMarker[] {
  const ages: AgeMarkerAge[] = ['Feudal', 'Castle', 'Imperial'];
  const playerSpecs: { player: PostMatchPlayerKey; summaryIndex: 0 | 1; label: string; shortPrefix: string }[] = [
    { player: 'you', summaryIndex: youIndex, label: 'You', shortPrefix: 'Y' },
    {
      player: 'opponent',
      summaryIndex: youIndex === 0 ? 1 : 0,
      label: 'Opponent',
      shortPrefix: 'O',
    },
  ];

  const markers: AgeMarker[] = [];

  for (const spec of playerSpecs) {
    const player = summary.players[spec.summaryIndex];
    if (!player) continue;

    for (const age of ages) {
      const timestamp = getAgeUpTime(player.actions, age);
      if (timestamp === null || timestamp < 0 || timestamp > summary.duration) continue;

      const timeLabel = formatTime(timestamp);
      markers.push({
        player: spec.player,
        age,
        timestamp,
        label: `${spec.label} ${age} ${timeLabel}`,
        shortLabel: `${spec.shortPrefix} ${age}`,
        timeLabel,
      });
    }
  }

  const playerOrder: Record<PostMatchPlayerKey, number> = { you: 0, opponent: 1 };
  const ageOrder: Record<AgeMarkerAge, number> = { Feudal: 0, Castle: 1, Imperial: 2 };

  return markers.sort((a, b) =>
    a.timestamp - b.timestamp ||
    ageOrder[a.age] - ageOrder[b.age] ||
    playerOrder[a.player] - playerOrder[b.player]
  );
}

function buildSignificantTimelineEvents(
  events: SignificantResourceLossEvent[] | undefined,
  youIndex: 0 | 1,
  summary: GameSummary
): SignificantTimelineEvent[] {
  const player1Civilization = civilizationLabel(summary.players[0]?.civilization ?? 'Player 1');
  const player2Civilization = civilizationLabel(summary.players[1]?.civilization ?? 'Player 2');
  return (events ?? [])
    .map(event => {
      const victimSummaryIndex = event.victimPlayer - 1;
      const victim: PostMatchPlayerKey = victimSummaryIndex === youIndex ? 'you' : 'opponent';
      const victimCivilization = event.victimPlayer === 1 ? player1Civilization : player2Civilization;
      const actorCivilization = event.victimPlayer === 1 ? player2Civilization : player1Civilization;
      const favorableUnderdogFight = favorableUnderdogFightContext(event, {
        player1Civilization,
        player2Civilization,
      });
      return {
        ...event,
        victim,
        victimLabel: victimCivilization,
        victimCivilization,
        actorCivilization,
        player1Civilization,
        player2Civilization,
        encounterLosses: {
          player1: event.playerImpacts?.player1?.losses ?? event.playerImpacts?.player1?.topLosses ?? [],
          player2: event.playerImpacts?.player2?.losses ?? event.playerImpacts?.player2?.topLosses ?? [],
        },
        timeLabel: formatTime(event.timestamp),
        headline: significantEventHeadline(event, {
          youIndex,
          player1Civilization,
          player2Civilization,
          favorableUnderdogFight,
        }),
        ...(favorableUnderdogFight ? { favorableUnderdogFight } : {}),
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp || a.victim.localeCompare(b.victim));
}

function civilizationLabel(civilization: string): string {
  const cleaned = civilization.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return civilization;
  return cleaned
    .split(' ')
    .map(word => word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function significantEventDisplayLimit(durationSeconds: number): number {
  return Math.max(1, Math.floor((durationSeconds / 60) / 4));
}

function selectSignificantTimelineEvents(
  events: SignificantTimelineEvent[],
  durationSeconds: number
): SignificantTimelineEvent[] {
  const limit = significantEventDisplayLimit(durationSeconds);
  return [...events]
    .sort((a, b) =>
      (b.grossImpact ?? b.grossLoss) - (a.grossImpact ?? a.grossLoss) ||
      a.timestamp - b.timestamp ||
      a.id.localeCompare(b.id)
    )
    .slice(0, limit)
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

function significantEventLabel(event: SignificantTimelineEvent): string {
  return `${event.victimLabel} ${event.label} ${event.timeLabel}`;
}

function eventImpactForPlayer(event: SignificantResourceLossEvent, player: 1 | 2): { grossLoss: number; villagerDeaths: number } {
  const impact = player === 1 ? event.playerImpacts?.player1 : event.playerImpacts?.player2;
  if (impact) {
    return {
      grossLoss: impact.grossLoss,
      villagerDeaths: impact.villagerDeaths,
    };
  }
  return {
    grossLoss: event.victimPlayer === player ? event.grossLoss : 0,
    villagerDeaths: event.victimPlayer === player ? event.villagerDeaths : 0,
  };
}

function villagerCountText(count: number): string {
  if (count === 1) return 'one villager';
  return `${count} villagers`;
}

function significantEventHeadline(event: SignificantResourceLossEvent, context: {
  youIndex: 0 | 1;
  player1Civilization: string;
  player2Civilization: string;
  favorableUnderdogFight?: FavorableUnderdogFightContext | null;
}): string {
  const perspectivePlayer = (context.youIndex + 1) as 1 | 2;
  const otherPlayer = perspectivePlayer === 1 ? 2 : 1;
  const perspectiveCivilization = perspectivePlayer === 1 ? context.player1Civilization : context.player2Civilization;
  const otherCivilization = otherPlayer === 1 ? context.player1Civilization : context.player2Civilization;
  const perspectiveImpact = eventImpactForPlayer(event, perspectivePlayer);
  const otherImpact = eventImpactForPlayer(event, otherPlayer);

  if (event.kind === 'raid') {
    const victimImpact = eventImpactForPlayer(event, event.victimPlayer);
    const victimCivilization = event.victimPlayer === 1 ? context.player1Civilization : context.player2Civilization;
    const actorCivilization = event.victimPlayer === 1 ? context.player2Civilization : context.player1Civilization;
    const killedText = victimImpact.villagerDeaths > 0
      ? ` and killed ${villagerCountText(victimImpact.villagerDeaths)}`
      : '';
    return `${actorCivilization} raided ${victimCivilization}${killedText}.`;
  }

  if (event.kind === 'fight') {
    const underdogPlayer = favorableUnderdogFightPlayer(event);
    if (context.favorableUnderdogFight && underdogPlayer) {
      const underdogCivilization = underdogPlayer === 1 ? context.player1Civilization : context.player2Civilization;
      const opponentCivilization = underdogPlayer === 1 ? context.player2Civilization : context.player1Civilization;
      return `${underdogCivilization} took a favorable fight against ${opponentCivilization}.`;
    }

    if (perspectiveImpact.grossLoss > otherImpact.grossLoss) {
      return `${perspectiveCivilization} lost more value than ${otherCivilization} in a fight: ${Math.round(perspectiveImpact.grossLoss)} vs ${Math.round(otherImpact.grossLoss)}.`;
    }
    if (perspectiveImpact.grossLoss < otherImpact.grossLoss) {
      return `${perspectiveCivilization} took a favorable fight against ${otherCivilization}: ${Math.round(perspectiveImpact.grossLoss)} lost vs ${Math.round(otherImpact.grossLoss)} lost.`;
    }
    return `${perspectiveCivilization} and ${otherCivilization} traded evenly in a fight: ${Math.round(perspectiveImpact.grossLoss)} each.`;
  }

  const victimCivilization = event.victimPlayer === 1 ? context.player1Civilization : context.player2Civilization;
  const victimImpact = eventImpactForPlayer(event, event.victimPlayer);
  return `${victimCivilization} lost ${Math.round(victimImpact.grossLoss)} value in a significant loss.`;
}

function favorableUnderdogFightPlayer(event: SignificantResourceLossEvent): 1 | 2 | null {
  if (event.kind !== 'fight' || !event.preEncounterArmies) return null;

  const player1Impact = eventImpactForPlayer(event, 1);
  const player2Impact = eventImpactForPlayer(event, 2);
  if (player1Impact.grossLoss === player2Impact.grossLoss) return null;

  const favorablePlayer: 1 | 2 = player1Impact.grossLoss < player2Impact.grossLoss ? 1 : 2;
  const otherPlayer: 1 | 2 = favorablePlayer === 1 ? 2 : 1;
  const favorableKey = favorablePlayer === 1 ? 'player1' : 'player2';
  const otherKey = otherPlayer === 1 ? 'player1' : 'player2';
  const favorableArmy = event.preEncounterArmies[favorableKey].totalValue;
  const otherArmy = event.preEncounterArmies[otherKey].totalValue;

  if (favorableArmy <= 0 || otherArmy < favorableArmy * 2) return null;
  return favorablePlayer;
}

function favorableUnderdogFightContext(event: SignificantResourceLossEvent, context: {
  player1Civilization: string;
  player2Civilization: string;
}): FavorableUnderdogFightContext | null {
  const favorablePlayer = favorableUnderdogFightPlayer(event);
  if (!favorablePlayer) return null;

  const underdogCivilization = favorablePlayer === 1 ? context.player1Civilization : context.player2Civilization;
  const opponentCivilization = favorablePlayer === 1 ? context.player2Civilization : context.player1Civilization;

  return {
    summary: 'Despite significantly fewer deployed military resources.',
    details: `${underdogCivilization} won this encounter despite having significantly fewer deployed military resources than ${opponentCivilization}. That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where ${underdogCivilization} found an advantage, healing, stronger micro, or a favorable unit matchup.`,
  };
}

function formatMode(leaderboard: string): string {
  const lower = leaderboard.toLowerCase();
  if (lower === 'rm_1v1' || lower === 'rm_solo') return 'Ranked 1v1';
  if (lower === 'qm_1v1' || lower === 'qm_solo') return 'Quick Match 1v1';
  return leaderboard.replace(/_/g, ' ').toUpperCase();
}

function formatOutcome(winReason: string, duration: number): string {
  const lower = winReason.toLowerCase();
  const verb = lower.includes('surr') ? 'Surrendered' : 'Defeated';
  return `${verb} ${formatTime(duration)}`;
}

function getBandShares(point: PoolSeriesPoint): BandShares {
  if (point.total <= 0) {
    return {
      economic: 0,
      populationCap: 0,
      militaryCapacity: 0,
      militaryActive: 0,
      defensive: 0,
      research: 0,
      advancement: 0,
    };
  }

  return {
    economic: point.economic / point.total,
    populationCap: point.populationCap / point.total,
    militaryCapacity: point.militaryCapacity / point.total,
    militaryActive: point.militaryActive / point.total,
    defensive: point.defensive / point.total,
    research: point.research / point.total,
    advancement: point.advancement / point.total,
  };
}

export function classifyBetShape(shares: BandShares): BetShapeResult {
  const militaryShare = shares.militaryActive + shares.militaryCapacity;
  const topTwo = [
    shares.economic,
    shares.populationCap,
    shares.militaryCapacity,
    shares.militaryActive,
    shares.defensive,
    shares.research,
    shares.advancement,
  ]
    .sort((a, b) => b - a)
    .slice(0, 2)
    .reduce((sum, value) => sum + value, 0);

  const noBandAboveBalanced =
    shares.economic <= thresholdConfig.balancedSingleBandMax &&
    shares.populationCap <= thresholdConfig.balancedSingleBandMax &&
    shares.militaryCapacity <= thresholdConfig.balancedSingleBandMax &&
    shares.militaryActive <= thresholdConfig.balancedSingleBandMax &&
    shares.defensive <= thresholdConfig.balancedSingleBandMax &&
    shares.research <= thresholdConfig.balancedSingleBandMax &&
    shares.advancement <= thresholdConfig.balancedSingleBandMax;

  let label: BetShapeLabel;
  if (militaryShare >= thresholdConfig.militaryHeavy) {
    label = 'military-heavy';
  } else if (shares.economic >= thresholdConfig.economicHeavy) {
    label = 'economic-heavy';
  } else if (shares.defensive >= thresholdConfig.defensive) {
    label = 'defensive';
  } else if (militaryShare >= thresholdConfig.military) {
    label = 'military';
  } else if (shares.economic >= thresholdConfig.economic) {
    label = 'economic';
  } else if (noBandAboveBalanced && topTwo <= thresholdConfig.balancedTopTwoMax) {
    label = 'balanced';
  } else {
    label = 'balanced';
  }

  const primaryShare =
    label === 'military-heavy' || label === 'military'
      ? militaryShare
      : label === 'defensive'
        ? shares.defensive
        : label === 'balanced'
          ? Math.max(
            shares.economic,
            shares.populationCap,
            shares.militaryCapacity,
            shares.militaryActive,
            shares.defensive,
            shares.research,
            shares.advancement
          )
          : shares.economic;

  return {
    label,
    economicShare: shares.economic,
    militaryShare,
    defensiveShare: shares.defensive,
    primaryShare,
  };
}

function pointAtOrBefore(series: PoolSeriesPoint[], timestamp: number): PoolSeriesPoint {
  if (series.length === 0) {
    return {
      timestamp,
      economic: 0,
      populationCap: 0,
      militaryCapacity: 0,
      militaryActive: 0,
      defensive: 0,
      research: 0,
      advancement: 0,
      total: 0,
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}

function gatherRateAtOrBefore(series: GatherRatePoint[], timestamp: number): number {
  if (series.length === 0) return 0;

  let candidate = series[0].ratePerMin;
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point.ratePerMin;
  }

  return candidate;
}

function villagerResourceAtOrBefore(
  series: VillagerOpportunityResourcePoint[],
  timestamp: number
): VillagerOpportunityResourcePoint {
  if (series.length === 0) {
    return {
      timestamp,
      cumulativeLoss: 0,
      cumulativeResourcesGained: 0,
      cumulativeResourcesPossible: 0,
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}

function adjustedMilitaryAtOrBefore(
  series: AdjustedMilitarySeriesPoint[],
  timestamp: number
): AdjustedMilitarySeriesPoint {
  if (series.length === 0) {
    return {
      timestamp,
      you: 0,
      opponent: 0,
      delta: 0,
      youRawMilitaryActive: 0,
      opponentRawMilitaryActive: 0,
      youCounterAdjustedMilitaryActive: 0,
      opponentCounterAdjustedMilitaryActive: 0,
      youUpgradeMultiplier: 1,
      opponentUpgradeMultiplier: 1,
      youUnitBreakdown: [],
      opponentUnitBreakdown: [],
    };
  }

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}

function bandSnapshotsAtOrBefore(
  series: BandItemSnapshotPoint[] | undefined,
  timestamp: number
): BandItemSnapshotPoint['bands'] | null {
  if (!series || series.length === 0) return null;

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate.bands;
}

function uniqueSortedTimestamps(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isFinite(value) && value >= 0))]
    .sort((a, b) => a - b);
}

function toHoverBandValues(point: PoolSeriesPoint): PostMatchHoverSnapshot['you'] {
  return {
    economic: Math.round(point.economic),
    populationCap: Math.round(point.populationCap),
    militaryCapacity: Math.round(point.militaryCapacity),
    militaryActive: Math.round(point.militaryActive),
    defensive: Math.round(point.defensive),
    research: Math.round(point.research),
    advancement: Math.round(point.advancement),
    total: Math.round(point.total),
  };
}

const accountingBands: PoolBand[] = [
  'economic',
  'populationCap',
  'militaryCapacity',
  'militaryActive',
  'defensive',
  'research',
  'advancement',
];

function createZeroAccountingBands(): Record<PoolBand, number> {
  return {
    economic: 0,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
  };
}

function cumulativeDestroyedByBandAtOrBefore(
  events: BandItemDeltaEvent[] | undefined,
  timestamp: number
): Record<PoolBand, number> {
  const destroyed = createZeroAccountingBands();
  if (!events) return destroyed;

  for (const event of events) {
    if (event.timestamp > timestamp) break;
    if (event.deltaValue >= 0) continue;
    destroyed[event.band] += Math.abs(event.deltaValue);
  }

  return destroyed;
}

function buildResourceAccountingValues(
  point: PoolSeriesPoint,
  destroyedByBand: Record<PoolBand, number>,
  gatheredValue: number
): ResourceAccountingValues {
  const grossBands = accountingBands.reduce<Record<PoolBand, number>>((values, band) => {
    values[band] = Math.max(0, Math.round(point[band] + destroyedByBand[band]));
    return values;
  }, createZeroAccountingBands());
  const destroyed = Math.round(accountingBands.reduce((sum, band) => sum + destroyedByBand[band], 0));
  const grossTotal = accountingBands.reduce((sum, band) => sum + grossBands[band], 0);
  const total = Math.max(0, Math.round(grossTotal - destroyed));
  const gathered = Math.max(0, Math.round(gatheredValue));
  const float = Math.max(0, gathered - total - destroyed);

  return {
    economic: grossBands.economic,
    populationCap: grossBands.populationCap,
    militaryCapacity: grossBands.militaryCapacity,
    militaryActive: grossBands.militaryActive,
    defensive: grossBands.defensive,
    research: grossBands.research,
    advancement: grossBands.advancement,
    destroyed,
    float,
    gathered,
    total,
  };
}

function deltaResourceAccountingValues(
  you: ResourceAccountingValues,
  opponent: ResourceAccountingValues
): ResourceAccountingValues {
  return {
    economic: you.economic - opponent.economic,
    populationCap: you.populationCap - opponent.populationCap,
    militaryCapacity: you.militaryCapacity - opponent.militaryCapacity,
    militaryActive: you.militaryActive - opponent.militaryActive,
    defensive: you.defensive - opponent.defensive,
    research: you.research - opponent.research,
    advancement: you.advancement - opponent.advancement,
    destroyed: you.destroyed - opponent.destroyed,
    float: you.float - opponent.float,
    gathered: you.gathered - opponent.gathered,
    total: you.total - opponent.total,
  };
}

function deltaHoverBandValues(
  you: PostMatchHoverSnapshot['you'],
  opponent: PostMatchHoverSnapshot['opponent']
): PostMatchHoverSnapshot['delta'] {
  return {
    economic: you.economic - opponent.economic,
    populationCap: you.populationCap - opponent.populationCap,
    militaryCapacity: you.militaryCapacity - opponent.militaryCapacity,
    militaryActive: you.militaryActive - opponent.militaryActive,
    defensive: you.defensive - opponent.defensive,
    research: you.research - opponent.research,
    advancement: you.advancement - opponent.advancement,
    total: you.total - opponent.total,
  };
}

function toHoverBreakdownEntries(
  snapshotBands: BandItemSnapshotPoint['bands'] | null,
  band: PoolBand
): HoverBandBreakdownEntry[] {
  if (!snapshotBands) return [];
  return (snapshotBands[band] ?? []).map(entry => ({
    label: entry.itemLabel,
    value: Math.round(entry.value),
    percent: entry.percent,
    count: entry.count,
    category: entry.itemCategory,
  }));
}

function toDestroyedBreakdownEntries(
  events: BandItemDeltaEvent[] | undefined,
  timestamp: number
): HoverBandBreakdownEntry[] {
  const byOccurrence = new Map<string, { itemKey: string; label: string; value: number; count: number; category?: string }>();
  for (const event of events ?? []) {
    if (event.timestamp > timestamp) break;
    if (event.deltaValue >= 0) continue;

    const key = `${event.timestamp}:${event.itemKey}`;
    const existing = byOccurrence.get(key) ?? {
      itemKey: event.itemKey,
      label: event.itemLabel,
      value: 0,
      count: 0,
      category: event.itemCategory,
    };
    existing.value += Math.abs(event.deltaValue);
    existing.count = Math.max(existing.count, Math.abs(event.deltaCount));
    byOccurrence.set(key, existing);
  }

  const byItem = new Map<string, { label: string; value: number; count: number; category?: string }>();
  for (const occurrence of byOccurrence.values()) {
    const existing = byItem.get(occurrence.itemKey) ?? {
      label: occurrence.label,
      value: 0,
      count: 0,
      category: occurrence.category,
    };
    existing.value += occurrence.value;
    existing.count += occurrence.count;
    byItem.set(occurrence.itemKey, existing);
  }

  const total = [...byItem.values()].reduce((sum, entry) => sum + entry.value, 0);
  return [...byItem.values()]
    .filter(entry => entry.value > 0)
    .map(entry => ({
      label: entry.label,
      value: Math.round(entry.value),
      percent: total > 0 ? (entry.value / total) * 100 : 0,
      count: Math.round(entry.count),
      category: entry.category,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function totalGapAt(
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[],
  timestamp: number
): number {
  const yourPoint = pointAtOrBefore(yourSeries, timestamp);
  const oppPoint = pointAtOrBefore(opponentSeries, timestamp);
  return yourPoint.total - oppPoint.total;
}

function scoreWithGapWidening(
  magnitude: number,
  timestamp: number,
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): number {
  const gapNow = Math.abs(totalGapAt(yourSeries, opponentSeries, timestamp));
  const gapInTwoMin = Math.abs(totalGapAt(yourSeries, opponentSeries, timestamp + 120));
  const widening = Math.max(0, gapInTwoMin - gapNow);
  return magnitude + widening / 100;
}

function dedupeByTime(candidates: EventCandidate[], windowSeconds: number): EventCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const kept: EventCandidate[] = [];

  for (const candidate of sorted) {
    const isDuplicate = kept.some(existing => Math.abs(existing.timestamp - candidate.timestamp) < windowSeconds);
    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

export function detectRaidEvents(
  gatherRateSeries: GatherRatePoint[],
  playerKey: 'you' | 'opponent'
): EventCandidate[] {
  const candidates: EventCandidate[] = [];
  if (gatherRateSeries.length < 3) return candidates;

  for (let i = 0; i < gatherRateSeries.length; i += 1) {
    const base = gatherRateSeries[i];
    if (base.ratePerMin <= 0) continue;

    let minPoint: GatherRatePoint | null = null;

    for (let j = i + 1; j < gatherRateSeries.length; j += 1) {
      const point = gatherRateSeries[j];
      if (point.timestamp - base.timestamp > 90) break;
      if (!minPoint || point.ratePerMin < minPoint.ratePerMin) {
        minPoint = point;
      }
    }

    if (!minPoint) continue;

    const dropRatio = (base.ratePerMin - minPoint.ratePerMin) / base.ratePerMin;
    if (dropRatio < 0.10) continue;

    let recoveredRate = minPoint.ratePerMin;
    for (const point of gatherRateSeries) {
      if (point.timestamp < minPoint.timestamp) continue;
      if (point.timestamp > minPoint.timestamp + 180) break;
      recoveredRate = Math.max(recoveredRate, point.ratePerMin);
    }

    const recovered = recoveredRate >= base.ratePerMin * 0.9;
    const who = playerKey === 'you' ? 'Your' : "Opponent's";
    const description = recovered
      ? `${who} gather rate dropped ${Math.round(dropRatio * 100)}% in under 90s, then recovered near baseline within three minutes.`
      : `${who} gather rate dropped ${Math.round(dropRatio * 100)}% in under 90s and did not recover to baseline within three minutes.`;

    const magnitude = Math.round(dropRatio * 100) + (recovered ? 0 : 5);
    candidates.push({
      id: `raid-${playerKey}-${minPoint.timestamp}`,
      timestamp: minPoint.timestamp,
      category: 'Economy',
      description,
      magnitude,
      score: magnitude,
    });
  }

  return dedupeByTime(candidates, 120);
}

function inflectionCandidatesFromAnalysis(
  inflectionPoints: GameAnalysis['inflectionPoints'],
  youIndex: 0 | 1,
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): EventCandidate[] {
  const candidates: EventCandidate[] = [];

  const toPerspectivePlayer = (favoredPlayer: 1 | 2): 'you' | 'opponent' => {
    if (youIndex === 0) {
      return favoredPlayer === 1 ? 'you' : 'opponent';
    }
    return favoredPlayer === 2 ? 'you' : 'opponent';
  };

  for (const inflection of inflectionPoints) {
    const favored = toPerspectivePlayer(inflection.favoredPlayer);
    const whoText = favored === 'you' ? 'You' : 'Opponent';
    const magnitude = Math.max(1, Math.round(inflection.magnitude));
    const descriptionCore = inflection.scoreType === 'military'
      ? `${whoText} gained a military swing of ${magnitude} value.`
      : inflection.scoreType === 'economy'
        ? `${whoText} created an economy swing of ${magnitude} score value.`
        : `${whoText} shifted total score by ${magnitude}.`;

    const clusterSuffix = inflection.destructionCluster
      ? (() => {
        const p1Losses = inflection.destructionCluster.player1Losses
          .reduce((sum, loss) => sum + loss.valueLost, 0);
        const p2Losses = inflection.destructionCluster.player2Losses
          .reduce((sum, loss) => sum + loss.valueLost, 0);
        if (p1Losses <= 0 && p2Losses <= 0) return '';
        return ` Nearby losses: P1 ${Math.round(p1Losses)} value, P2 ${Math.round(p2Losses)} value.`;
      })()
      : '';

    const category: EventCategory = inflection.scoreType === 'military'
      ? 'Engagement'
      : inflection.scoreType === 'economy'
        ? 'Economy'
        : 'Destruction';

    const score = scoreWithGapWidening(
      magnitude,
      inflection.timestamp,
      yourSeries,
      opponentSeries
    );

    candidates.push({
      id: `analysis-inflection-${inflection.timestamp}-${inflection.scoreType}`,
      timestamp: inflection.timestamp,
      category,
      description: `Analysis inflection: ${descriptionCore}${clusterSuffix}`,
      magnitude,
      score,
    });
  }

  return dedupeByTime(candidates, 90);
}

function detectDestructionFallbackEvents(
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): EventCandidate[] {
  const candidates: EventCandidate[] = [];

  function detect(series: PoolSeriesPoint[], who: 'you' | 'opponent'): void {
    for (let i = 1; i < series.length; i += 1) {
      const prev = series[i - 1];
      const cur = series[i];
      const drop = prev.total - cur.total;
      if (drop <= 0) continue;

      const pct = prev.total > 0 ? (drop / prev.total) * 100 : 0;
      if (pct < 8) continue;

      const whoText = who === 'you' ? 'Your' : "Opponent's";
      candidates.push({
        id: `destruction-${who}-${cur.timestamp}`,
        timestamp: cur.timestamp,
        category: 'Destruction',
        description: `${whoText} deployed pool dropped ${Math.round(drop)} value (${Math.round(pct)}%) over a short destruction window.`,
        magnitude: pct,
        score: pct,
      });
    }
  }

  detect(yourSeries, 'you');
  detect(opponentSeries, 'opponent');

  return dedupeByTime(candidates, 90);
}

function ageGapCandidates(
  summary: GameSummary,
  youIndex: 0 | 1,
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): EventCandidate[] {
  const ages = ['Feudal', 'Castle', 'Imperial'] as const;
  const you = summary.players[youIndex];
  const opponent = summary.players[youIndex === 0 ? 1 : 0];

  const candidates: EventCandidate[] = [];

  for (const age of ages) {
    const yourTime = getAgeUpTime(you.actions, age);
    const opponentTime = getAgeUpTime(opponent.actions, age);

    if (yourTime === null || opponentTime === null) continue;

    const diff = Math.abs(yourTime - opponentTime);
    if (diff < 20) continue;

    const youEarlier = yourTime < opponentTime;
    const description = youEarlier
      ? `You reached ${age} ${formatTime(diff)} earlier, opening a timing window before opponent matched age tech.`
      : `Opponent reached ${age} ${formatTime(diff)} earlier, creating a timing window before your age parity.`;

    const timestamp = Math.min(yourTime, opponentTime);
    const magnitude = diff;
    const score = scoreWithGapWidening(magnitude, timestamp, yourSeries, opponentSeries);

    candidates.push({
      id: `timing-${age.toLowerCase()}-${timestamp}`,
      timestamp,
      category: 'Timing',
      description,
      magnitude,
      score,
    });
  }

  return candidates;
}

function castleBetCandidate(
  yourCastleTime: number | null,
  opponentCastleTime: number | null,
  yourBet: BetShapeResult | null,
  opponentBet: BetShapeResult | null,
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): EventCandidate[] {
  if (yourCastleTime === null || opponentCastleTime === null || !yourBet || !opponentBet) return [];

  const econDiff = Math.abs((yourBet.economicShare - opponentBet.economicShare) * 100);
  const milDiff = Math.abs((yourBet.militaryShare - opponentBet.militaryShare) * 100);
  const largestDiff = Math.max(econDiff, milDiff);

  if (largestDiff < 15) return [];

  const timestamp = Math.min(yourCastleTime, opponentCastleTime);
  const magnitude = largestDiff;
  const score = scoreWithGapWidening(magnitude, timestamp, yourSeries, opponentSeries);

  return [{
    id: `castle-bet-divergence-${timestamp}`,
    timestamp,
    category: 'Bet shape',
    description: `Castle-entry mix diverged by ${Math.round(largestDiff)}pp (economic ${Math.round(econDiff)}pp, military ${Math.round(milDiff)}pp).`,
    magnitude,
    score,
  }];
}

function detectCivOverlayCandidates(
  yourFreeSeries: { timestamp: number; cumulativeValue: number }[] = [],
  opponentFreeSeries: { timestamp: number; cumulativeValue: number }[] = [],
  yourSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[]
): EventCandidate[] {
  const candidates: EventCandidate[] = [];

  function addFromSeries(series: { timestamp: number; cumulativeValue: number }[], who: 'you' | 'opponent'): void {
    let lastMarker = 0;
    for (const point of series) {
      const delta = point.cumulativeValue - lastMarker;
      if (delta < 300) continue;
      lastMarker = point.cumulativeValue;

      const whoText = who === 'you' ? 'Your' : "Opponent's";
      const magnitude = delta;
      const score = scoreWithGapWidening(magnitude / 2, point.timestamp, yourSeries, opponentSeries);

      candidates.push({
        id: `overlay-${who}-${point.timestamp}`,
        timestamp: point.timestamp,
        category: 'Civ overlay',
        description: `${whoText} civ overlay added about ${Math.round(delta)} market-value from free-production sources since the previous marker.`,
        magnitude,
        score,
      });
    }
  }

  addFromSeries(yourFreeSeries, 'you');
  addFromSeries(opponentFreeSeries, 'opponent');

  return dedupeByTime(candidates, 120);
}

function phaseAtTimestamp(summary: GameSummary, timestamp: number): string {
  const ages = ['Feudal', 'Castle', 'Imperial'] as const;

  const earliestByAge: Record<typeof ages[number], number | null> = {
    Feudal: null,
    Castle: null,
    Imperial: null,
  };

  for (const age of ages) {
    const times = summary.players
      .map(player => getAgeUpTime(player.actions, age))
      .filter((value): value is number => value !== null);

    earliestByAge[age] = times.length > 0 ? Math.min(...times) : null;
  }

  if (earliestByAge.Imperial !== null && timestamp >= earliestByAge.Imperial) return 'Imperial';
  if (earliestByAge.Castle !== null && timestamp >= earliestByAge.Castle) return 'Castle';
  if (earliestByAge.Feudal !== null && timestamp >= earliestByAge.Feudal) return 'Feudal';
  return 'Dark';
}

function selectTopEvents(candidates: EventCandidate[]): PostMatchEventCard[] {
  const deduped = dedupeByTime(candidates, 40);
  const ranked = deduped
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.timestamp - b.timestamp);

  return ranked.map(candidate => ({
    id: candidate.id,
    timestamp: candidate.timestamp,
    phase: candidate.phase ?? 'Dark',
    category: candidate.category,
    description: candidate.description,
    score: candidate.score,
    magnitude: candidate.magnitude,
  }));
}

function resolveBetClause(yourBet: BetShapeLabel, oppBet: BetShapeLabel): string {
  const key = `${yourBet}|${oppBet}`;
  if (storyConfig.betConsequenceClauses[key]) {
    return storyConfig.betConsequenceClauses[key];
  }
  return storyConfig.defaultClauses[yourBet] ?? 'Timing and conversion windows determined how each allocation translated into board strength.';
}

export function buildOneLineStory(input: StoryBuildInput): string {
  const clause = resolveBetClause(input.yourBetLabel, input.oppBetLabel);
  const signedFinalDelta = input.finalPoolDelta >= 0 ? `+${input.finalPoolDelta}` : `${input.finalPoolDelta}`;

  const lines = [
    `You bet on ${input.yourBetLabel} through Castle - ${input.yourEconomicPercent}% of your pool was economic vs opponent's ${input.oppEconomicPercent}%.`,
    `${clause} Castle gap sat around ${input.gapAtCastlePercentPoints} percentage points.`,
    input.topDestructiveEventSentence,
  ];

  if (input.civOverlaySentence && input.civOverlaySentence.trim().length > 0) {
    lines.push(input.civOverlaySentence);
  }

  lines.push(`Final deployed pool delta at game end was ${signedFinalDelta}.`);

  return lines.join(' ');
}

function displayBanner(youNotices: string[], opponentNotices: string[]): string | null {
  const combined = [...youNotices, ...opponentNotices]
    .map(normalizeToken)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  if (combined.length === 0) return null;

  return 'Deferred civilization support: Delhi and Jeanne d\'Arc accounting is not complete in v1 for affected players.';
}

function normalizeIndex(summary: GameSummary, perspectiveProfileId: string | number): 0 | 1 {
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

export function buildPostMatchViewModel(params: {
  summary: GameSummary;
  analysis: GameAnalysis;
  perspectiveProfileId: string | number;
  summarySig?: string;
}): PostMatchViewModel {
  const { summary, analysis, perspectiveProfileId } = params;

  const youIndex = normalizeIndex(summary, perspectiveProfileId);
  const opponentIndex = youIndex === 0 ? 1 : 0;

  const poolPlayer1 = analysis.deployedResourcePools.player1;
  const poolPlayer2 = analysis.deployedResourcePools.player2;

  const yourPool = youIndex === 0 ? poolPlayer1 : poolPlayer2;
  const opponentPool = youIndex === 0 ? poolPlayer2 : poolPlayer1;
  const adjustedMilitarySeries: AdjustedMilitarySeriesPoint[] =
    analysis.combatAdjustedMilitarySeries.map(point => {
      const youRaw = youIndex === 0 ? point.player1RawMilitaryActive : point.player2RawMilitaryActive;
      const opponentRaw = youIndex === 0 ? point.player2RawMilitaryActive : point.player1RawMilitaryActive;
      const youCounterAdjusted = youIndex === 0
        ? point.player1CounterAdjustedMilitaryActive
        : point.player2CounterAdjustedMilitaryActive;
      const opponentCounterAdjusted = youIndex === 0
        ? point.player2CounterAdjustedMilitaryActive
        : point.player1CounterAdjustedMilitaryActive;
      const youAdjusted = youIndex === 0 ? point.player1AdjustedMilitaryActive : point.player2AdjustedMilitaryActive;
      const opponentAdjusted = youIndex === 0 ? point.player2AdjustedMilitaryActive : point.player1AdjustedMilitaryActive;
      const youUpgradeMultiplier = youIndex === 0 ? point.player1UpgradeMultiplier : point.player2UpgradeMultiplier;
      const opponentUpgradeMultiplier = youIndex === 0 ? point.player2UpgradeMultiplier : point.player1UpgradeMultiplier;

      return {
        timestamp: point.timestamp,
        you: youAdjusted,
        opponent: opponentAdjusted,
        delta: Number((youAdjusted - opponentAdjusted).toFixed(2)),
        youRawMilitaryActive: youRaw,
        opponentRawMilitaryActive: opponentRaw,
        youCounterAdjustedMilitaryActive: youCounterAdjusted,
        opponentCounterAdjustedMilitaryActive: opponentCounterAdjusted,
        youUpgradeMultiplier,
        opponentUpgradeMultiplier,
        youUnitBreakdown: youIndex === 0 ? point.player1UnitBreakdown : point.player2UnitBreakdown,
        opponentUnitBreakdown: youIndex === 0 ? point.player2UnitBreakdown : point.player1UnitBreakdown,
      };
    });

  const yourPlayer = summary.players[youIndex];
  const opponentPlayer = summary.players[opponentIndex];
  const yourVillagerOpportunity = buildVillagerOpportunityForPlayer({
    player: yourPlayer,
    duration: summary.duration,
  });
  const opponentVillagerOpportunity = buildVillagerOpportunityForPlayer({
    player: opponentPlayer,
    duration: summary.duration,
  });
  const yourVillagerOpportunityContext = buildVillagerOpportunityContext(
    yourVillagerOpportunity,
    opponentVillagerOpportunity,
    yourPlayer.totalResourcesGathered.total,
    opponentPlayer.totalResourcesGathered.total
  );
  const opponentVillagerOpportunityContext = buildVillagerOpportunityContext(
    opponentVillagerOpportunity,
    yourVillagerOpportunity,
    opponentPlayer.totalResourcesGathered.total,
    yourPlayer.totalResourcesGathered.total
  );
  const yourVillagerOpportunityResourceSeries = buildVillagerOpportunityResourceSeries(
    yourVillagerOpportunity,
    yourPlayer,
    summary.duration
  );
  const opponentVillagerOpportunityResourceSeries = buildVillagerOpportunityResourceSeries(
    opponentVillagerOpportunity,
    opponentPlayer,
    summary.duration
  );
  const yourCumulativeGatheredSeries = buildCumulativeGatheredSeries(yourPlayer, summary.duration);
  const opponentCumulativeGatheredSeries = buildCumulativeGatheredSeries(opponentPlayer, summary.duration);

  const finalYour = yourPool.series.length > 0 ? yourPool.series[yourPool.series.length - 1].total : 0;
  const finalOpponent = opponentPool.series.length > 0 ? opponentPool.series[opponentPool.series.length - 1].total : 0;
  const finalPoolDelta = Math.round(finalYour - finalOpponent);

  const yourCastleTime = getAgeUpTime(yourPlayer.actions, 'Castle');
  const opponentCastleTime = getAgeUpTime(opponentPlayer.actions, 'Castle');
  const castleAgeDeltaSeconds =
    yourCastleTime !== null && opponentCastleTime !== null
      ? yourCastleTime - opponentCastleTime
      : null;

  const yourCastlePoint = yourCastleTime !== null ? pointAtOrBefore(yourPool.series, yourCastleTime) : null;
  const opponentCastlePoint = opponentCastleTime !== null ? pointAtOrBefore(opponentPool.series, opponentCastleTime) : null;

  const yourBetResult = yourCastlePoint ? classifyBetShape(getBandShares(yourCastlePoint)) : null;
  const opponentBetResult = opponentCastlePoint ? classifyBetShape(getBandShares(opponentCastlePoint)) : null;

  const yourBetCard = yourBetResult
    ? {
      label: yourBetResult.label,
      subtitlePercent: Math.round(yourBetResult.primaryShare * 100),
      economicPercent: Math.round(yourBetResult.economicShare * 100),
      militaryPercent: Math.round(yourBetResult.militaryShare * 100),
    }
    : null;

  const opponentBetCard = opponentBetResult
    ? {
      label: opponentBetResult.label,
      subtitlePercent: Math.round(opponentBetResult.primaryShare * 100),
      economicPercent: Math.round(opponentBetResult.economicShare * 100),
      militaryPercent: Math.round(opponentBetResult.militaryShare * 100),
    }
    : null;
  const ageMarkers = buildAgeMarkers(summary, youIndex);
  const allSignificantEvents = buildSignificantTimelineEvents(
    analysis.significantResourceLossEvents,
    youIndex,
    summary
  );
  const significantEvents = selectSignificantTimelineEvents(allSignificantEvents, summary.duration);
  const hoverTimestamps = uniqueSortedTimestamps([
    0,
    summary.duration,
    ...yourPool.series.map(point => point.timestamp),
    ...opponentPool.series.map(point => point.timestamp),
    ...yourPool.gatherRateSeries.map(point => point.timestamp),
    ...opponentPool.gatherRateSeries.map(point => point.timestamp),
    ...yourCumulativeGatheredSeries.map(point => point.timestamp),
    ...opponentCumulativeGatheredSeries.map(point => point.timestamp),
    ...adjustedMilitarySeries.map(point => point.timestamp),
    ...ageMarkers.map(marker => marker.timestamp),
    ...significantEvents.map(event => event.timestamp),
    ...(yourPool.bandItemSnapshots ?? []).map(point => point.timestamp),
    ...(opponentPool.bandItemSnapshots ?? []).map(point => point.timestamp),
  ]);
  const hoverSnapshots: PostMatchHoverSnapshot[] = hoverTimestamps.map((timestamp) => {
    const youPoint = pointAtOrBefore(yourPool.series, timestamp);
    const opponentPoint = pointAtOrBefore(opponentPool.series, timestamp);
    const you = toHoverBandValues(youPoint);
    const opponent = toHoverBandValues(opponentPoint);
    const youAccounting = buildResourceAccountingValues(
      youPoint,
      cumulativeDestroyedByBandAtOrBefore(yourPool.bandItemDeltas, timestamp),
      cumulativeValueAtOrBefore(yourCumulativeGatheredSeries, timestamp)
    );
    const opponentAccounting = buildResourceAccountingValues(
      opponentPoint,
      cumulativeDestroyedByBandAtOrBefore(opponentPool.bandItemDeltas, timestamp),
      cumulativeValueAtOrBefore(opponentCumulativeGatheredSeries, timestamp)
    );
    const adjusted = adjustedMilitaryAtOrBefore(adjustedMilitarySeries, timestamp);
    const youBreakdown = bandSnapshotsAtOrBefore(yourPool.bandItemSnapshots, timestamp);
    const opponentBreakdown = bandSnapshotsAtOrBefore(opponentPool.bandItemSnapshots, timestamp);
    const youCounterMultiplier = adjusted.youRawMilitaryActive > 0
      ? adjusted.youCounterAdjustedMilitaryActive / adjusted.youRawMilitaryActive
      : null;
    const opponentCounterMultiplier = adjusted.opponentRawMilitaryActive > 0
      ? adjusted.opponentCounterAdjustedMilitaryActive / adjusted.opponentRawMilitaryActive
      : null;
    const youAdjustmentPct = you.militaryActive > 0
      ? ((adjusted.you - you.militaryActive) / you.militaryActive) * 100
      : null;
    const opponentAdjustmentPct = opponent.militaryActive > 0
      ? ((adjusted.opponent - opponent.militaryActive) / opponent.militaryActive) * 100
      : null;

    const significantEvent = significantEvents.find(event => event.timestamp === timestamp) ?? null;

    return {
      timestamp,
      timeLabel: formatTime(timestamp),
      markers: [
        ...ageMarkers
          .filter(marker => marker.timestamp === timestamp)
          .map(marker => marker.label),
        ...significantEvents
          .filter(event => event.timestamp === timestamp)
          .map(significantEventLabel),
      ],
      you,
      opponent,
      delta: deltaHoverBandValues(you, opponent),
      accounting: {
        you: youAccounting,
        opponent: opponentAccounting,
        delta: deltaResourceAccountingValues(youAccounting, opponentAccounting),
      },
      gather: {
        you: Math.round(gatherRateAtOrBefore(yourPool.gatherRateSeries, timestamp)),
        opponent: Math.round(gatherRateAtOrBefore(opponentPool.gatherRateSeries, timestamp)),
        delta: Math.round(gatherRateAtOrBefore(yourPool.gatherRateSeries, timestamp))
          - Math.round(gatherRateAtOrBefore(opponentPool.gatherRateSeries, timestamp)),
      },
      villagerOpportunity: {
        you: villagerResourceAtOrBefore(yourVillagerOpportunityResourceSeries, timestamp),
        opponent: villagerResourceAtOrBefore(opponentVillagerOpportunityResourceSeries, timestamp),
      },
      adjustedMilitary: {
        you: Math.round(adjusted.you),
        opponent: Math.round(adjusted.opponent),
        delta: Math.round(adjusted.delta),
        youRaw: Math.round(adjusted.youRawMilitaryActive),
        opponentRaw: Math.round(adjusted.opponentRawMilitaryActive),
        youCounterAdjusted: Number(adjusted.youCounterAdjustedMilitaryActive.toFixed(2)),
        opponentCounterAdjusted: Number(adjusted.opponentCounterAdjustedMilitaryActive.toFixed(2)),
        youCounterMultiplier,
        opponentCounterMultiplier,
        youUpgradeMultiplier: adjusted.youUpgradeMultiplier,
        opponentUpgradeMultiplier: adjusted.opponentUpgradeMultiplier,
        youPct: youAdjustmentPct,
        opponentPct: opponentAdjustmentPct,
        youUnitBreakdown: adjusted.youUnitBreakdown,
        opponentUnitBreakdown: adjusted.opponentUnitBreakdown,
      },
      bandBreakdown: {
        economic: {
          you: toHoverBreakdownEntries(youBreakdown, 'economic'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'economic'),
        },
        populationCap: {
          you: toHoverBreakdownEntries(youBreakdown, 'populationCap'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'populationCap'),
        },
        militaryCapacity: {
          you: toHoverBreakdownEntries(youBreakdown, 'militaryCapacity'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'militaryCapacity'),
        },
        militaryActive: {
          you: toHoverBreakdownEntries(youBreakdown, 'militaryActive'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'militaryActive'),
        },
        defensive: {
          you: toHoverBreakdownEntries(youBreakdown, 'defensive'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'defensive'),
        },
        research: {
          you: toHoverBreakdownEntries(youBreakdown, 'research'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'research'),
        },
        advancement: {
          you: toHoverBreakdownEntries(youBreakdown, 'advancement'),
          opponent: toHoverBreakdownEntries(opponentBreakdown, 'advancement'),
        },
        destroyed: {
          you: toDestroyedBreakdownEntries(yourPool.bandItemDeltas, timestamp),
          opponent: toDestroyedBreakdownEntries(opponentPool.bandItemDeltas, timestamp),
        },
      },
      significantEvent,
    };
  });

  const raidCandidates = [
    ...detectRaidEvents(yourPool.gatherRateSeries, 'you'),
    ...detectRaidEvents(opponentPool.gatherRateSeries, 'opponent'),
  ].map(candidate => ({
    ...candidate,
    score: scoreWithGapWidening(candidate.magnitude, candidate.timestamp, yourPool.series, opponentPool.series),
  }));

  const analysisInflectionCandidates = inflectionCandidatesFromAnalysis(
    analysis.inflectionPoints,
    youIndex,
    yourPool.series,
    opponentPool.series
  );

  const timingCandidates = ageGapCandidates(summary, youIndex, yourPool.series, opponentPool.series);
  const betCandidates = castleBetCandidate(
    yourCastleTime,
    opponentCastleTime,
    yourBetResult,
    opponentBetResult,
    yourPool.series,
    opponentPool.series
  );

  const overlayCandidates = detectCivOverlayCandidates(
    yourPool.freeProductionSeries,
    opponentPool.freeProductionSeries,
    yourPool.series,
    opponentPool.series
  );

  const destructionFallback = detectDestructionFallbackEvents(yourPool.series, opponentPool.series).map(candidate => ({
    ...candidate,
    score: scoreWithGapWidening(candidate.magnitude, candidate.timestamp, yourPool.series, opponentPool.series),
  }));

  let candidatePool: EventCandidate[] = [
    ...timingCandidates,
    ...betCandidates,
    ...raidCandidates,
    ...analysisInflectionCandidates,
    ...overlayCandidates,
  ];

  if (candidatePool.length < 3 && analysisInflectionCandidates.length === 0) {
    candidatePool = [...candidatePool, ...destructionFallback];
  }

  const candidatesWithPhase = candidatePool.map(candidate => ({
    ...candidate,
    phase: phaseAtTimestamp(summary, candidate.timestamp),
  }));

  const events = selectTopEvents(candidatesWithPhase);

  const castleGapPercentPoints = (() => {
    if (!yourCastlePoint || !opponentCastlePoint) return 0;
    const denom = Math.max(opponentCastlePoint.total, 1);
    return Math.round(((yourCastlePoint.total - opponentCastlePoint.total) / denom) * 100);
  })();

  const topDestructive =
    events
      .filter(event => event.category === 'Engagement' || event.category === 'Destruction' || event.category === 'Economy')
      .sort((a, b) => b.score - a.score)[0] ??
    events[0];

  const civOverlayEvent = events.find(event => event.category === 'Civ overlay');

  const oneLineStory = buildOneLineStory({
    yourBetLabel: yourBetResult?.label ?? 'balanced',
    oppBetLabel: opponentBetResult?.label ?? 'balanced',
    yourEconomicPercent: yourBetCard?.economicPercent ?? 0,
    oppEconomicPercent: opponentBetCard?.economicPercent ?? 0,
    gapAtCastlePercentPoints: castleGapPercentPoints,
    topDestructiveEventSentence: topDestructive
      ? `${topDestructive.description}`
      : 'No single high-magnitude destruction window stood out in this sample.',
    civOverlaySentence: civOverlayEvent ? civOverlayEvent.description : undefined,
    finalPoolDelta,
  });

  return {
    header: {
      mode: formatMode(summary.leaderboard),
      durationLabel: formatTime(summary.duration),
      map: summary.mapName,
      summaryUrl: `https://aoe4world.com/players/${yourPlayer.profileId}/games/${summary.gameId}${params.summarySig ? `?sig=${encodeURIComponent(params.summarySig)}` : ''}`,
      youCivilization: yourPlayer.civilization,
      opponentCivilization: opponentPlayer.civilization,
      outcome: formatOutcome(summary.winReason, summary.duration),
    },
    deferredBanner: displayBanner(yourPool.deferredNotices, opponentPool.deferredNotices),
    metricCards: {
      finalPoolDelta,
      castleAgeDeltaSeconds,
      yourBet: yourBetCard,
      opponentBet: opponentBetCard,
    },
    trajectory: {
      durationSeconds: summary.duration,
      yAxisMax: analysis.deployedResourcePools.sharedYAxisMax,
      youSeries: yourPool.series,
      opponentSeries: opponentPool.series,
      adjustedMilitarySeries,
      youBandItemDeltas: [...(yourPool.bandItemDeltas ?? [])],
      opponentBandItemDeltas: [...(opponentPool.bandItemDeltas ?? [])],
      hoverSnapshots,
      ageMarkers,
      significantEvents,
    },
    gatherRate: {
      durationSeconds: summary.duration,
      youSeries: yourPool.gatherRateSeries,
      opponentSeries: opponentPool.gatherRateSeries,
    },
    villagerOpportunity: {
      targetVillagers: yourVillagerOpportunity.targetVillagers,
      you: yourVillagerOpportunity,
      opponent: opponentVillagerOpportunity,
      resourceSeries: {
        you: yourVillagerOpportunityResourceSeries,
        opponent: opponentVillagerOpportunityResourceSeries,
      },
      context: {
        you: yourVillagerOpportunityContext,
        opponent: opponentVillagerOpportunityContext,
      },
    },
    events,
    oneLineStory,
  };
}
