import {
  buildAllocationCategories,
  buildAllocationLeaderSegments,
  renderPostMatchHtml,
} from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture, makeSwappedPerspectiveColorModel } from '../helpers/mvpModelFixture';

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

function extractAgeMarker(svg: string, label: string): string {
  const match = svg.match(new RegExp(`<g class="age-marker" data-age-marker="${label}">[\\s\\S]*?</g>`));
  if (!match) throw new Error(`Expected age marker ${label}`);
  return match[0];
}

function extractHoverData(html: string): any[] {
  const match = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('post-match hover data not found');
  return JSON.parse(match[1]);
}

describe('renderPostMatchHtml (web mvp)', () => {
  it('maps deployed pool bands into allocation categories', () => {
    expect(buildAllocationCategories({
      economic: 100,
      populationCap: 25,
      militaryCapacity: 30,
      militaryActive: 70,
      defensive: 50,
      research: 40,
      advancement: 160,
      destroyed: 40,
      float: 125,
      total: 435,
    } as any)).toEqual({
      economic: 100,
      technology: 200,
      military: 150,
      other: 25,
      destroyed: 40,
      overall: 435,
      float: 125,
      opportunityLost: 0,
    });
  });

  it('builds thirty-second leader segments for the three strategic categories', () => {
    const segments = buildAllocationLeaderSegments([
      {
        timestamp: 0,
        you: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 0,
          total: 100,
        },
        opponent: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 0,
          total: 100,
        },
      },
      {
        timestamp: 30,
        you: {
          economic: 140,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 20,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 100,
          total: 160,
        },
        opponent: {
          economic: 120,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 10,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 50,
          float: 20,
          total: 130,
        },
        accounting: {
          you: {
            economic: 140,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 20,
            defensive: 0,
            research: 0,
            advancement: 0,
            destroyed: 0,
            float: 100,
            gathered: 260,
            total: 160,
          },
          opponent: {
            economic: 120,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 60,
            defensive: 0,
            research: 0,
            advancement: 0,
            destroyed: 50,
            float: 20,
            gathered: 250,
            total: 180,
          },
        },
      },
    ] as any, 60);

    expect(segments.find(segment => segment.categoryKey === 'technology' && segment.start === 0))
      .toEqual(expect.objectContaining({ leader: 'tie' }));
    expect(segments.find(segment => segment.categoryKey === 'military' && segment.start === 30))
      .toEqual(expect.objectContaining({ leader: 'you', you: 20, opponent: 10 }));
    expect(new Set(segments.map(segment => segment.categoryKey))).toEqual(new Set([
      'economic',
      'technology',
      'military',
    ]));
    expect(segments.find(segment => segment.categoryKey === 'destroyed')).toBeUndefined();
    expect(segments.find(segment => segment.categoryKey === 'overall')).toBeUndefined();
    expect(segments.find(segment => segment.categoryKey === 'float')).toBeUndefined();
    expect(segments.find(segment => segment.categoryKey === 'opportunityLost')).toBeUndefined();
  });

  it('uses net pool values for chart payloads while preserving investment accounting', () => {
    const model = makeMvpModelFixture();
    const snapshot = model.trajectory.hoverSnapshots[0] as any;
    snapshot.accounting.you.militaryActive = 368;
    snapshot.accounting.you.destroyed = 200;
    snapshot.accounting.you.gathered = 1518;
    snapshot.accounting.you.total = 1018;
    snapshot.accounting.opponent.militaryActive = 320;
    snapshot.accounting.opponent.destroyed = 200;
    snapshot.accounting.opponent.gathered = 1870;
    snapshot.accounting.opponent.total = 870;
    snapshot.accounting.delta.militaryActive = 48;
    snapshot.accounting.delta.destroyed = 0;
    snapshot.accounting.delta.gathered = -352;
    snapshot.accounting.delta.total = 148;

    const payload = extractHoverData(renderPostMatchHtml(model));

    expect(payload[0].allocation.military).toEqual(expect.objectContaining({
      you: 168,
      opponent: 120,
      delta: 48,
    }));
    expect(payload[0].allocationCategory.military).toEqual(expect.objectContaining({
      net: expect.objectContaining({ you: 168, opponent: 120, delta: 48 }),
      destroyed: expect.objectContaining({ you: 200, opponent: 200, delta: 0 }),
      investment: expect.objectContaining({ you: 368, opponent: 320, delta: 48 }),
    }));
    expect(payload[0].allocationCategory.economic).toEqual(expect.objectContaining({
      resourceGeneration: expect.objectContaining({ you: 30, opponent: 35, delta: -5 }),
      resourceInfrastructure: expect.objectContaining({ you: 20, opponent: 15, delta: 5 }),
    }));
    expect(payload[0].strategy.military).toEqual(expect.objectContaining({
      you: 20.5,
      opponent: 17.9,
      delta: 2.6,
    }));
  });

  it('renders fight army context and encounter losses in the inspector event impact block', () => {
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
      impactSummary: '400 gross impact, 35.3% of deployed pool.',
      grossImpact: 400,
      grossLoss: 240,
      immediateLoss: 240,
      villagerOpportunityLoss: 90,
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
          denominator: 670,
          pctOfDeployed: 23.9,
          villagerDeaths: 0,
          losses: [{ label: 'Spearman', value: 160, count: 2, band: 'militaryActive' }],
          topLosses: [{ label: 'Spearman', value: 160, count: 2, band: 'militaryActive' }],
        },
        player2: {
          immediateLoss: 240,
          villagerOpportunityLoss: 90,
          grossLoss: 330,
          denominator: 670,
          pctOfDeployed: 49.3,
          villagerDeaths: 0,
          losses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
          topLosses: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
        },
      },
    } as const;

    (model.trajectory as any).significantEvents = [significantEvent];
    (model.trajectory.hoverSnapshots[0] as any).significantEvent = significantEvent;

    const html = renderPostMatchHtml(model);
    const eventIndex = html.indexOf('Event impact');
    const visibleHeadline = '<span data-hover-field="significantEvent.label">French took a favorable fight against English, despite significantly fewer deployed military resources.</span>';
    const headlineIndex = html.indexOf(visibleHeadline);
    const armyIndex = html.indexOf('Pre-encounter armies');
    const lossesIndex = html.indexOf('Encounter losses');
    const underdogDetailsIndex = html.indexOf('Why this fight is notable');
    const allocationIndex = html.indexOf('data-inspector-section="allocation"');

    expect(html).toContain('data-significant-event-marker');
    expect(html).toMatch(/<details class="event-impact" data-significant-event(?: hidden)? open>/);
    expect(html).toContain('<summary class="event-impact-heading">Event impact</summary>');
    expect(html).toContain('aria-label="Fight at 0:00: French took a favorable fight against English, despite significantly fewer deployed military resources."');
    expect(html).toContain(visibleHeadline);
    expect(html).toContain('data-significant-event-armies');
    expect(html).not.toContain('data-significant-event-underdog-note');
    expect(html).not.toContain('data-significant-event-underdog-summary');
    expect(html).toContain('data-significant-event-underdog-toggle');
    expect(html).toContain('aria-label="Why did the smaller army win this fight?"');
    expect(html).toContain('data-significant-event-underdog-details');
    expect(html).toContain('Why this fight is notable');
    expect(html).toContain('French won this encounter despite having significantly fewer deployed military resources than English.');
    expect(html).toContain('Pre-encounter armies');
    expect(html).toContain('English army before fight');
    expect(html).toContain('French army before fight');
    expect(html).toContain('data-significant-event-army-total="player1">1,300</dd>');
    expect(html).toContain('data-significant-event-army-total="player2">640</dd>');
    expect(html).toContain('Longbowman x12');
    expect(html).toContain('Knight x2');
    expect(html).toContain('Encounter losses');
    expect(html).toContain('data-significant-event-losses');
    expect(html).toContain('English losses');
    expect(html).toContain('French losses');
    expect(html).toContain('Spearman x2');
    expect(html).toContain('Knight x1');
    expect(html).toContain('data-significant-event-loss-summary="player2"');
    expect(html).toContain('data-significant-event-loss-total="player2">330</dd>');
    expect(html).toContain('data-significant-event-loss-immediate="player2">240</dd>');
    expect(html).toContain('data-significant-event-loss-villager-opportunity="player2">90</dd>');
    expect(html).toContain('data-significant-event-loss-share-label="player2">Share of French deployed</dt>');
    expect(html).not.toContain('<dt>Share of deployed</dt>');
    expect(html).not.toContain('data-hover-field="significantEvent.description"');
    expect(html).not.toContain('data-hover-field="significantEvent.grossLoss"');
    expect(html).not.toContain('data-hover-field="significantEvent.topLosses"');
    expect(html).toContain('data-villager-opportunity-event-tooltip');
    expect(html).toContain('future missed gathering from killed villagers');
    expect(eventIndex).toBeGreaterThanOrEqual(0);
    expect(headlineIndex).toBeGreaterThan(eventIndex);
    expect(armyIndex).toBeGreaterThan(eventIndex);
    expect(lossesIndex).toBeGreaterThan(armyIndex);
    expect(underdogDetailsIndex).toBeGreaterThan(lossesIndex);
    expect(allocationIndex).toBeGreaterThan(eventIndex);
  });

  it('keeps requested sections and omits deferred sections', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).toContain('Match recap');
    expect(html).toContain('<a class="recap-link feedback-link" href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noreferrer noopener">Feedback? DM me on Reddit</a>');
    expect(html).not.toContain('<section class="panel metrics">');
    expect(html).not.toContain('Dark age');
    expect(html).not.toContain('Feudal age');
    expect(html).not.toContain('Castle age');
    expect(html).not.toContain('Imperial age');
    expect(html).not.toContain('Final pool delta');
    expect(html).toContain('Resource state over time');
    expect(html).toContain('Age timings');
    expect(html).toContain('How to read this chart');
    expect(html).toContain('<p class="section-note allocation-section-note">');
    expect(html).toContain('.allocation-section-note {\n      max-width: none;\n      width: 100%;\n    }');
    expect(html).toContain('id="allocation-leader-strip"');
    expect(html).toContain('id="allocation-comparison"');
    expect(html).toContain('data-allocation-leader-segment');
    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="economic"');
    expect(leaderStrip).toContain('data-category-key="technology"');
    expect(leaderStrip).toContain('data-category-key="military"');
    expect(leaderStrip).not.toContain('data-category-key="destroyed"');
    expect(leaderStrip).not.toContain('data-category-key="overall"');
    expect(leaderStrip).not.toContain('data-category-key="float"');
    expect(leaderStrip).not.toContain('data-category-key="opportunityLost"');
    expect(html).toContain('<details class="allocation-read-guide" aria-label="Allocation chart legend">');
    expect(html).toContain('<summary class="allocation-read-guide-summary">How to read this chart</summary>');
    expect(html).toContain('class="mobile-timeline-control"');
    expect(html).toContain('data-mobile-timeline-slider');
    expect(html).toContain('aria-label="Select match timestamp"');
    expect(html).toContain('data-mobile-timeline-step="-1"');
    expect(html).toContain('data-mobile-timeline-step="1"');
    expect(html).toContain('data-mobile-current-time');
    expect(html).toContain('data-mobile-current-context');
    expect(html).toContain('class="mobile-selected-summary"');
    expect(html).toContain('data-mobile-summary="overall"');
    expect(html).toContain('data-mobile-summary="technology"');
    expect(html).toContain('data-mobile-summary="military"');
    expect(html).toContain('data-mobile-summary="destroyed"');
    expect(html).toContain('data-mobile-details');
    expect(html).toContain('Selected time');
    expect(html).not.toContain('Hover inspector');
    expect(html).toContain('data-hover-label-strategy-overall');
    expect(html).toContain('data-hover-label-strategy-destroyed');
    expect(html).toContain('data-hover-label-strategy-float');
    expect(html).toContain('data-hover-label-strategy-opportunityLost');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.technology.net.delta"');
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
    expect(html).toContain('data-economic-role-filter="resourceGenerator"');
    expect(html).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(html).toContain('data-allocation-investment-category="economic"');
    expect(html).toContain('data-band-key="militaryInvestment"');
    expect(html).toContain('Total Economic Investment');
    expect(html).toContain('Total Military Investment');
    expect(html).not.toContain('<span class="band-sub-label">Economic investment</span>');
    expect(html).not.toContain('<span class="band-sub-label">Military investment</span>');
    expect(html).toContain("var selectedEconomicRoleFilter = '';");
    expect(html).toContain("var selectedInvestmentCategory = '';");
    expect(html).toContain("selectedEconomicRoleFilter = key === 'economic'");
    expect(html).toContain('function combinedInvestmentBreakdown(point, category)');
    expect(html).toContain('function syncDestroyedRowVisibility(point)');
    expect(html).toContain("row.hidden = isCategoryCollapsed(category) || isEmpty");
    expect(html).toContain("(entry.economicRole || 'resourceInfrastructure') === selectedEconomicRoleFilter");
    expect(html).toContain('data-allocation-category-accounting="military-destroyed"');
    expect(html).toContain('data-destroyed-row-category="economic" data-destroyed-row-empty="true" hidden');
    expect(html).toContain('Advancement destroyed');
    expect(html).not.toContain('Technology destroyed');
    expect(html).toContain('data-allocation-category-accounting="military-investment"');
    expect(html).toContain('data-band-key="militaryDestroyed"');
    expect(html).toContain('data-inspector-row="float"');
    expect(html).toContain('data-band-key="float"');
    expect(html).toContain("float: 'Float'");
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
    const economicRowIndex = html.indexOf('data-allocation-category-row="economic"');
    const resourceGenerationRowIndex = html.indexOf('data-allocation-category-accounting="economic-resource-generation"');
    const resourceInfrastructureRowIndex = html.indexOf('data-allocation-category-accounting="economic-resource-infrastructure"');
    const economicDestroyedRowIndex = html.indexOf('data-allocation-category-accounting="economic-destroyed"');
    expect(economicRowIndex).toBeGreaterThanOrEqual(0);
    expect(resourceGenerationRowIndex).toBeGreaterThan(economicRowIndex);
    expect(resourceInfrastructureRowIndex).toBeGreaterThan(resourceGenerationRowIndex);
    expect(economicDestroyedRowIndex).toBeGreaterThan(resourceInfrastructureRowIndex);
    expect(floatRowIndex).toBeGreaterThan(totalPoolIndex);
    expect(opportunityLostRowIndex).toBeGreaterThan(floatRowIndex);
    expect(gatherRowIndex).toBeGreaterThan(opportunityLostRowIndex);
    expect(html).toContain('data-allocation-category-toggle="technology" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-child="technology" hidden');
    expect(html).toContain('class="allocation-lane allocation-lane-overall"');
    expect(html).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(html).toContain('class="allocation-lane allocation-lane-float"');
    expect(html).toContain('class="allocation-lane allocation-lane-opportunityLost"');
    expect(extractAllocationLane(html, 'float')).toContain('>1,000<');
    expect(extractAllocationLane(html, 'opportunityLost')).toContain('>140<');
    expect(html).toContain('Float (not deployed)');
    expect(html).toContain('Opportunity lost');
    expect(html).toContain('Resources missing because of villager deaths or villager underproduction');
    expect(html).toContain('Destroyed');
    expect(html).toContain('data-total-pool-tooltip');
    expect(html).toContain('Total net pool');
    expect(html).toContain('Economic net + Technology net + Military net + Other net = Total pool');
    expect(html).not.toContain('Overall resources');
    expect(html).toContain('.wrap {\n      width: min(100%, var(--report-max-width));');
    expect(html).toContain('.panel {\n      min-width: 0;');
    expect(html).toContain('max-width: 100%;\n      overflow-wrap: anywhere;');
    expect(html).toContain('.chart-stack {\n      min-width: 0;\n      overflow-x: auto;');
    expect(html).toContain('@media (max-width: 520px)');
    expect(html).toContain('.wrap { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }');
    expect(html).toContain('.chips { flex-direction: column; align-items: stretch; }');
    expect(html).toContain('.civ-chip { width: 100%; }');
    expect(html).toContain('.chart-stack { overflow-x: hidden; }');
    expect(html).toContain('.chart-stack .leader-strip,\n      .chart-stack .strategy-chart { min-width: 0; }');
    expect(html).toContain('.mobile-timeline-control { display: grid; }');
    expect(html).toContain('.hover-target { pointer-events: none; }');
    expect(html).toContain('min-height: 44px;');
    expect(html).toContain('data-fixed-label="true"');
    expect(html).toContain('data-hover-field="gather.you"');
    expect(html).toContain('data-band-breakdown-title');
    expect(html).not.toContain('<li class="band-breakdown-group">Resource generators</li>');
    expect(html).not.toContain('<li class="band-breakdown-group">Resource infrastructure</li>');
    expect(leaderStrip).toContain('viewBox="0 0 980 126"');
    expect(leaderStrip).toContain('data-time-axis="allocation-leader"');
    expect(leaderStrip).toContain('class="leader-strip-axis-bg"');
    expect(leaderStrip).toContain('class="leader-strip-time-label"');
    expect(html).toContain('--report-max-width: 1440px;');
    expect(html).toContain('--inspector-min-width: 380px;');
    expect(html).toContain('--inspector-max-width: 460px;');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr) clamp(var(--inspector-min-width), 32vw, var(--inspector-max-width));');
    expect(html).toContain('@media (max-width: 1160px)');
    expect(html).toContain('data-inspector-section="allocation"');
    expect(html).toContain('data-band-breakdown-summary');
    expect(html).toContain('<table class="opportunity-lost-components" data-opportunity-lost-components aria-label="Opportunity lost components by civilization" style="--opportunity-you-color:#378ADD;--opportunity-opponent-color:#D85A30" hidden>');
    expect(html).toContain('aria-label="Opportunity lost components by civilization"');
    expect(html).toContain('<th scope="col">Gap</th>');
    expect(html).toContain('data-opportunity-lost-component="total"');
    expect(html).toContain('data-opportunity-lost-component-total-you');
    expect(html).toContain('data-opportunity-lost-component="low_underproduction"');
    expect(html).toContain('<th scope="row">Under production seconds</th>');
    expect(html).toContain('data-opportunity-lost-component-low-underproduction-you');
    expect(html).toContain('data-band-summary-label');
    expect(html).toContain('data-band-summary-value');
    expect(html).toContain('data-band-summary-you');
    expect(html).toContain('data-band-summary-opponent');
    expect(html).toContain('data-band-summary-delta');
    expect(html).toContain('Opportunity lost: resources lost by selected time');
    expect(html).toContain("el.hidden = selectedBand === 'opportunityLost';");
    expect(html).toContain('grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));');
    expect(html).toContain('.band-summary-label {\n      grid-column: 1 / -1;');
    expect(html).toContain('.band-breakdown-summary > span:not(.band-summary-label) {\n      min-width: 0;');
    expect(html).toContain('overflow-wrap: break-word;');
    const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
    expect(payloadMatch).not.toBeNull();
    const payload = JSON.parse(payloadMatch?.[1] ?? '[]');
    expect(payload[0].allocation.opportunityLost).toEqual(expect.objectContaining({
      you: 90,
      opponent: 140,
      delta: -50,
    }));
    expect(payload[0].opportunityLostComponents.low_underproduction).toEqual(expect.objectContaining({
      you: 0,
      opponent: 0,
      delta: 0,
    }));
    expect(payload[0].bandBreakdown.opportunityLost.you).toEqual([
      expect.objectContaining({ label: '0:00-0:30', value: 90, count: 1 }),
    ]);
    expect(payload[0].bandBreakdown.float.you).toEqual([
      expect.objectContaining({ label: 'Food', value: 120, percent: 24 }),
      expect.objectContaining({ label: 'Wood', value: 180, percent: 36 }),
      expect.objectContaining({ label: 'Gold', value: 200, percent: 40 }),
    ]);
    expect(html).toContain('.band-breakdown-cols {\n      display: grid;\n      grid-template-columns: 1fr;');
    expect(html).toContain('.band-item-label-truncated {\n      display: block;');
    expect(html).toContain('white-space: normal;');
    expect(html).toContain('box-shadow: inset 3px 0 0 var(--you);');
    expect(html).toContain('.band-toggle,\n    .allocation-category-toggle,\n    .band-sub-link {\n      min-height: 36px;');
    expect(html).toContain('.band-toggle:hover,\n    .allocation-category-toggle:hover,\n    .band-sub-link:hover {');
    expect(html).toContain('.allocation-category-toggle:focus-visible,\n    .band-toggle:focus-visible,\n    .band-sub-link:focus-visible,');
    expect(html).toContain('searchParams.set(\'t\'');
    expect(html).toContain('searchParams.delete(\'t\')');

    expect(html).not.toContain('Deployed resource pool over time');
    expect(html).not.toContain('Strategic allocation state');
    expect(html).not.toContain('id="pool-comparison"');
    expect(html).not.toContain('id="strategy-allocation"');
    expect(html).not.toContain('Gather rate</h2>');
    expect(html).not.toContain('Villager opportunity cost');
    expect(html).not.toContain('Adjusted military active method');
    expect(html).not.toContain('Where the gap came from');
    expect(html).not.toContain('One-line story');
    expect(html).not.toContain('data-open-adjusted-explainer');
  });

  it('keeps full player labels only in the header and age timing legend when civilizations differ', () => {
    const model = makeMvpModelFixture();

    const html = renderPostMatchHtml(model);

    expect(html).toContain('RepleteCactus · English');
    expect(html).toContain('Mista · French');
    expect(html.match(/RepleteCactus · English/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/Mista · French/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('RepleteCactus · English age-up');
    expect(html).toContain('Mista · French age-up');
    expect(html).toContain('<th>English</th>');
    expect(html).toContain('<th>French</th>');
    expect(html).toContain('<h4>English</h4>');
    expect(html).toContain('<h4>French</h4>');
    expect(html).toContain('data-cell-label="English"');
    expect(html).toContain('data-cell-label="French"');
    expect(html).not.toContain('<th>RepleteCactus · English</th>');
    expect(html).not.toContain('<th>Mista · French</th>');
    expect(html).not.toContain('<h4>RepleteCactus · English</h4>');
    expect(html).not.toContain('<h4>Mista · French</h4>');
    expect(html).not.toContain('You · English');
    expect(html).not.toContain('Opponent · French');
    expect(html).not.toContain('<th>You</th>');
    expect(html).not.toContain('<th>Opp</th>');
    expect(html).not.toContain('<h4>You</h4>');
    expect(html).not.toContain('<h4>Opponent</h4>');
    expect(html).not.toContain('You age-up');
    expect(html).not.toContain('Opponent age-up');
    expect(html).toContain('.inspector-table thead th {\n      white-space: normal;');
    expect(html).toContain('overflow-wrap: anywhere;\n      line-height: 1.15;');
    expect(html).toContain('.inspector-table tbody td {\n      white-space: nowrap;');
  });

  it('uses player names as compact labels when both players share a civilization', () => {
    const model = makeMvpModelFixture();
    model.header.opponentCivilization = 'English';
    model.header.opponentPlayer = {
      ...model.header.opponentPlayer,
      civilization: 'English',
      label: 'Mista · English',
    };
    model.header.player2 = {
      ...model.header.player2,
      civilization: 'English',
      label: 'Mista · English',
    };

    const html = renderPostMatchHtml(model);

    expect(html).toContain('RepleteCactus · English');
    expect(html).toContain('Mista · English');
    expect(html).toContain('<th>RepleteCactus</th>');
    expect(html).toContain('<th>Mista</th>');
    expect(html).toContain('<h4>RepleteCactus</h4>');
    expect(html).toContain('<h4>Mista</h4>');
    expect(html).toContain('data-cell-label="RepleteCactus"');
    expect(html).toContain('data-cell-label="Mista"');
  });

  it('colors opportunity-lost civ headers with the actual player colors', () => {
    const model = makeMvpModelFixture();
    model.header.youPlayer.color = '#D85A30';
    model.header.player1.color = '#D85A30';
    model.header.opponentPlayer.color = '#378ADD';
    model.header.player2.color = '#378ADD';

    const html = renderPostMatchHtml(model);

    expect(html).toContain('style="--opportunity-you-color:#D85A30;--opportunity-opponent-color:#378ADD"');
    expect(html).toContain('<th scope="col">English</th>');
    expect(html).toContain('<th scope="col">French</th>');
    expect(html).toContain('color: var(--opportunity-you-color, var(--you));');
    expect(html).toContain('color: var(--opportunity-opponent-color, var(--opponent));');
  });

  it('keeps allocation line styles aligned with player colors when the perspective player is player 2', () => {
    const html = renderPostMatchHtml(makeSwappedPerspectiveColorModel());

    expect(html).toContain('<span class="age-line" style="border-color:#D85A30"></span>RepleteCactus · Ottomans age-up');
    expect(html).toContain('<span class="age-line dashed" style="border-color:#378ADD"></span>sohaijim2022 · Golden Horde age-up');

    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="technology" data-leader="you"');
    expect(leaderStrip).toMatch(/data-category-key="technology" data-leader="you"[^>]*fill="#D85A30"/);

    const economicLane = extractAllocationLane(html, 'economic');
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#D85A30" stroke-width="2\.4" stroke-linejoin="round" stroke-linecap="round" \/>/);
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#378ADD" stroke-width="2\.4" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" \/>/);

    const allocationSvg = extractSvg(html, 'allocation-comparison');
    const youAgeMarker = extractAgeMarker(allocationSvg, 'RepleteCactus · Ottomans Feudal 1:00');
    const opponentAgeMarker = extractAgeMarker(allocationSvg, 'sohaijim2022 · Golden Horde Feudal 2:00');
    expect(youAgeMarker).toContain('stroke="#D85A30"');
    expect(youAgeMarker).not.toContain('stroke-dasharray="7 5"');
    expect(opponentAgeMarker).toContain('stroke="#378ADD"');
    expect(opponentAgeMarker).toContain('stroke-dasharray="7 5"');
  });

  it('can inject the PostHog analytics script before match interactions', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture(), {
      analyticsScript: 'window.__analyticsReady = true;',
    } as any);

    expect(html).toContain('<script id="posthog-analytics">window.__analyticsReady = true;</script>');
    expect(html.indexOf('id="posthog-analytics"')).toBeLessThan(html.indexOf('post-match-hover-data'));
  });
});
