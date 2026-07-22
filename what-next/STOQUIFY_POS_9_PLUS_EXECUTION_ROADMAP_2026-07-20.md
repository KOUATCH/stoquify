# Stoquify POS 9+ Execution Roadmap

Date: 2026-07-20

Baseline: 5.8/10, Medium-High confidence, NO-GO for a 9+ claim and production offline selling.

This document converts the evaluation into a gated delivery program. It proposes work; it does not certify or implement it.

## 1. Target outcome

Reach a defensible 9+/10 only when the certified capability set passes G1-G8 for an exact build, schema, configuration, provider, country pack, and hardware matrix. Preserve the existing atomic online sale, inventory, cash, journal, fiscal, audit/outbox, receipt-token, and shift-close kernel.

## 2. Decision register required before implementation

| ID | Decision | Recommended direction | Blocks |
|---|---|---|---|
| D-01 | STORE_CREDIT | Disable until an authoritative wallet/liability ledger and atomic redemption exist | PAY-01, RET-02 |
| D-02 | Active-session boundary | Model the physical register/drawer boundary explicitly; enforce one active claim in DB | SH-01, SH-02 |
| D-03 | First electronic rail | Pilot one provider/country with sandbox, webhooks, reversals, statements, and kill switch | PAY-02-PAY-04, REC-01 |
| D-04 | Offline risk | Start cash-only or an explicitly provider-supported rail with strict tenant/store/device/value/time caps | OFF-01-OFF-06 |
| D-05 | Hardware matrix | Approve named browser/OS/scanner/printer/drawer/terminal combinations | DEV-01, CERT-02 |
| D-06 | Return policy | Approve partial, cross-shift/location, cash-availability, fee, fiscal, and maker-checker rules | RET-01-RET-03 |
| D-07 | Country scope | Certify EN/FR plus first country pack, XAF minor units, tax/fiscal labels, and cash rounding | LOC-01, RCP-01 |
| D-08 | 9+ SLOs | Approve scan/search/charge/replay/recovery/availability/error budgets | UX-03, OPS-01, CERT-01 |

## 3. Delivery waves

### Wave 0 — governance and capability honesty

Work: establish the program status register; freeze D-01-D-08; map every surface and entitlement; disable unsupported tenders/channels; replace fabricated device/network/offline claims; define G1-G8 and evidence provenance.

Entry: evaluation accepted. Exit: decisions approved or explicitly blocked, ownership DAG valid, capability claims match reality, no unsupported feature is reachable.

Hold Point HP-1: do not start provider/offline implementation until tender/accounting, session/drawer, and access contracts are approved.

### Wave 1 — money, session, and access invariants

Work: PAY-01 internal tender truth; SH-01/SH-02 physical register invariant and migration; SEC-01 consistent entitlement/RBAC/fresh-auth/tenant boundaries; accounting/fiscal golden fixtures.

Entry: Wave 0 exit. Exit: concurrent shift-open yields one winner; unsupported store credit cannot execute; every POS surface has a uniform guard; G1/G2/G5 design evidence passes.

### Wave 2 — authoritative provider and correction lifecycle

Work: PAY-02-PAY-04 provider states, acknowledgement, webhooks, timeout/late-success, reversal/refund; RET-01-RET-03 partial/full/cross-shift corrections; REC-01 reconciliation evidence contract.

Entry: HP-1 passed and D-03/D-06 approved. Exit: operator reference cannot create PAID; refund success requires correct internal/external evidence; accounting/stock/fiscal effects tie out; provider kill switch rehearsed.

Hold Point HP-2: no electronic-payment production claim until sandbox/provider certification and reconciliation proof exist.

### Wave 3 — offline durability and device trust

Work: OFF-01 IndexedDB dual-read migration; OFF-02 leases/stale recovery/multi-tab; OFF-03 per-event acknowledgement and terminal retention; OFF-04 device signing/verification/rotation/revocation; OFF-05 canonical replay; OFF-06 conflict resolution.

Entry: tender contract stable and D-04 approved. Exit: power loss, browser restart, duplicate/reordered/forged events, interrupted response, and conflicts all produce durable explainable outcomes.

Hold Point HP-3: offline selling remains disabled until G3 and G4 pass independently.

### Wave 4 — professional cashier and supervisor experience

Work: UX-01 incremental decomposition; UX-02 truthful robust states; UX-03 scan/search/cart/customer/tender ergonomics and performance; RET-03 and OFF-06 workbenches; move receipt governance out of the selling loop.

Entry: authoritative payment/offline/access states frozen. Exit: failed operations preserve cart; online checkout is keyboard-completable; no capability-blind UI; administrative proof does not compete with checkout; performance budgets pass.

### Wave 5 — hardware, receipts, country packs, and accessibility

Work: DEV-01 device adapters and diagnostics; RCP-01 real delivery providers and provisional/final receipt truth; LOC-01 EN/FR and country-pack money/fiscal behavior; A11Y-01 WCAG/responsive/touch/handheld certification.

Entry: D-05/D-07 approved and stable UX candidate. Exit: every supported combination has objective evidence; unavailable capabilities fail closed; XAF and rounding fixtures pass; zero critical/serious accessibility blockers.

### Wave 6 — reconciliation, operability, and field certification

Work: REC-01 matching/suspense/settlement certification; OPS-01 telemetry/SLOs/alerts; OPS-02 runbooks/support/rollback drills; CERT-01 DB/provider/offline chaos; CERT-02 browser/accessibility/hardware/performance field matrix.

Entry: immutable release candidate. Exit: candidate-bound evidence complete; alerts and runbooks have owners; rollback and recovery rehearsed; no unexplained money, stock, fiscal, replay, tenant, or device outcome.

### Wave 7 — gated promotion and differentiation

Work: REL-01 G1-G8 verdict and claims matrix; promote only certified scope; later evaluate handheld/line-busting, manager analytics, and advisory anomaly assistance.

Entry: Wave 6 evidence complete. Exit: all applicable gates PASS, residual risks have owner/expiry, rollback ready. Any missing or failed mandatory gate is NO-GO.

## 4. Work-package register

| ID | Priority | Work package | Owner skill | Dependencies | Gates |
|---|---|---|---|---|---|
| GOV-01 | P0 | Program status, DAG, evidence provenance, claims register | Program orchestrator | None | All |
| HON-01 | P0 | Disable unsupported tender/channel and fabricated readiness claims | Tender truth + Cashier UX | D-01 | G1, G7 |
| SEC-01 | P0 | Uniform tenant, entitlement, RBAC, fresh-auth, privacy controls | Access trust hardener | D-02 | G4, G5 |
| SH-01 | P0 | Physical register/session boundary and duplicate-data audit | Shift/drawer invariant | D-02 | G2, G5 |
| SH-02 | P0 | DB uniqueness, atomic claim, migration, race recovery | Shift/drawer invariant | SH-01 | G2 |
| PAY-01 | P0 | Tender/accounting state machine and store-credit containment | Tender/accounting truth | D-01, D-07 | G1, G6 |
| PAY-02 | P0 | Provider authorization/capture/status contract | Provider lifecycle | D-03, PAY-01 | G1, G5 |
| PAY-03 | P0 | Signed webhook, timeout, late-success, idempotency | Provider lifecycle | PAY-02 | G1, G5 |
| PAY-04 | P0 | Provider reversal/refund and kill switch | Provider lifecycle | PAY-02 | G1, G6 |
| OFF-01 | P0 | IndexedDB queue and dual-read migration | Durable edge queue | D-04, PAY-01 | G3 |
| OFF-02 | P0 | Leases, stale-SYNCING, multi-tab, corruption/quota recovery | Durable edge queue | OFF-01 | G3, G8 |
| OFF-03 | P0 | Per-event acknowledgement, retention, export/recovery | Durable edge queue | OFF-01 | G3, G8 |
| OFF-04 | P0 | Device key lifecycle, signing, verification, revocation | Offline device trust | SEC-01, D-04 | G4, G5 |
| OFF-05 | P0 | Canonical exactly-once economic replay and terminal evidence | Replay finalizer | OFF-03, OFF-04, PAY-01 | G1, G3, G4, G6 |
| OFF-06 | P0 | Conflict taxonomy, resolution engine, audit, close linkage | Conflict operations | OFF-05, SEC-01 | G3, G5, G6, G8 |
| RET-01 | P0 | Return eligibility, prior-refund and quantity reservation | Returns controls | D-06, PAY-01 | G1, G6 |
| RET-02 | P0 | Provider/cash/stock/journal/fiscal correction lifecycle | Returns controls | RET-01, PAY-04 | G1, G2, G6 |
| RET-03 | P1 | Supervisor corrections workbench | Returns controls + Cashier UX | RET-02, SEC-01 | G5, G7 |
| UX-01 | P1 | Incremental POS component decomposition with parity | Cashier UX | PAY-01, SEC-01 | G7 |
| UX-02 | P1 | Robust loading/denied/stale/pending/declined/offline/conflict states | Cashier UX | UX-01, PAY-02, OFF-06 | G7 |
| UX-03 | P1 | Scanner/search/cart/customer/tender ergonomics and budgets | Cashier UX | UX-01, D-08 | G7 |
| DEV-01 | P1 | Scanner/printer/drawer/terminal adapters and support matrix | Device adapter certification | D-05, PAY-02, SH-02 | G1, G2, G4, G7 |
| RCP-01 | P1 | Real receipt delivery, retry, redaction, provisional/final proof | Receipt delivery proof | PAY-02, D-07 | G6, G7 |
| LOC-01 | P1 | EN/FR, XAF/minor units, rounding, tax/fiscal country presentation | Country localization | D-07, PAY-01 | G1, G6 |
| A11Y-01 | P1 | WCAG, responsive, touch, compact/handheld evidence | Responsive/accessibility certifier | UX-02, UX-03, DEV-01 | G7 |
| REC-01 | P1/P2 | Provider statement ingestion, matching, suspense, certification | Reconciliation certifier | PAY-03, PAY-04 | G1, G6, G8 |
| OPS-01 | P2 | Telemetry vocabulary, SLIs/SLOs, dashboards, alerts | Operability builder | Stable states, D-08 | G8 |
| OPS-02 | P2 | Runbooks, support bundles, incident/rollback/recovery drills | Operability builder | OPS-01, OFF-06 | G8 |
| CERT-01 | P0 gate | DB/provider/offline/security chaos certification | Chaos field certifier | Stable candidate | G1-G6, G8 |
| CERT-02 | P0 gate | Browser/accessibility/hardware/performance field certification | Chaos field certifier | A11Y-01, DEV-01 | G7, G8 |
| REL-01 | P0 gate | Candidate-bound G1-G8 and claims-scope decision | Release governor | CERT-01, CERT-02, OPS-02 | G1-G8 |
| DIF-01 | P3 | Handheld, line-busting, trusted analytics, advisory anomalies | Program orchestrator dispatch | REL-01 PASS | Re-certify affected gates |

## 5. Mandatory evidence by gate

| Gate | Minimum evidence |
|---|---|
| G1 Money | Provider acknowledgement, tender arithmetic, retries, reversals, refunds, reconciliation |
| G2 Session/drawer | Real-DB concurrent open/claim/handover and migration proof |
| G3 Offline durability | Restart, power loss, multi-tab, stale lease, duplicate/reorder and terminal retention |
| G4 Device trust | Signing, canonicalization, rotation/revocation, forged/replayed event rejection |
| G5 Access | Surface inventory, uniform guards, negative RBAC/cross-tenant/fresh-auth tests |
| G6 Accounting/inventory/fiscal | Golden journals, stock movements, fiscal documents, close and reconciliation tie-out |
| G7 Operator safety | Authenticated EN/FR browser, keyboard/screen reader, viewports, hardware recovery, performance |
| G8 Operability | SLO dashboards, actionable alerts, owners, runbooks, support bundles, rollback/DR drills |

## 6. Rollout and rollback rules

- Use additive schema migrations and dual-read/dual-observe transitions where data compatibility is at risk.
- Feature-flag each provider, tender, offline mode, country pack, receipt channel, and hardware adapter independently.
- Provide global and scoped kill switches for provider and offline selling.
- Never erase financial, replay, conflict, fiscal, audit, or reconciliation evidence during rollback.
- Roll back capability exposure before attempting data repair.
- Preserve old queue readability through the IndexedDB migration window.
- Promote only the exact provider/country/device/browser capability subset certified by REL-01.

## 7. Final program success criteria

The POS may claim 9+ only when every proposal maps to an owned work package, all decisions are approved, G1-G8 pass for an immutable candidate, no supported journey fabricates capability or financial completion, all failure paths have accountable recovery and terminal outcomes, and rollback/incident operations are rehearsed.
