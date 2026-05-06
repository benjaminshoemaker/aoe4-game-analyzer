import { GameSummary } from '../../packages/aoe4-core/src/parser/gameSummaryParser';
import {
  buildVillagerOpportunityForPlayer,
  VILLAGER_RATE_BASELINE_RPM,
  VILLAGER_TARGET_COUNT
} from '../../packages/aoe4-core/src/analysis/villagerOpportunity';

function makePlayerSummary(): GameSummary['players'][0] {
  return {
    profileId: 10,
    name: 'Tester',
    civilization: 'english',
    team: 1,
    apm: 100,
    result: 'win',
    _stats: {
      ekills: 0,
      edeaths: 0,
      sqprod: 0,
      sqlost: 0,
      bprod: 0,
      upg: 0,
      totalcmds: 0,
    },
    actions: {
      upgradeEconResourceWoodHarvestRate2: [100],
      upgradeUnitTownCenterWheelbarrow1: [200],
    },
    scores: {
      total: 0,
      military: 0,
      economy: 0,
      technology: 0,
      society: 0,
    },
    totalResourcesGathered: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    totalResourcesSpent: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    resources: {
      timestamps: [0, 100, 200, 300],
      food: [0, 0, 0, 0],
      gold: [0, 0, 0, 0],
      stone: [0, 0, 0, 0],
      wood: [0, 0, 0, 0],
      foodPerMin: [100, 100, 100, 100],
      goldPerMin: [100, 100, 100, 100],
      stonePerMin: [100, 100, 100, 100],
      woodPerMin: [100, 100, 100, 100],
      total: [0, 0, 0, 0],
      military: [0, 0, 0, 0],
      economy: [0, 0, 0, 0],
      technology: [0, 0, 0, 0],
      society: [0, 0, 0, 0],
    },
    buildOrder: [
      {
        id: 'villager',
        icon: 'icons/races/english/units/villager',
        pbgid: 1,
        type: 'Unit',
        finished: [0, 60],
        constructed: [],
        destroyed: [120],
      },
      {
        id: 'town_center',
        icon: 'icons/races/common/buildings/town_center',
        pbgid: 2,
        type: 'Building',
        finished: [],
        constructed: [0],
        destroyed: [],
      }
    ],
  };
}

function pointAt(series: { timestamp: number }[], timestamp: number): any {
  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}

function makeProductionPlayerSummary(
  civilization: string,
  actions: Record<string, number[]> = {},
  villagerFinished: number[] = [0, 0, 0, 0, 0, 0]
): GameSummary['players'][0] {
  return {
    profileId: 20,
    name: `${civilization}-tester`,
    civilization,
    team: 1,
    apm: 100,
    result: 'win',
    _stats: {
      ekills: 0,
      edeaths: 0,
      sqprod: 0,
      sqlost: 0,
      bprod: 0,
      upg: 0,
      totalcmds: 0,
    },
    actions,
    scores: {
      total: 0,
      military: 0,
      economy: 0,
      technology: 0,
      society: 0,
    },
    totalResourcesGathered: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    totalResourcesSpent: {
      food: 0,
      gold: 0,
      stone: 0,
      wood: 0,
      total: 0,
    },
    resources: {
      timestamps: [0, 120, 240, 360],
      food: [0, 0, 0, 0],
      gold: [0, 0, 0, 0],
      stone: [0, 0, 0, 0],
      wood: [0, 0, 0, 0],
      foodPerMin: [100, 100, 100, 100],
      goldPerMin: [100, 100, 100, 100],
      stonePerMin: [100, 100, 100, 100],
      woodPerMin: [100, 100, 100, 100],
      total: [0, 0, 0, 0],
      military: [0, 0, 0, 0],
      economy: [0, 0, 0, 0],
      technology: [0, 0, 0, 0],
      society: [0, 0, 0, 0],
    },
    buildOrder: [
      {
        id: 'villager',
        icon: 'icons/races/common/units/villager',
        pbgid: 11,
        type: 'Unit',
        finished: villagerFinished,
        constructed: [],
        destroyed: [],
      },
      {
        id: 'town_center',
        icon: 'icons/races/common/buildings/town_center',
        pbgid: 12,
        type: 'Building',
        finished: [],
        constructed: [0],
        destroyed: [],
      }
    ],
  };
}

describe('villagerOpportunity', () => {
  it('uses baseline + direct econ upgrades + wheelbarrow to build expected villager rate', () => {
    const player = makePlayerSummary();
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 300,
    });

    const at0 = pointAt(result.series, 0);
    const at150 = pointAt(result.series, 150);
    const at250 = pointAt(result.series, 250);

    expect(at0.expectedVillagerRateRpm).toBeCloseTo(VILLAGER_RATE_BASELINE_RPM, 5);
    expect(at150.expectedVillagerRateRpm).toBeGreaterThan(at0.expectedVillagerRateRpm);
    expect(at250.expectedVillagerRateRpm).toBeGreaterThan(at150.expectedVillagerRateRpm);
    expect(result.upgradeEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'upgradeEconResourceWoodHarvestRate2' }),
      expect.objectContaining({ source: 'upgradeUnitTownCenterWheelbarrow1' }),
    ]));
  });

  it('decomposes deficits into underproduction + death without double counting', () => {
    const player = makePlayerSummary();
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 300,
    });

    const at100 = pointAt(result.series, 100);
    const at150 = pointAt(result.series, 150);
    const at300 = pointAt(result.series, 300);

    expect(at100.underproductionDeficit).toBeGreaterThan(0);
    expect(at100.deathDeficit).toBe(0);
    expect(at150.deathDeficit).toBeGreaterThan(0);
    expect(at150.totalDeficit).toBe(at150.underproductionDeficit + at150.deathDeficit);
    expect(at300.cumulativeTotalLoss).toBeCloseTo(
      at300.cumulativeUnderproductionLoss + at300.cumulativeDeathLoss,
      6
    );
  });

  it('tracks cumulative town-center idle seconds behind expected villager production', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0]);
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 120,
    });

    const at120 = pointAt(result.series, 120);

    expect(at120.cumulativeUnderproductionSeconds).toBeCloseTo(120, 6);
    expect(at120.cumulativeUnderproductionLoss).toBeCloseTo(
      (300 * VILLAGER_RATE_BASELINE_RPM) / 60,
      6
    );
  });

  it('subtracts actual villager training time from town-center idle seconds', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0, 60]);
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 60,
    });

    const at60 = pointAt(result.series, 60);

    expect(at60.cumulativeUnderproductionSeconds).toBeCloseTo(40, 6);
  });

  it('credits in-progress villager training before the villager completion timestamp', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0, 60]);
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 70,
    });

    const at50 = pointAt(result.series, 50);

    expect(at50.cumulativeUnderproductionSeconds).toBeCloseTo(40, 6);
  });

  it('keeps expected villager count capped at the configured target', () => {
    const player = makePlayerSummary();
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 7200,
    });

    const finalPoint = result.series[result.series.length - 1];
    expect(finalPoint.expectedVillagers).toBeLessThanOrEqual(VILLAGER_TARGET_COUNT);
    expect(finalPoint.expectedVillagers).toBe(VILLAGER_TARGET_COUNT);
  });

  it('permanently locks expected villager growth once total population reaches 200', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0]);
    (player.resources as any).population = [80, 200, 160, 160];

    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 360,
    });

    const at120 = pointAt(result.series, 120);
    const at360 = pointAt(result.series, 360);

    expect(at120.expectedVillagers).toBe(12);
    expect(at360.expectedVillagers).toBe(at120.expectedVillagers);
  });

  it('starts expected villager curve at villagers present at t=0', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0]);
    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 120,
    });

    const at0 = pointAt(result.series, 0);
    expect(at0.expectedVillagers).toBe(6);
    expect(at0.producedVillagers).toBe(6);
    expect(at0.underproductionDeficit).toBe(0);
  });

  it('uses civ-text production rules: French ages faster, Jeanne baseline', () => {
    const english = makeProductionPlayerSummary('english');
    const french = makeProductionPlayerSummary('french', {
      feudalAge: [120],
      castleAge: [240],
      imperialAge: [360],
    });
    const jeanne = makeProductionPlayerSummary('jeanne_darc', {
      feudalAge: [120],
      castleAge: [240],
      imperialAge: [360],
    });

    const englishResult = buildVillagerOpportunityForPlayer({ player: english, duration: 360 });
    const frenchResult = buildVillagerOpportunityForPlayer({ player: french, duration: 360 });
    const jeanneResult = buildVillagerOpportunityForPlayer({ player: jeanne, duration: 360 });

    const at180English = pointAt(englishResult.series, 180);
    const at180French = pointAt(frenchResult.series, 180);
    const at180Jeanne = pointAt(jeanneResult.series, 180);

    const at300English = pointAt(englishResult.series, 300);
    const at300French = pointAt(frenchResult.series, 300);
    const at300Jeanne = pointAt(jeanneResult.series, 300);

    expect(at180French.expectedVillagers).toBeGreaterThan(at180English.expectedVillagers);
    expect(at180Jeanne.expectedVillagers).toBe(at180English.expectedVillagers);
    expect(at300French.expectedVillagers).toBeGreaterThan(at300English.expectedVillagers);
    expect(at300Jeanne.expectedVillagers).toBe(at300English.expectedVillagers);
  });

  it('treats Golden Horde villager production as 2-per-37s equivalent', () => {
    const goldenHorde = makeProductionPlayerSummary('golden_horde');
    const result = buildVillagerOpportunityForPlayer({
      player: goldenHorde,
      duration: 74,
    });

    const at37 = pointAt(result.series, 37);
    const at74 = pointAt(result.series, 74);

    expect(at37.expectedVillagers).toBe(8);
    expect(at74.expectedVillagers).toBe(10);
  });

  it('applies OOTD gilded villager gather multiplier to baseline expected rate', () => {
    const english = makeProductionPlayerSummary('english');
    const ootd = makeProductionPlayerSummary('order_of_the_dragon');

    const englishResult = buildVillagerOpportunityForPlayer({
      player: english,
      duration: 60,
    });
    const ootdResult = buildVillagerOpportunityForPlayer({
      player: ootd,
      duration: 60,
    });

    const englishAt0 = pointAt(englishResult.series, 0);
    const ootdAt0 = pointAt(ootdResult.series, 0);

    expect(ootdAt0.expectedVillagerRateRpm).toBeCloseTo(englishAt0.expectedVillagerRateRpm * 1.28, 6);
  });

  it('counts hunting-gear style upgrades as food-rate multipliers', () => {
    const player = makeProductionPlayerSummary('english', {
      upgradeEconVillagerHuntingGear1: [100],
    });

    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 180,
    });

    const at90 = pointAt(result.series, 90);
    const at120 = pointAt(result.series, 120);

    expect(at120.expectedVillagerRateRpm).toBeGreaterThan(at90.expectedVillagerRateRpm);
    expect(at120.expectedVillagerRateRpm).toBeCloseTo(VILLAGER_RATE_BASELINE_RPM * (1 + 0.43 * 0.15), 5);
  });

  it('scales expected villagers by active town center count over time', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0]);
    player.buildOrder.push({
      id: 'town_center',
      icon: 'icons/races/common/buildings/town_center',
      pbgid: 99,
      type: 'Building',
      finished: [],
      constructed: [60],
      destroyed: [],
    });

    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 120,
    });

    const at120 = pointAt(result.series, 120);

    // Start at 6 villagers.
    // 0:00-1:00 with 1 TC => +3 expected villagers.
    // 1:00-2:00 with 2 TCs => +6 expected villagers.
    expect(at120.expectedVillagers).toBe(15);
    expect(at120.underproductionDeficit).toBe(9);
  });

  it('does not double count a town center when both constructed and finished are present', () => {
    const player = makeProductionPlayerSummary('english', {}, [0, 0, 0, 0, 0, 0]);
    player.buildOrder.push({
      id: 'town_center',
      icon: 'icons/races/common/buildings/town_center',
      pbgid: 99,
      type: 'Building',
      finished: [100],
      constructed: [60],
      destroyed: [],
    });

    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 120,
    });

    const at120 = pointAt(result.series, 120);
    expect(at120.expectedVillagers).toBe(15);
    expect(at120.underproductionDeficit).toBe(9);
  });

  it('does not count transformed Jeanne as a villager death after she becomes military', () => {
    const player = makeProductionPlayerSummary('jeanne_darc', {}, [0, 0, 0, 0, 0]);
    player.buildOrder.unshift({
      id: 'jeanne-darc-villager',
      icon: 'icons/races/jeanne_darc/units/jeanne_darc_villager',
      pbgid: 424242,
      type: 'Unit',
      finished: [0],
      constructed: [],
      destroyed: [180],
      transformed: [120],
    } as any);

    const result = buildVillagerOpportunityForPlayer({
      player,
      duration: 240,
    });

    const at60 = pointAt(result.series, 60);
    const at180 = pointAt(result.series, 180);
    const finalPoint = result.series[result.series.length - 1];

    expect(at60.producedVillagers).toBe(6);
    expect(at180.aliveVillagers).toBe(5);
    expect(at180.deathDeficit).toBe(0);
    expect(finalPoint.cumulativeDeathLoss).toBe(0);
  });
});
