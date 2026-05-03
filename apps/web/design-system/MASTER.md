# AoE4 Web Design System

## Direction

This app uses a Data & Analysis direction blended with Precision & Density.

The report should feel like a serious post-match analysis workspace: compact,
chart-first, and readable during repeated review. Medieval texture can appear in
the warm entry surface, but report pages should prioritize clear data hierarchy
over theme decoration.

## Tokens

- Tokens live in `design-system/tokens.css`.
- Global app styles import those tokens from `src/app/globals.css`.
- Use the `--aoe-*` namespace for reusable colors, radii, spacing, shadows, and fonts.
- Raw HTML surfaces that bypass the React CSS pipeline must embed the canonical
  token declarations and map any local aliases back to `--aoe-*` tokens.
- Report tokens use `--aoe-color-report-*` for the compact analysis workspace:
  background, surface, muted text, borders, chart background, control states,
  focus, and link treatment.
- Player perspective colors remain semantic data colors. Use `--aoe-color-you`
  and `--aoe-color-opponent` for defaults, but generated reports may override
  local player variables when the perspective player is not player 1.

## Component Rules

- Use 4px-based spacing: 4, 8, 12, 16, 24.
- Use 8px radius for controls and compact cards, 10px only for top-level panels.
- Use borders plus a single subtle panel shadow. Do not mix in heavy elevation.
- Use blue for the perspective player and orange-red for the opponent.
- Do not use color alone for player identity; pair color with text labels, dash styles,
  or direct annotations.
- Data values should use tabular numerals where practical.

## Accessibility Rules

- Every form control has a persistent label.
- Interactive chart state must have a non-pointer access path.
- Focus rings stay visible on all links, controls, and scrollable data regions.
- Response payload changes must preserve the selected timestamp URL contract.
