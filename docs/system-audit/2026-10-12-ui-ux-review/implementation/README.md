# Dashboard and owner overview — first implementation

12 October 2026. Local working-copy changes following the UI/UX audit. This implements the first dashboard/owner hierarchy slice, not the entire modernization backlog. No commit, deployment, database migration, seed, or business transaction was performed.

## Changes

- Dashboard: urgent actions and the evidence timeline now precede the cross-domain status grid and setup checklist. Existing refresh errors and critical alerts retain their precedence.
- Setup: a native keyboard-operable disclosure keeps completion progress visible. It starts expanded when progress is zero; returning workspaces can expand all eight existing steps. Existing destinations and permission behavior are unchanged.
- Owner: the existing Brief, Command, and Investigate controls now change the displayed content. Brief contains priority actions, risks, changes, and session acknowledgement. Command contains the existing action queue, control strips, and metric cards. Investigate contains business-truth zones, proof subjects, module state, and the trust legend.
- Removed the second owner page heading and repeated brief-proof conclusion. Organization, period, read-only status, and the proof drawer remain available across modes. Redaction/module-request counts remain available in Investigate.
- Clarified summary counts as actions versus indicators, without changing their server-provided values. Removed the arbitrary 72%/18% bars. Stale and blocked indicators remain visible in every mode.
- Passed locale to the existing BI header, mode controls, priority board, radar, change strip, proof host, and trust legend. Localized the previously literal control-strip and module-stat labels.
- Passed pending and error state to the common proof host so loading/error recovery remains available when switching views. Acknowledgement remains local to the session and does not certify any business state.

## Owned application files

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx`

These files had no pre-existing diff at the start of this slice. Other working-tree changes were preserved. Baseline HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`. No service, action, authorization, tenant, financial, or global token contract was changed.

## Design and source evidence

Read the ECC workflow, command registry/test lanes, design master, constitution, component registry, current shared primitives, tokens, and existing component tests. There is no dedicated dashboard/owner page override in the master; the global authenticated contract governs this slice. Used project UI Styling and UI/UX Pro Max guidance without regenerating the design system.

Graph discovery: `dashboard_enhancedenterprisedashboard_tsx` (community 32) and `owner_war_room_ownerwarroomdashboard_tsx` (community 24). Current source takes precedence over the dated graph.

The focused search `disclosure progressive information density` returned unrelated Color Only and Redundant Entry results and was rejected as disclosure guidance. `keyboard focus visible` returned Interaction / Focus States from `ux-guidelines.csv`; this framework-independent guidance informed the visible focus treatment. Skill release version remains unverified. Native disclosure and mode separation are scoped design judgments supported by the audit.

## Verification

| Evidence class | Executed check | Result |
|---|---|---|
| Workflow | `npm run agent:workflow:check` after inspecting runner/registry/lifecycle | Passed; 198 other scripts remain unclassified |
| Mocked component | `node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/implementation/jest.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/implementation/jest-results.json` | 1 suite, 3 tests passed; mode separation, acknowledgement retention, proof failure across modes, French controls and permission-limited feedback |
| Syntax | Installed TypeScript `transpileModule`, three owned TSX files | No diagnostics; see `syntax-results.json`. This is not a whole-project semantic typecheck |
| Diff | `git diff --check` limited to owned application files | Passed |
| Real database | None | Not run; no persistence logic changed |
| Build/release | None | Not run; package build includes migrations |

The isolated Jest config uses the installed Next/SWC transformer without loading Next config or application environment files. The inspected setup and test mock persistence and the proof action. It writes only the requested result artifact. An initial run with an overly broad filesystem search was cancelled; limiting the runner's roots to the owner component tests completed successfully. No application gate or registry hash was altered to obtain a pass.

## Rendered checks

All checks used the existing SUPER_ADMIN session at `http://localhost:3000`. No business action or permission change was submitted. Browser transport intermittently timed out, and its session changed during verification; results below are actual observations, not inferred coverage.

| Route / locale | Measured viewport | State and outcome |
|---|---|---|
| `/en/dashboard/owner-war-room` | 1851×890 | Populated, stale/blocked. Brief shows one content h1, actions, risks and changes. Command click exposes control strips/queue/cards; Investigate Enter exposes zones/proof/module state and retains focus on the control. Default document height measured 2767px versus audit baseline 5513px at 1851×891; live data and near-identical viewport are not a controlled performance benchmark |
| `/en/dashboard/owner-war-room` | 390×845 | Narrow DOM observation: document/main width 367px, no page overflow. Screenshot capture timed out; not a full mobile visual or accessibility pass |
| `/en/dashboard` | 1381×688 | Populated, setup 6/7 ready. Final source order confirmed: header → urgent queue/evidence → status → collapsed setup. Queue heading measured at y=474 from page top. Enter opens eight setup steps and retains focus on SUMMARY; collapsed state and visible focus ring also observed |
| `/fr/dashboard` | 1381×688 | French task headings and setup summary rendered; urgent queue precedes status |
| `/fr/dashboard` | 347×751 | DOM check: setup opened by Enter; document width 326px. All eight setup links retain `/fr/`. Screenshot file contains a blank canvas and was rejected as visual evidence; narrow visual verification remains open |
| `/fr/dashboard/owner-war-room` | 1381×688 | Synthèse/Pilotage/Examiner controls rendered. Enter on Examiner displays evidence sections and retains focus; see `owner-fr-investigate.json` |
| `/en/dashboard/owner-war-room` final capture | 1707×723 | Brief and final action/indicator labels rendered; saved as `owner-en.png` |

Temporary viewport overrides were reset; a subsequent desktop check measured 1381×688. Screenshot files are local evidence, not public uploads. The verified desktop dashboard screenshot is `dashboard-en-top.png`; the collapsed checklist is in `dashboard-en.png`. The blank `dashboard-fr-narrow-setup.png` is retained only as a failed capture, not proof of the narrow layout. A visible focus ring was observed during the desktop keyboard check in the tool screenshot.

## Remaining work and release limits

- Other role accounts and first-use/fully-complete setup browser fixtures remain unverified. No role-access or accessibility certification is implied.
- Full EN/FR narrative localization is unfinished: server-supplied owner title, summaries, zone labels, and some dashboard evidence remain English. This slice fixes locale propagation and selected component labels only.
- Global headers, technical diagnostic density, scope-preserving navigation, invalid action destinations, POS redesign, and additional brand cleanup remain separate backlog items.
- The owner brief still has a substantial evidence header. The audit target of three complete actions above the fold at 1440×900 has not been established. No task-time, retention, referral, or network-effect improvement has been measured.
- No full semantic typecheck, production build, screen-reader session, contrast audit, or real transaction test ran.

Rollback is the inverse of the three owned application-file diffs. Preserve unrelated local changes; do not reset the whole working tree. The next bounded slice should compact the evidence header while retaining visible uncertainty, then fix localized action-to-record handoffs and validate daily operator accounts.
