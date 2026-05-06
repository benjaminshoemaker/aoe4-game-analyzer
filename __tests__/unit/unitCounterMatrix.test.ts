import fs from 'fs';
import path from 'path';
import {
  buildUnitCounterMatrix,
  formatUnitCounterMatrixTsv,
  formatUnitCounterProfilesTsv,
  parseUnitCatalogFromJson
} from '../../packages/aoe4-core/src/data/unitCounterMatrix';
import { evaluateUnitPairCounterMultiplier } from '../../packages/aoe4-core/src/data/combatValueEngine';
import { Unit } from '../../packages/aoe4-core/src/types';

const fixturePath = path.resolve(__dirname, '../fixtures/unitCounterCatalog.json');
const fixturePayload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const fixtureUnits = parseUnitCatalogFromJson(fixturePayload);

function indexOfHeader(headers: string[], value: string): number {
  const idx = headers.indexOf(value);
  expect(idx).toBeGreaterThanOrEqual(0);
  return idx;
}

describe('unitCounterMatrix', () => {
  it('extracts unit bonus targets and weaknesses into profile rows', () => {
    const matrix = buildUnitCounterMatrix(fixtureUnits);
    const crossbow = matrix.unitRows.find(row => row.unit.id === 'crossbowman-4');
    expect(crossbow).toBeDefined();
    expect(crossbow?.bonusTargets.join(' ')).toContain('class:heavy');
    expect(crossbow?.weaknesses.join(' ')).toContain('horsemen');
  });

  it('differentiates crossbows and archers against heavy infantry', () => {
    const matrix = buildUnitCounterMatrix(fixtureUnits);
    const attackerHeaders = matrix.units.map(unit => unit.id);
    const defenderHeaders = matrix.units.map(unit => unit.id);
    const crossbowRow = indexOfHeader(attackerHeaders, 'crossbowman-4');
    const archerRow = indexOfHeader(attackerHeaders, 'archer-3');
    const maaCol = indexOfHeader(defenderHeaders, 'man-at-arms-4');

    const crossbowVsMaa = matrix.values[crossbowRow][maaCol];
    const archerVsMaa = matrix.values[archerRow][maaCol];
    expect(crossbowVsMaa).toBeGreaterThan(archerVsMaa);
  });

  it('uses the shared combat evaluator for matrix cell multipliers', () => {
    const matrix = buildUnitCounterMatrix(fixtureUnits);
    const attackerHeaders = matrix.units.map(unit => unit.id);
    const defenderHeaders = matrix.units.map(unit => unit.id);
    const crossbowRow = indexOfHeader(attackerHeaders, 'crossbowman-4');
    const maaCol = indexOfHeader(defenderHeaders, 'man-at-arms-4');

    const crossbow = matrix.units[crossbowRow];
    const maa = matrix.units[maaCol];
    const matrixMultiplier = matrix.values[crossbowRow][maaCol];
    const directMultiplier = evaluateUnitPairCounterMultiplier(crossbow, maa, fixtureUnits);

    expect(matrixMultiplier).toBeCloseTo(directMultiplier, 4);
  });

  it('renders matrix/profile TSV with expected columns', () => {
    const matrix = buildUnitCounterMatrix(fixtureUnits);
    const matrixTsv = formatUnitCounterMatrixTsv(matrix);
    const profileTsv = formatUnitCounterProfilesTsv(matrix);

    expect(matrixTsv.split('\n')[0]).toContain('attacker_vs_defender');
    expect(matrixTsv).toContain('crossbowman-4');
    expect(matrixTsv).toContain('man-at-arms-4');
    expect(profileTsv.split('\n')[0]).toBe('unit_id\tunit_name\tcivs\tbonus_targets\tweaknesses');
    expect(profileTsv).toContain('class:heavy');
    expect(profileTsv).toContain('horsemen');
  });

  it('parses unit catalog from either array or wrapped payload', () => {
    const asArray = parseUnitCatalogFromJson(fixtureUnits as unknown as Unit[]);
    const asWrapped = parseUnitCatalogFromJson(fixturePayload);
    expect(asArray.length).toBe(fixtureUnits.length);
    expect(asWrapped.length).toBe(fixtureUnits.length);
  });
});
