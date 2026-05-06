# Next Steps (Prioritized)

Last updated: 2026-05-03 (America/Los_Angeles)

- [ ] `P1` Stop hard-coding the PostHog write key as a default in `apps/web/src/lib/posthogAnalytics.ts`
  - The current `DEFAULT_POSTHOG_TOKEN` is a `phc_*` write-only key, so it is not a credential leak, but anyone who forks the repo will silently feed analytics events into the upstream project unless they set `NEXT_PUBLIC_POSTHOG_TOKEN`.
  - Make the default empty string so `buildPostHogAnalyticsScript` short-circuits when no env var is configured. Update `postHogConfigFromEnv` and the unit tests that assert the default token value (`apps/web/__tests__/unit/posthogAnalytics.test.ts`).
  - When you flip the default, also confirm the deploy-time env wiring (Vercel preview + production) sets `NEXT_PUBLIC_POSTHOG_TOKEN` so analytics keep flowing.
  - Source: code review on the cache+analytics branch (2026-05-03).


This is the feature backlog for follow-up work after the current v1 post-match implementation.
Correctness fixes, bug work, API reliability, and civ-specific accounting gaps live in `BUGS_FIXES.md`.
Completed or no-longer-open items live in `COMPLETED_NEXT_STEPS.md`.

This file centralizes feature items from:
- `features/resource_flowchart/NOTES.md`
- `features/resource_flowchart/MECHANICS_RESEARCH.md`
- `DEFERRED.md`
- `AOE4WORLD_API_FINDINGS.md`

Priority levels:
- `P0`: highest-priority explanatory feature work
- `P1`: major model confidence/coverage improvements
- `P2`: product/UX expansion after core model is stable

## P0 — Core Explanation Features

- [ ] `P0` Adjusted military value with upgrade/counter timing windows
  - Replace or augment the current heuristic class matrix with an adjusted military-value estimate that accounts for active upgrades, age/tier timing, unit counters, weapon damage/speed/modifiers, and armor data.
  - Explicitly model pre-upgrade vs upgraded fight windows so equal nominal resource value can be interpreted as different real fighting power.
  - Include aura/buff units such as the Ottoman Mehter here, as combat-strength modifiers rather than economic-accounting effects.
  - If adjusted military returns to the web UI, add a narrow route/surface contract first, then downsample or lazy-load the expensive series instead of rebuilding it for every report request.
  - Why: this directly explains "same value, different outcome" engagements.
  - Source: user follow-up; `NOTES.md` (Current limitations + Suggested slices, Proposed model section C); web performance pass on `aoe4-game-analyzer-web.vercel.app`.

- [ ] `P0` Villager idle-time proxy from gather-rate drops
  - Estimate all villager idle time from available telemetry, starting with drops in effective gather rate during engagements as a proxy signal.
  - Categorize likely causes when the evidence supports it, but do not require categorization for the first useful version.
  - Separate idle-time signal from villager deaths, upgrades, civ modifiers, resource depletion, and normal economic transitions as much as the telemetry allows.
  - Why: idle time can explain resource gaps that villager count alone misses.
  - Source: user follow-up; `DEFERRED.md`, `NOTES.md` (open discussion/data availability).

- [ ] `P0` Divergence attribution, decisive-ahead, and evidence-backed explanation layer
  - Combine trajectory-split detection, decisive-ahead research, ranked cause attribution, and the lazy AI explanation widget into one evidence-first feature track.
  - First output should identify where the game diverged and what evidence supports the likely cause; probability-style claims should abstain unless the model has enough corpus support.
  - Reuse `features/ai_explanation/PLAN.md` for the prose layer, but keep the underlying evidence packet as the source of truth.
  - Why: this is the synthesis layer that turns allocation, military, destruction, idle-time, and civ-effect signals into a coherent match explanation.
  - Source: `NOTES.md` (Current model limitations), `features/win_probability/PLAN.md`, `features/ai_explanation/PLAN.md`, `DEFERRED.md` (descriptive-first posture).

## P1 — Context And Model Features

- [ ] `P1` Advanced villager-efficiency modifier modeling
  - Define which harder-to-observe villager-efficiency effects should be modeled, including positional auras, drop-off bonuses, extra-resource conversion, alternative worker types, and other hybrid channels tied to villager actions.
  - Good examples: Aachen Chapel inspiration zones, Granary/Cistern-style local boosts, drop-off bonuses that create extra resources, and civ-specific worker or collection mechanics that make raw villager count understate or overstate true income.
  - Why: these can materially change effective gather rate, but the model needs an explicit inclusion policy so "villager opportunity cost" stays interpretable.
  - Source: civ-mechanics text audit and user clarification request.

- [ ] `P1` Surface event-window gather disruption in Villager opportunity
  - Reuse the event-window gather disruption signal currently shown under Event impact -> Encounter losses.
  - Keep it separate from villager deaths and TC idle seconds so opportunity math does not double-count direct villager loss, underproduction, and temporary raid pressure.
  - Why: once the signal has enough examples, the Villager opportunity section should show raid-pressure economic downtime alongside deaths and TC idle seconds without changing the event-window source of truth.
  - Source: user follow-up on the 229727104 / 8:15 Yatai event.

- [ ] `P1` Add defensive-context confidence heuristics
  - Infer likely defensive-overextension windows from infrastructure state + destruction clusters.
  - Why: major context modifier with limited direct telemetry.
  - Source: `NOTES.md` (Proposed model, section E).

- [ ] `P1` Investigate AoE4World replay-summary data for defensive-fight location context
  - Evaluate `https://github.com/aoe4world/replays-api` as a source for entity coordinates and death/attacker records.
  - Specific target: use parsed `STLS` created-entity coordinates to locate keeps, outposts, town centers, and defensive landmarks, then compare fight/loss clusters against defensive-structure ranges.
  - Also evaluate whether `STLB.damageDealt` and lost-entity attacker fields can distinguish damage done by buildings versus nearby army units.
  - Key caveat: the repo's tester notes full replay parsing is not implemented; first pass should verify whether replay summary files are available for target matches and whether the parser output is stable enough to integrate.
  - Why: this may turn the current heuristic "defensive structures were active nearby" signal into a location-backed "fight happened under defensive structures" signal.
  - Source: user follow-up, AoE4World GitHub org, `aoe4world/replays-api`.

- [ ] `P1` Shared cross-civ axes lock-in
  - Finalize common comparison axes and confidence policy.
  - Why: necessary to keep cross-civ comparisons honest and consistent.
  - Source: `NOTES.md` (open discussion items).

## P2 — Output / UX Expansion

- [ ] `P2` Deferred combat model: iterative attrition simulation (decreasing DPS as units die)
  - Replace one-pass weighted averaging with short-step attrition updates over an engagement window.
  - Status: deferred from current formula pass.

- [ ] `P2` Deferred combat model: explicit target-selection and overkill policy
  - Add no-overkill / retargeting heuristics so multi-unit engagements do not over-credit wasted volleys.
  - Status: deferred, low priority.

- [ ] `P2` Deferred combat model: richer projectile / AoE / timing handling
  - Improve opening-volley and area-damage treatment using AoE4 weapon timing semantics.
  - Status: deferred, low priority.

- [ ] `P2` Evaluate band stacking order alternatives
  - Test readability of `Permanent/Research bottom` vs current order.
  - Source: `DEFERRED.md`.

- [ ] `P2` Evaluate continuous bet-shape classifier
  - Replace named categories with economic-axis × military-axis.
  - Source: `DEFERRED.md`.

- [ ] `P2` Render civ-overlay value in-band (not only event cards)
  - Source: `DEFERRED.md`.

- [ ] `P2` Add richer visual layers (Sankey/alluvial) and user-adjustable slice boundaries
  - Source: `DEFERRED.md`.

- [ ] `P2` Add interactive public web UI
  - Source: `DEFERRED.md`.

- [ ] `P2` Add net-vs-invested basis toggle to allocation lead/mix widget
  - Add a compact `Current net pool` / `Total investment` toggle to the `Resource state over time` widget.
  - Keep `Current net pool` as the default view; in `Total investment` mode, category values should represent `net + destroyed` so the chart answers "what did each player commit?" rather than "what is still present?"
  - Update the leader strip, category share denominators, lane labels, hover labels, and chart explainer together so the visual does not silently change meaning.
  - In invested mode, hide the standalone `Destroyed` lane or relabel it as a destroyed component to avoid double-counting against the category lanes.
  - Source: user follow-up on allocation widget semantics.

## Suggested Execution Order

1. `P0` adjusted military value with upgrade/counter timing windows.
2. `P0` all-villager idle-time proxy from gather-rate drops.
3. `P0` divergence attribution, decisive-ahead, and evidence-backed explanation layer.
4. `P1` defensive-context heuristics and replay-summary location research.
5. `P1` advanced villager-efficiency modifier modeling if the examples prove useful.
6. `P2` UX expansion, with net-vs-invested basis toggle last.
