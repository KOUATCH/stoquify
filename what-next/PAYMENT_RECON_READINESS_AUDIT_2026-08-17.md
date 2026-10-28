# Payment reconciliation readiness audit — 2026-08-17

Skill: `01-payment-recon-readiness-audit`  
Executive verdict: **EVIDENCE CAPTURE READY FOR DEVELOPMENT; NOT CERTIFIED RECONCILIATION**

## Maturity classification

Stoquify is beyond capture-readiness. It has durable provider, statement, matching, suspense, exception, run, inbox, certificate and ledger-link models plus service-owned ingestion and reconciliation workflows. The current classification is **Evidence capture**.

It is not **Certified reconciliation** for production because no live provider/bank/mobile-money statement, production credential, real settlement receipt, provider conformance result, deployed production trigger proof, operational monitoring window, or artifact-bound independent sign-off was used in this run.

The live internal truth gate passes 14/14 at `2026-08-17T14:16:59.089Z`. That gate proves the repository control contract, not external settlement truth.

## Durable evidence already present

Prisma contains `PaymentRail`, `ProviderAccount`, `SettlementAccount`, `ProviderEvent`, `StatementFile`, `StatementLine`, `PaymentTransaction`, `MatchRecord`, `ReconciliationRun`, `SuspenseItem`, `PaymentException`, and `PaymentReconciliationInboxItem`.

Material invariants include organization scoping; provider-account and idempotency uniqueness; raw/redacted payload hashes; statement-file and line fingerprints; provider pending/confirmed/settled/failed/disputed states; match status and correction lineage; suspense ledger links; run maker/signer separation; certificate hashes; inbox leasing/retry/dead-letter state; archive/legal-hold fields; and currency/amount precision.

The legacy `Payment` model remains an operational read model and must not be mistaken for provider statement evidence.

## Existing service and UI boundaries

- `services/payments/provider-event.service.ts`: signed callback capture, timestamp tolerance, replay/tamper evidence, redaction, inbox enqueue and close invalidation.
- `services/payments/statement-import.service.ts`: provider-account validation, duplicate file/line handling, fingerprints, durable line capture and close invalidation.
- `services/payments/payment-reconciliation.service.ts`: matching and core reconciliation rules.
- `services/payments/payment-reconciliation-inbox-worker.service.ts`: leased, idempotent asynchronous processing.
- `services/payments/provider-operations.service.ts`: statement-to-run orchestration with independent signer enforcement.
- `services/payments/adapters/mobile-money-hmac.adapter.ts`: generic HMAC mobile-money sandbox-shaped adapter.
- `services/reconciliation/payment-reconciliation-run.service.ts`: run ownership and invariant evaluation.
- `services/reconciliation/payment-reconciliation-certification.service.ts`: sign-off, source-manifest binding and certificate export/recheck.
- `services/reconciliation/payment-reconciliation-evidence.service.ts`: durable/redacted evidence manifests.
- `services/reconciliation/payment-suspense-ledger.service.ts` and gateway: canonical suspense posting tied to ledger truth.
- `services/reconciliation/payment-suspense-workflow.service.ts`: assignment, proposed reclassification and maker-checker posting.
- `services/reconciliation/payment-reconciliation-dashboard.service.ts`: service-owned workbench read model, SLA/exception state and operational notices.
- `actions/payments/reconciliation.actions.ts`: protected import, run, manual match, suspense and sign-off commands.
- `app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx`: governed finance route.
- `PaymentReconciliationWorkbench.tsx`: workbench surface with certificate export/signing controls.

Graph evidence supports this boundary: general graph Community 32 groups core reconciliation functions; Community 38 groups manual match/exception/suspense flow; Community 43 groups statement/HMAC adapter functions; Community 96 groups provider-event capture; app communities expose the finance route; component reports identify the workbench and sign-off tests.

## Reusable platform primitives

- Organization-scoped Prisma access and service-owned mutations.
- Module entitlement and `payments.reconciliation.*` RBAC permissions.
- Fresh authentication for sign-off and suspense posting.
- Maker-checker separation for manual match, settlement mapping and signing.
- Ledger posting batches, open-period/close invalidation and source links.
- Audit/business events, correlation IDs, structured errors and redacted evidence.
- Idempotent webhook, statement file, line, inbox and notification keys.
- Immutable provider/statement economic evidence migration.
- Exception/suspense ownership, SLA deadlines, notifications and close blockers.
- EN/FR route and formatting foundations.

## Missing production proof and controls

No new durable evidence model is required for the first controlled provider pilot. The missing layer is production evidence and operations:

- provider-specific contract, state map and conformance fixtures;
- sandbox credentials in a managed vault and proven rotation/revocation;
- external webhook signature, replay, clock-skew and malformed-payload conformance;
- real-format statement samples and opening/closing balance controls where supplied;
- provider fee, tax/withholding, net/gross settlement and batch decomposition rules;
- settlement-account maker-checker approval tied to real ledger accounts;
- real settlement receipts and bank/provider statement tie-outs;
- chargeback, reversal, refund, failed-but-debited and succeeded-not-credited cases;
- production trigger deployment/runtime rejection proof;
- bounded retry/circuit-breaker/rate-limit and dead-letter operations;
- metrics, alert thresholds, daily ownership, incident escalation and recovery exercises;
- export watermarking/authorization and retention/legal-hold review;
- authenticated EN/FR keyboard/accessibility evidence for the current candidate;
- clean release freeze, migration approval and artifact-bound sign-off.

## Enterprise guardrail checklist

| Guardrail | State | Finding |
|---|---|---|
| Tenant scope | PASS | Models and services carry `organizationId`; negative tests exist |
| RBAC/entitlement | PASS_WITH_LIMITATIONS | Protected actions and route exist; production role provisioning still external |
| Fresh auth / SoD | PASS | Sensitive signing/posting paths require step-up and independent actors |
| Idempotency/replay | PASS | Provider, statement, inbox, notification and sign-off identities are durable |
| Signature/redaction | PASS_WITH_LIMITATIONS | Local HMAC and redaction controls exist; named provider conformance absent |
| Ledger/source links | PASS | Suspense and reconciliation connect to canonical posting truth |
| Period close | PASS | Late evidence invalidates certification and unresolved truth blocks close |
| Immutable source evidence | PASS_WITH_LIMITATIONS | Additive migration exists; production deployment/runtime proof blocked |
| Retries/dead letter | PASS_WITH_LIMITATIONS | Inbox state exists; production scheduler/alert exercises absent |
| Observability/alerts | GAP | No completed production monitoring windows or acknowledged external alerts |
| Provider contract | GAP | No named provider contract or certified state mapping bound to candidate |
| Settlement evidence | GAP | No real provider/bank statement or receipt used |
| Browser/accessibility | GAP | Historical UI evidence is not bound to the current dirty candidate |
| Backup/DR | GAP | No target-specific backup/restore/failure exercise for reconciliation evidence |
| Legal/privacy retention | GAP | Requires qualified policy review and production data-flow assessment |

## First-rail recommendation

Implement and certify one **XAF mobile-money rail in provider sandbox/UAT**, using the existing generic `MobileMoneyHmacAdapter` boundary. Do not name or activate a production provider until commercial/technical contracts and credential processes are supplied. This rail gives the strongest reuse of current webhook, HMAC, statement, pending/unknown, fee, suspense and settlement controls.

Success means one provider account can ingest signed callbacks and statements; represent pending/unknown/confirmed/settled/reversed/refunded/disputed states without translating uncertainty to success; match internal payments; post unresolved amounts to suspense; reconcile fees/net settlement; sign a daily run with an independent actor; export a source-bound certificate; and invalidate close evidence when late truth arrives.

## Stage checklist and likely edit surfaces

1. Evidence schema: verify/provider-specialize models and migrations under `prisma/schema.prisma` and `prisma/migrations/`; next skill `02-payment-recon-evidence-schema` only if the provider contract proves a missing field.
2. Ingestion: provider-specific adapter in `services/payments/adapters/`, provider-event/statement services and tests.
3. Matching/suspense: `services/payments/payment-reconciliation.service.ts`, `services/reconciliation/*run*`, `*suspense*`, tests and accounting mappings.
4. Workbench/controls: protected actions, finance reconciliation route, workbench, EN/FR messages, export/audit tests.
5. Certification: provider sandbox evidence, production trigger proof, operational runbook, alert/DR evidence and independent sign-off.

## Verification commands for later stages

```text
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run payment:cash-truth:gate
npm run ledger:close-truth:gate
npm run prisma:migration:safety:gate
```

Add provider-contract tests for signature verification, replay, timestamp skew, duplicate events, pending/unknown, amount/currency mismatch, fees, partial/batched settlement, reversals, disputes, statement duplicates, inbox lease recovery, suspense posting, sign-off drift and close invalidation.

## What must not be faked

Do not fabricate provider credentials, callbacks, statements, settlement receipts, authority confirmations, bank balances, webhook signatures, operations windows, signatures, or production database results. Synthetic fixtures must be labelled synthetic. A schema, mocked test, typed approver name, or internal 14/14 gate is not external certified reconciliation.

Exit-gate result: **PASS for the audit; next implementation work remains provider-contract and evidence dependent.**
