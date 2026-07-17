---
name: kontava-business-signals-action-queue
description: Build Kontava BusinessSignal and ActionItem foundations for cross-module operating intelligence. Use for evidence-linked signals, dedupe, severity scoring, expiry, assignment, owner/accountant action queues, notification hooks, risk case prerequisites, Cash Leakage Radar signals, and tests for tenant isolation, redaction, audit, stale signals, and permission-filtered action paths.
---

# Kontava Business Signals Action Queue

## Purpose

Use this skill to convert cross-module facts into deduped, evidence-linked actions. Kontava should not only show data; it should tell the right owner, accountant, finance user, stockkeeper, or HR/payroll user what needs attention and why.

## Upgraded Mission

Turn evidence and snapshots into useful action, not noise. The skill must create a trusted signal and action queue foundation that helps SMBs respond to cash leakage, stock risk, payment suspense, close blockers, purchasing delays, payroll exposure, and compliance issues before they become losses.

The work should make Kontava feel like an operating partner: it notices risks, explains proof, assigns accountability, and guides the next business action.

## Stakeholder Value

- Owners see the few decisions that matter today.
- Accountants see close blockers and evidence problems early.
- Finance teams see reconciliation exceptions and cash risk.
- Stockkeepers see inventory cash pressure and stockout risk.
- Managers see assigned actions and accountability.
- Sales and partners can demonstrate measurable leakage reduction and operating discipline.

## Signal Quality Rules

Every signal must be:

- Evidence-linked.
- Tenant-scoped.
- Deduped with a stable key.
- Severity-scored with explainable rules.
- Expirable or resolvable.
- Assigned only to permitted users.
- Redacted before payload return.
- Audited when created, assigned, resolved, dismissed, escalated, or expired.
- Quiet by default unless it points to a meaningful business action.

## Preconditions

Prefer running after:

- `kontava-foundation-governance`
- `kontava-evidence-proof-trail`
- `kontava-snapshot-read-models`

If evidence or snapshots are incomplete, build a narrow MVP using existing services and label weak evidence honestly.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- Existing analytics/dashboard services.
- Payment reconciliation exception/inbox services.
- Cash drawer/POS services.
- Inventory low-stock/reorder services.
- Purchase order/AP services.
- Payroll run/payment services.
- Close assurance services.
- Existing notification patterns.
- `prisma/schema.prisma`
- RBAC permissions and audit patterns.

## Product And UX Requirements

Action surfaces should include:

- Owner action cards.
- Accountant close blockers.
- Finance exception queue.
- Stockkeeper inventory risk list.
- Assignment and resolution controls.
- Evidence grade and proof-trail link.
- Freshness, stale, blocked, redacted, permission-denied, module-unavailable, and safe error states.

Avoid a generic notification feed. A signal must tell the user what happened, why it matters, what proof exists, what action is suggested, and who owns the next step.

## Build

Possible models:

- `BusinessSignal`
- `BusinessSignalEvent`
- `ActionItem`
- `ActionItemEvent`
- `NotificationPreference`

Services:

- `services/signals/business-signal-contracts.ts`
- `services/signals/business-signal.service.ts`
- `services/signals/business-signal-rules.service.ts`
- `services/signals/action-queue.service.ts`
- `services/signals/signal-notification.service.ts`

UI:

- Signal inbox table.
- Owner action cards.
- Assignment control.
- Freshness/stale chip.
- Evidence/proof-trail link.

## MVP Signal Types

Start with:

- Cash drawer variance.
- Open payment suspense.
- Duplicate provider reference.
- Refund or void spike.
- Stockout or low-stock risk.
- Dead-stock cash exposure.
- Purchase order receiving delay.
- Close blocker.

Delay:

- Predictive fraud.
- Staff risk scoring.
- AI commentary.
- Automated financial decisions.

## Signal Rules

Every signal must include:

- Tenant.
- Source module.
- Subject type and ID.
- Evidence grade.
- Severity.
- Dedupe key.
- Freshness/expiry.
- Suggested action.
- Required permission.
- Redaction state.

## Must Not Do

- Do not create noisy signals without dedupe and expiry.
- Do not expose sensitive payroll, supplier, payment provider, close, or partner data in signal payloads.
- Do not allow assignment or resolution across tenants.
- Do not start Risk Case Manager until signal behavior is stable.
- Do not create automated financial decisions from signals.
- Do not score staff risk or fraud risk predictively until governance, evidence, redaction, and legal review exist.

## Tests

Add tests for:

- Dedupe key behavior.
- Severity mapping.
- Expiry and stale state.
- Assignment and resolution audit events.
- Permission-filtered action paths.
- Redacted payloads.
- Tenant isolation.
- Noisy duplicate suppression.
- Permission-filtered assignment candidates.
- Audit events for state transitions.

## Validation

Run:

- `npm run typecheck`
- `npm run lint`
- Focused Jest tests for signal services, action queue, redaction, and permissions.
- `npx prisma validate` if schema changes.

## Completion Criteria

Finish when Kontava can generate a small, trusted, evidence-linked action queue without overwhelming users or leaking sensitive cross-module facts.
