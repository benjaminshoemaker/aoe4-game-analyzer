import { auditUnknownBuildOrderBuckets } from '../../src/analysis/unknownBuildOrderAudit';
import { parseGameSummary } from '../../src/parser/gameSummaryParser';
import {
  makeUnknownBucketMechanicsFixture,
  makeUnknownBucketStaticDataCache,
} from '../helpers/unknownBucketMechanicsFixture';

describe('unknown build-order bucket audit', () => {
  it('flags only unhandled unknown buckets and documents handled or ignored buckets', () => {
    const fixture = makeUnknownBucketMechanicsFixture();
    fixture.players[0].buildOrder.push({
      id: 'unmapped',
      icon: 'icons/races/test/units/new_economic_unit',
      pbgid: 99999999,
      type: 'Unit',
      finished: [],
      constructed: [],
      destroyed: [],
      unknown: { '14': [777] },
    });
    fixture.players[0].buildOrder.push({
      id: 'vizier-choice',
      icon: 'icons/races/ottoman/upgrades/vizier_military_campus',
      pbgid: 2059331,
      type: 'Unknown',
      finished: [],
      constructed: [],
      destroyed: [],
      unknown: { '10': [888] },
    });

    const summary = parseGameSummary(fixture);
    const staticData = makeUnknownBucketStaticDataCache();
    staticData.technologies.push({
      id: 'vizier-military-campus',
      name: 'Military Campus',
      baseId: 'vizier-military-campus',
      pbgid: 2059331,
      civs: ['ot'],
      costs: {},
      classes: ['vizier_choice'],
      age: 2,
      icon: 'icons/races/ottoman/upgrades/vizier_military_campus',
    });
    const findings = auditUnknownBuildOrderBuckets(summary, staticData);

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ pbgid: 2762454, bucket: '14', status: 'handled' }),
      expect.objectContaining({ pbgid: 5000301, bucket: '15', status: 'handled' }),
      expect.objectContaining({ pbgid: 9001316, bucket: '15', status: 'handled' }),
      expect.objectContaining({ pbgid: 9003449, bucket: '15', status: 'ignored' }),
      expect.objectContaining({ pbgid: 2059331, bucket: '10', status: 'ignored' }),
      expect.objectContaining({ pbgid: 99999999, bucket: '14', status: 'needs-review' }),
    ]));
  });
});
