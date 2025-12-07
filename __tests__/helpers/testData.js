"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleCache = exports.sampleTechnologies = exports.sampleBuildings = exports.sampleUnits = void 0;
exports.sampleUnits = [
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
exports.sampleBuildings = [
    {
        id: 'barracks_1',
        name: 'Barracks',
        civs: ['en'],
        costs: { wood: 150 },
        age: 1,
        icon: 'barracks.png'
    }
];
exports.sampleTechnologies = [
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
const sampleCache = (fetchedAt) => ({
    units: exports.sampleUnits,
    buildings: exports.sampleBuildings,
    technologies: exports.sampleTechnologies,
    fetchedAt
});
exports.sampleCache = sampleCache;
