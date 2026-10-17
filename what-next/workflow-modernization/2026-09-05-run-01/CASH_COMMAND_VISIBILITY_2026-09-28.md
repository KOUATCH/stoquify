# Cash Command aggregate access — bounded correction

Verified 2026-09-28T09:00:55.571Z. FA-CASH-COMMAND remains In progress.

## Delivered behavior

The browser receives a service-owned projection: domain permission and current module read admission control amounts, cards, summaries, proof identifiers and related metadata. Denied amounts are unavailable, not zero. Payroll payments and statutory amounts have separate permissions. Mixed-source hashes, blockers and timestamps cannot reveal a denied domain through a permitted card. Hidden queue counts are null. Drawer and module diagnostics require their own authority. EN/FR explains that unavailable values do not establish a zero balance.

## Verification and failed attempts

- Before-fix regressions exposed payroll 350000, statutory 90000 and nine cards despite denial: evidence/cash-visibility-before.json.
- Hidden-source differential testing found private blocker state affecting a permitted drill-through. The route now remains independent of the inaccessible snapshot flag. Failed attempt preserved in evidence/cash-visibility-checks-75c7cf5f-5f47-4c40-bb64-23846fb48e89.json.
- Final focused 35 tests in four suites, changed-file lint and full TypeScript passed: evidence/cash-visibility-checks-c19d425c-ef36-43e6-92cb-718f9f21d9a8.json. All recorded source hashes revalidated before reuse. Earlier unrelated TypeScript errors are absent from this later run; no ownership of their correction is claimed.
- Actual owned PostgreSQL and authenticated route: lanes/environment/cash-visibility-e9ed9334-f743-48a4-b2d1-b460a2b7f9cd.json. Allowed, permission-revoked, payroll-suspended and retained-read states each passed EN 1440px / FR 320px. Denied payroll and foreign-tenant balances were absent from serialized route data. Checked balances, journals and payments remained unchanged by reads. Eight screenshots have exact bindings in evidence/cash-visibility-review-2026-09-28.json.
- The interrupted prior process produced no result and is not counted. A fresh isolated fixture run succeeded. No migration, deployment, real payment or external delivery occurred.

## Practical use

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. An organization administrator supplies role permissions and eligible modules through existing controls. Missing permission is not missing business activity. Users needing payroll balances require payroll.payments.reconcile plus readable payroll access; statutory totals require payroll.declarations.manage. Retained read access does not authorize new work. Genuine payroll approval and posting must be completed through their owning workflows.

## Remaining requirements

- Domain aggregates are projected before browser serialization; broad source snapshots are still loaded before domain admission. Implement scoped source reads and useful domain-specific provenance without duplicate queries.
- Cash Command proof drawer identity, concurrent request order, transport recovery and scope withdrawal require correction and runtime verification.
- Actual proof discovery/opening and recovery need database/browser verification; aggregate runtime proof does not establish that lifecycle.
- Payroll destination permissions disagree with some card links; the stock card targets a nonexistent inventory/stock route. Verify and correct authorized handoffs.
- Complete EN/FR service and shared-component copy, honest current-observation labels, keyboard/contrast/reflow and route-latency investigation. Synthetic read fixtures do not verify genuine posted payroll.

The inspected FR screenshot visibly contains English source labels and shared components. Only the new unavailable-value notice is localized by this correction. Development view durations ranged from 4.4 to 7.0 seconds after the first 73.6-second compilation-influenced view; these are full test interactions, not isolated query timings or approved performance budgets.

## Review responsibilities

Architecture/backend/data/security: source-owned projection and domain/tenant boundaries verified within the recorded scope; broad underlying queries remain open. Frontend/workflow/accessibility/localization: notice and no-overflow checks passed; broader requirements remain open. Finance/audit: no zero substitution or financial mutation; authentic posted obligations remain unverified. Product/quality/SRE/rollout: regression and runtime evidence retained; no release certification. Packaging: current module access remains distinct from financial state. Statutory, billing, providers, AI, offline and new migrations: not applicable to this read projection; no rules or operations changed.
