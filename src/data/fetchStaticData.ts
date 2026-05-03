import fs from 'fs';
import path from 'path';
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

function loadCoreStaticDataFetcher(): () => Promise<StaticDataCache> {
  const sourcePath = path.resolve(__dirname, '../../packages/aoe4-core/src/data/fetchStaticData');
  const distPath = path.resolve(__dirname, '../../packages/aoe4-core/dist/data/fetchStaticData');
  const canLoadTsSource =
    fs.existsSync(`${sourcePath}.ts`) &&
    (Boolean(require.extensions['.ts']) || Boolean(process.env.JEST_WORKER_ID));
  const modulePath = canLoadTsSource ? sourcePath : distPath;
  const module = require(modulePath) as {
    fetchAndCacheStaticData: () => Promise<StaticDataCache>;
  };
  return module.fetchAndCacheStaticData;
}

export async function fetchAndCacheStaticData(): Promise<StaticDataCache> {
  const cache = await loadCoreStaticDataFetcher()();
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
