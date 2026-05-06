const mockUnstableCache = jest.fn((
  callback: () => Promise<string>,
  _keyParts?: string[],
  _options?: { revalidate?: number | false; tags?: string[] }
) => callback);

jest.mock('next/cache', () => ({
  unstable_cache: (
    callback: () => Promise<string>,
    keyParts?: string[],
    options?: { revalidate?: number | false; tags?: string[] }
  ) => mockUnstableCache(callback, keyParts, options),
}));

import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import {
  addEventWindowOpportunityRaid,
  addGatherDisruptionEvent,
  addVerboseOpportunityLostBuckets,
  makeMvpModelFixture,
  makePointInTimeOpportunityLostModel,
  makeSwappedPerspectiveColorModel,
  makeUnderproductionOnlyOpportunityLostModel,
} from '../helpers/mvpModelFixture';

const buildMatchHtml = jest.fn();
const parseMatchRouteParams = jest.fn();

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

function extractEventLossTable(html: string): string {
  const match = html.match(/<tbody data-significant-event-loss-table>[\s\S]*?<\/tbody>/);
  if (!match) throw new Error('Expected event loss table');
  return match[0];
}

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchHtml: (...args: unknown[]) => buildMatchHtml(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

describe('matches route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnstableCache.mockImplementation((
      callback: () => Promise<string>,
      _keyParts?: string[],
      _options?: { revalidate?: number | false; tags?: string[] }
    ) => callback);
    clearMatchRouteCacheForTests();
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
      headline: 'French took a favorable fight against English, despite significantly fewer deployed military resources.',
      kind: 'fight',
      label: 'Fight',
      shortLabel: 'Fight',
      description: 'French lost more military value in the fight.',
      impactSummary: '400 gross impact, 35.8% of deployed pool.',
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
      postEncounterArmies: {
        player1: {
          totalValue: 1140,
          units: [
            { label: 'Longbowman', value: 960, count: 12, band: 'militaryActive' },
            { label: 'Spearman', value: 180, count: 2, band: 'militaryActive' },
          ],
        },
        player2: {
          totalValue: 400,
          units: [
            { label: 'Knight', value: 240, count: 1, band: 'militaryActive' },
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
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(model, {
      analyticsScript: 'window.__analyticsReady = true; window.__analyticsEvent = "match engagement summary";',
    }));

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
    });
    expect(response.headers.get('cache-control')).toBe('private, max-age=0, must-revalidate');
    expect(response.headers.get('cdn-cache-control')).toBeNull();
    expect(body).toContain('<link rel="icon" href="data:image/svg+xml');
    expect(body).toContain('--aoe-color-report-bg: #f2f4ee;');
    expect(body).toContain('--aoe-color-report-surface: #fbfcf9;');
    expect(body).toContain('--color-background: var(--aoe-color-report-bg);');
    expect(body).toContain('--color-card: var(--aoe-color-report-surface);');
    expect(body).toContain('--color-text: var(--aoe-color-report-text);');
    expect(body).toContain('--color-muted: var(--aoe-color-report-muted);');
    expect(body).toContain('--color-border: var(--aoe-color-report-border);');
    expect(body).toContain('font-family: var(--aoe-font-report);');
    expect(body).not.toContain('--color-background: #f2f4ee;');
    expect(body).toContain('<a class="recap-link feedback-link" href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noreferrer noopener">Feedback? DM me on Reddit</a>');
    expect(body).toContain('Resource state over time');
    expect(body).not.toContain('<section class="panel metrics">');
    expect(body).not.toContain('Dark age');
    expect(body).not.toContain('Imperial age');
    expect(body).not.toContain('Final pool delta');
    expect(body).toContain('id="allocation-leader-strip"');
    expect(body).toContain('id="allocation-comparison"');
    expect(body).toContain('class="mobile-timeline-control"');
    expect(body).toContain('data-mobile-timeline-slider');
    expect(body).toContain('data-mobile-timeline-step="-1"');
    expect(body).toContain('data-mobile-timeline-step="1"');
    expect(body).toContain('mobile timeline changed');
    expect(body).toContain('match outbound link clicked');
    expect(body).toContain('match engagement summary');
    expect(body).toContain('data-mobile-summary="overall"');
    expect(body).toContain('data-mobile-current-time');
    expect(body).toContain('.band-toggle,\n    .allocation-category-toggle,\n    .band-sub-link {\n      min-height: 36px;');
    expect(body).toContain('.band-toggle:hover,\n    .allocation-category-toggle:hover,\n    .band-sub-link:hover {');
    expect(body).toContain('grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));');
    expect(body).toContain('.band-summary-label {\n      grid-column: 1 / -1;');
    expect(body).toContain('.band-breakdown-summary > span:not(.band-summary-label) {\n      min-width: 0;');
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
    expect(body).toContain('Resources missing because of villager deaths or villager underproduction');
    expect(body).toContain('Destroyed');
    expect(body).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(body).toContain('class="allocation-lane allocation-lane-float"');
    expect(body).toContain('class="allocation-lane allocation-lane-opportunityLost"');
    expect(body).not.toContain('data-inspector-row="destroyed"');
    expect(body).not.toContain('data-band-key="destroyed"');
    expect(body).toContain('data-allocation-category-accounting="military-destroyed"');
    expect(body).toContain('data-allocation-category-accounting="military-investment"');
    expect(body).toContain('data-band-key="militaryDestroyed"');
    expect(body).toContain('data-inspector-row="float"');
    expect(body).toContain('data-band-key="float"');
    expect(body).toContain('data-inspector-row="opportunityLost"');
    expect(body).toContain('data-band-key="opportunityLost"');
    const otherRowIndex = body.indexOf('data-allocation-category-row="other"');
    const otherDestroyedRowIndex = body.indexOf('data-allocation-category-accounting="other-destroyed"');
    const otherInvestmentRowIndex = body.indexOf('data-allocation-category-accounting="other-investment"');
    const totalPoolIndex = body.indexOf('data-total-pool-tooltip');
    const floatRowIndex = body.indexOf('data-inspector-row="float"');
    const opportunityLostRowIndex = body.indexOf('data-inspector-row="opportunityLost"');
    const gatherRowIndex = body.indexOf('<th>Gather/min</th>');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(otherDestroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(otherInvestmentRowIndex).toBeGreaterThan(otherDestroyedRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(otherInvestmentRowIndex);
    expect(floatRowIndex).toBeGreaterThan(totalPoolIndex);
    expect(opportunityLostRowIndex).toBeGreaterThan(floatRowIndex);
    expect(gatherRowIndex).toBeGreaterThan(opportunityLostRowIndex);
    expect(body).toContain('data-total-pool-tooltip');
    expect(body).toContain('Total net pool');
    expect(body).toContain('data-hover-field="allocation.opportunityLost.delta"');
    expect(extractInspectorTable(body)).not.toContain('class="legend-dot');
    expect(body).toContain('data-significant-event-marker');
    expect(body).toMatch(/<details class="event-impact" data-significant-event(?: hidden)? open>/);
    expect(body).toContain('<summary class="event-impact-heading">Event impact</summary>');
    expect(body).toContain('Event impact');
    expect(body).toContain('French took a favorable fight against English, despite significantly fewer deployed military resources.');
    expect(body).not.toContain('data-significant-event-underdog-note');
    expect(body).toContain('data-significant-event-underdog-toggle');
    expect(body).toContain('Why this fight is notable');
    expect(body).toContain('French won this encounter despite having significantly fewer deployed military resources than English.');
    expect(body).toContain('Event summary');
    expect(body).toContain('Encounter loss details');
    expect(body).toContain('Event window army lists');
    expect(body).toContain('<details class="event-impact-detail-disclosure event-impact-loss-detail" data-significant-event-losses>');
    expect(body).toContain('<details class="event-impact-detail-disclosure event-impact-army-detail" data-significant-event-armies>');
    expect(body).toContain('data-significant-event-army-total="player1">1,300</td>');
    expect(body).toContain('data-significant-event-army-total="player2">640</td>');
    expect(body).toContain('data-significant-event-army-end-total="player1">1,140</td>');
    expect(body).toContain('data-significant-event-army-end-total="player2">400</td>');
    expect(body.indexOf('Event summary')).toBeLessThan(body.indexOf('Encounter loss details'));
    expect(body.indexOf('Encounter loss details')).toBeLessThan(body.indexOf('Event window army lists'));
    expect(body.indexOf('Why this fight is notable')).toBeGreaterThan(body.indexOf('Event window army lists'));
    expect(body).toContain('data-significant-event-loss-immediate="player2">240</td>');
    expect(body).toContain('.event-impact-summary-table {\n      table-layout: fixed;');
    expect(body).toContain('.event-impact-summary-table th:nth-child(3),\n    .event-impact-summary-table td:nth-child(3) {\n      border-left: 1px solid #eadbd4;');
    expect(body).toContain('data-significant-event-loss-share-label>Immediate loss share of deployed resources</th>');
    expect(body).not.toContain('data-hover-field="significantEvent.description"');
    expect(body).not.toContain('data-hover-field="significantEvent.grossLoss"');
    expect(body).not.toContain('data-hover-field="significantEvent.topLosses"');
    expect(body).not.toContain('id="post-match-hover-data-url"');
    expect(body).not.toContain('/matches/my-slug/230143339/hover-data?sig=abc123');
    expect(body).not.toContain('payloadSourceUrl');
    expect(body).not.toContain('fetch(payloadSourceUrl');
    expect(body).not.toContain('/favicon.ico');
    expect(body).not.toContain('<dt>Share of deployed</dt>');
    expect(body).not.toContain('Deployed resource pool over time');
    expect(body).not.toContain('Strategic allocation state');
  });

  it('reuses rendered match HTML for repeat requests to the same signed match URL', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue('<!doctype html><html><body>cached match</body></html>');
    const context = {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    };
    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123');

    const first = await GET(request, context);
    const second = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });

    await expect(first.text()).resolves.toContain('cached match');
    await expect(second.text()).resolves.toContain('cached match');
    expect(buildMatchHtml).toHaveBeenCalledTimes(1);
    expect(mockUnstableCache).toHaveBeenCalledTimes(1);
    expect(mockUnstableCache.mock.calls[0][1]).toEqual([
      'aoe4-rendered-report-html',
      expect.stringMatching(/^v15-(?:[a-f0-9]{12}|nobuild)-(?:[a-f0-9]{12}|none)$/),
      'my-slug',
      '230143339',
      expect.stringMatching(/^sig-sha256:[a-f0-9]{64}$/),
    ]);
    expect(String(mockUnstableCache.mock.calls[0][1])).not.toContain('abc123');
    expect(mockUnstableCache.mock.calls[0][2]).toEqual(expect.objectContaining({
      revalidate: 86400,
      tags: ['aoe4-rendered-report:my-slug:230143339'],
    }));
    expect(second.headers.get('cache-control')).toBe('private, max-age=0, must-revalidate');
    expect(second.headers.get('cdn-cache-control')).toBeNull();
  });

  it('returns player-2 perspective allocation visuals without switching line identities', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: '8097972-RepleteCactus', gameId: 231277359 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(makeSwappedPerspectiveColorModel()));

    const request = new Request('http://localhost/matches/8097972-RepleteCactus/231277359?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: '8097972-RepleteCactus',
        gameId: '231277359',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('<span class="age-line" style="border-color:#D85A30"></span>RepleteCactus · Ottomans age-up');
    expect(body).toContain('<span class="age-line dashed" style="border-color:#378ADD"></span>sohaijim2022 · Golden Horde age-up');

    const leaderStrip = extractSvg(body, 'allocation-leader-strip');
    expect(leaderStrip).toMatch(/data-category-key="technology" data-leader="you"[^>]*fill="#D85A30"/);

    const economicLane = extractAllocationLane(body, 'economic');
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#D85A30" stroke-width="2\.4" stroke-linejoin="round" stroke-linecap="round" \/>/);
    expect(economicLane).toMatch(/<path d="[^"]+" fill="none" stroke="#378ADD" stroke-width="2\.4" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" \/>/);

    const allocationSvg = extractSvg(body, 'allocation-comparison');
    expect(allocationSvg).toMatch(/data-age-marker="RepleteCactus · Ottomans Feudal 1:00"[\s\S]*?stroke="#D85A30"[\s\S]*?<\/g>/);
    expect(allocationSvg).toMatch(/data-age-marker="sohaijim2022 · Golden Horde Feudal 2:00"[\s\S]*?stroke="#378ADD"[\s\S]*?stroke-dasharray="7 5"[\s\S]*?<\/g>/);
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

  it('returns a tokenized error document when route parsing fails', async () => {
    parseMatchRouteParams.mockImplementation(() => {
      throw new Error('bad <game> id');
    });

    const response = await GET(new Request('http://localhost/matches/my-slug/not-a-game'), {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: 'not-a-game',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toContain('Unable to load match (500)');
    // Error message is HTML-escaped so injected angle brackets survive
    // as text rather than disappearing into the markup.
    expect(body).toContain('bad &lt;game&gt; id');
    expect(body).not.toContain('bad <game> id');
    expect(body).toContain('--aoe-color-bg: #f7f2e8;');
    expect(body).toContain('--background: var(--aoe-color-bg);');
    expect(body).toContain('--surface: var(--aoe-color-surface);');
    expect(body).toContain('--border: var(--aoe-color-border);');
    expect(body).toContain('--text: var(--aoe-color-text);');
    expect(body).toContain('--muted: var(--aoe-color-muted);');
    expect(body).toContain('font-family: var(--aoe-font-display);');
    expect(body).not.toContain('background: #f7f2e8;');
  });

  it('returns the upstream match-load status when the builder exposes one', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockRejectedValue(Object.assign(
      new Error('AoE4World rate limited the summary request'),
      { status: 429 }
    ));

    const response = await GET(new Request('http://localhost/matches/my-slug/230143339?sig=abc123'), {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(429);
    expect(body).toContain('Match analysis is temporarily delayed');
    expect(body).toContain('AoE4World is rate-limiting match summary requests right now.');
    expect(body).toContain('This match link is valid');
    expect(body).toContain('Cached report unavailable');
    expect(body).toContain('Come back to this exact URL');
    expect(body).toContain('Try again');
    expect(body).toContain('Copy link');
    expect(body).toContain('View sample report');
    expect(body).toContain('AoE4World rate limited the summary request');
  });

  it('returns opportunity-lost buckets in chronological order through the match route', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(addVerboseOpportunityLostBuckets(makeMvpModelFixture())));

    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();
    const payload = extractHoverPayload(body);
    const youLabels = payload[0].bandBreakdown.opportunityLost.you.map((entry: { label: string }) => entry.label);
    const opponentLabels = payload[0].bandBreakdown.opportunityLost.opponent.map((entry: { label: string }) => entry.label);

    expect(response.status).toBe(200);
    expect(youLabels.slice(0, 4)).toEqual(['0:00-0:30', '0:30-1:00', '1:00-1:30', '1:30-2:00']);
    expect(opponentLabels.slice(0, 4)).toEqual(['0:00-0:30', '0:30-1:00', '1:00-1:30', '1:30-2:00']);
    expect(youLabels.at(-1)).toBe('Later opportunity-loss buckets (6)');
    expect(opponentLabels.at(-1)).toBe('Later opportunity-loss buckets (6)');
    expect(youLabels).not.toContain('Other active items (2)');
  });

  it('returns opportunity-lost underproduction in the summary instead of bucket rows through the match route', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(makeUnderproductionOnlyOpportunityLostModel()));

    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();
    const payload = extractHoverPayload(body);

    expect(response.status).toBe(200);
    expect(payload[0].bandBreakdown.opportunityLost.you).toEqual([]);
    expect(payload[0].opportunityLostComponents.underproduction).toEqual(expect.objectContaining({
      you: 1475,
      opponent: 0,
      delta: 1475,
    }));
    expect(payload[0].opportunityLostComponents.gatherDisruption).toEqual(expect.objectContaining({
      you: 0,
      opponent: 0,
      delta: 0,
    }));
    expect(payload[0].opportunityLostComponents.lowUnderproduction).toEqual(expect.objectContaining({
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
    expect(body).toContain('data-opportunity-lost-components');
    expect(body).toContain('<table class="opportunity-lost-components" data-opportunity-lost-components aria-label="Opportunity lost components by civilization" style="--opportunity-you-color:#378ADD;--opportunity-opponent-color:#D85A30" hidden>');
    expect(body).toContain('aria-label="Opportunity lost components by civilization"');
    expect(body).toContain('<th scope="col">English</th>');
    expect(body).toContain('<th scope="col">French</th>');
    expect(body).toContain('<th scope="col">Gap</th>');
    expect(body).toContain('data-opportunity-lost-component="total"');
    expect(body).toContain('<th scope="row">Total</th>');
    expect(body).toContain('data-opportunity-lost-component="underproduction"');
    expect(body).toContain('<span title="Villager underproduction">Under-production</span>');
    expect(body).toContain('data-opportunity-lost-component="gather-disruption"');
    expect(body).toContain('<th scope="row">Gather disruption</th>');
    expect(body).toContain('data-opportunity-lost-component="low-underproduction"');
    expect(body).toContain('<span title="Town-center idle seconds behind expected villager production. Resource loss can be much larger because delayed villagers miss gather time after they would have existed.">TC idle seconds</span>');
    expect(body).toContain('data-opportunity-lost-component-low-underproduction-you>2,213s</strong>');
    expect(body).not.toContain('<th scope="row">Villager underproduction</th>');
  });

  it('returns selected-time opportunity lost values through the match route', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(addGatherDisruptionEvent(makePointInTimeOpportunityLostModel())));

    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123&t=90');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();
    const payload = extractHoverPayload(body);
    const at90 = payload.find((snapshot: { timestamp: number }) => snapshot.timestamp === 90);
    const at180 = payload.find((snapshot: { timestamp: number }) => snapshot.timestamp === 180);

    expect(response.status).toBe(200);
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
    expect(at90.opportunityLostComponents.gatherDisruption).toEqual(expect.objectContaining({
      you: 0,
      opponent: 0,
      delta: 0,
    }));
    expect(at180.opportunityLostComponents.gatherDisruption).toEqual(expect.objectContaining({
      you: 0,
      opponent: 205,
      delta: -205,
    }));
    expect(at180.allocation.opportunityLost.opponent).toBe(
      at180.opportunityLostComponents.villagersLost.opponent +
      at180.opportunityLostComponents.underproduction.opponent +
      at180.opportunityLostComponents.gatherDisruption.opponent
    );
    expect(at90.opportunityLostComponents.lowUnderproduction.you).toBe(30);
    expect(at180.opportunityLostComponents.lowUnderproduction.you).toBe(120);
    expect(body).toContain('resources lost by selected time');
  });

  it('returns event impact details that reconcile villager opportunity without using it for deployed-resource share', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(addEventWindowOpportunityRaid(makeMvpModelFixture())));

    const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123&t=943');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();
    const lossTable = extractEventLossTable(body);

    expect(response.status).toBe(200);
    expect(body).toContain('data-significant-event-loss-total="player2">10,620</td>');
    expect(body).toContain('data-significant-event-loss-immediate="player2">1,479</td>');
    expect(body).toContain('data-significant-event-loss-villager-opportunity="player2">9,141</td>');
    expect(body).toContain('data-significant-event-loss-share="player2">12.0%</td>');
    expect(body).toContain('Immediate loss share of deployed resources');
    expect(lossTable).toContain('Villager opportunity');
    expect(lossTable).toContain('event-impact-loss-value">9,141</td>');
    expect(lossTable).not.toContain('event-impact-loss-empty-side-player1');
  });

  it('returns uncached HTML when Next refuses to persist an oversized rendered report', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue('<!doctype html><html><body>large report rendered</body></html>');
    mockUnstableCache.mockImplementation((callback: () => Promise<string>) => async () => {
      await callback();
      throw new Error('Failed to set Next.js data cache for unstable_cache large-report, items over 2MB can not be cached');
    });

    const response = await GET(new Request('http://localhost/matches/my-slug/230143339?sig=abc123'), {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('large report rendered');
    expect(buildMatchHtml).toHaveBeenCalledTimes(1);
  });

  describe('cache headers', () => {
    beforeEach(() => {
      parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
      buildMatchHtml.mockResolvedValue('<!doctype html><html><body>ok</body></html>');
    });

    it('signed (private) responses tell browsers to revalidate and skip the CDN', async () => {
      const request = new Request('http://localhost/matches/my-slug/230143339?sig=abc123');
      const response = await GET(request, {
        params: Promise.resolve({ profileSlug: 'my-slug', gameId: '230143339' }),
      });

      expect(response.headers.get('cache-control')).toBe('private, max-age=0, must-revalidate');
      expect(response.headers.get('cdn-cache-control')).toBeNull();
    });

    it('public responses tell browsers to revalidate and let the CDN cache', async () => {
      const request = new Request('http://localhost/matches/my-slug/230143339');
      const response = await GET(request, {
        params: Promise.resolve({ profileSlug: 'my-slug', gameId: '230143339' }),
      });

      expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
      expect(response.headers.get('cdn-cache-control')).toBe(
        'public, s-maxage=86400, stale-while-revalidate=604800'
      );
    });

    it('disables caching entirely in development', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
      try {
        const request = new Request('http://localhost/matches/my-slug/230143339');
        const response = await GET(request, {
          params: Promise.resolve({ profileSlug: 'my-slug', gameId: '230143339' }),
        });

        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('cdn-cache-control')).toBeNull();
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true });
      }
    });
  });
});
