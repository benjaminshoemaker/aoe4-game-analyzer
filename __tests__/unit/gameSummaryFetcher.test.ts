import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
  clearGameSummaryFetchStateForTests,
  fetchGameSummaryFromApi,
} from '../../packages/aoe4-core/src/parser/gameSummaryParser';

jest.mock('axios');

describe('fetchGameSummaryFromApi signed request fallback', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const mockedAxiosGet = axios.get as jest.Mock;
  const mockedAxiosPost = axios.post as jest.Mock;
  const previousCacheDir = process.env.AOE4_SUMMARY_CACHE_DIR;
  const previousOverrideDir = process.env.AOE4_SUMMARY_OVERRIDE_DIR;
  const previousApiKey = process.env.AOE4WORLD_API_KEY;
  const previousRedisUrl = process.env.AOE4_SUMMARY_REDIS_REST_URL;
  const previousRedisToken = process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
  const previousKvUrl = process.env.KV_REST_API_URL;
  const previousKvToken = process.env.KV_REST_API_TOKEN;
  const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousCacheTtl = process.env.AOE4_SUMMARY_CACHE_TTL_SECONDS;
  const previousNegativeTtl = process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
  const previousLockWaitMs = process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
  const previousLockPollMs = process.env.AOE4_SUMMARY_LOCK_POLL_MS;
  const cacheDir = path.resolve(__dirname, '../../tmp/unit-summary-cache');
  const overrideDir = path.resolve(__dirname, '../../tmp/unit-summary-overrides');

  beforeEach(() => {
    mockedAxiosGet.mockReset();
    mockedAxiosPost.mockReset();
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
    delete process.env.AOE4_SUMMARY_CACHE_DIR;
    delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    delete process.env.AOE4WORLD_API_KEY;
    delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.AOE4_SUMMARY_CACHE_TTL_SECONDS;
    delete process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
    delete process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
    delete process.env.AOE4_SUMMARY_LOCK_POLL_MS;
    clearGameSummaryFetchStateForTests();
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
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
    if (previousApiKey === undefined) {
      delete process.env.AOE4WORLD_API_KEY;
    } else {
      process.env.AOE4WORLD_API_KEY = previousApiKey;
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
    if (previousCacheTtl === undefined) {
      delete process.env.AOE4_SUMMARY_CACHE_TTL_SECONDS;
    } else {
      process.env.AOE4_SUMMARY_CACHE_TTL_SECONDS = previousCacheTtl;
    }
    if (previousNegativeTtl === undefined) {
      delete process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
    } else {
      process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS = previousNegativeTtl;
    }
    if (previousLockWaitMs === undefined) {
      delete process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
    } else {
      process.env.AOE4_SUMMARY_LOCK_WAIT_MS = previousLockWaitMs;
    }
    if (previousLockPollMs === undefined) {
      delete process.env.AOE4_SUMMARY_LOCK_POLL_MS;
    } else {
      process.env.AOE4_SUMMARY_LOCK_POLL_MS = previousLockPollMs;
    }
  });

  it('uses the signed summary first when a sig is present', async () => {
    mockedAxiosGet.mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockedAxiosGet).toHaveBeenCalledWith(
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', sig: 'signed-token-123' },
      })
    );
  });

  it('falls back to the unsigned public summary when a signed request is rate-limited', async () => {
    mockedAxiosGet
      .mockRejectedValueOnce({
        message: 'Request failed with status code 429',
        response: { status: 429, statusText: 'Too Many Requests' },
      })
      .mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      1,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', sig: 'signed-token-123' },
      })
    );
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      2,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true' },
      })
    );
  });

  it('sends the configured API key on summary requests without leaking it in thrown errors', async () => {
    process.env.AOE4WORLD_API_KEY = 'unit-server-token';
    mockedAxiosGet.mockRejectedValueOnce({
      message: 'Request failed with status code 403',
      response: { status: 403, statusText: 'Forbidden' },
    });

    await expect(fetchGameSummaryFromApi('999', 123456)).rejects.toMatchObject({
      status: 403,
      message: expect.not.stringContaining('unit-server-token'),
    });
    expect(mockedAxiosGet).toHaveBeenCalledWith(
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', api_key: 'unit-server-token' },
      })
    );
  });

  it('keeps the configured API key when falling back from signed to public summary', async () => {
    process.env.AOE4WORLD_API_KEY = 'unit-server-token';
    mockedAxiosGet
      .mockRejectedValueOnce({
        message: 'Request failed with status code 429',
        response: { status: 429, statusText: 'Too Many Requests' },
      })
      .mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      1,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', sig: 'signed-token-123', api_key: 'unit-server-token' },
      })
    );
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      2,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', api_key: 'unit-server-token' },
      })
    );
  });

  it('exposes the upstream status when a summary request fails', async () => {
    mockedAxiosGet.mockRejectedValueOnce({
      message: 'Request failed with status code 429',
      response: { status: 429, statusText: 'Too Many Requests' },
    });

    await expect(fetchGameSummaryFromApi('999', 123456)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('(429 Too Many Requests)'),
    });
  });

  it('reuses a cached signed summary when a later remote request would be rate-limited', async () => {
    process.env.AOE4_SUMMARY_CACHE_DIR = cacheDir;
    mockedAxiosGet
      .mockResolvedValueOnce({ data: sampleJson })
      .mockRejectedValueOnce({
        message: 'Request failed with status code 429',
        response: { status: 429, statusText: 'Too Many Requests' },
      });

    const first = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');
    const second = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(first.gameId).toBe(123456);
    expect(second.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
    expect(fs.readdirSync(cacheDir)).toHaveLength(1);
  });

  it('serves a durable Redis cached summary without calling AoE4World', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: JSON.stringify(sampleJson) } });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://redis.example.test',
      expect.arrayContaining(['GET', expect.stringMatching(/^aoe4:summary:v1:/)]),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer redis-token',
        }),
      })
    );
  });

  it('accepts Vercel KV Redis REST environment aliases', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example.test';
    process.env.KV_REST_API_TOKEN = 'kv-token';
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: JSON.stringify(sampleJson) } });

    const summary = await fetchGameSummaryFromApi('999', 123456);

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://kv.example.test',
      expect.arrayContaining(['GET', expect.stringMatching(/^aoe4:summary:v1:/)]),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer kv-token',
        }),
      })
    );
  });

  it('writes successful upstream summaries into durable Redis with a TTL', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test/';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';
    process.env.AOE4_SUMMARY_CACHE_TTL_SECONDS = '3600';
    mockedAxiosPost.mockResolvedValue({ data: { result: null } });
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: null } }); // summary cache miss
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: null } }); // negative cache miss
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: 'OK' } }); // lock acquired
    mockedAxiosGet.mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456);

    expect(summary.gameId).toBe(123456);
    const cacheWrite = mockedAxiosPost.mock.calls.find(([, command]) => (
      Array.isArray(command) &&
      command[0] === 'SET' &&
      typeof command[1] === 'string' &&
      command[1].startsWith('aoe4:summary:v1:')
    ));
    expect(cacheWrite).toBeDefined();
    expect(cacheWrite?.[1]).toEqual([
      'SET',
      expect.stringMatching(/^aoe4:summary:v1:/),
      JSON.stringify(sampleJson),
      'EX',
      3600,
    ]);
  });

  it('negative-caches upstream 429s and suppresses later duplicate requests', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';
    process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS = '120';
    mockedAxiosPost.mockResolvedValue({ data: { result: null } });
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: null } }); // summary cache miss
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: null } }); // negative cache miss
    mockedAxiosPost.mockResolvedValueOnce({ data: { result: 'OK' } }); // lock acquired
    mockedAxiosGet.mockRejectedValueOnce({
      message: 'Request failed with status code 429',
      response: { status: 429, statusText: 'Too Many Requests' },
    });

    await expect(fetchGameSummaryFromApi('999', 123456)).rejects.toMatchObject({
      status: 429,
    });

    const negativeWrite = mockedAxiosPost.mock.calls.find(([, command]) => (
      Array.isArray(command) &&
      command[0] === 'SET' &&
      typeof command[1] === 'string' &&
      command[1].startsWith('aoe4:summary-rate-limit:v1:')
    ));
    expect(negativeWrite?.[1]).toEqual([
      'SET',
      expect.stringMatching(/^aoe4:summary-rate-limit:v1:/),
      expect.stringContaining('Request failed with status code 429'),
      'EX',
      120,
    ]);

    mockedAxiosGet.mockClear();
    mockedAxiosPost.mockReset();
    mockedAxiosPost
      .mockResolvedValueOnce({ data: { result: null } })
      .mockResolvedValueOnce({
        data: {
          result: JSON.stringify({
            message: 'AoE4World summary request was recently rate-limited',
          }),
        },
      });

    await expect(fetchGameSummaryFromApi('999', 123456)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('recently rate-limited'),
    });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it('waits behind a shared Redis lock and reads the peer-populated cache', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';
    process.env.AOE4_SUMMARY_LOCK_WAIT_MS = '20';
    process.env.AOE4_SUMMARY_LOCK_POLL_MS = '1';
    mockedAxiosPost
      .mockResolvedValueOnce({ data: { result: null } }) // summary cache miss
      .mockResolvedValueOnce({ data: { result: null } }) // negative cache miss
      .mockResolvedValueOnce({ data: { result: null } }) // lock held elsewhere
      .mockResolvedValueOnce({ data: { result: JSON.stringify(sampleJson) } }); // peer filled cache

    const summary = await fetchGameSummaryFromApi('999', 123456);

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://redis.example.test',
      ['SET', expect.stringMatching(/^aoe4:summary-lock:v1:/), expect.any(String), 'NX', 'EX', expect.any(Number)],
      expect.any(Object)
    );
  });

  it('coalesces concurrent identical summary fetches into one upstream request', async () => {
    let resolveRequest!: (value: { data: unknown }) => void;
    mockedAxiosGet.mockImplementationOnce(() => new Promise(resolve => {
      resolveRequest = resolve;
    }));

    const firstPromise = fetchGameSummaryFromApi('999', 123456, 'signed-token-123');
    const secondPromise = fetchGameSummaryFromApi('999', 123456, 'signed-token-123');
    await new Promise(resolve => setImmediate(resolve));
    resolveRequest({ data: sampleJson });
    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first.gameId).toBe(123456);
    expect(second.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('loads a game-id override file before making any upstream request', async () => {
    process.env.AOE4_SUMMARY_OVERRIDE_DIR = overrideDir;
    fs.mkdirSync(overrideDir, { recursive: true });
    fs.writeFileSync(path.join(overrideDir, '123456.json'), JSON.stringify(sampleJson), 'utf-8');
    mockedAxiosGet.mockRejectedValueOnce({
      message: 'Request failed with status code 429',
      response: { status: 429, statusText: 'Too Many Requests' },
    });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });
});
