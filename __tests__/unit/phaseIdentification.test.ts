import { identifyPhases, getAgeUpTime } from '../../src/analysis/phaseIdentification';
import { PlayerSummary } from '../../src/parser/gameSummaryParser';

function makePlayer(actions: Record<string, number[]>, overrides?: Partial<PlayerSummary>): PlayerSummary {
  return {
    profileId: 1,
    name: 'Test',
    civilization: 'English',
    team: 1,
    apm: 80,
    result: 'win',
    _stats: { ekills: 0, edeaths: 0, sqprod: 0, sqlost: 0, bprod: 0, upg: 0, totalcmds: 0 },
    actions,
    scores: { total: 0, military: 0, economy: 0, technology: 0, society: 0 },
    totalResourcesGathered: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
    totalResourcesSpent: { food: 0, gold: 0, stone: 0, wood: 0, total: 0 },
    resources: {
      timestamps: [], food: [], gold: [], stone: [], wood: [],
      foodPerMin: [], goldPerMin: [], stonePerMin: [], woodPerMin: [],
      total: [], military: [], economy: [], technology: [], society: []
    },
    buildOrder: [],
    ...overrides
  };
}

describe('identifyPhases', () => {
  it('returns a single Dark Age phase when no age-ups occur', () => {
    const p1 = makePlayer({});
    const p2 = makePlayer({});
    const result = identifyPhases(p1, p2, 300);

    expect(result.gameDuration).toBe(300);
    expect(result.unifiedPhases).toHaveLength(1);
    expect(result.unifiedPhases[0].label).toBe('Dark Age');
    expect(result.unifiedPhases[0].startTime).toBe(0);
    expect(result.unifiedPhases[0].endTime).toBe(300);
    expect(result.unifiedPhases[0].player1Age).toBe('Dark');
    expect(result.unifiedPhases[0].player2Age).toBe('Dark');
  });

  it('creates phase boundaries at each age-up event', () => {
    const p1 = makePlayer({ feudalAge: [300] });
    const p2 = makePlayer({ feudalAge: [350] });
    const result = identifyPhases(p1, p2, 900);

    // Should have 3 phases: Dark (0-300), split (300-350), Feudal (350-900)
    expect(result.unifiedPhases).toHaveLength(3);

    expect(result.unifiedPhases[0].player1Age).toBe('Dark');
    expect(result.unifiedPhases[0].player2Age).toBe('Dark');
    expect(result.unifiedPhases[0].endTime).toBe(300);

    expect(result.unifiedPhases[1].player1Age).toBe('Feudal');
    expect(result.unifiedPhases[1].player2Age).toBe('Dark');
    expect(result.unifiedPhases[1].startTime).toBe(300);
    expect(result.unifiedPhases[1].endTime).toBe(350);

    expect(result.unifiedPhases[2].player1Age).toBe('Feudal');
    expect(result.unifiedPhases[2].player2Age).toBe('Feudal');
    expect(result.unifiedPhases[2].startTime).toBe(350);
  });

  it('handles underscore key format (feudal_age)', () => {
    const p1 = makePlayer({ feudal_age: [300] });
    const p2 = makePlayer({ feudal_age: [300] });
    const result = identifyPhases(p1, p2, 600);

    expect(result.unifiedPhases).toHaveLength(2);
    expect(result.unifiedPhases[1].player1Age).toBe('Feudal');
    expect(result.unifiedPhases[1].player2Age).toBe('Feudal');
  });

  it('handles multiple age-ups through Castle and Imperial', () => {
    const p1 = makePlayer({ feudalAge: [200], castleAge: [500], imperialAge: [800] });
    const p2 = makePlayer({ feudalAge: [250], castleAge: [600] });
    const result = identifyPhases(p1, p2, 1000);

    // Check that Imperial age is reached by p1
    const lastPhase = result.unifiedPhases[result.unifiedPhases.length - 1];
    expect(lastPhase.player1Age).toBe('Imperial');
    expect(lastPhase.player2Age).toBe('Castle');
  });

  it('handles simultaneous age-ups', () => {
    const p1 = makePlayer({ feudalAge: [300] });
    const p2 = makePlayer({ feudalAge: [300] });
    const result = identifyPhases(p1, p2, 600);

    expect(result.unifiedPhases).toHaveLength(2);
    expect(result.unifiedPhases[0].endTime).toBe(300);
    expect(result.unifiedPhases[1].startTime).toBe(300);
    expect(result.unifiedPhases[1].player1Age).toBe('Feudal');
    expect(result.unifiedPhases[1].player2Age).toBe('Feudal');
  });

  it('labels phases with player names when ages differ', () => {
    const p1 = makePlayer({ feudalAge: [200] }, { name: 'Alice' });
    const p2 = makePlayer({ feudalAge: [400] }, { name: 'Bob' });
    const result = identifyPhases(p1, p2, 600);

    const splitPhase = result.unifiedPhases[1];
    expect(splitPhase.label).toContain('Alice');
    expect(splitPhase.label).toContain('Bob');
  });

  it('handles very short games with no age-ups gracefully', () => {
    const p1 = makePlayer({});
    const p2 = makePlayer({});
    const result = identifyPhases(p1, p2, 60);

    expect(result.unifiedPhases).toHaveLength(1);
    expect(result.unifiedPhases[0].label).toBe('Dark Age');
  });

  it('does not create zero-length phases', () => {
    const p1 = makePlayer({ feudalAge: [300] });
    const p2 = makePlayer({ feudalAge: [300] });
    const result = identifyPhases(p1, p2, 600);

    for (const phase of result.unifiedPhases) {
      expect(phase.endTime).toBeGreaterThan(phase.startTime);
    }
  });

  it('handles age_up array format (sequential timestamps)', () => {
    const p1 = makePlayer({ age_up: [200, 500] });
    const p2 = makePlayer({ age_up: [250, 600] });
    const result = identifyPhases(p1, p2, 900);

    // Should create phases from age_up: Dark -> Feudal -> Castle
    expect(result.unifiedPhases.length).toBeGreaterThan(1);

    // After both reach Feudal (250), both should be in Feudal
    const afterBothFeudalPhase = result.unifiedPhases.find(
      p => p.player1Age === 'Feudal' && p.player2Age === 'Feudal'
    );
    expect(afterBothFeudalPhase).toBeDefined();

    // After both reach Castle (600), both should be in Castle
    const afterBothCastlePhase = result.unifiedPhases.find(
      p => p.player1Age === 'Castle' && p.player2Age === 'Castle'
    );
    expect(afterBothCastlePhase).toBeDefined();
  });

  it('handles age_up with three entries (through Imperial)', () => {
    const p1 = makePlayer({ age_up: [200, 500, 800] });
    const p2 = makePlayer({ age_up: [250] });
    const result = identifyPhases(p1, p2, 1000);

    const lastPhase = result.unifiedPhases[result.unifiedPhases.length - 1];
    expect(lastPhase.player1Age).toBe('Imperial');
    expect(lastPhase.player2Age).toBe('Feudal');
  });
});

describe('getAgeUpTime', () => {
  it('returns null for Dark age', () => {
    expect(getAgeUpTime({}, 'Dark')).toBeNull();
  });

  it('finds time from explicit key', () => {
    expect(getAgeUpTime({ feudalAge: [300] }, 'Feudal')).toBe(300);
    expect(getAgeUpTime({ castleAge: [600] }, 'Castle')).toBe(600);
  });

  it('finds time from underscore key', () => {
    expect(getAgeUpTime({ feudal_age: [300] }, 'Feudal')).toBe(300);
  });

  it('finds time from age_up array', () => {
    const actions = { age_up: [200, 500, 800] };
    expect(getAgeUpTime(actions, 'Feudal')).toBe(200);
    expect(getAgeUpTime(actions, 'Castle')).toBe(500);
    expect(getAgeUpTime(actions, 'Imperial')).toBe(800);
  });

  it('returns null when age not reached in age_up array', () => {
    const actions = { age_up: [200] };
    expect(getAgeUpTime(actions, 'Castle')).toBeNull();
    expect(getAgeUpTime(actions, 'Imperial')).toBeNull();
  });

  it('prefers explicit key over age_up array', () => {
    const actions = { feudalAge: [300], age_up: [200, 500] };
    expect(getAgeUpTime(actions, 'Feudal')).toBe(300);
  });
});
