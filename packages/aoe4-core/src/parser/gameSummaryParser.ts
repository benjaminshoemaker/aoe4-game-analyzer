import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import axios from 'axios';
import { buildGameSummaryRequest } from '../aoe4world/client';

export interface GameSummary {
  gameId: number;
  winReason: string;
  mapName: string;
  mapBiome: string;
  leaderboard: string;
  duration: number;
  startedAt: number;
  finishedAt: number;
  players: PlayerSummary[];
}

export interface PlayerSummary {
  profileId: number;
  name: string;
  civilization: string;
  team: number;
  apm: number;
  result: 'win' | 'loss';
  _stats: PlayerStats;
  actions: Record<string, number[]>;
  scores: ScoreBreakdown;
  totalResourcesGathered: ResourceTotals;
  totalResourcesSpent: ResourceTotals;
  resources: TimeSeriesResources;
  buildOrder: BuildOrderEntry[];
}

export interface PlayerStats {
  ekills: number;
  edeaths: number;
  sqprod: number;
  sqlost: number;
  bprod: number;
  upg: number;
  totalcmds: number;
}

export interface ScoreBreakdown {
  total: number;
  military: number;
  economy: number;
  technology: number;
  society: number;
}

export interface ResourceTotals {
  food: number;
  gold: number;
  stone: number;
  wood: number;
  oliveoil?: number;
  total: number;
}

export interface TimeSeriesResources {
  timestamps: number[];
  food: number[];
  gold: number[];
  stone: number[];
  wood: number[];
  foodPerMin: number[];
  goldPerMin: number[];
  stonePerMin: number[];
  woodPerMin: number[];
  total: number[];
  military: number[];
  economy: number[];
  technology: number[];
  society: number[];
  oliveoil?: number[];
  oliveoilPerMin?: number[];
  foodGathered?: number[];
  goldGathered?: number[];
  stoneGathered?: number[];
  woodGathered?: number[];
  oliveoilGathered?: number[];
  // AoE4World canonical name for the per-second total-population
  // sample. Used by villager-opportunity to lock expected growth at
  // the population cap.
  population?: number[];
}

export interface BuildOrderEntry {
  id: string;
  icon: string;
  pbgid: number;
  type: 'Unit' | 'Building' | 'Upgrade' | 'Age' | 'Animal' | 'Unknown';
  finished: number[];
  constructed: number[];
  destroyed: number[];
  transformed?: number[];
  unknown?: Record<string, number[]>;
}

function assertObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an object`);
  }
  return value as Record<string, unknown>;
}

function assertNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${name} to be a number`);
  }
  return value;
}

function parseNumberOrZero(value: unknown, name: string): number {
  if (value === null || value === undefined) return 0;
  return assertNumber(value, name);
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected ${name} to be a string`);
  }
  return value;
}

function parseNullableString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function assertArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an array`);
  }
  return value as T[];
}

function parseUnknownTimestampBuckets(value: unknown, name: string): Record<string, number[]> | undefined {
  if (value === undefined) return undefined;
  const obj = assertObject(value, name);
  const result: Record<string, number[]> = {};

  Object.entries(obj).forEach(([key, bucketValue]) => {
    result[key] = assertArray<number>(bucketValue, `${name}.${key}`);
  });

  return result;
}

function parseResourceTotals(raw: unknown, name: string): ResourceTotals {
  const obj = assertObject(raw, name);
  const oliveoil = typeof obj.oliveoil === 'number' ? obj.oliveoil : undefined;
  return {
    food: assertNumber(obj.food, `${name}.food`),
    gold: assertNumber(obj.gold, `${name}.gold`),
    stone: assertNumber(obj.stone, `${name}.stone`),
    wood: assertNumber(obj.wood, `${name}.wood`),
    ...(oliveoil !== undefined ? { oliveoil } : {}),
    total: assertNumber(obj.total, `${name}.total`)
  };
}

function parseScores(raw: unknown): ScoreBreakdown {
  const obj = assertObject(raw, 'scores');
  return {
    total: assertNumber(obj.total, 'scores.total'),
    military: assertNumber(obj.military, 'scores.military'),
    economy: assertNumber(obj.economy, 'scores.economy'),
    technology: assertNumber(obj.technology, 'scores.technology'),
    society: assertNumber(obj.society, 'scores.society')
  };
}

function parseStats(raw: unknown): PlayerStats {
  const obj = assertObject(raw, '_stats');
  return {
    ekills: parseNumberOrZero(obj.ekills, '_stats.ekills'),
    edeaths: parseNumberOrZero(obj.edeaths, '_stats.edeaths'),
    sqprod: parseNumberOrZero(obj.sqprod, '_stats.sqprod'),
    sqlost: parseNumberOrZero(obj.sqlost, '_stats.sqlost'),
    bprod: parseNumberOrZero(obj.bprod, '_stats.bprod'),
    upg: parseNumberOrZero(obj.upg, '_stats.upg'),
    totalcmds: parseNumberOrZero(obj.totalcmds, '_stats.totalcmds')
  };
}

function parseTimeSeries(raw: unknown): TimeSeriesResources {
  const obj = assertObject(raw, 'resources');
  const seriesFields = [
    'timestamps',
    'food',
    'gold',
    'stone',
    'wood',
    'foodPerMin',
    'goldPerMin',
    'stonePerMin',
    'woodPerMin',
    'total',
    'military',
    'economy',
    'technology',
    'society'
  ] as const;

  const result: Partial<TimeSeriesResources> = {};
  seriesFields.forEach((field) => {
    result[field] = assertArray<number>(obj[field], `resources.${field}`);
  });

  const optionalFields = [
    'oliveoil',
    'oliveoilPerMin',
    'foodGathered',
    'goldGathered',
    'stoneGathered',
    'woodGathered',
    'oliveoilGathered',
    'population',
  ] as const;

  optionalFields.forEach((field) => {
    const value = obj[field];
    if (value === undefined) return;
    result[field] = assertArray<number>(value, `resources.${field}`);
  });

  return result as TimeSeriesResources;
}

function parseBuildOrder(raw: unknown): BuildOrderEntry[] {
  const arr = assertArray<unknown>(raw, 'buildOrder');
  return arr.map((entry, index) => {
    const obj = assertObject(entry, `buildOrder[${index}]`);
    const typeRaw = assertString(obj.type, `buildOrder[${index}].type`);
    const type: BuildOrderEntry['type'] =
      typeRaw === 'Unit' ||
      typeRaw === 'Building' ||
      typeRaw === 'Upgrade' ||
      typeRaw === 'Age' ||
      typeRaw === 'Animal'
        ? typeRaw
        : 'Unknown';

    const transformed = obj.transformed === undefined
      ? undefined
      : assertArray<number>(obj.transformed, `buildOrder[${index}].transformed`);

    return {
      id: assertString(obj.id, `buildOrder[${index}].id`),
      icon: assertString(obj.icon, `buildOrder[${index}].icon`),
      pbgid: assertNumber(obj.pbgid, `buildOrder[${index}].pbgid`),
      type,
      finished: assertArray<number>(obj.finished, `buildOrder[${index}].finished`),
      constructed: assertArray<number>(obj.constructed, `buildOrder[${index}].constructed`),
      destroyed: assertArray<number>(obj.destroyed, `buildOrder[${index}].destroyed`),
      ...(transformed !== undefined ? { transformed } : {}),
      unknown: parseUnknownTimestampBuckets(obj.unknown, `buildOrder[${index}].unknown`)
    };
  });
}

function parsePlayer(raw: unknown, index: number): PlayerSummary {
  const obj = assertObject(raw, `players[${index}]`);
  const result = assertString(obj.result, `players[${index}].result`);
  if (result !== 'win' && result !== 'loss') {
    throw new Error(`players[${index}].result must be "win" or "loss"`);
  }
  return {
    profileId: assertNumber(obj.profileId, `players[${index}].profileId`),
    name: assertString(obj.name, `players[${index}].name`),
    civilization: assertString(obj.civilization, `players[${index}].civilization`),
    team: assertNumber(obj.team, `players[${index}].team`),
    apm: assertNumber(obj.apm, `players[${index}].apm`),
    result,
    _stats: parseStats(obj._stats),
    actions: assertObject(obj.actions ?? {}, `players[${index}].actions`) as Record<string, number[]>,
    scores: parseScores(obj.scores),
    totalResourcesGathered: parseResourceTotals(obj.totalResourcesGathered, `players[${index}].totalResourcesGathered`),
    totalResourcesSpent: parseResourceTotals(obj.totalResourcesSpent, `players[${index}].totalResourcesSpent`),
    resources: parseTimeSeries(obj.resources),
    buildOrder: parseBuildOrder(obj.buildOrder ?? [])
  };
}

export function parseGameSummary(json: unknown): GameSummary {
  const obj = assertObject(json, 'root');
  const players = assertArray<unknown>(obj.players, 'players');

  if (players.length === 0) {
    throw new Error('Expected players to contain at least one entry');
  }

  return {
    gameId: assertNumber(obj.gameId, 'gameId'),
    winReason: assertString(obj.winReason, 'winReason'),
    mapName: assertString(obj.mapName, 'mapName'),
    mapBiome: parseNullableString(obj.mapBiome, 'unknown'),
    leaderboard: assertString(obj.leaderboard, 'leaderboard'),
    duration: assertNumber(obj.duration, 'duration'),
    startedAt: assertNumber(obj.startedAt, 'startedAt'),
    finishedAt: assertNumber(obj.finishedAt, 'finishedAt'),
    players: players.map((player, index) => parsePlayer(player, index))
  };
}

export function loadGameSummaryFromFile(filePath: string): GameSummary {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return parseGameSummary(parsed);
}

type FetchError = Error & { response?: { status?: number; statusText?: string } };

export class GameSummaryFetchError extends Error {
  readonly status?: number;

  constructor(url: string, error: unknown) {
    const err = error as FetchError;
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const detail = status ? ` (${status}${statusText ? ` ${statusText}` : ''})` : '';

    super(`Failed to fetch ${url}${detail}: ${err.message}`);
    this.name = 'GameSummaryFetchError';
    this.status = status;
  }
}

function responseStatus(error: unknown): number | undefined {
  return (error as FetchError).response?.status;
}

function fetchErrorMessage(url: string, error: unknown): Error {
  return new GameSummaryFetchError(url, error);
}

function shouldTryUnsignedSummary(error: unknown): boolean {
  const status = responseStatus(error);
  return status === 401 || status === 403 || status === 404 || status === 429;
}

type GameSummaryRequestIdentity = {
  profileId: number | string;
  gameId: number;
  sig?: string;
};

const inFlightSummaryRequests = new Map<string, Promise<GameSummary>>();

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;

  for (let depth = 0; depth < 6; depth += 1) {
    const packagePath = path.join(current, 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as { workspaces?: unknown };
        if (Array.isArray(parsed.workspaces)) return current;
      } catch {
        // Ignore malformed package metadata and keep walking upward.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return startDir;
}

function configuredSummaryCacheDir(): string | null {
  const configured = process.env.AOE4_SUMMARY_CACHE_DIR?.trim();
  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === 'development') {
    return path.join(findWorkspaceRoot(process.cwd()), 'tmp', 'summary-cache');
  }

  return null;
}

function configuredSummaryOverrideDir(): string | null {
  const configured = process.env.AOE4_SUMMARY_OVERRIDE_DIR?.trim();
  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === 'development') {
    return path.join(findWorkspaceRoot(process.cwd()), 'tmp', 'summary-overrides');
  }

  return null;
}

function summaryRequestKey(identity: GameSummaryRequestIdentity): string {
  const sigKey = identity.sig ? `sig:${hashString(identity.sig)}` : 'public';
  return JSON.stringify({
    version: 1,
    profileId: String(identity.profileId),
    gameId: identity.gameId,
    sig: sigKey,
  });
}

function summaryCachePath(identity: GameSummaryRequestIdentity): string | null {
  const cacheDir = configuredSummaryCacheDir();
  if (!cacheDir) return null;

  return path.join(cacheDir, `${hashString(summaryRequestKey(identity))}.json`);
}

function summaryOverridePaths(identity: GameSummaryRequestIdentity): string[] {
  const overrideDir = configuredSummaryOverrideDir();
  if (!overrideDir) return [];

  const profileSlug = String(identity.profileId).replace(/[^a-zA-Z0-9._-]+/g, '_');
  return [
    path.join(overrideDir, `${identity.gameId}.json`),
    path.join(overrideDir, `${profileSlug}-${identity.gameId}.json`),
  ];
}

async function readJsonSummaryFile(filePath: string): Promise<GameSummary | null> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return parseGameSummary(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readOverrideGameSummary(identity: GameSummaryRequestIdentity): Promise<GameSummary | null> {
  for (const overridePath of summaryOverridePaths(identity)) {
    const summary = await readJsonSummaryFile(overridePath);
    if (summary) return summary;
  }

  return null;
}

async function readCachedGameSummary(identity: GameSummaryRequestIdentity): Promise<GameSummary | null> {
  const cachePath = summaryCachePath(identity);
  if (!cachePath) return null;

  return readJsonSummaryFile(cachePath);
}

async function writeCachedGameSummary(identity: GameSummaryRequestIdentity, rawSummary: unknown): Promise<void> {
  const cachePath = summaryCachePath(identity);
  if (!cachePath) return;

  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.promises.writeFile(cachePath, JSON.stringify(rawSummary), 'utf-8');
}

async function requestGameSummaryFromApi(identity: GameSummaryRequestIdentity): Promise<GameSummary> {
  const { profileId, gameId, sig } = identity;
  const { url, params, headers } = buildGameSummaryRequest(profileId, gameId, sig);
  const response = await axios.get(url, { params, headers });
  const summary = parseGameSummary(response.data);
  await writeCachedGameSummary(identity, response.data);
  return summary;
}

async function requestGameSummary(profileId: number | string, gameId: number, sig?: string): Promise<GameSummary> {
  const identity = { profileId, gameId, sig };
  const override = await readOverrideGameSummary(identity);
  if (override) return override;

  const cached = await readCachedGameSummary(identity);
  if (cached) return cached;

  const key = summaryRequestKey(identity);
  const existing = inFlightSummaryRequests.get(key);
  if (existing) return existing;

  const request = requestGameSummaryFromApi(identity)
    .finally(() => {
      inFlightSummaryRequests.delete(key);
    });
  inFlightSummaryRequests.set(key, request);
  return request;
}

export function clearGameSummaryFetchStateForTests(): void {
  inFlightSummaryRequests.clear();
}

export async function fetchGameSummaryFromApi(profileId: number | string, gameId: number, sig?: string): Promise<GameSummary> {
  if (sig) {
    const { url: signedUrl } = buildGameSummaryRequest(profileId, gameId, sig);
    try {
      return await requestGameSummary(profileId, gameId, sig);
    } catch (error) {
      if (shouldTryUnsignedSummary(error)) {
        try {
          return await requestGameSummary(profileId, gameId);
        } catch (unsignedError) {
          const { url: publicUrl } = buildGameSummaryRequest(profileId, gameId);
          throw fetchErrorMessage(publicUrl, unsignedError);
        }
      }

      throw fetchErrorMessage(signedUrl, error);
    }
  }

  const { url } = buildGameSummaryRequest(profileId, gameId);
  try {
    return await requestGameSummary(profileId, gameId);
  } catch (error) {
    throw fetchErrorMessage(url, error);
  }
}
