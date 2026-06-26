# Kontava Workflow Assurance Engine Prompt

Date: 2026-06-21
Source report: `security/KONTAVA_MISSION_CRITICAL_WORKFLOW_RISK_REPORT_2026-06-21.md`

```text
Using the saved Kontava Mission-Critical Workflow Risk Report, design an automated Workflow Assurance and Anomaly Detection System for AqStoqFlow/Kontava.

The goal is to continuously verify that the system's most critical business workflows are completing correctly, detect anomalies before they damage financial trust or reputation, and alert the right user, manager, admin, accountant, or support role with clear action links.

Focus on the 10 mission-critical workflows from the report:
1. POS sale, payment, receipt, stock, and ledger posting.
2. Offline POS sync and replay.
3. Payment ingestion, reconciliation, suspense, and signoff.
4. Purchasing, receiving, supplier invoice, and AP posting.
5. Supplier bank change and supplier payment release.
6. Inventory count, adjustment, write-off, and class 3 reconciliation.
7. Payroll attendance, run posting, payments, and declarations.
8. Fiscal document creation and compliance certification outbox.
9. Close assurance, accountant trust pack, and stale evidence invalidation.
10. Accounting posting gateway, journal source links, and ledger invariants.

For each workflow, define:

1. The expected successful outcome.
2. The system invariants that must always hold true.
   Examples: balanced journals, source links present, fiscal document certified before legal delivery, payment matched or suspended, stock movement tied to ledger, no same-actor approval/release, no stale close evidence.
3. The anomaly patterns to detect.
   Examples: missing ledger posting, failed posting batch, reused idempotency key with changed payload hash, unresolved suspense, unmatched provider payments, stock projection drift, unapproved supplier bank change, stale certification evidence.
4. The data sources and Prisma models/services already present or implied.
5. Whether the check should run:
   - synchronously inside the workflow,
   - after commit through a business event/outbox validator,
   - on a scheduled scan,
   - before close/certification,
   - or during BI snapshot generation.
6. The severity level:
   - info,
   - warning,
   - high-risk,
   - blocking,
   - compliance-critical.
7. Who should be alerted:
   - cashier,
   - branch manager,
   - owner,
   - finance manager,
   - accountant,
   - inventory manager,
   - payroll lead,
   - admin,
   - support/operator.
8. The exact alert content:
   - what went wrong,
   - why it matters,
   - what evidence is missing,
   - what workflow to open,
   - recommended next action.
9. The direct workflow links needed so the user can act immediately.
10. The audit trail needed to prove when the anomaly was detected, who saw it, who resolved it, and what changed.

Then propose the technical architecture for this system, including:

- A central `WorkflowAssuranceCheck` or equivalent registry.
- A normalized anomaly/incident model.
- Evidence-grade classification: operational, posted, reconciled, certified, blocked.
- Background jobs and event-driven validators.
- Snapshot/read-model services for dashboard performance.
- Alert routing and escalation rules.
- Integration with the existing notification system using dashboard color semantics:
  - success = `--dash-success`
  - warning = `--dash-gold`
  - danger/blocking = `--dash-danger`
  - info/queued = `--dash-info`
  - primary proof/action = `--dash-brand`
- Admin dashboards for monitoring open anomalies.
- Manager Action Center integration.
- Close assurance integration.
- Tests required for each workflow invariant.
- Rollout plan: quick wins, medium-depth implementation, and strategic enterprise-grade controls.

The output should be a detailed implementation report explaining how AqStoqFlow/Kontava can become self-verifying: a system that does not merely record transactions, but continuously proves that cash, stock, payments, payroll, compliance, and ledger truth remain aligned.

Prioritize designs that are:
- ledger-backed,
- evidence-aware,
- OHADA-compliance friendly,
- manager-actionable,
- auditable,
- role-aware,
- low-noise,
- and capable of becoming a major product moat for SMB operators.
```

## Recommended Subsystem Name

Use **Kontava Workflow Assurance Engine** for the verifier/check registry, incident creation, and invariant enforcement layer.

Use **Kontava Control Tower** for the manager/admin-facing surface that summarizes open anomalies, evidence grades, escalation status, and direct workflow actions.

The core product idea is that every critical workflow gets machine-checkable invariants, and every broken invariant becomes an actionable incident rather than a hidden data inconsistency.

