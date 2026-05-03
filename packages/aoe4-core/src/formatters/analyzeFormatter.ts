import chalk from 'chalk';
import { formatValueAdjustedMatchup } from '../data/counterMatrix';
import {
  GameAnalysis,
  PhaseComparison,
  ResourceAllocation,
  IncomeSnapshot,
  InflectionPoint,
} from '../analysis/types';
import { ResourceTotals } from '../parser/gameSummaryParser';
import { generateGameEconomicInsights, generatePhaseEconomicInsights } from '../analysis/economicInsights';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function padRight(str: string, width: number): string {
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function sideBySide(label: string, left: string, right: string, labelWidth = 20, colWidth = 24): string {
  const visibleLen = stripAnsi(left).length;
  const padding = Math.max(1, colWidth - visibleLen);
  return `  ${padRight(label, labelWidth)}${left}${' '.repeat(padding)}${right}`;
}

function formatScoreLine(label: string, p1: number, p2: number): string {
  const delta = p1 - p2;
  const deltaStr = delta > 0 ? chalk.green(`+${delta}`) : delta < 0 ? chalk.red(`${delta}`) : chalk.gray('0');
  return sideBySide(label, String(p1), `${p2}  (${deltaStr})`);
}

function formatDelta(value: number): string {
  if (value > 0) return chalk.green(`+${value}`);
  if (value < 0) return chalk.red(`${value}`);
  return chalk.gray('0');
}

function formatResourceTotals(r: ResourceTotals): string {
  const parts: string[] = [];
  if (r.food > 0) parts.push(`${r.food}F`);
  if (r.wood > 0) parts.push(`${r.wood}W`);
  if (r.gold > 0) parts.push(`${r.gold}G`);
  if (r.stone > 0) parts.push(`${r.stone}S`);
  return parts.length > 0 ? parts.join(' ') : '0';
}

function formatAllocationLine(label: string, a1: ResourceAllocation, a2: ResourceAllocation): string[] {
  const lines: string[] = [];
  lines.push(`  ${label}`);
  lines.push(sideBySide('  Military:', `${a1.militaryPercent.toFixed(0)}%`, `${a2.militaryPercent.toFixed(0)}%`));
  lines.push(sideBySide('  Economy:', `${a1.economyPercent.toFixed(0)}%`, `${a2.economyPercent.toFixed(0)}%`));
  lines.push(sideBySide('  Technology:', `${a1.technologyPercent.toFixed(0)}%`, `${a2.technologyPercent.toFixed(0)}%`));
  lines.push(sideBySide('  Buildings:', `${a1.buildingPercent.toFixed(0)}%`, `${a2.buildingPercent.toFixed(0)}%`));
  return lines;
}

function formatIncomeLine(label: string, i1: IncomeSnapshot, i2: IncomeSnapshot): string[] {
  const lines: string[] = [];
  lines.push(`  ${label}`);
  lines.push(sideBySide('  Food/min:', String(i1.foodPerMin), String(i2.foodPerMin)));
  lines.push(sideBySide('  Gold/min:', String(i1.goldPerMin), String(i2.goldPerMin)));
  lines.push(sideBySide('  Wood/min:', String(i1.woodPerMin), String(i2.woodPerMin)));
  lines.push(sideBySide('  Stone/min:', String(i1.stonePerMin), String(i2.stonePerMin)));
  return lines;
}

function formatInflection(ip: InflectionPoint, p1Name: string, p2Name: string): string[] {
  const lines: string[] = [];
  const favored = ip.favoredPlayer === 1 ? p1Name : p2Name;
  lines.push(chalk.yellow(`  ⚡ INFLECTION @ ${formatTime(ip.timestamp)} — ${ip.scoreType} shift of ${ip.magnitude}, favoring ${favored}`));

  if (ip.destructionCluster) {
    const dc = ip.destructionCluster;
    if (dc.player1Losses.length > 0) {
      const losses = dc.player1Losses.map(l => `${l.count}x ${l.name} (${l.valueLost} value)`).join(', ');
      lines.push(chalk.gray(`    ${p1Name} lost: ${losses}`));
    }
    if (dc.player2Losses.length > 0) {
      const losses = dc.player2Losses.map(l => `${l.count}x ${l.name} (${l.valueLost} value)`).join(', ');
      lines.push(chalk.gray(`    ${p2Name} lost: ${losses}`));
    }
  }

  return lines;
}

function formatPhaseComparison(
  comparison: PhaseComparison,
  p1Name: string,
  p2Name: string,
  insights: string[] = []
): string[] {
  const lines: string[] = [];
  const phase = comparison.phase;
  const header = `── ${phase.label} (${formatTime(phase.startTime)} – ${formatTime(phase.endTime)}) ──`;
  lines.push('');
  lines.push(chalk.cyan(header + '─'.repeat(Math.max(0, 50 - header.length))));

  // Phase economic insights
  for (const insight of insights) {
    lines.push(chalk.white(`  ▸ ${insight}`));
  }

  // Column headers
  lines.push(sideBySide('', chalk.bold(p1Name), chalk.bold(p2Name)));

  // Score delta (p1 - p2)
  const deltaStart = comparison.scoreDeltaAtStart;
  const deltaEnd = comparison.scoreDeltaAtEnd;
  lines.push(sideBySide('Score delta start:', formatDelta(deltaStart.total), `Mil: ${formatDelta(deltaStart.military)}  Eco: ${formatDelta(deltaStart.economy)}`));
  lines.push(sideBySide('Score delta end:', formatDelta(deltaEnd.total), `Mil: ${formatDelta(deltaEnd.military)}  Eco: ${formatDelta(deltaEnd.economy)}`));

  // Resource allocation
  lines.push(...formatAllocationLine('Resource allocation:', comparison.player1Allocation, comparison.player2Allocation));

  // Income
  lines.push(...formatIncomeLine('Income at end:', comparison.player1IncomeAtEnd, comparison.player2IncomeAtEnd));

  // Unit production
  if (comparison.player1Units.length > 0 || comparison.player2Units.length > 0) {
    lines.push('  Unit production:');
    const p1Units = comparison.player1Units.map(u => `${u.count}x ${u.name}`).join(', ') || 'none';
    const p2Units = comparison.player2Units.map(u => `${u.count}x ${u.name}`).join(', ') || 'none';
    lines.push(sideBySide('', p1Units, p2Units));
  }

  // Inflection points
  for (const ip of comparison.inflections) {
    lines.push(...formatInflection(ip, p1Name, p2Name));
  }

  // Army matchup at end of phase (compact summary)
  if (comparison.armyMatchup) {
    const m = comparison.armyMatchup;
    const favored = m.favoredArmy === 1 ? p1Name : m.favoredArmy === 2 ? p2Name : 'Even';
    const edge = m.favoredArmy !== 0 ? ` (${(m.advantagePercent * 100).toFixed(0)}% edge)` : '';
    lines.push(sideBySide('Army value:', `${Math.round(m.army1AdjustedValue)}`, `${Math.round(m.army2AdjustedValue)}  → ${favored}${edge}`));
  }

  return lines;
}

export function formatGameAnalysis(analysis: GameAnalysis): string {
  const lines: string[] = [];
  const p1 = analysis.player1;
  const p2 = analysis.player2;
  const winner = p1.result === 'win' ? p1 : p2;
  const loser = p1.result === 'win' ? p2 : p1;

  // Header
  const headerLine = `${winner.name} (${winner.civilization}) defeated ${loser.name} (${loser.civilization})`;
  const subHeader = `${analysis.mapName} (${analysis.mapBiome}) — ${formatTime(analysis.duration)} — ${analysis.winReason}`;
  lines.push(chalk.bold('═'.repeat(60)));
  lines.push(chalk.bold.green(`  ${headerLine}`));
  lines.push(chalk.gray(`  ${subHeader}`));
  lines.push(chalk.bold('═'.repeat(60)));

  // Scoreboard
  lines.push('');
  lines.push(chalk.bold.blue('── Scoreboard ──────────────────'));
  lines.push(sideBySide('', chalk.bold(p1.name), chalk.bold(p2.name)));
  lines.push(formatScoreLine('Total Score:', p1.scores.total, p2.scores.total));
  lines.push(formatScoreLine('Military:', p1.scores.military, p2.scores.military));
  lines.push(formatScoreLine('Economy:', p1.scores.economy, p2.scores.economy));
  lines.push(formatScoreLine('Technology:', p1.scores.technology, p2.scores.technology));
  lines.push(formatScoreLine('Society:', p1.scores.society, p2.scores.society));
  lines.push(sideBySide('K/D:', `${p1.kills}/${p1.deaths}`, `${p2.kills}/${p2.deaths}`));
  lines.push(sideBySide('APM:', String(p1.apm), String(p2.apm)));
  lines.push(sideBySide('Units produced:', String(p1.unitsProduced), String(p2.unitsProduced)));
  lines.push(sideBySide('Gathered:', formatResourceTotals(p1.totalGathered), formatResourceTotals(p2.totalGathered)));
  lines.push(sideBySide('Spent:', formatResourceTotals(p1.totalSpent), formatResourceTotals(p2.totalSpent)));

  // Economy insights
  const gameEcoInsights = generateGameEconomicInsights(analysis);
  if (gameEcoInsights.length > 0) {
    lines.push('');
    lines.push(chalk.bold.blue('── Economy ─────────────────────'));
    for (const insight of gameEcoInsights) {
      lines.push(chalk.white(`  ▸ ${insight}`));
    }
  }

  // Phase comparisons
  const phaseEcoInsights = generatePhaseEconomicInsights(analysis.phaseComparisons, p1.name, p2.name);
  for (let i = 0; i < analysis.phaseComparisons.length; i++) {
    lines.push(...formatPhaseComparison(analysis.phaseComparisons[i], p1.name, p2.name, phaseEcoInsights[i] || []));
  }

  // Final army matchup
  if (analysis.finalArmyMatchup) {
    lines.push('');
    lines.push(chalk.bold.blue('── Final Army Matchup ──────────'));
    const matchupOutput = formatValueAdjustedMatchup(analysis.finalArmyMatchup, p1.name, p2.name);
    for (const line of matchupOutput.split('\n')) {
      lines.push(`  ${line}`);
    }
  }

  // Bottom line
  lines.push('');
  lines.push(chalk.bold.blue('── Bottom Line ──────────────────'));
  if (analysis.bottomLine) {
    lines.push(`  ${analysis.bottomLine}`);
  } else {
    lines.push(chalk.gray('  Set ANTHROPIC_API_KEY for narrative analysis'));
  }

  return lines.join('\n');
}
