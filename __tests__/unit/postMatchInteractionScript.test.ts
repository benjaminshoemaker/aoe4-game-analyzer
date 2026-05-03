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
    low_underproduction: { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 },
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

function runTooltipScriptInDom(script: string): {
  window: any;
  bandButton: HTMLElement;
  helpButton: HTMLElement;
  tooltip: HTMLElement;
} {
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const html = `<!doctype html><html><body>
    <aside id="hover-inspector" class="hover-inspector">
      <div data-hover-field="timeLabel">0:00</div>
      <div data-hover-context></div>
      <div class="destroyed-row-label">
        <button type="button" class="band-toggle" data-band-key="militaryDestroyed" aria-pressed="false">
          <span class="legend-dot destroyed-dot"></span><span data-destroyed-row-label>Military destroyed</span>
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
    </aside>
    <script id="post-match-hover-data" type="application/json">${JSON.stringify([snapshot])}</script>
  </body></html>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const win = dom.window;
  const scriptMatch = script.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) throw new Error('script body not found');
  win.eval(scriptMatch[1]);
  return {
    window: win,
    bandButton: win.document.querySelector('.band-toggle[data-band-key="militaryDestroyed"]')! as HTMLElement,
    helpButton: win.document.querySelector('[data-destroyed-help-button]')! as HTMLElement,
    tooltip: win.document.getElementById('destroyed-row-tooltip-military')! as HTMLElement,
  };
}

describe('post-match interaction script formatter', () => {
  it('renders the inline payload and URL-state interaction code without external hover fetches', () => {
    const script = buildHoverInteractionScript([snapshot], labels);

    expect(script).toContain('id="post-match-hover-data"');
    expect(script).toContain('searchParams.set');
    expect(script).toContain('searchParams.delete');
    expect(script).toContain('data-opportunity-lost-component-low-underproduction-you');
    expect(script).not.toContain('payloadSourceUrl');
    expect(script).not.toContain('fetch(payloadSourceUrl');
  });

  it('opens destroyed-row help only after the help icon is clicked', () => {
    const script = buildHoverInteractionScript([snapshot], labels);
    const dom = runTooltipScriptInDom(script);

    expect(dom.helpButton.hasAttribute('data-band-key')).toBe(false);
    expect(dom.helpButton.getAttribute('data-tooltip-open')).toBe('false');
    expect(dom.helpButton.getAttribute('aria-expanded')).toBe('false');
    expect(dom.tooltip.hidden).toBe(true);

    dom.helpButton.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
    expect(dom.helpButton.getAttribute('data-tooltip-open')).toBe('false');
    expect(dom.tooltip.hidden).toBe(true);

    dom.bandButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.bandButton.getAttribute('aria-pressed')).toBe('true');
    expect(dom.helpButton.getAttribute('data-tooltip-open')).toBe('false');
    expect(dom.tooltip.hidden).toBe(true);

    dom.helpButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.helpButton.getAttribute('data-tooltip-open')).toBe('true');
    expect(dom.helpButton.getAttribute('aria-expanded')).toBe('true');
    expect(dom.tooltip.hidden).toBe(false);

    dom.helpButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(dom.helpButton.getAttribute('data-tooltip-open')).toBe('false');
    expect(dom.helpButton.getAttribute('aria-expanded')).toBe('false');
    expect(dom.tooltip.hidden).toBe(true);
  });
});
