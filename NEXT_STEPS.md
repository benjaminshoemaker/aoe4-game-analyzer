# Next Steps (Prioritized)

Last updated: 2026-05-03 (America/Los_Angeles)

This is the consolidated backlog for follow-up work after the current v1 post-match implementation.
It centralizes deferred/open items from:
- `features/resource_flowchart/NOTES.md`
- `features/resource_flowchart/MECHANICS_RESEARCH.md`
- `DEFERRED.md`
- `AOE4WORLD_API_FINDINGS.md`

Priority levels:
- `P0`: correctness-critical for core explanatory model
- `P1`: major model confidence/coverage improvements
- `P2`: product/UX expansion after core model is stable

## P0 — Civ And Accounting Correctness

- [ ] `P0` Jeanne d'Arc full accounting model
  - Include hero-state progression, companion/rally injections, and consecrated discount windows.
  - Why: explicitly deferred and currently incomplete for core resource accounting.
  - Source: `NOTES.md` (User Caveats + Civ dispositions), `MECHANICS_RESEARCH.md` (`je` civ mechanics).

- [ ] `P0` Delhi time-as-resource model
  - Represent tech-time + scholar-gating as first-class state (not standard resource spend).
  - Why: explicitly deferred; breaks baseline spend assumptions.
  - Source: `NOTES.md` (Civ dispositions), `MECHANICS_RESEARCH.md` (`de` civ mechanics).

- [ ] `P0` Ottoman free-production normalization (beyond baseline)
  - Track Military School output cadence, Janissary-company injections, and related free-production paths.
  - Why: core user caveat and major non-cash combat-value source.
  - Source: `NOTES.md` (Ottoman caveats/mechanics), `MECHANICS_RESEARCH.md` (`ot` civ mechanics).

- [ ] `P0` Chinese/Zhu Xi state completeness
  - Improve dynasty/tax/official handling beyond current baseline assumptions.
  - Why: Notes call out dynasty as phase-like state and Imperial Officials as essential economy axis.
  - Source: `NOTES.md` (Civ dispositions + open items), `MECHANICS_RESEARCH.md` (`ch`, `zx`).

## P1 — Other High-Variance Civ And Economy Cases

- [ ] `P1` Abbasid/Ayyubid wing-choice modeling
  - Detect selected wing paths and decide whether they branch classification/valuation.
  - Why: explicitly open in current notes/deferred backlog.
  - Source: `DEFERRED.md`, `NOTES.md` (open discussion items).

- [ ] `P1` Byzantine olive-oil and mercenary integration details
  - Keep olive oil as explicit resource axis and improve mercenary value-timing treatment.
  - Why: alternative-currency civ with nonstandard military entry paths.
  - Source: `NOTES.md` (Civ dispositions), `MECHANICS_RESEARCH.md` (`by`).

- [ ] `P1` Mongol mobile/packed state decision
  - Decide whether packed-building mobility stays de-prioritized or becomes first-class axis.
  - Why: civ divergence acknowledged but currently simplified.
  - Source: `NOTES.md` (Civ dispositions).

- [ ] `P1` Additional civs with likely first-class accounting axes (triage pass)
  - Candidate examples from docs: `mac` (silver economy), `sen` (Farmhouse dual-role economy/pop), `tug` (governor state), plus free-call-in families (e.g., English/Lancaster, Mongol Khaganate references).
  - Why: mechanics research identifies multiple non-baseline value channels.
  - Source: `MECHANICS_RESEARCH.md` (High-impact examples + civ sections).

## P1 — Core Model Fidelity

- [ ] `P0` Finish and stabilize significant-resource-loss event wiring
  - Fix current verification failures around `significantResourceLossEvents` so the event data is present on `GameAnalysis` and rendered hover points include the selected significant raid/destruction event.
  - Re-run the full root test suite and keep unit, integration, and e2e output pristine.
  - Current failing evidence: `__tests__/integration/postMatchView.integration.test.ts` expects `analysis.significantResourceLossEvents`, and `__tests__/e2e/postMatchRender.test.ts` expects a worker-death hover point to include `significantEvent`.
  - Why: this is active dirty-work functionality and the project test policy requires failures to be fixed at the root before claiming the branch is healthy.
  - Source: `npm test` verification on 2026-04-30.

- [ ] `P0` Villager-opportunity cap parity with product rule (120-villager target OR 200-pop cap)
  - Implement "stop expected villager growth if player reaches 120 villagers OR is population-capped at 200" exactly as agreed.
  - Why: current model enforces the 120 target cap but does not yet stop at 200-pop cap.
  - Source: user-approved villager-opportunity defaults and follow-up clarifications.

- [ ] `P0` Villager-opportunity civ gather-rate correctness sweep
  - Add missing civ gather modifiers that directly change villager resource throughput (not static/non-villager income).
  - Highest-confidence next adds from current data: Abbasid/Ayyubid Golden Age gather boosts, Chinese Ancient Techniques dynasty gather boost, Ottoman Anatolian Hills mining speed.
  - Why: these directly affect expected-villager-rate RPM and therefore underproduction/death loss curves.
  - Source: AoE4World static civ/tech text audit against current implementation.

- [ ] `P1` Villager-opportunity econ upgrade key coverage hardening
  - Replace loose token matching with explicit normalized mapping for econ upgrades and civ-specific suffix variants.
  - Include keys seen in sampled games plus static-data aliases (e.g., hunting gear variants, Jpn/Mon suffix forms).
  - Why: avoids silent misses and keeps modifier application deterministic across civs/patches.
  - Source: sampled action-key inventory from reference games + static-data technologies.

- [ ] `P1` Villager-opportunity positional aura/runtime-state modeling
  - Add optional modeled uptime for aura-based villager gather modifiers (for example Aachen inspiration zones, Granary/Cistern-style local boosts, Campfire/Matsuri style proximity boosts).
  - Why: these can materially change effective villager gather rate but are currently not represented in expected RPM.
  - Source: civ-mechanics text audit (building/ability descriptions with gather-rate effects).

- [ ] `P1` Villager-opportunity advanced civ-resource channels policy
  - Define explicit inclusion/exclusion policy for civ-specific hybrid channels tied to villager actions (drop-off bonuses, extra-resource conversion, alternative worker types).
  - Why: keeps "villager opportunity cost" interpretable and prevents accidental mixing with static/non-villager income channels.
  - Source: civ audit findings (for example Byzantine olive-oil coupling, Tughlaq/other hybrid drop-off mechanics, civ-specific worker variants).

- [ ] `P1` Upgrade combat model from heuristic class matrix to weapon/armor-based approximation
  - Use unit weapon damage/speed/modifiers and armor data.
  - Why: current limitation called out; important for adjusted military confidence.
  - Source: `NOTES.md` (Current limitations + Suggested slices).

- [ ] `P1` Reintroduce web adjusted-military series behind an explicit need
  - Current web MVP report generation intentionally passes `includeCombatAdjustedMilitary: false` because the shipped front-end does not render adjusted-military fields.
  - If adjusted military returns to the web UI, add a narrower route/surface contract first, then downsample or lazy-load the expensive series instead of rebuilding it for every MVP report request.
  - Why: deployed measurements on 2026-05-03 showed `buildCombatAdjustedSeries()` as the largest report-generation bottleneck.
  - Source: web performance pass on `aoe4-game-analyzer-web.vercel.app`.

- [ ] `P1` Add stronger upgrade/age timing windows in clash interpretation
  - Explicitly model pre-upgrade vs upgraded fight windows.
  - Why: directly impacts "equal value but losing fights" cases.
  - Source: `NOTES.md` (Proposed model, section C).

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

- [ ] `P1` Divergence attribution scoring
  - Better identify where the trajectory split starts (allocation/timing/destruction/civ effect).
  - Why: currently under-specified.
  - Source: `NOTES.md` (Current model limitations).

- [ ] `P1` Add permanent/consumed spend as a Hover Inspector line item
  - Show permanent/consumed spend as accounting context in the Hover Inspector, without adding a dedicated chart.
  - Keep tech and age investments in the deployed/allocation model; this deferred line should cover separate consumed-resource cases such as repairs, market exchange friction, canceled or queued edge cases, and paid one-time or temporary effects.
  - Why: these costs are not current deployed assets, opponent-destroyed value, or float, but can explain ledger gaps.
  - Source: user accounting discussion.

- [ ] `P1` Idle worker/idle production proxy metrics
  - Villager idle and production idle inferred from available telemetry.
  - Why: explicit open item and key macro signal.
  - Source: `DEFERRED.md`, `NOTES.md` (open discussion/data availability).

- [ ] `P1` Shared cross-civ axes lock-in
  - Finalize common comparison axes and confidence policy.
  - Why: necessary to keep cross-civ comparisons honest and consistent.
  - Source: `NOTES.md` (open discussion items).

## P1 — Win Probability / Corpus Research

- [ ] `P1` Win-probability / decisive-ahead research with AoE4World-approved corpus access
  - Preserve the current position: do not bulk-fetch AoE4World game summaries before coordination.
  - After the article and public tool launch, reach out to AoE4World for bulk or integration access to game summaries.
  - First modeling scope should be Diamond RM 1v1, using a conservative decisive-ahead classifier with abstention rather than full probability calibration.
  - Target question: "Is either player decisively ahead, roughly 75%+ to convert historically, or should the system abstain?"
  - Use public dumps only for candidate sizing and filtering until summary access is approved.
  - Source: `features/win_probability/PLAN.md`.

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

- [ ] `P2` Add ranked decisive-cause statement and coaching recommendations
  - Gate on confidence and model trustworthiness.
  - Source: `DEFERRED.md`, `NOTES.md` (descriptive-first posture).

- [ ] `P2` Add AI Explanation widget
  - Generate a lazy, prose-only whole-game explanation from the existing post-match data, with the evidence-first quality target captured in the feature plan.
  - Reuse the plan in `features/ai_explanation/PLAN.md` before implementation, including its evidence packet, prompt, API route, UI, and test strategy.
  - Source: `/Users/coding/Projects/aoe4-game-analyzer/features/ai_explanation/PLAN.md`.

## P1 — API / Data Reliability

- [ ] `P1` Reduce load on summary endpoint (`/players/:id/games/:id/summary`)
  - Add stronger cache/backoff/retry guardrails and avoid high-volume probing paths.
  - Why: endpoint is CPU-expensive and rate-limits (`429`).
  - Source: `AOE4WORLD_API_FINDINGS.md`.

- [ ] `P1` Keep parsers resilient to docs-vs-live drift
  - Preserve tolerant parsing for nullable fields and shape variants.
  - Source: `AOE4WORLD_API_FINDINGS.md`.

## Suggested Execution Order

1. `P0` civ correctness (Jeanne, Delhi, Ottoman, Chinese/Zhu Xi).
2. `P1` combat model fidelity (weapon/armor + timing windows + defensive context).
3. `P1` open civ/model gaps (Abbasid/Ayyubid, Byzantine, Mongol, additional civ triage).
4. `P1` telemetry/proxy and divergence scoring.
5. `P2` UX and product expansion.
