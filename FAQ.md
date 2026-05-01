# FAQ

## Allocation And Resource Accounting

### What does Total Pool mean?

Total Pool is the current deployed resource pool after subtracting opponent-destroyed value:

`Economic + Technology + Military + Other - Destroyed = Total Pool`

The hover inspector shows that formula as a tooltip. Destroyed is shown separately so it is visible without being double-counted into Total Pool.

### What does "Float (not deployed)" mean?

Float means resources gathered but not yet committed into the game state. It answers: "How much value is still sitting in the player's bank rather than being converted into economy, technology, military, defensive assets, age progress, or already-lost deployed value?"

With the current caveats, the intended accounting is:

`Total Pool + Destroyed + Float ~= Gathered`

### Are tech and age-up costs counted as deployed?

Yes. This report treats technology and age investments as part of the deployed/allocation model because they are strategic commitments that permanently change the player's capabilities. They are not current units on the map, but they are still deployed value in the macro model.

### Does "destroyed" mean every asset that disappeared?

No. Destroyed means units or buildings assumed to have been destroyed by the other player. It should not automatically include cancellations, self-deletes, transformations, expired temporary effects, or other cases where an item is no longer present without clear opponent destruction.

### Does this report include permanent or consumed spend?

Not yet. A future Hover Inspector line item should account for permanent or consumed spend that is not already represented by tech/age deployed value, current deployed assets, opponent-destroyed value, or float.

Examples currently outside the report:

- Repairs: resources spent restoring a building are consumed into HP. If the building survives, it is not a new deployed asset; if later destroyed, the extra repaired value is hard to attribute cleanly.
- Market exchange loss / transaction friction: if a player converts resources inefficiently, the lost value is not deployed or destroyed.
- Cancelled or queued production edge cases: if resources are reserved/spent but the unit/building never appears, this needs separate handling depending on what AoE4World reports.
- One-time abilities or temporary/expired effects: if paid with resources and not represented as a durable unit/building.
