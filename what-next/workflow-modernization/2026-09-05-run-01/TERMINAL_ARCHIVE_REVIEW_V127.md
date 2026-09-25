# Terminal deactivation: reviewed configuration and recovery

Evidence date: 2026-09-13. Source baseline: `evidence/source-baseline-v127.json`. Local app: `http://127.0.0.1:3110`. Branch/commit/dirty-tree evidence is in the baseline. This is a bounded correction within the continuing whole-platform review, not completion or release certification.

## Finding and delivered correction

The owned PostgreSQL reproduction confirmed that a confirmation opened before another operator's configuration change could deactivate the changed terminal. The earlier v124 active-session race guard did not bind deactivation to the configuration reviewed by the user.

Deactivation now requires the server-issued configuration revision. Missing or stale revisions are rejected after current permission and tenant checks. The final conditional update compares all revision fields, including name, number, location, active/drawer flags, session linkage and timestamp. An edit between read and write therefore rejects deactivation even if the timestamp is unchanged. The active-session guard remains. No terminal/history record is deleted. A stale replay is rejected; the caller must read current state instead of assuming success or automatically repeating a destructive change.

The EN/FR confirmation shows name, number, location, active status, drawer configuration and current session. After failure, confirmation remains open and disabled until review is refreshed. Refresh only reads. A separate explicit confirmation is required. A refreshed inactive or session-linked terminal cannot be confirmed in the dialog; server checks remain authoritative. Existing dashboard tokens, destructive button semantics, themed alert dialog, reduced-motion and mobile layout are reused. No shared component, schema or migration changed.

## User procedure

Open `/en/dashboard/settings/terminals` or `/fr/dashboard/settings/terminals`. Use the terminal's Actions menu, then Deactivate / Desactiver. Review the terminal details. If another operation changes the terminal, select Review latest configuration / Vérifier la configuration actuelle. Confirm again only if the refreshed terminal is the one you intend to deactivate. Close any active shift through its normal workflow first. If already inactive, cancel and inspect the refreshed list. A transport error is not proof that a change failed: refresh to establish current state before another submission.

No new approval document, commercial activation, signature or external input is needed for this local correction. Existing server-derived tenant identity and `pos.session.start` permission remain required for mutations. This permission's suitability for terminal administration remains part of the role review.

## Verification

| Check | Result and evidence |
| --- | --- |
| PostgreSQL before | Reproduced stale confirmation deactivating a changed terminal; receipt `e66af6`, `lanes/environment/terminal-archive-revision-v127-before-e2c51ab0-8c29-421c-8730-c8813a29155d.json` |
| PostgreSQL after | Stale/missing/cross-tenant and edit-after-read denied; fresh reviewed confirmation persisted; stale replay denied; terminal retained; zero payment/journal effects. Receipt `f920ed`, `lanes/environment/terminal-archive-revision-v127-after-a0d036cb-211b-46ba-99e7-3bc504d35481.json` |
| Focused unit/action tests | 21 tests in three suites passed, receipt `d763e6` |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit --pretty false`, passed, receipt `e55cb4` (started `efc10d`) |
| Changed-file lint | Six files, passed, receipt `fec183` |
| Real EN/FR browser | Owned credential login, stale rejection, read-only refresh, explicit keyboard confirmation and persisted deactivation, already inactive recovery. Six screenshots at 1440/768/320px, no page errors. Receipt `8eda5d`, `lanes/environment/terminal-archive-browser-v127-e72ac2eb-9885-474b-8a96-4e838142f260.json` |

Commands used the bundled Node runtime. Focused Jest command: `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/terminal-archive.service.test.ts actions/pos/__tests__/terminal-management.actions.test.ts hooks/posHooks/__tests__/terminal-errors.test.ts`. Lint command: `node node_modules/eslint/bin/eslint.js services/pos/terminal-management.service.ts actions/pos/terminal-management.actions.ts hooks/posHooks/useTerminalManagement.ts components/pos/TerminalManagementDashboard.tsx services/pos/__tests__/terminal-archive.service.test.ts actions/pos/__tests__/terminal-management.actions.test.ts`.

Database verifier: `lanes/environment/verify-terminal-archive-revision-v127.cjs` (before, then `--after` after code change). Browser verifier: `lanes/environment/verify-terminal-archive-browser-v127.cjs`. Both use the established owned local database provenance check. External browser traffic is fenced. The competing operator is an actual service call between browser interactions, not a second browser session. The same-timestamp database interleaving is injected at the Prisma method boundary and performs a real database update.

Measured navigation-to-actions: EN 14,498 ms, FR 6,011 ms in this development run. These are observations, not an approved performance budget or production certification. Assertions cover horizontal bounds, one Tab containment transition, focused Enter activation and zero page errors. French 320px screenshot was visually reviewed. Full screen-reader testing, focus return, zoom and broader accessibility certification remain unverified.

## Adjacent POS policy trace — incomplete, no enforcement changes

Applied `aqstoqflow-module-enforcement-truth` for source analysis. Historical July report and September surface inventories are discovery evidence only. Current findings:

| Boundary | Current source behavior |
| --- | --- |
| Terminal read/create/update/archive | Current RBAC and tenant checks, then explicit `mode: observe`; no commercial grant denial from that observation. |
| New cart creation / shift opening / sale commit | `assertModuleNewWorkInTx` inside the relevant transaction. Existing cart lookup and committed idempotency results precede new-work checks where applicable. This is a stop policy, not grant eligibility. |
| Existing cart edits | Scoped domain/cart/shift checks; the new-cart admission call does not prove commercial read-only enforcement for edits. |
| Shift closure | Explicit observation preserves the existing completion boundary. Broadly denying it can strand obligations. |
| Tender / receipt administration / cash payment history | Explicit enforcing callers exist; registration, current grants and rollback consistency still need complete review. |
| Shared protect / API helper | `protect` defaults a supplied module's omitted mode to enforce; API helper explicitly enforces. The enforcement-truth skill recommends central versioned policy and no implicit enforcement. Do not change the shared default blindly: that could relax existing controls. |
| Legacy control-center read model | `getModuleControlCenterData` still reports `MODULE_CONTROL_MODE`; active settings route renders `ModuleCompositionWorkbench` instead. The historical UI mismatch cannot be assumed to describe the active screen without further runtime verification. |

Next: reproduce stopped/read-only/expired commercial cases separately against current POS operations; reconcile the actual settings/read models and surface registry; preserve completion/retention paths. The skill explicitly says not to enable new enforced surfaces during this analysis. No new enforcement, cohort activation, kill switch, entitlement change or release approval was made. This does not block unaffected implementation. No POS entitlement guarantee is claimed.

## Review responsibilities and rollout

Architecture/backend/data: one existing version contract, atomic compare-and-update, no extra storage. IAM/privacy: existing current permission/tenant checks preserved; cross-tenant denial verified; full role/access review open. Product/UX/frontend/localization: concrete confirmation, recoverable stale state, EN/FR and actual responsive checks. Audit/records: record retained; no new immutable business audit history was introduced. Finance/controls: no payment/journal effects; active-shift protections remain; checkout/refund/offline are separate incomplete workflows. QA/release/SRE: source-bound local proof, no build/deployment, no performance certification. SaaS packaging: no entitlement or price changes; observe/enforce gap recorded. API/events: existing action signature intentionally requires the revision; no new event or endpoint. Rollout/support: deploy coupled service/action/hook/UI changes together through existing release controls; outdated clients must refresh. Rollback to the previous archive implementation reintroduces the reproduced stale-confirmation risk and is not a safe concurrency correction.

Statutory/country-pack, payroll/HRIS, purchasing/AP, analytics, AI/agents and external providers: not applicable to this patch because their behavior/data contracts are unchanged; they remain in the platform-wide register. These are engineering review responsibilities, not independent professional approvals.

Terminal creation/history, native accessibility, operation-role alignment, POS commercial/read-only consistency and all remaining platform workflows remain open. Prior evidence remains historical and is not relabeled as current full-workflow verification.
