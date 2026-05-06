import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fetchGameSummaryFromApi } from '../../packages/aoe4-core/src/parser/gameSummaryParser';

jest.mock('axios');

describe('fetchGameSummaryFromApi signed request fallback', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const mockedAxiosGet = axios.get as jest.Mock;

  beforeEach(() => {
    mockedAxiosGet.mockReset();
  });

  it('uses the public summary first when a sig is present', async () => {
    mockedAxiosGet.mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockedAxiosGet).toHaveBeenCalledWith(
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true' },
      })
    );
  });

  it('uses the signed summary request when the public summary is inaccessible', async () => {
    mockedAxiosGet
      .mockRejectedValueOnce({
        message: 'Request failed with status code 404',
        response: { status: 404, statusText: 'Not Found' },
      })
      .mockResolvedValueOnce({ data: sampleJson });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      1,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true' },
      })
    );
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      2,
      'https://aoe4world.com/players/999/games/123456/summary',
      expect.objectContaining({
        params: { camelize: 'true', sig: 'signed-token-123' },
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
});
