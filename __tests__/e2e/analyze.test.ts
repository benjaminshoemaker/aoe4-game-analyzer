import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.resolve(projectRoot, 'src/index.ts');
const cachePath = path.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path.resolve(projectRoot, '__tests__/helpers/setupNock.ts');
const fixtureSetup = path.resolve(projectRoot, '__tests__/helpers/setupAnalyzeNock.ts');

function runCli(args: string[], env?: Record<string, string>): SpawnSyncReturns<string> {
  return spawnSync(
    'node',
    ['-r', tsNodeRegister, '-r', setupNock, '-r', fixtureSetup, cliEntry, ...args],
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0', ...env }
    }
  );
}

describe('analyze CLI end-to-end', () => {
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

  it('produces formatted output for analyze command', () => {
    const result = runCli(['analyze', '111', '123456', '--no-narrative']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PlayerOne');
    expect(result.stdout).toContain('PlayerTwo');
    expect(result.stdout).toContain('Scoreboard');
    expect(result.stdout).toContain('Dark Age');
    expect(result.stdout).toContain('Bottom Line');
    expect(result.stdout).toContain('Set ANTHROPIC_API_KEY');
  });

  it('produces valid JSON output with --json flag', () => {
    const result = runCli(['analyze', '111', '123456', '--no-narrative', '--json']);

    expect(result.status).toBe(0);
    const analysis = JSON.parse(result.stdout);
    expect(analysis.gameId).toBe(123456);
    expect(analysis.mapName).toBe('Dry Arabia');
    expect(analysis.player1.name).toBe('PlayerOne');
    expect(analysis.player2.name).toBe('PlayerTwo');
    expect(analysis.phases).toBeDefined();
    expect(analysis.phaseComparisons).toBeDefined();
    expect(analysis.deployedResourcePools).toBeDefined();
    expect(analysis.deployedResourcePools.player1.series.length).toBeGreaterThan(0);
    expect(analysis.deployedResourcePools.player2.series.length).toBeGreaterThan(0);
    expect(analysis.deployedResourcePools.sharedYAxisMax).toBeGreaterThan(0);
    expect(analysis.bottomLine).toBeNull();
  });

  it('gracefully shows message when no ANTHROPIC_API_KEY is set', () => {
    const result = runCli(
      ['analyze', '111', '123456', '--no-narrative'],
      { ANTHROPIC_API_KEY: '' }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Set ANTHROPIC_API_KEY');
  });
});
