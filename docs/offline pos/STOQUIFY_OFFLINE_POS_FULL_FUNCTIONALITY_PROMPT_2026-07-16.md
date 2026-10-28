# Stoquify Offline POS Full-Functionality Prompt

**Date:** 2026-07-16

## Prompt

Act as a senior enterprise POS architect, offline-first systems engineer, retail operations expert, cybersecurity/RBAC specialist, and finance-control architect.

In the Stoquify project, assess the POS Offline workflow and answer: what will it take to deliver a complete, production-grade offline POS experience with full functionality?

Use the current repository evidence, especially POS, offline sync, receipt, fiscal replay, inventory, payment, cash drawer, accounting, reconciliation, close-assurance, and workflow-assurance surfaces. Do not give a generic offline POS explanation. Ground the answer in the existing implementation, current gaps, and the safest build path.

Cover these areas:

1. Current state

- What offline POS capabilities already exist?
- Which files, services, hooks, actions, tests, and reports form the current offline POS control spine?
- Which parts are already strong enough to preserve?

2. Full-functionality target

Define what "complete offline POS" means for Stoquify:

- cashier offline sale capture;
- provisional receipt generation;
- durable local queue;
- device identity and trust;
- idempotent sync and replay;
- conflict detection and quarantine;
- server-owned finalization through normal POS sale commit;
- stock, payment, drawer, ledger, receipt, fiscal, and audit effects;
- manager/accountant workbench;
- payment reconciliation;
- close blockers;
- fiscal/country-pack policy;
- observability and support diagnostics.

3. Gap analysis

Identify what is missing or incomplete today:

- cashier charge-flow fallback;
- localStorage vs IndexedDB durability;
- offline readiness checks;
- device signature verification;
- multi-tab and crash recovery;
- conflict-resolution workflows;
- offline tender reconciliation;
- fiscal certification blockers;
- PWA/app-shell resilience;
- field testing and release gates.

4. Architecture and boundaries

Explain the correct architecture:

- what runs in the browser;
- what must remain server-owned;
- what should never happen offline;
- how replay must avoid duplicate sales, stock movements, payments, ledger postings, receipts, and fiscal numbers;
- how tenant, RBAC, terminal, location, session, and device scope are enforced.

5. Implementation roadmap

Provide a phased roadmap from current state to full functionality:

- Phase 1: cashier offline fallback and provisional receipt;
- Phase 2: durable IndexedDB queue;
- Phase 3: device trust and signatures;
- Phase 4: offline operations workbench;
- Phase 5: payment reconciliation and close assurance;
- Phase 6: fiscal/country-pack hardening;
- Phase 7: PWA resilience, observability, and field release.

For each phase, include:

- user value;
- files likely touched;
- service/data changes;
- risks;
- tests;
- success criteria;
- remaining blockers.

6. Verification plan

Define the exact tests and gates required before production:

- unit tests;
- service replay tests;
- UI offline smoke tests;
- browser refresh/crash recovery;
- duplicate replay tests;
- revoked-device tests;
- fiscal-policy tests;
- payment-reconciliation tests;
- close-blocker tests;
- observability and support runbook checks.

7. Final recommendation

Conclude with:

- the smallest safe next implementation slice;
- what should not be built yet;
- what must remain non-negotiable for finance, fiscal, and audit trust.

Important constraints:

- Do not create final fiscal/legal receipt numbers offline unless a reviewed country pack explicitly permits it.
- Do not decrement stock, create payments, post ledger entries, or issue final receipts in the browser.
- Do not bypass the normal server POS finalization path.
- Do not auto-resolve conflicts silently.
- Preserve service-owned truth, tenant isolation, RBAC, auditability, and evidence.
