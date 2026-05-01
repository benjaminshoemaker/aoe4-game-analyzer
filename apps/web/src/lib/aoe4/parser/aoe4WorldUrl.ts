export interface ParsedAoe4WorldUrl {
  originalUrl: string;
  profileSlug: string;
  gameId: number;
  sig?: string;
}

function normalizeUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Invalid AoE4World game URL: empty input');
  }

  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withScheme);
  } catch {
    throw new Error(`Invalid AoE4World game URL: ${rawUrl}`);
  }
}

function validateHost(url: URL, originalUrl: string): void {
  const host = url.hostname.toLowerCase();
  if (host !== 'aoe4world.com' && host !== 'www.aoe4world.com') {
    throw new Error(`Invalid AoE4World game URL: ${originalUrl}`);
  }
}

function parsePath(url: URL, originalUrl: string): { profileSlug: string; gameId: number } {
  const match = url.pathname.match(/^\/players\/([^/]+)\/games\/(\d+)\/?$/);
  if (!match) {
    throw new Error(`Invalid AoE4World game URL: ${originalUrl}`);
  }

  const profileSlug = decodeURIComponent(match[1]);
  const gameId = Number(match[2]);

  if (!profileSlug || Number.isNaN(gameId) || gameId <= 0) {
    throw new Error(`Invalid AoE4World game URL: ${originalUrl}`);
  }

  return { profileSlug, gameId };
}

export function parseAoe4WorldGameUrl(rawUrl: string): ParsedAoe4WorldUrl {
  const originalUrl = rawUrl;
  const url = normalizeUrl(rawUrl);

  validateHost(url, originalUrl);
  const { profileSlug, gameId } = parsePath(url, originalUrl);

  const sig = url.searchParams.get('sig') ?? undefined;

  return {
    originalUrl,
    profileSlug,
    gameId,
    sig,
  };
}
