# Win Probability Research Plan

Last updated: 2026-05-01 (America/Los_Angeles)

## Objective

Explore a future post-match feature that estimates whether either player was positionally favored at a specific timestamp in an Age of Empires IV 1v1 game.

The intended product is not a deterministic verdict. It should answer:

> Given the complete known game state at this timestamp, and given that this is a Diamond-level game, did comparable positions historically convert into wins often enough to say one player was decisively ahead?

## Primary Use Cases

1. Post-game review.
   A losing player can see whether there was a window where they were favored and missed their moment.

2. Crash/dispute review.
   When a game crashes and players disagree about who was ahead, the tool can provide a data-backed view of whether either player had a decisive positional advantage.

## Target Scope

Initial scope should be:

1. Ranked 1v1 only.
2. Diamond-level games only.
3. Omniscient state at timestamp, not player-scouted state.
4. Match-skill bracket context, not individual player identity.
5. Conservative decisive-ahead classification, not full probability calibration.

The target question for a proof of concept is:

> Is Player A or Player B very likely favored, roughly 75% or better, or should the system abstain?

Output states:

1. `Player A decisively ahead`
2. `Player B decisively ahead`
3. `No decisive advantage / insufficient confidence`

The abstain state is important. For a POC, precision on decisive calls matters more than making a call at every timestamp.

## Why Not Full Win Probability First

Full probability calibration asks the model to distinguish 52/48 from 60/40 from 70/30 positions. That requires a much larger and better-calibrated corpus.

A decisive-ahead classifier is narrower. It only needs to identify obvious, high-confidence positions and abstain elsewhere. This should require fewer games, but still needs enough real summaries to validate that decisive calls are correct.

## Current Implementation Status

The web app currently has an untrained data scaffold only.

Implemented pieces:

1. `apps/web/src/lib/aoe4/analysis/winProbability.ts`
   Builds timestamp-safe feature examples from the existing post-match model.

2. `/matches/:profileSlug/:gameId/win-probability-data?matchElo=...`
   Returns model-ready rows with state features, match bracket, and eventual outcome labels.

3. The endpoint explicitly reports `modelStatus: "untrained"`.

Not implemented:

1. No trained model.
2. No probability timeline.
3. No decisive-ahead classifier.
4. No bulk corpus ingestion.
5. No production claim about who was ahead.

## Feature Principles

Every training row must be cutoff-safe:

1. Include only state visible in the summary at or before timestamp `t`.
2. Use the final result only as the training label.
3. Exclude final or future-derived explanatory fields from features.

The current likely feature families are:

1. Strategic allocation values and shares.
2. Deployed resource pool deltas.
3. Float / unconverted resources.
4. Gather-rate deltas.
5. Destroyed value and opportunity-lost value.
6. Adjusted military value.
7. Recent 60-120 second trend features.
8. Age/tech timing windows.
9. Civ matchup and map/patch context, if enough data exists.

## Data Findings

AoE4World has public dumps at:

`https://aoe4world.com/dumps`

These dumps are the correct starting point for candidate selection because they avoid broad polling of the live games API.

The public RM 1v1 game dumps include:

1. `game_id`
2. start/finish timestamps
3. duration
4. map
5. patch
6. player profile IDs
7. civilizations
8. result
9. MMR/rating fields where available

Important limitation:

The public game dumps do not appear to include the full game-summary timelines needed for the current feature model: resource curves, build order, destroyed timings, score streams, and related summary details.

## Diamond Corpus Sanity Check

On 2026-05-01, a streamed count of the latest public RM 1v1 Season 11 dump found:

1. `1,469,194` RM 1v1 games total.
2. `1,299,391` games with both players' MMR present.
3. `194,907` games with average MMR from `1200` to `1399`.
4. `160,061` games where both players were individually from `1200` to `1399`.
5. `179,739` average-MMR `1200-1399` games lasting at least 10 minutes.
6. `154,026` average-MMR `1200-1399` games lasting at least 15 minutes.

This means candidate discovery is not the blocker. Full summary access is the blocker.

## Data Ethics And Load Policy

Do not bulk-fetch game summaries from AoE4World without explicit coordination.

Reasons:

1. The game-summary endpoint is more expensive than metadata dumps.
2. Prior probing in this repo observed `429` rate limiting.
3. AoE4World is a community-run project.
4. This project benefits from their work and should avoid imposing avoidable server load.

Acceptable before outreach:

1. Use public dumps to estimate candidate corpus size.
2. Fetch a very small number of summaries manually for local development and fixture validation.
3. Cache every fetched summary locally.
4. Avoid automated high-volume summary crawling.

Not acceptable before outreach:

1. Fetching hundreds or thousands of summaries.
2. Parallelized summary downloads.
3. Repeated recrawls of the same games.
4. Treating public endpoints as a bulk-training feed.

## Preferred Next Step

After the article and tool are published, reach out to the AoE4World team and ask for bulk or integration access to game summaries.

The ask should be concrete:

1. Explain the post-match win-probability / decisive-ahead research goal.
2. Emphasize Diamond RM 1v1 as a narrow first scope.
3. Explain that the project will avoid scraping the summary endpoint.
4. Ask whether they can provide bulk summary data, a limited export, or an approved integration path.
5. Offer to share methodology, attribution, caching policy, and any derived findings.

## Proposed POC If Access Is Granted

1. Start with Diamond RM 1v1 only.
2. Prefer 1,000-2,000 summaries if bulk access is easy.
3. If the team prefers a smaller first export, even 200-500 summaries can test pipeline viability.
4. Sample rows every 60 seconds, not every 30 seconds.
5. Train a conservative decisive-ahead classifier with abstention.
6. Evaluate precision on decisive calls:

> When the system says a player is decisively ahead, does that player win at least 75% of those positions?

7. Report abstention rate separately.

The POC should be considered successful only if decisive calls are both sparse enough to be conservative and accurate enough to be useful.

## Open Questions

1. Should Diamond be defined by average match MMR `1200-1399`, both-player MMR `1200-1399`, or AoE4World `rank_level=diamond`?
2. Should short games below 10 minutes be excluded?
3. Should new DLC/patch periods be modeled separately?
4. Should unsupported civs like Delhi and Jeanne be excluded until accounting support improves?
5. Should crash-dispute mode require stricter confidence than post-match review mode?
