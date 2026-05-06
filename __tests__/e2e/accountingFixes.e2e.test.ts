import { analyzeGame } from '../../packages/aoe4-core/src/analysis/gameAnalysis';
import { buildPostMatchViewModel } from '../../packages/aoe4-core/src/analysis/postMatchViewModel';
import { renderPostMatchHtml } from '../../packages/aoe4-core/src/formatters/postMatchHtml';
import { parseGameSummary } from '../../packages/aoe4-core/src/parser/gameSummaryParser';
import {
  makeAccountingFixesRawSummary,
  makeAccountingFixesStaticData,
} from '../helpers/accountingFixesFixture';

function pointAt<T extends { timestamp: number }>(series: T[], timestamp: number): T {
  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}

describe('accounting fixes end-to-end', () => {
  it('surfaces the corrected accounting in the post-match model and rendered payload', async () => {
    const summary = parseGameSummary(makeAccountingFixesRawSummary());
    const analysis = await analyzeGame(111, 999001, {
      summary,
      staticData: makeAccountingFixesStaticData(),
      skipNarrative: true,
      includeCombatAdjustedMilitary: false,
    });
    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111',
    });
    const html = renderPostMatchHtml(model, { surface: 'full' });

    const youVillagerAt120 = pointAt(model.villagerOpportunity.you.series, 120);
    const youVillagerAt360 = pointAt(model.villagerOpportunity.you.series, 360);

    expect(youVillagerAt360.expectedVillagers).toBe(youVillagerAt120.expectedVillagers);
    expect(pointAt(model.villagerOpportunity.you.series, 180).deathDeficit).toBe(0);
    expect(pointAt(analysis.deployedResourcePools.player1.series, 120).militaryActive).toBe(50);
    expect(pointAt(analysis.deployedResourcePools.player1.series, 180).militaryActive).toBe(0);
    expect(html).toContain('"label":"Military School"');
    expect(html).toContain('"label":"Mehmed Imperial Armory"');
    expect(html).toContain('"label":"Jeanne d\'Arc"');
  });
});
