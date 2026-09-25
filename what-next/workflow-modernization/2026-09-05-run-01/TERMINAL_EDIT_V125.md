# Terminal configuration integrity and recovery

2026-09-13. Continues the full-platform workflow assignment; previous turn v124 made verified progress. Selected skill remains `007-aqstoqflow-pos-ledger-controls`. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Unrelated changes preserved. This is engineering evidence, not platform or POS certification.

## Reproduced findings and implementation

Current terminal edit service and UI were traced from `/[locale]/dashboard/settings/terminals` through TerminalManagementDashboard, useTerminalManagement, terminal-management.actions and terminal-management.service. Historical action graph community 22 is the relationship hint; current source is authoritative. No nested AGENTS files were returned in the affected source directories (rg exit 1 means no matches).

The real PostgreSQL before verifier (`5b24d0`) reproduced three defects: editing deactivated a terminal after an intervening real shift opening; relocation moved an active terminal while its shift/drawer stayed at the old store; omitted boolean fields reactivated an inactive station and enabled its drawer.

Terminal editing now reads restrictions and changes terminal/drawer state in one serializable transaction. Optional flags preserve existing intent. Active-session and open-drawer restrictions are rechecked inside that transaction; a serialization conflict becomes an actionable conflict, without automatic replay. Unused drawers follow an allowed idle move atomically. Stations with session, sale or drawer-transaction history cannot move: create a new terminal at the destination, preserving the original location relationships. This restriction preserves existing records; it does not fabricate a migration or rewrite historical attribution.

The UI retains rejected form inputs, announces errors, localizes the affected recovery guidance and exposes accessible names on form controls and row-action buttons. Deactivation catches rejection, keeps the dialog open and prevents duplicate clicks while pending. Saved-but-not-reloaded results are distinguished from rejected edits; unknown transport details use localized unconfirmed-outcome guidance.

The first browser attempt exposed a disappearing row-action menu. The table's column definitions depended on the entire notification context through copyTerminalId. That context object changes on notification updates, remounting cell components. The callback now depends only on stable notification methods, so unrelated notification state does not redefine the column cells. No shared notification provider was rewritten.

## Verification evidence

Commands run from the repository with bundled Node `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Package scripts inspected: default build remains migration-bearing and was not run. No schema/migration, external delivery, customer activation or deployment.

- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-terminal-edit-v125.cjs`: before reproduction passed, `5b24d0`, `lanes/environment/terminal-edit-v125-before-362fad36-9423-4ecc-ac71-06dd56737771.json`.
- Same script `--after`: initial corrected checks passed (`802ae7`, `terminal-edit-v125-after-9a235554-f0cd-4255-9717-dd767b4a8236.json`). Expanded rollback/retry verification passed (`ca2737`, `lanes/environment/terminal-edit-v125-after-ca3469ad-00d8-4ff4-b09b-e8ec2ebd32cb.json`). These verify actual service interleaving, retained active location, omitted flags, safe unused-drawer relocation, cross-tenant denial, history retention and full rollback on an injected drawer-create failure. Explicit retry creates one drawer; no automatic retry occurs. Payments/journals remain zero.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/terminal-archive.service.test.ts services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/terminal-management.actions.test.ts hooks/posHooks/__tests__/terminal-errors.test.ts`: 51 tests / four suites passed (`62ba83`). Service transaction correctness additionally uses the PostgreSQL evidence above; mocks alone do not prove rollback.
- Initial typecheck passed (`c86f52`); initial five-file lint passed (`770895`). Final verification receipts and browser outcome are appended below when terminal.
- Initial browser failed (`576dac`, `lanes/environment/terminal-browser-v125-a9d5a4e3-125e-4349-b95f-9240f6bf4499.json`): edit menu detached after opening, before any workflow assertion. Preserved as failed evidence. Development initial ready time 48,524ms; not a performance benchmark or speedup claim.

Owned database `stoquify_local_registration_20260906_01`; real local app `http://127.0.0.1:3110`. The verifier checks database/organization provenance and fences browser traffic to the local origin. Synthetic shift opening uses the real domain service. Injected drawer failure is controlled fault evidence, not an actual provider outage. Secrets are omitted.

## User and operator procedure

Open `/en/dashboard/settings/terminals` or `/fr/dashboard/settings/terminals`. The organization administrator supplies current read/start permissions and valid organization locations. Terminal name, number and intended flags come from the operator; existing state/history comes from server records.

Use a row's named **Actions** menu, edit the terminal and save. If a shift or drawer opened while you were editing, your entry remains; correct the requested change or complete normal authorized shift/drawer closure first. A terminal with operating history must stay at its recorded location: create a different terminal for the destination. An unused idle terminal and its unused drawer may move together.

For deactivation, confirm the specific terminal. If a shift has opened, the dialog retains the rejection and the station stays active. Cancel, review its current session and close that session through the normal cashier workflow before trying again. Never clear a session link or rewrite historic drawer locations manually. If the result says it was saved but could not reload, refresh before submitting again. Unknown outcomes require inspecting current records first.

## Rollout and review responsibilities

No migration/backfill. Service, action error mapping and localized UI should be released together through the existing controlled process. Verify with an authorized cohort before deployment. Rollback of the transaction change reintroduces demonstrated races; contain terminal configuration operations if recovery requires the older version. No gate or X1 clearance is implied.

| Responsibility | Evidence or limit |
| --- | --- |
| Architecture/backend/distributed/API | Current call chain verified; transaction covers terminal/drawer preparation; conflicts are explicit and not automatically replayed. |
| Database/integrity/migrations | Actual PostgreSQL before/after, conflict, rollback and duplicate-safe explicit retry; no schema change. |
| Security/IAM/privacy/fraud | Tenant-scoped reads/writes and existing action guards retained. Full management-cache actor scope, module/read-only and role-change runtime checks remain open. |
| Frontend/design/UX/EN-FR/accessibility | Existing shell, dialogs, danger tokens, forms and notification system reused; local recovery and accessible names improved. Native screen-reader, zoom and comprehensive contrast/focus audit remain unverified. |
| Product/operations | No silent reactivation; retained inputs and history-aware location guidance reduce recovery ambiguity. No fabricated productivity measurement. |
| Finance/controls/records | Existing operating history and active cash context preserved; no ledger/posting changes. Full sale/shift close/certificate workflow not certified. |
| QA/SRE/release | Focused tests, persisted evidence and browser attempts retained; local latency remains variable. No release certification. |
| SaaS/modules | Existing new-work guard on opening remains; management observe/read-only boundaries need complete review. |
| POS/offline/events/providers | Online terminal configuration reviewed. Offline replay and unknown-outcome sale/cart mutation paths remain separate work. |
| Statutory/country, purchasing/AP, HRIS/payroll, analytics, AI/agents | Not applicable to this patch: no rules or behavior in these domains changed. They remain in the full platform register. |

Remaining engineering work includes stale form-version conflict handling, actor-scoped management queries, terminal operation permissions/read-only consistency, complete terminal creation/history journeys and the rest of the platform register. No whole workflow is marked complete solely from these checks.

## Final source-bound verification

Final production typecheck passed (`a9d03f`). Five-file lint passed (`fb2408`), then the only subsequently changed file, TerminalManagementDashboard, passed again (`26807f`). Source checkpoint `evidence/source-baseline-v125.json` recorded at 2026-09-13T13:01:06.270Z (`e5e653`). The source tree contains 2,878 inventoried source files and 1,019 tests; those counts are discovery inputs, not review completion.

The intermediate browser report `lanes/environment/terminal-browser-v125-433ca4db-7eda-46f9-a640-c86e464dc295.json` passed interaction assertions (`95a55c`), but visual inspection exposed a white dialog in the dark dashboard. The terminal edit and deactivation portals now bind the existing dashboard theme, use its surface/background and semantic error tokens, retain fixed positioning, constrain width/height, localize the close label and preserve pending operations when dismissal is requested. No shared dialog or global CSS changed. Existing floating menus/selects continue using their shared floating-surface implementation.

Final actual browser run passed (`c3dbc4`), `lanes/environment/terminal-browser-v125-abccb675-0df2-4f65-81bb-460a83e7fccf.json`. Both EN/FR: open row menu and edit, open a real shift before save, reject deactivation while retaining the entered name, correct the choice and persist the name, reject archive after an intervening opening while retaining the dialog, and keyboard-confirm successful idle archive. Database assertions verify each outcome. No payments or journals were created; no page errors; production hashes unchanged throughout.

Six screenshots cover 1440/768/320 widths. Portal token presence, horizontal reflow and dialog bounds were asserted; the final French 320px screenshot was visually inspected. One Tab transition remained inside the dialog; Enter confirmation was exercised. These bounded checks do not prove a complete keyboard loop, focus return, native screen-reader, browser zoom or accessibility certification. Final local route readiness EN6,345ms/FR4,965ms remains development observation, with compilation/warmth differing from earlier attempts.
