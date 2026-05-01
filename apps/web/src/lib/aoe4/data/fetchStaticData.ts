import axios from 'axios';
import { StaticDataCache, Unit, Building, Technology } from '../types';

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STATIC_DATA_USER_AGENT = 'aoe4-game-analyzer-web/0.1 static-data-loader';
let inMemoryCache: StaticDataCache | null = null;

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return ((value as { data: T[] }).data) ?? [];
  }
  return [];
}

function normalizeStaticDataCache(raw: Partial<StaticDataCache>): StaticDataCache {
  return {
    units: normalizeList<Unit>(raw.units),
    buildings: normalizeList<Building>(raw.buildings),
    technologies: normalizeList<Technology>(raw.technologies),
    fetchedAt: raw.fetchedAt ?? new Date().toISOString()
  };
}

export async function fetchAndCacheStaticData(): Promise<StaticDataCache> {
  const headers = {
    Accept: 'application/json',
    'User-Agent': STATIC_DATA_USER_AGENT,
  };
  const [unitsResponse, buildingsResponse, technologiesResponse] = await Promise.all([
    axios.get<Unit[]>('https://data.aoe4world.com/units/all.json', { headers }),
    axios.get<Building[]>('https://data.aoe4world.com/buildings/all.json', { headers }),
    axios.get<Technology[]>('https://data.aoe4world.com/technologies/all.json', { headers }),
  ]);

  const cache: StaticDataCache = normalizeStaticDataCache({
    units: unitsResponse.data ?? [],
    buildings: buildingsResponse.data ?? [],
    technologies: technologiesResponse.data ?? [],
    fetchedAt: new Date().toISOString()
  });

  inMemoryCache = cache;
  return cache;
}

export async function loadStaticData(): Promise<StaticDataCache> {
  if (inMemoryCache) {
    const fetchedTime = Date.parse(inMemoryCache.fetchedAt);
    if (!Number.isNaN(fetchedTime) && Date.now() - fetchedTime < CACHE_MAX_AGE_MS) {
      return inMemoryCache;
    }
  }
  return fetchAndCacheStaticData();
}

export async function forceRefreshStaticData(): Promise<StaticDataCache> {
  return fetchAndCacheStaticData();
}
