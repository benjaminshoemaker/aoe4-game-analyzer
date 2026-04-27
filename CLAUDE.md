# Learnings

## Insight Generation (failed attempt, reverted)

An attempt was made to add rule-based auto-generated insight bullets to each phase of the analyze output. The implementation passed all unit tests but produced low-quality output on real data. Key lessons:

- **Always validate against real game output before considering done.** Run `FORCE_COLOR=0 node -r ts-node/register -r ./__tests__/helpers/setupNock.ts -r ./__tests__/helpers/setupAnalyzeNock.ts src/index.ts analyze 111 123456 --no-narrative` and inspect the full output. Unit tests with hand-crafted inputs can pass while the code produces garbage on real data.
- **"Technically true" is not the same as useful.** A rule that says "Neither player produced military units" in every phase of a boom game is noise, not insight. An insight should tell you something you wouldn't already know from glancing at the numbers.
- **Avoid insights that repeat across phases.** If a fact is true for 5 consecutive phases, saying it 5 times is worse than saying it once or not at all. Each phase's insights should highlight what *changed* in that phase.
- **Plan thresholds may not match real data.** The plan specified >50% military for "aggressive" but the plan's own example showed 36% as meaningful. Always cross-check thresholds against actual game values.
- **Unit tests that mirror implementation thresholds are circular.** Tests should use realistic game scenarios, not values crafted to trigger specific code paths.
- **Age ordinal matters for split-age comparisons.** When players are in different ages, the higher age is always "ahead" regardless of timing. Don't use age-up timestamps to determine who leads in a split-age phase.
