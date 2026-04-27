# Resource Flowchart Notes (1v1 RM/QM)

Last updated: 2026-04-24 (America/Los_Angeles)

Companion research:
`features/resource_flowchart/MECHANICS_RESEARCH.md` contains the broad cross-civilization mechanics scan (3304 entities across units, buildings, and technologies).

## Objective

Build a tool that answers: "I lost this 1v1 game. What happened?" with reasons that are usually correct and actionable.
Current posture is descriptive first: explain trajectory and compounding, not diagnosis or prescriptive coaching.

Core framing:
1. Economy creates potential.
2. Potential is converted into military value.
3. Military value is modified by tech, composition, and terrain/defensive context.
4. Final outcome comes from repeated engagements plus objective pressure.

Core framing refinement (allocation view):
1. The linear chain above is still directionally useful, but too clean.
2. Economy is a continuous allocation problem where spend routes into multiple destinations with different delays and feedback loops.
3. Villagers increase future gather rate after a build delay.
4. Production buildings increase conversion capacity (what army can be produced from available bank).
5. Tech and age-up change value-per-unit and unlock options; both are timing-gated commitments.
6. Walls/defenses convert resources into damage reduction and space control, not direct DPS.
7. Military spending only becomes fielded combat value when production capacity, housing headroom, and queue time all align.
8. Surrender is an endpoint marker, not the root causal moment; the loss trajectory compounds earlier.

## User Caveats Captured

1. Indirect generation exists.
Ottoman Military School produces units directly at no resource cost.

2. Real spend can differ from unit value.
Jeanne d'Arc consecrated production can reduce unit cost, so equal army value may be reached with lower spend.

3. Raw value alone is insufficient.
Age and upgrades, counter composition, and static defenses can flip fights even when one side has nominally more units.

## Macro State Variables and Structural Signals

State variables to track through time:
1. Workforce size and assignment by resource type.
2. Banked stockpile per resource.
3. Building count by type (production capacity).
4. Completed tech and current age.
5. Population usage vs housing cap.
6. Map presence / map-object control.
7. Currently fielded military.

Signals to surface explicitly (terminology note: structural signals, not "leaks"):
1. Idle workers: gather capacity exists but is unrealized.
2. Idle production: conversion capacity exists but is underutilized.
3. Banked surplus: resources are accumulated but not yet converted.

Phase variance assumption:
1. The conversion relationship changes by phase (Dark/Feudal/Castle/Imperial).
2. "Resources spent -> fielded military value" must be interpreted phase-wise, not globally.

## Research Summary (AoE4 + AoE4World)

## 1) Verified data surfaces we can use

1. AoE4World multiplayer API (`/api/v0`):
`players`, `player games`, `leaderboards`, `games`, `stats` for RM/QM 1v1.

2. AoE4World summary endpoint:
`/players/:profile_id/games/:game_id/summary?camelize=true` provides timeline-friendly match detail used by this repo.

3. AoE4World static data:
`data.aoe4world.com` gives units/buildings/technologies parsed from game files with costs, classes, weapons, armor, modifiers, and descriptions.

4. AoE4World dumps:
Historical bulk files for backfill.

## 2) Mechanics directly relevant to your caveats

1. Ottoman indirect military value:
`military-school-1` description: produces selected units continuously at no cost (slower cadence).
The building is explicitly classed as `free_passive_unit_production`.

2. Ottoman free unit injections and scaling:
`janissary-company-1` spawns Janissaries tied to Landmark TC + Military Schools.
`advanced-academy-1` increases military production speed and broadens Military School roster.
`military-campus-1` increases the number of Military Schools that can be built.
`mehmed-imperial-armory-2` produces siege engines for free with longer train time.

3. Jeanne d'Arc effective-cost distortion:
`ordinance-company-3` states consecrated buildings reduce Wood and Gold unit cost by 25%.
Jeanne also has companion and rally call mechanics that can inject combat value not cleanly represented by standard "unit purchased at full cost" accounting.

4. Defensive context mechanics:
Keeps and Outposts can gain emplacements and defensive upgrades.
Tech examples include `arrowslits-2`, `springald-emplacement-3`, `cannon-emplacement-4`, `boiling-oil-3`, `fortify-outpost-2`.

5. Map-control economy that changes "resource -> unit" flow:
Relics, Sacred Site capture, trade, and civ-specific passive generation all affect military conversion capacity.
In your existing `long-game.json` (RM 1v1), action keys include `monkCaptureHolySite`, `pickupRelic`, `monkStatetreeDepositRelic`.

## 3) What this repository already does well

1. Parses summary timelines (resources, build order, actions, score streams).
2. Resolves build-order items to static unit/building/tech data with costs and classes.
3. Reconstructs standing army over time from produced/destroyed timestamps.
4. Computes phase comparisons (allocation, income snapshots, age timing deltas).
5. Detects inflection points and links them to nearby destruction clusters.
6. Applies a value-adjusted counter model for army-vs-army comparisons.

## 4) Current model limitations (important for "why did I lose?")

1. Counter model is heuristic and class-based, not full weapon-vs-armor simulation.
2. Effective army value currently uses mostly base cost * tier multiplier.
3. Civ-specific discount and free-spawn mechanics are not fully normalized into a single ledger.
4. No positional data in summary means "fought under keep/outpost aura" is not directly observable.
5. No direct micro signal (target fire quality, formation usage, stutter-step quality, pathing mistakes).
6. Economy flow is still treated too linearly instead of as a multi-destination allocation system with delays.
7. Capital commitments (age-up/landmark/production infrastructure) are not yet modeled as forward potential shifts.
8. Divergence attribution is under-specified (where trajectory split started: allocation, timing, destruction, or civ mechanic).

## Proposed Analysis Model (first-pass design)

## Model scope lock-in (descriptive first)

1. Primary target is descriptive trajectory modeling: show how two game states diverge over time.
2. Macro effects are first-class (economy, timing, conversion, objective pressure).
3. Micro/positional detail remains acknowledged but lower-confidence due to telemetry limits.
4. Capital commitments (age-up, landmark choices, production infra investment) should be represented as forward potential, not only current spend.
5. Attribution should identify where divergence originated:
allocation structure, phase timing miss, destruction shock, or civ mechanic effect.

## A) Two ledgers, not one

1. Combat Value Ledger (CVL):
Reference value of all fielded combat power regardless of how it was paid for.
Includes trained units, free spawns, and call-ins.

2. Resource Ledger (RL):
Actual resource economy and spending pressure over time.
Uses reported `totalResourcesGathered` and `totalResourcesSpent` as ground truth anchors.

Why both:
CVL explains fight strength.
RL explains efficiency and macro sustainability.

## B) Normalize indirect generation and discounts explicitly

1. Free production normalization:
When free units appear (Military School, call-ins, spawned armies), assign each a reference value from static costs and add to CVL.

2. Discount normalization:
When civ mechanics reduce unit price, keep CVL at reference value but lower RL spend.
This captures "same strength for less spend" as efficiency advantage.

3. Output both "fielded value" and "value per spend":
Fielded value answers "who had more effective army potential."
Value per spend answers "who converted economy more efficiently."

## C) Upgrade and age power layer

1. Track age-up timing deltas by phase.
2. Track military upgrade timing from action keys and upgrade build entries.
3. Apply upgrade-aware combat multipliers in matchup scoring.
4. Penalize "fighting pre-upgrade into upgraded units" windows.

## D) Composition layer (upgrade from current heuristic)

1. Move from broad class matrix toward weapon profile simulation using static data:
use `weapons.damage`, `weapons.speed`, `modifiers`, target classes, and armor.

2. Compute approximate engagement efficiency:
effective DPS / effective HP by pairing distributions at key timestamps.

## E) Defensive context layer

Given missing coordinates, use proxy confidence scoring:
1. Determine if defender had active keeps/outposts/wall towers alive in the window.
2. Determine if emplacement tech was researched before that fight window.
3. If big attacker losses cluster while defensive infrastructure is alive, flag likely defensive-overextension.
4. Mark as probabilistic inference, not certainty.

## F) Explanation output structure

For each game, produce:
1. Top 3 loss drivers (ranked with confidence).
2. One timeline panel (phase-by-phase turning points).
3. One economy panel (gathered vs spent vs floating vs conversion).
4. One military panel (composition, upgrade windows, value trades).
5. One "what to do next game" action list.

## G) Army value comparison policy

1. Raw army value is the primary comparator.
2. Matchup-adjusted value is a secondary comparator.
3. If raw and matchup-adjusted comparators disagree, surface the disagreement as part of the explanation:
composition/counter dynamics are doing material work that raw value alone cannot explain.

## H) Civ divergence handling for honest cross-civ comparison

Baseline principle:
1. Use one baseline "standard civ" accounting model plus a small patch library per civ.
2. Reframing lock-in: civ patches exist to make shared-axis cross-civ comparisons honest, not to avoid cross-civ comparison.
3. Different civ formulas are required to compute common currency faithfully (economy output, fielded value, timing windows).

Dimensions civs can diverge on:
1. Time-as-resource systems.
2. Alternative currencies.
3. Pre-game / in-game identity choices.
4. Free value injections.
5. Effective-cost distortions.
6. Mobile/transformable state.
7. Density/proximity bonus systems.
8. Hero/leveling systems.
9. Map-object economy coupling.

Current civ dispositions for framework scope:
1. Delhi:
Deferred. Strong time-as-resource divergence (zero-resource tech with time/scholar gating) requires tech-progress state as first-class.
2. Jeanne d'Arc:
Deferred. Simultaneous hero-state + free-injection + effective-cost distortion complexity.
3. Mongol:
Packed/mobile building behavior de-prioritized; keep free-spawn treatment under free value injection patching.
4. Byzantine:
Track olive oil as a resource axis; no extra free-value accounting assumed beyond correct resource treatment.
5. Chinese / Zhu Xi:
Track Imperial Officials as economic units; treat dynasty progression as a gated phase-like state.
6. Abbasid / Ayyubid:
Open discussion item. Wing-choice framing and Golden Age density/proximity effects need clearer shared-axis interpretation before encoding.
7. Others (Rus, French, English, HRE, Order of Dragon, Japanese, Malian, Knights Templar, Ottoman):
Near baseline with one-to-two dimension patches each; Ottoman remains canonical free-injection reference.

## Data Availability for This Design

## Available now from summary + static data

1. Resources over time and per-minute income.
2. Age-up and many tech timings via actions/build order.
3. Unit/building/upgrade production and destruction timestamps.
4. Total gathered/spent resources.
5. Unit costs, classes, armor, and weapon modifiers from static data.
6. Summary-level activity fields such as `apm` and `_stats.inactperiod` (plus `lowintperiod` in `_recentGameHash.raw` stats) are present.

## Missing / weakly observable

1. Exact battle location.
2. Exact unit pathing, formation control, and focus fire quality.
3. Exact per-event discount application windows (must infer from civ + tech timings + production context).
4. Exact garrison occupancy during fights.
5. Explicit villager idle-time metric in summary response shape is not observed.
6. Explicit per-building idle-production / queue idle-time metric is not observed.

## Practical implication

The tool should output confidence bands and avoid absolute claims when inference is indirect.

## Suggested Implementation Slices

Implementation remains intentionally deferred until framework lock-in on open discussion items below.

1. Slice 1:
Create normalized CVL + RL engine with free-unit and discount hooks for Ottoman and Jeanne first.

2. Slice 2:
Integrate action/upgrade timing into phase combat interpretation.

3. Slice 3:
Replace heuristic-only counter scoring with weapon-modifier-aware approximation.

4. Slice 4:
Add defensive-context heuristics and confidence tags.

5. Slice 5:
Generate user-facing "Why I lost" report with ranked drivers and next actions.

## Deferred / Open Discussion Items

1. Villager idle-time availability:
Investigated against live summary response shape. No explicit villager-idle metric observed. Closest available fields are player-level activity stats (`apm`, `_stats.inactperiod`, raw `lowintperiod`) that are not villager-idle equivalents.
2. Idle production magnitude:
Keep open; quantify once we have a sample of matches and consistent proxy definitions.
3. Abbasid / Ayyubid wing-choice framing:
Open; needs a shared-axis interpretation for wing-driven divergence and Golden Age density effects.
4. Chinese / Zhu Xi dynasty progression:
Open; recognized as phase-like gating but detail level and weighting are not fixed.
5. Shared cross-civ comparison axes:
Open; candidate axes include raw fielded value, gather capacity/rates, conversion capacity, age timing, map-object pressure/control, and population state.

## Questions for You

1. Which open item should we resolve first in discussion: Abbasid/Ayyubid framing, shared-axis definition, or Chinese/Zhu Xi dynasty treatment?
2. For terminology in future docs/output, do you want "structural under-conversion signals" as the standard phrase for worker/production idle + banked surplus?

## Villager Opportunity Widget (Locked Defaults, 2026-04-24)

These defaults are now locked for the independent villager-opportunity panel.

1. Panel shape:
Side-by-side (both players), mini-panel format, cumulative-first display with optional instantaneous overlay in hover/detail state.
2. Counterfactual stop rule:
Only enforce villager target cap for v1. Counterfactual villager production stops at 120 villagers.
3. Baseline villager value:
40 resources per minute per villager, before modifiers.
4. Baseline blend weights:
Use fixed resource blend weights estimated from reference game `230143339`:
`food=0.43`, `wood=0.30`, `gold=0.23`, `stone=0.04`.
5. Upgrade/passive modifier policy:
Include direct economic gather-rate upgrades and civ passive economic multipliers. Stack modifiers multiplicatively.
6. Wheelbarrow handling:
Model as an effective villager-throughput multiplier (`+8%`) at research completion time (configurable constant).
7. Loss-accounting policy:
Use deficit-based accounting so replacements close deficit instead of double-counting death and idle losses.

## Core Definitions

At timestamp `t`:

1. `expected_villager_rate_rpm(t)`:
`40 * (0.43*m_food(t) + 0.30*m_wood(t) + 0.23*m_gold(t) + 0.04*m_stone(t))`
2. `expected_villagers(t)`:
Deterministic villager-production schedule (civ/tech aware) truncated at 120.
3. `observed_produced_villagers(t)`:
Count of villager `finished` timestamps `<= t`.
4. `observed_alive_villagers(t)`:
`observed_produced_villagers(t) - observed_villager_deaths(t)`.
5. `underproduction_deficit(t)`:
`max(0, expected_villagers(t) - observed_produced_villagers(t))`.
6. `total_deficit(t)`:
`max(0, expected_villagers(t) - observed_alive_villagers(t))`.
7. `death_deficit(t)`:
`max(0, total_deficit(t) - underproduction_deficit(t))`.

This decomposition keeps the buckets additive without double-counting.

## Loss Curves

Given timestep `dt_seconds`:

1. Instantaneous underproduction loss:
`underproduction_deficit(t) * expected_villager_rate_rpm(t) / 60`.
2. Instantaneous death loss:
`death_deficit(t) * expected_villager_rate_rpm(t) / 60`.
3. Instantaneous total loss:
`(underproduction_deficit(t) + death_deficit(t)) * expected_villager_rate_rpm(t) / 60`.
4. Cumulative curves:
Running integral of each instantaneous loss over time.

## v1 Upgrade Mapping Notes

The v1 mapping should include action keys that match known econ upgrades (for example horticulture/food, double broadaxe/wood, specialized pick/gold/stone variants), plus civ-specific suffix forms (`...Jpn`, etc.). Current reference examples seen in live samples include:

1. `upgradeEconResourceFoodHarvestRate2/3`
2. `upgradeEconResourceWoodHarvestRate2/3`
3. `upgradeEconResourceWoodFellRate1`
4. `upgradeEconResourceGoldHarvestRate2/3`
5. `upgradeEconResourceStoneHarvestRate2/3`
6. `upgradeUnitTownCenterWheelbarrow1/2` (effective throughput modifier)

Pop-cap stop logic is deferred until a robust population-cap timeline model is added.

## Sources

1. AoE4World API docs:
https://aoe4world.com/api

2. AoE4World data docs:
https://data.aoe4world.com/

3. AoE4World static data files used in this research:
https://data.aoe4world.com/units/all.json
https://data.aoe4world.com/buildings/all.json
https://data.aoe4world.com/technologies/all.json

4. Repo references:
`src/parser/gameSummaryParser.ts`
`src/parser/buildOrderResolver.ts`
`src/analysis/armyReconstruction.ts`
`src/analysis/phaseComparison.ts`
`src/analysis/inflectionDetection.ts`
`src/data/counterMatrix.ts`
