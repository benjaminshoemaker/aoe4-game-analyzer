import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';
import {
  makeUnknownBucketMechanicsFixture,
  makeUnknownBucketStaticDataCache,
} from '../helpers/unknownBucketMechanicsFixture';

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.resolve(projectRoot, 'src/index.ts');
const cachePath = path.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path.resolve(projectRoot, '__tests__/helpers/setupNock.ts');
const tmpDir = path.resolve(projectRoot, 'tmp');
const unknownFixturePath = path.resolve(tmpDir, 'unknown-bucket-audit.fixture.json');
const unknownStaticDataPath = path.resolve(tmpDir, 'unknown-bucket-static-data.fixture.json');

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
    expect(result.stdout).toMatch(
      new RegExp(
        `Data cached at .*?, ${sampleUnits.length} units, ${sampleBuildings.length} buildings, ${sampleTechnologies.length} technologies`
      )
    );
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

  it('generate-unit-counter-matrix outputs a unit-level matrix where crossbow differs from archer vs heavy', () => {
    const catalogPath = path.resolve(__dirname, '..', 'fixtures', 'unitCounterCatalog.json');
    const outPath = path.resolve(projectRoot, 'tmp', 'e2e-unit-counter-matrix.tsv');
    const profilesPath = path.resolve(projectRoot, 'tmp', 'e2e-unit-counter-profiles.tsv');

    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    if (fs.existsSync(profilesPath)) fs.unlinkSync(profilesPath);

    const result = runCli([
      'generate-unit-counter-matrix',
      '--catalog',
      catalogPath,
      '--out',
      outPath,
      '--profiles-out',
      profilesPath
    ]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.existsSync(profilesPath)).toBe(true);

    const matrixLines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
    const header = matrixLines[0].split('\t');
    const body = matrixLines.slice(1).map(line => line.split('\t'));

    const attackerCol = 0;
    const maaCol = header.indexOf('man-at-arms-4');
    expect(maaCol).toBeGreaterThan(0);

    const crossbowRow = body.find(row => row[attackerCol] === 'crossbowman-4');
    const archerRow = body.find(row => row[attackerCol] === 'archer-3');
    expect(crossbowRow).toBeDefined();
    expect(archerRow).toBeDefined();

    const crossbowVsMaa = Number(crossbowRow?.[maaCol] ?? '0');
    const archerVsMaa = Number(archerRow?.[maaCol] ?? '0');
    expect(crossbowVsMaa).toBeGreaterThan(archerVsMaa);

    const profiles = fs.readFileSync(profilesPath, 'utf-8');
    expect(profiles).toContain('unit_id\tunit_name\tcivs\tbonus_targets\tweaknesses');
    expect(profiles).toContain('class:heavy');
    expect(profiles).toContain('horsemen');
  });

  it('audits unknown build-order buckets from a local summary file', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(unknownFixturePath, JSON.stringify(makeUnknownBucketMechanicsFixture()), 'utf-8');
    fs.writeFileSync(unknownStaticDataPath, JSON.stringify(makeUnknownBucketStaticDataCache()), 'utf-8');

    const result = runCli([
      'audit-unknown-build-order',
      unknownFixturePath,
      '--static-data',
      unknownStaticDataPath,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Unknown build-order bucket audit: 23 handled, 1 ignored, 0 need review');
    expect(result.stdout).toContain('Trade Caravan');
    expect(result.stdout).toContain('Fishing Boat');
    expect(result.stdout).toContain('Trader');
    expect(result.stdout).toContain('Pilgrim');
    expect(result.stdout).toContain('Yatai bucket 15 handled');
    expect(result.stdout).toContain('Trade Cart bucket 15 ignored');
  });
});
