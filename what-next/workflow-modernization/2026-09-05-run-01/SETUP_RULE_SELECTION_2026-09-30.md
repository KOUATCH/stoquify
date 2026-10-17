# Authoritative setup rule selection

FA-CASH-COMMAND remains In progress. The preceding turn delivered verified notification and line-side corrections. This checkpoint addresses the next demonstrated setup dependency; it does not certify a complete close workflow.

## Reproduced defects and correction

In three new owned PostgreSQL tenants, setup failed to flag a required posting purpose while the posting service refused it: a MANUAL rule counted for POS_SALE; a rule referenced an inactive account; and a valid lower-priority rule hid the selected debit-only rule. No financial operation was performed. Before evidence: `lanes/environment/setup-rule-selection-reproduced-936e786c-1db3-4594-aca5-e16fadd0374f.json`.

Readiness now uses explicit existing source/purpose pairs and the same priority/creation-time order as posting, with an ID tie-breaker for otherwise equal candidates. It validates the selected rule through the existing posting-rule validator, including account/mapping resolution, active leaf accounts, line-side/reference integrity and nonzero multipliers. An invalid preferred rule remains an error; a lower-priority rule cannot hide it. Unexpected database errors propagate rather than becoming missing-data success.

The setup transition and control-center table consume the same structured readiness result. The table displays the selected rule and localized recovery guidance; its independent rule listing and inconsistent code-based tie-breaker were removed. Existing rule-creation and account-validation behavior remains unchanged. A configured source/purpose pair is not proof that every corresponding business producer is operational.

## Verification

- 76 tests / 6 suites, changed-file lint and TypeScript passed: `evidence/setup-rule-selection-checks-4f0cdb6a-b651-463e-af49-0df9af39a737.json`. Scope: setup transitions, posting rules, control-center data, default templates, data trust and close pack. Tests cover selected invalid rules, wrong source, inactive/missing/non-leaf references, zero multipliers, database failure propagation, notification-independent EN/FR rule guidance and the common selection order.
- Actual PostgreSQL: `lanes/environment/setup-rule-selection-corrected-4f1e4e34-0356-4e9e-855f-69ca85919f26.json`. All three previously missed conditions are now reported. The control-center data identifies the unusable selected rule (or no applicable rule) and refuses setup locking. Journals, payments and pack exports remain absent.
- Local readiness samples took 257, 88 and 33 ms, versus 148, 141 and 15 ms in the preceding negative-fixture reproduction. Different fixtures/cache state and small samples prevent a performance conclusion. Measured query counts were 4, 5 and 4. Each selected rule may add up to two tenant-scoped account reads through the canonical validator; a fully populated setup profile remains necessary. The control center no longer runs a separate duplicate rule-list query.
- The corresponding browser receipt and screenshots are linked by `evidence/setup-rule-selection-review-2026-09-30.json`; consult its exact results rather than treating service checks as browser evidence.

## Operator guidance

Open `/en/dashboard/accounting/control-center` or `/fr/dashboard/accounting/control-center` with `accounting.setup.manage`. Use the page's posting-rule section to inspect the actual selected rule, expected source and reason it is blocked. A different source type or healthy fallback does not repair the selected rule. The authorized accounting setup owner should correct the intended rule, priority/effective dates, or account mapping through existing configuration controls, then refresh and reassess.

Inputs and sources: the administrator grants current permissions; the accountant supplies the intended business source and reviewed posting treatment; account status, mapping, hierarchy and effective dates come from the current accounting configuration and underlying business records. Do not copy synthetic negative fixtures into production, invent references or interpret identity verification as accounting approval.

## Remaining scope and recovery

Four required purposes still lack default templates: CASH_DRAWER_CLOSE, GOODS_RECEIPT, EXPENSE_APPROVAL and INVENTORY_ADJUSTMENT. Their producer behavior/applicability needs reconciliation before implementing legitimate defaults. Successful eligible close certification, current-configuration concurrency, invalidation/recovery, wider payroll/provider lifecycles, native screen-reader/zoom and production-volume latency remain open. No whole workflow is newly complete.

Architecture/backend/data review: shared service result and existing validator are authoritative; current tenant scope is retained. Security/controls: no permission or fresh-auth relaxation, no fallback to an invalid lower-priority choice, and no read failure becomes zero rows. Finance/audit: readiness is stricter and actual negative fixtures create no financial outcomes; line structure is not certification of accounting treatment. Frontend/localization: existing table/tokens are reused, with EN/FR selected-rule guidance. Quality/SRE: focused regression plus source-bound database/browser evidence; query cost is explicit. Product/support: the table now identifies the configuration actually preventing posting.

Statutory approval, billing, AI/agents, offline, provider delivery and migration changes are not applicable to this correction; no such behavior changed or certification is asserted. Operational posting now has a deterministic ID tie-breaker for exact priority/time ties, so review any intentionally tied legacy rules during rollout. Other ordering and validation are unchanged.

No migration, deployment or live activation occurred. Release through existing gates and inspect setup denials before cohort expansion. Retain source archives for targeted recovery. Reverting this readiness correction would restore false-positive setup behavior; do not roll back the shared checkout or weaken the existing certified-export setup gate.
