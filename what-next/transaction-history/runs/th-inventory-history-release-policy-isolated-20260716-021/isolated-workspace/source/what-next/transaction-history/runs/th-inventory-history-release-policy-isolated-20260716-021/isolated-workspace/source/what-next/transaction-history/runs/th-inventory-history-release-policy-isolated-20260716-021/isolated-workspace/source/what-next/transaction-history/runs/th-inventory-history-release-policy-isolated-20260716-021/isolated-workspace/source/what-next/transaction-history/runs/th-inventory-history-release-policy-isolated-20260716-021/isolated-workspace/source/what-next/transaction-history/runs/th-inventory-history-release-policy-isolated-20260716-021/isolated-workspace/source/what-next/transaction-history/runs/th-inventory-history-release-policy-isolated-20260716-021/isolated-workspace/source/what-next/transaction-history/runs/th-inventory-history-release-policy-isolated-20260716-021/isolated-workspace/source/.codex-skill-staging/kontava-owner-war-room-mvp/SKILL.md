---
name: kontava-owner-war-room-mvp
description: Build the first safe Kontava Owner War Room product surface after evidence, snapshots, entitlements, signals, and redaction foundations exist. Use for read-only owner/admin command centers, evidence-grade cards, proof-trail drawer integration, Cash Leakage Radar MVP, Close Autopilot strip, Module Control Center observe UI, dashboard UX states, i18n, accessibility, and role-aware redacted cross-module surfaces.
---

# Kontava Owner War Room MVP

## Purpose

Use this skill to expose the moat foundation through a professional, read-only, evidence-backed owner/admin command center without destabilizing existing workflows.

## Upgraded Mission

Build the first user-visible expression of the Kontava moat only after the foundations are ready. The Owner War Room should help owners and admins understand cash, stock, payroll exposure, purchasing commitments, reconciliation exceptions, close readiness, action queue pressure, and module state from one trusted, redacted, evidence-backed command center.

This is not a marketing dashboard. It is a control room for real SMB decisions.

## Stakeholder Value

- Owners see where cash is trapped, leaking, delayed, or at risk.
- Accountants see close blockers and evidence quality without hunting across modules.
- Finance teams see reconciliation and payment truth.
- Managers see stock, purchasing, and staff workflow pressure.
- Sales gets a memorable product surface that explains why Kontava is more than POS or accounting.
- Partners later get a clear model for consented evidence views without broad access.

## Readiness Gate

Before broad implementation, verify whether these foundations exist:

- Evidence-grade and proof-trail contract.
- Snapshot/read-model contract.
- Module entitlement observe mode.
- Business signal/action queue MVP.
- Security redaction guard.
- Seed scenarios for at least full-suite, limited-module, read-only/suspended, accountant, and cash-leakage tenants.

If a foundation is missing, build only a narrow read-only slice or stop with a readiness report.

## Preconditions

Do not start broad implementation until these exist or are explicitly scoped as mocked contracts:

- Evidence-grade service.
- Proof-trail service or drawer contract.
- Snapshot/read-model contracts.
- Module entitlement observe mode.
- BusinessSignal/action queue MVP.
- Redaction policy.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- Dashboard layout and visual tokens in `app/globals.css`.
- Existing dashboard pages under `app/[locale]/(dashboard)/dashboard`.
- Owner/admin navigation and sidebar config.
- Snapshot services.
- Business signal services.
- Evidence/proof trail components.
- RBAC shell permission hooks.
- English and French messages.

## Data And Security Requirements

Every card must be backed by guarded services or explicit mock contracts in a non-production scope. Each result must include evidence grade, freshness, blockers, redactions, source modules, and safe errors.

Do not expose:

- Person-level payroll amounts without entitlement, permission, and redaction.
- Supplier bank values without fresh auth and permission.
- Raw payment provider references without payment/reconciliation permission.
- Close certification evidence without close/audit permission.
- Partner/export data without consent and audit.

## Build MVP Surface

Cards:

- Cash at risk.
- Reconciliation exceptions.
- Stock cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Module observe/upgrade prompt for owners/admins.

Panels:

- Proof Trail drawer.
- Evidence-grade badges.
- Cash Leakage Radar MVP.
- Close Autopilot strip.
- Owner action cards.

## UX States

Every card must support:

- Loading.
- Empty.
- Partial.
- Stale.
- Blocked.
- Redacted.
- Permission denied.
- Module unavailable.
- Upgrade/request.
- Safe error.

## Design Rules

- Match existing dashboard color semantics and tokens.
- Use dense, enterprise-grade command-center layout.
- Avoid decorative marketing hero sections.
- Avoid color-only meaning. Badges need text labels.
- Use side panels for proof trails instead of making users jump across pages.
- Keep normal users away from unavailable modules; let owners/admins request upgrades through controlled surfaces.

## Must Not Do

- Do not build Owner War Room from unbounded live joins.
- Do not expose sensitive payroll, supplier bank, provider, close, or partner data without redaction.
- Do not create mutation actions from the MVP unless their service guards already exist.
- Do not launch Cash Leakage Radar with predictive staff scoring.
- Do not claim Certified facts without proof.
- Do not use a new visual language that conflicts with existing dashboard color semantics.
- Do not use broad live joins that could slow or destabilize current dashboards.

## Tests

Add tests for:

- Role-specific visibility.
- Direct URL access denial.
- Redacted values in payloads and UI.
- Module unavailable states.
- Snapshot stale/partial states.
- Proof Trail drawer on at least three subject types.
- Keyboard accessibility and text labels.
- English and French strings.
- Stale, partial, blocked, and redacted data rendering.

## Validation

Run:

- `npm run typecheck`
- `npm run lint`
- Focused component/service tests.
- E2E smoke test when the dev server and auth fixture are available.

## Completion Criteria

Finish when owners/admins can see a read-only, evidence-graded, redaction-safe command center connecting cash, stock, payroll, purchasing, reconciliation, close, and module state without breaking current dashboards.
