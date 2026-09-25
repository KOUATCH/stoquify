# POS reads: current authority and recoverable failure

2026-09-13. This continues the whole-platform workflow assignment using the previously read `007-aqstoqflow-pos-ledger-controls` skill. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; the dirty working tree is preserved. See `evidence/source-baseline-v123.json` for the source binding and working-tree inventory.

## Defect, correction and benefit

Four before-tests failed (receipt `7658de`): action failures were successful query data, responses were not bound to the current tenant/actor, cached locations could cross a scope change, and a forced unauthorized refetch could invoke the action. The POS component could consequently interpret a failed read as no shift or no cart.

The ten POS read hooks now share `usePOSReadQuery`. Server read actions return their authenticated organization and actor with the existing payload. Cache keys include both identities; mismatched responses and action errors fail the query. Current permissions gate automatic and explicit reads. On revocation, previously loaded private data is withheld and retry refreshes authority. Scope changes reset workspace-local state. Server action authorization remains authoritative.

The POS workspace shows the shared localized error state when a required location, terminal, catalogue, shift or cart read fails, and removes checkout controls until recovery. Same-scope core data remains internal solely to preserve draft state beneath that view. Retry reads current data without submitting a sale or approving an operation. Customer and receipt failures have explicit messages; current receipt-token failures have a retry action, and receipt management distinguishes denied access from unavailable capability data.

Cashiers can recover a failed read without retyping an entered quantity. Missing data no longer asserts a closed shift, empty cart or successful operation. This is a read-state correction, not full checkout or POS certification.

## Verification

Commands used bundled Node at `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, from the repository. Scripts/configuration were inspected; no default build, seed or migration ran.

- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath hooks/posHooks/__tests__/pos-read-scope.test.tsx hooks/posHooks/__tests__/usePosOperations-receipts.test.tsx actions/pos/__tests__/catalog.actions.test.ts actions/pos/__tests__/session.actions.test.ts actions/pos/__tests__/receipt-token.actions.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx components/pos/__tests__/ProfessionalPOSSystem.receipt-token-visibility.test.tsx`: 55 tests / seven suites passed (`630a8a`). A fifth read-scope test then verified revocation of an already loaded cache and authority refresh; the five-test file and its lint passed (`9b514d`). Total: 56 distinct tests / seven suites.
- `node_modules/typescript/bin/tsc --noEmit --pretty false`: passed (`c38517`) for final production source. The later change is one test only.
- `node_modules/eslint/bin/eslint.js`: all 15 changed TypeScript files passed (`ed0de2`); the subsequently extended test was linted again (`9b514d`).
- Initial contract runs `07ff85` and `31188f` failed because expected read results omitted the new authenticated scope; assertions were updated to require it. Initial typecheck `13d281` exposed an overbroad shared error type and an impossible boolean comparison; a narrow POS read-error helper resolved those without altering the shared action helper.
- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pos-read-browser-v123.cjs`: passed (`f04ef4`). Actual credential sign-in, EN/FR POS reads, injected HTTP 503 read failure, inaccessible checkout controls, retained unsaved quantity, explicit recovery and subsequent database-verified quantity save. No payments or journals were created. Browser report: `lanes/environment/pos-read-browser-v123-97d99b70-87f9-42b0-b6f2-8857119a698e.json`. Production hashes remained stable; both locales had zero page errors.
- Both failure screens were captured at 320px without horizontal overflow; the French screenshot was visually inspected. Enter-key correction was exercised after recovery. Reduced motion was enabled. These checks do not establish native screen-reader, full keyboard/focus-return, zoom or contrast compliance.

Runtime target: owned local PostgreSQL database `stoquify_local_registration_20260906_01`, app `http://127.0.0.1:3110`. The fixture checks owned database and organization provenance; external browser traffic is fenced. Fault injection establishes HTTP transport recovery, not a database-outage test. EN readiness was 15,983ms and FR 6,314ms in this development run; these are observations, not comparable speedup measurements or an approved performance result. Real browser role-revocation and tenant-switch journeys remain unverified; focused hook/action tests provide the present boundary evidence.

## Design and operating instructions

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. The organization administrator supplies current `pos.use` and `pos.read` rights and terminal/location setup; the cashier supplies the intended quantity. Receipt revocation additionally requires its existing permission and fresh authentication. Authority and scope come from the server, not a form field.

If the workspace cannot verify POS data, use **Try again / Réessayer** after connectivity or access is restored. An entered quantity remains available after same-scope recovery. Review it and press Enter or leave the field to save; recovery itself does not save it. If access was removed, ask the organization administrator to review the role assignment; retry cannot grant permission. Changing tenant or actor intentionally discards private local draft state.

Reused: DashboardErrorState, DashboardRouteState, inherited dashboard shell/theme, existing warning/error semantics, POSButton and EN/FR localization. Selection has not been relabeled as success or approval. No new shell, portal or design system.

## Rollout, review accountability and outstanding work

No schema, migration or backfill. Ship server response and client-hook changes together through the existing release process; do not roll back one side independently. For recovery, retain the previous deployable application version as a whole. Smoke-test read failure, restored access, tenant changes and cart continuity in the intended authorized cohort. No deployment, live customer activation or X1 clearance has occurred.

| Review responsibility | Assessment |
| --- | --- |
| Architecture/backend/API | A small shared read contract preserves existing payloads while adding server identity; failures propagate to query state. |
| Database/data integrity | Real persisted quantity checked before failure and after explicit correction; reads do not establish financial effects. No schema change. |
| Security/IAM/privacy/fraud | Current-permission gating, response binding, cache partitioning and forced-refetch denial tested. Full module/read-only and live revocation coverage remain open. |
| Frontend/design/workflow/EN-FR/accessibility | Shared honest error/recovery presentation; actual localized mobile screens and draft recovery. Full assistive-technology and focus continuity require further work. |
| Product/operations/support | Cashier can recover without silently losing the requested quantity; setup inputs, owners and recovery actions documented above. |
| QA/release/SRE/performance | Focused regression and real browser/database evidence; development loading remains slow and unexplained by this patch. No release certification. |
| Finance/reconciliation/ledger/audit | No payment, journal or approval created; stale reads cannot expose checkout as ready. Full sale-to-ledger, refund and void proof remains pending. |
| POS/offline/events/providers | Online read transport corrected; offline ingestion/replay and unknown-outcome mutations unchanged and unverified. |
| SaaS/modules/commercial | Existing grants and admission remain unchanged; read-only/new-work consistency is still engineering work. No prices or subscriptions invented. |
| Statutory/country packs | Not applicable to this patch: no tax, fiscal recipe or country rule changed. |
| Purchasing/AP, HRIS/payroll, analytics/data governance, AI/agents | Not applicable to these changed POS reads; their workflows remain in the full assignment. |

Continue with terminal opening/archive concurrency, complete new-work/read-only enforcement, durable cart-add request identity and complete checkout/refund/void/offline lifecycles. Receipt-history recovery and full accessibility still need review. Raw TanStack status metadata can retain cache status while `readState` and `isError` express current denial; current POS consumers use the latter, and that distinction must be respected by future consumers. No whole workflow is declared complete by this batch.
