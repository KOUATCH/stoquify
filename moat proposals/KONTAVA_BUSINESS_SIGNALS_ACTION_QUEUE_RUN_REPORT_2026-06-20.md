# Kontava Business Signals Action Queue Run Report

Date: 2026-06-20

## Executive Summary

The `kontava-business-signals-action-queue` skill has been executed as a safe, non-destructive foundation slice. The implementation adds a backend BusinessSignal and ActionItem foundation that turns evidence and snapshots into deduped, permission-filtered, redaction-aware, actionable queues.

This phase does not add database tables or durable persistence yet. That is intentional. The first objective is to stabilize the contracts, rule behavior, action queue semantics, protected server action, notification preference logic, and release-gate readiness before introducing write-back backfills or a persistent action-item workflow.

## Files Added Or Updated

Added:

- `services/signals/business-signal-contracts.ts`
- `services/signals/business-signal-rules.service.ts`
- `services/signals/business-signal.service.ts`
- `services/signals/action-queue.service.ts`
- `services/signals/signal-notification.service.ts`
- `services/signals/__tests__/business-signal-rules.service.test.ts`
- `services/signals/__tests__/action-queue.service.test.ts`
- `services/signals/__tests__/signal-notification.service.test.ts`
- `actions/signals/business-signals.actions.ts`
- `actions/signals/__tests__/business-signals.actions.test.ts`
- `moat proposals/KONTAVA_BUSINESS_SIGNALS_ACTION_QUEUE_RUN_REPORT_2026-06-20.md`

Updated:

- `scripts/kontava-moat-release-gate.js`
- `moat proposals/KONTAVA_SEED_BACKFILL_RELEASE_GATE_STATIC_READINESS_REPORT_2026-06-20.md`
- `moat proposals/KONTAVA_SEED_BACKFILL_RELEASE_GATE_STATIC_READINESS_REPORT_2026-06-20.json`

## What Was Implemented

### 1. Business Signal Contracts

The new contracts define:

- `BusinessSignal`
- `BusinessSignalFact`
- `BusinessSignalEvent`
- `ActionItem`
- `ActionItemEvent`
- `ActionQueueResult`
- `NotificationPreference`
- signal types, severities, statuses, assignment roles, and notification channels

Every signal now has the required Kontava fields:

- `organizationId`
- `moduleSlug`
- `sourceModule`
- `subjectType`
- `subjectId`
- `evidenceGrade`
- `severity`
- `severityScore`
- `dedupeKey`
- `freshness`
- `expiresAt`
- `suggestedAction`
- `requiredPermission`
- `assignedRole`
- `blockers`
- `redactions`
- safe `payload`
- optional proof-trail link

### 2. Signal Rule Engine

The rule engine can generate signals from:

- Explicit `BusinessSignalFact` inputs.
- Existing snapshot/read-model outputs.

Supported MVP signal types:

- Cash drawer variance.
- Open payment suspense.
- Duplicate provider reference.
- Refund or void spike.
- Stockout risk.
- Dead-stock cash exposure.
- Purchase order receiving delay.
- Payroll exposure.
- Close blocker.

Snapshot-driven MVP rules currently generate:

- Open payment suspense from `payment.truth`.
- Stockout risk and dead-stock cash exposure from `inventory.cash`.
- Close blocker from `close.readiness`.
- Purchase order receiving delay and payroll exposure from `tenant.operating`.
- Purchase order receiving delay from `branch.operating`.

### 3. Dedupe, Severity, Expiry, And Redaction

Signals are:

- Deduped by stable tenant/module/type/subject keys.
- Ranked by severity and score.
- Expirable and stale-aware.
- Payload-redacted before return when a redacted field is present.
- Evidence-grade preserving.

Important rule: signal payloads should carry safe operating facts, not raw sensitive identifiers. Tests prove a provider reference does not leak after redaction.

### 4. Action Queue Service

The action queue service:

- Filters signals by tenant.
- Filters action paths by RBAC permission.
- Converts visible active/stale/expired signals into `ActionItem` objects.
- Produces summary counts by severity, role, stale/expired/redacted status.
- Blocks cross-tenant assignment and resolution.
- Filters assignment candidates by tenant, active state, and required permission.
- Emits assignment, resolution, dismissal, and expiry event DTOs.

This gives Owner War Room a safe action queue foundation without introducing premature persistence.

### 5. Notification Preference Foundation

The notification service:

- Evaluates whether a user should be notified for a signal.
- Respects enabled signal types.
- Respects minimum severity.
- Supports digest-only behavior.
- Respects quiet hours except for critical signals.
- Builds safe digest payloads.

This is a notification hook foundation, not a live email/in-app delivery system yet.

### 6. Protected Owner Action Queue Action

Added:

```text
actions/signals/business-signals.actions.ts
```

The action:

- Uses `dashboard.read` through the existing `protect` wrapper.
- Derives tenant from RBAC context, not caller input.
- Reads existing tenant, payment truth, inventory cash, and close readiness snapshots.
- Builds signals from those snapshots.
- Returns a permission-filtered `ActionQueueResult`.

This gives Owner War Room a backend surface to consume.

### 7. Release Gate Updated

The static Kontava release gate now includes:

```text
Business signals and action queue
```

Latest gate result:

```text
Release status: ready
Seed scenarios ready: 8/8
Backfill checks ready: 6/6
Release gates ready: 8/8
Blockers: 0
Critical blockers: 0
```

## Validation Results

Passed:

```bash
npm test -- services/signals/__tests__ actions/signals/__tests__ --runInBand
```

Result: 4 test suites passed, 11 tests passed.

Passed:

```bash
npm run typecheck
```

Result: TypeScript completed successfully.

Passed:

```bash
npx eslint "services/signals/**/*.ts" "actions/signals/**/*.ts" "scripts/kontava-moat-release-gate.js" "scripts/__tests__/kontava-moat-release-gate.test.js"
```

Result: no lint errors.

Passed:

```bash
npm test -- scripts/__tests__/kontava-moat-release-gate.test.js --runInBand
```

Result: 1 test suite passed, 3 tests passed.

Passed:

```bash
node scripts/kontava-moat-release-gate.js --mode fail
```

Result: exit code 0; release status ready.

Passed:

```bash
npx prisma validate
```

Result: Prisma schema valid.

## What Was Deliberately Not Done

This phase did not:

- Add Prisma models.
- Create a migration.
- Persist signals or action items.
- Send real notifications.
- Add predictive fraud scoring.
- Add staff risk scoring.
- Create automated financial decisions.
- Add mutation-heavy UI workflows.
- Expose sensitive payroll, supplier bank, provider, close, or partner data.

This keeps the foundation safe and reversible.

## Remaining Work Before Full Owner War Room

The environment is now adequate to run `kontava-owner-war-room-mvp` for a read-only MVP, provided the first UI implementation stays within these limits:

- Use snapshot-backed cards.
- Use `getOwnerActionQueueAction` for action queue data.
- Keep actions read-only or event-DTO-only.
- Keep module entitlements in observe mode.
- Show redaction, stale, blocked, partial, permission-denied, and module-unavailable states.
- Do not add predictive fraud, AI commentary, partner APIs, or persistent risk cases yet.

## Recommended Next Step

Run `kontava-owner-war-room-mvp` next, scoped to:

- Read-only owner/admin command center.
- Evidence-grade cards.
- Action queue cards backed by the new signal action.
- Proof-trail drawer links where supported.
- Redacted payroll/payment/close states.
- Module observe/upgrade prompts.

Durable `BusinessSignal` and `ActionItem` Prisma models should wait until the UI proves the first workflow and the team confirms which actions need long-lived assignment, SLA, notifications, and audit persistence.
