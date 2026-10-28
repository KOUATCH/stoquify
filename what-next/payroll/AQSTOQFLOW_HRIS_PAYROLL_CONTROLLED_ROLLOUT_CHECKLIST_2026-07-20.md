# HRIS/Payroll Controlled Rollout Checklist

Date: 2026-07-20  
Current state: **NOT AUTHORIZED FOR PRODUCTION**

Every item below must be evidenced. A verbal instruction, development authorization, unchecked box, template, or self-issued approval does not satisfy an item.

## A. Qualified statutory review

- [ ] Reviewer identity, professional capacity, organization, qualification, and conflict declaration independently verified.
- [ ] Review window and applicable effective dates recorded.
- [ ] Both retained Cameroon source artifacts independently hashed and matched.
- [ ] All four fixture families reviewed against exact source provisions and independently tied out.
- [ ] Every required family explicitly approved; no rejected or change-required family remains.
- [ ] Final decision explicitly permits production use.
- [ ] Signed approval artifact retained, access-controlled, hashed, and independently verified.
- [ ] Qualified-review preflight passes 12/12.

## B. Country-pack production transition

- [ ] Authorized maker/checker validates the completed review packet.
- [ ] Manifest reviewer, effective-date, approval-artifact, and approved-family fields updated consistently.
- [ ] Approved source evidence hashes bound without unreviewed formula changes.
- [ ] `productionUseAllowed` changes only under the signed decision.
- [ ] Country-pack production gate passes 12/12.
- [ ] Unsupported countries and unapproved effective periods still fail closed.

## C. Payments and declarations

- [ ] Skill 13 rerun against approved country-pack provenance.
- [ ] Production provider adapters, accounts, credentials, callback authenticity, and idempotency certified.
- [ ] Approved employee payment destinations and maker-checker release verified.
- [ ] Amount/currency/register/provider settlement tie-out passes.
- [ ] Authority adapter, submission, acknowledgement, rejection, amendment, and receipt proof certified.
- [ ] No raw provider, authority, credential, person, salary, or destination data leaks into broad evidence.

## D. Accounting close

- [ ] Skill 14 rerun against approved payment/declaration evidence.
- [ ] Register-to-ledger mapping, amounts, source links, and payslip allocations tie out.
- [ ] All critical/high payroll, payment, declaration, reconciliation, source-link, and close blockers cleared.
- [ ] Stale evidence invalidation tested.
- [ ] Certified export segregation, fresh authorization, watermarking, audit, and redaction verified.
- [ ] No posted entry is overwritten; corrections use approved reversal/correction workflows.

## E. Migration/backfill pilot

- [ ] Named production pilot tenant and accountable owner approved.
- [ ] Stable source snapshot captured and hashed.
- [ ] Dry run and identical rerun produce stable projection, correction-plan, reconciliation, and plan hashes.
- [ ] Cross-tenant, ambiguous, legacy-unverified, and unsupported rows are zero or formally quarantined.
- [ ] Correction-only rollback simulation preserves immutable evidence.
- [ ] Proof-backfill source certificate and expected hashes reconcile.
- [ ] Post-migration data-trust and close blockers are zero.
- [ ] Owner, HRIS, payroll, accounting, security/privacy, and assurance signoffs retained.
- [ ] Skill 17 production pilot passes before any broader tenant rollout.

## F. Security, privacy, browser, and accessibility

- [ ] Production identity-provider and module-entitlement behavior verified.
- [ ] Tenant, branch, manager, employee, and negative-RBAC scenarios pass against production-like configuration.
- [ ] Supported Chromium, Firefox, and WebKit workflows pass.
- [ ] Keyboard-only and supported screen-reader workflows pass.
- [ ] Privacy/retention owner approves document, proof, signature, payroll, and audit handling.
- [ ] Sensitive exports and screenshots are access-controlled and redacted.

## G. Release and operations

- [ ] CI, full focused suites, typecheck, lint, build, and migration safety checks pass on the release candidate.
- [ ] Branch protection and environment approvals verified at the hosting provider.
- [ ] Production secrets are provisioned through approved secret management and never copied into evidence.
- [ ] Observability, alerts, audit retention, on-call ownership, incident response, and escalation tested.
- [ ] Rollback/correction runbook rehearsed with named owners and decision authority.
- [ ] Deployment scope, tenants, effective date, canary limits, pause criteria, and abort criteria approved.

## H. Final decision

- [ ] Skills 12, 13, 14, and 17 production evidence is current and passing.
- [ ] Skill 18 rerun produces an unrestricted-production **GO** decision.
- [ ] Final release decision identifies approvers, date, scope, residual risks, monitoring window, and rollback owner.
