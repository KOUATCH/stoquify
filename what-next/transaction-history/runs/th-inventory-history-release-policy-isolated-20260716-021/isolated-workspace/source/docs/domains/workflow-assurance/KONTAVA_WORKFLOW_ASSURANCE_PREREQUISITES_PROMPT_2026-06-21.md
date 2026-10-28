# Kontava Workflow Assurance Prerequisites Prompt

Date: 2026-06-21
Purpose: Refined prompt for identifying the architectural and structural prerequisites required before installing the Workflow Assurance Engine.

```text
Go through the saved Kontava Workflow Assurance Engine prompt, the Mission-Critical Workflow Risk Report, and the current AqStoqFlow/Kontava codebase.

Identify the architectural, structural, data, workflow, security, and operational prerequisites required before the Workflow Assurance Engine can be installed and function diligently, efficiently, and reliably.

The goal is to determine what foundations must exist so the system can automatically verify critical workflow outcomes, detect anomalies, create incidents, alert the right users, and support manager/admin action without creating noise, performance problems, false confidence, or compliance risk.

Focus on prerequisites for:

1. Workflow assurance architecture
   - Central assurance/check registry.
   - Workflow invariant definitions.
   - Domain-specific check modules.
   - Event-driven and scheduled validation.
   - Synchronous vs asynchronous checks.
   - Retry, deduplication, and idempotency strategy.

2. Data model foundations
   - Required Prisma models and relationships.
   - Incident/anomaly model.
   - Assurance check run model.
   - Evidence-grade model.
   - Alert delivery and escalation model.
   - Workflow ownership and assignment model.
   - Resolution, waiver, reopening, and audit history.

3. Business event and ledger foundations
   - Business event contracts.
   - Payload hashing and idempotency keys.
   - Ledger posting batches.
   - Journal entries and source links.
   - Fiscal period and close-period constraints.
   - OHADA-compliant immutability and traceability.

4. Evidence and proof foundations
   - Source-document requirements.
   - Document hash strategy.
   - Proof trail requirements.
   - Evidence graph integration.
   - Certification and reconciliation evidence.
   - Rules for missing, stale, conflicting, or invalid evidence.

5. Workflow coverage prerequisites
   Analyze what must exist for assurance checks across:
   - POS sale/payment/receipt/stock/ledger.
   - Offline POS replay.
   - Payment reconciliation and suspense.
   - Purchasing, receiving, AP, and supplier payments.
   - Supplier bank changes.
   - Inventory counts, adjustments, write-offs, and valuation.
   - Payroll runs, payments, and declarations.
   - Fiscal document certification.
   - Close assurance and trust packs.
   - Accounting posting and ledger invariants.

6. Alerting and notification foundations
   - Alert severity taxonomy.
   - Role-based routing.
   - Escalation rules.
   - Manager/admin notification surfaces.
   - Dashboard color semantics:
     - success = `--dash-success`
     - warning = `--dash-gold`
     - danger/blocking = `--dash-danger`
     - info/queued = `--dash-info`
     - primary proof/action = `--dash-brand`
   - Low-noise rules to avoid alert fatigue.
   - Required direct workflow links for every alert.

7. Security, permissions, and governance
   - RBAC requirements.
   - Fresh-auth requirements.
   - Maker-checker and segregation of duties.
   - Admin/support/operator boundaries.
   - Tenant isolation.
   - Sensitive evidence redaction.
   - Waiver and override controls.
   - Audit logs for detection, viewing, assignment, resolution, and reopening.

8. Performance and scalability prerequisites
   - Snapshot/read-model strategy.
   - Queue/background job requirements.
   - Check scheduling frequency.
   - Query optimization and indexing.
   - Incremental validation vs full scans.
   - Multi-tenant isolation and throttling.
   - Failure handling when the assurance engine itself is delayed or down.

9. UI and workflow prerequisites
   - Admin Control Tower.
   - Manager Action Center integration.
   - Incident detail page.
   - Workflow drill-through routes.
   - Evidence/proof trail panels.
   - Close assurance integration.
   - Notification and dialog consistency.
   - Resolution workflows and approval states.

10. Testing and release prerequisites
   - Unit tests for each invariant.
   - Service tests for incident creation.
   - Integration tests for event-driven checks.
   - Regression tests for false positives and false negatives.
   - Load/performance tests for scheduled scans.
   - Security tests for tenant isolation and permissions.
   - Compliance tests for OHADA ledger and evidence traceability.

For each prerequisite, explain:

1. What must be built or verified.
2. Why it is required.
3. Which existing models, services, actions, or pages it connects to.
4. What happens if the prerequisite is missing.
5. The implementation complexity.
6. The dependency order.
7. Whether it is a quick win, medium-depth platform task, or strategic foundation.
8. The recommended acceptance criteria.

End with a phased implementation roadmap:

- Phase 0: readiness audit and gap map.
- Phase 1: minimum viable assurance engine.
- Phase 2: incident model, alert routing, and Manager Action Center integration.
- Phase 3: domain-specific invariant checks.
- Phase 4: Control Tower and evidence-grade BI.
- Phase 5: advanced anomaly detection, fraud signals, and enterprise-grade self-verification.

The final report should make clear how to prepare AqStoqFlow/Kontava to become a self-verifying OHADA SMB operating system: ledger-backed, evidence-aware, low-noise, manager-actionable, secure, auditable, efficient, and hard to replace.
```

