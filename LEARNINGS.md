# Session Learnings

> Persistent knowledge extracted from AI coding sessions.
> Captures decisions, context, action items, and insights that should survive between sessions.
> Add entries with `/capture-session` (full sweep) or `/capture-learning` (single item).

## Decisions

- **[2026-05-01]** Use `apps/web` as the standalone Vercel web app boundary. The root/static report remains the staging/reference area, and the deployable app should copy needed logic rather than directly importing root analyzer runtime code. *(source: conversation)*
- **[2026-05-01]** Replace separate "Deployed resource pool over time" and "Strategic allocation state" sections with one "Allocation lead and mix over time" widget because it captures the same strategic signal more simply. *(source: conversation)*
- **[2026-05-01]** Remap deployed-resource bands into larger categories: Economic, Technology, Military, and Other, so the widget is easier to scan while preserving band-level inspector detail. *(source: conversation)*
- **[2026-05-01]** Allocation category mapping is: Economic band to Economic; population cap to Other; military buildings, military active, and defensive to Military; research and advancement to Technology. *(source: conversation)*
- **[2026-05-01]** Allocation charts use mixed encoding: Economic, Technology, and Military show percentage share, while Overall shows absolute deployed resource value. Share is best for strategic mix; Overall should preserve total deployed-resource scale. *(source: conversation)*
- **[2026-05-01]** Hover inspector keeps original band rows and composition behavior, with added collapsible category headers, preserving detail access while reducing visual overload. *(source: conversation)*
- **[2026-05-01]** Vercel production project is named `aoe4-game-analyzer-web`, with explicit `apps/web/vercel.json` to force Next.js deployment config because the first project config defaulted to static output and failed deployment. *(source: conversation)*

## Action Items

- [ ] **[2026-05-01]** Resolve `npm audit` findings for `next`/`postcss`; current fix path suggests a breaking Next 16 upgrade. — Owner: project maintainer
- [ ] **[2026-05-01]** Decide whether to delete the empty Vercel project named `web`; user said "never mind," so it remains. — Owner: user
- [ ] **[2026-05-01]** Commit and push the deployment config addition `apps/web/vercel.json` and any current web/static changes. — Owner: project maintainer
- [ ] **[2026-05-01]** Consider adding caching for AoE4World/API fetches in `apps/web`. — Owner: project maintainer
- [ ] **[2026-05-01]** Consider setting Vercel project settings explicitly in dashboard/API for framework/Node version instead of relying only on `vercel.json`. — Owner: project maintainer

## Context

- **[2026-05-01]** Production app URL is `https://aoe4-game-analyzer-web.vercel.app`. *(source: conversation)*
- **[2026-05-01]** Vercel account/scope used for deployment is `benshoemakerxyz-3472s-projects`. *(source: conversation)*
- **[2026-05-01]** `vercel project add` created `aoe4-game-analyzer-web` with "Other" framework/static output defaults; adding `apps/web/vercel.json` made production deployment work. *(source: conversation)*
- **[2026-05-01]** `vercel ls --yes` unexpectedly auto-linked/created local Vercel metadata and an empty project named `web`. *(source: conversation)*
- **[2026-05-01]** `apps/web/.gitignore` now includes `.vercel` and `.env*.local`; Vercel link created local ignored `.vercel` metadata and `.env.local`. *(source: conversation)*
- **[2026-05-01]** Production home page was smoke-tested with `curl` and returned `200`; private `sig` match route was not production-smoke-tested to avoid transmitting a private sig without explicit confirmation. *(source: conversation)*

## Bugs & Issues

- **[2026-05-01]** Vercel first production deployment failed with "No Output Directory named `public` found" because the project used static output defaults. Fixed by adding `apps/web/vercel.json`. *(source: conversation)*
- **[2026-05-01]** Running `npm --prefix apps/web run verify` concurrently with `npm --prefix apps/web run build` can race on `.next/types` and cause TS6053 missing-file errors. Fixed operationally by running them serially. *(source: conversation)*
- **[2026-05-01]** Allocation UI had text overlap/sprawl and too-small inspector/table text. Fixed with collapsed guide/secondary panels, larger type, wider chart area, narrower inspector, and mobile chart scrolling. *(source: conversation)*
- **[2026-05-01]** Vercel install reports 2 audit findings: 1 moderate and 1 high. Status: open/deferred. *(source: conversation)*
- **[2026-05-01]** Empty Vercel project `web` has no deployments. Status: left in place after user canceled deletion. *(source: conversation)*

## Deferred Investigations

- **[2026-05-01]** Add web-app caching for AoE4World responses and static data. *(source: conversation)*
- **[2026-05-01]** Upgrade Next/PostCSS safely rather than using `npm audit fix --force` blindly. *(source: conversation)*
- **[2026-05-01]** Add a production-safe smoke test for a known public match route. *(source: conversation)*
- **[2026-05-01]** Clean up the empty `web` Vercel project if the user explicitly confirms deletion later. *(source: conversation)*
