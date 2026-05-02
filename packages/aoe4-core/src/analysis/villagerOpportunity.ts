import { BuildOrderEntry, PlayerSummary } from '../parser/gameSummaryParser';
import { isVillagerBuildOrderEntry } from './villagerClassifier';

export const VILLAGER_RATE_BASELINE_RPM = 40;
export const VILLAGER_TARGET_COUNT = 120;

const DEFAULT_VILLAGER_TRAIN_SECONDS = 20;
const GOLDEN_HORDE_BATCH_SECONDS = 37;
const GOLDEN_HORDE_BATCH_SIZE = 2;
const OOTD_GILDED_VILLAGER_TRAIN_SECONDS = 23;
const OOTD_GILDED_VILLAGER_GATHER_MULTIPLIER = 1.28;
const ECON_UPGRADE_MULTIPLIER = 1.15;
const WHEELBARROW_MULTIPLIER = 1.08;
const SONG_DYNASTY_PRODUCTION_MULTIPLIER = 1.33;
const YORISHIRO_TC_PRODUCTION_MULTIPLIER = 1.30;
const PAX_OTTOMANA_PRODUCTION_MULTIPLIER = 1.75;
const PAX_OTTOMANA_DURATION_SECONDS = 240;
const EPSILON = 1e-9;

const VILLAGER_RESOURCE_BLEND_WEIGHTS = {
  food: 0.43,
  wood: 0.30,
  gold: 0.23,
  stone: 0.04,
} as const;

type EconResource = 'food' | 'wood' | 'gold' | 'stone';
type RateUpgradeType = EconResource | 'wheelbarrow';

interface RateUpgradeEvent {
  timestamp: number;
  source: string;
  type: RateUpgradeType;
  multiplier: number;
}

interface ProductionUpgradeEvent {
  timestamp: number;
  source: string;
  mode: 'set-base' | 'mul-bonus' | 'div-bonus';
  multiplier: number;
}

interface TownCenterEvent {
  timestamp: number;
  delta: number;
}

interface RateState {
  food: number;
  wood: number;
  gold: number;
  stone: number;
  wheelbarrow: number;
}

export interface VillagerOpportunityPoint {
  timestamp: number;
  expectedVillagerRateRpm: number;
  expectedVillagers: number;
  producedVillagers: number;
  aliveVillagers: number;
  underproductionDeficit: number;
  deathDeficit: number;
  totalDeficit: number;
  underproductionLossPerMin: number;
  deathLossPerMin: number;
  totalLossPerMin: number;
  cumulativeUnderproductionLoss: number;
  cumulativeDeathLoss: number;
  cumulativeTotalLoss: number;
}

export interface VillagerOpportunityUpgradeEvent {
  timestamp: number;
  source: string;
  category: 'rate' | 'production';
  type: RateUpgradeType | 'villager-production';
  multiplier: number;
}

export interface VillagerOpportunityForPlayer {
  baselineRateRpm: number;
  targetVillagers: number;
  series: VillagerOpportunityPoint[];
  upgradeEvents: VillagerOpportunityUpgradeEvent[];
}

export interface BuildVillagerOpportunityParams {
  player: PlayerSummary;
  duration: number;
  baselineRateRpm?: number;
  targetVillagers?: number;
}

function normalizeCivilization(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isVillagerUnit(entry: BuildOrderEntry): boolean {
  return isVillagerBuildOrderEntry(entry);
}

function isTownCenterBuilding(entry: BuildOrderEntry): boolean {
  if (entry.type !== 'Building') return false;

  const haystack = `${entry.id} ${entry.icon}`.toLowerCase();
  return (
    haystack.includes('town center') ||
    haystack.includes('town_center') ||
    haystack.includes('towncenter')
  );
}

function normalizeTimestamps(values: number[] | undefined, duration: number): number[] {
  if (!Array.isArray(values) || values.length === 0) return [];

  return values
    .filter(value => Number.isFinite(value))
    .map(value => Math.max(0, Math.min(duration, Number(value))));
}

function uniqueSortedTimestamps(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isFinite(value) && value >= 0))]
    .sort((a, b) => a - b);
}

function collectTownCenterTimeline(player: PlayerSummary, duration: number): {
  initialCount: number;
  events: TownCenterEvent[];
} {
  const townCenterEntries = player.buildOrder.filter(isTownCenterBuilding);
  let initialCount = 0;
  const events: TownCenterEvent[] = [];

  for (const entry of townCenterEntries) {
    const constructedTimes = uniqueSortedTimestamps(normalizeTimestamps(entry.constructed, duration));
    const finishedTimes = uniqueSortedTimestamps(normalizeTimestamps(entry.finished, duration));
    // Prefer constructed timestamps when present; finished is a fallback for older/incomplete payloads.
    const completionTimes = constructedTimes.length > 0 ? constructedTimes : finishedTimes;
    const destroyedTimes = uniqueSortedTimestamps(normalizeTimestamps(entry.destroyed, duration));

    for (const timestamp of completionTimes) {
      if (timestamp <= 0) {
        initialCount += 1;
      } else {
        events.push({ timestamp, delta: 1 });
      }
    }

    for (const timestamp of destroyedTimes) {
      if (timestamp <= 0) {
        initialCount = Math.max(0, initialCount - 1);
      } else {
        events.push({ timestamp, delta: -1 });
      }
    }
  }

  if (initialCount === 0) {
    initialCount = 1;
  }

  events.sort((a, b) => a.timestamp - b.timestamp || b.delta - a.delta);

  return {
    initialCount,
    events,
  };
}

function secondGrid(duration: number): number[] {
  const maxWhole = Math.max(0, Math.floor(duration));
  const result: number[] = [];
  for (let second = 0; second <= maxWhole; second += 1) {
    result.push(second);
  }

  if (result.length === 0 || result[result.length - 1] !== duration) {
    result.push(duration);
  }

  return result;
}

function detectRateUpgradeType(actionKey: string): RateUpgradeType | null {
  const key = actionKey.toLowerCase();

  if (key.includes('wheelbarrow')) return 'wheelbarrow';

  const looksEconomic =
    key.includes('upgradeeconresource') ||
    key.includes('horticulture') ||
    key.includes('hunting') ||
    key.includes('hunt') ||
    key.includes('broadaxe') ||
    key.includes('lumber') ||
    key.includes('mining') ||
    key.includes('pickaxe') ||
    key.includes('gather') ||
    key.includes('harvest') ||
    key.includes('fell');

  if (!looksEconomic) return null;

  if (key.includes('food') || key.includes('horticulture') || key.includes('farm') || key.includes('hunt') || key.includes('hunting')) return 'food';
  if (key.includes('wood') || key.includes('broadaxe') || key.includes('lumber') || key.includes('fell')) return 'wood';
  if (key.includes('gold') || key.includes('pickaxe') || key.includes('mining')) return 'gold';
  if (key.includes('stone')) return 'stone';

  return null;
}

function collectRateUpgradeEvents(player: PlayerSummary, duration: number): RateUpgradeEvent[] {
  const events: RateUpgradeEvent[] = [];

  for (const [source, rawTimestamps] of Object.entries(player.actions)) {
    const type = detectRateUpgradeType(source);
    if (!type) continue;

    const timestamps = normalizeTimestamps(rawTimestamps, duration);
    for (const timestamp of timestamps) {
      events.push({
        timestamp,
        source,
        type,
        multiplier: type === 'wheelbarrow' ? WHEELBARROW_MULTIPLIER : ECON_UPGRADE_MULTIPLIER,
      });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp || a.source.localeCompare(b.source));
}

function normalizeActionKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function collectActionTimestamps(
  player: PlayerSummary,
  duration: number,
  predicate: (normalizedActionKey: string) => boolean
): number[] {
  const values: number[] = [];
  for (const [source, rawTimestamps] of Object.entries(player.actions)) {
    const normalized = normalizeActionKey(source);
    if (!predicate(normalized)) continue;
    values.push(...normalizeTimestamps(rawTimestamps, duration));
  }
  return uniqueSortedTimestamps(values);
}

interface AgeTimings {
  feudal?: number;
  castle?: number;
  imperial?: number;
}

function collectAgeTimings(player: PlayerSummary, duration: number): AgeTimings {
  const feudal = collectActionTimestamps(player, duration, key => key.includes('feudalage'))[0];
  const castle = collectActionTimestamps(player, duration, key => key.includes('castleage'))[0];
  const imperial = collectActionTimestamps(player, duration, key => key.includes('imperialage'))[0];

  if (feudal !== undefined || castle !== undefined || imperial !== undefined) {
    return { feudal, castle, imperial };
  }

  const genericAgeUp = collectActionTimestamps(player, duration, key => key.includes('ageup'));
  return {
    feudal: genericAgeUp[0],
    castle: genericAgeUp[1],
    imperial: genericAgeUp[2],
  };
}

function isFrenchCivilization(civ: string): boolean {
  return civ === 'french' || civ === 'fr';
}

function isJeanneCivilization(civ: string): boolean {
  return civ === 'jeanne_darc' || civ.includes('jeanne') || civ === 'je';
}

function isGoldenHordeCivilization(civ: string): boolean {
  return civ === 'golden_horde' || civ === 'goldenhorde' || civ === 'gol';
}

function isOrderOfTheDragonCivilization(civ: string): boolean {
  return civ === 'order_of_the_dragon' || civ === 'orderofthedragon' || civ === 'od';
}

function isOttomanCivilization(civ: string): boolean {
  return civ === 'ottomans' || civ === 'ottoman' || civ === 'ot';
}

function collectProductionUpgradeEvents(player: PlayerSummary, duration: number): ProductionUpgradeEvent[] {
  const events: ProductionUpgradeEvent[] = [];
  const civ = normalizeCivilization(player.civilization);
  const ageTimings = collectAgeTimings(player, duration);

  // French civ text bonus: Town Center production speed per age is +15, +15, +20, +25.
  // Jeanne d'Arc explicitly does not inherit this passive.
  if (isFrenchCivilization(civ) && !isJeanneCivilization(civ)) {
    events.push({
      timestamp: 0,
      source: 'civ:french:age-i-tc-speed',
      mode: 'set-base',
      multiplier: 1.15,
    });

    if (ageTimings.feudal !== undefined) {
      events.push({
        timestamp: ageTimings.feudal,
        source: 'civ:french:age-ii-tc-speed',
        mode: 'set-base',
        multiplier: 1.15,
      });
    }
    if (ageTimings.castle !== undefined) {
      events.push({
        timestamp: ageTimings.castle,
        source: 'civ:french:age-iii-tc-speed',
        mode: 'set-base',
        multiplier: 1.20,
      });
    }
    if (ageTimings.imperial !== undefined) {
      events.push({
        timestamp: ageTimings.imperial,
        source: 'civ:french:age-iv-tc-speed',
        mode: 'set-base',
        multiplier: 1.25,
      });
    }
  }

  for (const [source, rawTimestamps] of Object.entries(player.actions)) {
    const key = source.toLowerCase();
    const timestamps = uniqueSortedTimestamps(normalizeTimestamps(rawTimestamps, duration));
    if (timestamps.length === 0) continue;

    if (key.includes('song')) {
      for (const timestamp of timestamps) {
        events.push({
          timestamp,
          source,
          mode: 'mul-bonus',
          multiplier: SONG_DYNASTY_PRODUCTION_MULTIPLIER,
        });
      }
      continue;
    }

    if (key.includes('yorishiro')) {
      for (const timestamp of timestamps) {
        events.push({
          timestamp,
          source,
          mode: 'mul-bonus',
          multiplier: YORISHIRO_TC_PRODUCTION_MULTIPLIER,
        });
      }
      continue;
    }

    if (key.includes('pax') && (key.includes('ottom') || isOttomanCivilization(civ))) {
      for (const timestamp of timestamps) {
        events.push({
          timestamp,
          source,
          mode: 'mul-bonus',
          multiplier: PAX_OTTOMANA_PRODUCTION_MULTIPLIER,
        });
        const expiresAt = Math.min(duration, timestamp + PAX_OTTOMANA_DURATION_SECONDS);
        if (expiresAt > timestamp) {
          events.push({
            timestamp: expiresAt,
            source: `${source}:expire`,
            mode: 'div-bonus',
            multiplier: PAX_OTTOMANA_PRODUCTION_MULTIPLIER,
          });
        }
      }
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp || a.source.localeCompare(b.source));
}

function villagerTrainSecondsForCivilization(civilization: string): number {
  const civ = normalizeCivilization(civilization);
  if (isGoldenHordeCivilization(civ)) {
    return GOLDEN_HORDE_BATCH_SECONDS / GOLDEN_HORDE_BATCH_SIZE;
  }
  if (isOrderOfTheDragonCivilization(civ)) {
    return OOTD_GILDED_VILLAGER_TRAIN_SECONDS;
  }
  return DEFAULT_VILLAGER_TRAIN_SECONDS;
}

function villagerGatherRateMultiplierForCivilization(civilization: string): number {
  const civ = normalizeCivilization(civilization);
  if (isOrderOfTheDragonCivilization(civ)) {
    return OOTD_GILDED_VILLAGER_GATHER_MULTIPLIER;
  }
  return 1;
}

function computeExpectedVillagerRateRpm(baseline: number, rateState: RateState): number {
  const blendedMultiplier =
    VILLAGER_RESOURCE_BLEND_WEIGHTS.food * rateState.food +
    VILLAGER_RESOURCE_BLEND_WEIGHTS.wood * rateState.wood +
    VILLAGER_RESOURCE_BLEND_WEIGHTS.gold * rateState.gold +
    VILLAGER_RESOURCE_BLEND_WEIGHTS.stone * rateState.stone;

  return baseline * blendedMultiplier * rateState.wheelbarrow;
}

export function buildVillagerOpportunityForPlayer(params: BuildVillagerOpportunityParams): VillagerOpportunityForPlayer {
  const baselineRateRpm = params.baselineRateRpm ?? VILLAGER_RATE_BASELINE_RPM;
  const targetVillagers = params.targetVillagers ?? VILLAGER_TARGET_COUNT;
  const duration = Math.max(0, params.duration);
  const player = params.player;
  const villagerTrainSeconds = villagerTrainSecondsForCivilization(player.civilization);
  const villagerGatherRateMultiplier = villagerGatherRateMultiplierForCivilization(player.civilization);
  const townCenterTimeline = collectTownCenterTimeline(player, duration);

  const villagerEntries = player.buildOrder.filter(isVillagerUnit);
  const producedVillagerTimes = villagerEntries
    .flatMap(entry => normalizeTimestamps(entry.finished, duration))
    .sort((a, b) => a - b);
  const villagerDeathTimes = villagerEntries
    .flatMap(entry => normalizeTimestamps(entry.destroyed, duration))
    .sort((a, b) => a - b);
  const startingVillagers = producedVillagerTimes.filter(timestamp => timestamp <= 0).length;

  const rateUpgradeEvents = collectRateUpgradeEvents(player, duration);
  const productionUpgradeEvents = collectProductionUpgradeEvents(player, duration);
  const timeline = uniqueSortedTimestamps([
    0,
    duration,
    ...secondGrid(duration),
    ...normalizeTimestamps(player.resources.timestamps, duration),
    ...producedVillagerTimes,
    ...villagerDeathTimes,
    ...townCenterTimeline.events.map(event => event.timestamp),
    ...rateUpgradeEvents.map(event => event.timestamp),
    ...productionUpgradeEvents.map(event => event.timestamp),
  ]);

  const rateState: RateState = {
    food: 1,
    wood: 1,
    gold: 1,
    stone: 1,
    wheelbarrow: 1,
  };
  let productionBaseMultiplier = 1;
  let productionBonusMultiplier = 1;
  let activeTownCenters = townCenterTimeline.initialCount;
  let expectedVillagerProgress = startingVillagers;
  let producedVillagers = 0;
  let villagerDeaths = 0;
  let producedIndex = 0;
  let deathIndex = 0;
  let townCenterEventIndex = 0;
  let rateEventIndex = 0;
  let productionEventIndex = 0;
  let cumulativeUnderproductionLoss = 0;
  let cumulativeDeathLoss = 0;
  let previousPoint: VillagerOpportunityPoint | null = null;
  let previousTimestamp = timeline[0] ?? 0;

  const series: VillagerOpportunityPoint[] = [];

  for (const timestamp of timeline) {
    const elapsed = timestamp - previousTimestamp;

    if (elapsed > 0 && previousPoint) {
      if (expectedVillagerProgress < targetVillagers) {
        const productionMultiplier = productionBaseMultiplier * productionBonusMultiplier;
        expectedVillagerProgress = Math.min(
          targetVillagers,
          expectedVillagerProgress + (elapsed / villagerTrainSeconds) * productionMultiplier * activeTownCenters
        );
      }

      cumulativeUnderproductionLoss += (previousPoint.underproductionLossPerMin / 60) * elapsed;
      cumulativeDeathLoss += (previousPoint.deathLossPerMin / 60) * elapsed;
    }

    while (
      productionEventIndex < productionUpgradeEvents.length &&
      productionUpgradeEvents[productionEventIndex].timestamp <= timestamp
    ) {
      const event = productionUpgradeEvents[productionEventIndex];
      if (event.mode === 'set-base') {
        productionBaseMultiplier = Math.max(EPSILON, event.multiplier);
      } else if (event.mode === 'mul-bonus') {
        productionBonusMultiplier *= event.multiplier;
      } else {
        productionBonusMultiplier /= event.multiplier;
      }
      productionEventIndex += 1;
    }

    while (
      townCenterEventIndex < townCenterTimeline.events.length &&
      townCenterTimeline.events[townCenterEventIndex].timestamp <= timestamp
    ) {
      activeTownCenters = Math.max(0, activeTownCenters + townCenterTimeline.events[townCenterEventIndex].delta);
      townCenterEventIndex += 1;
    }

    while (
      rateEventIndex < rateUpgradeEvents.length &&
      rateUpgradeEvents[rateEventIndex].timestamp <= timestamp
    ) {
      const event = rateUpgradeEvents[rateEventIndex];
      if (event.type === 'wheelbarrow') {
        rateState.wheelbarrow *= event.multiplier;
      } else {
        rateState[event.type] *= event.multiplier;
      }
      rateEventIndex += 1;
    }

    while (producedIndex < producedVillagerTimes.length && producedVillagerTimes[producedIndex] <= timestamp) {
      producedVillagers += 1;
      producedIndex += 1;
    }

    while (deathIndex < villagerDeathTimes.length && villagerDeathTimes[deathIndex] <= timestamp) {
      villagerDeaths += 1;
      deathIndex += 1;
    }

    const expectedVillagers = Math.min(targetVillagers, Math.floor(expectedVillagerProgress + EPSILON));
    const aliveVillagers = Math.max(0, producedVillagers - villagerDeaths);
    const underproductionDeficit = Math.max(0, expectedVillagers - producedVillagers);
    const totalDeficit = Math.max(0, expectedVillagers - aliveVillagers);
    const deathDeficit = Math.max(0, totalDeficit - underproductionDeficit);
    const expectedVillagerRateRpm = computeExpectedVillagerRateRpm(
      baselineRateRpm * villagerGatherRateMultiplier,
      rateState
    );
    const underproductionLossPerMin = underproductionDeficit * expectedVillagerRateRpm;
    const deathLossPerMin = deathDeficit * expectedVillagerRateRpm;
    const cumulativeTotalLoss = cumulativeUnderproductionLoss + cumulativeDeathLoss;

    const point: VillagerOpportunityPoint = {
      timestamp,
      expectedVillagerRateRpm,
      expectedVillagers,
      producedVillagers,
      aliveVillagers,
      underproductionDeficit,
      deathDeficit,
      totalDeficit,
      underproductionLossPerMin,
      deathLossPerMin,
      totalLossPerMin: underproductionLossPerMin + deathLossPerMin,
      cumulativeUnderproductionLoss,
      cumulativeDeathLoss,
      cumulativeTotalLoss,
    };

    series.push(point);
    previousPoint = point;
    previousTimestamp = timestamp;
  }

  const upgradeEvents: VillagerOpportunityUpgradeEvent[] = [
    ...rateUpgradeEvents.map(event => ({
      timestamp: event.timestamp,
      source: event.source,
      category: 'rate' as const,
      type: event.type,
      multiplier: event.multiplier,
    })),
    ...productionUpgradeEvents.map(event => ({
      timestamp: event.timestamp,
      source: event.source,
      category: 'production' as const,
      type: 'villager-production' as const,
      multiplier: event.multiplier,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp || a.source.localeCompare(b.source));

  return {
    baselineRateRpm,
    targetVillagers,
    series,
    upgradeEvents,
  };
}
