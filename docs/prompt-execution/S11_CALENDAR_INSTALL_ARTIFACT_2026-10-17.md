# Calendar compatibility and standalone release verification — 17 October 2026

This follow-up addresses the installation and artifact gaps in [the S06–S12 local assessment](S06-S12_LOCAL_GATES_2026-10-16.md). Production remains unapproved. No deployment, schema promotion, production database, provider or live messaging is part of this work.

**Outcome:** the React/calendar compatibility change, 72-case browser matrix, normal clean locked installation, full application build and copied standalone functional smoke passed for the recorded frozen Windows candidate. The external/business gates below remain open.

Evidence directory: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/15/01a13f31-93ec-7490-80f9-5a777fb1150d/calendar-release`.

## Changes and rationale

- Pin `react-day-picker` to **8.10.2**. Its official React peer range includes React 19 and retains the existing date-fns range. The [upstream release](https://github.com/gpbl/react-day-picker/releases/tag/v8.10.2) describes this as a compatibility patch for the maintenance-mode v8 line. A major calendar migration is not required for this fix.
- The registry tarball matches its published SHA-512 integrity. Its executable `dist` JavaScript and CSS match the installed 8.10.1 bytes; declaration and source-map files differ. The existing calendar wrapper, date/range selectors, locale handling and visual tokens are retained.
- Strict resolution exposed another blocker: `react-tailwindcss-select@1.8.5` requires React 18. Current-source search found no callers of its `FormSelectInput` wrapper. Remove that unused wrapper, the two table headers' unrendered status/date-filter scaffolding and the package-specific Tailwind scan path, then remove the dependency. Active select controls remain on existing Radix components. This removal is necessary to resolve the observed install conflict, not a broader table refactor.
- Generate the lockfile through npm without `--force` or `--legacy-peer-deps`. The only changed version among existing packages is DayPicker. npm also adds 85 previously missing peer packages and updates dependency classification flags; these include the Express and Webpack peer trees. The original package scripts, overrides and unrelated package versions are preserved.
- Add a reusable local calendar browser fixture and a narrow runner for existing table-import regressions. Fixtures use synthetic input and no backend actions. They do not certify a business workflow or server authorization.
- Add `"root": true` to `.eslintrc.json` after the physical clean-install build reproduced an ancestor-plugin conflict. This establishes the project boundary without changing its lint rules, as described in the [ESLint v8 configuration documentation](https://eslint.org/docs/v8.x/use/configure/configuration-files#cascading-and-hierarchy).

The dated component graph identifies the old wrapper as `forminputs_formselectinput_tsx`, community 217. Current source search, not the graph's August snapshot, establishes the absence of active callers. Original bytes of all changed existing files are retained in `dependency-baseline.json`, `select-baseline.json` and `eslint-before.json`.

## Verification scope

| Evidence class | Scope | Result |
| --- | --- | --- |
| Source / package inspection | Official peer declarations, verified tarball, version-preserving lock diff, absent wrapper callers | Passed |
| Workflow contract | Read-only command registry and reference validation | Passed; 196 scripts remain unclassified |
| Scoped lint | Calendar fixture and the two edited table headers | Passed with `--quiet`; no ESLint errors |
| Candidate-local lint after isolation fix | Same fixture/headers plus Calendar, using the clean candidate's own ESLint/plugins | Passed with `--quiet`; ancestor-plugin conflict resolved without disabling rules |
| Existing mocked component tests | Both table headers' spreadsheet preview/save failure and success gates | 4 passed (`table-unit.json`); persistence and spreadsheet parsing are mocked |
| Rendered browsers | Actual Calendar, DatePicker, DateRangePicker, TableDateRangePicker and DateFilter; EN/FR route contexts, 390/1280 px, Chromium/Firefox/WebKit | 72 passed (`browser-verified/browser.json`); frozen source and explicit Custom Range trigger flow |
| Strict clean installation | New physical dependency tree, normal npm peer resolution, install scripts enabled, package/lock hashes checked | Passed: 1,337 packages, exit 0, completion markers and unchanged hashes (`d5f0032cb8-install.json`); existing warnings remain |
| Installed dependency identity / Prisma client | React 19.2.6, DayPicker 8.10.2, Next 15.5.27 and Prisma 6.19.3; generated schema must match frozen source | Passed (`d5f0032cb8-post-generation-verification.json`): generated schema exactly matches Prisma's canonical formatting of a disposable source copy; original source unchanged |
| Full application compiler | Exact derived frozen source and its generated Prisma client; configured lint/type checks enabled | Passed (`0342c78b9c-build.json`, exit 0); existing lint warnings and synthetic unavailable-database health-check errors retained |
| Sealed standalone artifact | Complete runtime dependencies, source binding, regular files and content manifest | Passed: 6,458 files; build `BMfr3oEjiFvFbtVeanb1I`; manifest SHA-256 `9786eeb8a7bc7d88ceb984e256dc008ea230034edfaa07b53d1c241744af1ce8` |
| Copied standalone runtime | Verify manifest/bytes, copy outside repository ancestors, then check login HTML and static asset on loopback | Passed (`0342c78b9c-cold-response-runtime.json`): login HTTP 200 with email/password inputs; static HTTP 200 with exact sealed SHA-256 |

The calendar matrix checks disabled dates, keyboard single selection and deselection, cross-month range selection, controlled date-only values, popover close/focus return, and preset/custom filter boundaries. Generic DatePicker/DateFilter currently use English copy; a French route context does not falsely establish French localization for those consumers. The table picker and direct Calendar receive the existing French locale explicitly. Automated keyboard and responsive checks do not replace assistive-technology or operator acceptance.

Retained diagnostic attempts are not counted as passes. The first fixture build exceeded its allowance; the resumed build completed. An initial Chromium run passed five cases before exposing an existing DateFilter interaction: choosing Custom Range leaves its separate date-range trigger closed. The final matrix exercises that visible trigger explicitly; automatic opening is not certified or repaired here. A later reuse attempt correctly refused a concurrently changed shared stylesheet. The browser rerun therefore checks the compiled fixture against the original frozen candidate's source hashes. The selected French mobile cross-month range screenshot was visually inspected; that spot check is not whole-application visual acceptance.

The first physical installation did not complete within its original supervision window. A supervision handoff reported exit zero, but independent completion checks found no Next package, installed lockfile or npm success message. The raw result is retained as `94adfb9e12-install-supervised-raw.json`; the authoritative `94adfb9e12-install-supervised.json` explicitly invalidates it. No build may use that partial dependency tree as a clean-install pass. The replacement installer requires successful exit, npm completion output, an installed lockfile, Next's package manifest, and unchanged package/lock hashes.

UI/UX Pro Max focused search: `calendar keyboard navigation focus date selection`, domain `ux`, source `ux-guidelines.csv`. Relevant categories were keyboard navigation, date formatting and focus states. Existing Next 15/Tailwind 3 contracts govern implementation; no new visual system was generated.

Initial frozen source cohort: `full-app-94adfb9e12`, HEAD `b044764248f1ac47705371c235c2ba273dd973a7`, 6,186 source files and 98 SQL migrations. It includes working-tree edits; HEAD alone is not the source identity. Original source bytes are retained in `94adfb9e12-source.json.gz` and `94adfb9e12-build-source.json`. Final build/runtime verification uses `full-app-d5f0032cb8` with the derived lint-boundary revision described below. Later shared-tree changes require their own verification.

Installation uses a new disposable directory, no project install hooks, explicit empty npm credential configuration, and an environment whitelist. Network access is limited to public npm/Prisma engine hosts and loopback. Database settings point to an unreachable loopback port. Build/runtime checks block non-loopback application traffic. Shared `node_modules` is not replaced.

The replacement clean-install candidate is `full-app-d5f0032cb8`, restored from `94adfb9e12-source.json.gz`. Its source archive and installation records use the `d5f0032cb8-` prefix. The install command is ordinary `npm ci --no-audit --fund=false --foreground-scripts` with explicit local npm configuration/log paths; there is no `--force`, `--legacy-peer-deps` or `--ignore-scripts` bypass. “Strict” here means the normal CI resolver, not a claim that npm's separate `--strict-peer-deps` option was enabled. Existing optional-peer and package-deprecation warnings are retained; this work is not a fresh dependency vulnerability audit.

Environment: Node **22.17.0**, npm **10.9.2**, Windows x64. Installation added 1,337 packages from 10:01:44 to 10:17:29 UTC. Explicit candidate-local Prisma generation subsequently exited zero. The initial raw-byte schema assertion was too strict: Prisma normalizes formatting and attribute order, so a mismatch alone did not establish a stale postinstall client. The original failed assertion remains in `d5f0032cb8-generate.json`; `d5f0032cb8-schema-equivalence.json` proves the generated schema equals an independently formatted disposable copy, byte for byte. The source schema, shared generated client and all databases were left unchanged.

The retained initial build log contains a webpack warning about `next-intl`'s dynamic `import(t)` and cache invalidation analysis. The first build started with fresh output; the lint-boundary retry retained that candidate's own compiler cache. This does not qualify general incremental-cache correctness; representative cache behavior remains an S07 gate. Build-time health-check errors refer to the deliberately unreachable synthetic database at `127.0.0.1:1`; they provide no database-availability or external-alert evidence.

The initial full build (`1b0d55ab5d-build.json`) compiled application JavaScript successfully, then exposed duplicate ESLint plugin instances inherited from the parent checkout. That owned build was stopped and retained as a failed attempt; it is not a full compiler/lint/type pass. The single lint-boundary fix is recorded in `d5f0032cb8-lint-boundary.json`. The final source revision is `d5f0032cb8-lint-root-source.json.gz`; the original archive and original build-source manifest remain retained. Every other frozen source byte, package/lock input and lifecycle script is unchanged. The successful clean install therefore remains applicable; lint and full build verification are repeated for the changed configuration.

The first copied-runtime attempt (`0342c78b9c-runtime.json`) passed artifact/source/copy byte checks and received login HTTP 200, then its five-second request signal aborted while reading the body. Its server log shows normal startup and no application error. The failed result and original helper are retained. The fresh-copy retry uses bounded 60-second login-body and 30-second static-asset timeouts, records observed durations, and also requires the email/password inputs in the HTML. These are functional test allowances, not business-approved latency objectives.

The retry passed from `C:/Users/JCOMPU~1/AppData/Local/Temp/stoquify-full-artifact-qzoLgj`, outside repository ancestors. The complete login response was 408,937 bytes and took **9,123 ms**; the verified static asset took **13 ms**. These observations do not qualify startup/load performance or authenticated workflows. The owned temporary server was stopped after the checks. `verification-summary.json` binds the successful results to the final source revision and artifact; `evidence-index.json` inventories retained evidence, including failures. Neither file is a signed release approval. Later changes in the shared tree, including the observed stylesheet change, require their own release-candidate verification.

## Reproduction entry points

Inspect these scripts and the command registry before running them. Each attempt needs a new evidence output so failed runs remain available.

- `jest.calendar-compat.config.cjs`: narrow mocked table-import regressions, without loading application configuration.
- `scripts/verify-calendar-browser.cjs`: local synthetic fixture, verified DayPicker package alias and three-engine interaction matrix. Frozen-source reuse requires the existing compiled fixture and matching source hashes.
- Evidence helper `strict-candidate.cjs`: restore the retained source archive into a new directory and run normal locked installation with lifecycle scripts enabled.
- Evidence helper `verify-installed-candidate.cjs`: validate completion evidence, physical dependency layout, package versions, matching generated Prisma schema and unchanged build helpers.
- `scripts/verify-local-gates-build.cjs`: compile the installed frozen candidate and seal its standalone output. This does not execute schema promotion.
- Evidence helper `verify-full-runtime.cjs`: verify artifact bytes, copy outside repository ancestors, and check login HTML/static asset responses on loopback.

## Remaining gates

- **Dependency warning:** npm reports the pre-existing optional Better Call/Zod peer mismatch under the existing override. The React compatibility fix does not qualify all auth/schema integrations or silently migrate the application's Zod major.
- **Maintenance warnings:** existing build lint warnings and package deprecation notices remain. The scoped cleanup does not establish a warning-free codebase or a completed dependency-security audit.
- **S06:** trusted ingress/header overwrite, origin isolation, shared rate limiting, observed till/NAT traffic and an approved outage policy.
- **S07:** authenticated full-application CSP journeys, supported-browser policy, representative render/cache measurements and activation approval.
- **S08/S09:** real operator and assistive-technology acceptance, task/error targets, independent review and demonstrated maintenance benefit.
- **S10:** hosted load/startup/reconnect/recovery acceptance. Earlier stress p95 remains 288.62 ms against the provisional 250 ms target; local calendar work does not close it.
- **S11:** exact release-candidate review, previous-application compatibility, immutable artifact custody, protected release controls, target-platform build/runtime, hosted health and promotion/rollback qualification. Local Windows verification does not qualify a different deployment platform or production configuration. The earlier database rehearsal covered 97 migrations; this candidate's additional `20261016230000_balance_sheet_evidence` migration is not covered by that earlier pass.
- **S12:** approved RPO/RTO and named incident/recovery owners remain unassigned, as confirmed by the user. PITR, real alert/receiver receipts and the legacy assurance-key stop/drain/mapping decision remain open.

No local pass authorizes production rollout. Rollback is limited to this task's dependency, unused-reference and lint-boundary hunks, plus its added verification files; restoring the old dependency set also restores the reproduced install conflicts. Do not revert unrelated commits or migrations.
