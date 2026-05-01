import {
  buildPostMatchHoverPayload,
  renderPostMatchHtml,
} from '../../src/lib/aoe4/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

function extractHoverPayload(html: string): any[] {
  const payloadMatch = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!payloadMatch) throw new Error('Expected post-match hover data payload');
  return JSON.parse(payloadMatch[1]);
}

function makePayloadHeavyModel() {
  const model = structuredClone(makeMvpModelFixture());
  const baseSnapshot = model.trajectory.hoverSnapshots[0];
  const snapshotCount = 120;
  const entryCount = 40;

  model.trajectory.durationSeconds = (snapshotCount - 1) * 30;
  model.gatherRate.durationSeconds = model.trajectory.durationSeconds;
  model.trajectory.hoverSnapshots = Array.from({ length: snapshotCount }, (_, snapshotIndex) => {
    const timestamp = snapshotIndex * 30;
    const entries = Array.from({ length: entryCount }, (_, entryIndex) => ({
      label: `0:${String(entryIndex).padStart(2, '0')}-${timestamp}`,
      value: 1000 - entryIndex,
      percent: 100 / entryCount,
      count: entryIndex + 1,
    }));

    return {
      ...baseSnapshot,
      timestamp,
      timeLabel: `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, '0')}`,
      bandBreakdown: {
        ...baseSnapshot.bandBreakdown,
        opportunityLost: {
          you: entries,
          opponent: entries,
        },
      },
    };
  });

  return model;
}

describe('post-match Core Web Vitals budget', () => {
  it('ships only hover data used by the MVP allocation view', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());
    const payload = extractHoverPayload(html);

    expect(payload[0]).toEqual(expect.objectContaining({
      timestamp: 0,
      timeLabel: '0:00',
      allocation: expect.any(Object),
      strategy: expect.any(Object),
      gather: expect.any(Object),
      bandBreakdown: expect.any(Object),
    }));
    expect(payload[0]).not.toHaveProperty('adjustedMilitary');
    expect(payload[0]).not.toHaveProperty('villagerOpportunity');
    expect(payload[0]).not.toHaveProperty('accounting');
    expect(payload[0]).not.toHaveProperty('poolX');
    expect(payload[0]).not.toHaveProperty('gatherX');
    expect(payload[0]).not.toHaveProperty('villagerX');
  });

  it('does not ship CSS or interaction handlers for removed report widgets', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).not.toContain('function adjustedMatrixHtml');
    expect(html).not.toContain('setAdjustedField');
    expect(html).not.toContain('data-hover-line-pool');
    expect(html).not.toContain('data-hover-line-gather');
    expect(html).not.toContain('data-hover-line-villager');
    expect(html).not.toContain('.adjusted-matrix');
    expect(html).not.toContain('.villager-opportunity-chart');
    expect(html).not.toContain('.events-grid');
    expect(html).not.toContain('.secondary-panel');
    expect(html).not.toContain('.gather-chart');
    expect(html).not.toContain('.pool-chart');
  });

  it('loads the full hover payload externally and keeps inline bootstrap data small', () => {
    const html = renderPostMatchHtml(makePayloadHeavyModel(), {
      hoverDataUrl: '/matches/my-slug/230143339/hover-data?sig=abc123',
    });
    const payload = extractHoverPayload(html);

    expect(html).toContain('id="post-match-hover-data-url"');
    expect(html).toContain('/matches/my-slug/230143339/hover-data?sig=abc123');
    expect(payload).toHaveLength(1);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(80 * 1024);
    expect(Buffer.byteLength(html)).toBeLessThan(512 * 1024);
  });

  it('caps verbose band breakdowns and aggregates the remainder in the client hover payload', () => {
    const payload = buildPostMatchHoverPayload(makePayloadHeavyModel());
    const firstOpportunityBreakdown = payload[0].bandBreakdown.opportunityLost?.you ?? [];

    expect(firstOpportunityBreakdown).toHaveLength(13);
    expect(firstOpportunityBreakdown.at(-1)).toEqual(expect.objectContaining({
      label: 'Other active items (28)',
      count: 742,
    }));
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(2 * 1024 * 1024);
  });
});
