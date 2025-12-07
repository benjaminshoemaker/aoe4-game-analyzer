import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { StaticDataCache, Unit, Building, Technology } from '../types';

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_FILE_PATH = path.resolve(__dirname, '../../src/data/staticData.json');

async function readCacheIfFresh(): Promise<StaticDataCache | null> {
  try {
    const raw = await fs.promises.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StaticDataCache;
    const normalized = normalizeStaticDataCache(parsed);
    const fetchedTime = Date.parse(normalized.fetchedAt);
    if (Number.isNaN(fetchedTime)) {
      return null;
    }

    const ageMs = Date.now() - fetchedTime;
    if (ageMs >= CACHE_MAX_AGE_MS) {
      return null;
    }

    return normalized;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

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

async function writeCache(cache: StaticDataCache): Promise<void> {
  await fs.promises.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
  await fs.promises.writeFile(CACHE_FILE_PATH, JSON.stringify(normalizeStaticDataCache(cache), null, 2), 'utf-8');
}

export async function fetchAndCacheStaticData(): Promise<StaticDataCache> {
  const [unitsResponse, buildingsResponse, technologiesResponse] = await Promise.all([
    axios.get<Unit[]>('https://data.aoe4world.com/units/all.json'),
    axios.get<Building[]>('https://data.aoe4world.com/buildings/all.json'),
    axios.get<Technology[]>('https://data.aoe4world.com/technologies/all.json')
  ]);

  const cache: StaticDataCache = normalizeStaticDataCache({
    units: unitsResponse.data ?? [],
    buildings: buildingsResponse.data ?? [],
    technologies: technologiesResponse.data ?? [],
    fetchedAt: new Date().toISOString()
  });

  await writeCache(cache);
  return cache;
}

export async function loadStaticData(): Promise<StaticDataCache> {
  const cached = await readCacheIfFresh();
  if (cached) {
    return cached;
  }

  return fetchAndCacheStaticData();
}

export async function forceRefreshStaticData(): Promise<StaticDataCache> {
  return fetchAndCacheStaticData();
}
