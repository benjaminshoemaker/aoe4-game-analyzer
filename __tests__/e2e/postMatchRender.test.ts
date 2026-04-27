import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { makeSplitVillagerStaticDataCache } from '../helpers/splitVillagerDeathsFixture';

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.resolve(projectRoot, 'src/index.ts');
const cachePath = path.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path.resolve(projectRoot, '__tests__/helpers/setupNock.ts');
const fixtureSetup = path.resolve(projectRoot, '__tests__/helpers/setupAnalyzeNock.ts');
const outputPath = path.resolve(projectRoot, 'tmp', 'e2e-post-match.html');

function runCli(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(
    'node',
    ['-r', tsNodeRegister, '-r', setupNock, '-r', fixtureSetup, cliEntry, ...args],
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0' }
    }
  );
}

function extractHoverData(html: string): any[] {
  const match = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('post-match hover data not found');
  return JSON.parse(match[1]);
}

describe('post-match render CLI end-to-end', () => {
  beforeEach(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  it('renders a post-match HTML report with required sections', () => {
    const result = runCli(['render-post-match', '111', '123456', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Match recap');
    expect(html).toContain('Deployed resource pool over time');
    expect(html).toContain('Strategic allocation state');
    expect(html).toContain('Gather rate');
    expect(html).toContain('Villager opportunity cost');
    expect(html).toContain('Where the gap came from');
    expect(html).toContain('One-line story');
    expect(html).toContain('Final pool delta');
    expect(html).toContain('<svg');
    expect(html).toContain('id="pool-comparison"');
    expect(html).toContain('id="strategy-allocation"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-field="strategy.economy.delta"');
    expect(html).toContain('data-hover-field="strategy.military.delta"');
    expect(html).toContain('data-hover-field="strategy.technology.delta"');
    expect(html).toContain('Age timings');
    expect(html).toContain('Pool delta (You - Opponent)');
    expect(html).toContain('You Feudal 3:20');
    expect(html).toContain('Opponent Castle 10:00');
    expect(html).toContain('id="hover-inspector"');
    expect(html).toContain('id="post-match-hover-data"');
    expect(html).toContain('data-hover-timestamp="200"');
    expect(html).toContain('data-hover-label-pool-total-you');
    expect(html).toContain('Research');
    expect(html).toContain('Population cap');
    expect(html).toContain('Advancement');
    expect(html).toContain('AoE4World summary');
    expect(html).toContain('https://aoe4world.com/players/111/games/123456');
    expect(html).toContain('Adjusted mil active');
    expect(html).toContain('data-open-adjusted-explainer');
    expect(html).toContain('Adjusted military active method');
    expect(html).toContain('CounterAdjustedArmyValue');
    expect(html).toContain('Adjusted military active breakdown');
    expect(html).toContain('id="villager-opportunity"');
    expect(html).toContain('id="villager-opportunity-you"');
    expect(html).toContain('id="villager-opportunity-opponent"');
    expect(html).toContain('Expected villager rate');
    expect(html).toContain('Unrecovered villager-seconds');
    expect(html).toContain('Underproduction');
    expect(html.indexOf('Unrecovered villager-seconds')).toBeLessThan(html.indexOf('Underproduction deficit'));
    expect(html).toContain('Underproduction deficit</span><strong>49</strong>');
    expect(html).toContain('Villagers lost');
    expect(html).toContain('Cumulative loss');
    expect(html).toContain('Loss of possible gather');
    expect(html).toContain('Damage dealt to opponent eco');
    expect(html).toContain('Resources gained');
    expect(html).toContain('Resources possible');
    expect(html).toContain('data-hover-line-villager-you');
    expect(html).toContain('data-hover-line-villager-opponent');
    expect(html).toContain('data-hover-label-villager-you-loss');
    expect(html).toContain('data-hover-label-villager-opponent-possible');
    expect(html).toContain('data-adjusted-field="timeLabel"');
    expect(html).toContain('data-adjusted-field="you.raw"');
    expect(html).toContain('data-adjusted-field="you.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="you.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="you.final"');
    expect(html).toContain('data-adjusted-field="opponent.raw"');
    expect(html).toContain('data-adjusted-field="opponent.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="opponent.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="opponent.final"');
    expect(html).toContain('Military research');
    expect(html).toContain('Economic research');
    expect(html).toContain('adjustedMilitary.youPct');
    expect(html).toContain('data-hover-field="adjustedMilitary.you"');
    expect(html).toContain('data-band-key="economic"');
    expect(html).toContain('data-band-key="populationCap"');
    expect(html).toContain('data-band-key="advancement"');
    expect(html).toContain('data-band-breakdown-title');
    expect(html).toContain('data-band-breakdown-list="you"');
    expect(html).toContain('class="inspector-table-wrap" tabindex="0" role="region" aria-label="Hover inspector values table"');
    expect(html).toContain('data-cell-label="You"');
    expect(html).toContain('data-cell-label="Opp"');
    expect(html).toContain('data-cell-label="Delta"');
    expect(html).toContain('class="band-item-label band-item-label-truncated"');
    expect(html).toContain('@media (max-width: 760px)');
    expect(html).toContain('content: attr(data-cell-label);');
    expect(html).not.toContain('"label":"Wheelbarrow (1)"');
    expect(html).toContain('function updateInspector');
    expect(html).toContain('Click to pin');
  });

  it('renders Malian cattle in the economic deployed pool breakdown', () => {
    const result = runCli(['render-post-match', '111', '654321', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Deployed resource pool over time');
    expect(html).toContain('"label":"Cattle"');
    expect(html).toContain('"value":180');
  });

  it('renders worker deaths once when starting and trained workers share one build-order entry', () => {
    fs.writeFileSync(cachePath, JSON.stringify(makeSplitVillagerStaticDataCache()), 'utf-8');

    const result = runCli(['render-post-match', '111', '765432', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    const hoverData = extractHoverData(html);
    const point = hoverData.find(snapshot => snapshot.timestamp === 150);
    const opponentVillager = point?.bandBreakdown?.economic?.opponent?.find(
      (entry: any) => entry.label === 'Villager'
    );

    expect(opponentVillager).toEqual(expect.objectContaining({
      value: 450,
      count: 9,
    }));
  });
});
