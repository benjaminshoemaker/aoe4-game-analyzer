#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { forceRefreshStaticData, loadStaticData } from './data/fetchStaticData';
import { calculateValueAdjustedMatchup, classifyUnit, formatValueAdjustedMatchup } from './data/counterMatrix';
import { getUpgradeEffect, parseUnitTierFromIcon } from './data/upgradeMappings';
import { fetchGameSummaryFromApi, loadGameSummaryFromFile, parseGameSummary } from './parser/gameSummaryParser';
import { resolveAllBuildOrders, validateAllItemsResolved } from './parser/buildOrderResolver';
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
    .command('parse')
    .argument('<json-file>', 'Path to game summary JSON file')
    .description('Parse a local AoE4World game summary JSON file')
    .action((jsonFile: string) => {
      try {
        const summary = loadGameSummaryFromFile(jsonFile);
        const players = summary.players.slice(0, 2);
        console.log(chalk.blue(`Game ID: ${summary.gameId}`));
        console.log(chalk.blue(`Map: ${summary.mapName} (${summary.mapBiome})`));
        console.log(chalk.blue(`Duration: ${summary.duration}s`));
        players.forEach((player, idx) => {
          console.log(
            chalk.cyan(
              `Player ${idx + 1}: ${player.name} (${player.civilization}) - ${player.result.toUpperCase()}`
            )
          );
        });
        const boCounts = players.map((p) => p.buildOrder.length);
        console.log(
          chalk.green(
            `Successfully parsed build order entries: Player 1 (${boCounts[0] ?? 0}), Player 2 (${boCounts[1] ?? 0})`
          )
        );
      } catch (error) {
        console.error(chalk.red(`Failed to parse summary: ${(error as Error).message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('fetch-game')
    .argument('<profileId>', 'Profile ID or slug (e.g., 8097972-steam)')
    .argument('<gameId>', 'Game ID')
    .option('--sig <sig>', 'Signature token for private games')
    .description('Fetch a game summary from AoE4World')
    .action(async (profileIdStr: string, gameIdStr: string, opts: { sig?: string }) => {
      try {
        const gameId = Number(gameIdStr);
        const summary = await fetchGameSummaryFromApi(profileIdStr, gameId, opts.sig);
        const players = summary.players.slice(0, 2);
        console.log(chalk.blue(`Game ID: ${summary.gameId}`));
        console.log(chalk.blue(`Map: ${summary.mapName} (${summary.mapBiome})`));
        console.log(chalk.blue(`Duration: ${summary.duration}s`));
        players.forEach((player, idx) => {
          console.log(
            chalk.cyan(
              `Player ${idx + 1}: ${player.name} (${player.civilization}) - ${player.result.toUpperCase()}`
            )
          );
        });
        const boCounts = players.map((p) => p.buildOrder.length);
        console.log(
          chalk.green(
            `Successfully parsed build order entries: Player 1 (${boCounts[0] ?? 0}), Player 2 (${boCounts[1] ?? 0})`
          )
        );
      } catch (error) {
        console.error(chalk.red(`Failed to fetch summary: ${(error as Error).message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('resolve-build-order')
    .argument('<json-file>', 'Path to game summary JSON file')
    .option('-v, --verbose', 'Show detailed resolution for each build order item')
    .description('Parse a game and resolve all build order items to their costs')
    .action(async (jsonFile: string, opts: { verbose?: boolean }) => {
      try {
        const summary = loadGameSummaryFromFile(jsonFile);
        const staticData = await loadStaticData();
        const players = summary.players.slice(0, 2);

        let hasErrors = false;

        // Format timestamp as mm:ss
        const formatTime = (seconds: number): string => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        // Format cost string
        const formatCost = (cost: { food: number; wood: number; gold: number; stone: number }): string => {
          const parts: string[] = [];
          if (cost.food > 0) parts.push(`${cost.food}F`);
          if (cost.wood > 0) parts.push(`${cost.wood}W`);
          if (cost.gold > 0) parts.push(`${cost.gold}G`);
          if (cost.stone > 0) parts.push(`${cost.stone}S`);
          return parts.length > 0 ? parts.join('/') : 'free';
        };

        players.forEach((player, idx) => {
          const resolved = resolveAllBuildOrders(player, staticData);
          const totalItems = resolved.startingAssets.length + resolved.resolved.length + resolved.unresolved.length;

          if (resolved.unresolved.length > 0) {
            console.log(
              chalk.yellow(
                `Resolved ${resolved.startingAssets.length + resolved.resolved.length} of ${totalItems} items for ${player.name}`
              )
            );
            try {
              validateAllItemsResolved(resolved);
            } catch (err) {
              console.error(chalk.red((err as Error).message));
              hasErrors = true;
            }
          } else {
            // Show starting assets summary
            const startingCount = resolved.startingAssets.reduce((sum, item) => sum + item.produced.length, 0);
            console.log(
              chalk.green(`${player.name}: ${startingCount} starting assets, ${resolved.resolved.length} build order items`)
            );

            // Show summary of build order items by type
            const byType: Record<string, number> = {};
            let totalCost = 0;
            for (const item of resolved.resolved) {
              byType[item.type] = (byType[item.type] ?? 0) + item.produced.length;
              totalCost += item.cost.total * item.produced.length;
            }
            const typeBreakdown = Object.entries(byType)
              .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
              .join(', ');
            console.log(chalk.gray(`  Build order: ${typeBreakdown}`));
            console.log(chalk.gray(`  Total resource cost: ${totalCost}`));
          }

          // Verbose output
          if (opts.verbose) {
            // Show starting assets first
            console.log(chalk.magenta(`\n  Starting assets for ${player.name}:`));
            for (const item of resolved.startingAssets) {
              const countStr = item.produced.length > 1 ? ` x${item.produced.length}` : '';
              console.log(
                chalk.gray(`    ${item.type.padEnd(8)} `) +
                chalk.white(`${item.name}${countStr}`)
              );
            }

            // Show chronological build order
            console.log(chalk.cyan(`\n  Build order for ${player.name} (chronological):`));

            // Flatten all production events with timestamps
            interface ProductionEvent {
              timestamp: number;
              item: typeof resolved.resolved[0];
            }
            const events: ProductionEvent[] = [];

            for (const item of resolved.resolved) {
              for (const ts of item.produced) {
                events.push({ timestamp: ts, item });
              }
            }

            // Sort by timestamp
            events.sort((a, b) => a.timestamp - b.timestamp);

            for (const event of events) {
              const { timestamp, item } = event;
              const costStr = formatCost(item.cost);
              const tierStr = item.tier > 1 ? ` [T${item.tier}]` : '';

              console.log(
                chalk.blue(`    ${formatTime(timestamp)} `) +
                chalk.white(`${item.type.padEnd(8)} `) +
                chalk.yellow(`${item.name}${tierStr}`.padEnd(28)) +
                chalk.gray(`${costStr.padEnd(12)}`) +
                chalk.gray(`${item.originalEntry.icon}`)
              );
            }
          }
        });

        if (hasErrors) {
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(chalk.red(`Failed to resolve build order: ${(error as Error).message}`));
        process.exitCode = 1;
      }
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
