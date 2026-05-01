import { fetchGameSummaryFromApi, GameSummary } from '../parser/gameSummaryParser';
import { loadStaticData } from '../data/fetchStaticData';
import { resolveAllBuildOrders } from '../parser/buildOrderResolver';
import { calculateValueAdjustedMatchup } from '../data/counterMatrix';
import { identifyPhases } from './phaseIdentification';
import { reconstructArmyAt } from './armyReconstruction';
import { detectInflectionPoints } from './inflectionDetection';
import { comparePhases } from './phaseComparison';
import { generateNarrative } from './llmNarrative';
import { buildDeployedResourcePools } from './resourcePool';
import { buildCombatAdjustedSeries } from './combatAdjustedMilitary';
import { detectSignificantResourceLossEvents } from './significantResourceLossEvents';
import { GameAnalysis, PlayerAnalysisSummary } from './types';

export interface AnalyzeOptions {
  sig?: string;
  skipNarrative?: boolean;
  summary?: GameSummary;
}

function buildPlayerSummary(
  player: GameSummary['players'][0]
): PlayerAnalysisSummary {
  return {
    name: player.name,
    civilization: player.civilization,
    result: player.result,
    apm: player.apm,
    scores: player.scores,
    totalGathered: player.totalResourcesGathered,
    totalSpent: player.totalResourcesSpent,
    kills: player._stats.ekills,
    deaths: player._stats.edeaths,
    unitsProduced: player._stats.sqprod,
  };
}

export async function analyzeGame(
  profileId: string | number,
  gameId: number,
  options: AnalyzeOptions = {}
): Promise<GameAnalysis> {
  const summary = options.summary ?? await fetchGameSummaryFromApi(profileId, gameId, options.sig);

  if (summary.players.length < 2) {
    throw new Error(`Analysis requires at least 2 players, but this game has ${summary.players.length}`);
  }

  const staticData = await loadStaticData();

  const player1 = summary.players[0];
  const player2 = summary.players[1];

  const p1Resolved = resolveAllBuildOrders(player1, staticData);
  const p2Resolved = resolveAllBuildOrders(player2, staticData);

  const phases = identifyPhases(player1, player2, summary.duration);

  const inflectionPoints = detectInflectionPoints(
    player1.resources,
    player2.resources,
    p1Resolved,
    p2Resolved
  );

  const phaseComparisons = comparePhases(
    phases,
    p1Resolved,
    p2Resolved,
    player1.resources,
    player2.resources,
    inflectionPoints,
    player1.civilization,
    player2.civilization,
    player1.actions,
    player2.actions
  );

  const p1FinalArmy = reconstructArmyAt(p1Resolved, summary.duration);
  const p2FinalArmy = reconstructArmyAt(p2Resolved, summary.duration);
  const deployedResourcePools = buildDeployedResourcePools(summary, p1Resolved, p2Resolved);
  const significantResourceLossEvents = detectSignificantResourceLossEvents({
    summary,
    deployedResourcePools,
    player1Build: p1Resolved,
    player2Build: p2Resolved,
  });
  const combatAdjustedMilitarySeries = buildCombatAdjustedSeries({
    player1Build: p1Resolved,
    player2Build: p2Resolved,
    player1Civilization: player1.civilization,
    player2Civilization: player2.civilization,
    player1MilitaryActiveSeries: deployedResourcePools.player1.series,
    player2MilitaryActiveSeries: deployedResourcePools.player2.series,
    player1MilitaryActiveBandItemDeltas: deployedResourcePools.player1.bandItemDeltas,
    player2MilitaryActiveBandItemDeltas: deployedResourcePools.player2.bandItemDeltas,
    unitCatalog: staticData.units,
    technologyCatalog: staticData.technologies,
    duration: summary.duration,
    timelineTimestamps: [
      ...deployedResourcePools.player1.series.map(point => point.timestamp),
      ...deployedResourcePools.player2.series.map(point => point.timestamp),
      ...deployedResourcePools.player1.gatherRateSeries.map(point => point.timestamp),
      ...deployedResourcePools.player2.gatherRateSeries.map(point => point.timestamp),
    ],
  });

  const finalArmyMatchup = (p1FinalArmy.length > 0 && p2FinalArmy.length > 0)
    ? calculateValueAdjustedMatchup(p1FinalArmy, p2FinalArmy, {
      player1Civilization: player1.civilization,
      player2Civilization: player2.civilization,
    })
    : null;

  const analysis: GameAnalysis = {
    gameId: summary.gameId,
    mapName: summary.mapName,
    mapBiome: summary.mapBiome,
    duration: summary.duration,
    winReason: summary.winReason,
    player1: buildPlayerSummary(player1),
    player2: buildPlayerSummary(player2),
    phases,
    phaseComparisons,
    inflectionPoints,
    finalArmyMatchup,
    combatAdjustedMilitarySeries,
    deployedResourcePools,
    significantResourceLossEvents,
    bottomLine: null,
  };

  if (!options.skipNarrative) {
    analysis.bottomLine = await generateNarrative(analysis);
  }

  return analysis;
}
