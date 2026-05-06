import {
  clearRenderedReportCacheForTests,
  getRenderedReportHtml,
  renderedReportCacheKeyParts,
  renderedReportCacheTag,
  renderedReportCacheVersionForTests,
  sigCacheToken,
} from '../../src/lib/renderedReportCache';

const CACHE_VERSION_PATTERN = /^v13-(?:[a-f0-9]{12}|nobuild)-(?:[a-f0-9]{12}|none)$/;

describe('rendered report cache helpers', () => {
  beforeEach(() => {
    clearRenderedReportCacheForTests();
  });

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
      expect.stringMatching(CACHE_VERSION_PATTERN),
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
      expect.stringMatching(CACHE_VERSION_PATTERN),
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

  it('changes cache version when the analytics identity changes so cached HTML is not stuck on a stale token', () => {
    const baseline = renderedReportCacheVersionForTests({});
    const rotated = renderedReportCacheVersionForTests({
      NEXT_PUBLIC_POSTHOG_TOKEN: 'phc_rotated',
    });
    const hostChanged = renderedReportCacheVersionForTests({
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    });
    const envChanged = renderedReportCacheVersionForTests({
      NEXT_PUBLIC_POSTHOG_ENVIRONMENT: 'preview',
    });

    expect(baseline).toMatch(CACHE_VERSION_PATTERN);
    expect(rotated).not.toBe(baseline);
    expect(hostChanged).not.toBe(baseline);
    expect(envChanged).not.toBe(baseline);
  });

  it('changes cache version when the build identifier changes so deploys auto-invalidate cached HTML', () => {
    const baseline = renderedReportCacheVersionForTests({});
    const builtA = renderedReportCacheVersionForTests({
      VERCEL_GIT_COMMIT_SHA: 'sha-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const builtB = renderedReportCacheVersionForTests({
      VERCEL_GIT_COMMIT_SHA: 'sha-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    expect(builtA).not.toBe(baseline);
    expect(builtA).not.toBe(builtB);
  });

  describe('memory cache lifecycle', () => {
    const renderHtml = (label: string) => async () => `<html data-label="${label}"></html>`;

    it('serves repeat reads inside the TTL from memory without re-rendering', async () => {
      const renderer = jest.fn(renderHtml('hot'));

      const first = await getRenderedReportHtml(
        { profileSlug: 'memory-player', gameId: 1, sig: 'private' },
        renderer,
        1000
      );
      const second = await getRenderedReportHtml(
        { profileSlug: 'memory-player', gameId: 1, sig: 'private' },
        renderer,
        1000 + 60_000
      );

      expect(first).toBe(second);
      expect(renderer).toHaveBeenCalledTimes(1);
    });

    it('expires entries past the TTL', async () => {
      const renderer = jest.fn(renderHtml('expiring'));

      await getRenderedReportHtml(
        { profileSlug: 'memory-player', gameId: 2 },
        renderer,
        1000
      );
      await getRenderedReportHtml(
        { profileSlug: 'memory-player', gameId: 2 },
        renderer,
        1000 + 5 * 60 * 1000 + 1
      );

      expect(renderer).toHaveBeenCalledTimes(2);
    });

    it('evicts the least-recently-used entry once the cap is reached', async () => {
      const renderCount = new Map<number, number>();
      const rendererFor = (gameId: number) => async () => {
        renderCount.set(gameId, (renderCount.get(gameId) ?? 0) + 1);
        return `<html data-game="${gameId}"></html>`;
      };

      // Fill the cache to its 25-entry cap, then add one more so the
      // oldest entry (gameId 0) gets evicted.
      for (let gameId = 0; gameId < 26; gameId += 1) {
        await getRenderedReportHtml(
          { profileSlug: 'lru-player', gameId },
          rendererFor(gameId),
          gameId
        );
      }

      // Re-reading the youngest entry stays cached…
      await getRenderedReportHtml(
        { profileSlug: 'lru-player', gameId: 25 },
        rendererFor(25),
        100
      );
      // …while the oldest entry must re-render.
      await getRenderedReportHtml(
        { profileSlug: 'lru-player', gameId: 0 },
        rendererFor(0),
        100
      );

      expect(renderCount.get(25)).toBe(1);
      expect(renderCount.get(0)).toBe(2);
    });
  });
});
