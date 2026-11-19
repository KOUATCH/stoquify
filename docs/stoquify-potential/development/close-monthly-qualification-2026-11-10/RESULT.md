# Mixed-payment monthly close and authenticated collection — 10 November 2026

Status: **LOCAL SCOPE QUALIFIED; PRODUCTION DEPLOYMENT BLOCKED**. Confirmed provider receipts can now fund customer collections through the existing accounting posting. The final database case qualifies an opening-receivable month with cash, mobile-money and bank collections. Real application checks qualify a linked collection, password verification, permission removal and session revocation. Hosting and the public domain remain undecided; required live statement delivery and accountant invitations remain production gates.

The [final evidence admission](FINAL_QUALIFICATION.json) checks current source, separate verification layers, the exact application/browser run chain and cleanup. This report does not qualify a production artifact or grant statutory approval.

## Changes and ownership

| Area | Implemented behavior | Owning files |
| --- | --- | --- |
| Customer collection | Optional native provider receipt, exact amount/currency/rail/account checks, one atomic claim linked to the existing posting batch, canonical source/audit evidence and historical replay | `services/accounting/customer-settlement.schemas.ts`, `services/accounting/customer-settlement.service.ts`, `services/payments/customer-settlement-payment-authority.service.ts` |
| POS/payment authority | Reuses existing provider verification. Sorted unique native receipt locks precede POS stock publication. A receipt already claimed by POS or a customer collection cannot fund the other workflow | `services/payments/pos-electronic-tender-authority.service.ts`, `services/pos/pos.service.ts` |
| Concurrency | Customer collections retry the complete transaction for Prisma serialization errors and raw PostgreSQL serialization/deadlock codes. Exhaustion returns a conflict; unrelated database errors retain their failure behavior | Same collection/payment services |
| Receivables interface | Manual entry remains the default. An explicit confirmed-receipt choice fills amount/reference/date and shows a wrapped account/reference/amount summary. Editing financial fields clears the link; uncertain outcomes retain the exact command for manual retry | `services/accounting/customer-settlement-workbench.service.ts`, `actions/finance/customer-settlement.actions.ts`, `components/finance/CustomerSettlementControls.tsx` |
| Authority and privacy | Current collection permission governs receipt previews. Command/read denials clear stale payment data; actor/document changes and unmount fence late responses. Password verification requires an explicit retry | Same workbench/action/component files |
| Compiler | Removes three unreachable duplicate error-code comparisons. Archived `plans/**/source-before/**` copies are excluded from application compilation, consistent with existing preservation-copy exclusions | Component and `tsconfig.json` |

The new linkage creates no second financial posting. Existing manual command hashes retain their prior shape when no native receipt is supplied. A bookkeeping reversal retains the original provider claim and does not perform a provider refund. No schema change or root Prisma generation was needed for these changes. Unrelated working-tree edits were preserved; nothing was staged or committed.

## Verification

| Evidence class | Final result | Scope and limits |
| --- | --- | --- |
| Mocked backend | [155 passed](unit-320cb51326/verification.json), zero skipped | Four suites, five product/schema files, tests, runner and configuration bound before/after. Tests cover authority, claims, replay, lock placement and retry behavior; they do not prove real concurrency |
| Mocked workbench/actions | [76 passed](ui-unit-2d2e071850/verification.json), zero skipped | Projection, tenant/permission boundaries and command adapters; persistence/auth dependencies mocked |
| Component jsdom | [22 passed](ui-unit-7beb0ed572/verification.json), zero skipped | Selection, exact recovery, fresh authentication and denial/scope fences; mocked actions |
| Rendered components | [48 recorded cases](rendered-ui/RENDERED_COLLECTION_REPORT.md) | Twelve behaviors × EN/FR ×390/1440 with real components/styles and mocked actions/auth. Zero external requests, page/console errors or overflow. Axe: zero violations; contrast incomplete |
| Real PostgreSQL 17 | [Eight cases passed](pg-attempt-54a799a9fc/pg-monthly-close-tests.summary.json), zero skipped; fresh 122-migration replay twice | Actual opening, collections, native claims, denial/rollback/contention, reconciliation, approvals, internal certification, retention and seal. SQL inventory remained 142 triggers /231 CHECKs /76 functions |
| Whole-project compiler and focused lint | [Passed](static-c519a9b3bf/verification.json) | TypeScript without emit/incremental output; eight-file lint: zero errors, two React-hook warnings. Twelve bound source/config/schema/lock inputs unchanged; explicit private schema-122 client types |
| Actual authenticated application | [Seven checks and six controller operations passed](authenticated-app/AUTHENTICATED_COLLECTION_REPORT.md) | Real password login/session, provider selection, password verification/manual retry, one linked collection, collection permission removal/restoration and revoked-session command/read denial. Source-bound English Next development app; no action/auth mocks |

The three Jest batches contain **253 executions across seven distinct suite files**. Earlier passes and repeated runs are not added to this total. The 48 rendered executions overlap semantically with unit cases and are a separate evidence layer.

## Earned monthly close

The primary synthetic client is configured for Cameroon/XAF. Its stored October period is exactly **2026-10-01 00:00:00.000 UTC through 2026-10-31 23:59:59.999 UTC**. Its approved Africa/Douala opening cutover falls in the preceding stored September period. This fixture does not establish accountant acceptance of production period/calendar configuration.

An actual reviewed opening cutover creates AR300/equity300. October collections of cash100, mobile-money100 and bank100 extinguish that receivable. Both electronic collections claim their native confirmed transaction and link it to their original journal batch. Exact replay adds no second settlement or journal.

Assessment remains BLOCKED/T2 before evidence and after the two independently signed full-period reconciliations alone. Actual independent bank-balance approval and opening-aware balance-sheet schedules then earn READY/T4, accountant review, one internal certified export and one October seal. The original retained bytes recover exactly. A real manual-journal command proves closed-period write denial. The separate attempted collection is denied without effects, but its first guard is not attributed to the closed period because the receivable is already paid.

Primary counts: **four journals** (one September opening and three October collections), **three settlements**, **two native provider claims**, **two signed reconciliations**, **one approved bank-balance item**, **one internal certified export**, **one CLOSE**, **zero REOPEN**, **zero sales/payroll runs/statutory certified documents**. The [sanitized executed summary](pg-attempt-54a799a9fc/pg-monthly-close-service.sanitized.summary.json) records the bounded outcomes.

Provider CONFIRMED/PROCESSED/signature-valid observations are explicitly synthetic external input facts. The initial APPROVED settlement mapping is independently attributed fixture configuration. Upstream provider authenticity, mapping-onboarding history and live processing were not earned. Reconciliation signatures, opening approval/application, bank/schedule approvals and internal close states were earned through their existing owners. Statutory status remains `STATUTORY_BLOCKED` / `AUTHORITY_NOT_CONFIGURED`.

## Stock contention and rollback

A separate November auxiliary client earns opening AR600 plus two stock units at cost10/value20, balanced against equity620. Its stock quantity and weighted-average valuation come from the actual opening owner, rather than direct inventory state insertion.

Actual POS and customer collection commands compete for one native receipt. **POS wins** in the retained run: quantity2→1 and value20→10, one stock issue, two posted journals and COGS10/Inventory10 in the sale journal. The competing collection returns `CONFLICT` and leaves no partial financial or inventory effect. Two distinct customer collection commands competing for another receipt likewise produce exactly one winner. An injected failure reaches the native claim once, then rolls back the complete financial/native/inventory snapshot.

This is observed real contention, not proof of every possible interleaving or execution of both raw SQLSTATE retry branches. The latter have focused mocked coverage. Positive stock/COGS evidence belongs to this November auxiliary client; the primary October close has no stock activity or new sale. The monthly case does not repeat reopening/recertification; the previous cash-only lifecycle remains separate historical evidence.

## Real application and cleanup

The actual application uses the frozen **4,400-file** source manifest `1ccc2522b476470ac0a1fe2a7da9ed82ec36ef49ad806cb6a704c89861dbecff`, previously qualified locked dependencies and an explicit private Prisma client override. It is a development runtime, with no new clean dependency install or production artifact.

The UI posts exactly one MM100 collection against the auxiliary opening receivable: unpaid/balance500→400, one new settlement/journal, one allocation, the original native receipt pointing to that same batch, and matching source/business-event evidence. Real password verification has no financial effect until the operator manually retries. Collection permission removal clears the stale draft and yields a fresh read-only view; restoration permits a new draft. Revoking the current session denies both the subsequent command and read. Neither denial creates another financial effect.

The primary October financial fingerprint, retained canonical database bytes and private pack file remain unchanged. The [runtime receipt](authenticated-app/runtime-a912af197f/RESULT.json) confirms role restoration, browser/context/profile cleanup, stopped application/proxy/PostgreSQL and released application ports. Actual browser page/console errors and external requests are zero. Screenshots show the real drawer/overview; the inner-scroll payment form is clipped in the selection screenshot, so its visible-selection proof comes from the separate rendered fixture, while actual selection/posting proof comes from DOM checks and database assertions.

The synthetic support file is selected and hashed locally. This establishes a fingerprint, not server upload, original-document custody or live provider authenticity. Credentials, session tokens, support contents and raw application diagnostics remain private.

## Preserved evidence and production boundary

All preliminary failures and earlier valid scope-specific passes remain retained. The first monthly failure involved a fixture's wrong expected segregation-of-duties code and a dependent unsealed-period step; its database was preserved. The earlier nonstock eight-case pass remains historical. The final stock regression used a new absent database, with no old database reset/drop. The first authenticated attempt failed on local connection access before credentials/app/financial work; its [stopped retry admission](authenticated-app/RUNTIME_RETRY_ADMISSION_1.json) binds the unchanged fixture and retry.

Historical expanded service summaries contain synthetic financial/source payloads. They remain byte-identical at their original paths because another program references their hashes; they are not described as counts-only or private. The [publication admission](SANITIZED_PUBLICATION_ADMISSION.json) records exact additional private copies and new strict sanitized supplements. No credential/session pattern was observed in those synthetic originals. Main publication uses the sanitized supplements.

The previous [production-preparation packet](../close-production-prep-2026-11-09/RESULT.md) and sealed Windows/x64 artifact remain historical and unchanged. That artifact does not contain these changes. No production database, provider send, host provisioning, migration promotion or deployment was performed.

| Remaining gate | Accountable role | Required next evidence |
| --- | --- | --- |
| Target and artifact | Platform/release lead | Selected host/region/runtime, owned public HTTPS origin, current platform-compatible build, protected exact-byte promotion |
| Database and recovery | Database operator + independent checker | Actual endpoint/history/adoption decision, protected secrets, hosted backup/PITR and measured accepted recovery drill |
| Required live delivery | Delivery/platform owner | Verified sender/domain, owned-test statement and invitation delivery, qualified worker package/schedule and recovery evidence |
| Domain/source acceptance | Accounting/data owner | Original statement custody, actual provider onboarding and independent acceptance of Cameroon/calendar/accounting configuration and system-evidence limits |
| Wider release controls | Existing program owners | Global release gates and remaining CA-06 assignee/composite-scope review; this packet does not advance unrelated program records |

Use the existing [production deployment runbook](../../../release/HARDENED_CLOSE_PRODUCTION_DEPLOYMENT.md). Keep unknown target facts null and retain the existing release gates. Local mixed-payment close qualification supplies development evidence for that review; it does not replace hosted, provider, statutory or independent acceptance.
