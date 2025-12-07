import { StaticDataCache, Unit, Building, Technology } from '../../src/types';

export const sampleUnits: Unit[] = [
  {
    id: 'archer_1',
    name: 'Archer',
    baseId: 'archer',
    civs: ['en'],
    costs: { food: 50, wood: 50 },
    classes: ['ranged', 'light'],
    displayClasses: ['Ranged'],
    age: 2,
    icon: 'archer.png'
  }
];

export const sampleBuildings: Building[] = [
  {
    id: 'barracks_1',
    name: 'Barracks',
    civs: ['en'],
    costs: { wood: 150 },
    age: 1,
    icon: 'barracks.png'
  }
];

export const sampleTechnologies: Technology[] = [
  {
    id: 'tech_1',
    name: 'Tech 1',
    civs: ['en'],
    costs: { gold: 100 },
    age: 2,
    icon: 'tech.png',
    effects: ['Increases attack speed']
  }
];

export const sampleCache = (fetchedAt: string): StaticDataCache => ({
  units: sampleUnits,
  buildings: sampleBuildings,
  technologies: sampleTechnologies,
  fetchedAt
});
