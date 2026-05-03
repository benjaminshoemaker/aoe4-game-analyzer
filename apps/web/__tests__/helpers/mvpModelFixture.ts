import { PostMatchViewModel } from '@aoe4/analyzer-core/analysis/postMatchViewModel';

function formatBucketTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function addVerboseOpportunityLostBuckets(model: PostMatchViewModel): PostMatchViewModel {
  const next = structuredClone(model);
  const values = [
    18, 450, 22, 390, 16, 520, 24, 330, 20, 610, 26, 270, 700, 14,
  ];
  const entries = values.map((value, index) => {
    const start = index * 30;
    const end = start + 30;
    return {
      label: `${formatBucketTime(start)}-${formatBucketTime(end)}`,
      value,
      percent: value / values.reduce((sum, current) => sum + current, 0) * 100,
      count: index + 1,
      category: 'villagers-lost',
    };
  });

  next.trajectory.hoverSnapshots[0].bandBreakdown.opportunityLost = {
    you: entries,
    opponent: entries.map((entry, index) => ({
      ...entry,
      value: values[values.length - 1 - index],
      count: index + 1,
    })),
  };

  return next;
}

export function makeUnderproductionOnlyOpportunityLostModel(): PostMatchViewModel {
  const model = makeMvpModelFixture();
  const snapshot = model.trajectory.hoverSnapshots[0];

  snapshot.villagerOpportunity.you.cumulativeLoss = 1475;
  snapshot.villagerOpportunity.you.cumulativeResourcesPossible =
    snapshot.villagerOpportunity.you.cumulativeResourcesGained + 1475;
  snapshot.villagerOpportunity.opponent.cumulativeLoss = 0;
  snapshot.villagerOpportunity.opponent.cumulativeResourcesPossible =
    snapshot.villagerOpportunity.opponent.cumulativeResourcesGained;
  snapshot.bandBreakdown.opportunityLost = { you: [], opponent: [] };
  snapshot.villagerOpportunity.you.cumulativeUnderproductionLoss = 1475;
  snapshot.villagerOpportunity.you.cumulativeDeathLoss = 0;
  snapshot.villagerOpportunity.opponent.cumulativeUnderproductionLoss = 0;
  snapshot.villagerOpportunity.opponent.cumulativeDeathLoss = 0;
  model.villagerOpportunity.resourceSeries.you[0].cumulativeLoss = 1475;
  model.villagerOpportunity.resourceSeries.you[0].cumulativeResourcesPossible =
    model.villagerOpportunity.resourceSeries.you[0].cumulativeResourcesGained + 1475;
  model.villagerOpportunity.resourceSeries.you[0].cumulativeUnderproductionLoss = 1475;
  model.villagerOpportunity.resourceSeries.you[0].cumulativeDeathLoss = 0;
  model.villagerOpportunity.resourceSeries.opponent[0].cumulativeLoss = 0;
  model.villagerOpportunity.resourceSeries.opponent[0].cumulativeResourcesPossible =
    model.villagerOpportunity.resourceSeries.opponent[0].cumulativeResourcesGained;
  model.villagerOpportunity.resourceSeries.opponent[0].cumulativeUnderproductionLoss = 0;
  model.villagerOpportunity.resourceSeries.opponent[0].cumulativeDeathLoss = 0;

  return model;
}

export function makeMvpModelFixture(): PostMatchViewModel {
  return {
    header: {
      mode: 'Ranked 1v1',
      durationLabel: '10:00',
      map: 'Dry Arabia',
      summaryUrl: 'https://aoe4world.com/players/111/games/123456?sig=testsig',
      youCivilization: 'English',
      opponentCivilization: 'French',
      youPlayer: {
        name: 'RepleteCactus',
        civilization: 'English',
        label: 'RepleteCactus · English',
        shortLabel: 'RepleteCactus',
        compactLabel: 'English',
        compactShortLabel: 'English',
        ageLabel: 'RepleteCactus · English',
        ageShortLabel: 'RepleteCactus',
        color: '#378ADD',
      },
      opponentPlayer: {
        name: 'Mista',
        civilization: 'French',
        label: 'Mista · French',
        shortLabel: 'Mista',
        compactLabel: 'French',
        compactShortLabel: 'French',
        ageLabel: 'Mista · French',
        ageShortLabel: 'Mista',
        color: '#D85A30',
      },
      player1: {
        name: 'RepleteCactus',
        civilization: 'English',
        label: 'RepleteCactus · English',
        shortLabel: 'RepleteCactus',
        compactLabel: 'English',
        compactShortLabel: 'English',
        ageLabel: 'RepleteCactus · English',
        ageShortLabel: 'RepleteCactus',
        color: '#378ADD',
      },
      player2: {
        name: 'Mista',
        civilization: 'French',
        label: 'Mista · French',
        shortLabel: 'Mista',
        compactLabel: 'French',
        compactShortLabel: 'French',
        ageLabel: 'Mista · French',
        ageShortLabel: 'Mista',
        color: '#D85A30',
      },
      outcome: 'Defeated 10:00',
    },
    deferredBanner: null,
    metricCards: {
      finalPoolDelta: 148,
      ageAnalyses: [
        {
          age: 'Dark',
          startTime: 0,
          endTime: 120,
          timeRangeLabel: '0:00-2:00',
          gapSummary: 'Gap widened: Tied -> English +148.',
          allocationSummary: 'Allocation: English led by Technology +100; Military was similar.',
          destructionSummary: 'Destruction: neither player destroyed measurable value.',
          conversionSummary: 'Meaning: No major conversion signal inside this shared window.',
          summary: 'Gap widened: Tied -> English +148. Allocation: English led by Technology +100; Military was similar. Destruction: neither player destroyed measurable value. Meaning: No major conversion signal inside this shared window.',
        },
        {
          age: 'Feudal',
          startTime: 120,
          endTime: 420,
          timeRangeLabel: '2:00-7:00',
          gapSummary: 'Gap held: English +148 -> English +148.',
          allocationSummary: 'Allocation: no major allocation edge; Economy was similar.',
          destructionSummary: 'Destruction: neither player destroyed measurable value.',
          conversionSummary: 'Meaning: No major conversion signal inside this shared window.',
          summary: 'Gap held: English +148 -> English +148. Allocation: no major allocation edge; Economy was similar. Destruction: neither player destroyed measurable value. Meaning: No major conversion signal inside this shared window.',
        },
        {
          age: 'Castle',
          startTime: 420,
          endTime: 600,
          timeRangeLabel: '7:00-10:00',
          gapSummary: 'Gap held: English +148 -> English +148.',
          allocationSummary: 'Allocation: no major allocation edge; Economy was similar.',
          destructionSummary: 'Destruction: neither player destroyed measurable value.',
          conversionSummary: 'Meaning: No major conversion signal inside this shared window.',
          summary: 'Gap held: English +148 -> English +148. Allocation: no major allocation edge; Economy was similar. Destruction: neither player destroyed measurable value. Meaning: No major conversion signal inside this shared window.',
        },
        {
          age: 'Imperial',
          startTime: null,
          endTime: null,
          timeRangeLabel: 'No shared window',
          gapSummary: 'Only English reached Imperial, so there was no shared Imperial window to compare.',
          allocationSummary: 'Allocation: no shared window.',
          destructionSummary: 'Destruction: no shared window.',
          conversionSummary: 'Meaning: no shared window.',
          summary: 'Only English reached Imperial, so there was no shared Imperial window to compare.',
        },
      ],
      castleAgeDeltaSeconds: 30,
      yourBet: {
        label: 'balanced',
        subtitlePercent: 34,
        economicPercent: 31,
        militaryPercent: 34,
      },
      opponentBet: {
        label: 'balanced',
        subtitlePercent: 35,
        economicPercent: 30,
        militaryPercent: 35,
      },
    },
    trajectory: {
      durationSeconds: 600,
      yAxisMax: 1000,
      youSeries: [{
        timestamp: 0,
        economic: 50,
        populationCap: 0,
        militaryCapacity: 0,
        militaryActive: 168,
        defensive: 0,
        research: 100,
        advancement: 500,
        total: 818,
      }],
      opponentSeries: [{
        timestamp: 0,
        economic: 50,
        populationCap: 0,
        militaryCapacity: 0,
        militaryActive: 120,
        defensive: 0,
        research: 100,
        advancement: 400,
        total: 670,
      }],
      adjustedMilitarySeries: [{
        timestamp: 0,
        you: 202,
        opponent: 132,
        delta: 70,
        youRawMilitaryActive: 168,
        opponentRawMilitaryActive: 120,
        youCounterAdjustedMilitaryActive: 183.27,
        opponentCounterAdjustedMilitaryActive: 125.71,
        youUpgradeMultiplier: 1.1,
        opponentUpgradeMultiplier: 1.05,
        youUnitBreakdown: [],
        opponentUnitBreakdown: [],
      }],
      youBandItemDeltas: [{
        timestamp: 0,
        band: 'economic',
        itemKey: 'unit:villager',
        itemLabel: 'Villager',
        deltaValue: 50,
        deltaCount: 1,
      }],
      opponentBandItemDeltas: [],
      hoverSnapshots: [{
        timestamp: 0,
        timeLabel: '0:00',
        markers: [],
        you: {
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 168,
          defensive: 0,
          research: 100,
          advancement: 500,
          total: 818,
        },
        opponent: {
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 120,
          defensive: 0,
          research: 100,
          advancement: 400,
          total: 670,
        },
        delta: {
          economic: 0,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 48,
          defensive: 0,
          research: 0,
          advancement: 100,
          total: 148,
        },
        gather: {
          you: 500,
          opponent: 480,
          delta: 20,
        },
        villagerOpportunity: {
          you: {
            timestamp: 0,
            cumulativeLoss: 90,
            cumulativeResourcesGained: 1000,
            cumulativeResourcesPossible: 1090,
          },
          opponent: {
            timestamp: 0,
            cumulativeLoss: 140,
            cumulativeResourcesGained: 900,
            cumulativeResourcesPossible: 1040,
          },
        },
        adjustedMilitary: {
          you: 202,
          opponent: 132,
          delta: 70,
          youRaw: 168,
          opponentRaw: 120,
          youCounterAdjusted: 183.27,
          opponentCounterAdjusted: 125.71,
          youCounterMultiplier: 1.091,
          opponentCounterMultiplier: 1.048,
          youUpgradeMultiplier: 1.1,
          opponentUpgradeMultiplier: 1.05,
          youPct: 20,
          opponentPct: 10,
          youUnitBreakdown: [],
          opponentUnitBreakdown: [],
        },
        bandBreakdown: {
          economic: {
            you: [
              { label: 'Villager', value: 30, percent: 60, count: 1, economicRole: 'resourceGenerator' },
              { label: 'Farm', value: 20, percent: 40, count: 1, economicRole: 'resourceInfrastructure' },
            ],
            opponent: [
              { label: 'Villager', value: 35, percent: 70, count: 1, economicRole: 'resourceGenerator' },
              { label: 'Farm', value: 15, percent: 30, count: 1, economicRole: 'resourceInfrastructure' },
            ],
          },
          populationCap: { you: [], opponent: [] },
          militaryCapacity: { you: [], opponent: [] },
          militaryActive: { you: [], opponent: [] },
          defensive: { you: [], opponent: [] },
          research: { you: [], opponent: [] },
          advancement: { you: [], opponent: [] },
          float: {
            you: [
              { label: 'Food', value: 120, percent: 24, category: 'resource-stockpile' },
              { label: 'Wood', value: 180, percent: 36, category: 'resource-stockpile' },
              { label: 'Gold', value: 200, percent: 40, category: 'resource-stockpile' },
            ],
            opponent: [
              { label: 'Food', value: 600, percent: 60, category: 'resource-stockpile' },
              { label: 'Wood', value: 400, percent: 40, category: 'resource-stockpile' },
            ],
          },
          opportunityLost: {
            you: [{ label: '0:00-0:30', value: 90, percent: 100, count: 1 }],
            opponent: [{ label: '0:00-0:30', value: 140, percent: 100, count: 2 }],
          },
        },
        accounting: {
          you: {
            economic: 50,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 168,
            defensive: 0,
            research: 100,
            advancement: 500,
            destroyed: 0,
            float: 500,
            gathered: 1318,
            total: 818,
          },
          opponent: {
            economic: 50,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 120,
            defensive: 0,
            research: 100,
            advancement: 400,
            destroyed: 0,
            float: 1000,
            gathered: 1670,
            total: 670,
          },
          delta: {
            economic: 0,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 48,
            defensive: 0,
            research: 0,
            advancement: 100,
            destroyed: 0,
            float: -500,
            gathered: -352,
            total: 148,
          },
        },
      }],
      ageMarkers: [],
    },
    gatherRate: {
      durationSeconds: 600,
      youSeries: [{ timestamp: 0, ratePerMin: 500 }],
      opponentSeries: [{ timestamp: 0, ratePerMin: 480 }],
    },
    villagerOpportunity: {
      targetVillagers: 120,
      resourceSeries: {
        you: [{
          timestamp: 0,
          cumulativeLoss: 90,
          cumulativeResourcesGained: 1000,
          cumulativeResourcesPossible: 1090,
        }],
        opponent: [{
          timestamp: 0,
          cumulativeLoss: 140,
          cumulativeResourcesGained: 900,
          cumulativeResourcesPossible: 1040,
        }],
      },
      context: {
        you: {
          totalResourcesGathered: 1000,
          totalPossibleResources: 1250,
          cumulativeLoss: 250,
          lossShareOfPossible: 0.2,
          damageDealtToOpponent: 120,
          damageDealtToOpponentPossible: 960,
          damageDealtToOpponentShare: 0.125,
          netEcoSwing: -130,
        },
        opponent: {
          totalResourcesGathered: 900,
          totalPossibleResources: 1080,
          cumulativeLoss: 180,
          lossShareOfPossible: 1 / 6,
          damageDealtToOpponent: 60,
          damageDealtToOpponentPossible: 1060,
          damageDealtToOpponentShare: 60 / 1060,
          netEcoSwing: -120,
        },
      },
      you: {
        baselineRateRpm: 40,
        targetVillagers: 120,
        upgradeEvents: [],
        series: [{
          timestamp: 0,
          expectedVillagerRateRpm: 40,
          expectedVillagers: 0,
          producedVillagers: 10,
          aliveVillagers: 9,
          underproductionDeficit: 0,
          deathDeficit: 0,
          totalDeficit: 0,
          underproductionLossPerMin: 0,
          deathLossPerMin: 0,
          totalLossPerMin: 0,
          cumulativeUnderproductionLoss: 0,
          cumulativeDeathLoss: 0,
          cumulativeTotalLoss: 0,
        }],
      },
      opponent: {
        baselineRateRpm: 40,
        targetVillagers: 120,
        upgradeEvents: [],
        series: [{
          timestamp: 0,
          expectedVillagerRateRpm: 40,
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
        }],
      },
    },
    events: [{
      id: 'timing-1',
      timestamp: 100,
      phase: 'Feudal',
      category: 'Timing',
      description: 'Example',
      score: 1,
      magnitude: 1,
    }],
    oneLineStory: 'Example story',
  };
}

export function makeSwappedPerspectiveColorModel(): PostMatchViewModel {
  const model = structuredClone(makeMvpModelFixture());
  const you = {
    ...model.header.youPlayer,
    name: 'RepleteCactus',
    civilization: 'Ottomans',
    label: 'RepleteCactus · Ottomans',
    compactLabel: 'Ottomans',
    compactShortLabel: 'Ottomans',
    ageLabel: 'RepleteCactus · Ottomans',
    color: '#D85A30',
  };
  const opponent = {
    ...model.header.opponentPlayer,
    name: 'sohaijim2022',
    civilization: 'Golden Horde',
    label: 'sohaijim2022 · Golden Horde',
    shortLabel: 'sohaijim2022',
    compactLabel: 'Golden Horde',
    compactShortLabel: 'Golden Horde',
    ageLabel: 'sohaijim2022 · Golden Horde',
    ageShortLabel: 'sohaijim2022',
    color: '#378ADD',
  };

  model.header.youCivilization = 'Ottomans';
  model.header.opponentCivilization = 'Golden Horde';
  model.header.youPlayer = you;
  model.header.opponentPlayer = opponent;
  model.header.player1 = opponent;
  model.header.player2 = you;
  model.trajectory.ageMarkers = [
    {
      player: 'you',
      age: 'Feudal',
      timestamp: 60,
      label: 'RepleteCactus · Ottomans Feudal 1:00',
      shortLabel: 'RepleteCactus Feudal',
      timeLabel: '1:00',
    },
    {
      player: 'opponent',
      age: 'Feudal',
      timestamp: 120,
      label: 'sohaijim2022 · Golden Horde Feudal 2:00',
      shortLabel: 'sohaijim2022 Feudal',
      timeLabel: '2:00',
    },
  ];

  return model;
}
