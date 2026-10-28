# Stoquify cross-domain implementation roadmap — 2026-08-17

Goal: reach a defensible bounded production pilot and then an explicit unrestricted-production decision without duplicating domain kernels or manufacturing external evidence.

## Dependency order

```text
0 clean candidate
  -> 1 destructive migration + signed auth
    -> 2 Cameroon qualified review
      -> 3 provider/DGI/hardware external conformance
        -> 4 POS/inventory/accounting finalization
          -> 5 HRIS/payroll production chain
            -> 6 SRE/DR/browser evidence
              -> 7 governed pilot
                -> 8 final release decision
```

Workstreams may run in parallel only when they do not consume an unapproved upstream truth. For example, synthetic provider harness and hardware test planning may proceed while Cameroon review is pending, but production payroll, statutory receipts and authority activation may not.

## Phase 0 — freeze current engineering truth

Owner: release owner and code owners.

- Inventory/attribute all dirty files; preserve unrelated user work.
- Finish or explicitly exclude each active POS, onboarding, payment and migration slice.
- Repair/isolate Jest discovery so targeted suites complete with exit codes.
- Create a clean `codex/` release branch/commit.
- Generate candidate manifest containing commit, tree, dependency lock, Prisma schema, 68 migrations and evidence-tool hashes.

Exit: clean immutable candidate; build/typecheck/Prisma/service-boundary/focused tests pass; no content drift.

## Phase 1 — close database and privileged-auth invariants

Owner: SANGO MALO as maker/operator and MAXIMILLIANO BONGA as independent checker only after identity/SoD verification.

- Read-only census and affected-data profile on the approved target.
- Use empty-target execution only for a genuinely empty target; otherwise rehearse additive/resolve-only adoption on a production-shaped clone.
- Produce encrypted backup manifest, restore reconciliation, auth continuity, failure injection, metadata recovery and fix-forward runbook.
- Regenerate packet and all hashes from Phase 0 candidate.
- Obtain post-evidence maker/checker signatures and manually author 13 approvals only after checker `APPROVE_EXACT_HASH`.

Exit: evidence and migration safety gates pass; direct target history is healthy; no destructive reset/drop is used.

## Phase 2 — qualified Cameroon country-pack approval

Owner: compliance/legal, appointed qualified reviewer, independent checker.

- Verify source integrity and extend the inventory beyond CNPS to all claimed payroll/tax/labor/receipt/authority families.
- Complete reviewer identity, qualification, conflict, review window and independent source digests.
- Decide every fixture family with provision, effective window, rounding/caps, limitations and independent tie-out.
- Retain signed artifact; checker verifies signature and exact hash.
- Run preflight 12/12, perform controlled manifest transition, then production gate 12/12.

Exit: only explicitly approved families become production-capable; unsupported families remain fail-closed.

## Phase 3 — external provider, authority and hardware conformance

Owners: treasury/reconciliation, compliance integration, security, retail hardware operations.

Provider:

- Select one contracted XAF mobile-money sandbox/UAT rail.
- Provision managed non-production credentials outside repository/evidence.
- Run callback/statement, pending/unknown, replay, fee, settlement, reversal/dispute, suspense, outage/dead-letter and close-invalidation scenarios.

Authority:

- Validate official DGI technical contract and production credential process.
- Execute the 15-row external-authority checklist; keep production disabled.

Hardware:

- Name printer/drawer/scanner/display/payment-terminal/offline models and firmware.
- Execute physical happy/failure/recovery/accessibility cases at the pilot location.

Exit: signed external conformance packs with redacted evidence; no real secret in reports.

## Phase 4 — finish sales-to-cash transactional truth

Owners: POS, inventory, accounting, compliance and reconciliation code owners.

- Bind tenant-scoped `clientCommitId` original-result replay to the frozen schema and rerun PostgreSQL concurrency.
- Keep cash-only scope until provider-authoritative electronic tender is connected; uncertainty must remain pending/unknown.
- Ensure immutable receipt/fiscal source is created independently of delivery and delivery retry cannot hide a completed sale.
- Complete business-day statement, blind tender declaration, manager sign-off, X/Z evidence and accounting-close handoff.
- Complete delivery/on-account reservation, goods issue, partial fulfillment, invoicing/AR, return/credit and corrections without a second finalization kernel.
- Rerun inventory physical-event/COGS and compensating refund/void/return proofs.

Exit: every material transition has one service owner, state contract, source link, idempotency and correction path.

## Phase 5 — HRIS/payroll production chain

Owners: HRIS, payroll, compliance, treasury and controller.

- Revalidate people identity, manager scope, contracts, compensation, documents, time/leave/attendance and privacy on production-shaped data.
- Freeze certified HRIS inputs; rerun payroll calculation/golden fixtures and correction proofs using Phase 2 provenance.
- Run provider payment and authority declaration proof using Phase 3 conformance.
- Tie payroll register to payment allocations, declarations, journals and close.
- Execute current tenant dry-run twice, reconcile hashes, simulate correction-only rollback and obtain owner/checker signoff.

Exit: production payroll chain is source-complete, statutory-approved, provider/authority-proven, reconciled and migration-approved.

## Phase 6 — operations, browser, security and recovery

Owners: SRE, security, privacy, accessibility, support.

- Provision production database, secrets, TLS and credential rotation/revocation.
- Deploy schedules/workers, metrics, traces, dashboards, alerts and dead-letter tooling.
- Run three successful operational windows plus outage, backlog, secret-expiry, restore/DR and incident exercises.
- Execute authenticated EN/FR Edge/Chrome plus approved supported-browser matrix, keyboard/screen-reader/accessibility and RBAC/tenant negatives.
- Finalize operator, support, rollback, security-incident and on-call primary/backup ownership.

Exit: operational evidence register passes; no secret/PII leakage; restore and reconciliation meet objectives.

## Phase 7 — bounded production pilot

Owner: product maker; security, controller/compliance and release checkers.

- Freeze exact pilot scope, location, terminal, tender/provider, hardware, country-pack families, employee/tenant cohort and time window.
- Define kill switches, rollback/correction, monitoring, incident criteria and stop authority.
- Run Phase 2B entry 23/23, then the pilot.
- Observe agreed windows; reconcile sales, stock, receipts, provider settlement, payroll, declarations, ledger and close.
- Record incidents, residual risks and signed exit decision.

Exit: clean pilot evidence, independent approvals and explicit recommendation.

## Phase 8 — unrestricted production decision

Owner: enterprise release governance board.

- Rerun all applicable rows in the master gate matrix against one immutable candidate/evidence bundle.
- Require Phase 3 decision 34/34 and Gate 017 GO.
- Record supported countries, rails, devices, browsers, statutory families and excluded capabilities precisely.
- Approve or reject with expiry, rollback authority and residual risks.

Exit: explicit artifact-bound `GO` or `NO_GO`; no implied certification.

## Immediate next execution slice

Phase 0 and the non-destructive preparation portions of Phases 1–3 may begin now. Production mutation, real money, real employee data, live authority effects and production activation remain prohibited until their upstream exits pass.
