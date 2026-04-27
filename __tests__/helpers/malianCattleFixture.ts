import fs from 'fs';
import path from 'path';

export function makeMalianCattleFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  fixture.gameId = 654321;
  fixture.players[0] = {
    ...fixture.players[0],
    civilization: 'Malians',
    buildOrder: [
      ...fixture.players[0].buildOrder,
      {
        id: '11216283',
        icon: 'icons/races/malian/units/cattle',
        pbgid: 2059966,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: {
          '14': [120, 180],
        },
      },
    ],
  };

  return fixture;
}
