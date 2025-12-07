import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as dataModule from '../../src/data/fetchStaticData';
import { sampleCache, sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const cachePath = path.resolve(__dirname, '../../src/data/staticData.json');

describe('loadStaticData', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  it('returns cached data when it is fresh', async () => {
    const fetchedAt = new Date().toISOString();
    const cached = sampleCache(fetchedAt);
    fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2));

    const fetchSpy = jest.spyOn(dataModule, 'fetchAndCacheStaticData');

    const result = await dataModule.loadStaticData();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('refetches and updates cache when data is stale', async () => {
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const staleCache = sampleCache(staleDate);
    fs.writeFileSync(cachePath, JSON.stringify(staleCache, null, 2));

    mockedAxios.get
      .mockResolvedValueOnce({ data: sampleUnits })
      .mockResolvedValueOnce({ data: sampleBuildings })
      .mockResolvedValueOnce({ data: sampleTechnologies });

    const result = await dataModule.loadStaticData();

    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(result.fetchedAt).not.toBe(staleDate);

    const refreshedCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    expect(refreshedCache.units).toEqual(sampleUnits);
    expect(refreshedCache.buildings).toEqual(sampleBuildings);
    expect(refreshedCache.technologies).toEqual(sampleTechnologies);
  });
});
