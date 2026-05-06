import axios from 'axios';
import { StaticDataCache, Unit, Building, Technology } from '../types';
import { AOE4WORLD_STATIC_DATA_ENDPOINTS, buildAoe4WorldHeaders } from '../aoe4world/client';

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
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
  const headers = buildAoe4WorldHeaders('static-data');
  const [unitsResponse, buildingsResponse, technologiesResponse] = await Promise.all([
    axios.get<Unit[]>(AOE4WORLD_STATIC_DATA_ENDPOINTS.units, { headers }),
    axios.get<Building[]>(AOE4WORLD_STATIC_DATA_ENDPOINTS.buildings, { headers }),
    axios.get<Technology[]>(AOE4WORLD_STATIC_DATA_ENDPOINTS.technologies, { headers }),
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
