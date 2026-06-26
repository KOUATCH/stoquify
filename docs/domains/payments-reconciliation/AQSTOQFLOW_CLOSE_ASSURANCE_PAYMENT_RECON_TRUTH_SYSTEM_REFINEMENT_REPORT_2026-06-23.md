# AqStoqFlow Close Assurance And Payment Reconciliation Truth-System Refinement Report

Date: 2026-06-23

Repository: `E:\ohada saas\newStockFlow\aqstoqflow`

Mode: local, non-destructive, code-focused architecture and product-quality inspection.

Skills used:

- `architect`
- `018-aqstoqflow-close-assurance-audit`
- `01-payment-recon-readiness-audit`
- `payment-reconciliation-moat`

## Executive Summary

Close assurance and payment reconciliation are correctly positioned as backbone truth systems in AqStoqFlow. The current codebase already has a real evidence architecture: provider events, statement files and lines, payment transactions, match records, suspense items, payment exceptions, reconciliation runs, signed reconciliation certificates, close runs, close checklist items, close findings, close evidence items, close pack exports, ledger posting batches, accounting source links, business events, proof trails, evidence grades, workflow assurance checks, and owner/manager snapshots.

Verdict: `GO_WITH_ENFORCEMENT_GATES`.

The system is strong enough for controlled operator use and internal evidence-grade workflows. It should not yet be marketed as fully externally certified provider/bank/statutory assurance until real provider onboarding, production statement channels, credential lifecycle, browser smoke, runbooks, and enforce-mode pilots are complete.

The best refinement direction is not a rebuild. It is to harden the last mile:

- make payment truth the daily cash-control loop;
- make close assurance the final period-trust gate;
- promote selected observe-mode assurance checks into enforce-mode;
- align UI permissions with read/run/sign/export separation;
- add real provider and statement channels;
- standardize source freshness, evidence grade, and proof trail drilldowns across every dashboard number.

## Current Verification Snapshot

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- services/payments/__tests__/payment-reconciliation.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payments/__tests__/statement-import.service.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/accounting/__tests__/periods.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts --runInBand` | PASS | 10 suites, 53 tests. |
| `npm test -- services/assurance/__tests__/assurance-registry.service.test.ts services/evidence/__tests__/evidence-grade.service.test.ts services/evidence/__tests__/proof-trail.service.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts --runInBand` | PASS | 5 suites, 52 tests. |
| `node scripts\workflow-assurance-release-gate.js --mode report` | PASS/report | 33/33 checks ready, 6/6 indexes ready, 2/2 engine-health gates ready, 0 static blockers. |
| `npm run service:boundary` | PASS/report | 0 active service-boundary findings. |
| `npm run error:boundary` | PASS/report | 0 active unsafe raw-error findings. |
| `npm run inventory:boundary` | PASS/report | 0 active inventory boundary findings. |
| `npm run prisma:validate` | PASS | Prisma schema valid; `prisma.config.ts` detected. |
| `npm run typecheck` | PASS | TypeScript completed. |
| `npm run lint` | PASS with warnings | 0 errors, 5 warnings unrelated to this slice. |

Current lint warnings:

- `components/auth/EmailVerificationForm.tsx`: missing hook dependencies.
- `components/dashboard/items/ModernItemFormForEditing.tsx`: `<img>` warning.
- `components/frontend/custom-carousel.tsx`: `<img>` warning.
- `components/ui/groups/inventory/ItemManagement.tsx`: `<img>` warning.
- `config/permissions.ts`: anonymous default export warning.

## Language Locked

- Payment truth: the reconciled state proving internal payment records, provider/bank/cash evidence, and ledger posting agree.
- Close assurance: the period-end control layer proving the books can be trusted, exported, certified internally, or blocked with evidence.
- Certified: system evidence certification only, unless a real statutory authority adapter, expert review, and jurisdictional approval are present.
- Suspense: an itemized, owned, SLA-bound unresolved money position, not a dumping account.
- Evidence grade: the system's trust label for whether a result is raw, operational, reconciled, certified, or blocked.

## Current Close Assurance Architecture Map

```text
AccountingPeriod
  -> getPeriodClosePreflight()
  -> ledger reconciliation + source-link checks
  -> payment reconciliation dashboard data
  -> suspense and exception counts
  -> inventory class 3 / valuation assurance
  -> compliance and data-trust evidence
  -> runCloseAssurance()
  -> CloseRun + CloseChecklistItem + CloseAssuranceFinding + CloseEvidenceItem
  -> assignment/comment/waiver/accountant review workflow
  -> exportClosePack()
  -> certified ClosePackExport when gates pass
  -> recordCloseCertificationInvalidation() when evidence becomes stale
  -> close readiness snapshots / owner and manager surfaces
```

Key files:

- `services/accounting/periods.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `actions/accounting/close-assurance.actions.ts`
- `hooks/accounting/useCloseAssurance.ts`
- `components/accounting/CloseAssuranceCenter.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx`
- `services/snapshots/close-readiness-snapshot.service.ts`
- `services/evidence/evidence-grade.service.ts`
- `services/evidence/proof-trail.service.ts`

Important current controls:

- Period close preflight blocks on draft journals, unresolved posting batches, unlinked posted entries, open payment reconciliation exceptions, open payment suspense, unsigned reconciliation runs, and trial-balance imbalance.
- Close assurance persists checklist, findings, evidence items, comments, reviews, and ledger audit events.
- Certified close pack export requires `accounting.close.certify`, fresh auth, a clean close run, no unavailable evidence, no open high/critical findings, and no unsigned reconciliation evidence.
- Close waiver approval blocks same-actor approval.
- Close pack exports include explicit limitations that statutory filings still require qualified expert validation.
- Certification invalidation emits `close.certification.invalidated` business events and marks certified exports/runs stale.

## Current Payment Reconciliation Architecture Map

```text
Provider callback / statement file / internal payment
  -> adapter verification and parsing
  -> ProviderEvent / StatementFile / StatementLine / PaymentTransaction
  -> PaymentReconciliationInboxItem
  -> runPaymentReconciliation()
  -> MatchRecord, PaymentException, SuspenseItem
  -> durable reconciliation dashboard
  -> suspense assignment/proposal/posting workflow
  -> signReconciliationRun()
  -> certificateHash + certificatePayload
  -> exportReconciliationCertificate()
  -> proof trail / evidence grade / payment truth snapshot
  -> close assurance blockers and close evidence
```

Key files:

- `services/payments/provider-event.service.ts`
- `services/payments/statement-import.service.ts`
- `services/payments/adapters/mobile-money-hmac.adapter.ts`
- `services/payments/payment-reconciliation.service.ts`
- `services/payments/payment-reconciliation-workbench.service.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/reconciliation/payment-suspense-workflow.service.ts`
- `services/reconciliation/payment-reconciliation-dashboard.service.ts`
- `actions/payments/reconciliation.actions.ts`
- `actions/payments/reconciliation-workbench.actions.ts`
- `hooks/payments/usePaymentReconciliationDashboard.ts`
- `hooks/payments/usePaymentReconciliationWorkbench.ts`
- `components/finance/PaymentReconciliationWorkbench.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx`
- `services/snapshots/payment-truth-snapshot.service.ts`

Important current controls:

- HMAC signature verification and timestamp tolerance exist in the mobile-money adapter.
- Provider events persist raw payload hashes, signature hashes, idempotency keys, and tamper/duplicate detection.
- Statement imports persist file hashes, line fingerprints, duplicate-file detection, duplicate-line detection, and inbox events.
- Reconciliation runs create explainable auto matches and itemized suspense for orphan statement/provider/internal records.
- Manual match approval blocks same-actor maker/checker approval.
- Reconciliation sign-off requires a ready run, provider events or statement lines, no open exceptions, no open suspense, and posted suspense items linked to ledger posting batches.
- Certificate export requires a signed run and creates a watermarked JSON certificate export with a payload hash.
- Payment truth snapshots expose critical exceptions, open suspense, ready/signature counts, freshness, and evidence grade.

## What Works Well

The core schema is strong. `prisma/schema.prisma` includes durable payment evidence, reconciliation evidence, close evidence, ledger evidence, business events, outbox, and audit models. This gives the product enough structure to produce proof instead of vague financial dashboards.

The service boundary is currently clean. `npm run service:boundary` reports 0 active direct Prisma/action-owned mutation violations in scanned runtime boundaries. This is essential because these truth systems cannot be trusted if UI, hooks, pages, or actions bypass service-owned read/write methods.

Payment ingestion is evidence-aware. Provider callbacks are not immediately trusted as truth. They are verified, hashed, persisted, classified, and routed through inbox/business-event evidence.

Payment matching is explainable. Duplicate provider references, missing provider references, unmatched provider lines, amount mismatches, settlement shortfalls, and fee drift are not silently absorbed. They become failures and suspense candidates.

Close assurance composes multiple truth domains. It reads accounting periods, ledger reconciliation, payment reconciliation, suspense, data trust, inventory valuation, and compliance evidence. Missing or unavailable data is represented as unavailable/blocking instead of being treated as zero.

RBAC is granular. The permission catalog separates reconciliation read, run, import, match, override, exception assignment, suspense proposal, suspense posting, sign-off, and certificate export. Close permissions similarly separate read, run, finding assignment, comments, waiver request, waiver approval, certify, export, and accountant review.

Critical actions require stronger controls. Payment sign-off, certificate export, suspense posting, close waiver approval, and certified close pack export require fresh auth or service-side sensitive-action checks.

The product has a usable operator surface. `PaymentReconciliationWorkbench` combines capture-readiness workbench data with durable dashboard data, sign-off, certificate export, suspense workflow, and reconciliation inbox lanes. `CloseAssuranceCenter` exposes checklist, findings, evidence, comments, reviews, controls, and export actions.

Workflow Assurance is wired. The static release gate reports 33/33 checks ready, including payment reconciliation exception SLA, suspense owner, unmatched provider event visibility, unsigned-run SLA, certificate-source hash checks, and close certified-pack evidence freshness.

## What Is Incomplete Or Risky

### 1. External certification is not complete

The repo has provider/statement evidence architecture, but production certification still depends on real provider onboarding, real bank/mobile/card statement channels, credential rotation, outage monitoring, and deployment-specific acceptance evidence. The system should keep using "system-certified evidence pack" language, not statutory or external-provider certification language.

### 2. Workflow Assurance is ready statically, not enforced operationally

`node scripts\workflow-assurance-release-gate.js --mode report` says the static gate is ready, but the check definitions remain observe-mode. The command explicitly says it does not run tenant checks, mutate tenants, or enable enforce mode. This is the correct current posture, but the next professional step is ring-based enforcement.

### 3. Module entitlement is observe-mode

`services/modules/module-control-contracts.ts` sets module control to observe mode. `payment_reconciliation` and `close_assurance` exist in the module catalog, and tests confirm observe mode can mark would-block without denying. For an enterprise SaaS, payment reconciliation and close assurance should eventually require both permission and module entitlement.

### 4. Reconciliation page view permission is too strong

The finance reconciliation sidebar and workbench read action currently use `payments.reconciliation.run` for access. That is safe in the sense that it is restrictive, but it is not ideal. Viewing evidence should require `payments.reconciliation.read`; starting a run should require `payments.reconciliation.run`; signing/exporting/posting should require their own critical permissions.

### 5. Close invalidation is represented but not yet universal

`recordCloseCertificationInvalidation()` exists and emits durable invalidation evidence. The next hardening step is to call it from every domain that can change certified truth after close capture: payment reconciliation, provider statement imports, suspense posting, ledger posting/reversal, inventory valuation changes, payroll runs/payments, compliance/fiscal submissions, permissions, and country-pack changes.

### 6. Runbooks and recovery paths need productization

The code has strong services and tests, but the product still needs operational runbooks for provider outage, duplicate file import, replayed callback, certificate hash drift, stale close pack evidence, suspense rollback, and failed close certification.

### 7. UX should make trust state impossible to miss

The system has evidence grade and proof trail services. The UI should make those first-class: every dashboard number should show freshness, source count, evidence grade, proof trail link, and next action.

## Critical Risks And Trust Gaps

| Risk | Severity | Evidence | Recommended control |
| --- | --- | --- | --- |
| External provider/bank truth not production-proven | High | Architecture exists, but production provider onboarding and statement channels remain required. | Create provider readiness checklist per rail with credentials, signature policy, statement import, outage SLA, test fixtures, and acceptance evidence. |
| Observe-mode checks may not stop bad close/payment operations | High | Workflow Assurance definitions are `enforceMode: false`. | Promote selected checks in rings after seeded failures and browser smoke. |
| Module entitlement does not hard-deny close/payment access | High | Module control mode is `observe`. | Integrate module entitlement into `protect` for close/payment routes and actions, beginning with read-only telemetry then selected enforcement. |
| Close certification may become stale after downstream changes | High | Invalidation service exists, but universal hooks are still the next hardening target. | Add invalidation hooks across payment, ledger, inventory, payroll, compliance, country-pack, and permissions changes. |
| Operators may confuse workbench diagnostics with certification | Medium | The page includes both workbench and durable evidence surfaces. | Visually separate "capture diagnostics" from "signed evidence" and make evidence grade prominent. |
| View permission requires run capability | Medium | Sidebar/workbench uses `payments.reconciliation.run`. | Change view/read surfaces to `payments.reconciliation.read`; keep run/sign/export/post as elevated actions. |

## Enterprise-Grade Target Architecture

The target architecture should make payment reconciliation and close assurance a single trust loop:

```text
Every money movement
  -> provider/bank/cash evidence
  -> internal payment transaction
  -> ledger posting/source link
  -> reconciliation run
  -> match/suspense/exception
  -> signed certificate or visible blocker
  -> close assurance evidence
  -> close pack certification or close blocker
  -> owner/accountant dashboard with proof trail
```

Enterprise invariants:

- No payment reaches trusted status without provider/bank/cash evidence or an explicit suspense/exception case.
- No reconciliation run is signed with open exceptions, open suspense, missing external evidence, or unposted suspense.
- No certified close pack is produced with unavailable evidence, open high/critical findings, unsigned reconciliation evidence, stale inventory valuation, failed business events, or missing ledger source links.
- No close certification remains valid after material payment, ledger, inventory, payroll, compliance, or permission/country-pack changes.
- No dashboard number is displayed without source tables, source count, freshness, evidence grade, and proof trail.

## Data Model And Service Improvements

1. Add a `CloseCertificationInvalidationSource` catalog or typed enum so invalidations are queryable by domain, not just free-form metadata.
2. Add a service-owned "truth dependency graph" linking close runs to reconciliation runs, payment transactions, suspense items, ledger batches, inventory valuation annexes, payroll runs, compliance submissions, and fiscal documents.
3. Add evidence freshness windows by domain. Example: payment statement evidence may expire after the next provider settlement window; close readiness may expire after any new posting in the period.
4. Add provider-account health state: fresh, stale, outage, credential-expiring, statement-missing, callback-failing.
5. Add reconciliation-run source hash recomputation as a scheduled check and before certificate export.
6. Add materiality thresholds per organization, currency, and role so low-value suspense can be routed differently without bypassing close blockers.
7. Add external adapter conformance records showing which rails are sandbox, pilot, production, or disabled.

## Event, Audit, Ledger, And Evidence Standards

Every payment reconciliation and close assurance command should produce:

- actor ID and organization ID;
- permission decision;
- module entitlement decision;
- idempotency key;
- correlation ID;
- business event or explicit no-event reason;
- ledger posting/source link or explicit no-ledger-impact reason;
- source document link or source hash;
- audit event;
- evidence grade;
- close invalidation decision;
- user-safe typed error on failure.

Recommended event names:

- `payment.provider_event.captured`
- `payment.provider_event.rejected`
- `payment.statement.imported`
- `payment.reconciliation.run.completed`
- `payment.reconciliation.exception.created`
- `payment.reconciliation.suspense.created`
- `payment.reconciliation.suspense.posted`
- `payment.reconciliation.signed`
- `payment.reconciliation.certificate.exported`
- `close.assurance.run.completed`
- `close.finding.assigned`
- `close.finding.waiver.requested`
- `close.finding.waiver.approved`
- `close.pack.exported`
- `close.pack.certified`
- `close.certification.invalidated`

## UX And Operational Workflow Improvements

The daily user experience should be role-specific:

- Finance manager: "cash truth today" with unresolved suspense, unsigned runs, stale provider accounts, missing statements, and sign-off queue.
- Accountant: "period close readiness" with blockers, evidence coverage, source links, close pack status, and certification invalidation.
- Owner: "can I trust the numbers?" with payment truth, close readiness, inventory cash, and action links.
- Branch manager: "what must I fix before end of day?" with POS/cash drawer/reconciliation exceptions.

Recommended UI refinements:

1. Show evidence grade next to every major KPI.
2. Add proof trail drilldowns for each signed run, suspense item, close finding, close evidence item, and close pack export.
3. Separate capture diagnostics from signed/certified evidence using clear labels.
4. Add stale-state banners when statements, provider events, snapshots, or close runs are outdated.
5. Add "why blocked" explanations using the exact failing gate and source table.
6. Add manager action links for each unresolved exception and close blocker.
7. Add a close readiness timeline: run created, evidence captured, findings assigned, waiver requested/approved, exported, certified, invalidated.
8. Add export watermarks and row counts in the UI before download.

## Performance And Reliability Recommendations

- Keep reconciliation dashboards on service-owned read models; avoid live ad hoc joins in components.
- Add indexes for provider account + date + status hot paths where not already present.
- Cache dashboard reads by organization, period, permission, evidence grade, and as-of timestamp.
- Use background jobs for large statement imports and high-volume provider event replay.
- Add import chunking for large statement files.
- Add circuit breakers and retry policy for provider callbacks and statement ingestion.
- Add run dedupe so two operators cannot create conflicting reconciliation runs for the same provider account/date.
- Add health metrics: provider event lag, statement lag, run age, suspense age, certificate hash drift, close evidence age.

## Security, RBAC, And Tenant-Isolation Recommendations

1. Change read-only finance reconciliation surfaces to `payments.reconciliation.read`.
2. Keep run/import/match/override/suspense/sign/export permissions separate.
3. Add module entitlement enforcement for `payment_reconciliation` and `close_assurance` after observe telemetry stabilizes.
4. Keep fresh auth on certificate export, sign-off, suspense posting, close waiver approval, and certified close pack export.
5. Add explicit anti-self-approval tests for close certification and reconciliation certificate export where not already covered.
6. Ensure raw provider payloads and credentials are never returned to UI or exported close packs.
7. Add rate limits and request-size limits around provider event capture and statement import routes.
8. Add legal hold/retention policies for provider events, statements, reconciliation certificates, close packs, and audit events.

## 30-Day Roadmap

1. Align reconciliation read surfaces to `payments.reconciliation.read`.
2. Add module-entitlement observe telemetry directly to close/payment action wrappers.
3. Add provider-account health cards and stale statement/provider event warnings.
4. Add close invalidation hooks from payment reconciliation sign/export, statement import, provider event capture, and suspense posting.
5. Add proof trail links to signed reconciliation runs, suspense items, close findings, and close pack exports.
6. Add browser smoke tests for `/dashboard/finance/reconciliation` and `/dashboard/accounting/close`.
7. Save a before/after gate report and keep service-boundary/raw-error/inventory boundary at zero.

## 60-Day Roadmap

1. Promote selected payment reconciliation Workflow Assurance checks from observe to enforce for pilot tenants.
2. Implement provider rail readiness records for mobile money, bank, card, cash drawer, and settlement accounts.
3. Add statement import job queue, retry, and operator recovery lane.
4. Add close certification stale-source recomputation before export and on scheduled scans.
5. Add exception trend scoring for providers, branches, operators, and high-risk rails.
6. Add PDF or jurisdiction-specific certificate export if required by deployment jurisdiction.
7. Add runbooks for callback replay, duplicate statement file, certificate hash drift, and close invalidation.

## 90-Day Roadmap

1. Move module entitlements from observe to enforce for close/payment production tenants.
2. Establish real provider onboarding for target rails with credentials, signature contracts, and statement formats.
3. Add external authority/accountant review workflow for certified close packs.
4. Add settlement/bank balance tie-out: provider/bank closing balance equals ledger treasury plus itemized suspense.
5. Add full close certification invalidation mesh across inventory, payroll, purchasing/AP, payments, compliance, ledger, permissions, and country packs.
6. Add tenant-volume scheduler evidence before turning broader assurance checks to hard gates.
7. Make `verify:repo` include the selected enforce-mode close/payment gates once pilot evidence is stable.

## Quick Wins

1. Change Finance > Reconciliation sidebar permission from `payments.reconciliation.run` to `payments.reconciliation.read`.
2. Change `getPaymentReconciliationWorkbenchAction` to require read permission for read-only dashboard data.
3. Add a visible "System evidence only; not statutory certification" label beside certified close pack export.
4. Show `providerEvidenceAvailable`, `statementEvidenceAvailable`, signed run count, open suspense amount, and close blocker count in one compact trust banner.
5. Add a "why blocked" drawer that lists exact blocker source tables and next actions.
6. Add a scheduled check for stale provider accounts with no recent statement or callback evidence.
7. Add close invalidation on payment statement import and reconciliation certificate hash drift.
8. Add a report section listing all evidence hashes included in a certified close pack.

## Long-Term Moat Opportunities

- Daily cash truth autopilot: reconcile every provider account daily and route exceptions to owners before close.
- Accountant trust pack: export a source-linked, redacted, watermarked package covering ledger, payments, inventory, payroll, compliance, and close evidence.
- Provider reliability scoring: rank rails and branches by late callbacks, stale statements, drift, duplicates, and unresolved suspense.
- Close readiness journey: guide accountants from blocker to evidence to certification, with no hidden manual checklist.
- Owner trust briefing: show "trusted / partial / blocked" for cash, inventory, receivables, payables, payroll, compliance, and close.
- Regulatory adapter marketplace: plug in country-pack and provider-specific statement/certificate adapters without changing the reconciliation core.

## Testing And Verification Strategy

Core tests to keep mandatory:

```powershell
npm test -- services/payments/__tests__ services/reconciliation/__tests__ services/accounting/__tests__/periods.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts --runInBand
npm test -- services/assurance/__tests__/assurance-registry.service.test.ts services/evidence/__tests__/evidence-grade.service.test.ts services/evidence/__tests__/proof-trail.service.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand
npm run service:boundary:fail
npm run error:boundary:fail
npm run inventory:boundary:fail
npm run prisma:validate
npm run typecheck
npm run lint
```

Tests to add next:

- Browser smoke for reconciliation sign/export/suspense workflow.
- Browser smoke for close run/export/certify/invalidation workflow.
- Provider outage fixture.
- Duplicate statement replay fixture.
- Certificate hash drift fixture.
- Close invalidation fixture after payment statement import.
- Module-entitlement denial fixture for payment/close when permission is present but module is disabled.
- High-volume statement import performance fixture.

## Clear Next Implementation Slice

Run a focused `payment-close-trust-surface-hardening` slice:

1. Align reconciliation read permissions.
2. Add close invalidation hooks from payment statement import, provider event capture, reconciliation sign/export, and suspense posting.
3. Add visible evidence-grade/proof-trail links to the reconciliation and close dashboards.
4. Add seeded browser smoke tests for the two pages.
5. Promote one payment reconciliation check to enforce-mode for a pilot fixture only.
6. Rerun focused tests, boundary gates, Prisma validation, typecheck, lint, and the Workflow Assurance release gate.

Success criteria:

- No service-boundary or raw-error regressions.
- Payment and close focused tests pass.
- The UI clearly distinguishes operational diagnostics, reconciled evidence, certified system evidence, and statutory/external certification limits.
- At least one close/payment assurance rule is proven enforceable in a controlled test without enabling broad production enforcement.
