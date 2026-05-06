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
  const previousCacheDir = process.env.AOE4_SUMMARY_CACHE_DIR;
  const previousOverrideDir = process.env.AOE4_SUMMARY_OVERRIDE_DIR;
  const cacheDir = path.resolve(__dirname, '../../tmp/unit-summary-cache');
  const overrideDir = path.resolve(__dirname, '../../tmp/unit-summary-overrides');

  beforeEach(() => {
    mockedAxiosGet.mockReset();
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
    delete process.env.AOE4_SUMMARY_CACHE_DIR;
    delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
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
