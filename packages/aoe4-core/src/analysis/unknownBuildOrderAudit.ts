import { StaticDataCache } from '../types';
import { GameSummary } from '../parser/gameSummaryParser';
import {
  getUnknownBuildOrderBucketHandling,
  ResolvedBuildItem,
  resolveBuildOrderItem,
  UnknownBuildOrderBucketHandling,
} from '../parser/buildOrderResolver';

export type UnknownBuildOrderBucketStatus = 'handled' | 'ignored' | 'needs-review';

export interface UnknownBuildOrderBucketFinding {
  playerName: string;
  civilization: string;
  pbgid: number;
  bucket: string;
  status: UnknownBuildOrderBucketStatus;
  handling: UnknownBuildOrderBucketHandling;
  itemName: string;
  timestamps: number[];
  timestampCount: number;
}

function titleCaseIconName(icon: string): string {
  const filename = icon.split('/').pop() ?? icon;
  const withoutExt = filename.replace(/\.(png|webp|jpg)$/i, '');
  return withoutExt
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function statusFromHandling(handling: UnknownBuildOrderBucketHandling): UnknownBuildOrderBucketStatus {
  if (handling === 'ignored') return 'ignored';
  if (handling === 'produced' || handling === 'destroyed') return 'handled';
  return 'needs-review';
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function isOutputOnlySelection(resolved: ResolvedBuildItem | null): boolean {
  if (!resolved || resolved.type !== 'upgrade') return false;

  const valuesToScan = [
    resolved.id,
    resolved.name,
    resolved.originalEntry.icon,
    ...resolved.classes,
  ].map(normalizeText);
  const outputOnlyTokens = [
    'vizier',
    'military-campus',
    'military_campus',
    'mehter-drums',
    'mehter_drums',
    'extensive-fortifications',
    'extensive_fortifications',
  ];

  return valuesToScan.some(value => outputOnlyTokens.some(token => value.includes(token)));
}

function countAuditedTimestamps(timestamps: number[]): number {
  const nonStarting = timestamps.filter(timestamp => timestamp > 0);
  return nonStarting.length > 0 ? nonStarting.length : timestamps.length;
}

export function auditUnknownBuildOrderBuckets(
  summary: GameSummary,
  staticData: StaticDataCache
): UnknownBuildOrderBucketFinding[] {
  const findings: UnknownBuildOrderBucketFinding[] = [];

  for (const player of summary.players) {
    for (const entry of player.buildOrder) {
      const unknown = entry.unknown ?? {};
      const bucketEntries = Object.entries(unknown)
        .filter(([, timestamps]) => timestamps.length > 0)
        .sort(([a], [b]) => Number(a) - Number(b));
      if (bucketEntries.length === 0) continue;

      const resolved = resolveBuildOrderItem(entry, staticData);
      for (const [bucket, timestamps] of bucketEntries) {
        let handling = getUnknownBuildOrderBucketHandling(entry.pbgid, bucket, entry.type, resolved);
        let status = statusFromHandling(handling);
        if (status === 'needs-review' && isOutputOnlySelection(resolved)) {
          handling = 'ignored';
          status = 'ignored';
        }
        findings.push({
          playerName: player.name,
          civilization: player.civilization,
          pbgid: entry.pbgid,
          bucket,
          status,
          handling,
          itemName: resolved?.name ?? titleCaseIconName(entry.icon),
          timestamps,
          timestampCount: countAuditedTimestamps(timestamps),
        });
      }
    }
  }

  return findings;
}
