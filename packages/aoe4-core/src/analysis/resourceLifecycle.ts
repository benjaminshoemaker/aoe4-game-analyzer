import type { ResolvedBuildItem } from '../parser/buildOrderResolver';

export type LifecycleEventKind = 'produced' | 'destroyed';

export interface LifecycleEvent {
  timestamp: number;
  kind: LifecycleEventKind;
}

export interface LifecycleContextLike {
  item: ResolvedBuildItem;
  lineKey: string;
  order: number;
}

export interface BuildLifecycleEventsOptions {
  producedTimestamps?: number[];
}

export interface FindFallbackLifecycleContextParams<T extends LifecycleContextLike> {
  eventContext: T;
  contexts: T[];
  activeCount: (context: T) => number;
  samePool?: (context: T, eventContext: T) => boolean;
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

export function normalizeLineToken(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripTierSuffix(value: string): string {
  return normalizeLineToken(value).replace(/-(?:1|2|3|4|5)$/, '');
}

export function stripTierNamePrefix(value: string): string {
  return normalizeLineToken(value).replace(/^(?:early|hardened|veteran|elite|imperial)-/, '');
}

export function unitLineKey(item: ResolvedBuildItem): string {
  if (item.type !== 'unit') return `${item.type}:${stripTierSuffix(item.id)}`;
  if (item.baseId) return stripTierSuffix(item.baseId);

  const idKey = stripTierSuffix(item.id);
  if (idKey) return idKey;

  return stripTierNamePrefix(item.name);
}

export function buildLifecycleEvents(
  item: ResolvedBuildItem,
  options: BuildLifecycleEventsOptions = {}
): LifecycleEvent[] {
  const producedTimestamps = options.producedTimestamps ?? item.produced;

  return [
    ...producedTimestamps.map(timestamp => ({ timestamp, kind: 'produced' as const })),
    ...item.destroyed.map(timestamp => ({ timestamp, kind: 'destroyed' as const })),
  ].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.kind === b.kind) return 0;
    return a.kind === 'produced' ? -1 : 1;
  });
}

export function findFallbackLifecycleContext<T extends LifecycleContextLike>(
  params: FindFallbackLifecycleContextParams<T>
): T | null {
  const { eventContext, contexts, activeCount, samePool } = params;
  if (eventContext.item.type !== 'unit') return null;

  const eventTier = eventContext.item.tier;
  const candidates = contexts
    .filter(context =>
      context !== eventContext &&
      context.item.type === 'unit' &&
      context.lineKey === eventContext.lineKey &&
      (samePool ? samePool(context, eventContext) : true) &&
      activeCount(context) > 0
    )
    .sort((a, b) => {
      const aAboveEventTier = a.item.tier > eventTier ? 1 : 0;
      const bAboveEventTier = b.item.tier > eventTier ? 1 : 0;
      if (aAboveEventTier !== bAboveEventTier) return aAboveEventTier - bAboveEventTier;
      return b.item.tier - a.item.tier || b.order - a.order;
    });

  return candidates[0] ?? null;
}
