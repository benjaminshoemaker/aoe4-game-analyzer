import { classifyBetShape, detectRaidEvents, buildOneLineStory, buildAgeMarkers } from '../../src/analysis/postMatchViewModel';
import { GameSummary } from '../../src/parser/gameSummaryParser';

describe('classifyBetShape', () => {
  it('classifies economic-heavy when economic share is >= 60%', () => {
    const bet = classifyBetShape({
      economic: 0.62,
      populationCap: 0.06,
      militaryCapacity: 0.12,
      militaryActive: 0.1,
      defensive: 0.05,
      research: 0.03,
      advancement: 0.02,
    });
    expect(bet.label).toBe('economic-heavy');
  });

  it('classifies military-heavy when military (active+capacity) is >= 55%', () => {
    const bet = classifyBetShape({
      economic: 0.15,
      populationCap: 0.04,
      militaryCapacity: 0.24,
      militaryActive: 0.34,
      defensive: 0.08,
      research: 0.1,
      advancement: 0.05,
    });
    expect(bet.label).toBe('military-heavy');
  });

  it('classifies balanced when no band > 40% and top two <= 70%', () => {
    const bet = classifyBetShape({
      economic: 0.23,
      populationCap: 0.12,
      militaryCapacity: 0.16,
      militaryActive: 0.15,
      defensive: 0.12,
      research: 0.11,
      advancement: 0.11,
    });
    expect(bet.label).toBe('balanced');
  });
});

describe('detectRaidEvents', () => {
  it('detects a raid-shaped drop and recovery in gather rate', () => {
    const events = detectRaidEvents([
      { timestamp: 0, ratePerMin: 1000 },
      { timestamp: 30, ratePerMin: 980 },
      { timestamp: 60, ratePerMin: 860 },
      { timestamp: 120, ratePerMin: 890 },
      { timestamp: 180, ratePerMin: 930 },
      { timestamp: 240, ratePerMin: 940 }
    ], 'you');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].category).toBe('Economy');
    expect(events[0].description.toLowerCase()).toContain('gather rate');
  });
});

describe('buildAgeMarkers', () => {
  it('extracts sorted age-up markers for both players from summary actions', () => {
    const summary = {
      duration: 1200,
      players: [
        {
          actions: {
            age_up: [210, 520, 900],
          },
        },
        {
          actions: {
            feudal_age: [240],
            castleAge: [610],
          },
        },
      ],
    } as unknown as GameSummary;

    const markers = buildAgeMarkers(summary, 0);

    expect(markers).toEqual([
      expect.objectContaining({ player: 'you', age: 'Feudal', timestamp: 210, label: 'You Feudal 3:30' }),
      expect.objectContaining({ player: 'opponent', age: 'Feudal', timestamp: 240, label: 'Opponent Feudal 4:00' }),
      expect.objectContaining({ player: 'you', age: 'Castle', timestamp: 520, label: 'You Castle 8:40' }),
      expect.objectContaining({ player: 'opponent', age: 'Castle', timestamp: 610, label: 'Opponent Castle 10:10' }),
      expect.objectContaining({ player: 'you', age: 'Imperial', timestamp: 900, label: 'You Imperial 15:00' }),
    ]);
  });
});

describe('buildOneLineStory', () => {
  it('renders a template-only narrative using supplied metrics', () => {
    const story = buildOneLineStory({
      yourBetLabel: 'economic',
      oppBetLabel: 'military',
      yourEconomicPercent: 56,
      oppEconomicPercent: 31,
      gapAtCastlePercentPoints: 25,
      topDestructiveEventSentence: 'A large Feudal engagement erased 18% of your military-active pool in 90 seconds.',
      civOverlaySentence: 'Byzantine mercenary injections added 420 market-value during the midgame.',
      finalPoolDelta: -6200
    });

    expect(story).toContain('56%');
    expect(story).toContain('31%');
    expect(story).toContain('18%');
    expect(story).toContain('420');
    expect(story).toContain('-6200');
    expect(story).not.toContain('{');
  });
});
