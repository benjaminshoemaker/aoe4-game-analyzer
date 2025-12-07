import { calculateValueAdjustedMatchup } from '../../src/data/counterMatrix';
import { MatchupDetail } from '../../src/types';
import { valueArmyOne, valueArmyTwo } from '../helpers/counterSamples';

describe('calculateValueAdjustedMatchup integration', () => {
  it('evaluates mixed armies with cost-aware counters', () => {
    const analysis = calculateValueAdjustedMatchup(valueArmyOne, valueArmyTwo);

    expect(analysis.army1RawValue).toBeCloseTo(1200);
    expect(analysis.army2RawValue).toBeCloseTo(1200);
    expect(analysis.favoredArmy).toBe(1);
    expect(analysis.advantagePercent).toBeGreaterThan(1.0);
    expect(analysis.army1Breakdown[0].adjustedTotal).toBeGreaterThan(analysis.army1Breakdown[0].rawTotal);

    const spearVsKnight = analysis.keyMatchups.find(
      (matchup: MatchupDetail) => matchup.unit1Name === 'Spearman' && matchup.unit2Name === 'Knight'
    );
    const crossbowVsMaa = analysis.keyMatchups.find(
      (matchup: MatchupDetail) => matchup.unit1Name === 'Crossbowman' && matchup.unit2Name === 'Knight'
    );

    expect(spearVsKnight?.counterMultiplier).toBeCloseTo(1.5, 1);
    expect(crossbowVsMaa?.counterMultiplier).toBeCloseTo(1.4, 1);
  });
});
