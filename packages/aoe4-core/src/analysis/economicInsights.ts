import { GameAnalysis, PhaseComparison, IncomeSnapshot } from './types';

function totalIncome(snapshot: IncomeSnapshot): number {
  return snapshot.foodPerMin + snapshot.goldPerMin + snapshot.woodPerMin + snapshot.stonePerMin;
}

export function generateGameEconomicInsights(analysis: GameAnalysis): string[] {
  const insights: string[] = [];
  const p1 = analysis.player1;
  const p2 = analysis.player2;
  const winner = p1.result === 'win' ? p1 : p2;
  const loser = p1.result === 'win' ? p2 : p1;

  // 1. Resource gathering gap
  if (winner.totalGathered.total > 0 && loser.totalGathered.total > 0) {
    const ratio = winner.totalGathered.total / loser.totalGathered.total;
    if (ratio > 1.15) {
      const pct = Math.round((ratio - 1) * 100);
      insights.push(
        `${winner.name} out-gathered ${loser.name} by ${pct}% (${winner.totalGathered.total} vs ${loser.totalGathered.total} total resources)`
      );
    } else if (loser.totalGathered.total > winner.totalGathered.total) {
      insights.push(
        `${loser.name} gathered more total resources but ${winner.name} spent them more effectively`
      );
    }
  }

  // 2. Spending efficiency
  if (p1.totalGathered.total > 0 && p2.totalGathered.total > 0) {
    const p1Efficiency = (p1.totalSpent.total / p1.totalGathered.total) * 100;
    const p2Efficiency = (p2.totalSpent.total / p2.totalGathered.total) * 100;
    const diff = Math.abs(p1Efficiency - p2Efficiency);
    if (diff > 10) {
      const winnerEff = winner === p1 ? p1Efficiency : p2Efficiency;
      const loserEff = winner === p1 ? p2Efficiency : p1Efficiency;
      if (winnerEff < loserEff) {
        insights.push(
          `${winner.name} won despite floating more resources — better unit trades`
        );
      } else {
        insights.push(
          `${p1.name} spent ${Math.round(p1Efficiency)}% of gathered resources vs ${p2.name}'s ${Math.round(p2Efficiency)}%`
        );
      }
    }
  }

  // 3. Income trajectory
  if (analysis.phaseComparisons.length >= 2) {
    const incomeHistory: { phase: string; p1Total: number; p2Total: number }[] = [];
    for (const pc of analysis.phaseComparisons) {
      incomeHistory.push({
        phase: pc.phase.label,
        p1Total: totalIncome(pc.player1IncomeAtEnd),
        p2Total: totalIncome(pc.player2IncomeAtEnd),
      });
    }

    const winnerIncomes = incomeHistory.map(h => winner === p1 ? h.p1Total : h.p2Total);
    const loserIncomes = incomeHistory.map(h => winner === p1 ? h.p2Total : h.p1Total);

    const winnerAlwaysAhead = winnerIncomes.every((w, i) => w >= loserIncomes[i]);
    const loserAlwaysAhead = loserIncomes.every((l, i) => l >= winnerIncomes[i]);

    if (winnerAlwaysAhead && winnerIncomes.some((w, i) => w > loserIncomes[i])) {
      insights.push(`${winner.name} maintained higher income throughout the game`);
    } else if (!winnerAlwaysAhead && !loserAlwaysAhead) {
      // Find where winner overtook
      let flipPhase: string | null = null;
      for (let i = 1; i < incomeHistory.length; i++) {
        const prevWinner = winnerIncomes[i - 1];
        const prevLoser = loserIncomes[i - 1];
        const currWinner = winnerIncomes[i];
        const currLoser = loserIncomes[i];
        if (prevWinner < prevLoser && currWinner >= currLoser) {
          flipPhase = incomeHistory[i].phase;
          break;
        }
      }
      if (flipPhase) {
        insights.push(`${winner.name} overtook ${loser.name}'s income lead by ${flipPhase}`);
      }
    } else if (loserAlwaysAhead && loserIncomes.some((l, i) => l > winnerIncomes[i])) {
      // Loser had higher income but still lost — find when they pulled ahead early
      insights.push(`${loser.name} had an early income lead but ${winner.name} overtook them by ${incomeHistory[incomeHistory.length - 1].phase}`);
    }
  }

  // 4. Eco vs military investment balance
  if (analysis.phaseComparisons.length > 0) {
    let p1MilTotal = 0;
    let p2MilTotal = 0;
    let p1SpendTotal = 0;
    let p2SpendTotal = 0;

    for (const pc of analysis.phaseComparisons) {
      const p1PhaseSpend =
        pc.player1Allocation.militaryPercent +
        pc.player1Allocation.economyPercent +
        pc.player1Allocation.technologyPercent +
        pc.player1Allocation.buildingPercent;
      const p2PhaseSpend =
        pc.player2Allocation.militaryPercent +
        pc.player2Allocation.economyPercent +
        pc.player2Allocation.technologyPercent +
        pc.player2Allocation.buildingPercent;

      // Weight by whether there was any spending (percent sums to ~100 if any spending occurred)
      if (p1PhaseSpend > 0) {
        p1MilTotal += pc.player1Allocation.militaryPercent;
        p1SpendTotal += p1PhaseSpend;
      }
      if (p2PhaseSpend > 0) {
        p2MilTotal += pc.player2Allocation.militaryPercent;
        p2SpendTotal += p2PhaseSpend;
      }
    }

    const p1AvgMil = p1SpendTotal > 0 ? (p1MilTotal / p1SpendTotal) * 100 : 0;
    const p2AvgMil = p2SpendTotal > 0 ? (p2MilTotal / p2SpendTotal) * 100 : 0;

    if (p1AvgMil > 0 && p2AvgMil > 0 && (p1AvgMil > 2 * p2AvgMil || p2AvgMil > 2 * p1AvgMil)) {
      const heavierName = p1AvgMil > p2AvgMil ? p1.name : p2.name;
      const heavierPct = Math.round(Math.max(p1AvgMil, p2AvgMil));
      const lighterPct = Math.round(Math.min(p1AvgMil, p2AvgMil));
      const lighterName = p1AvgMil > p2AvgMil ? p2.name : p1.name;
      insights.push(
        `${heavierName} devoted ${heavierPct}% of spending to military vs ${lighterName}'s ${lighterPct}% — ${heavierName} sacrificed economy for early pressure`
      );
    }
  }

  return insights.slice(0, 4);
}

export function generatePhaseEconomicInsights(
  comparisons: PhaseComparison[],
  p1Name: string,
  p2Name: string
): string[][] {
  const result: string[][] = [];

  for (let i = 0; i < comparisons.length; i++) {
    const phaseInsights: string[] = [];
    const current = comparisons[i];

    if (i === 0) {
      // First phase: compare military allocation between players
      const p1Mil = current.player1Allocation.militaryPercent;
      const p2Mil = current.player2Allocation.militaryPercent;
      if ((p1Mil > 20 && p2Mil < 5) || (p2Mil > 20 && p1Mil < 5)) {
        const aggressor = p1Mil > p2Mil ? p1Name : p2Name;
        const boomer = p1Mil > p2Mil ? p2Name : p1Name;
        const aggressorPct = Math.round(Math.max(p1Mil, p2Mil));
        phaseInsights.push(
          `${aggressor} invested in early military (${aggressorPct}%) while ${boomer} focused purely on economy`
        );
      }
    } else {
      const prev = comparisons[i - 1];

      // 1. Income gap shift
      const currP1Income = totalIncome(current.player1IncomeAtEnd);
      const currP2Income = totalIncome(current.player2IncomeAtEnd);
      const prevP1Income = totalIncome(prev.player1IncomeAtEnd);
      const prevP2Income = totalIncome(prev.player2IncomeAtEnd);

      if (currP1Income > 0 && currP2Income > 0 && prevP1Income > 0 && prevP2Income > 0) {
        const currLeader = currP1Income >= currP2Income ? 1 : 2;
        const prevLeader = prevP1Income >= prevP2Income ? 1 : 2;
        const currRatio = Math.max(currP1Income, currP2Income) / Math.min(currP1Income, currP2Income);
        const prevRatio = Math.max(prevP1Income, prevP2Income) / Math.min(prevP1Income, prevP2Income);

        if (currLeader !== prevLeader && prevRatio > 1.05) {
          // Lead flipped
          const newLeaderName = currLeader === 1 ? p1Name : p2Name;
          const oldLeaderName = currLeader === 1 ? p2Name : p1Name;
          const newLeaderIncome = currLeader === 1 ? currP1Income : currP2Income;
          const oldLeaderIncome = currLeader === 1 ? currP2Income : currP1Income;
          phaseInsights.push(
            `${newLeaderName} overtook ${oldLeaderName} in income (${newLeaderIncome}/min vs ${oldLeaderIncome}/min)`
          );
        } else if (currRatio - prevRatio > 0.3) {
          // Gap grew
          const leaderName = currLeader === 1 ? p1Name : p2Name;
          const leaderIncome = currLeader === 1 ? currP1Income : currP2Income;
          const trailerIncome = currLeader === 1 ? currP2Income : currP1Income;
          phaseInsights.push(
            `${leaderName}'s income advantage grew to ${currRatio.toFixed(1)}:1 (${leaderIncome}/min vs ${trailerIncome}/min)`
          );
        } else if (prevRatio - currRatio > 0.3 && currRatio < 1.1) {
          // Gap closed to parity
          const prevTrailerName = prevLeader === 1 ? p2Name : p1Name;
          phaseInsights.push(`${prevTrailerName} closed the income gap to near-parity`);
        }
      }

      // 2. Spending pivot
      const p1MilNow = current.player1Allocation.militaryPercent;
      const p1MilPrev = prev.player1Allocation.militaryPercent;
      const p2MilNow = current.player2Allocation.militaryPercent;
      const p2MilPrev = prev.player2Allocation.militaryPercent;

      if (p1MilNow - p1MilPrev > 15) {
        phaseInsights.push(
          `${p1Name} pivoted to military (${Math.round(p1MilNow)}%, up from ${Math.round(p1MilPrev)}% last phase)`
        );
      } else if (p1MilPrev - p1MilNow > 15) {
        phaseInsights.push(
          `${p1Name} shifted back to economy (military down to ${Math.round(p1MilNow)}% from ${Math.round(p1MilPrev)}%)`
        );
      }

      if (p2MilNow - p2MilPrev > 15) {
        phaseInsights.push(
          `${p2Name} pivoted to military (${Math.round(p2MilNow)}%, up from ${Math.round(p2MilPrev)}% last phase)`
        );
      } else if (p2MilPrev - p2MilNow > 15) {
        phaseInsights.push(
          `${p2Name} shifted back to economy (military down to ${Math.round(p2MilNow)}% from ${Math.round(p2MilPrev)}%)`
        );
      }
    }

    result.push(phaseInsights.slice(0, 2));
  }

  return result;
}
