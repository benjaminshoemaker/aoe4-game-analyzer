import {
  buildAgeMarkers,
  buildOneLineStory,
  buildPostMatchViewModel,
  classifyBetShape,
  detectRaidEvents
} from '../../src/analysis/postMatchViewModel';
import { GameAnalysis } from '../../src/analysis/types';
import { PoolSeriesPoint } from '../../src/analysis/resourcePool';
import { SignificantResourceLossEvent } from '../../src/analysis/significantResourceLossEvents';
import { GameSummary, PlayerSummary, ResourceTotals, TimeSeriesResources } from '../../src/parser/gameSummaryParser';

const zeroTotals: ResourceTotals = { food: 0, wood: 0, gold: 0, stone: 0, total: 0 };

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

function player(profileId: number, duration: number): PlayerSummary {
  return {
    profileId,
    name: profileId === 1 ? 'You' : 'Opponent',
    civilization: profileId === 1 ? 'English' : 'French',
    team: profileId,
    apm: 0,
    result: profileId === 1 ? 'win' : 'loss',
    _stats: { ekills: 0, edeaths: 0, sqprod: 0, sqlost: 0, bprod: 0, upg: 0, totalcmds: 0 },
    actions: {},
    scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    totalResourcesGathered: zeroTotals,
    totalResourcesSpent: zeroTotals,
    resources: resources(duration),
    buildOrder: [],
  };
}

function summaryForSignificantEvents(duration: number): GameSummary {
  return {
    gameId: 123,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration,
    startedAt: 0,
    finishedAt: duration,
    players: [player(1, duration), player(2, duration)],
  };
}

function point(timestamp: number, total = 1000): PoolSeriesPoint {
  return {
    timestamp,
    economic: total,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total,
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

function analysisForSignificantEvents(duration: number, events: SignificantResourceLossEvent[]): GameAnalysis {
  const series = [point(0), point(duration)];
  return {
    gameId: 123,
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    duration,
    winReason: 'Surrender',
    player1: {
      name: 'You',
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
      name: 'Opponent',
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
        playerName: 'You',
        civilization: 'English',
        deferredNotices: [],
        gatherRateSeries: [],
        bandItemDeltas: [],
        bandItemSnapshots: [],
        series,
        peakTotal: 1000,
      },
      player2: {
        profileId: 2,
        playerName: 'Opponent',
        civilization: 'French',
        deferredNotices: [],
        gatherRateSeries: [],
        bandItemDeltas: [],
        bandItemSnapshots: [],
        series,
        peakTotal: 1000,
      },
      sharedYAxisMax: 1000,
    },
    significantResourceLossEvents: events,
    bottomLine: null,
  };
}

describe('classifyBetShape', () => {
  it('classifies economic-heavy when economic share is >= 60%', () => {
    const bet = classifyBetShape({
      economic: 0.62,
      populationCap: 0.06,
      militaryCapacity: 0.12,
      militaryActive: 0.1,
      defensive: 0.05,
      research: 0.03,
      advancement: 0.02,
    });
    expect(bet.label).toBe('economic-heavy');
  });

  it('classifies military-heavy when military (active+capacity) is >= 55%', () => {
    const bet = classifyBetShape({
      economic: 0.15,
      populationCap: 0.04,
      militaryCapacity: 0.24,
      militaryActive: 0.34,
      defensive: 0.08,
      research: 0.1,
      advancement: 0.05,
    });
    expect(bet.label).toBe('military-heavy');
  });

  it('classifies balanced when no band > 40% and top two <= 70%', () => {
    const bet = classifyBetShape({
      economic: 0.23,
      populationCap: 0.12,
      militaryCapacity: 0.16,
      militaryActive: 0.15,
      defensive: 0.12,
      research: 0.11,
      advancement: 0.11,
    });
    expect(bet.label).toBe('balanced');
  });
});

describe('detectRaidEvents', () => {
  it('detects a raid-shaped drop and recovery in gather rate', () => {
    const events = detectRaidEvents([
      { timestamp: 0, ratePerMin: 1000 },
      { timestamp: 30, ratePerMin: 980 },
      { timestamp: 60, ratePerMin: 860 },
      { timestamp: 120, ratePerMin: 890 },
      { timestamp: 180, ratePerMin: 930 },
      { timestamp: 240, ratePerMin: 940 }
    ], 'you');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].category).toBe('Economy');
    expect(events[0].description.toLowerCase()).toContain('gather rate');
  });
});

describe('buildAgeMarkers', () => {
  it('extracts sorted age-up markers for both players from summary actions', () => {
    const summary = {
      duration: 1200,
      players: [
        {
          actions: {
            age_up: [210, 520, 900],
          },
        },
        {
          actions: {
            feudal_age: [240],
            castleAge: [610],
          },
        },
      ],
    } as unknown as GameSummary;

    const markers = buildAgeMarkers(summary, 0);

    expect(markers).toEqual([
      expect.objectContaining({
        player: 'you',
        age: 'Feudal',
        timestamp: 210,
        label: 'Player 1 · Player 1 Feudal 3:30',
        shortLabel: 'Player 1 Feudal',
        timeLabel: '3:30',
      }),
      expect.objectContaining({
        player: 'opponent',
        age: 'Feudal',
        timestamp: 240,
        label: 'Player 2 · Player 2 Feudal 4:00',
        shortLabel: 'Player 2 Feudal',
        timeLabel: '4:00',
      }),
      expect.objectContaining({
        player: 'you',
        age: 'Castle',
        timestamp: 520,
        label: 'Player 1 · Player 1 Castle 8:40',
        shortLabel: 'Player 1 Castle',
        timeLabel: '8:40',
      }),
      expect.objectContaining({
        player: 'opponent',
        age: 'Castle',
        timestamp: 610,
        label: 'Player 2 · Player 2 Castle 10:10',
        shortLabel: 'Player 2 Castle',
        timeLabel: '10:10',
      }),
      expect.objectContaining({
        player: 'you',
        age: 'Imperial',
        timestamp: 900,
        label: 'Player 1 · Player 1 Imperial 15:00',
        shortLabel: 'Player 1 Imperial',
        timeLabel: '15:00',
      }),
    ]);
  });
});

describe('significant resource loss timeline events', () => {
  it('shows the top floor(game minutes / 4) events by gross impact with a minimum of one', () => {
    const duration = 22 * 60;
    const events = [
      significantEvent({ id: 'low', timestamp: 120, kind: 'loss', victimPlayer: 2, grossImpact: 100 }),
      significantEvent({ id: 'top-1', timestamp: 240, kind: 'loss', victimPlayer: 2, grossImpact: 600 }),
      significantEvent({ id: 'top-2', timestamp: 360, kind: 'loss', victimPlayer: 2, grossImpact: 500 }),
      significantEvent({ id: 'top-3', timestamp: 480, kind: 'loss', victimPlayer: 2, grossImpact: 400 }),
      significantEvent({ id: 'top-4', timestamp: 600, kind: 'loss', victimPlayer: 2, grossImpact: 300 }),
      significantEvent({ id: 'top-5', timestamp: 720, kind: 'loss', victimPlayer: 2, grossImpact: 200 }),
    ];

    const model = buildPostMatchViewModel({
      summary: summaryForSignificantEvents(duration),
      analysis: analysisForSignificantEvents(duration, events),
      perspectiveProfileId: 1,
    });

    expect(model.trajectory.significantEvents?.map(event => event.id)).toEqual([
      'top-1',
      'top-2',
      'top-3',
      'top-4',
      'top-5',
    ]);
    expect(model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 120)?.significantEvent).toBeNull();
  });

  it('labels significant-event hover markers with the graph-highlighted time range', () => {
    const duration = 3 * 60;
    const event = significantEvent({
      id: 'fight',
      timestamp: 160,
      windowStart: 130,
      windowEnd: 210,
      kind: 'fight',
      victimPlayer: 1,
      grossImpact: 1000,
    });

    const model = buildPostMatchViewModel({
      summary: summaryForSignificantEvents(duration),
      analysis: analysisForSignificantEvents(duration, [event]),
      perspectiveProfileId: 1,
    });

    expect(model.trajectory.hoverSnapshots.find(snapshot => snapshot.timestamp === 160)?.markers)
      .toEqual(['English Fight 2:10-3:00']);
  });

  it('writes raid and fight headlines with civilization names and carries encounter losses', () => {
    const duration = 3 * 60;
    const events = [
      significantEvent({
        id: 'raid',
        timestamp: 60,
        kind: 'raid',
        victimPlayer: 2,
        grossImpact: 240,
        villagerDeaths: 1,
        playerImpacts: {
          player1: {
            immediateLoss: 0,
            villagerOpportunityLoss: 0,
            grossLoss: 0,
            denominator: 1000,
            pctOfDeployed: 0,
            villagerDeaths: 0,
            losses: [],
            topLosses: [],
          },
          player2: {
            immediateLoss: 50,
            villagerOpportunityLoss: 190,
            grossLoss: 240,
            denominator: 1000,
            pctOfDeployed: 24,
            villagerDeaths: 1,
            losses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
            topLosses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
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
            losses: [{ label: 'Knight', value: 700, count: 3, band: 'militaryActive' }],
            topLosses: [{ label: 'Knight', value: 700, count: 3, band: 'militaryActive' }],
          },
          player2: {
            immediateLoss: 300,
            villagerOpportunityLoss: 0,
            grossLoss: 300,
            denominator: 1000,
            pctOfDeployed: 30,
            villagerDeaths: 0,
            losses: [{ label: 'Spearman', value: 300, count: 4, band: 'militaryActive' }],
            topLosses: [{ label: 'Spearman', value: 300, count: 4, band: 'militaryActive' }],
          },
        },
        preEncounterArmies: {
          player1: {
            totalValue: 1200,
            units: [{ label: 'Knight', value: 1200, count: 5, band: 'militaryActive' }],
          },
          player2: {
            totalValue: 450,
            units: [{ label: 'Spearman', value: 450, count: 5, band: 'militaryActive' }],
          },
        },
      }),
    ];

    const model = buildPostMatchViewModel({
      summary: summaryForSignificantEvents(duration),
      analysis: analysisForSignificantEvents(duration, events),
      perspectiveProfileId: 1,
    });

    expect(model.trajectory.significantEvents).toHaveLength(1);
    expect(model.trajectory.significantEvents?.[0]).toEqual(expect.objectContaining({
      id: 'fight',
      headline: 'French took a favorable fight against English, despite significantly fewer deployed military resources.',
      player1Civilization: 'English',
      player2Civilization: 'French',
      favorableUnderdogFight: {
        details: 'French won this encounter despite having significantly fewer deployed military resources than English. That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where French found an advantage, healing, stronger micro, or a favorable unit matchup.',
      },
      encounterLosses: {
        player1: [expect.objectContaining({ label: 'Knight', count: 3, value: 700 })],
        player2: [expect.objectContaining({ label: 'Spearman', count: 4, value: 300 })],
      },
    }));

    const shortGameRaidModel = buildPostMatchViewModel({
      summary: summaryForSignificantEvents(duration),
      analysis: analysisForSignificantEvents(duration, [events[0]]),
      perspectiveProfileId: 1,
    });
    expect(shortGameRaidModel.trajectory.significantEvents?.[0]?.headline)
      .toBe('English raided French and killed one villager.');

    const exactDoubleModel = buildPostMatchViewModel({
      summary: summaryForSignificantEvents(duration),
      analysis: analysisForSignificantEvents(duration, [
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
              losses: [{ label: 'Knight', value: 700, count: 3, band: 'militaryActive' }],
              topLosses: [{ label: 'Knight', value: 700, count: 3, band: 'militaryActive' }],
            },
            player2: {
              immediateLoss: 300,
              villagerOpportunityLoss: 0,
              grossLoss: 300,
              denominator: 1000,
              pctOfDeployed: 30,
              villagerDeaths: 0,
              losses: [{ label: 'Spearman', value: 300, count: 4, band: 'militaryActive' }],
              topLosses: [{ label: 'Spearman', value: 300, count: 4, band: 'militaryActive' }],
            },
          },
          preEncounterArmies: {
            player1: {
              totalValue: 900,
              units: [{ label: 'Knight', value: 900, count: 4, band: 'militaryActive' }],
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
});

describe('buildOneLineStory', () => {
  it('renders a template-only narrative using supplied metrics', () => {
    const story = buildOneLineStory({
      yourBetLabel: 'economic',
      oppBetLabel: 'military',
      yourEconomicPercent: 56,
      oppEconomicPercent: 31,
      gapAtCastlePercentPoints: 25,
      topDestructiveEventSentence: 'A large Feudal engagement erased 18% of your military-active pool in 90 seconds.',
      civOverlaySentence: 'Byzantine mercenary injections added 420 market-value during the midgame.',
      finalPoolDelta: -6200
    });

    expect(story).toContain('56%');
    expect(story).toContain('31%');
    expect(story).toContain('18%');
    expect(story).toContain('420');
    expect(story).toContain('-6200');
    expect(story).not.toContain('{');
  });
});
