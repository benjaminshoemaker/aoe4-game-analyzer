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
// CACHE_BASELINE bumps when the rendered HTML/script structure changes
// in a way that must invalidate any cached HTML. The actual cache key
// also folds in:
//   - the build SHA (so deploys auto-invalidate the on-disk cache),
//   - a hash of the env-derived analytics config (so token/host/env
//     changes don't get stuck behind cached HTML for up to 24 h).
// History (kept for grep-ability):
//   v4: low_underproduction reports inferred TC-idle seconds.
//   v5: significant event hover labels use event-window range.
//   v6: PostHog bootstrap syntax fix and local analytics delivery.
//   v7: engagement, acquisition, mobile timeline, outbound events.
//   v8: outcome header leads with player label.
//   v9: significant event encounter losses include gather-disruption detail rows.
const CACHE_BASELINE = 'v9';

type CacheEnv = Record<string, string | undefined>;

function readBuildIdentifier(env: CacheEnv): string {
  return (
    env.AOE4_RENDERED_REPORT_CACHE_BUILD_ID ||
    env.VERCEL_GIT_COMMIT_SHA ||
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    env.GIT_COMMIT_SHA ||
    ''
  ).trim();
}

function readAnalyticsIdentity(env: CacheEnv): string {
  // Mirror what `posthogAnalytics.ts` interpolates into the rendered
  // HTML so a token/host/env change reliably invalidates the cache.
  // Joined into a single hash input — the separator just has to be
  // unambiguous, so a printable delimiter is fine.
  return [
    env.NEXT_PUBLIC_POSTHOG_TOKEN || '',
    env.NEXT_PUBLIC_POSTHOG_HOST || '',
    env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT ||
      env.NEXT_PUBLIC_VERCEL_ENV ||
      env.VERCEL_ENV ||
      env.NODE_ENV ||
      '',
  ].join('|');
}

function shortHash(value: string): string {
  if (!value) return 'none';
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function computeCacheVersion(env: CacheEnv): string {
  const buildId = readBuildIdentifier(env);
  const analyticsHash = shortHash(readAnalyticsIdentity(env));
  return `${CACHE_BASELINE}-${buildId ? shortHash(buildId) : 'nobuild'}-${analyticsHash}`;
}

const CACHE_VERSION = computeCacheVersion(process.env as CacheEnv);

export function renderedReportCacheVersionForTests(env: CacheEnv = process.env as CacheEnv): string {
  return computeCacheVersion(env);
}

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

// Use a NUL byte as the in-memory key separator so it can never collide
// with profile slugs, sig hashes, or version markers. Built via
// String.fromCharCode rather than a string literal containing the byte
// itself so tooling and git keep treating the file as text.
const MEMORY_CACHE_KEY_SEPARATOR = String.fromCharCode(0);

function memoryCacheKey(params: RenderedReportCacheIdentity): string {
  return renderedReportCacheKeyParts(params).join(MEMORY_CACHE_KEY_SEPARATOR);
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
