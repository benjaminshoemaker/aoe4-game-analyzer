import {
  buildAllocationCategories,
  buildAllocationLeaderSegments,
  renderPostMatchHtml,
} from '../../src/lib/aoe4/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

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
          militaryActive: 60,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 50,
          float: 20,
          total: 130,
        },
      },
    ] as any, 60);

    expect(segments.find(segment => segment.categoryKey === 'technology' && segment.start === 0))
      .toEqual(expect.objectContaining({ leader: 'tie' }));
    expect(segments.find(segment => segment.categoryKey === 'military' && segment.start === 30))
      .toEqual(expect.objectContaining({ leader: 'opponent' }));
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
      headline: 'French took a favorable fight against English.',
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
          totalValue: 640,
          units: [
            { label: 'Longbowman', value: 480, count: 6, band: 'militaryActive' },
            { label: 'Spearman', value: 160, count: 2, band: 'militaryActive' },
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
        summary: 'Despite significantly fewer deployed military resources.',
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
    const underdogNoteIndex = html.indexOf('Despite significantly fewer deployed military resources.');
    const armyIndex = html.indexOf('Pre-encounter armies');
    const lossesIndex = html.indexOf('Encounter losses');
    const underdogDetailsIndex = html.indexOf('Why this fight is notable');
    const allocationIndex = html.indexOf('data-inspector-section="allocation"');

    expect(html).toContain('data-significant-event-marker');
    expect(html).toContain('aria-label="Fight at 0:00: French took a favorable fight against English."');
    expect(html).toContain('data-significant-event-armies');
    expect(html).toContain('data-significant-event-underdog-note');
    expect(html).toContain('data-significant-event-underdog-toggle');
    expect(html).toContain('aria-label="Why did the smaller army win this fight?"');
    expect(html).toContain('data-significant-event-underdog-details');
    expect(html).toContain('Why this fight is notable');
    expect(html).toContain('French won this encounter despite having significantly fewer deployed military resources than English.');
    expect(html).toContain('Pre-encounter armies');
    expect(html).toContain('English army before fight');
    expect(html).toContain('French army before fight');
    expect(html).toContain('data-significant-event-army-total="player1">640</dd>');
    expect(html).toContain('data-significant-event-army-total="player2">640</dd>');
    expect(html).toContain('Longbowman x6');
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
    expect(underdogNoteIndex).toBeGreaterThan(eventIndex);
    expect(armyIndex).toBeGreaterThan(eventIndex);
    expect(lossesIndex).toBeGreaterThan(armyIndex);
    expect(underdogDetailsIndex).toBeGreaterThan(lossesIndex);
    expect(allocationIndex).toBeGreaterThan(eventIndex);
  });

  it('keeps requested sections and omits deferred sections', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).toContain('Match recap');
    expect(html.indexOf('Allocation lead and mix over time')).toBeLessThan(html.indexOf('Dark age'));
    expect(html.indexOf('Dark age')).toBeLessThan(html.indexOf('Feudal age'));
    expect(html.indexOf('Feudal age')).toBeLessThan(html.indexOf('Castle age'));
    expect(html.indexOf('Castle age')).toBeLessThan(html.indexOf('Imperial age'));
    expect(html.indexOf('Imperial age')).toBeLessThan(html.indexOf('Final pool delta'));
    expect(html).toContain('Final pool delta');
    expect(html).toContain('Gap widened: Tied -&gt; You +148.');
    expect(html).toContain('Allocation: your edge was Technology +100; Military was similar.');
    expect(html).toContain('Destruction: neither player destroyed measurable value.');
    expect(html).toContain('Meaning: No major conversion signal inside this shared window.');
    expect(html).toContain('No shared window');
    expect(html).toContain('Allocation lead and mix over time');
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
    expect(html).toContain('data-hover-field="allocation.technology.delta"');
    expect(html).toContain('data-hover-field="allocation.destroyed.delta"');
    expect(html).toContain('data-hover-field="allocation.float.delta"');
    expect(html).toContain('data-hover-field="allocation.opportunityLost.delta"');
    expect(html).toContain('data-inspector-row="destroyed"');
    expect(html).toContain('data-band-key="destroyed"');
    expect(html).toContain('data-inspector-row="opportunityLost"');
    expect(html).toContain('data-band-key="opportunityLost"');
    const otherRowIndex = html.indexOf('data-allocation-category-row="other"');
    const destroyedRowIndex = html.indexOf('data-inspector-row="destroyed"');
    const totalPoolIndex = html.indexOf('data-total-pool-tooltip');
    const floatRowIndex = html.indexOf('inspector-float-row');
    const opportunityLostRowIndex = html.indexOf('data-inspector-row="opportunityLost"');
    const gatherRowIndex = html.indexOf('<th>Gather/min</th>');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(destroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(destroyedRowIndex);
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
    expect(html).toContain('Total villager opportunity cost');
    expect(html).toContain('Destroyed');
    expect(html).toContain('data-total-pool-tooltip');
    expect(html).toContain('Economic + Technology + Military + Other - Destroyed = Total pool');
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
    expect(html).toContain('data-band-summary-label');
    expect(html).toContain('data-band-summary-you');
    expect(html).toContain('data-band-summary-opponent');
    expect(html).toContain('data-band-summary-delta');
    const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
    expect(payloadMatch).not.toBeNull();
    const payload = JSON.parse(payloadMatch?.[1] ?? '[]');
    expect(payload[0].allocation.opportunityLost).toEqual(expect.objectContaining({
      you: 90,
      opponent: 140,
      delta: -50,
    }));
    expect(payload[0].bandBreakdown.opportunityLost.you).toEqual([
      expect.objectContaining({ label: '0:00-0:30', value: 90, count: 1 }),
    ]);
    expect(html).toContain('.band-breakdown-cols {\n      display: grid;\n      grid-template-columns: 1fr;');
    expect(html).toContain('.band-item-label-truncated {\n      display: block;');
    expect(html).toContain('white-space: normal;');
    expect(html).toContain('box-shadow: inset 3px 0 0 var(--you);');
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

  it('renders neutral player and civilization labels instead of perspective headers', () => {
    const model = makeMvpModelFixture();
    (model.header as any).youPlayer = {
      name: 'RepleteCactus',
      civilization: 'English',
      label: 'RepleteCactus · English',
      shortLabel: 'RepleteCactus',
      color: '#378ADD',
    };
    (model.header as any).opponentPlayer = {
      name: 'Mista',
      civilization: 'French',
      label: 'Mista · French',
      shortLabel: 'Mista',
      color: '#D85A30',
    };

    const html = renderPostMatchHtml(model);

    expect(html).toContain('RepleteCactus · English');
    expect(html).toContain('Mista · French');
    expect(html).not.toContain('You · English');
    expect(html).not.toContain('Opponent · French');
    expect(html).not.toContain('<th>You</th>');
    expect(html).not.toContain('<th>Opp</th>');
    expect(html).not.toContain('<h4>You</h4>');
    expect(html).not.toContain('<h4>Opponent</h4>');
    expect(html).not.toContain('You age-up');
    expect(html).not.toContain('Opponent age-up');
  });
});
