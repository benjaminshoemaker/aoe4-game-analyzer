import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.resolve(projectRoot, 'src/index.ts');
const cachePath = path.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path.resolve(projectRoot, '__tests__/helpers/setupNock.ts');

function runCli(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(
    'node',
    ['-r', tsNodeRegister, '-r', setupNock, cliEntry, ...args],
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0' }
    }
  );
}

describe('CLI end-to-end', () => {
  beforeEach(() => {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  it('fetch-data downloads and caches data', () => {
    const result = runCli(['fetch-data']);

    expect(result.status).toBe(0);
    expect(fs.existsSync(cachePath)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    expect(cached.units).toHaveLength(sampleUnits.length);
    expect(cached.buildings).toHaveLength(sampleBuildings.length);
    expect(cached.technologies).toHaveLength(sampleTechnologies.length);
  });

  it('check-data reports cache status', () => {
    // Ensure cache exists first
    const fetchResult = runCli(['fetch-data']);
    expect(fetchResult.status).toBe(0);

    const result = runCli(['check-data']);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Data cached at .*?, 1 units, 1 buildings, 1 technologies/);
  });

  it('test-upgrade-parsing outputs tier and upgrade info', () => {
    const result = runCli(['test-upgrade-parsing']);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Unit tier parsing:/i);
    expect(result.stdout).toMatch(/musofadi_2 .*1.2/);
    expect(result.stdout).toMatch(/knight_3\.png .*1\.35/);
    expect(result.stdout).toMatch(/Upgrade effect lookup:/i);
    expect(result.stdout).toMatch(/upgradeWeaponsDamageII .*0.1/);
    expect(result.stdout).toMatch(/Seed used: demo-seed/i);
  });

  it('test-counters demonstrates classification and matchup analysis', () => {
    const result = runCli(['test-counters']);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Spearman: .*spearman/i);
    expect(result.stdout).toMatch(/Seed used: demo-seed/i);
    expect(result.stdout).toMatch(/Raw Values:/i);
    expect(result.stdout).toMatch(/Army 1: .*3200\.00/i);
    expect(result.stdout).toMatch(/Army 2: .*4080\.00/i);
    expect(result.stdout).toMatch(/Adjusted Values:/i);
    expect(result.stdout).toMatch(/Army 1:\s+3213\.18/i);
    expect(result.stdout).toMatch(/Army 2:\s+4294\.20/i);
    expect(result.stdout).toMatch(/Favored: Army 2/i);
    expect(result.stdout).toMatch(/Key Matchups:/i);
    expect(result.stdout).toMatch(/Spearman .*vs.* Knight/i);
    expect(result.stdout).toMatch(/Crossbowman .*vs.* Knight/i);
    expect(result.stdout).toMatch(/Army 1 Breakdown:/i);
    expect(result.stdout).toMatch(/Knight: raw 2400\.00 -> adjusted/i);
    expect(result.stdout).toMatch(/Army 2 Breakdown:/i);
    expect(result.stdout).toMatch(/Crossbowman: raw 1440\.00 -> adjusted/i);
  });

  it('parse command summarizes a local game file', () => {
    const samplePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
    const result = runCli(['parse', samplePath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Game ID: 123456/i);
    expect(result.stdout).toMatch(/Map: Dry Arabia/i);
    expect(result.stdout).toMatch(/Player 1: .*PlayerOne .*English/i);
    expect(result.stdout).toMatch(/Player 2: .*PlayerTwo .*French/i);
    expect(result.stdout).toMatch(/Successfully parsed .*build order entries/i);
  });
});
