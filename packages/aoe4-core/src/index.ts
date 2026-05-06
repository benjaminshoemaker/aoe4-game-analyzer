export { analyzeGame } from './analysis/gameAnalysis';
export type { AnalyzeOptions } from './analysis/gameAnalysis';
export { buildCombatAdjustedSeries } from './analysis/combatAdjustedMilitary';
export { detectInflectionPoints } from './analysis/inflectionDetection';
export { buildPostMatchViewModel, buildAgeMarkers } from './analysis/postMatchViewModel';
export type {
  AgeMarker,
  PostMatchHoverSnapshot,
  PostMatchPlayerDisplay,
  PostMatchViewModel,
} from './analysis/postMatchViewModel';
export type { GameAnalysis } from './analysis/types';
export { buildDeployedResourcePools, buildPlayerDeployedPoolSeries, classifyResolvedItemBand, getDeferredCivilizationNotices } from './analysis/resourcePool';
export type { DeployedResourcePools, PlayerDeployedPoolSeries, PoolBand, PoolSeriesPoint } from './analysis/resourcePool';
export { detectSignificantResourceLossEvents } from './analysis/significantResourceLossEvents';
export { auditUnknownBuildOrderBuckets } from './analysis/unknownBuildOrderAudit';
export { buildWinProbabilityExamples, buildMatchSkillBracket, WIN_PROBABILITY_FEATURE_SCHEMA_VERSION } from './analysis/winProbability';
export type { WinProbabilityExample } from './analysis/winProbability';

export { buildAoe4WorldHeaders, buildGameSummaryRequest, AOE4WORLD_STATIC_DATA_ENDPOINTS } from './aoe4world/client';
export { analyzeArmyMatchup, calculatePairCounterComputation, calculateValueAdjustedMatchup, classifyUnit, formatValueAdjustedMatchup } from './data/counterMatrix';
export { forceRefreshStaticData, fetchAndCacheStaticData, loadStaticData } from './data/fetchStaticData';
export { parseUnitCatalogFromJson, writeUnitCounterMatrixArtifacts } from './data/unitCounterMatrix';
export { getUpgradeEffect, getUpgradeEffectFromIcon, parseUnitTierFromIcon } from './data/upgradeMappings';

export { formatGameAnalysis } from './formatters/analyzeFormatter';
export { buildPostMatchHoverPayload, renderPostMatchHtml } from './formatters/postMatchHtml';
export { escapeHtml, REDDIT_FEEDBACK_HREF } from './formatters/sharedFormatters';
export {
  buildAllocationCategories,
  buildAllocationLeaderSegments,
  buildAllocationComparison,
  buildAllocationCategoryAccounting,
  buildAllocationComparisonRow,
  buildStrategySnapshot,
} from './presentation/postMatchPresentation';
export type {
  AllocationCategoryAccounting,
  AllocationComparison,
  AllocationComparisonRow,
  AllocationValues,
  HoverBandValues,
} from './presentation/postMatchPresentation';

export { parseAoe4WorldGameUrl } from './parser/aoe4WorldUrl';
export type { ParsedAoe4WorldUrl } from './parser/aoe4WorldUrl';
export { resolveAllBuildOrders, validateAllItemsResolved } from './parser/buildOrderResolver';
export type { ResolvedBuildItem, ResolvedBuildOrder } from './parser/buildOrderResolver';
export { GameSummaryFetchError, fetchGameSummaryFromApi, loadGameSummaryFromFile, parseGameSummary } from './parser/gameSummaryParser';
export type { BuildOrderEntry, GameSummary, PlayerSummary, ResourceTotals, ScoreBreakdown, TimeSeriesResources } from './parser/gameSummaryParser';

export type { Building, StaticDataCache, Technology, Unit, UnitWithValue } from './types';
