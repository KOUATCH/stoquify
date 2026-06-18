---
name: aqstoqflow-certification-assurance-hardener
description: Harden AqStoqFlow OHADA SaaS certification readiness, close pack assurance, recertification invalidation, inventory valuation assurance, and truthful statutory blockers. Use when Codex must modernize close certification, prevent misleading statutory claims, add stale certification triggers, connect inventory valuation evidence to close packs, or audit certification readiness without faking legal authority certification.
---

# AqStoqFlow Certification Assurance Hardener

Use this skill to harden AqStoqFlow certification readiness without falsely claiming statutory authority certification. Build truthful evidence, blockers, stale-state detection, and inventory valuation assurance around the existing Close & Assurance Center.

## Certification Language

Keep these meanings separate:

- System evidence certification: internal AqStoqFlow evidence pack with hashes, source links, controls, and audit records.
- Statutory certification readiness: system evidence plus explicit blockers showing whether an accountant, legal reviewer, or authority adapter can review.
- Statutory authority certification: external legal certification. This remains blocked unless real authority integration, verified country pack, and qualified expert/legal approval exist.

Never use UI, export, service, or report wording that implies statutory/legal certification when only system evidence exists.

## Required First Reads

Before editing code, read:

1. `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md` when present.
2. `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_IMPLEMENTATION_REPORT_2026-06-16.md` when present.
3. `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md` and later 010 reports when present.
4. `services/accounting/close-assurance.service.ts`.
5. `services/accounting/close-assurance-pack.service.ts`.
6. `services/accounting/data-trust.service.ts`.
7. `services/inventory/inventory-valuation.service.ts`.
8. `services/events/business-event.service.ts`.
9. Relevant Prisma models for close runs, evidence items, exports, ledger batches, journal entries, inventory transactions, stock adjustments, accounting periods, and business events.
10. `references/certification-scope-catalog.md`.

## Report-Mode Scan

Run the bundled scanner before implementation:

```powershell
node "C:\Users\J COMPUTER\.codex\skills\aqstoqflow-certification-assurance-hardener\scripts\certification-assurance-scan.js" --root . --out "what-next\AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md" --json-out "what-next\AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.json"
```

Use the scan to pick the smallest implementation slice. Do not use scanner output as proof of legal compliance; it is only a codebase evidence map.

## Implementation Scope

Build the smallest complete service-owned hardening slice that improves:

1. Certification scope model:
   - Separate internal system certification from statutory readiness and external statutory authority certification.
   - Use truthful statuses such as `SYSTEM_CERTIFIED`, `STATUTORY_READY`, `STATUTORY_BLOCKED`, `REQUIRES_EXPERT_REVIEW`, and `AUTHORITY_NOT_CONFIGURED` where appropriate.
   - Block misleading legal wording in UI/export/report surfaces.

2. Automatic invalidation and recertification:
   - Detect changes after close pack export or certification.
   - Mark packs stale when relevant source rows change.
   - Record stale reason, source model, source id, actor where known, old evidence hash, and new evidence hash when available.
   - Produce audit and business-event evidence for invalidation.

3. Inventory valuation certification:
   - Reconcile inventory quantity/value to immutable inventory transactions, current levels, counts, variances, write-offs, purchases, POS movements, opening stock, and class 3 ledger balances.
   - Create close findings/blockers for valuation mismatches.
   - Produce inventory valuation annex metadata for close packs.

4. Close pack evidence annexes:
   - Add inventory valuation annex metadata with provenance, period, as-of timestamp, source counts, hash, and blocker state.
   - Block certified export when inventory valuation annex evidence is stale, missing, or mismatched.

5. Action/UI safety:
   - Keep services as business-rule owners.
   - Actions validate, authorize, call services, and map safe responses.
   - UI shows truthful states: system-certified, stale, blocked, expert-review required, authority not configured.

## Invalidation Sources

Consider stale triggers from:

- journal entries and journal lines;
- ledger posting batches and source links;
- accounting periods and close runs;
- payment reconciliation runs, suspense items, payment exceptions, and statements;
- inventory transactions, inventory levels, stock adjustments, write-offs, and stock counts;
- purchase receipts, AP invoices, and supplier payments;
- POS sales, refunds, voids, drawer closures, and offline POS replay/conflicts;
- fiscal documents, compliance submissions, adapter configs, and evidence rows;
- country-pack version, capability, or expert-review status changes;
- permissions, approval evidence, waiver decisions, and accountant review evidence.

## Architecture Rules

- Keep changes additive and surgical.
- Use existing Prisma transaction, RBAC, fresh-auth, maker-checker, typed error, audit, business-event, ledger, and close-blocker conventions.
- Do not rewrite the Close & Assurance Center.
- Do not fake country authority integrations.
- Do not backfill fake statutory evidence.
- Prefer explicit blockers over optimistic claims.
- Do not mutate journals, inventory transactions, certified packs, or approval evidence in place; use corrective or invalidation events.

## Required Tests

Add focused tests for any touched workflow:

- successful internal system certification with valid evidence;
- automatic stale/invalidation when ledger data changes;
- automatic stale/invalidation when inventory valuation data changes;
- inventory valuation mismatch creates a close blocker;
- missing statutory authority configuration blocks statutory certification;
- expert-review country-pack values block statutory certification;
- certified export blocked when inventory valuation annex is stale;
- unauthorized actor rejection;
- same-actor certification rejection where applicable;
- safe action error mapping.

## Verification

Run focused checks first, then broaden by blast radius:

```powershell
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts
npm run prisma:validate
npm run typecheck
npm run inventory:boundary:fail
```

Run inventory valuation and action tests whenever those surfaces are touched. Run broader Jest if shared services or schemas change.

## Completion Report

Save a report under `what-next/` listing:

- files inspected;
- services added or changed;
- certification states added;
- invalidation triggers added;
- inventory valuation assurance checks added;
- blockers added;
- tests added;
- verification commands run;
- remaining statutory certification blockers;
- next recommended hardening slice.

If only a scan was run, state that no implementation was performed and identify the first safe implementation slice.
