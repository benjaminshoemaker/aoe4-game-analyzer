import { buildHoverInteractionScript } from '../../packages/aoe4-core/src/formatters/postMatchInteractionScript';
import type { ClientHoverSnapshot, RenderPlayerLabels } from '../../packages/aoe4-core/src/formatters/postMatchHtml';

const labels: RenderPlayerLabels = {
  you: {
    name: 'Player One',
    civilization: 'English',
    label: 'Player One - English',
    shortLabel: 'Player One',
    compactLabel: 'English',
    compactShortLabel: 'English',
    ageLabel: 'Player One - English',
    ageShortLabel: 'Player One',
    color: '#378ADD',
  },
  opponent: {
    name: 'Player Two',
    civilization: 'French',
    label: 'Player Two - French',
    shortLabel: 'Player Two',
    compactLabel: 'French',
    compactShortLabel: 'French',
    ageLabel: 'Player Two - French',
    ageShortLabel: 'Player Two',
    color: '#D85A30',
  },
};

function row(you = 0, opponent = 0) {
  return { you, opponent, delta: you - opponent, youShare: you, opponentShare: opponent, shareDelta: you - opponent };
}

function makeSnapshot(timestamp: number, significantEvent: ClientHoverSnapshot['significantEvent']): ClientHoverSnapshot {
  return {
    timestamp,
    timeLabel: timestamp === 150 ? '2:30' : '0:00',
    strategyX: timestamp === 150 ? 240 : 96,
    markers: significantEvent ? ['Raid'] : [],
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
      economic: row(1, 1),
      technology: row(),
      military: row(),
      other: row(),
      destroyed: row(),
      overall: row(1, 1),
      float: row(),
      opportunityLost: row(),
    },
    allocationCategory: {
      economic: { net: row(1, 1), destroyed: row(), investment: row(1, 1) },
      technology: { net: row(), destroyed: row(), investment: row() },
      military: { net: row(), destroyed: row(), investment: row() },
      other: { net: row(), destroyed: row(), investment: row() },
    },
    opportunityLostComponents: {
      villagersLost: row(),
      underproduction: row(),
      low_underproduction: row(),
    },
    totalPoolTooltip: 'total',
    strategy: {
      economy: { you: 100, opponent: 100, delta: 0 },
      military: { you: 0, opponent: 0, delta: 0 },
      technology: { you: 0, opponent: 0, delta: 0 },
    },
    gather: { you: 0, opponent: 0, delta: 0 },
    significantEvent,
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
}

const significantEvent = {
  id: 'evt-1',
  timestamp: 150,
  windowStart: 120,
  windowEnd: 180,
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
} as any;

function runScriptInDom(hoverPoints: ClientHoverSnapshot[]) {
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const script = buildHoverInteractionScript(hoverPoints, labels);
  const html = `<!doctype html><html><body>
    <svg>
      <rect class="hover-target strategy-hover-target" data-hover-timestamp="150" />
      <rect class="hover-target strategy-hover-target" data-hover-timestamp="0" />
      <rect class="significant-event-window" data-significant-event-window data-significant-event-id="evt-1" display="none" />
      <rect class="significant-event-window" data-significant-event-window data-significant-event-id="evt-2" display="none" />
    </svg>
    <script id="post-match-hover-data" type="application/json">${JSON.stringify(hoverPoints)}</script>
  </body></html>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/match' });
  const scriptMatch = script.match(/<script>([\s\S]*?)<\/script>\s*$/);
  if (!scriptMatch) throw new Error('script body not found');
  dom.window.eval(scriptMatch[1]);
  return dom;
}

describe('significant event window spotlight', () => {
  it('shows only the selected significant-event window', () => {
    const eventSnapshot = makeSnapshot(150, significantEvent);
    const normalSnapshot = makeSnapshot(0, null);
    const dom = runScriptInDom([eventSnapshot, normalSnapshot]);
    const eventWindow = dom.window.document.querySelector('[data-significant-event-id="evt-1"]') as Element;
    const otherWindow = dom.window.document.querySelector('[data-significant-event-id="evt-2"]') as Element;
    const normalTarget = dom.window.document.querySelector('[data-hover-timestamp="0"]') as HTMLElement;
    const eventTarget = dom.window.document.querySelector('[data-hover-timestamp="150"]') as HTMLElement;

    expect(eventWindow.hasAttribute('display')).toBe(false);
    expect(eventWindow.getAttribute('aria-hidden')).toBe('false');
    expect(otherWindow.getAttribute('display')).toBe('none');

    normalTarget.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(eventWindow.getAttribute('display')).toBe('none');
    expect(eventWindow.getAttribute('aria-hidden')).toBe('true');
    expect(otherWindow.getAttribute('display')).toBe('none');

    eventTarget.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    expect(eventWindow.hasAttribute('display')).toBe(false);
    expect(eventWindow.getAttribute('aria-hidden')).toBe('false');
    expect(otherWindow.getAttribute('display')).toBe('none');
  });
});
