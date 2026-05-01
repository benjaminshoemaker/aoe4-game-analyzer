import fs from 'fs';
import axios from 'axios';

const SUMMARY_USER_AGENT = 'aoe4-game-analyzer-web/0.1 post-match-web';

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
}

export interface BuildOrderEntry {
  id: string;
  icon: string;
  pbgid: number;
  type: 'Unit' | 'Building' | 'Upgrade' | 'Age' | 'Animal' | 'Unknown';
  finished: number[];
  constructed: number[];
  destroyed: number[];
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
    'oliveoilGathered'
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

    return {
      id: assertString(obj.id, `buildOrder[${index}].id`),
      icon: assertString(obj.icon, `buildOrder[${index}].icon`),
      pbgid: assertNumber(obj.pbgid, `buildOrder[${index}].pbgid`),
      type,
      finished: assertArray<number>(obj.finished, `buildOrder[${index}].finished`),
      constructed: assertArray<number>(obj.constructed, `buildOrder[${index}].constructed`),
      destroyed: assertArray<number>(obj.destroyed, `buildOrder[${index}].destroyed`),
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

export async function fetchGameSummaryFromApi(profileId: number | string, gameId: number, sig?: string): Promise<GameSummary> {
  const profileSlug = typeof profileId === 'string' ? profileId : String(profileId);
  const params: Record<string, string | number | undefined> = { camelize: 'true' };
  if (sig) {
    params.sig = sig;
  }

  const url = `https://aoe4world.com/players/${profileSlug}/games/${gameId}/summary`;
  const headers = {
    Accept: 'application/json',
    'User-Agent': SUMMARY_USER_AGENT
  };

  try {
    const response = await axios.get(url, { params, headers });
    return parseGameSummary(response.data);
  } catch (error) {
    // Surface a clearer message with the attempted URL
    const err = error as Error & { response?: { status?: number; statusText?: string } };
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const detail = status ? ` (${status}${statusText ? ` ${statusText}` : ''})` : '';
    throw new Error(`Failed to fetch ${url}${detail}: ${err.message}`);
  }
}
