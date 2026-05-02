import { PlayerSummary } from '../parser/gameSummaryParser';
import { AgeName, GamePhases, UnifiedPhase } from './types';

interface AgeUpEvent {
  player: 1 | 2;
  age: AgeName;
  timestamp: number;
}

const ageOrder: AgeName[] = ['Dark', 'Feudal', 'Castle', 'Imperial'];

const ageKeyMap: Record<string, AgeName> = {
  feudalAge: 'Feudal',
  feudal_age: 'Feudal',
  castleAge: 'Castle',
  castle_age: 'Castle',
  imperialAge: 'Imperial',
  imperial_age: 'Imperial',
};

function extractAgeUps(player: PlayerSummary, playerNum: 1 | 2): AgeUpEvent[] {
  const events: AgeUpEvent[] = [];
  for (const [key, timestamps] of Object.entries(player.actions)) {
    const age = ageKeyMap[key];
    if (age) {
      for (const ts of timestamps) {
        events.push({ player: playerNum, age, timestamp: ts });
      }
    } else if (key === 'age_up') {
      // age_up arrays list timestamps sequentially: Feudal, Castle, Imperial
      const sorted = [...timestamps].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length && i < 3; i++) {
        events.push({ player: playerNum, age: ageOrder[i + 1], timestamp: sorted[i] });
      }
    }
  }
  return events;
}

export function getAgeUpTime(
  actions: Record<string, number[]>,
  age: AgeName
): number | null {
  // Check explicit keys first
  for (const [key, ageName] of Object.entries(ageKeyMap)) {
    if (ageName === age && actions[key]?.length > 0) {
      return actions[key][0];
    }
  }
  // Fall back to age_up array
  if (actions.age_up) {
    const sorted = [...actions.age_up].sort((a, b) => a - b);
    const ageIdx = ageOrder.indexOf(age) - 1; // Dark=0, so Feudal=0 in age_up array
    if (ageIdx >= 0 && ageIdx < sorted.length) {
      return sorted[ageIdx];
    }
  }
  return null;
}

function ageLabel(age: AgeName): string {
  return `${age} Age`;
}

function phaseLabel(p1Age: AgeName, p2Age: AgeName, p1Name: string, p2Name: string): string {
  if (p1Age === p2Age) {
    return ageLabel(p1Age);
  }
  return `${ageLabel(p1Age)} (${p1Name}) / ${ageLabel(p2Age)} (${p2Name})`;
}

export function identifyPhases(
  player1: PlayerSummary,
  player2: PlayerSummary,
  gameDuration: number
): GamePhases {
  const events = [
    ...extractAgeUps(player1, 1),
    ...extractAgeUps(player2, 2),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const unifiedPhases: UnifiedPhase[] = [];
  let currentP1Age: AgeName = 'Dark';
  let currentP2Age: AgeName = 'Dark';
  let currentStart = 0;

  for (const event of events) {
    // Skip if this event doesn't change anything (duplicate)
    const newP1Age: AgeName = event.player === 1 ? event.age : currentP1Age;
    const newP2Age: AgeName = event.player === 2 ? event.age : currentP2Age;

    if (newP1Age === currentP1Age && newP2Age === currentP2Age) continue;

    // Only create a phase if it has nonzero duration
    if (event.timestamp > currentStart) {
      unifiedPhases.push({
        label: phaseLabel(currentP1Age, currentP2Age, player1.name, player2.name),
        startTime: currentStart,
        endTime: event.timestamp,
        player1Age: currentP1Age,
        player2Age: currentP2Age,
      });
    }

    currentP1Age = newP1Age;
    currentP2Age = newP2Age;
    currentStart = event.timestamp;
  }

  // Final phase
  if (gameDuration > currentStart) {
    unifiedPhases.push({
      label: phaseLabel(currentP1Age, currentP2Age, player1.name, player2.name),
      startTime: currentStart,
      endTime: gameDuration,
      player1Age: currentP1Age,
      player2Age: currentP2Age,
    });
  }

  return { unifiedPhases, gameDuration };
}
