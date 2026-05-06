import fs from 'fs';
import { calculatePairCounterComputation } from '../../packages/aoe4-core/src/data/counterMatrix';

describe('counter matrix catalog policy', () => {
  it('does not read a hidden staticData.json fallback when no catalog is provided', () => {
    const readSpy = jest.spyOn(fs, 'readFileSync');

    calculatePairCounterComputation(
      {
        unitId: 'unknown_swordsman',
        name: 'Unknown Swordsman',
        count: 5,
        effectiveValue: 100,
        classes: ['Heavy Melee Infantry'],
      },
      {
        unitId: 'unknown_archer',
        name: 'Unknown Archer',
        count: 5,
        effectiveValue: 80,
        classes: ['Ranged Infantry'],
      }
    );

    expect(readSpy).not.toHaveBeenCalled();
  });
});
