export type Aoe4WorldRequestKind = 'summary' | 'static-data';

export const AOE4WORLD_STATIC_DATA_ENDPOINTS = {
  units: 'https://data.aoe4world.com/units/all.json',
  buildings: 'https://data.aoe4world.com/buildings/all.json',
  technologies: 'https://data.aoe4world.com/technologies/all.json',
} as const;

const USER_AGENT_BY_KIND: Record<Aoe4WorldRequestKind, string> = {
  summary: 'aoe4-game-analyzer-core/0.1 summary-client',
  'static-data': 'aoe4-game-analyzer-core/0.1 static-data-client',
};

export interface Aoe4WorldRequest {
  url: string;
  params: Record<string, string | number>;
  headers: Record<string, string>;
}

export function buildAoe4WorldHeaders(kind: Aoe4WorldRequestKind): Record<string, string> {
  return {
    Accept: 'application/json',
    'User-Agent': USER_AGENT_BY_KIND[kind],
  };
}

export function buildGameSummaryRequest(
  profileId: number | string,
  gameId: number,
  sig?: string,
  apiKey?: string
): Aoe4WorldRequest {
  const profileSlug = typeof profileId === 'string' ? profileId : String(profileId);
  const params: Record<string, string | number> = { camelize: 'true' };
  if (sig) {
    params.sig = sig;
  }
  if (apiKey) {
    params.api_key = apiKey;
  }

  return {
    url: `https://aoe4world.com/players/${profileSlug}/games/${gameId}/summary`,
    params,
    headers: buildAoe4WorldHeaders('summary'),
  };
}
