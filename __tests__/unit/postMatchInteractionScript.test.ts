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

describe('post-match interaction script formatter', () => {
  it('renders the inline payload and URL-state interaction code without external hover fetches', () => {
    const script = buildHoverInteractionScript([snapshot], labels);

    expect(script).toContain('id="post-match-hover-data"');
    expect(script).toContain('searchParams.set');
    expect(script).toContain('searchParams.delete');
    expect(script).not.toContain('payloadSourceUrl');
    expect(script).not.toContain('fetch(payloadSourceUrl');
  });
});
