import { parseAoe4WorldGameUrl } from '@aoe4/analyzer-core/parser/aoe4WorldUrl';

export interface CanonicalMatchTarget {
  path: string;
  search: string;
  href: string;
}

export function canonicalMatchHref(rawUrl: string): CanonicalMatchTarget {
  const parsed = parseAoe4WorldGameUrl(rawUrl);
  const path = `/matches/${encodeURIComponent(parsed.profileSlug)}/${parsed.gameId}`;
  const searchParams = new URLSearchParams();

  if (parsed.sig) {
    searchParams.set('sig', parsed.sig);
  }

  const search = searchParams.toString();
  return {
    path,
    search,
    href: search.length > 0 ? `${path}?${search}` : path,
  };
}

export function nearestTimestamp(target: number, candidates: number[]): number | null {
  if (!Number.isFinite(target) || candidates.length === 0) {
    return null;
  }

  let closest = candidates[0];
  let minDistance = Math.abs(target - closest);

  for (let i = 1; i < candidates.length; i += 1) {
    const distance = Math.abs(target - candidates[i]);
    if (distance < minDistance) {
      closest = candidates[i];
      minDistance = distance;
    }
  }

  return closest;
}
