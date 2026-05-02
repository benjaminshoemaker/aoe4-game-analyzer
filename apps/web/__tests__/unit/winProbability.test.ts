import { GameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';
import {
  buildMatchSkillBracket,
  buildWinProbabilityExamples,
} from '@aoe4/analyzer-core/analysis/winProbability';

function makeSummary(): GameSummary {
  const emptyResources = {
    timestamps: [0, 60],
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

  return {
    gameId: 123456,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'Grassland',
    leaderboard: 'rm_1v1',
    duration: 600,
    startedAt: 1,
    finishedAt: 601,
    players: [
      {
        profileId: 111,
        name: 'Winner',
        civilization: 'english',
        team: 0,
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
        actions: {},
        scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
        totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        resources: emptyResources,
        buildOrder: [],
      },
      {
        profileId: 222,
        name: 'Loser',
        civilization: 'french',
        team: 1,
        apm: 90,
        result: 'loss',
        _stats: {
          ekills: 0,
          edeaths: 0,
          sqprod: 0,
          sqlost: 0,
          bprod: 0,
          upg: 0,
          totalcmds: 0,
        },
        actions: {},
        scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
        totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
        resources: emptyResources,
        buildOrder: [],
      },
    ],
  };
}

describe('win probability training examples', () => {
  it('builds average-lobby Elo brackets without encoding individual player strength', () => {
    expect(buildMatchSkillBracket(972)).toEqual({
      label: '900-999',
      lowerBound: 900,
      upperBound: 999,
      averageElo: 972,
      source: 'average-lobby-elo',
    });

    expect(buildMatchSkillBracket(null)).toEqual({
      label: 'unknown',
      lowerBound: null,
      upperBound: null,
      averageElo: null,
      source: 'unknown',
    });
  });

  it('emits symmetric timestamp-safe examples with bracket context and lookback trends', () => {
    const model = makeMvpModelFixture();
    const first = model.trajectory.hoverSnapshots[0];
    model.trajectory.hoverSnapshots.push({
      ...first,
      timestamp: 60,
      timeLabel: '1:00',
      you: {
        ...first.you,
        economic: 100,
        militaryActive: 200,
        total: 900,
      },
      opponent: {
        ...first.opponent,
        economic: 60,
        militaryActive: 140,
        total: 700,
      },
      delta: {
        ...first.delta,
        economic: 40,
        militaryActive: 60,
        total: 200,
      },
      gather: {
        you: 530,
        opponent: 470,
        delta: 60,
      },
      accounting: {
        you: {
          ...first.accounting!.you,
          economic: 100,
          militaryActive: 200,
          gathered: 1500,
          total: 900,
          float: 250,
        },
        opponent: {
          ...first.accounting!.opponent,
          economic: 60,
          militaryActive: 140,
          gathered: 1450,
          total: 700,
          float: 610,
        },
        delta: {
          ...first.accounting!.delta,
          economic: 40,
          militaryActive: 60,
          gathered: 50,
          total: 200,
          float: -360,
        },
      },
      adjustedMilitary: {
        ...first.adjustedMilitary,
        you: 220,
        opponent: 150,
        delta: 70,
      },
    });

    const examples = buildWinProbabilityExamples({
      summary: makeSummary(),
      model,
      perspectiveProfileId: 111,
      matchAverageElo: 972,
      lookbackSeconds: 60,
    });

    expect(examples).toHaveLength(4);

    const winnerAtOneMinute = examples.find(example =>
      example.timestampSeconds === 60 && example.perspective === 'you'
    );
    expect(winnerAtOneMinute).toMatchObject({
      gameId: 123456,
      timestampSeconds: 60,
      perspective: 'you',
      playerProfileId: 111,
      opponentProfileId: 222,
      label: { eventualWin: true },
      matchSkillBracket: { label: '900-999', source: 'average-lobby-elo' },
      featureSchemaVersion: 'wp-state-v1',
    });
    expect(winnerAtOneMinute?.features).toMatchObject({
      ownOverallValue: 900,
      opponentOverallValue: 700,
      deltaOverallValue: 200,
      ownEconomicShare: 11.1,
      ownTechnologyShare: 66.7,
      ownMilitaryShare: 22.2,
      ownGatherRate: 530,
      deltaGatherRate: 60,
      ownAdjustedMilitaryValue: 220,
      deltaAdjustedMilitaryValue: 70,
      ownOverallValueChange60s: 82,
      opponentOverallValueChange60s: 30,
      deltaOverallValueChange60s: 52,
    });

    const loserAtOneMinute = examples.find(example =>
      example.timestampSeconds === 60 && example.perspective === 'opponent'
    );
    expect(loserAtOneMinute).toMatchObject({
      playerProfileId: 222,
      opponentProfileId: 111,
      label: { eventualWin: false },
    });
    expect(loserAtOneMinute?.features).toMatchObject({
      ownOverallValue: 700,
      opponentOverallValue: 900,
      deltaOverallValue: -200,
      ownGatherRate: 470,
      deltaGatherRate: -60,
      deltaAdjustedMilitaryValue: -70,
      ownOverallValueChange60s: 30,
      opponentOverallValueChange60s: 82,
      deltaOverallValueChange60s: -52,
    });

    expect(winnerAtOneMinute?.cutoff).toEqual({
      stateCutoffSeconds: 60,
      usesFutureState: false,
      outcomeLabelUsesFinalResult: true,
      excludedFutureFields: [
        'finalPoolDelta',
        'finalDuration',
        'finalScore',
        'oneLineStory',
        'significantEvent.futureImpact',
      ],
    });
  });
});
