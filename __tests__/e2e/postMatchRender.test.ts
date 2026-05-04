import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { makeSplitVillagerStaticDataCache } from '../helpers/splitVillagerDeathsFixture';
import { makeUnknownBucketStaticDataCache } from '../helpers/unknownBucketMechanicsFixture';
import { makeUpgradedUnitDeathsStaticDataCache } from '../helpers/upgradedUnitDeathsFixture';

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.resolve(projectRoot, 'src/index.ts');
const cachePath = path.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path.resolve(projectRoot, '__tests__/helpers/setupNock.ts');
const fixtureSetup = path.resolve(projectRoot, '__tests__/helpers/setupAnalyzeNock.ts');
const outputPath = path.resolve(projectRoot, 'tmp', 'e2e-post-match.html');
const upgradedOutputPath = path.resolve(projectRoot, 'tmp', 'e2e-post-match-upgraded-deaths.html');

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

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
}

describe('post-match render CLI end-to-end', () => {
  beforeEach(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    if (fs.existsSync(upgradedOutputPath)) {
      fs.unlinkSync(upgradedOutputPath);
    }
  });

  it('renders a post-match HTML report with required sections', () => {
    const result = runCli(['render-post-match', '111', '123456', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Match recap');
    expect(html).toContain('Allocation lead and mix over time');
    expect(html).toContain('Gather rate');
    expect(html).toContain('Villager opportunity cost');
    expect(html).toContain('Where the gap came from');
    expect(html).toContain('One-line story');
    expect(html).not.toContain('Final pool delta');
    expect(html).not.toContain('<section class="panel metrics">');
    expect(html).toContain('<svg');
    expect(html).toContain('id="allocation-leader-strip"');
    expect(html).toContain('id="allocation-comparison"');
    expect(html).toContain('data-allocation-leader-segment');
    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="economic"');
    expect(leaderStrip).toContain('data-category-key="technology"');
    expect(leaderStrip).toContain('data-category-key="military"');
    expect(leaderStrip).not.toContain('data-category-key="destroyed"');
    expect(leaderStrip).not.toContain('data-category-key="overall"');
    expect(leaderStrip).not.toContain('data-category-key="float"');
    expect(html).toContain('<details class="allocation-read-guide" aria-label="Allocation chart legend">');
    expect(html).toContain('<summary class="allocation-read-guide-summary">How to read this chart</summary>');
    expect(html).toContain('Leader strip: current tracked-value leader by 30-second block');
    expect(html).toContain('Economic, Technology, and Military: percentage share of current tracked pool');
    expect(html).toContain('Destroyed: cumulative value assumed destroyed by opponent');
    expect(html).toContain('Overall: absolute current tracked pool value');
    expect(html).toContain('Float (not deployed): live stockpile resources not currently committed');
    expect(html).toContain('class="allocation-lane allocation-lane-overall"');
    expect(html).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(html).toContain('class="allocation-lane allocation-lane-float"');
    expect(html).not.toContain('Overall resources');
    expect(html).toContain('data-secondary-section="gather-rate"');
    expect(html).toContain('class="secondary-summary"');
    expect(html).toContain('data-fixed-label="true"');
    expect(html).toContain('x1="96"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-label-strategy-economic');
    expect(html).toContain('data-hover-label-strategy-technology');
    expect(html).toContain('data-hover-label-strategy-military');
    expect(html).toContain('data-hover-label-strategy-destroyed');
    expect(html).toContain('data-hover-label-strategy-overall');
    expect(html).toContain('data-hover-label-strategy-float');
    expect(html).toContain('data-hover-field="allocationCategory.economic.net.you"');
    expect(html).toContain('data-hover-field="allocationCategory.technology.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.other.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.destroyed.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.investment.delta"');
    expect(html).toContain('data-hover-field="allocation.float.delta"');
    expect(html).not.toContain('data-inspector-row="destroyed"');
    expect(html).not.toContain('data-band-key="destroyed"');
    expect(html).toContain('data-allocation-category-accounting="military-destroyed"');
    const destroyedRowTooltip = 'Destroyed rows show value destroyed for the team in that column, not by that team. The opponent destroyed that value.';
    expect(html.split(`data-destroyed-tooltip-copy="${destroyedRowTooltip}"`).length - 1).toBe(4);
    expect(html.split(`class="destroyed-row-label"`).length - 1).toBe(4);
    expect(html.split(`class="event-impact-help-button destroyed-row-help-button"`).length - 1).toBe(4);
    expect(html.split(`data-tooltip-open="false"`).length - 1).toBe(4);
    expect(html.split(`aria-expanded="false" aria-controls="destroyed-row-tooltip-`).length - 1).toBe(4);
    expect(html.split(`class="destroyed-row-tooltip" role="tooltip" hidden`).length - 1).toBe(4);
    expect(html).toContain('.destroyed-row-help-button[data-tooltip-open="true"] + .destroyed-row-tooltip');
    expect(html).toContain('background: #1f2a1f;');
    expect(html).not.toContain('class="band-toggle destroyed-row-help-toggle"');
    expect(html).not.toContain('.band-toggle:hover .destroyed-row-tooltip');
    expect(html).toContain('data-allocation-category-accounting="military-investment"');
    expect(html).toContain('data-band-key="militaryDestroyed"');
    const otherRowIndex = html.indexOf('data-allocation-category-row="other"');
    const otherDestroyedRowIndex = html.indexOf('data-allocation-category-accounting="other-destroyed"');
    const otherInvestmentRowIndex = html.indexOf('data-allocation-category-accounting="other-investment"');
    const totalPoolIndex = html.indexOf('data-total-pool-tooltip');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(otherDestroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(otherInvestmentRowIndex).toBeGreaterThan(otherDestroyedRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(otherInvestmentRowIndex);
    expect(html).toContain('data-total-pool-tooltip');
    expect(html).toContain('Total net pool');
    expect(html).toContain('Economic net + Technology net + Military net + Other net = Total pool');
    expect(html).toContain('Age timings');
    expect(html).toContain('PlayerOne · English Feudal 3:20');
    expect(html).toContain('PlayerTwo · French Castle 10:00');
    expect(html).toContain('id="hover-inspector"');
    expect(html).toContain('id="post-match-hover-data"');
    expect(html).toContain('data-hover-timestamp="200"');
    expect(html).toContain('data-allocation-category-toggle="economic" aria-expanded="true"');
    expect(html).toContain('data-allocation-category-toggle="technology" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="military" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="other" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-child="military" hidden');
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
    expect(html).toContain("return entry.label + (Number.isFinite(count) && count > 0 ? ' (' + formatNumber(count) + ')' : '');");
    expect(html).not.toContain("formatNumber(entry.value) + ' <small>('");
    expect(html).not.toContain('Deployed resource pool over time');
    expect(html).not.toContain('Strategic allocation state');
    expect(html).not.toContain('id="pool-comparison"');
  });

  it('renders Malian cattle in the economic deployed pool breakdown', () => {
    const result = runCli(['render-post-match', '111', '654321', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Allocation lead and mix over time');
    expect(html).toContain('"label":"Cattle"');
    expect(html).toContain('"value":180');
  });

  it('renders Sengoku Yatai in the economic deployed pool breakdown', () => {
    const result = runCli(['render-post-match', '111', '229727104', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Allocation lead and mix over time');
    expect(html).toContain('"label":"Yatai"');
    expect(html).toContain('"value":250');
  });

  it('renders confirmed unknown-bucket mechanics in deployed pool breakdowns', () => {
    fs.writeFileSync(cachePath, JSON.stringify(makeUnknownBucketStaticDataCache()), 'utf-8');

    const result = runCli(['render-post-match', '111', '876543', '--out', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = fs.readFileSync(outputPath, 'utf-8');
    const hoverData = extractHoverData(html);
    const economicSnapshot = hoverData.find(point => point.timestamp === 415);
    expect(html).toContain('"label":"Trade Caravan"');
    expect(html).toContain('"label":"Imperial Official"');
    expect(html).toContain('"label":"Pilgrim"');
    expect(html).toContain('"label":"Fishing Boat"');
    expect(html).toContain('"label":"Trader"');
    expect(html).toContain('"label":"Pit Mine"');
    expect(html).toContain('"label":"Ger"');
    expect(html).toContain('"label":"Ovoo"');
    expect(html).toContain('"economicRole":"resourceGenerator"');
    expect(html).toContain('"economicRole":"resourceInfrastructure"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.you"');
    expect(html).toContain('data-economic-role-filter="resourceGenerator"');
    expect(html).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(html).toContain('data-allocation-investment-category="economic"');
    expect(html).toContain('data-band-key="militaryInvestment"');
    expect(html).toContain('Total Economic Investment');
    expect(html).toContain('Total Military Investment');
    expect(html).toContain("selectedEconomicRoleFilter = key === 'economic'");
    expect(html).toContain('data-destroyed-row-category="economic" data-destroyed-row-empty="true" hidden');
    expect(html).toContain('Advancement destroyed');
    expect(html).not.toContain('Technology destroyed');
    expect(html).not.toContain('<li class="band-breakdown-group">Resource generators</li>');
    expect(html).not.toContain('<li class="band-breakdown-group">Resource infrastructure</li>');
    expect(economicSnapshot?.allocationCategory.economic).toEqual(expect.objectContaining({
      resourceGeneration: expect.objectContaining({ you: 1110 }),
      resourceInfrastructure: expect.objectContaining({ you: 850 }),
    }));
    expect(html).toContain('"label":"Tower of the Sultan"');
    expect(html).toContain('"label":"Battering Ram"');
    expect(html).toContain('"label":"Mangonel"');
    expect(html).toContain('"label":"Cheirosiphon"');
    expect(html).not.toContain('"label":"Trade Cart"');
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
    expect(html).toContain("return entry.label + (Number.isFinite(count) && count > 0 ? ' (' + formatNumber(count) + ')' : '');");
    expect(html).not.toContain("formatNumber(entry.value) + ' <small>('");
    expect(point?.bandBreakdown?.economicDestroyed?.opponent).toEqual([
      expect.objectContaining({
        label: 'Villager',
        value: 50,
        count: 1,
        percent: 100,
      }),
    ]);
    expect(point?.significantEvent).toEqual(expect.objectContaining({
      victim: 'opponent',
      kind: 'raid',
      immediateLoss: 50,
      villagerDeaths: 1,
    }));
    expect(point?.markers).toContain('Sengoku Daimyo Raid 1:30-2:30');
    expect(point?.markers).not.toContain('Sengoku Daimyo Raid 2:30');
    expect(html).toContain('data-significant-event-marker');
    expect(html).toContain('data-significant-event-window');
    expect(html).toContain('class="significant-event-window"');
    expect(html).toContain('display="none"');
    expect(html).toContain('function syncSignificantEventWindowSpotlight(point)');
    expect(html).toContain("document.querySelectorAll('[data-significant-event-window]').forEach");
    expect(html).toMatch(/<details class="event-impact" data-significant-event(?: hidden)? open>/);
    expect(html).toContain('<summary class="event-impact-heading">Event impact</summary>');
    expect(html).toContain('Event impact');
    expect(html).toContain('data-significant-event-loss-summary="player2"');
    expect(html).toContain('data-significant-event-loss-share-label="player2">Share of Player 2 deployed</dt>');
    expect(html).not.toContain('<dt>Share of deployed</dt>');
  });

  it('renders corrected hover military value after upgraded-unit deaths', () => {
    fs.writeFileSync(cachePath, JSON.stringify(makeUpgradedUnitDeathsStaticDataCache()), 'utf-8');

    const result = runCli(['render-post-match', '111', '909090', '--out', upgradedOutputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(upgradedOutputPath)).toBe(true);

    const html = fs.readFileSync(upgradedOutputPath, 'utf-8');
    const hoverData = extractHoverData(html);
    const point = hoverData.find(snapshot => snapshot.timestamp === 120);

    expect(point?.you.militaryActive).toBe(80);
    expect(point?.allocation.military.you).toBe(80);
    expect(point?.bandBreakdown?.militaryActive?.you).toEqual([
      expect.objectContaining({
        label: 'Hardened Spearman',
        value: 80,
        count: 1,
      }),
    ]);
  });
});
