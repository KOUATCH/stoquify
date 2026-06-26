# AqStoqFlow Exam Risk-Remediation Skill Suite

Date: 2026-06-16

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## Installed Skills

| Order | Skill | Risk class | First output |
| --- | --- | --- | --- |
| 001 | `exam-001-aqstoqflow-risk-suite-orchestrator` | Risk remediation can fragment into duplicate or out-of-order work, leaving high-risk service-boundary problems unresolved while later production features advance. | suite status report |
| 002 | `exam-002-aqstoqflow-service-boundary-ratchets` | Direct Prisma in App Router, components, hooks, or server actions can bypass tenant scope, RBAC, typed errors, audit evidence, and service-owned business rules. | service-boundary gate |
| 003 | `exam-003-aqstoqflow-tenant-rbac-hardener` | Some legacy actions and routes still accept or pass caller-supplied organization scope, and same-actor segregation is not proven across every sensitive workflow. | tenant/RBAC audit fixes |
| 004 | `exam-004-aqstoqflow-inventory-item-finalizer` | Old inventory and item actions still expose direct item mutation, stock update, transfer/reservation helpers, hard deletes, and mock inventory data adjacent to the modern inventory kernel. | thin service-backed actions |
| 005 | `exam-005-aqstoqflow-purchasing-ap-consolidator` | AP controls can be bypassed through legacy purchase-order code with raw errors, direct Prisma orchestration, hard deletes, and old receiving workflows. | canonical purchasing/AP service contract |
| 006 | `exam-006-aqstoqflow-hard-delete-immutability-gate` | Hard deletes can remove economic or audit evidence and bypass cancellation, reversal, soft-delete, or corrective event discipline. | hard-delete scanner |
| 007 | `exam-007-aqstoqflow-error-response-normalizer` | Raw throw/rethrow/console error patterns can leak internals, create inconsistent UX, and bypass enterprise error classifications. | typed errors |
| 008 | `exam-008-aqstoqflow-business-event-audit-standardizer` | Older mutations and deletes may not consistently emit business events, audit logs, outbox evidence, idempotency keys, or ledger source links. | event adoption report |
| 009 | `exam-009-aqstoqflow-demo-mock-report-trust-cleaner` | Mock inventory/report/monitoring paths and report TODOs can make dashboards appear more trustworthy than the backing evidence allows. | mock cleanup diff |
| 010 | `exam-010-aqstoqflow-close-certification-hardener` | System evidence certification exists, but statutory certification must remain blocked while recertification triggers and deeper inventory valuation assurance are incomplete. | stale invalidation evidence |
| 011 | `exam-011-aqstoqflow-offline-pos-replay-finalizer` | Offline POS sync currently captures evidence and blockers, but accepted envelopes cannot yet become final legal/accounting truth safely. | safe replay service |
| 012 | `exam-012-aqstoqflow-compliance-country-pack-production-gate` | Compliance adapters and Cameroon country-pack values still include sandbox and expert-review blockers, so legal production certification must remain blocked. | country-pack readiness gates |
| 013 | `exam-013-aqstoqflow-payment-recon-production-hardener` | Payment reconciliation has durable in-app infrastructure, but production provider credentials/channels, external statements, signing, and completeness gates remain incomplete. | provider readiness gates |
| 014 | `exam-014-aqstoqflow-payroll-statutory-hardener` | Payroll foundations exist, but real statutory country parameters, filing adapters, expert validation, and operational hardening remain incomplete. | payroll country-pack gates |
| 015 | `exam-015-aqstoqflow-ci-release-gate-modernizer` | Build currently skips lint, next lint is deprecated, and policy gates are not fully ratcheted into a release-ready CI command. | CI verify command |

## Execution Rule

Run skills in numeric order unless a production breakage requires a narrow emergency fix. Each skill must save a report under `what-next/` before the next skill starts.

## Validation

Validate each installed skill with:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\<skill-name>"
```
