# Daily Truth Durable Action Resolution Foundation Report

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution  
Phase: 2 - Daily Truth Dashboard And Action Center  
Slice: 21 - Durable Action Center Resolution Foundation Audit  
Skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`

## Executive Decision

Slice 21 is **audit complete**. The third durable daily command should be:

> **Sign one payment reconciliation run that is already `READY_FOR_SIGNOFF`, directly from the tenant-wide Manager Action Center.**

This is a source-owned terminal workflow. Its authoritative state is the durable Prisma `ReconciliationRun`; successful execution moves that record to `SIGNED` and writes certificate evidence, a sensitive-action decision, ledger audit evidence, a business event/outbox message, and close-certification invalidation in the same transaction.

Do **not** create a generic `ActionItem` persistence model merely to satisfy the Phase 2 count. The current Action Queue remains a permission-filtered projection. It may describe and route work, but it must not own payment reconciliation truth or accept a client-supplied `resolved` flag.

Phase 2 remains active. This audit selects the implementation sequence; it does not claim that the third command is already available from the operating surface.

## Acceptance Source

The referral roadmap requires:

- at least three daily actions resolvable without leaving the dashboard;
- owner/manager ability to resolve or assign operational work;
- service-owned read models and source evidence;
- tenant, role, location, module, audit, redaction, and maker-checker controls;
- no dashboard-only business truth.

Slices 19 and 20 already provide two durable commands in the managed-location daily-close workspace:

1. Start branch daily-close review.
2. Independently sign branch daily close.

The missing criterion is one more source-backed command on the operating surface.

## Current-State Evidence

### Action Queue Is Projection-Only

`services/signals/action-queue.service.ts`:

- derives `ActionItem` values from in-memory `BusinessSignal` values;
- creates stable projection IDs from signal dedupe keys;
- returns assigned, resolved, and dismissed copies plus event-shaped objects;
- performs no Prisma write, audit write, or business-event write.

`actions/signals/business-signals.actions.ts` exposes only a protected read action using `dashboard.read`.

`prisma/schema.prisma` contains no `BusinessSignal`, `ActionItem`, or `ActionItemEvent` model. The TypeScript lifecycle contract therefore describes a future/general queue capability, not current durable workflow state.

### Manager Action Center Is Link-Oriented

The tenant and managed-location Manager Action Center services build permission-filtered action projections from snapshots and assurance incidents. The product components render those items as links to owning workflows. They do not expose assignment, dismissal, or resolution writes.

Tenant-wide access and managed-location responsibility are resolved server-side. A cross-module command must preserve that access split; it cannot infer location authority from the browser.

### Payment Reconciliation Already Owns A Terminal Command

The existing payment reconciliation workflow provides stronger evidence than the other candidates:

- `ReconciliationRun.status` is durable and organization-scoped.
- `signReconciliationRun` accepts only `READY_FOR_SIGNOFF` runs.
- open exceptions and open suspense items are rechecked inside the transaction.
- provider/statement evidence, provider readiness, open accounting period, and source manifest consistency are rechecked.
- `runById` is the maker and `signedById` is the checker.
- sensitive-action policy requires `payments.reconciliation.sign`, L1 assurance, authentication no older than 300 seconds, and blocks self-approval.
- successful execution stores `SIGNED`, signer, time, certificate payload, and certificate hash.
- the same transaction writes ledger audit evidence, `payment.reconciliation.signed`, an outbox notification, and close-certification invalidation.

The existing protected action already requires `payments.reconciliation.sign` and fresh authentication. It is currently available from the finance reconciliation workbench, but not from the Manager Action Center.

## Candidate Decision Matrix

| Candidate | Frequency / value | Durable terminal source state | Existing protected command | Main weakness | Decision |
|---|---|---:|---:|---|---|
| Payment reconciliation sign-off | Daily, cash-trust and close-critical | yes: `READY_FOR_SIGNOFF -> SIGNED` | yes | no narrow Action Center state adapter; action hardening and step-up UX still needed | **selected** |
| Payment suspense assignment | Frequent and useful | no: assignment is not resolution | yes | does not satisfy the resolved-action criterion | defer as later Action Center assignment capability |
| Payment suspense reclassification/posting | High value | partial; posting remains in the open suspense set until later resolution | yes | aggregate signal lacks item identity; terminal resolution service is incomplete | do not use for Phase 2 promotion |
| Purchase-order receiving delay | Frequent for stock businesses | potentially, through receiving | route/workflows exist | line receipt, inventory, AP, and evidence consequences make it wider than one narrow command | defer |
| Stockout/dead-stock action | Frequent | no single terminal state | no deterministic one-click command | reorder, transfer, markdown, or count may each be correct | defer |
| Payroll exposure | High trust value | source workflows exist | several protected commands | sensitive person-level context, role specificity, and lower universal daily frequency | defer |
| Generic Action Item resolution | Broad future value | no current persistence/source verifier | no | would create a second truth surface and a migration solely to hit a count | reject for this slice |

## Selected Source Contract

### Source Owner

- Domain: payment reconciliation.
- Durable aggregate: `ReconciliationRun`.
- Source module: `payment_reconciliation`.
- Source transition: `READY_FOR_SIGNOFF -> SIGNED`.
- Source identity: `{ organizationId, runId }`.
- Maker: `runById`.
- Checker: authenticated `signedById`.

### Command Descriptor

The Action Center should receive a read-only descriptor from a payment-reconciliation-owned state service. It must not manufacture a generic resolved record.

Recommended descriptor fields:

```text
kind: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND
commandId: payment-reconciliation-sign:<runId>
organizationId
runId
providerAccountId
providerDisplayName
businessDate
periodStart
periodEnd
status: READY_FOR_SIGNOFF
runById
updatedAt
aggregate totals: internal, external, matched, suspense
matchCount
exceptionCount
sourceVersionHash
generatedAt
```

`commandId` is a UI/read-model identity. `ReconciliationRun.id` remains the write identity. `sourceVersionHash` must be server-generated from the minimum stable source fields and controls; it is evidence for freshness and display, not authority to sign.

### Deterministic Candidate Selection

When more than one run is ready, select and display the oldest `businessDate`, then oldest `createdAt`, then lexical `id`. This prioritizes close pressure without an opaque score. A later UI may show multiple runs, but the first implementation should expose one narrow command.

### Scope

- Show the command only for resolved `TENANT_WIDE` operating authority.
- Do not expose it in managed-location bundles because `ReconciliationRun` is organization/provider scoped and has no authoritative `locationId`.
- Query by trusted `organizationId`; never accept organization identity from the client.
- A foreign or missing run must return the same non-enumerating unavailable outcome.

### RBAC And Entitlement

- Read evidence requires `payments.reconciliation.read`.
- Command execution requires `payments.reconciliation.sign`.
- The `payment_reconciliation` module entitlement must be enforced for both the state adapter and write action.
- `dashboard.read` alone must never reveal reconciliation command details.
- A read-only actor may receive a link to the reconciliation workbench only when read permission and module entitlement permit it; no sign button is rendered.

### Redaction

The operating surface may show provider display name, business date, aggregate totals, aggregate counts, and readiness controls. It must not expose customer identity, payment credentials, raw provider payloads, statement lines, account secrets, person-level evidence, certificate payload, or unrelated provider accounts.

### Resolution Evidence

No free-form client `resolved` flag or generic resolution note is accepted. The server writes structured resolution evidence:

- resolution code: `PAYMENT_RECONCILIATION_SIGNED`;
- run ID, provider account ID, business date, signer, signed time, certificate hash, source counts, and correlation ID;
- sensitive-action audit decision;
- ledger audit event;
- `payment.reconciliation.signed` business event and outbox notification;
- close-certification invalidation.

This structured record is the resolution note for Action Center purposes. Optional human commentary is out of scope and must not be introduced into a certificate without a separate redaction and retention decision.

## Required Backend Hardening

The source workflow is strong, but it should be hardened before Action Center exposure.

1. **Narrow state adapter**
   - Add a payment-reconciliation-owned command-state contract and service.
   - Resolve trusted tenant-wide operating access before reading.
   - Apply payment reconciliation module entitlement and read/sign permission filtering.
   - Return one deterministic candidate or an explicit empty/read-only/denied state.
   - Return a projection hash and source version without broad dashboard payloads or notification side effects.

2. **Verified fresh-auth provenance**
   - Replace `lastAuthAt: Date.now()` in the reconciliation sign action with the verified `ctx.freshAuth.lastAuthAt` pattern used by the certified daily-close sign action.
   - Validate fresh-auth claims against actor and organization before calling the service.

3. **Module enforcement**
   - Add an enforced `payment_reconciliation` module gate with `accessIntent: "write"` and audit enabled to the sign action.
   - Do not rely on the report-only file-level module inventory record.

4. **Idempotent replay semantics**
   - Treat `{ organizationId, runId, terminal SIGNED state }` as the command identity.
   - A retry after a committed sign by the same checker should return the existing signed result with `replayed: true` and must not emit another business event, outbox row, or terminal mutation.
   - A run signed by another checker returns an already-completed state and refreshes the read model; it must not overwrite signer evidence.
   - Correlation ID remains tracing metadata, not the source of idempotency.

5. **Stale-source behavior**
   - The write transaction must continue to re-read the run, maker, accounting period, open exceptions, open suspense, provider evidence, and source manifest.
   - If status or evidence changed after the descriptor was rendered, reject safely and refresh the Action Center.
   - The browser cannot override source status or source-version mismatch.

6. **Concurrent transition guard**
   - Ensure only one `READY_FOR_SIGNOFF -> SIGNED` transition can commit. Prefer a conditional update or equivalent transaction guard tied to current status/source version, followed by read-back validation.

No Prisma migration is expected for this command. `ReconciliationRun`, audit, business event, outbox, and close invalidation persistence already exist.

## Action Center Composition Contract

The selected command should be appended to tenant-wide Manager Action Center actions using the existing source-owned assurance-action composition pattern.

- Do not convert it into a synthetic `BusinessSignal` about open suspense.
- Do not reuse the aggregate `act_*` ID created from `open_payment_suspense`.
- Add an explicit command discriminant such as `PAYMENT_RECONCILIATION_SIGN_OFF` to the manager action contract.
- Keep ordinary signal actions link-only.
- Count the command in visible/open/due-today summaries only when its source state is `READY_FOR_SIGNOFF` and the actor can see it.
- Keep payment command hidden counts separate from generic signal permission filtering so the UI does not reveal the existence of inaccessible reconciliation runs.
- After success, refresh from source; the command disappears because the run is now `SIGNED`.

## Product Command UX Contract

Reuse the certified branch daily-close sign-off interaction pattern:

- compact command row/card inside the existing Action Center, not a new dashboard section;
- provider, business date, aggregate reconciliation summary, evidence state, and independent-checker warning;
- password step-up dialog with password cleared immediately after submission;
- one in-flight request guard and stable retry identity;
- explicit handling for authentication required, invalid credentials, rate limiting, stale fresh auth, permission/entitlement change, stale source, independent-checker denial, replay, and success;
- correlation reference only on safe error output;
- server refresh after every terminal or access-changing result;
- English and French copy;
- no password, session, cookie, assurance token, raw certificate, or provider payload in logs, screenshots, or saved evidence.

The finance workbench's current direct sign mutation does not provide this explicit password step-up UX. The Action Center command must use the certified step-up pattern rather than assuming a fresh session.

## Implementation Sequence

### Slice 22 - Source-Owned Reconciliation Sign-Off Command State

Implement only the narrow read model and contract.

Expected files:

- `services/reconciliation/payment-reconciliation-sign-off-command-state-contracts.ts`
- `services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts`
- minimal manager query/composition contract changes only if required to prove integration shape
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_OFF_STATE_REPORT_2026-07-19.md`

Done when tenant-wide source state, permission/entitlement outcomes, deterministic candidate selection, redaction, and projection hashing are independently tested without UI.

### Slice 23 - Protected Reconciliation Sign Command Hardening

Expected files:

- `actions/payments/reconciliation.actions.ts`
- `actions/payments/__tests__/reconciliation.actions.test.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`
- module-surface evidence generated by the repository gate
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_REPORT_2026-07-19.md`

Done when verified fresh-auth provenance, module enforcement, idempotent replay, conditional terminal transition, stale-source behavior, and single audit/event emission are proven.

### Slice 24 - Reconciliation Sign-Off Product Command

Expected files:

- `services/manager-action-center/manager-action-center-contracts.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- focused manager service tests
- `components/manager-action-center/PaymentReconciliationSignOffCommand.tsx`
- focused component tests
- `components/manager-action-center/ManagerActionCenterDashboard.tsx`
- page tests if the server composition changes
- browser evidence and desktop/mobile screenshots under `what-next/referrals/`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_REPORT_2026-07-19.md`

Done when an authorized tenant-wide checker can sign from the Action Center, read-only and location-scoped actors cannot, source state becomes `SIGNED`, evidence is durable, and the authorized browser fixture is restored exactly.

## Required Tests

### State Service

- tenant-wide actor receives the deterministic oldest ready run;
- location-responsibility access fails closed before reconciliation reads;
- organization scoping prevents foreign-run enumeration;
- missing module or read permission yields a non-enumerating unavailable/hidden state;
- read-only actor never receives an executable command;
- no ready run returns an explicit empty state;
- malformed maker/source evidence fails closed;
- projection hash is stable for identical facts and changes when source state/version changes;
- output contains only approved aggregate fields.

### Protected Command And Service

- sign action requires `payments.reconciliation.sign`, 300-second fresh auth, and enforced payment reconciliation entitlement;
- verified session assurance time, actor, and organization reach the service unchanged;
- self-sign is denied before terminal mutation;
- stale auth, missing permission, missing entitlement, wrong status, closed period, open exception, open suspense, provider-not-ready, and source drift all fail safely;
- one successful transition writes one signed run, certificate, control audit, ledger audit, business event/outbox, and close invalidation;
- same-checker retry returns the existing result without duplicate terminal evidence;
- concurrent attempts cannot replace signer or certificate evidence;
- foreign run IDs are non-enumerating.

### Composition And UI

- command appears only in tenant-wide data when source and permissions allow it;
- location bundles remain unchanged;
- read-only users get no sign control;
- generic action links remain links and cannot submit `resolved` state;
- password step-up, rate limit, fresh-auth expiry, source-stale, replay, success, and safe-error states are covered;
- buttons cannot double-submit and dialog layout does not shift;
- English/French copy, keyboard flow, focus return, and accessible names pass;
- desktop and mobile browser runs show zero serious/critical accessibility findings, clipping, overlap, page errors, or failed requests.

## Verification Commands For Implementation Slices

Use focused commands first:

```powershell
npm test -- --runInBand services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts
npm test -- --runInBand services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts
npm test -- --runInBand services/manager-action-center/__tests__/manager-action-center.service.test.ts components/manager-action-center/__tests__/PaymentReconciliationSignOffCommand.test.tsx
npm run typecheck
npm run service:boundary
npm run module:surface:ratchet
npm run role:cockpit:gate
```

Add authenticated desktop/mobile browser certification only in Slice 24.

## Baseline Verification

The audit ran the existing focused baseline:

```text
Test Suites: 5 passed, 5 total
Tests:       25 passed, 25 total
Snapshots:   0 total
```

Covered files:

- Action Queue projection tests.
- Manager Action Center service and query scope tests.
- Payment reconciliation certification service tests.
- Payment reconciliation protected-action tests.

This baseline proves the existing projection and source sign-off controls. It does not prove the new state adapter, hardening, Action Center command, or browser workflow; those remain the work of Slices 22-24.

## Rollout And Rollback Gates

- Default the new command surface off until backend Slices 22 and 23 pass.
- Roll out to an authorized local fixture, then a single pilot tenant with payment reconciliation entitlement.
- Observe sign attempts, denials, stale-source outcomes, replay outcomes, audit/event counts, and Action Center query latency.
- Disable only the Action Center command surface on rollback. Keep the existing finance reconciliation workbench and source service intact.
- Never roll back a committed `SIGNED` run, certificate, audit, business event, outbox message, or close invalidation through UI state.

## Residual Risks

- The current reconciliation action fabricates service `lastAuthAt` with `Date.now()` after wrapper verification; Slice 23 must replace that with verified assurance provenance.
- Current sign behavior is not response-idempotent after a committed success; Slice 23 must define replay before browser exposure.
- The current file-level module inventory maps the reconciliation action but reports it as an enforcement candidate; the command needs explicit enforced module metadata.
- Payment reconciliation is tenant/provider scoped, so this command intentionally does not expand location-manager authority.
- Generic assignment, dismissal, and resolution lifecycle remains a later Action Center capability and is not solved by this command.

## Next Handoff

Run:

```text
/stoquify-daily-truth
```

Implement **Phase 2 / Slice 22: Source-Owned Reconciliation Sign-Off Command State** only. Return to `/stoquify-referral-war-room` after the state report and focused verification are saved. Do not start UI, Phase 3 Leakage Radar, AI, WhatsApp, or generic Action Item persistence in that slice.
