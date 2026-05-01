import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { renderPostMatchHtml } from '../../src/lib/aoe4/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

const buildMatchHtml = jest.fn();
const parseMatchRouteParams = jest.fn();

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
}

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchHtml: (...args: unknown[]) => buildMatchHtml(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

describe('matches route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rendered HTML and passes sig query to builder', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
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
      kind: 'raid',
      label: 'Raid',
      shortLabel: 'Raid',
      description: 'French lost 140 resources of villager opportunity impact.',
      impactSummary: '140 gross impact, 20.9% of deployed pool.',
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
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(model));

    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(parseMatchRouteParams).toHaveBeenCalledWith('my-slug', '230143339');
    expect(buildMatchHtml).toHaveBeenCalledWith({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
      hoverDataUrl: '/matches/my-slug/230143339/hover-data?sig=abc123',
    });
    expect(body).toContain('Allocation lead and mix over time');
    expect(body).toContain('Dark age');
    expect(body.indexOf('Imperial age')).toBeLessThan(body.indexOf('Final pool delta'));
    expect(body).toContain('id="allocation-leader-strip"');
    expect(body).toContain('id="allocation-comparison"');
    expect(body).toContain('class="mobile-timeline-control"');
    expect(body).toContain('data-mobile-timeline-slider');
    expect(body).toContain('data-mobile-timeline-step="-1"');
    expect(body).toContain('data-mobile-timeline-step="1"');
    expect(body).toContain('data-mobile-summary="overall"');
    expect(body).toContain('data-mobile-current-time');
    const leaderStrip = extractSvg(body, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="economic"');
    expect(leaderStrip).toContain('data-category-key="technology"');
    expect(leaderStrip).toContain('data-category-key="military"');
    expect(leaderStrip).not.toContain('data-category-key="destroyed"');
    expect(leaderStrip).not.toContain('data-category-key="overall"');
    expect(leaderStrip).not.toContain('data-category-key="float"');
    expect(leaderStrip).not.toContain('data-category-key="opportunityLost"');
    expect(body).toContain('Float (not deployed)');
    expect(body).toContain('Opportunity lost');
    expect(body).toContain('Total villager opportunity cost');
    expect(body).toContain('Destroyed');
    expect(body).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(body).toContain('class="allocation-lane allocation-lane-float"');
    expect(body).toContain('class="allocation-lane allocation-lane-opportunityLost"');
    expect(body).toContain('data-inspector-row="destroyed"');
    expect(body).toContain('data-band-key="destroyed"');
    expect(body).toContain('data-inspector-row="opportunityLost"');
    expect(body).toContain('data-band-key="opportunityLost"');
    const otherRowIndex = body.indexOf('data-allocation-category-row="other"');
    const destroyedRowIndex = body.indexOf('data-inspector-row="destroyed"');
    const totalPoolIndex = body.indexOf('data-total-pool-tooltip');
    const floatRowIndex = body.indexOf('inspector-float-row');
    const opportunityLostRowIndex = body.indexOf('data-inspector-row="opportunityLost"');
    const gatherRowIndex = body.indexOf('<th>Gather/min</th>');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(destroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(destroyedRowIndex);
    expect(floatRowIndex).toBeGreaterThan(totalPoolIndex);
    expect(opportunityLostRowIndex).toBeGreaterThan(floatRowIndex);
    expect(gatherRowIndex).toBeGreaterThan(opportunityLostRowIndex);
    expect(body).toContain('data-total-pool-tooltip');
    expect(body).toContain('data-hover-field="allocation.opportunityLost.delta"');
    expect(body).toContain('data-significant-event-marker');
    expect(body).toContain('Event impact');
    expect(body).toContain('data-significant-event-loss-summary="player2"');
    expect(body).toContain('data-significant-event-loss-villager-opportunity="player2">90</dd>');
    expect(body).toContain('data-significant-event-loss-share-label="player2">Share of French deployed</dt>');
    expect(body).not.toContain('<dt>Share of deployed</dt>');
    expect(body).not.toContain('Deployed resource pool over time');
    expect(body).not.toContain('Strategic allocation state');
  });

  it('can return the Delhi unsupported page from the match route', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 231103171 });
    buildMatchHtml.mockResolvedValue('<!doctype html><h1>Delhi support unavailable</h1><p>This app doesn&#39;t work for Delhi yet.</p>');

    const request = new Request('http://localhost/matches/my-slug/231103171?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '231103171',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('Delhi support unavailable');
    expect(body).toContain("This app doesn&#39;t work for Delhi yet.");
  });
});
