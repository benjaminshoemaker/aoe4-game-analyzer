import { buildHoverInteractionScript } from '../../packages/aoe4-core/src/formatters/postMatchInteractionScript';
import type { ClientHoverSnapshot, RenderPlayerLabels } from '../../packages/aoe4-core/src/formatters/postMatchHtml';

const labels: RenderPlayerLabels = {
  you: {
    name: 'Player One',
    civilization: 'English',
    label: 'Player One · English',
    shortLabel: 'Player One',
    compactLabel: 'English',
    compactShortLabel: 'English',
    ageLabel: 'Player One · English',
    ageShortLabel: 'Player One',
    color: '#378ADD',
  },
  opponent: {
    name: 'Player Two',
    civilization: 'French',
    label: 'Player Two · French',
    shortLabel: 'Player Two',
    compactLabel: 'French',
    compactShortLabel: 'French',
    ageLabel: 'Player Two · French',
    ageShortLabel: 'Player Two',
    color: '#D85A30',
  },
};

const snapshot: ClientHoverSnapshot = {
  timestamp: 0,
  timeLabel: '0:00',
  strategyX: 96,
  markers: [],
  you: {
    economic: 1,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total: 1,
  },
  opponent: {
    economic: 1,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total: 1,
  },
  delta: {
    economic: 0,
    populationCap: 0,
    militaryCapacity: 0,
    militaryActive: 0,
    defensive: 0,
    research: 0,
    advancement: 0,
    total: 0,
  },
  allocation: {
    economic: { you: 1, opponent: 1, delta: 0, youShare: 100, opponentShare: 100, shareDelta: 0 },
    technology: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    military: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    other: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    destroyed: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    overall: { you: 1, opponent: 1, delta: 0, youShare: 100, opponentShare: 100, shareDelta: 0 },
    float: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    opportunityLost: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
  },
  allocationCategory: {
    economic: {
      net: { you: 1, opponent: 1, delta: 0, youShare: 100, opponentShare: 100, shareDelta: 0 },
      destroyed: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      investment: { you: 1, opponent: 1, delta: 0, youShare: 100, opponentShare: 100, shareDelta: 0 },
    },
    technology: {
      net: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      destroyed: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      investment: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    },
    military: {
      net: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      destroyed: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      investment: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    },
    other: {
      net: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      destroyed: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
      investment: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    },
  },
  opportunityLostComponents: {
    villagersLost: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    underproduction: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
    lowUnderproduction: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
  },
  totalPoolTooltip: 'total',
  strategy: {
    economy: { you: 100, opponent: 100, delta: 0 },
    military: { you: 0, opponent: 0, delta: 0 },
    technology: { you: 0, opponent: 0, delta: 0 },
  },
  gather: { you: 0, opponent: 0, delta: 0 },
  significantEvent: null,
  bandBreakdown: {
    economic: { you: [], opponent: [] },
    populationCap: { you: [], opponent: [] },
    militaryCapacity: { you: [], opponent: [] },
    militaryActive: { you: [], opponent: [] },
    defensive: { you: [], opponent: [] },
    research: { you: [], opponent: [] },
    advancement: { you: [], opponent: [] },
  },
};

const eventSnapshot: ClientHoverSnapshot = {
  ...snapshot,
  timestamp: 150,
  timeLabel: '2:30',
  strategyX: 240,
  significantEvent: {
    id: 'evt-1',
    timestamp: 150,
    timeLabel: '2:30',
    label: 'Raid',
    description: 'Lost a villager',
    headline: 'Lost a villager',
    kind: 'raid',
    victim: 'opponent',
    victimLabel: 'Player Two',
    victimCivilization: 'French',
    actorLabel: 'Player One',
    actorCivilization: 'English',
    player1Civilization: 'English',
    player1Label: 'Player One',
    player2Civilization: 'French',
    player2Label: 'Player Two',
    villagerDeaths: 1,
    immediateLoss: 50,
    grossLoss: 50,
    pctOfDeployed: 5,
    villagerOpportunityLoss: 0,
    encounterLosses: { player1: [], player2: [] },
    playerImpacts: {
      player1: { grossLoss: 0, immediateLoss: 0, pctOfDeployed: 0, villagerOpportunityLoss: 0 },
      player2: { grossLoss: 50, immediateLoss: 50, pctOfDeployed: 5, villagerOpportunityLoss: 0 },
    },
    preEncounterArmies: null,
  } as any,
  markers: ['Raid'],
};

function runScriptInDom(script: string, hoverPoints: ClientHoverSnapshot[], analyticsCapture?: jest.Mock): {
  window: any;
  inspector: HTMLElement;
  marker: HTMLElement;
  hoverRect: HTMLElement;
} {
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const html = `<!doctype html><html><body>
    <aside id="hover-inspector" class="hover-inspector" style="position: sticky; max-height: 300px; overflow: auto;">
      <div data-hover-field="timeLabel">0:00</div>
      <div data-hover-context></div>
      <div class="destroyed-row-label">
        <button type="button" class="band-toggle" data-band-key="militaryDestroyed" aria-pressed="false">
          <span data-destroyed-row-tooltip>Military destroyed</span>
        </button>
        <button
          type="button"
          class="event-impact-help-button destroyed-row-help-button"
          data-destroyed-help-button
          data-tooltip-open="false"
          aria-expanded="false"
          aria-controls="destroyed-row-tooltip-military"
        >?</button>
        <span id="destroyed-row-tooltip-military" class="destroyed-row-tooltip" role="tooltip" hidden>Destroyed rows help.</span>
      </div>
      <button type="button" class="band-toggle" data-band-key="economic" aria-pressed="false">Economic</button>
      <button type="button" class="allocation-category-toggle" data-allocation-category-toggle="military" aria-expanded="false">Military</button>
      <input type="range" data-mobile-timeline-slider value="0" />
      <button type="button" data-mobile-timeline-step="1">Next</button>
	      <details data-mobile-details open>
	        <summary>Event details</summary>
	      </details>
	      <div data-significant-event-loss-heading="player1"></div>
	      <div data-significant-event-loss-heading="player2"></div>
	      <dl>
	        <dt data-significant-event-loss-share-label="player1"></dt>
	        <dd data-significant-event-loss-total="player1"></dd>
	        <dd data-significant-event-loss-immediate="player1"></dd>
	        <div data-significant-event-loss-gather-disruption-row="player1" hidden>
	          <button type="button" data-significant-event-loss-gather-disruption-help="player1"></button>
	          <dd data-significant-event-loss-gather-disruption="player1"></dd>
	        </div>
	        <dd data-significant-event-loss-villager-opportunity="player1"></dd>
	        <dd data-significant-event-loss-share="player1"></dd>
	        <dt data-significant-event-loss-share-label="player2"></dt>
	        <dd data-significant-event-loss-total="player2"></dd>
	        <dd data-significant-event-loss-immediate="player2"></dd>
	        <div data-significant-event-loss-gather-disruption-row="player2" hidden>
	          <button type="button" data-significant-event-loss-gather-disruption-help="player2"></button>
	          <dd data-significant-event-loss-gather-disruption="player2"></dd>
	        </div>
	        <dd data-significant-event-loss-villager-opportunity="player2"></dd>
	        <dd data-significant-event-loss-share="player2"></dd>
	      </dl>
	      <div data-significant-event-loss-villager-opportunity-row="player1"></div>
	      <div data-significant-event-loss-villager-opportunity-row="player2"></div>
	      <ul data-significant-event-loss-list="player1"></ul>
	      <ul data-significant-event-loss-list="player2"></ul>
	      <div data-significant-event-armies hidden>
	        <div data-significant-event-army-heading="player1"></div>
	        <dd data-significant-event-army-total="player1"></dd>
	        <ul data-significant-event-army-list="player1"></ul>
	        <div data-significant-event-army-heading="player2"></div>
	        <dd data-significant-event-army-total="player2"></dd>
	        <ul data-significant-event-army-list="player2"></ul>
	        <div data-significant-event-army-end-heading="player1"></div>
	        <dd data-significant-event-army-end-total="player1"></dd>
	        <ul data-significant-event-army-end-list="player1"></ul>
	        <div data-significant-event-army-end-heading="player2"></div>
	        <dd data-significant-event-army-end-total="player2"></dd>
	        <ul data-significant-event-army-end-list="player2"></ul>
	      </div>
	      <button type="button" data-significant-event-underdog-toggle>Why notable</button>
      <details data-significant-event-underdog-details>
        <summary>Why this fight is notable</summary>
        <p data-significant-event-underdog-details-text></p>
      </details>
      <strong data-opportunity-lost-component-low-underproduction-you></strong>
      <strong data-opportunity-lost-component-low-underproduction-opponent></strong>
      <strong data-opportunity-lost-component-low-underproduction-delta></strong>
      <div style="height: 800px;"></div>
    </aside>
    <svg>
      <rect class="hover-target strategy-hover-target" data-hover-timestamp="150" x="0" y="40" width="20" height="200" />
      <rect class="hover-target strategy-hover-target" data-hover-timestamp="0" x="20" y="40" width="20" height="200" />
      <g class="significant-event-marker hover-target" data-significant-event-marker data-hover-timestamp="150" tabindex="0" role="button">
        <rect class="significant-event-hit" x="5" y="14" width="20" height="20" fill="transparent" pointer-events="all" />
        <circle class="significant-event-dot" cx="15" cy="24" r="10" />
      </g>
    </svg>
    <a class="recap-link" href="https://aoe4world.com/players/1/games/2?sig=private-token">AoE4World summary</a>
    <a class="recap-link feedback-link" href="https://www.reddit.com/user/shoe7525/">Feedback? DM me on Reddit</a>
    <script id="post-match-hover-data" type="application/json">${JSON.stringify(hoverPoints)}</script>
  </body></html>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const win = dom.window;
  if (analyticsCapture) {
    (win as any).aoe4Analytics = { capture: analyticsCapture };
  }
  // Stub scrollIntoView, which JSDOM does not implement.
  win.HTMLElement.prototype.scrollIntoView = function () {
    (this as any).__scrolledIntoView = true;
  };
  const scriptMatch = script.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) throw new Error('script body not found');
  win.eval(scriptMatch[1]);
  return {
    window: win,
    inspector: win.document.getElementById('hover-inspector')!,
    marker: win.document.querySelector('[data-significant-event-marker]')! as HTMLElement,
    hoverRect: win.document.querySelector('.strategy-hover-target[data-hover-timestamp="150"]')! as HTMLElement,
  };
}

describe('post-match interaction script formatter', () => {
  it('renders the inline payload and URL-state interaction code without external hover fetches', () => {
    const script = buildHoverInteractionScript([snapshot], labels);

    expect(script).toContain('id="post-match-hover-data"');
    expect(script).toContain('searchParams.set');
    expect(script).toContain('searchParams.delete');
    expect(script).toContain('data-opportunity-lost-component-low-underproduction-you');
    expect(script).toContain('formatSeconds(lowUnderproduction.you)');
    expect(script).toContain('formatSignedSeconds(lowUnderproduction.delta)');
    expect(script).not.toContain('payloadSourceUrl');
    expect(script).not.toContain('fetch(payloadSourceUrl');
  });

  it('renders low-underproduction as seconds when hover state changes', () => {
    const point = {
      ...snapshot,
      opportunityLostComponents: {
        ...snapshot.opportunityLostComponents,
        lowUnderproduction: {
          you: 82,
          opponent: 94,
          delta: -12,
          youShare: 0,
          opponentShare: 0,
          shareDelta: 0,
        },
      },
    };
    const script = buildHoverInteractionScript([point], labels);
    const { window } = runScriptInDom(script, [point]);

    expect(window.document.querySelector('[data-opportunity-lost-component-low-underproduction-you]')?.textContent)
      .toBe('82s');
    expect(window.document.querySelector('[data-opportunity-lost-component-low-underproduction-opponent]')?.textContent)
      .toBe('94s');
    expect(window.document.querySelector('[data-opportunity-lost-component-low-underproduction-delta]')?.textContent)
      .toBe('-12s');
  });

  it('renders gather disruption under immediate loss without a synthetic count when hover state changes', () => {
    const point: ClientHoverSnapshot = {
      ...eventSnapshot,
      significantEvent: {
        ...eventSnapshot.significantEvent!,
        encounterLosses: {
          player1: [],
          player2: [
            { label: 'Yatai', value: 125, count: 1, band: 'economic' },
            {
              label: 'Gather disruption',
              value: 205,
              count: 0,
              band: 'economic',
              showCount: false,
              title: 'Gather/min fell from 1,104 to 656 during this event window; row value is 205 resources of shortfall, equivalent to roughly 307 villager-seconds.',
            },
          ],
        },
        playerImpacts: {
          player1: {
            grossLoss: 0,
            immediateLoss: 0,
            pctOfDeployed: 0,
            villagerOpportunityLoss: 0,
            denominator: 1000,
            villagerDeaths: 0,
            losses: [],
            topLosses: [],
          },
          player2: {
            grossLoss: 125,
            immediateLoss: 125,
            pctOfDeployed: 5,
            villagerOpportunityLoss: 0,
            denominator: 1000,
            villagerDeaths: 0,
            losses: [{ label: 'Yatai', value: 125, count: 1, band: 'economic' }],
            topLosses: [{ label: 'Yatai', value: 125, count: 1, band: 'economic' }],
            gatherDisruption: {
              label: 'Gather disruption',
              value: 205,
              baselineRatePerMin: 1104,
              minRatePerMin: 656,
              dropPercent: 40.6,
              idleEquivalentVillagerSeconds: 307,
              windowStart: 60,
              windowEnd: 120,
            },
          },
        },
      },
    };
    const script = buildHoverInteractionScript([point], labels);
    const { window } = runScriptInDom(script, [point]);
    const player2Losses = window.document.querySelector('[data-significant-event-loss-list="player2"]')?.innerHTML ?? '';
    const gatherRow = window.document.querySelector('[data-significant-event-loss-gather-disruption-row="player2"]') as HTMLElement;
    const gatherValue = window.document.querySelector('[data-significant-event-loss-gather-disruption="player2"]') as HTMLElement;
    const gatherHelp = window.document.querySelector('[data-significant-event-loss-gather-disruption-help="player2"]') as HTMLElement;

    expect(player2Losses).toContain('Yatai x1');
    expect(player2Losses).toContain('Gather disruption');
    expect(player2Losses).toContain('event-impact-loss-value">205</span>');
    expect(player2Losses).not.toContain('event-impact-loss-note');
    expect(window.document.querySelector('[data-significant-event-loss-total="player2"]')?.textContent).toBe('330');
    expect(window.document.querySelector('[data-significant-event-loss-immediate="player2"]')?.textContent).toBe('125');
    expect(gatherRow.hidden).toBe(false);
    expect(gatherValue.textContent).toBe('205');
    expect(gatherHelp.getAttribute('title')).toBe('Gather/min fell from 1,104 to 656 during this event window; row value is 205 resources of shortfall, equivalent to roughly 307 villager-seconds.');
    expect(window.document.querySelector('[data-significant-event-loss-share-label="player2"]')?.textContent).toBe('Share of Deployed Resources Lost');
    expect(player2Losses).not.toContain('Gather disruption x0');
    expect(player2Losses).not.toContain('Gather disruption x1');
  });

  it('renders event-window start and end armies when hover state changes', () => {
    const point: ClientHoverSnapshot = {
      ...eventSnapshot,
      significantEvent: {
        ...eventSnapshot.significantEvent!,
        kind: 'fight',
        preEncounterArmies: {
          player1: {
            totalValue: 1300,
            units: [{ label: 'Longbowman', value: 960, count: 12, band: 'militaryActive' }],
          },
          player2: {
            totalValue: 640,
            units: [{ label: 'Knight', value: 480, count: 2, band: 'militaryActive' }],
          },
        },
        postEncounterArmies: {
          player1: {
            totalValue: 1140,
            units: [{ label: 'Longbowman', value: 960, count: 12, band: 'militaryActive' }],
          },
          player2: {
            totalValue: 400,
            units: [{ label: 'Knight', value: 240, count: 1, band: 'militaryActive' }],
          },
        },
      } as any,
    };
    const script = buildHoverInteractionScript([point], labels);
    const { window } = runScriptInDom(script, [point]);

    expect(window.document.querySelector('[data-significant-event-armies]')?.hidden).toBe(false);
    expect(window.document.querySelector('[data-significant-event-army-heading="player1"]')?.textContent)
      .toBe('Player One Army');
    expect(window.document.querySelector('[data-significant-event-army-total="player1"]')?.textContent)
      .toBe('1,300');
    expect(window.document.querySelector('[data-significant-event-army-end-heading="player2"]')?.textContent)
      .toBe('Player Two Army');
    expect(window.document.querySelector('[data-significant-event-army-end-total="player2"]')?.textContent)
      .toBe('400');
    expect(window.document.querySelector('[data-significant-event-army-end-list="player2"]')?.innerHTML)
      .toContain('Knight x1');
  });

  it('exposes the helpers needed to reset the hover inspector to the top on a significant event click', () => {
    const script = buildHoverInteractionScript([snapshot], labels);

    expect(script).toContain('function resetInspectorScrollToTop()');
    expect(script).toContain("document.querySelectorAll('.hover-inspector').forEach");
    expect(script).toContain('inspector.scrollTop = 0;');
    // Robust handler: detects a significant-event click both directly via the
    // marker's data attribute AND via the snapshot when a sibling hover target
    // intercepted the pointer.
    expect(script).toContain('function shouldResetInspectorScrollForChartClick(target, timestamp)');
    expect(script).toContain("target.hasAttribute('data-significant-event-marker')");
    expect(script).toContain('snapshotHasSignificantEventAtTimestamp(nearest)');
    expect(script).toContain("selectTimestamp(selectedTimestamp, true, shouldResetInspectorScroll, 'chart');");
  });

  it('opens destroyed-row help only after the help icon is clicked', () => {
    const script = buildHoverInteractionScript([snapshot], labels);
    const dom = runScriptInDom(script, [snapshot]);
    const bandButton = dom.window.document.querySelector('.band-toggle[data-band-key="militaryDestroyed"]') as HTMLElement;
    const button = dom.window.document.querySelector('[data-destroyed-help-button]') as HTMLElement;
    const tooltip = dom.window.document.getElementById('destroyed-row-tooltip-military') as HTMLElement;

    expect(button.hasAttribute('data-band-key')).toBe(false);
    expect(button.getAttribute('data-tooltip-open')).toBe('false');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(tooltip.hidden).toBe(true);

    button.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
    expect(button.getAttribute('data-tooltip-open')).toBe('false');
    expect(tooltip.hidden).toBe(true);

    bandButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(bandButton.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-tooltip-open')).toBe('false');
    expect(tooltip.hidden).toBe(true);

    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(button.getAttribute('data-tooltip-open')).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(tooltip.hidden).toBe(false);

    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(button.getAttribute('data-tooltip-open')).toBe('false');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(tooltip.hidden).toBe(true);
  });

  it('resets inspector scroll when a click on the strategy-hover-target overlaps a significant event timestamp', () => {
    const script = buildHoverInteractionScript([eventSnapshot, snapshot], labels);
    const dom = runScriptInDom(script, [eventSnapshot, snapshot]);
    dom.inspector.scrollTop = 200;
    expect(dom.inspector.scrollTop).toBe(200);

    // Clicking the strategy-hover-target that shares the event's timestamp
    // (i.e. the typical interception scenario when the user clicks on the
    // marker stem) must still reset the inspector scrollTop to 0.
    dom.hoverRect.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.inspector.scrollTop).toBe(0);
    expect(dom.window.document.body.getAttribute('data-hover-pinned')).toBe('true');
  });

  it('resets inspector scroll when the marker <g> click handler runs directly', () => {
    const script = buildHoverInteractionScript([eventSnapshot, snapshot], labels);
    const dom = runScriptInDom(script, [eventSnapshot, snapshot]);
    dom.inspector.scrollTop = 150;

    dom.marker.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.inspector.scrollTop).toBe(0);
  });

  it('does not reset inspector scroll when the user clicks a snapshot column without a significant event', () => {
    const script = buildHoverInteractionScript([eventSnapshot, snapshot], labels);
    const dom = runScriptInDom(script, [eventSnapshot, snapshot]);
    dom.inspector.scrollTop = 175;
    const noEventRect = dom.window.document.querySelector(
      '.strategy-hover-target[data-hover-timestamp="0"]'
    ) as HTMLElement;
    noEventRect.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.inspector.scrollTop).toBe(175);
  });

  it('falls back to scrollIntoView when the inspector is not sticky (responsive layout)', () => {
    const script = buildHoverInteractionScript([eventSnapshot, snapshot], labels);
    const dom = runScriptInDom(script, [eventSnapshot, snapshot]);
    // Switch to the responsive-layout case: position: static.
    dom.inspector.setAttribute('style', 'position: static; max-height: none;');
    dom.inspector.scrollTop = 0;

    dom.marker.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect((dom.inspector as any).__scrolledIntoView).toBe(true);
  });

  it('captures explicit analytics events for selected timestamps and controls', () => {
    const script = buildHoverInteractionScript([eventSnapshot, snapshot], labels);
    const capture = jest.fn();
    const dom = runScriptInDom(script, [eventSnapshot, snapshot], capture);

    dom.hoverRect.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('timestamp selected', expect.objectContaining({
      timestamp: 150,
      time_label: '2:30',
      source: 'chart',
      has_significant_event: true,
    }));

    const economicBand = dom.window.document.querySelector('.band-toggle[data-band-key="economic"]') as HTMLElement;
    economicBand.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('band filter changed', expect.objectContaining({
      band_key: 'economic',
    }));

    const categoryButton = dom.window.document.querySelector('[data-allocation-category-toggle="military"]') as HTMLElement;
    categoryButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('allocation category toggled', expect.objectContaining({
      category_key: 'military',
      expanded: true,
    }));

    const eventHelp = dom.window.document.querySelector('[data-significant-event-underdog-toggle]') as HTMLElement;
    eventHelp.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('event explanation opened', expect.objectContaining({
      timestamp: 150,
      significant_event_id: 'evt-1',
    }));

    const mobileSlider = dom.window.document.querySelector('[data-mobile-timeline-slider]') as HTMLInputElement;
    mobileSlider.value = '1';
    mobileSlider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('mobile timeline changed', expect.objectContaining({
      source: 'mobile-slider',
      timestamp: 0,
      target_index: 1,
    }));

    const mobileStep = dom.window.document.querySelector('[data-mobile-timeline-step="1"]') as HTMLElement;
    mobileStep.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('mobile timeline changed', expect.objectContaining({
      source: 'mobile-step',
      step: 1,
    }));

    const summaryLink = dom.window.document.querySelector('.recap-link:not(.feedback-link)') as HTMLElement;
    summaryLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    summaryLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(capture).toHaveBeenCalledWith('match outbound link clicked', expect.objectContaining({
      link_kind: 'aoe4world-summary',
      destination_host: 'aoe4world.com',
      destination_path: '/players/1/games/2',
      timestamp: 0,
    }));
    expect(JSON.stringify(capture.mock.calls)).not.toContain('private-token');
  });
});
