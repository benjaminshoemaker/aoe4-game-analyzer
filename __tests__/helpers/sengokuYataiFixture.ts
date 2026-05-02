import fs from 'fs';
import path from 'path';

export function makeSengokuYataiFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  fixture.gameId = 229727104;
  fixture.players[0] = {
    ...fixture.players[0],
    profileId: 8139502,
    name: 'Beasty',
    civilization: 'sengoku_daimyo',
    buildOrder: [
      ...fixture.players[0].buildOrder,
      {
        id: '11266336',
        icon: 'icons/races/sengoku/units/yatai',
        pbgid: 9001316,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: {
          '14': [61, 116, 159],
          '15': [170],
        },
      },
    ],
  };

  return fixture;
}
