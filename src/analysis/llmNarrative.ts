import Anthropic from '@anthropic-ai/sdk';
import { GameAnalysis } from './types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildPrompt(analysis: GameAnalysis): string {
  const winner = analysis.player1.result === 'win' ? analysis.player1 : analysis.player2;
  const loser = analysis.player1.result === 'win' ? analysis.player2 : analysis.player1;

  const lines: string[] = [
    `Age of Empires IV game analysis:`,
    `Map: ${analysis.mapName} (${analysis.mapBiome}), Duration: ${formatTime(analysis.duration)}`,
    `Winner: ${winner.name} (${winner.civilization}) defeated ${loser.name} (${loser.civilization}) by ${analysis.winReason}`,
    '',
    `Scores: ${winner.name} ${winner.scores.total} vs ${loser.name} ${loser.scores.total}`,
    `K/D: ${winner.name} ${winner.kills}/${winner.deaths} vs ${loser.name} ${loser.kills}/${loser.deaths}`,
    `Resources gathered: ${winner.name} ${winner.totalGathered.total} vs ${loser.name} ${loser.totalGathered.total}`,
    `APM: ${winner.name} ${winner.apm} vs ${loser.name} ${loser.apm}`,
  ];

  if (analysis.phases.unifiedPhases.length > 0) {
    lines.push('', 'Phase timeline:');
    for (const phase of analysis.phases.unifiedPhases) {
      lines.push(`  ${formatTime(phase.startTime)}-${formatTime(phase.endTime)}: ${phase.label}`);
    }
  }

  if (analysis.inflectionPoints.length > 0) {
    lines.push('', 'Key inflection points:');
    for (const ip of analysis.inflectionPoints) {
      const favored = ip.favoredPlayer === 1 ? analysis.player1.name : analysis.player2.name;
      lines.push(`  ${formatTime(ip.timestamp)}: ${ip.scoreType} shift of ${ip.magnitude} favoring ${favored}`);
      if (ip.destructionCluster) {
        const dc = ip.destructionCluster;
        if (dc.player1Losses.length > 0) {
          const losses = dc.player1Losses.map(l => `${l.count}x ${l.name}`).join(', ');
          lines.push(`    ${analysis.player1.name} lost: ${losses}`);
        }
        if (dc.player2Losses.length > 0) {
          const losses = dc.player2Losses.map(l => `${l.count}x ${l.name}`).join(', ');
          lines.push(`    ${analysis.player2.name} lost: ${losses}`);
        }
      }
    }
  }

  if (analysis.finalArmyMatchup) {
    const m = analysis.finalArmyMatchup;
    lines.push('', `Final army values: ${analysis.player1.name} ${m.army1RawValue} vs ${analysis.player2.name} ${m.army2RawValue}`);
    lines.push(`Counter-adjusted: ${m.army1AdjustedValue} vs ${m.army2AdjustedValue}`);
  }

  lines.push('', 'Write a 2-3 sentence bottom-line summary explaining why the winner won. Be specific about game mechanics (age-up timing, army composition, resource efficiency, map control). Do not use generic statements.');

  return lines.join('\n');
}

export async function generateNarrative(analysis: GameAnalysis): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(analysis);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error) {
    console.warn(`Failed to generate narrative: ${(error as Error).message}`);
    return null;
  }
}
