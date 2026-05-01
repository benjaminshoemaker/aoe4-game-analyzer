import { renderPostMatchHtml } from '../../src/lib/aoe4/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
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
      headline: 'English raided French and killed one villager.',
      kind: 'raid',
      label: 'Raid',
      shortLabel: 'Raid',
      description: 'French lost 140 resources of villager opportunity impact.',
      impactSummary: '220 gross impact.',
      grossImpact: 220,
      grossLoss: 140,
      immediateLoss: 50,
      villagerOpportunityLoss: 90,
      denominator: 670,
      pctOfDeployed: 20.9,
      villagerDeaths: 1,
      topLosses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
      encounterLosses: {
        player1: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
        player2: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
      },
      playerImpacts: {
        player1: {
          immediateLoss: 80,
          villagerOpportunityLoss: 0,
          grossLoss: 80,
          denominator: 818,
          pctOfDeployed: 9.8,
          villagerDeaths: 0,
          losses: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
          topLosses: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
        },
        player2: {
          immediateLoss: 50,
          villagerOpportunityLoss: 90,
          grossLoss: 140,
          denominator: 670,
          pctOfDeployed: 20.9,
          villagerDeaths: 1,
          losses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
          topLosses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
        },
      },
    } as const;
    (model.trajectory as any).significantEvents = [significantEvent];
    (model.trajectory.hoverSnapshots[0] as any).significantEvent = significantEvent;

    const html = renderPostMatchHtml(model);

    expect(html.indexOf('Allocation lead and mix over time')).toBeLessThan(html.indexOf('Dark age'));
    expect(html.indexOf('Dark age')).toBeLessThan(html.indexOf('Final pool delta'));
    expect(html.indexOf('Imperial age')).toBeLessThan(html.indexOf('Final pool delta'));
    expect(html).toContain('Only you reached Imperial, so there was no shared Imperial window to compare.');
    expect(html).toContain('<details class="allocation-read-guide" aria-label="Allocation chart legend">');
    expect(html).toContain('<summary class="allocation-read-guide-summary">How to read this chart</summary>');
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
    expect(html).toContain('Leader strip: absolute deployed-value leader by 30-second block');
    expect(html).toContain('Economic, Technology, and Military: percentage share of strategic allocation');
    expect(html).toContain('Overall: absolute deployed resource value after subtracting Destroyed');
    expect(html).toContain('Destroyed: cumulative value assumed destroyed by opponent');
    expect(html).toContain('Float (not deployed): gathered resources not currently committed');
    expect(html).toContain('Opportunity lost: total villager opportunity cost');
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
    expect(html).toContain('data-band-breakdown-summary');
    expect(html).toContain('data-significant-event-loss-summary="player2"');
    expect(html).toContain('data-significant-event-loss-total="player2">140</dd>');
    expect(html).toContain('data-significant-event-loss-villager-opportunity="player2">90</dd>');
    expect(html).toContain('data-significant-event-loss-share-label="player2">Share of French deployed</dt>');
    expect(html).not.toContain('<dt>Share of deployed</dt>');
    expect(html).toContain('data-band-summary-delta');
    expect(html).toContain('data-hover-field="allocation.economic.you"');
    expect(html).toContain('data-hover-field="allocation.other.delta"');
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
    expect(html).toContain('data-allocation-category-toggle="military" aria-expanded="false"');
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
    expect(payload[0].bandBreakdown.opportunityLost.opponent).toEqual([
      expect.objectContaining({ label: '0:00-0:30', value: 140, count: 2 }),
    ]);
  });
});
