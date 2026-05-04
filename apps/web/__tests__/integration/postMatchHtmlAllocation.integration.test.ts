import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import {
  addVerboseOpportunityLostBuckets,
  makeMvpModelFixture,
  makePointInTimeOpportunityLostModel,
  makeSwappedPerspectiveColorModel,
  makeUnderproductionOnlyOpportunityLostModel,
} from '../helpers/mvpModelFixture';

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
}

function extractAllocationLane(html: string, key: string): string {
  const match = html.match(new RegExp(`<g class="allocation-lane allocation-lane-${key}">[\\s\\S]*?</g>`));
  if (!match) throw new Error(`Expected allocation lane ${key}`);
  return match[0];
}

function extractInspectorTable(html: string): string {
  const match = html.match(/<table class="inspector-table">[\s\S]*?<\/table>/);
  if (!match) throw new Error('Expected inspector table');
  return match[0];
}

function extractHoverPayload(html: string): any[] {
  const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!payloadMatch) throw new Error('Expected post-match hover data payload');
  return JSON.parse(payloadMatch[1]);
}

function makeDenseInteractionModel() {
  const model = structuredClone(makeMvpModelFixture());
  const baseSnapshot = model.trajectory.hoverSnapshots[0];
  model.trajectory.durationSeconds = 120;
  model.gatherRate.durationSeconds = 120;
  model.trajectory.hoverSnapshots = Array.from({ length: 121 }, (_, timestamp) => ({
    ...baseSnapshot,
    timestamp,
    timeLabel: `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, '0')}`,
    markers: timestamp === 47 ? ['English reached Feudal'] : [],
  }));
  return model;
}

describe('post-match allocation widget integration', () => {
  it('renders the combined allocation widget and embeds allocation hover data', () => {
    const model = makeMvpModelFixture();
    const significantEvent = {
      id: 'significant-loss-opponent-0',
      timestamp: 0,
      windowStart: 0,
      windowEnd: 60,
      timeLabel: '0:00',
      victim: 'opponent',
      victimLabel: 'French',
      player1Civilization: 'English',
      player2Civilization: 'French',
      victimCivilization: 'French',
      actorCivilization: 'English',
      headline: 'French took a favorable fight against English, despite significantly fewer deployed military resources.',
      kind: 'fight',
      label: 'Fight',
      shortLabel: 'Fight',
      description: 'French lost more military value in the fight.',
      impactSummary: '400 gross impact.',
      grossImpact: 400,
      grossLoss: 240,
      immediateLoss: 240,
      villagerOpportunityLoss: 0,
      denominator: 670,
      pctOfDeployed: 35.8,
      villagerDeaths: 0,
      topLosses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
      preEncounterArmies: {
        player1: {
          totalValue: 1300,
          units: [
            { label: 'Longbowman', value: 960, count: 12, band: 'militaryActive' },
            { label: 'Spearman', value: 340, count: 4, band: 'militaryActive' },
          ],
        },
        player2: {
          totalValue: 640,
          units: [
            { label: 'Knight', value: 480, count: 2, band: 'militaryActive' },
            { label: 'Archer', value: 160, count: 2, band: 'militaryActive' },
          ],
        },
      },
      favorableUnderdogFight: {
        details: 'French won this encounter despite having significantly fewer deployed military resources than English. That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where French found an advantage, healing, stronger micro, or a favorable unit matchup.',
      },
      encounterLosses: {
        player1: [{ label: 'Spearman', value: 160, count: 2, band: 'militaryActive' }],
        player2: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
      },
      playerImpacts: {
        player1: {
          immediateLoss: 160,
          villagerOpportunityLoss: 0,
          grossLoss: 160,
          denominator: 818,
          pctOfDeployed: 19.6,
          villagerDeaths: 0,
          losses: [{ label: 'Spearman', value: 160, count: 2, band: 'militaryActive' }],
          topLosses: [{ label: 'Spearman', value: 160, count: 2, band: 'militaryActive' }],
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
    } as const;
    (model.trajectory as any).significantEvents = [significantEvent];
    (model.trajectory.hoverSnapshots[0] as any).significantEvent = significantEvent;

    const html = renderPostMatchHtml(model);

    expect(html).toContain('Resource state over time');
    expect(html).toContain('<a class="recap-link feedback-link" href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noreferrer noopener">Feedback? DM me on Reddit</a>');
    expect(html).not.toContain('<section class="panel metrics">');
    expect(html).not.toContain('Dark age');
    expect(html).not.toContain('Final pool delta');
    expect(html).not.toContain('Only English reached Imperial, so there was no shared Imperial window to compare.');
    expect(html).toContain('<details class="allocation-read-guide" aria-label="Allocation chart legend">');
    expect(html).toContain('<summary class="allocation-read-guide-summary">How to read this chart</summary>');
    expect(html).toContain('<p class="section-note allocation-section-note">');
    expect(html).toContain('.allocation-section-note {\n      max-width: none;\n      width: 100%;\n    }');
    expect(html).toContain('class="mobile-timeline-control"');
    expect(html).toContain('type="range"');
    expect(html).toContain('data-mobile-timeline-slider');
    expect(html).toContain('data-mobile-timeline-step="-1"');
    expect(html).toContain('data-mobile-timeline-step="1"');
    expect(html).toContain('data-mobile-summary="overall"');
    expect(html).toContain('data-mobile-details');
    expect(html).toContain('data-mobile-current-time');
    expect(html).not.toContain('Click to pin');
    expect(html).not.toContain('Esc to clear');
    expect(html).toContain("This chart shows how each player's resources became game state.");
    expect(html).toContain('Leader strip: who has the larger current tracked deployed pool in each 30-second block');
    expect(html).toContain("Economic, Technology, and Military: shares of each player's current net pool, not gross spending totals");
    expect(html).toContain('Overall: total current tracked deployed value across modeled categories after destroyed value is removed');
    expect(html).toContain('Destroyed: cumulative tracked value removed by the opponent. This is where raids and fights show lasting damage');
    expect(html).toContain('Float: resources in the bank that have not become useful game state yet');
    expect(html).toContain('Opportunity lost: resources missing because of villager deaths or villager underproduction');
    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="economic"');
    expect(leaderStrip).toContain('data-category-key="technology"');
    expect(leaderStrip).toContain('data-category-key="military"');
    expect(leaderStrip).not.toContain('data-category-key="destroyed"');
    expect(leaderStrip).not.toContain('data-category-key="overall"');
    expect(leaderStrip).not.toContain('data-category-key="float"');
    expect(leaderStrip).not.toContain('data-category-key="opportunityLost"');
    expect(leaderStrip).toContain('viewBox="0 0 980 126"');
    expect(leaderStrip).toContain('data-time-axis="allocation-leader"');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr) clamp(var(--inspector-min-width), 32vw, var(--inspector-max-width));');
    expect(html).toContain('.chart-stack { overflow-x: hidden; }');
    expect(html).toContain('.mobile-timeline-button');
    expect(html).toContain('.band-toggle,\n    .allocation-category-toggle,\n    .band-sub-link {\n      min-height: 36px;');
    expect(html).toContain('.band-toggle:hover,\n    .allocation-category-toggle:hover,\n    .band-sub-link:hover {');
    expect(html).toContain('data-band-breakdown-summary');
    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));');
    expect(html).toContain('.band-summary-label {\n      grid-column: 1 / -1;');
    expect(html).toContain('.band-breakdown-summary > span:not(.band-summary-label) {\n      min-width: 0;');
    expect(html).toContain('data-significant-event-armies');
    expect(html).not.toContain('data-significant-event-underdog-note');
    expect(html).toContain('data-significant-event-underdog-toggle');
    expect(html).toContain('data-significant-event-underdog-details');
    expect(html).toContain('French took a favorable fight against English, despite significantly fewer deployed military resources.');
    expect(html).toContain('Why this fight is notable');
    expect(html).toContain('French won this encounter despite having significantly fewer deployed military resources than English.');
    expect(html).toContain('Pre-encounter armies');
    expect(html.indexOf('Pre-encounter armies')).toBeLessThan(html.indexOf('Encounter losses'));
    expect(html.indexOf('Why this fight is notable')).toBeGreaterThan(html.indexOf('Encounter losses'));
    expect(html).toContain('data-significant-event-army-total="player1">1,300</dd>');
    expect(html).toContain('data-significant-event-army-total="player2">640</dd>');
    expect(html).toContain('data-significant-event-loss-summary="player2"');
    expect(html).toContain('data-significant-event-loss-total="player2">240</dd>');
    expect(html).toContain('data-significant-event-loss-immediate="player2">240</dd>');
    expect(html).toContain('data-significant-event-loss-share-label="player2">Share of French deployed</dt>');
    expect(html).not.toContain('<dt>Share of deployed</dt>');
    expect(html).not.toContain('data-hover-field="significantEvent.description"');
    expect(html).not.toContain('data-hover-field="significantEvent.grossLoss"');
    expect(html).not.toContain('data-hover-field="significantEvent.topLosses"');
    expect(html).toContain('data-band-summary-delta');
    expect(html).toContain('data-hover-field="allocationCategory.economic.net.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.delta"');
    expect(html).toContain('data-economic-role-filter="resourceGenerator"');
    expect(html).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(html).toContain('data-allocation-investment-category="economic"');
    expect(html).toContain('data-band-key="militaryInvestment"');
    expect(html).toContain('Total Economic Investment');
    expect(html).toContain('Total Military Investment');
    expect(html).toContain("selectedEconomicRoleFilter = key === 'economic'");
    expect(html).toContain('function combinedInvestmentBreakdown(point, category)');
    expect(html).toContain('function syncDestroyedRowVisibility(point)');
    expect(html).toContain('data-destroyed-row-category="economic" data-destroyed-row-empty="true" hidden');
    expect(html).toContain('Advancement destroyed');
    expect(html).not.toContain('Technology destroyed');
    expect(html).toContain("(entry.economicRole || 'resourceInfrastructure') === selectedEconomicRoleFilter");
    expect(html).toContain('data-hover-field="allocationCategory.other.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.destroyed.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.investment.delta"');
    expect(html).toContain('data-hover-field="allocation.float.delta"');
    expect(html).toContain('data-hover-field="allocation.opportunityLost.delta"');
    expect(extractInspectorTable(html)).not.toContain('class="legend-dot');
    expect(html).not.toContain('data-inspector-row="destroyed"');
    expect(html).not.toContain('data-band-key="destroyed"');
    expect(html).toContain('data-allocation-category-accounting="economic-resource-generation"');
    expect(html).toContain('data-allocation-category-accounting="economic-resource-infrastructure"');
    expect(html).toContain('data-allocation-category-accounting="military-destroyed"');
    expect(html).toContain('data-allocation-category-accounting="military-investment"');
    expect(html).toContain('data-band-key="militaryDestroyed"');
    expect(html).toContain('data-inspector-row="float"');
    expect(html).toContain('data-band-key="float"');
    expect(html).toContain('data-inspector-row="opportunityLost"');
    expect(html).toContain('data-band-key="opportunityLost"');
    const otherRowIndex = html.indexOf('data-allocation-category-row="other"');
    const otherDestroyedRowIndex = html.indexOf('data-allocation-category-accounting="other-destroyed"');
    const otherInvestmentRowIndex = html.indexOf('data-allocation-category-accounting="other-investment"');
    const totalPoolIndex = html.indexOf('data-total-pool-tooltip');
    const floatRowIndex = html.indexOf('data-inspector-row="float"');
    const opportunityLostRowIndex = html.indexOf('data-inspector-row="opportunityLost"');
    const gatherRowIndex = html.indexOf('<th>Gather/min</th>');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(otherDestroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(otherInvestmentRowIndex).toBeGreaterThan(otherDestroyedRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(otherInvestmentRowIndex);
    expect(floatRowIndex).toBeGreaterThan(totalPoolIndex);
    expect(opportunityLostRowIndex).toBeGreaterThan(floatRowIndex);
    expect(gatherRowIndex).toBeGreaterThan(opportunityLostRowIndex);
    expect(html).toContain('data-allocation-category-toggle="military" aria-expanded="false"');
    expect(html).toContain('Total net pool');
    expect(html).not.toContain('Overall resources');
    expect(html).not.toContain('Deployed resource pool over time');
    expect(html).not.toContain('Strategic allocation state');

    const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
    expect(payloadMatch).not.toBeNull();
    const payload = JSON.parse(payloadMatch?.[1] ?? '[]');

    expect(payload[0].allocation).toEqual(expect.objectContaining({
      economic: expect.objectContaining({ you: 50, opponent: 50, delta: 0 }),
      technology: expect.objectContaining({ you: 600, opponent: 500, delta: 100 }),
      military: expect.objectContaining({ you: 168, opponent: 120, delta: 48 }),
      destroyed: expect.objectContaining({ you: 0, opponent: 0, delta: 0 }),
      overall: expect.objectContaining({ you: 818, opponent: 670, delta: 148 }),
      float: expect.objectContaining({ you: 500, opponent: 1000, delta: -500 }),
      opportunityLost: expect.objectContaining({ you: 90, opponent: 140, delta: -50 }),
    }));
    expect(payload[0].allocationCategory).toEqual(expect.objectContaining({
      military: expect.objectContaining({
        net: expect.objectContaining({ you: 168, opponent: 120, delta: 48 }),
        destroyed: expect.objectContaining({ you: 0, opponent: 0, delta: 0 }),
        investment: expect.objectContaining({ you: 168, opponent: 120, delta: 48 }),
      }),
      economic: expect.objectContaining({
        resourceGeneration: expect.objectContaining({ you: 30, opponent: 35, delta: -5 }),
        resourceInfrastructure: expect.objectContaining({ you: 20, opponent: 15, delta: 5 }),
      }),
    }));
    expect(payload[0].bandBreakdown.opportunityLost.opponent).toEqual([
      expect.objectContaining({ label: '0:00-0:30', value: 140, count: 2 }),
    ]);
    expect(payload[0].bandBreakdown.float.opponent).toEqual([
      expect.objectContaining({ label: 'Food', value: 600, percent: 60 }),
      expect.objectContaining({ label: 'Wood', value: 400, percent: 40 }),
    ]);
    expect(payload[0].significantEvent.preEncounterArmies.player2).toEqual({
      totalValue: 640,
      units: [
        expect.objectContaining({ label: 'Knight', value: 480, count: 2 }),
        expect.objectContaining({ label: 'Archer', value: 160, count: 2 }),
      ],
    });
    expect(payload[0].significantEvent.preEncounterArmies.player1).toEqual({
      totalValue: 1300,
      units: [
        expect.objectContaining({ label: 'Longbowman', value: 960, count: 12 }),
        expect.objectContaining({ label: 'Spearman', value: 340, count: 4 }),
      ],
    });
    expect(payload[0].significantEvent.favorableUnderdogFight).toEqual({
      details: 'French won this encounter despite having significantly fewer deployed military resources than English. That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where French found an advantage, healing, stronger micro, or a favorable unit matchup.',
    });
  });

  it('renders dense source data as coarse interaction targets without a blocking hover fetch', () => {
    const html = renderPostMatchHtml(makeDenseInteractionModel());
    const payload = extractHoverPayload(html);

    expect(payload.map(point => point.timestamp)).toEqual([0, 30, 47, 60, 90, 120]);
    expect(html).toContain('<link rel="icon" href="data:image/svg+xml');
    expect(html).not.toContain('id="post-match-hover-data-url"');
    expect(html).not.toContain('/matches/my-slug/230143339/hover-data?sig=abc123');
    expect(html).not.toContain('payloadSourceUrl');
    expect(html).not.toContain('fetch(payloadSourceUrl');
    expect(html).not.toContain('/favicon.ico');
    expect(html).not.toContain('data-hover-timestamp="1"');
    expect(html).toContain('data-hover-timestamp="30"');
    expect(html).toContain('data-hover-timestamp="47"');
  });

  it('embeds opportunity-lost bucket composition by time within each civilization', () => {
    const html = renderPostMatchHtml(addVerboseOpportunityLostBuckets(makeMvpModelFixture()));
    const payload = extractHoverPayload(html);
    const youLabels = payload[0].bandBreakdown.opportunityLost.you.map((entry: { label: string }) => entry.label);
    const opponentLabels = payload[0].bandBreakdown.opportunityLost.opponent.map((entry: { label: string }) => entry.label);

    expect(youLabels.slice(0, 4)).toEqual(['0:00-0:30', '0:30-1:00', '1:00-1:30', '1:30-2:00']);
    expect(opponentLabels.slice(0, 4)).toEqual(['0:00-0:30', '0:30-1:00', '1:00-1:30', '1:30-2:00']);
    expect(youLabels.at(-1)).toBe('Later opportunity-loss buckets (6)');
    expect(opponentLabels.at(-1)).toBe('Later opportunity-loss buckets (6)');
    expect(youLabels).not.toContain('Other active items (2)');
  });

  it('renders player-2 perspective allocation visuals with matching legend, leader strip, and paths', () => {
    const html = renderPostMatchHtml(makeSwappedPerspectiveColorModel());

    expect(html).toContain('--aoe-color-report-bg: #f2f4ee;');
    expect(html).toContain('--color-background: var(--aoe-color-report-bg);');
    expect(html).toContain('--color-card: var(--aoe-color-report-surface);');
    expect(html).toContain('--color-muted: var(--aoe-color-report-muted);');
    expect(html).toContain('--color-border: var(--aoe-color-report-border);');
    expect(html).toContain('--you: #D85A30;');
    expect(html).toContain('--opponent: #378ADD;');
    expect(html).toContain('font-family: var(--aoe-font-report);');
    expect(html).toContain('border-radius: var(--aoe-radius-lg);');
    expect(html).toContain('border-radius: var(--aoe-radius-md);');
    expect(html).toContain('box-shadow: var(--aoe-shadow-panel);');
    expect(html).not.toContain('--color-background: #f2f4ee;');

    expect(html).toContain('<span class="age-line" style="border-color:#D85A30"></span>RepleteCactus · Ottomans age-up');
    expect(html).toContain('<span class="age-line dashed" style="border-color:#378ADD"></span>sohaijim2022 · Golden Horde age-up');

    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toMatch(/data-category-key="technology" data-leader="you"[^>]*fill="#D85A30"/);

    const economicLane = extractAllocationLane(html, 'economic');
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#D85A30" stroke-width="2\.4" stroke-linejoin="round" stroke-linecap="round" \/>/);
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#378ADD" stroke-width="2\.4" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" \/>/);

    const allocationSvg = extractSvg(html, 'allocation-comparison');
    expect(allocationSvg).toMatch(/data-age-marker="RepleteCactus · Ottomans Feudal 1:00"[\s\S]*?stroke="#D85A30"[\s\S]*?<\/g>/);
    expect(allocationSvg).toMatch(/data-age-marker="sohaijim2022 · Golden Horde Feudal 2:00"[\s\S]*?stroke="#378ADD"[\s\S]*?stroke-dasharray="7 5"[\s\S]*?<\/g>/);
  });

  it('keeps opportunity-lost underproduction in the summary instead of the bucket list', () => {
    const html = renderPostMatchHtml(makeUnderproductionOnlyOpportunityLostModel());
    const payload = extractHoverPayload(html);

    expect(payload[0].bandBreakdown.opportunityLost.you).toEqual([]);
    expect(payload[0].opportunityLostComponents.underproduction).toEqual(expect.objectContaining({
      you: 1475,
      opponent: 0,
      delta: 1475,
    }));
    expect(payload[0].opportunityLostComponents.low_underproduction).toEqual(expect.objectContaining({
      you: 2213,
      opponent: 0,
      delta: 2213,
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
    expect(html).toContain('data-opportunity-lost-components');
    expect(html).toContain('<table class="opportunity-lost-components" data-opportunity-lost-components aria-label="Opportunity lost components by civilization" style="--opportunity-you-color:#378ADD;--opportunity-opponent-color:#D85A30" hidden>');
    expect(html).toContain('aria-label="Opportunity lost components by civilization"');
    expect(html).toContain('<th scope="col">English</th>');
    expect(html).toContain('<th scope="col">French</th>');
    expect(html).toContain('<th scope="col">Gap</th>');
    expect(html).toContain('data-opportunity-lost-component="total"');
    expect(html).toContain('<th scope="row">Total</th>');
    expect(html).toContain('data-opportunity-lost-component="underproduction"');
    expect(html).toContain('<span title="Villager underproduction">Under-production</span>');
    expect(html).toContain('data-opportunity-lost-component="low_underproduction"');
    expect(html).toContain('<th scope="row">Under production seconds</th>');
    expect(html).not.toContain('<th scope="row">Villager underproduction</th>');
  });

  it('renders opportunity lost as resources lost by the selected time', () => {
    const html = renderPostMatchHtml(makePointInTimeOpportunityLostModel());
    const payload = extractHoverPayload(html);
    const at90 = payload.find((snapshot: { timestamp: number }) => snapshot.timestamp === 90);
    const at180 = payload.find((snapshot: { timestamp: number }) => snapshot.timestamp === 180);

    expect(at90.opportunityLostComponents.villagersLost).toEqual(expect.objectContaining({
      you: 20,
      opponent: 0,
      delta: 20,
    }));
    expect(at90.bandBreakdown.opportunityLost.you.map((entry: { label: string }) => entry.label))
      .not.toContain('2:00-2:30');
    expect(at180.opportunityLostComponents.villagersLost).toEqual(expect.objectContaining({
      you: 120,
      opponent: 0,
      delta: 120,
    }));
    expect(at90.allocation.opportunityLost.you).toBe(
      at90.opportunityLostComponents.villagersLost.you +
      at90.opportunityLostComponents.underproduction.you
    );
    expect(at90.opportunityLostComponents.low_underproduction.you).toBe(30);
    expect(at180.opportunityLostComponents.low_underproduction.you).toBe(120);
    expect(html).toContain('resources lost by selected time');
  });
});
