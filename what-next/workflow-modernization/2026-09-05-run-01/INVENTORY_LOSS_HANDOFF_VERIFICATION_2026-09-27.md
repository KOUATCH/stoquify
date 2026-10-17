# Inventory Loss handoff and cached-evidence privacy

Date: 2026-09-27. Base HEAD `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, plus recorded working changes. Primary AN-DAILY-DIGEST; supporting read boundary IN-013. Unrelated platform-evaluation documents preserved.

During verification, unrelated `prisma/systematic-reseed-inventory.ts`, its test, `scripts/systematic-reseed-local.cjs` and `what-next/database-reseed/` appeared in the shared working tree. They were neither modified nor executed by this work. Whole-repository typecheck describes the shared checkout observed by that run; this patch's specific before/after hashes are recorded separately.

## Delivered corrections

- The shared Inventory Loss signal now opens the implemented `/[locale]/dashboard/inventory/loss-control` route. The previous `/inventory/losses` destination did not exist. Shared Digest, Owner, Manager, action-queue and Cash Command consumers use the corrected canonical destination.
- The page passes the organization and actor from its existing server access guard to partition the client query cache. Identity changes cannot reuse a previous identity's response as placeholder data. The protected action still derives authority independently; browser props grant no permission.
- A 401/403 response withdraws cached loss evidence for every period in that identity scope. Failed retries and pending recovery do not revive it. Ordinary server failures retain prior records with the existing explicit error state.
- An open detail drawer resolves its record from the current authorized result and closes when that record is withdrawn.

Graph used for discovery: `graph_app.json`, route node `locale_dashboard_dashboard_inventory_loss_control_page_tsx`, function `loss_control_page_inventorylosscontrolpage`, community 117. Current page, route registry, service and sidebar confirmed the real route.

## Verification

Baseline regressions reproduced: canonical route test failed (1 failed, 22 skipped); cached-private-response tests failed for 401/403 (2 failed, 8 passed); open-drawer revocation failed (1 failed, 4 skipped). These failures preceded the corresponding corrections.

Shared consumer matrix: 207 tests across 11 suites passed before final identity partitioning. The shared service and its consumer tests have not changed since that check. Final affected hook/component/page/protected-action matrix: 31 tests across four suites passed (`c5a834`), including identity changes, all-period withdrawal and recovery. Changed-file ESLint and `git diff --check` pass. **Standard full typecheck passed**, exit 0, no diagnostics, source hashes stable: [terminal receipt](evidence/loss-handoff-typecheck-b4891228-0c5a-4e24-9cc6-4079429ff22e.json). The existing checker completed without timeout or restart.

Reproduce the focused check from the repository root using its installed Node runtime:

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath hooks/__tests__/useInventoryLossWorkbench.test.tsx components/inventory/loss/__tests__/InventoryLossWorkbench.test.tsx "app/[locale]/(dashboard)/dashboard/inventory/loss-control/__tests__/page.test.tsx" actions/inventory/__tests__/inventoryLossReadActions.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

The latter is the unchanged `npm run typecheck` implementation. The receipt wrapper records before/after hashes and terminal diagnostics; it does not migrate or seed. The browser runner `lanes/environment/verify-digest-loss-handoff.cjs` asserts ownership of its database before fixture writes and must only run with the existing isolated local launcher.

Runtime uses only the owned `stoquify_local_registration_20260906_01` database and local port 3110 with provider/network safeguards. Synthetic fixtures identify a completed loss without claiming approval. Real authentication, services, database records and browser routes are used. EN desktop and FR 320px verify keyboard handoff, source-record drawer/Escape, exact Digest Back restoration, permission revocation on refresh and direct navigation, removal of the Digest link, recovery, suspended module denial and read-only recovery. A foreign tenant sentinel remains absent. Source adjustments/lines and journal, inventory-transaction and business-event counts remain unchanged; authentication/audit writes are expected.

Intermediate passing receipts: `lanes/environment/digest-loss-handoff-e60e69fd-11cf-4112-8308-1372eff9902f.json` (before identity partition), `lanes/environment/digest-loss-handoff-d2c1743b-5685-4fa5-bb9c-6a55006cd863.json` (before all-period withdrawal). Final receipt and source bindings follow below.

Final runtime: [source-bound receipt](lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730.json), **passed**, source hashes stable. Actual screenshots: [EN source](lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730-en-source.png), [EN denied](lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730-en-revoked.png), [FR mobile source](lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730-fr-source.png), [FR denied](lanes/environment/digest-loss-handoff-4e4a6872-1362-45dc-80e5-b3575f01c730-fr-revoked.png). Visual inspection of the French source confirms explicit partial evidence and approval-attribution limits, with remaining English source-reason text and item naming: full destination localization remains open in IN-013. The owned server tree was stopped after this run; no other Node processes were stopped.

Retained failures: `digest-loss-handoff-87d83901-7352-417b-90ee-23935762acb4.json` reached the correct page but timed out because the verifier unnecessarily demanded literal `#top`. It now verifies the actual pathname and visible top heading. Attempt `680c0b21-be2d-41ad-8d8d-5f1b49370cab` reached the source but could not save screenshots/receipt due to sandbox EPERM (terminal `2fb949`); approved workspace-write rerun succeeded. No approval review rejection occurred.

Final-source attempt `digest-loss-handoff-f229aeff-81ab-4dca-bae1-e1e2935f661b.json` exposed a verifier race: refreshed server content showed the authorized route-denial page before the client denial heading was observed. Its screenshot confirms private records were absent. The verifier now accepts either specific denial heading, still asserts record absence, and reloads after restoring legitimate module authority. It does not suppress errors or replace protected responses.

## Operating guidance and limits

Open the Inventory Loss action from the Digest or `/en/dashboard/inventory/loss-control` (`/fr/…` for French). The destination explicitly shows its own reporting period; it does not silently inherit the Digest daily window. Review scope, completeness and approval attribution before relying on totals. Refresh reevaluates access. After denial, restore legitimate role/module/session authority before retrying; read-only access supports this review without permitting posting.

This verifies the Digest-to-loss read contract, not the entire stock-count, adjustment approval or posting lifecycle. IN-013 still needs its broader period/history, full localization and accessibility review. Native screen-reader speech and browser zoom are unverified. No migration, live customer activation, release certification or X1 approval was performed. Architecture/data/security/UX/quality and inventory/audit reviews apply; new statutory rules, payroll calculations, billing and provider behavior are not applicable because this correction changes only routing and protected read presentation.
