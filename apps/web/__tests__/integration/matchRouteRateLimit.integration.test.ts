const mockUnstableCache = jest.fn((
  callback: () => Promise<string>,
  _keyParts?: string[],
  _options?: { revalidate?: number | false; tags?: string[] }
) => callback);

jest.mock('next/cache', () => ({
  unstable_cache: (
    callback: () => Promise<string>,
    keyParts?: string[],
    options?: { revalidate?: number | false; tags?: string[] }
  ) => mockUnstableCache(callback, keyParts, options),
}));

import nock from 'nock';
import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { clearGameSummaryFetchStateForTests } from '@aoe4/analyzer-core/parser/gameSummaryParser';

describe('match route rate-limit integration', () => {
  const previousCacheDir = process.env.AOE4_SUMMARY_CACHE_DIR;
  const previousOverrideDir = process.env.AOE4_SUMMARY_OVERRIDE_DIR;
  const previousRedisUrl = process.env.AOE4_SUMMARY_REDIS_REST_URL;
  const previousRedisToken = process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
  const previousKvUrl = process.env.KV_REST_API_URL;
  const previousKvToken = process.env.KV_REST_API_TOKEN;
  const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    clearMatchRouteCacheForTests();
    clearGameSummaryFetchStateForTests();
    delete process.env.AOE4_SUMMARY_CACHE_DIR;
    delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    nock.cleanAll();
    clearMatchRouteCacheForTests();
    clearGameSummaryFetchStateForTests();
    if (previousCacheDir === undefined) {
      delete process.env.AOE4_SUMMARY_CACHE_DIR;
    } else {
      process.env.AOE4_SUMMARY_CACHE_DIR = previousCacheDir;
    }
    if (previousOverrideDir === undefined) {
      delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    } else {
      process.env.AOE4_SUMMARY_OVERRIDE_DIR = previousOverrideDir;
    }
    if (previousRedisUrl === undefined) {
      delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    } else {
      process.env.AOE4_SUMMARY_REDIS_REST_URL = previousRedisUrl;
    }
    if (previousRedisToken === undefined) {
      delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    } else {
      process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = previousRedisToken;
    }
    if (previousKvUrl === undefined) {
      delete process.env.KV_REST_API_URL;
    } else {
      process.env.KV_REST_API_URL = previousKvUrl;
    }
    if (previousKvToken === undefined) {
      delete process.env.KV_REST_API_TOKEN;
    } else {
      process.env.KV_REST_API_TOKEN = previousKvToken;
    }
    if (previousUpstashUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = previousUpstashUrl;
    }
    if (previousUpstashToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = previousUpstashToken;
    }
  });

  it('turns an uncached AoE4World summary 429 into a confidence-building match page', async () => {
    const upstream = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true' })
      .reply(429, { error: 'Too Many Requests' });

    const response = await GET(new Request('http://localhost/matches/999/123456'), {
      params: Promise.resolve({
        profileSlug: '999',
        gameId: '123456',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('Match analysis is temporarily delayed');
    expect(body).toContain('AoE4World is rate-limiting match summary requests right now.');
    expect(body).toContain('This match link is valid');
    expect(body).toContain('Cached report unavailable');
    expect(body).toContain('Come back to this exact URL');
    expect(body).toContain('Try again');
    expect(body).toContain('Copy link');
    expect(body).toContain('View sample report');
    expect(body).toContain('Technical detail');
    expect(body).toContain('Request failed with status code 429');
    expect(upstream.isDone()).toBe(true);
  });
});
