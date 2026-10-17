# P01 — Source baseline

Status: **PASS for P01 repository research and baseline capture only**. Run date: 13 October 2026. Baseline ID: **P01-20261013-1b64debb9d58b7fa**. Capture started 2026-10-13 07:20:06 UTC+01:00; UTC timestamps are retained in the machine evidence. User-facing offset follows the supplied client context.

## Exact checkout and limitations

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Branch: `codex/migration-control-plane-release-2026-08-29`.
- HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`.
- Initial Git inventory: **400 modified tracked files; 14,647 untracked files; 15,047 status entries; no staged diff**. Captured before creating P01 evidence.
- Of the untracked entries, 13,728 were under `what-next/`; 384 under `docs/`; 172 under `.agents/`; 158 under `services/`. The count includes evidence and other existing work, not merely unfinished application features.
- **Deployed release, live URL, deployment artifact hash, actual production database version and remote required-check state: UNKNOWN.** No external deployment system was queried.

The candidate identifier is HEAD **plus the current local working-tree evidence**, not HEAD alone. The retained inventory and hashes are a fixed observation, not a Git commit, copied checkout or byte-for-byte archive of every untracked file. Later prompts must verify relevant hashes and record source drift. A release owner still needs to select and freeze a deployable candidate before runtime qualification; this P01 baseline does not satisfy that release gate.

### Machine evidence

- [Baseline snapshot](evidence/BASELINE_SNAPSHOT.json): HEAD, branch, timestamps, counts, package versions, graph samples and tracked diff counts.
- [Complete Git dirty/untracked path inventory](evidence/WORKTREE_INVENTORY.json): status and filenames only, no file contents or credentials.
- [Tracked unstaged diff statistics](evidence/DIFF_STAT.txt) and [staged diff statistics](evidence/STAGED_DIFF_STAT.txt).
- [Initial source manifest](evidence/SOURCE_MANIFEST.json): 69 selected files, raw-byte and LF-normalized SHA-256, byte length and Git status.
- [Supplementary inspected-source manifest](evidence/SUPPLEMENTARY_SOURCE_MANIFEST.json): 12 additional report/UI/route files with capture timestamps.
- [Workflow check output](evidence/WORKFLOW_CHECK.json) and [final validation](evidence/VALIDATION.json).

The manifests cover selected instructions, roadmap/prompts, core services, country boundaries, workflow controls and inspected historical context. They are not a whole-repository content snapshot. Ignored files, environment values, customer data and secret stores were not inventoried by content. Package versions were read from metadata without importing application code.

## Declared, locked and installed versions

| Package | package.json declaration | Lockfile version | Installed package metadata |
|---|---|---|---|
| next | ^15.1.4 | 15.5.18 | 15.5.18 |
| react | ^19.1.1 | 19.2.6 | 19.2.6 |
| react-dom | ^19.1.1 | 19.2.6 | 19.2.6 |
| prisma | ^6.19.3 | 6.19.3 | 6.19.3 |
| @prisma/client | 6.19.3 | 6.19.3 | 6.19.3 |
| better-auth | ^1.6.14 | 1.6.14 | 1.6.14 |
| typescript | ^5 | 5.8.3 | 5.8.3 |
| tailwindcss | ^3.4.1 | 3.4.19 | 3.4.19 |

All eight installed metadata versions match their lock entries. Semver declarations differ intentionally from resolved versions. PostgreSQL is the datasource declared by [prisma/schema.prisma:59](../../../../prisma/schema.prisma); server version was not queried. The CI YAML defines PostgreSQL 16 and Node 20 jobs; these are configuration declarations, not proof of a successful run or the deployed runtime.

## Relevant existing changes to preserve

Inspected current diffs against HEAD:

- `package.json`: adds the three agent-workflow/ECC-pilot scripts, changes the Prisma declaration from exact to caret, and adds axe-core. `package-lock.json` has corresponding root metadata changes, including removal of the root hasInstallScript flag. These are pre-existing; P01 did not install or change dependencies.
- `.github/workflows/ci.yml`: adds the agent-workflow job and makes verification depend on it. A local YAML file is not evidence of remote enforcement or successful CI.
- `prisma/schema.prisma`: 84 added lines. Includes AccessRequest, PurchaseOrderAuthoringDraft and CloseEvidenceNotification structures, composite relationships/constraints and related fields. P01 did not apply or validate migrations; future setup, access, purchasing and close work must account for this pre-existing schema delta.
- Current dashboard Navbar/Sidebar and related language/mobile components contain work documented by the 12 October UI reports. Preserve it; do not restart a design-system or navigation rewrite under retention work.

Selected raw-byte fingerprints:

| File | Initial Git state | SHA-256 |
|---|---|---|
| `package.json` | ` M` | `cba97e47bc1b87d8a2ab7c6442775493683405b27c9b783268c25c33d0f08fd5` |
| `package-lock.json` | ` M` | `c435b7624ce87efdcf5abfa490e8b8c204e4626084311653fabc8c26a6d967c4` |
| `prisma/schema.prisma` | ` M` | `c2f637a999160da10d41737afdf3fbf17cc9a60471fefdc915938f4ebecef22e` |
| `.github/workflows/ci.yml` | ` M` | `4ec959f5a1dcc5d004e0bafc464217cc6dadb476fbeeaa77462599cfeb5219e9` |
| `services/pos/pos.service.ts` | `clean` | `f20894ce31eb92c9f99610102f768386a6a780e6ebc99239ee27b9632f972470` |
| `services/inventory/inventory-stock-event.service.ts` | ` M` | `98b1acd43cd596edd4be633d1edff6847dc7a4337ddaf03e93409d8da4b1f668` |
| `services/accounting/close-assurance-pack.service.ts` | ` M` | `d3131b5411dcb3628364cf239bbfd3f1fda22ec7f0a7fb0e3d8c1a21a5c63870` |
| `services/regulatory/country-packs/cameroon.ts` | `clean` | `3bcc16ecc6b7f8695102fdbd047cadb63fe4049ba6ea409466465aa17c3e4749` |
| `scripts/verify-agent-workflow-contract.js` | `??` | `cb86a260bf7bd5924e06cf9ba444cd07d3bab57832f76c8d12e31b7e4e61db29` |

`clean` means tracked and absent from the initial status inventory. `??` means pre-existing untracked. All other selected files and hashes remain in the manifests. A status of clean does not mean production-qualified.

## Graph freshness and source validation

Graph refresh record: [graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md:1](../../../../graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md), dated **9 August 2026**, 65 calendar days before this run. Read the service JSON, not stale visualization output. These node locations are historical; the current source differs:

| Service node | Community; graph location | Current source confirmation |
|---|---|---|
| `pos_pos_service_commitpossale` | 20; L1725 | [services/pos/pos.service.ts:2210](../../../../services/pos/pos.service.ts); stock issue L2477, accounting post L2667, finalized event L2792 |
| `inventory_inventory_stock_event_service_postposstockissue` | 9; L869 | [services/inventory/inventory-stock-event.service.ts:1081](../../../../services/inventory/inventory-stock-event.service.ts) |
| `accounting_close_assurance_pack_service_exportclosepack` | 22; L1895 | [services/accounting/close-assurance-pack.service.ts:2087](../../../../services/accounting/close-assurance-pack.service.ts) |

Freshness sampling of the existing graph manifest's MD5 entries found **one matching and one mismatching file**: accountant-access.actions.ts matched; close-assurance.actions.ts did not. Both raw and LF-normalized forms were checked. This is the result for these two current samples; it does not repeat the earlier report's sampling count as current fact. Exact old/current hashes are in the snapshot. Graphs remain navigation evidence; no regeneration was performed.

## Existing operating arrangements: evidence and unknowns

| Area | Current repository evidence | What is not established; next owner |
|---|---|---|
| Platform billing/cancellation | [services/modules/module-composition.service.ts:182](../../../../services/modules/module-composition.service.ts) returns commercial no_purchase / existing access only. [services/modules/module-stop-policy.service.ts:29](../../../../services/modules/module-stop-policy.service.ts) explicitly leaves POS/sales/reconciliation stopping unsupported. | Live subscription provider, prices, payment collection, cancellations, refunds and manual administration unknown. Product/commercial owner; P10. Business supplier/customer payments must not be mistaken for platform billing. |
| Customer/product analytics | [services/analytics/daily-sales-read.service.ts:56](../../../../services/analytics/daily-sales-read.service.ts) provides organization/location/currency/timezone-aware daily sales; [services/analytics/completed-sales-evidence.ts:33](../../../../services/analytics/completed-sales-evidence.ts) selects completed/delivered sales and related evidence. Import adoption remains recent-batch scoped at [services/onboarding/master-data-import.service.ts:1158](../../../../services/onboarding/master-data-import.service.ts). | No current customer-retention cohort, paid-retention or deployed external analytics system was established by scoped search. Analytics/product owner; P02. Reuse existing sources before adding storage. |
| Support/incident operations | [services/assurance/assurance-incident.service.ts:126](../../../../services/assurance/assurance-incident.service.ts) implements incident transitions; [lib/error-handling/monitoring.ts:26](../../../../lib/error-handling/monitoring.ts) defines monitoring configuration and metrics. | No staffed helpdesk, escalation rota, response promise, real alert delivery or support performance was verified. Support/platform owners; P04/P10/P17. Code presence is not staffed service. |
| Deployment/CI | [.github/workflows/ci.yml:20](../../../../.github/workflows/ci.yml) declares workflow and verification jobs. Package build delegates to migration and build helpers. | Production host, release digest, deployed source, CI run outcome and environment parity unknown. Engineering/platform owner; D02/D08. No build or remote query performed. |
| Backup/restore | [scripts/prisma-local-restore-rehearsal.js:58](../../../../scripts/prisma-local-restore-rehearsal.js) rejects production/nonlocal source; it invokes dump/restore and mutates local DBs. | Backup schedule, retention, encryption/access, offsite copies, attachments, actual restore and measured RPO/RTO unknown. Platform owner; P04/P17. Do not execute the script as a read-only check. |
| Country/payroll | [services/regulatory/country-packs/registry.ts:4](../../../../services/regulatory/country-packs/registry.ts) contains CM. Cameroon source still has CNPS SUPPORTED_DRAFT and IRPP productionCalculationSupported false at [services/regulatory/country-packs/cameroon.ts:16](../../../../services/regulatory/country-packs/cameroon.ts). | Effective rule accuracy, applicable SME regime and expert approval not established. Domain/accountant owner; P11. Published pack status does not override capability limits. |
| Payment providers | [services/payments/adapters/mobile-money-hmac.adapter.ts:115](../../../../services/payments/adapters/mobile-money-hmac.adapter.ts) is a generic adapter using provider-code/signature conventions. | Native live collection/payout/settlement connection, production credentials and provider agreements not verified. Integration owner; P11/P20. |

Search scope: filenames and selected TS/TSX/JSON/YAML content in `app`, `services`, `lib`, `config`, `.github`, `scripts` and package metadata, excluding graph blobs/test bodies for vendor discovery. No specific Stripe/Paddle subscription handler or PostHog/Mixpanel/Zendesk/Intercom integration was established in that scoped search. This does not prove external/manual arrangements are absent. Environment files and provider/customer systems were not read.

## Recent and historical context revalidated

1. [what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_01_DESIGN_SYSTEM_FREEZE_REPORT_2026-10-12.md](../../../../what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_01_DESIGN_SYSTEM_FREEZE_REPORT_2026-10-12.md) and [what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-10-12.md](../../../../what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-10-12.md): current Navbar imports DashboardLanguageLink and DashboardMobileNavigation; Sidebar uses localized labels and permission/module filtering. The reported prior 70 tests/browser observations were **not rerun** and do not establish current restricted-role or accessibility acceptance. Relevant destination: P08, preserve the existing design master.
2. [what-next/platform-remediation/2026-09-30-run-01/CAMEROON_FIRST_CONTINUATION_2026-10-07.md](../../../../what-next/platform-remediation/2026-09-30-run-01/CAMEROON_FIRST_CONTINUATION_2026-10-07.md): historical pre-production programme and qualified-review gaps. Current country flags corroborate the continued draft/unsupported boundary. Historical HRIS tests and local PostgreSQL version are not P01 test results or production database facts. Its past authorization narrative does not authorize this run to perform those tasks.
3. [innovation/DAILY_DIGEST_ROUTE_STATE_RERUN_NOTE_2026-06-26.md](../../../../innovation/DAILY_DIGEST_ROUTE_STATE_RERUN_NOTE_2026-06-26.md): current daily-digest route files still exist, but current loading uses DashboardRouteState and localized copy; error recovery now refreshes then resets. Do not copy the June implementation description verbatim. Current route delegates to withDailyDigestSurfaceAccess. This is navigation/recovery context for P08, not a new passed test.
4. [innovation/FINANCE_COMMAND_SURFACES_SMOKE_RERUN_NOTE_2026-06-26.md](../../../../innovation/FINANCE_COMMAND_SURFACES_SMOKE_RERUN_NOTE_2026-06-26.md): current cash-command and stock-to-cash routes exist; cash-command retains scoped/denied handling. The historical nine-test result is not revalidated runtime evidence. P01 makes no finance-route acceptance claim.

## Handoff constraints

P01 identifies and fingerprints the candidate; it does not create fixtures (P03), instrumentation (P02), access fixes (P04), a stable built release, a complete M0 or Gate A. [PILOT_SCOPE.md](PILOT_SCOPE.md) defines safe proposed local-work defaults. [DECISIONS.md](DECISIONS.md) lists unresolved business/environment authorities. Recheck hashes before subsequent edits; preserve every unrelated change and stop only work that depends on a conflicting changed source.
