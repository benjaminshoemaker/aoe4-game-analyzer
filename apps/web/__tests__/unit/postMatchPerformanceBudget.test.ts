import {
  buildPostMatchHoverPayload,
  renderPostMatchHtml,
} from '../../src/lib/aoe4/formatters/postMatchHtml';
import {
  addVerboseOpportunityLostBuckets,
  makeMvpModelFixture,
  makeUnderproductionOnlyOpportunityLostModel,
} from '../helpers/mvpModelFixture';

function extractHoverPayload(html: string): any[] {
  const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!payloadMatch) throw new Error('Expected post-match hover data payload');
  return JSON.parse(payloadMatch[1]);
}

function formatBucketTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function makePayloadHeavyModel() {
  const model = structuredClone(makeMvpModelFixture());
  const baseSnapshot = model.trajectory.hoverSnapshots[0];
  const snapshotCount = 120;
  const entryCount = 40;

  model.trajectory.durationSeconds = (snapshotCount - 1) * 30;
  model.gatherRate.durationSeconds = model.trajectory.durationSeconds;
  model.trajectory.hoverSnapshots = Array.from({ length: snapshotCount }, (_, snapshotIndex) => {
    const timestamp = snapshotIndex * 30;
    const entries = Array.from({ length: entryCount }, (_, entryIndex) => {
      const start = entryIndex * 30;
      return {
        label: `${formatBucketTime(start)}-${formatBucketTime(start + 30)}`,
        value: entryIndex % 2 === 0 ? 1000 + entryIndex : 1000 - entryIndex,
        percent: 100 / entryCount,
        count: entryIndex + 1,
      };
    });

    return {
      ...baseSnapshot,
      timestamp,
      timeLabel: `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, '0')}`,
      bandBreakdown: {
        ...baseSnapshot.bandBreakdown,
        opportunityLost: {
          you: entries,
          opponent: entries,
        },
      },
    };
  });

  return model;
}

function makeSecondLevelHoverModel() {
  const model = structuredClone(makeMvpModelFixture());
  const baseSnapshot = model.trajectory.hoverSnapshots[0];
  const eventTimestamp = 37;
  const significantEvent: any = {
    id: 'significant-loss-opponent-dense',
    timestamp: eventTimestamp,
    windowStart: 30,
    windowEnd: 60,
    timeLabel: '0:37',
    victim: 'opponent',
    victimLabel: 'French',
    actorLabel: 'English',
    player1Label: 'English',
    player2Label: 'French',
    player1Civilization: 'English',
    player2Civilization: 'French',
    victimCivilization: 'French',
    actorCivilization: 'English',
    headline: 'French lost a key early fight.',
    kind: 'fight',
    label: 'Fight',
    shortLabel: 'Fight',
    description: 'French lost military value in the fight.',
    impactSummary: '240 gross impact.',
    grossImpact: 240,
    grossLoss: 240,
    immediateLoss: 240,
    villagerOpportunityLoss: 0,
    denominator: 670,
    pctOfDeployed: 35.8,
    villagerDeaths: 0,
    topLosses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
    preEncounterArmies: {
      player1: { totalValue: 1300, units: [] },
      player2: { totalValue: 640, units: [] },
    },
    favorableUnderdogFight: null,
    encounterLosses: {
      player1: [],
      player2: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
    },
    playerImpacts: {
      player1: {
        immediateLoss: 0,
        villagerOpportunityLoss: 0,
        grossLoss: 0,
        denominator: 818,
        pctOfDeployed: 0,
        villagerDeaths: 0,
        losses: [],
        topLosses: [],
      },
      player2: {
        immediateLoss: 240,
        villagerOpportunityLoss: 0,
        grossLoss: 240,
        denominator: 670,
        pctOfDeployed: 35.8,
        villagerDeaths: 0,
        losses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
        topLosses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
      },
    },
  };

  model.trajectory.durationSeconds = 180;
  model.gatherRate.durationSeconds = 180;
  model.trajectory.hoverSnapshots = Array.from({ length: 181 }, (_, timestamp) => ({
    ...baseSnapshot,
    timestamp,
    timeLabel: `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, '0')}`,
    markers: timestamp === eventTimestamp ? ['French lost a key early fight.'] : [],
    significantEvent: timestamp === eventTimestamp ? significantEvent : null,
  }));

  return model;
}

function makeEconomicRoleOverflowModel() {
  const model = structuredClone(makeMvpModelFixture());
  const snapshot = model.trajectory.hoverSnapshots[0];
  const visibleEntries = Array.from({ length: 12 }, (_, index) => ({
    label: `Visible Economic ${index + 1}`,
    value: 100 - index,
    percent: 5,
    count: 1,
    economicRole: index % 2 === 0
      ? 'resourceGenerator' as const
      : 'resourceInfrastructure' as const,
  }));
  const hiddenEntries = [
    { label: 'Hidden Generator 1', value: 10, percent: 2, count: 1, economicRole: 'resourceGenerator' as const },
    { label: 'Hidden Infrastructure 1', value: 9, percent: 2, count: 1, economicRole: 'resourceInfrastructure' as const },
    { label: 'Hidden Generator 2', value: 8, percent: 2, count: 1, economicRole: 'resourceGenerator' as const },
    { label: 'Hidden Infrastructure 2', value: 7, percent: 2, count: 1, economicRole: 'resourceInfrastructure' as const },
  ];

  snapshot.bandBreakdown.economic = {
    you: [...visibleEntries, ...hiddenEntries],
    opponent: [...visibleEntries, ...hiddenEntries],
  };

  return model;
}

describe('post-match Core Web Vitals budget', () => {
  it('ships only hover data used by the MVP allocation view', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());
    const payload = extractHoverPayload(html);

    expect(payload[0]).toEqual(expect.objectContaining({
      timestamp: 0,
      timeLabel: '0:00',
      allocation: expect.any(Object),
      strategy: expect.any(Object),
      gather: expect.any(Object),
      bandBreakdown: expect.any(Object),
    }));
    expect(payload[0]).not.toHaveProperty('adjustedMilitary');
    expect(payload[0]).not.toHaveProperty('villagerOpportunity');
    expect(payload[0]).not.toHaveProperty('accounting');
    expect(payload[0]).not.toHaveProperty('poolX');
    expect(payload[0]).not.toHaveProperty('gatherX');
    expect(payload[0]).not.toHaveProperty('villagerX');
  });

  it('does not ship CSS or interaction handlers for removed report widgets', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).not.toContain('function adjustedMatrixHtml');
    expect(html).not.toContain('setAdjustedField');
    expect(html).not.toContain('data-hover-line-pool');
    expect(html).not.toContain('data-hover-line-gather');
    expect(html).not.toContain('data-hover-line-villager');
    expect(html).not.toContain('.adjusted-matrix');
    expect(html).not.toContain('.villager-opportunity-chart');
    expect(html).not.toContain('.events-grid');
    expect(html).not.toContain('.secondary-panel');
    expect(html).not.toContain('.gather-chart');
    expect(html).not.toContain('.pool-chart');
  });

  it('inlines sampled hover data so interactions are ready without an external fetch gate', () => {
    const html = renderPostMatchHtml(makePayloadHeavyModel(), {
      hoverDataUrl: '/matches/my-slug/230143339/hover-data?sig=abc123',
    });
    const payload = extractHoverPayload(html);

    expect(html).not.toContain('id="post-match-hover-data-url"');
    expect(html).not.toContain('/matches/my-slug/230143339/hover-data?sig=abc123');
    expect(payload).toHaveLength(120);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(1024 * 1024);
    expect(Buffer.byteLength(html)).toBeLessThan(1536 * 1024);
  });

  it('samples dense hover data to thirty-second points plus significant events', () => {
    const payload = buildPostMatchHoverPayload(makeSecondLevelHoverModel());

    expect(payload.map(point => point.timestamp)).toEqual([
      0,
      30,
      37,
      60,
      90,
      120,
      150,
      180,
    ]);
    expect(payload.find(point => point.timestamp === 37)?.significantEvent).toEqual(expect.objectContaining({
      id: 'significant-loss-opponent-dense',
    }));
    expect(payload).toHaveLength(8);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(160 * 1024);
  });

  it('caps verbose band breakdowns and aggregates the remainder in the client hover payload', () => {
    const payload = buildPostMatchHoverPayload(makePayloadHeavyModel());
    const firstOpportunityBreakdown = payload[0].bandBreakdown.opportunityLost?.you ?? [];

    expect(firstOpportunityBreakdown).toHaveLength(13);
    expect(firstOpportunityBreakdown.at(-1)).toEqual(expect.objectContaining({
      label: 'Later opportunity-loss buckets (28)',
      count: 742,
    }));
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(2 * 1024 * 1024);
  });

  it('preserves economic roles when compacting hidden economic breakdown items', () => {
    const payload = buildPostMatchHoverPayload(makeEconomicRoleOverflowModel());
    const economicBreakdown = payload[0].bandBreakdown.economic?.you ?? [];

    expect(economicBreakdown).toHaveLength(14);
    expect(economicBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Other resource generation items (2)',
        value: 18,
        count: 2,
        economicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        label: 'Other resource infrastructure items (2)',
        value: 16,
        count: 2,
        economicRole: 'resourceInfrastructure',
      }),
    ]));
    expect(economicBreakdown).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Other active items (4)',
      }),
    ]));
  });

  it('keeps opportunity-lost buckets chronological when compacting the client hover payload', () => {
    const payload = buildPostMatchHoverPayload(addVerboseOpportunityLostBuckets(makeMvpModelFixture()));
    const yourBreakdown = payload[0].bandBreakdown.opportunityLost?.you ?? [];
    const opponentBreakdown = payload[0].bandBreakdown.opportunityLost?.opponent ?? [];

    expect(yourBreakdown.map(entry => entry.label).slice(0, 4)).toEqual([
      '0:00-0:30',
      '0:30-1:00',
      '1:00-1:30',
      '1:30-2:00',
    ]);
    expect(opponentBreakdown.map(entry => entry.label).slice(0, 4)).toEqual([
      '0:00-0:30',
      '0:30-1:00',
      '1:00-1:30',
      '1:30-2:00',
    ]);
    expect(yourBreakdown.at(-1)?.label).toBe('Later opportunity-loss buckets (2)');
    expect(opponentBreakdown.at(-1)?.label).toBe('Later opportunity-loss buckets (2)');
    expect(yourBreakdown.map(entry => entry.label)).not.toContain('Other active items (2)');
  });

  it('shows underproduction-only villager opportunity in the opportunity-lost summary, not bucket rows', () => {
    const payload = buildPostMatchHoverPayload(makeUnderproductionOnlyOpportunityLostModel());

    expect(payload[0].bandBreakdown.opportunityLost?.you).toEqual([]);
    expect(payload[0].opportunityLostComponents.underproduction).toEqual(expect.objectContaining({
      you: 1475,
      opponent: 0,
      delta: 1475,
    }));
    expect(payload[0].opportunityLostComponents.villagersLost).toEqual(expect.objectContaining({
      you: 0,
      opponent: 0,
      delta: 0,
    }));
    expect(payload[0].allocation.opportunityLost).toEqual(expect.objectContaining({
      you: 1475,
      opponent: 0,
      delta: 1475,
    }));
  });
});
