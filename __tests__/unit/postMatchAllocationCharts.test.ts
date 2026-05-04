import {
  buildAllocationLeaderStripSvg,
  buildStrategyAllocationSvg,
  type AllocationChartSnapshot,
  type AllocationGraphKey,
  type AllocationLeaderSegment,
} from '../../packages/aoe4-core/src/formatters/postMatchAllocationCharts';
import type { AgeMarker, PostMatchPlayerDisplay, SignificantTimelineEvent } from '../../packages/aoe4-core/src/analysis/postMatchViewModel';

const labels: Record<'you' | 'opponent', PostMatchPlayerDisplay> = {
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

function row(you: number, opponent: number, youShare = you, opponentShare = opponent) {
  return {
    you,
    opponent,
    delta: you - opponent,
    youShare,
    opponentShare,
    shareDelta: youShare - opponentShare,
  };
}

const allocation = {
  economic: row(70, 30, 70, 30),
  technology: row(10, 20, 10, 20),
  military: row(20, 50, 20, 50),
  destroyed: row(40, 10),
  overall: row(100, 90),
  float: row(5, 3),
  opportunityLost: row(0, 25),
} satisfies Record<AllocationGraphKey, ReturnType<typeof row>>;

function extractSignificantEventMarker(svg: string): string {
  const match = svg.match(/<g class="significant-event-marker hover-target"[\s\S]*?<\/g>/);
  if (!match) throw new Error('Expected significant event marker');
  return match[0];
}

const significantEvent = {
  id: 'loss-1',
  timestamp: 30,
  windowStart: 20,
  windowEnd: 40,
  kind: 'raid',
  victim: 'you',
  label: 'Raid',
  timeLabel: '0:30',
  headline: 'Villagers picked off',
  description: 'A raid created the first significant resource loss.',
} as SignificantTimelineEvent;

const ageMarker: AgeMarker = {
  player: 'you',
  age: 'Feudal',
  timestamp: 20,
  label: 'Player One Feudal',
  shortLabel: 'Feudal',
  timeLabel: '0:20',
};

describe('post-match allocation chart SVG builders', () => {
  it('renders leader-strip segments from caller-provided leader data', () => {
    const segments: AllocationLeaderSegment[] = [
      {
        categoryKey: 'economic',
        start: 0,
        end: 30,
        hoverTimestamp: 30,
        leader: 'you',
        you: 70,
        opponent: 30,
      },
    ];

    const html = buildAllocationLeaderStripSvg(segments, 60, labels);

    expect(html).toContain('id="allocation-leader-strip"');
    expect(html).toContain('data-allocation-leader-segment');
    expect(html).toContain('data-category-key="economic"');
    expect(html).toContain('fill="#378ADD"');
  });

  it('renders the allocation chart with hover, age, and significant-event layers', () => {
    const snapshots: AllocationChartSnapshot[] = [
      {
        timestamp: 30,
        timeLabel: '0:30',
        strategyX: 538,
        allocation,
        significantEvent,
      },
    ];

    const html = buildStrategyAllocationSvg(snapshots, 60, [ageMarker], labels);

    expect(html).toContain('id="allocation-comparison"');
    expect(html).toContain('data-hover-timestamp="30"');
    expect(html).toContain('data-age-marker="Player One Feudal"');
    expect(html).toContain('data-significant-event-marker');
    expect(extractSignificantEventMarker(html)).toMatch(/<circle class="significant-event-dot"[^>]*fill="#D85A30"/);
    expect(html).toContain('data-significant-event-window');
    expect(html).toContain('data-significant-event-id="loss-1"');
    expect(html).toContain('class="significant-event-window"');
    expect(html).toContain('display="none"');
    expect(html).toContain('Economic');
  });
});
