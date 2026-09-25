# POS cart access and stock truth — v130

Evidence date: 2026-09-13. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; existing dirty workspace preserved. This is a bounded implementation batch within the unfinished platform review. Source bindings are in `evidence/source-baseline-v130.json` and `evidence/pos-cart-access-v130.json`.

## Finding and correction

An already-open shift could add, update and remove draft cart lines after its POS grant became read-only. The owned PostgreSQL before report `lanes/environment/cart-access-v130-before-a4371734-6f5d-4aac-b61b-0aae1a843758.json` reproduces all three admitted writes. The v129 opening check alone did not protect existing shifts.

`services/pos/cart-write-access.ts` now checks writable POS access and required dependencies using the existing transaction-aware module evaluator. Each cart-edit transaction invokes it before mutation. Existing tenant/cashier/shift/stock checks and bounded serialization retries remain. Denial rolls back the attempted edit and records `POS_CART_WRITE_ENTITLEMENT_DENIED` separately, with policy `pos.cart.add`, `pos.cart.update` or `pos.cart.remove`, version `2026-09-13.1`. Current action permission remains `pos.use`; identity and tenant come from the server. No grant is created or changed by this policy.

The actions return a stable `POS_CART_WRITE_UNAVAILABLE` discriminator. The interface presents an EN/FR inline alert, preserves the entered quantity and saved cart, and requires explicit retry after access is restored. Mutation notifications are suppressed where this component owns the feedback, avoiding duplicate messages. Retained cart reads and existing shift closure keep their own permissions and rules.

The first browser screenshot also exposed stock on hand incorrectly subtracting an uncommitted cart quantity: database 20, cart 1, display 19. The catalogue now displays the recorded on-hand balance, 20, with the separate cart count. Final browser checks prove that editing the cart from 1 to 3 does not change the displayed or persisted on-hand balance.

## Policy and design contract

Owner: POS domain services. Actions: `actions/pos/cart.actions.ts:addPOSCartLineAction/updatePOSCartLineAction/removePOSCartLineAction`. Guard mode: enforce, write intent, POS module; scope: these draft mutations only. The user's explicit implementation instruction to correct reproduced module-eligibility defects authorizes this bounded change, as described for v129; the enforcement-truth skill's reconnaissance restriction does not replace that instruction. Shared observe defaults, commercial contracts, stop-support flags and live cohorts remain unchanged. The policy registration is `evidence/pos-cart-access-policy-v130.json`.

The persistent alert uses existing dashboard danger tokens and `role="alert"`; selection remains separate from access status. Quantity errors refer to the main explanation rather than repeat the long text. No shell, theme, dialog or shared token replacement was introduced. French 320px evidence was visually reviewed; no horizontal overflow was reported by the browser verifier. Complete assistive-technology, zoom, focus-return and contrast certification remain unverified.

## Verification

All runtime fixtures use the owned local PostgreSQL database `stoquify_local_registration_20260906_01` and app `http://127.0.0.1:3110`. Commercial grant changes are isolated test fixtures, not customer activations. No checkout, payment, journal or provider operation was performed.

| Check | Result and evidence |
| --- | --- |
| Before reproduction | Read-only POS admitted all three edits; historical report retained. Receipt `da2bc6`. |
| Database after | Six scenarios: legacy/active admit; explicit empty/read-only/expired/suspended sales deny all three writes with unchanged saved cart and denial audits. Retained read and actual service closure pass in every case. `cart-access-v130-after-d95718cd-5592-4139-b722-450a357c8fb6.json`, receipt `7469b3`. |
| Concurrent cart regression | Insufficient stock leaves cart unchanged, closed shift denies edits, two controlled concurrent additions both survive serialization retry, final quantity 3. `pos-cart-v130-concurrency-after-7453946f-e08e-4a3b-aff3-85939c8f73c9.json`; recovered completed report receipt `695d67`. |
| Final real browser | Actual EN/FR sign-in and three denied edits; quantity draft 3 retained while saved quantity remains 1; grant change does not submit; explicit keyboard retry saves 3; on-hand stays 20; service closure after restriction. Six screenshots at 1440/768/320px; no page errors. `cart-access-browser-v130-291b8d6b-6ef3-4908-a407-a3e423c639ef.json`; recovered completed report receipt `695d67`. |
| Final focused tests | 65 tests / five suites passed, receipt `2d0be3`. |
| Final typecheck | Passed, receipt `e32580`. |
| Final changed-file lint | Eight TypeScript files passed, receipt `7f8d26`. |

Runtime files above are under `lanes/environment/`. First browser run `cart-access-browser-v130-176895aa-6d25-4e69-afed-6d7d0b793e7e.json` passed recovery but preceded the stock-display correction; retained as historical evidence. Final source hashes match before/after the final browser. Development navigation-to-ready observations are EN 10,087 ms and FR 11,329 ms; these do not establish production performance or an approved budget. Controlled service concurrency is not a multi-browser race claim. A lost terminal handle was resolved from the completed, source-bound report rather than rerunning mutations.

Evidence publishing first failed because the sandbox denied writing the source-baseline file (`8847d6`, EPERM). The subsequent publisher exited before mutation because that baseline did not exist (`f82996`). These are evidence-output failures, separate from passed functional checks; the source capture and publisher were retried with narrow workspace write authorization.

Commands use the bundled Node runtime. Final test command: `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/cart-write-access.test.ts services/pos/__tests__/pos-cart-transaction.test.ts services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/cart-write-access.actions.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`. Typecheck: `node node_modules/typescript/bin/tsc --noEmit --pretty false`. Lint: `node node_modules/eslint/bin/eslint.js services/pos/cart-write-access.ts services/pos/pos.service.ts actions/pos/cart.actions.ts components/pos/ProfessionalPOSSystem.tsx hooks/posHooks/usePosOperations.ts services/pos/__tests__/cart-write-access.test.ts services/pos/__tests__/pos-cart-transaction.test.ts actions/pos/__tests__/cart-write-access.actions.test.ts`. Database/browser verifiers: `verify-cart-access-v130.cjs --after`, `verify-cart-access-browser-v130.cjs`, `verify-pos-cart-concurrency-v130.cjs --after`, all under `lanes/environment/`.

## User and operator procedure

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. If an edit is denied, leave the quantity draft in place and ask the authorized administrator to review the organization's current POS and required sales access. They need the organization, affected cashier, time of failure, grant validity/read-only/dependency state and authorized grant provenance, obtained from current tenant membership and module records. This report supplies no approval or commercial entitlement. After an authorized correction, explicitly retry the intended edit and confirm the saved quantity. Restoring access does not itself submit the draft. Cart inspection and shift closure remain subject to their normal authority.

Do not copy fixture database edits to production. POS/sales stop controls are still unsupported in the existing stop-policy workbench pending offline continuation, as qualified in v129. No new user input is required for continued local engineering.

No migration, deployment, subscription purchase or X1 clearance occurred. Release guard/service/action/UI/localization together through existing controls. Prefer forward correction or presentation rollback retaining authority enforcement; reverting the guard reopens the reproduced defect. Production recovery rehearsal remains outstanding. Keep audit/history and authorized retained access intact.

## Review accountability and unfinished boundaries

Architecture/backend: transaction-owned draft policy and existing evaluator reused. Database: rollback, audit and concurrency verified, no schema changes. IAM/privacy: trusted action scope and current permission retained; no new grant disclosure. Finance/controls: no stock/payment/journal effect from draft edits; checkout/reversal continuity remains unverified here. UX/localization: retained draft, inline EN/FR recovery, accurate stock, responsive screenshots and explicit keyboard retry. QA/SRE: final source bindings, focused regressions, measured development latency and explicit limitations. API/events/audit: stable action code and denial record; downstream audit delivery unverified. SaaS/product/support: clear distinction between eligibility and configuration, no simulated customer activation.

Statutory/country packs, HRIS/payroll, purchasing/AP, analytics, AI/agents and external providers: not applicable to this patch because their rules and transports are unchanged; all remain in the overall platform review. These are engineering reviews, not professional approvals.

Still open: durable identity for unknown-outcome additive retries; sale commit/refund/void/idempotent replay across grant changes; terminal administration policy; full cart-to-checkout and offline lifecycle; native accessibility and remaining platform workflows. None is relabeled an external decision or passed workflow. Coverage remains provisional and the platform goal remains active.
