#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { forceRefreshStaticData, loadStaticData } from './data/fetchStaticData';
import { calculateValueAdjustedMatchup, classifyUnit, formatValueAdjustedMatchup } from './data/counterMatrix';
import { getUpgradeEffect, parseUnitTierFromIcon } from './data/upgradeMappings';
import { Unit, UnitWithValue } from './types';

function createRng(seed: string): () => number {
  let state = 0;
  for (const ch of seed) {
    state = (state * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  }
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x80000000;
  };
}

function pickRandomUnits<T>(units: T[], count: number, rng: () => number): T[] {
  const arr = [...units];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function formatStatus(
  fetchedAt: string,
  unitCount: number,
  buildingCount: number,
  technologyCount: number
): string {
  return `Data cached at ${fetchedAt}, ${unitCount} units, ${buildingCount} buildings, ${technologyCount} technologies`;
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();

  program.name('aoe4-analyze').description('Analyze and inspect static Age of Empires IV data');

  program
    .command('fetch-data')
    .description('Force refresh of static data')
    .action(async () => {
      try {
        const data = await forceRefreshStaticData();
        console.log(chalk.green(formatStatus(data.fetchedAt, data.units.length, data.buildings.length, data.technologies.length)));
      } catch (error) {
        console.error(chalk.red(`Failed to refresh data: ${(error as Error).message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('check-data')
    .description('Show cache status and age')
    .action(async () => {
      try {
        const data = await loadStaticData();
        const fetchedDate = new Date(data.fetchedAt);
        const ageMs = Date.now() - fetchedDate.getTime();
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        const ageLabel = ageDays <= 0 ? 'fresh today' : `${ageDays} day${ageDays === 1 ? '' : 's'} old`;

        console.log(formatStatus(fetchedDate.toISOString(), data.units.length, data.buildings.length, data.technologies.length));
        console.log(chalk.gray(`Cache is ${ageLabel}`));
      } catch (error) {
        console.error(chalk.red(`Failed to read data: ${(error as Error).message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('test-upgrade-parsing')
    .option('--seed <seed>', 'Seed for deterministic random sampling', 'demo-seed')
    .description('Run a demo of upgrade and tier parsing')
    .action((options: { seed?: string }) => {
      const rng = createRng(options.seed ?? 'demo-seed');
      const sampleIcons = [
        'icons/races/english/units/longbowman',
        'icons/races/malian/units/musofadi_2',
        'icons/races/french/units/knight_3.png',
        'icons/races/ottoman/units/janissary_4.webp',
        'icons/races/chinese/units/zhuganunu_5'
      ];

      const sampleUpgrades = [
        'upgradeWeaponsDamageII',
        'upgradeWeaponsDamage2',
        'upgradeRangedArmorIII',
        'upgradeMeleeArmorI',
        'unknownUpgradeKey'
      ];

      const pickRandomItems = <T,>(items: T[], count: number): T[] => {
        const shuffled = pickRandomUnits(items, items.length, rng);
        return shuffled.slice(0, count);
      };

      const chosenIcons = pickRandomItems(sampleIcons, 3);
      const chosenUpgrades = pickRandomItems(sampleUpgrades, 3);

      console.log(chalk.blue('Unit tier parsing:'));
      chosenIcons.forEach((icon) => {
        const tier = parseUnitTierFromIcon(icon);
        console.log(`${icon} -> ${tier}`);
      });

      console.log(chalk.blue('\nUpgrade effect lookup:'));
      chosenUpgrades.forEach((upgrade) => {
        const effect = getUpgradeEffect(upgrade);
        if (effect) {
          console.log(`${upgrade} -> type=${effect.type}, bonus=${effect.bonus}, level=${effect.level}`);
        } else {
          console.log(`${upgrade} -> unknown upgrade`);
        }
      });

      console.log(chalk.gray(`\nSeed used: ${options.seed ?? 'demo-seed'}`));
    });

  program
    .command('test-counters')
    .option('--seed <seed>', 'Seed for deterministic random matchup demo', 'demo-seed')
    .description('Run a demo of counter classification and matchup analysis')
    .action(async (options: { seed?: string }) => {
      const sampleUnits: Unit[] = [
        {
          id: 'spearman',
          name: 'Spearman',
          baseId: 'spearman',
          civs: ['en'],
          costs: { food: 60, wood: 20 },
          classes: ['Spear', 'Light Melee Infantry'],
          displayClasses: ['Spear Infantry'],
          age: 1,
          icon: 'spearman.png'
        },
        {
          id: 'knight',
          name: 'Knight',
          baseId: 'knight',
          civs: ['fr'],
          costs: { food: 140, gold: 100 },
          classes: ['Heavy Melee Cavalry'],
          displayClasses: ['Cavalry'],
          age: 2,
          icon: 'knight.png'
        },
        {
          id: 'crossbowman',
          name: 'Crossbowman',
          baseId: 'crossbowman',
          civs: ['en'],
          costs: { food: 80, gold: 40 },
          classes: ['Heavy Ranged Infantry'],
          displayClasses: ['Ranged Infantry'],
          age: 2,
          icon: 'crossbowman.png'
        },
        {
          id: 'man_at_arms',
          name: 'Man-at-Arms',
          baseId: 'man_at_arms',
          civs: ['en'],
          costs: { food: 120, gold: 20 },
          classes: ['Heavy Melee Infantry'],
          displayClasses: ['Infantry'],
          age: 2,
          icon: 'maa.png'
        }
      ];

      const staticData = await loadStaticData().catch(() => ({ units: [] as Unit[] }));
      const unitCostLookup: Record<string, number> = {};

      const calcCost = (unit: Unit): number => {
        const costs = unit.costs ?? {};
        return (costs.food ?? 0) + (costs.wood ?? 0) + (costs.gold ?? 0) + (costs.stone ?? 0);
      };

      const staticUnits: Unit[] = Array.isArray((staticData as { units?: Unit[] }).units)
        ? (staticData as { units?: Unit[] }).units ?? []
        : [];

      staticUnits.forEach((unit) => {
        const baseKey = unit.baseId || unit.id;
        unitCostLookup[baseKey.toLowerCase()] = calcCost(unit);
      });

      const fallbackCost: Record<string, number> = {
        spearman: 80,
        crossbowman: 120,
        knight: 240,
        man_at_arms: 140
      };

      const getUnitValue = (unit: Unit): number => {
        const key = unit.baseId?.toLowerCase() ?? unit.id.toLowerCase();
        return unitCostLookup[key] ?? fallbackCost[key] ?? 100;
      };

      console.log(chalk.blue('Unit classification:'));
      sampleUnits.forEach((unit) => {
        const classes = classifyUnit(unit);
        console.log(`${unit.name}: ${classes.join(', ')}`);
      });

      const rng = createRng(options.seed ?? 'demo-seed');
      const army1Units = pickRandomUnits(sampleUnits, 2, rng);
      const army2Units = pickRandomUnits(sampleUnits, 2, rng);

      const toValueUnit = (unit: Unit): UnitWithValue => ({
        unitId: unit.id,
        name: unit.name,
        count: randomInt(8, 12, rng),
        effectiveValue: getUnitValue(unit),
        classes: unit.classes
      });

      const valueArmy1: UnitWithValue[] = army1Units.map(toValueUnit);
      const valueArmy2: UnitWithValue[] = army2Units.map(toValueUnit);

      console.log(chalk.magenta.bold('\nValue-adjusted matchup:'));
      const valueMatchup = calculateValueAdjustedMatchup(valueArmy1, valueArmy2);
      console.log(chalk.gray(`Seed used: ${options.seed ?? 'demo-seed'}`));
      console.log(chalk.cyan('\nArmy 1 composition:'));
      valueArmy1.forEach((entry) => {
        const raw = entry.count * entry.effectiveValue;
        console.log(`  - ${entry.count}x ${entry.name} (${entry.effectiveValue} each) raw ${raw.toFixed(2)}`);
      });
      console.log(chalk.cyan('\nArmy 2 composition:'));
      valueArmy2.forEach((entry) => {
        const raw = entry.count * entry.effectiveValue;
        console.log(`  - ${entry.count}x ${entry.name} (${entry.effectiveValue} each) raw ${raw.toFixed(2)}`);
      });
      console.log('');
      console.log(formatValueAdjustedMatchup(valueMatchup, 'Army 1', 'Army 2'));
    });

  await program.parseAsync(argv);
}

if (require.main === module) {
  // eslint-disable-next-line no-void
  void runCli();
}
