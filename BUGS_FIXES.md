# Bugs / Fixes

Last updated: 2026-05-03 (America/Los_Angeles)

This file tracks correctness fixes, bug work, API reliability work, and civ-specific accounting gaps moved out of `NEXT_STEPS.md` so the next-steps file can stay feature-focused.

Priority levels:
- `P0`: correctness-critical for current or trusted output
- `P1`: important reliability/model fixes
- `P2`: lower-priority cleanup or hardening

## P0 — Existing Metric Correctness

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

- [ ] `P1` Permanent/consumed spend accounting gap
  - Show permanent/consumed spend as accounting context in the Hover Inspector, without adding a dedicated chart.
  - Keep tech and age investments in the deployed/allocation model; this deferred line should cover separate consumed-resource cases such as repairs, market exchange friction, canceled or queued edge cases, and paid one-time or temporary effects.
  - Why: these costs are not current deployed assets, opponent-destroyed value, or float, but can explain ledger gaps.
  - Source: user accounting discussion.

## P0 — Civ-Specific Accounting Fixes

- [ ] `P0` Delhi time-as-resource model
  - Represent tech-time + scholar-gating as first-class state (not standard resource spend).
  - Keep this deferred, but keep it `P0` because Delhi can fundamentally distort trusted tech/resource accounting.
  - Why: explicitly deferred; breaks baseline spend assumptions.
  - Source: `NOTES.md` (Civ dispositions), `MECHANICS_RESEARCH.md` (`de` civ mechanics).

- [ ] `P1` Chinese/Zhu Xi state completeness
  - Keep Imperial Officials counted as economic units with their resource value.
  - Leave broader dynasty/tax/official-state treatment as `P1` refinement rather than `P0`.
  - Why: current baseline handling is sufficient for trusted output; deeper state modeling can improve accuracy later.
  - Source: user clarification; `NOTES.md` (Civ dispositions + open items), `MECHANICS_RESEARCH.md` (`ch`, `zx`).

- [ ] `P1` Byzantine olive-oil and mercenary integration details
  - Keep olive oil as explicit resource axis and improve mercenary value-timing treatment.
  - Why: alternative-currency civ with nonstandard military entry paths.
  - Source: `NOTES.md` (Civ dispositions), `MECHANICS_RESEARCH.md` (`by`).

- [ ] `P1` Abbasid/Ayyubid wing-choice modeling
  - Detect selected wing paths and decide whether they branch classification/valuation.
  - Why: explicitly open in current notes/deferred backlog.
  - Source: `DEFERRED.md`, `NOTES.md` (open discussion items).

- [ ] `P1` Mongol mobile/packed state decision
  - Decide whether packed-building mobility stays de-prioritized or becomes first-class axis.
  - Why: civ divergence acknowledged but currently simplified.
  - Source: `NOTES.md` (Civ dispositions).

- [ ] `P1` Additional civs with likely first-class accounting axes (triage pass)
  - Candidate examples from docs: `mac` (silver economy), `sen` (Farmhouse dual-role economy/pop), `tug` (governor state), plus free-call-in families (e.g., English/Lancaster, Mongol Khaganate references).
  - Why: mechanics research identifies multiple non-baseline value channels.
  - Source: `MECHANICS_RESEARCH.md` (High-impact examples + civ sections).

## P1 — API / Data Reliability

- [ ] `P1` Keep parsers resilient to docs-vs-live drift
  - Preserve tolerant parsing for nullable fields and shape variants.
  - Source: `AOE4WORLD_API_FINDINGS.md`.

- [ ] `P1` Reduce load on summary endpoint (`/players/:id/games/:id/summary`)
  - Add stronger cache/backoff/retry guardrails and avoid high-volume probing paths.
  - Why: endpoint is CPU-expensive and rate-limits (`429`).
  - Source: `AOE4WORLD_API_FINDINGS.md`.
