import {
  renderedReportCacheKeyParts,
  renderedReportCacheTag,
  sigCacheToken,
} from '../../src/lib/renderedReportCache';

describe('rendered report cache helpers', () => {
  it('uses a stable sig hash token without exposing the raw sig', () => {
    const token = sigCacheToken('abc123-private-sig');

    expect(token).toMatch(/^sig-sha256:[a-f0-9]{64}$/);
    expect(token).not.toContain('abc123-private-sig');
  });

  it('builds persistent cache key parts from match identity and hashed sig', () => {
    const keyParts = renderedReportCacheKeyParts({
      profileSlug: '8097972-RepleteCactus',
      gameId: 230143339,
      sig: 'abc123-private-sig',
    });

    expect(keyParts).toEqual([
      'aoe4-rendered-report-html',
      'v8',
      '8097972-RepleteCactus',
      '230143339',
      expect.stringMatching(/^sig-sha256:[a-f0-9]{64}$/),
    ]);
    expect(keyParts.join('|')).not.toContain('abc123-private-sig');
  });

  it('uses a public cache token when no sig is present', () => {
    expect(renderedReportCacheKeyParts({
      profileSlug: 'public-player',
      gameId: 230143339,
    })).toEqual([
      'aoe4-rendered-report-html',
      'v8',
      'public-player',
      '230143339',
      'public',
    ]);
  });

  it('tags rendered report cache entries without including sig material', () => {
    const tag = renderedReportCacheTag({
      profileSlug: '8097972-RepleteCactus',
      gameId: 230143339,
      sig: 'abc123-private-sig',
    });

    expect(tag).toBe('aoe4-rendered-report:8097972-RepleteCactus:230143339');
    expect(tag).not.toContain('abc123-private-sig');
  });
});
