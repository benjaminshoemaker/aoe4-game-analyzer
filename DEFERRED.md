# Deferred Requirements

> Captured during specification Q&A. Review when planning future versions.
> Canonical prioritized backlog now lives in `NEXT_STEPS.md`.

## From FEATURE_SPEC.md: resource_flowchart (2026-04-23)

| Requirement | Reason | Notes |
|-------------|--------|-------|
| Rank the most dramatic failure or advantage in the match. | V2 | V1 should show evidence first before classifying the decisive cause. |
| Add an interactive public web interface. | Separate feature | V1 is CLI-first with static human-readable report output. |
| Allow users to edit or choose slice boundaries. | V2 | V1 should generate slice boundaries from game data automatically. |
| Add richer Sankey/alluvial visualizations. | V2 | V1 can use compact HTML/Markdown flow sections and tables. |
| Add coaching recommendations. | V2 | Recommendations should wait until the evidence model is trustworthy. |
| Compute exact per-civ resource attribution for every discount, free-spawn, aura, and production modifier mechanic. | V2 | V1 should show observed/reference values with confidence notes instead of over-claiming exact hidden mechanic accounting. |

## From post-match analysis implementation brief (2026-04-24)

- [ ] Evaluate whether pool band stacking order should be `Permanent -> Economic -> Military capacity -> Military active -> Defensive` instead of Economic-bottom-first.
- [ ] Add Abbasid/Ayyubid wing-choice detection and decide whether wing choice should branch pool classification logic.
- [ ] Verify whether villager idle time is directly retrievable from AoE4World summary API, or if it requires proxy estimation (e.g. gather-rate vs villager-count variance).
- [ ] Evaluate replacing categorical bet-shape labels with a continuous 2D classification (`economic-axis x military-axis`).
- [ ] Evaluate rendering civ-overlay contribution as an in-band annotation (economic/military-active) rather than event-card-only.
