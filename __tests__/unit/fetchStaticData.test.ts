import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fetchAndCacheStaticData } from '../../src/data/fetchStaticData';
import { sampleBuildings, sampleTechnologies, sampleUnits } from '../helpers/testData';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const cachePath = path.resolve(__dirname, '../../src/data/staticData.json');

describe('fetchAndCacheStaticData', () => {
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

  it('fetches endpoints and caches combined data with timestamp', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: sampleUnits })
      .mockResolvedValueOnce({ data: sampleBuildings })
      .mockResolvedValueOnce({ data: sampleTechnologies });

    const result = await fetchAndCacheStaticData();

    expect(mockedAxios.get).toHaveBeenNthCalledWith(1, 'https://data.aoe4world.com/units/all.json');
    expect(mockedAxios.get).toHaveBeenNthCalledWith(2, 'https://data.aoe4world.com/buildings/all.json');
    expect(mockedAxios.get).toHaveBeenNthCalledWith(3, 'https://data.aoe4world.com/technologies/all.json');

    expect(result.units).toEqual(sampleUnits);
    expect(result.buildings).toEqual(sampleBuildings);
    expect(result.technologies).toEqual(sampleTechnologies);

    expect(fs.existsSync(cachePath)).toBe(true);
    const cacheContent = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    expect(cacheContent.units).toEqual(sampleUnits);
    expect(cacheContent.buildings).toEqual(sampleBuildings);
    expect(cacheContent.technologies).toEqual(sampleTechnologies);
    expect(typeof cacheContent.fetchedAt).toBe('string');
    expect(Number.isNaN(Date.parse(cacheContent.fetchedAt))).toBe(false);
  });
});
