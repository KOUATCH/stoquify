# Stoquify Rollout and Rollback Plan — 2026-07-28

## Principles

Use containment, compatibility adapters, shadow reads, feature flags, tenant cohorts, reconciliation and evidence-bound promotion. Never roll back by deleting audit, ledger, payment, stock, payroll or compliance history.

## Promotion stages

1. Code and focused-test evidence on dirty development tree.
2. Clean candidate commit and reproducible dependency lock.
3. Schema validation and forward/backward compatibility review.
4. Isolated migration rehearsal with snapshot and reconciliation.
5. Shadow assertions and variance dashboards.
6. Internal tenant/canary cohort.
7. Limited production cohort after explicit authorization.
8. Broad release only after assurance and operational sign-off.

## Rollback by slice

- Trusted origins: restore only a reviewed static origin; never re-enable arbitrary Host trust.
- PO approval: keep canonical approval; rollback UI affordance, not maker-checker evidence.
- Store credit: remain denied until ledger truth is available.
- DB scope: disable new path through compatibility adapter while preserving tenant assertions and migration records.
- Provider/payment: return traffic to provisional/suspense; never relabel unknown funds settled.
- Read models: switch consumers to previous projection while retaining variance evidence.
- Observability: local fallback may supplement but not replace required production alerts.

## Required drills

Migration forward/rollback, backup/restore, queue replay, provider outage, duplicate event, partial deployment, worker lease expiry, observability delivery, permission revocation and cross-tenant denial.

## Release hold conditions

Any P0 unresolved; unexplained tenant escape; financial reconciliation drift; missing rollback; failed redaction; missing statutory approval; unhealthy migration history; missing secrets; unverified external alert/provider/authority evidence; dirty candidate tree.
