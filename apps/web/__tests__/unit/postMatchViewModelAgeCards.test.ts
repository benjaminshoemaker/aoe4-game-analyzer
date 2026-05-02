import { buildPostMatchViewModel } from '@aoe4/analyzer-core/analysis/postMatchViewModel';
import { GameAnalysis } from '@aoe4/analyzer-core/analysis/types';
import { GameSummary, PlayerSummary, ResourceTotals, TimeSeriesResources } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import { BandItemDeltaEvent, PoolSeriesPoint } from '@aoe4/analyzer-core/analysis/resourcePool';
import { SignificantResourceLossEvent } from '@aoe4/analyzer-core/analysis/significantResourceLossEvents';

const zeroTotals: ResourceTotals = {
  food: 0,
  wood: 0,
  gold: 0,
  stone: 0,
  total: 0,
};

function resources(duration: number): TimeSeriesResources {
  return {
    timestamps: [0, duration],
    food: [0, 0],
    gold: [0, 0],
    stone: [0, 0],
    wood: [0, 0],
    foodPerMin: [0, 0],
    goldPerMin: [0, 0],
    stonePerMin: [0, 0],
    woodPerMin: [0, 0],
    total: [0, 0],
    military: [0, 0],
    economy: [0, 0],
    technology: [0, 0],
    society: [0, 0],
  };
}

function makePlayer(profileId: number, name: string, ageUps: number[], duration: number): PlayerSummary {
  return {
    profileId,
    name,
    civilization: profileId === 1 ? 'English' : 'French',
    team: profileId,
    apm: 0,
    result: profileId === 1 ? 'win' : 'loss',
    _stats: {
      ekills: 0,
      edeaths: 0,
      sqprod: 0,
      sqlost: 0,
      bprod: 0,
      upg: 0,
      totalcmds: 0,
    },
    actions: ageUps.length > 0 ? { age_up: ageUps } : {},
    scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    totalResourcesGathered: zeroTotals,
    totalResourcesSpent: zeroTotals,
    resources: resources(duration),
    buildOrder: [],
  };
}

function point(
  timestamp: number,
  values: Partial<Omit<PoolSeriesPoint, 'timestamp' | 'total'>>
): PoolSeriesPoint {
  const full = {
    economic: 0,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    ...values,
  };
  return {
    timestamp,
    ...full,
    total:
      full.economic +
      full.populationCap +
      full.militaryCapacity +
      full.militaryActive +
      full.defensive +
      full.research +
      full.advancement,
  };
}

function makeSummary(duration: number, youAgeUps: number[], opponentAgeUps: number[]): GameSummary {
  return {
    gameId: 123,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration,
    startedAt: 0,
    finishedAt: duration,
    players: [
      makePlayer(1, 'RepleteCactus', youAgeUps, duration),
      makePlayer(2, 'Mista', opponentAgeUps, duration),
    ],
  };
}

function makeAnalysis(
  duration: number,
  youSeries: PoolSeriesPoint[],
  opponentSeries: PoolSeriesPoint[],
  gatherRateSeries: {
    you?: Array<{ timestamp: number; ratePerMin: number }>;
    opponent?: Array<{ timestamp: number; ratePerMin: number }>;
  } = {},
  bandItemDeltas: {
    you?: BandItemDeltaEvent[];
    opponent?: BandItemDeltaEvent[];
  } = {},
  significantResourceLossEvents: SignificantResourceLossEvent[] = []
): GameAnalysis {
  return {
    gameId: 123,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration,
    winReason: 'Surrender',
    player1: {
      name: 'RepleteCactus',
      civilization: 'English',
      result: 'win',
      apm: 0,
      scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
      totalGathered: zeroTotals,
      totalSpent: zeroTotals,
      kills: 0,
      deaths: 0,
      unitsProduced: 0,
    },
    player2: {
      name: 'Mista',
      civilization: 'French',
      result: 'loss',
      apm: 0,
      scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
      totalGathered: zeroTotals,
      totalSpent: zeroTotals,
      kills: 0,
      deaths: 0,
      unitsProduced: 0,
    },
    phases: { unifiedPhases: [], gameDuration: duration },
    phaseComparisons: [],
    inflectionPoints: [],
    finalArmyMatchup: null,
    combatAdjustedMilitarySeries: [],
    deployedResourcePools: {
      player1: {
        profileId: 1,
        playerName: 'RepleteCactus',
        civilization: 'English',
        deferredNotices: [],
        gatherRateSeries: gatherRateSeries.you ?? [],
        bandItemDeltas: bandItemDeltas.you ?? [],
        series: youSeries,
        peakTotal: Math.max(...youSeries.map(item => item.total)),
      },
      player2: {
        profileId: 2,
        playerName: 'Mista',
        civilization: 'French',
        deferredNotices: [],
        gatherRateSeries: gatherRateSeries.opponent ?? [],
        bandItemDeltas: bandItemDeltas.opponent ?? [],
        series: opponentSeries,
        peakTotal: Math.max(...opponentSeries.map(item => item.total)),
      },
      sharedYAxisMax: Math.max(...youSeries.map(item => item.total), ...opponentSeries.map(item => item.total)),
    },
    significantResourceLossEvents,
    bottomLine: null,
  };
}

function significantEvent(params: Partial<SignificantResourceLossEvent> & {
  id: string;
  timestamp: number;
  kind: SignificantResourceLossEvent['kind'];
  victimPlayer: 1 | 2;
  grossImpact: number;
}): SignificantResourceLossEvent {
  const player1Loss = params.playerImpacts?.player1?.grossLoss ?? (params.victimPlayer === 1 ? params.grossLoss ?? params.grossImpact : 0);
  const player2Loss = params.playerImpacts?.player2?.grossLoss ?? (params.victimPlayer === 2 ? params.grossLoss ?? params.grossImpact : 0);
  return {
    windowStart: Math.max(0, params.timestamp - 30),
    windowEnd: params.timestamp + 30,
    label: params.kind === 'raid' ? 'Raid' : params.kind === 'fight' ? 'Fight' : 'Loss',
    shortLabel: params.kind === 'raid' ? 'Raid' : params.kind === 'fight' ? 'Fight' : 'Loss',
    description: 'Synthetic significant event.',
    impactSummary: 'Synthetic impact.',
    grossLoss: params.grossLoss ?? params.grossImpact,
    immediateLoss: params.immediateLoss ?? params.grossImpact,
    villagerOpportunityLoss: params.villagerOpportunityLoss ?? 0,
    denominator: 1000,
    pctOfDeployed: 10,
    villagerDeaths: params.villagerDeaths ?? 0,
    topLosses: params.topLosses ?? [],
    playerImpacts: {
      player1: {
        immediateLoss: player1Loss,
        villagerOpportunityLoss: 0,
        grossLoss: player1Loss,
        denominator: 1000,
        pctOfDeployed: player1Loss / 10,
        villagerDeaths: params.playerImpacts?.player1?.villagerDeaths ?? 0,
        losses: params.playerImpacts?.player1?.losses ?? [],
        topLosses: [],
      },
      player2: {
        immediateLoss: player2Loss,
        villagerOpportunityLoss: 0,
        grossLoss: player2Loss,
        denominator: 1000,
        pctOfDeployed: player2Loss / 10,
        villagerDeaths: params.playerImpacts?.player2?.villagerDeaths ?? 0,
        losses: params.playerImpacts?.player2?.losses ?? [],
        topLosses: [],
      },
    },
    ...params,
  };
}

describe('buildPostMatchViewModel age investment cards', () => {
  it('curates significant events by game length and writes perspective headlines', () => {
    const duration = 22 * 60;
    const summary = makeSummary(duration, [], []);
    const analysis = makeAnalysis(duration, [point(0, {}), point(duration, { economic: 1000 })], [
      point(0, {}),
      point(duration, { economic: 1000 }),
    ], {}, {}, [
      significantEvent({ id: 'low', timestamp: 120, kind: 'loss', victimPlayer: 2, grossImpact: 100 }),
      significantEvent({ id: 'top-1', timestamp: 240, kind: 'loss', victimPlayer: 2, grossImpact: 600 }),
      significantEvent({ id: 'top-2', timestamp: 360, kind: 'loss', victimPlayer: 2, grossImpact: 500 }),
      significantEvent({ id: 'top-3', timestamp: 480, kind: 'loss', victimPlayer: 2, grossImpact: 400 }),
      significantEvent({ id: 'top-4', timestamp: 600, kind: 'loss', victimPlayer: 2, grossImpact: 300 }),
      significantEvent({ id: 'top-5', timestamp: 720, kind: 'loss', victimPlayer: 2, grossImpact: 200 }),
    ]);

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: 1,
    });

    expect(model.trajectory.significantEvents?.map(event => event.id)).toEqual([
      'top-1',
      'top-2',
      'top-3',
      'top-4',
      'top-5',
    ]);

    const fightModel = buildPostMatchViewModel({
      summary: makeSummary(180, [], []),
      analysis: makeAnalysis(180, [point(0, {}), point(180, { economic: 1000 })], [
        point(0, {}),
        point(180, { economic: 1000 }),
      ], {}, {}, [
        significantEvent({
          id: 'fight',
          timestamp: 120,
          kind: 'fight',
          victimPlayer: 1,
          grossImpact: 1000,
          playerImpacts: {
            player1: {
              immediateLoss: 700,
              villagerOpportunityLoss: 0,
              grossLoss: 700,
              denominator: 1000,
              pctOfDeployed: 70,
              villagerDeaths: 0,
              losses: [],
              topLosses: [],
            },
            player2: {
              immediateLoss: 300,
              villagerOpportunityLoss: 0,
              grossLoss: 300,
              denominator: 1000,
              pctOfDeployed: 30,
              villagerDeaths: 0,
              losses: [],
              topLosses: [],
            },
          },
          preEncounterArmies: {
            player1: {
              totalValue: 1200,
              units: [{ label: 'Longbowman', value: 1200, count: 12, band: 'militaryActive' }],
            },
            player2: {
              totalValue: 450,
              units: [{ label: 'Spearman', value: 450, count: 5, band: 'militaryActive' }],
            },
          },
        }),
      ]),
      perspectiveProfileId: 1,
    });

    expect(fightModel.trajectory.significantEvents?.[0]?.headline)
      .toBe('French took a favorable fight against English, despite significantly fewer deployed military resources.');
    expect(fightModel.trajectory.significantEvents?.[0]?.favorableUnderdogFight).toEqual({
      details: 'French won this encounter despite having significantly fewer deployed military resources than English. That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where French found an advantage, healing, stronger micro, or a favorable unit matchup.',
    });

    const exactDoubleModel = buildPostMatchViewModel({
      summary: makeSummary(180, [], []),
      analysis: makeAnalysis(180, [point(0, {}), point(180, { economic: 1000 })], [
        point(0, {}),
        point(180, { economic: 1000 }),
      ], {}, {}, [
        significantEvent({
          id: 'exact-double-fight',
          timestamp: 120,
          kind: 'fight',
          victimPlayer: 1,
          grossImpact: 1000,
          playerImpacts: {
            player1: {
              immediateLoss: 700,
              villagerOpportunityLoss: 0,
              grossLoss: 700,
              denominator: 1000,
              pctOfDeployed: 70,
              villagerDeaths: 0,
              losses: [],
              topLosses: [],
            },
            player2: {
              immediateLoss: 300,
              villagerOpportunityLoss: 0,
              grossLoss: 300,
              denominator: 1000,
              pctOfDeployed: 30,
              villagerDeaths: 0,
              losses: [],
              topLosses: [],
            },
          },
          preEncounterArmies: {
            player1: {
              totalValue: 900,
              units: [{ label: 'Longbowman', value: 900, count: 9, band: 'militaryActive' }],
            },
            player2: {
              totalValue: 450,
              units: [{ label: 'Spearman', value: 450, count: 5, band: 'militaryActive' }],
            },
          },
        }),
      ]),
      perspectiveProfileId: 1,
    });

    expect(exactDoubleModel.trajectory.significantEvents?.[0]?.favorableUnderdogFight).toBeUndefined();
    expect(exactDoubleModel.trajectory.significantEvents?.[0]?.headline)
      .not.toContain('despite significantly fewer deployed military resources');
  });

  it('builds age cards from shared age windows and includes in-progress advancement in the window delta', () => {
    const duration = 1000;
    const summary = makeSummary(duration, [120, 420, 900], [150, 480]);
    const analysis = makeAnalysis(duration, [
      point(0, {}),
      point(120, { advancement: 400 }),
      point(150, { advancement: 400, economic: 50 }),
      point(420, { advancement: 1000, economic: 80, militaryActive: 120 }),
      point(480, { advancement: 1000, economic: 110, militaryActive: 180 }),
      point(900, { advancement: 2200, economic: 180, militaryActive: 260 }),
      point(1000, { advancement: 2200, economic: 200, militaryActive: 280 }),
    ], [
      point(0, {}),
      point(110, { advancement: 300 }),
      point(150, { advancement: 300, economic: 40 }),
      point(410, { advancement: 800, economic: 70, militaryActive: 90 }),
      point(480, { advancement: 800, economic: 90, militaryActive: 130 }),
      point(880, { advancement: 1900, economic: 150, militaryActive: 210 }),
      point(1000, { advancement: 1900, economic: 170, militaryActive: 230 }),
    ], {
      opponent: [
        { timestamp: 150, ratePerMin: 500 },
        { timestamp: 240, ratePerMin: 400 },
        { timestamp: 420, ratePerMin: 520 },
      ],
    });

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: 1,
    });

    expect(model.metricCards.ageAnalyses.map(card => card.age)).toEqual(['Dark', 'Feudal', 'Castle', 'Imperial']);
    expect(model.metricCards.ageAnalyses.find(card => card.age === 'Dark')).toEqual(expect.objectContaining({
      startTime: 0,
      endTime: 120,
      timeRangeLabel: '0:00-2:00',
    }));

    const feudal = model.metricCards.ageAnalyses.find(card => card.age === 'Feudal');
    expect(feudal).toEqual(expect.objectContaining({
      startTime: 150,
      endTime: 420,
      timeRangeLabel: '2:30-7:00',
    }));
    expect(feudal?.gapSummary).toBe('Gap widened: English +110 -> English +240.');
    expect(feudal?.allocationSummary).toBe('Allocation: English led by Technology +100; Military was similar.');
    expect(feudal?.destructionSummary).toBe('Destruction: neither player destroyed measurable value.');
    expect(feudal?.conversionSummary).toBe('Meaning: English military converted: French gather/min fell 20% inside the window.');
    expect(feudal?.summary).toBe('Gap widened: English +110 -> English +240. Allocation: English led by Technology +100; Military was similar. Destruction: neither player destroyed measurable value. Meaning: English military converted: French gather/min fell 20% inside the window.');

    const imperial = model.metricCards.ageAnalyses.find(card => card.age === 'Imperial');
    expect(imperial).toEqual(expect.objectContaining({
      startTime: null,
      endTime: null,
      timeRangeLabel: 'No shared window',
    }));
    expect(imperial?.summary).toContain('Only English reached Imperial');
  });

  it('omits age cards when neither player reaches that age', () => {
    const duration = 600;
    const summary = makeSummary(duration, [120], [150]);
    const analysis = makeAnalysis(duration, [
      point(0, {}),
      point(120, { advancement: 400 }),
      point(600, { advancement: 400, economic: 100 }),
    ], [
      point(0, {}),
      point(150, { advancement: 400 }),
      point(600, { advancement: 400, economic: 100 }),
    ]);

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: 1,
    });

    expect(model.metricCards.ageAnalyses.map(card => card.age)).toEqual(['Dark', 'Feudal']);
  });

  it('flags dark-age military that did not convert into destruction or economy damage', () => {
    const duration = 600;
    const summary = makeSummary(duration, [253], [334]);
    const analysis = makeAnalysis(duration, [
      point(0, { economic: 25 }),
      point(253, { economic: 825, advancement: 600, populationCap: 75 }),
      point(600, { economic: 925, advancement: 600, populationCap: 100 }),
    ], [
      point(0, {}),
      point(253, { economic: 700, militaryActive: 390, populationCap: 100 }),
      point(600, { economic: 800, advancement: 400, militaryActive: 390, populationCap: 125 }),
    ], {
      you: [
        { timestamp: 0, ratePerMin: 500 },
        { timestamp: 253, ratePerMin: 520 },
      ],
      opponent: [
        { timestamp: 0, ratePerMin: 500 },
        { timestamp: 253, ratePerMin: 510 },
      ],
    });

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: 1,
    });

    const dark = model.metricCards.ageAnalyses.find(card => card.age === 'Dark');
    expect(dark).toEqual(expect.objectContaining({
      startTime: 0,
      endTime: 253,
      timeRangeLabel: '0:00-4:13',
    }));
    expect(dark?.gapSummary).toBe('Gap widened: English +25 -> English +310.');
    expect(dark?.allocationSummary).toBe('Allocation: English led by Technology +600, while French led by Military +390; Economy was similar.');
    expect(dark?.destructionSummary).toBe('Destruction: neither player destroyed measurable value.');
    expect(dark?.conversionSummary).toBe('Meaning: French Dark military did not convert: +390 Military destroyed 0 value and caused no major gather-rate drop.');
  });

  it('uses compact civilization labels in age summaries when civilizations differ', () => {
    const summary = makeSummary(600, [120, 420], [150]);
    summary.players[0].name = 'RepleteCactus';
    summary.players[1].name = 'Mista';

    const model = buildPostMatchViewModel({
      summary,
      analysis: makeAnalysis(
        600,
        [
          point(0, { economic: 50 }),
          point(120, { economic: 100, research: 100 }),
          point(420, { economic: 100, research: 100, advancement: 300 }),
          point(600, { economic: 120, research: 100, advancement: 300 }),
        ],
        [
          point(0, { economic: 50 }),
          point(120, { economic: 80 }),
          point(420, { economic: 100, militaryActive: 130 }),
          point(600, { economic: 100, militaryActive: 130 }),
        ]
      ),
      perspectiveProfileId: 1,
    });

    expect(model.header.youPlayer.label).toBe('RepleteCactus · English');
    expect(model.header.opponentPlayer.label).toBe('Mista · French');
    expect(model.trajectory.ageMarkers[0].label).toBe('RepleteCactus · English Feudal 2:00');
    expect(model.trajectory.ageMarkers[0].shortLabel).toBe('RepleteCactus Feudal');

    const visibleAgeText = model.metricCards.ageAnalyses
      .flatMap(card => [card.gapSummary, card.allocationSummary, card.destructionSummary, card.conversionSummary])
      .join(' ');
    expect(visibleAgeText).toContain('English');
    expect(visibleAgeText).toContain('French');
    expect(visibleAgeText).not.toContain('RepleteCactus');
    expect(visibleAgeText).not.toContain('Mista');
    expect(visibleAgeText).not.toMatch(/\bYou\b|\byour\b|\bOpponent\b|\bopponent\b/);
  });

  it('uses compact player-name labels in age summaries when civilizations mirror', () => {
    const summary = makeSummary(600, [120, 420], [150]);
    summary.players[0].name = 'RepleteCactus';
    summary.players[1].name = 'Mista';
    summary.players[1].civilization = 'English';

    const model = buildPostMatchViewModel({
      summary,
      analysis: makeAnalysis(
        600,
        [
          point(0, { economic: 50 }),
          point(120, { economic: 100, research: 100 }),
          point(420, { economic: 100, research: 100, advancement: 300 }),
          point(600, { economic: 120, research: 100, advancement: 300 }),
        ],
        [
          point(0, { economic: 50 }),
          point(120, { economic: 80 }),
          point(420, { economic: 100, militaryActive: 130 }),
          point(600, { economic: 100, militaryActive: 130 }),
        ]
      ),
      perspectiveProfileId: 1,
    });

    expect(model.header.youPlayer.label).toBe('RepleteCactus · English');
    expect(model.header.opponentPlayer.label).toBe('Mista · English');
    expect(model.trajectory.ageMarkers[0].label).toBe('RepleteCactus · English Feudal 2:00');
    expect(model.trajectory.ageMarkers[0].shortLabel).toBe('RepleteCactus Feudal');

    const visibleAgeText = model.metricCards.ageAnalyses
      .flatMap(card => [card.gapSummary, card.allocationSummary, card.destructionSummary, card.conversionSummary])
      .join(' ');
    expect(visibleAgeText).toContain('RepleteCactus');
    expect(visibleAgeText).toContain('Mista');
    expect(visibleAgeText).not.toContain('RepleteCactus · English');
    expect(visibleAgeText).not.toContain('Mista · English');
  });
});
