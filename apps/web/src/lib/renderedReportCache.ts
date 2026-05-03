import { createHash } from 'crypto';
import { unstable_cache } from 'next/cache';

export interface RenderedReportCacheIdentity {
  profileSlug: string;
  gameId: number;
  sig?: string;
}

export const RENDERED_REPORT_CACHE_REVALIDATE_SECONDS = 24 * 60 * 60;

const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;
const MEMORY_CACHE_LIMIT = 25;
const CACHE_NAMESPACE = 'aoe4-rendered-report-html';
// Bumped whenever the rendered HTML / inline script changes in a way that
// must invalidate any cached HTML.
// v4: low_underproduction now reports inferred TC-idle seconds, crediting
// in-progress villager training before the villager completion timestamp.
const CACHE_VERSION = 'v4';

type RenderedReportCacheEntry = {
  html: string;
  expiresAt: number;
};

const memoryCache = new Map<string, RenderedReportCacheEntry>();

export function sigCacheToken(sig?: string): string {
  const normalized = sig?.trim();
  if (!normalized) return 'public';

  return `sig-sha256:${createHash('sha256').update(normalized).digest('hex')}`;
}

export function renderedReportCacheKeyParts(params: RenderedReportCacheIdentity): string[] {
  return [
    CACHE_NAMESPACE,
    CACHE_VERSION,
    params.profileSlug,
    String(params.gameId),
    sigCacheToken(params.sig),
  ];
}

export function renderedReportCacheTag(params: RenderedReportCacheIdentity): string {
  return `aoe4-rendered-report:${params.profileSlug}:${params.gameId}`;
}

function memoryCacheKey(params: RenderedReportCacheIdentity): string {
  return renderedReportCacheKeyParts(params).join('\u0000');
}

function getMemoryCachedHtml(params: RenderedReportCacheIdentity, now: number): string | null {
  const key = memoryCacheKey(params);
  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= now) {
    memoryCache.delete(key);
    return null;
  }

  memoryCache.delete(key);
  memoryCache.set(key, cached);
  return cached.html;
}

function setMemoryCachedHtml(params: RenderedReportCacheIdentity, html: string, now: number): void {
  memoryCache.set(memoryCacheKey(params), {
    html,
    expiresAt: now + MEMORY_CACHE_TTL_MS,
  });

  while (memoryCache.size > MEMORY_CACHE_LIMIT) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
}

function isMissingIncrementalCacheError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('incrementalCache missing');
}

async function readPersistentCachedHtml(
  params: RenderedReportCacheIdentity,
  render: () => Promise<string>
): Promise<string> {
  const cachedRender = unstable_cache(render, renderedReportCacheKeyParts(params), {
    revalidate: RENDERED_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: [renderedReportCacheTag(params)],
  });

  try {
    return await cachedRender();
  } catch (error) {
    if (process.env.NODE_ENV === 'test' && isMissingIncrementalCacheError(error)) {
      return render();
    }
    throw error;
  }
}

export async function getRenderedReportHtml(
  params: RenderedReportCacheIdentity,
  render: () => Promise<string>,
  now = Date.now()
): Promise<string> {
  const memoryCachedHtml = getMemoryCachedHtml(params, now);
  if (memoryCachedHtml) return memoryCachedHtml;

  const html = await readPersistentCachedHtml(params, render);
  setMemoryCachedHtml(params, html, now);
  return html;
}

export function clearRenderedReportCacheForTests(): void {
  memoryCache.clear();
}
