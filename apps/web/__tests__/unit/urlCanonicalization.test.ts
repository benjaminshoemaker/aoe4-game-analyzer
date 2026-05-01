import { canonicalMatchHref, nearestTimestamp } from '../../src/lib/urlCanonicalization';

describe('urlCanonicalization', () => {
  it('canonicalizes aoe4world URL and preserves sig', () => {
    const result = canonicalMatchHref('https://aoe4world.com/players/my-slug/games/230143339?sig=abc123');
    expect(result.path).toBe('/matches/my-slug/230143339');
    expect(result.search).toBe('sig=abc123');
    expect(result.href).toBe('/matches/my-slug/230143339?sig=abc123');
  });

  it('picks nearest timestamp for url-selected value', () => {
    expect(nearestTimestamp(77, [0, 60, 120, 200])).toBe(60);
    expect(nearestTimestamp(81, [0, 60, 120, 200])).toBe(60);
    expect(nearestTimestamp(95, [0, 60, 120, 200])).toBe(120);
    expect(nearestTimestamp(99, [])).toBeNull();
  });
});
