# Stoquify accounting audit

**Assessment date:** 8 September 2026  
**Decision:** Material hardening is required before broad enterprise reliance on the affected accounting workflows.  
**Scope:** Repository architecture, accounting controls, integrations, services/actions, TanStack Query, UI source, focused tests and synthetic diagnostics. This is an audit and remediation plan; no production corrections were applied.

## Executive assessment

Stoquify has a substantial accounting foundation: tenant-scoped services, Decimal arithmetic, source-linked posting batches, controlled journal actions, dedicated source correction workflows, reconciliation evidence and guarded close-pack exports. The current accounting suite passes 389 tests. The broader first-pass review executed 1,127 tests across 127 suites: **1,125 passed and 2 failed**. TypeScript, Prisma schema validation and two focused static gates passed. Later AP verification is recorded separately in the evidence index because purchasing changed during the audit.

These results do not establish reliable accounting across every exposed path. The highest priorities are currency correctness, immutable accounting policy, source-owned reversals, concurrent period closure and truthful finance labels. In a synthetic example, the statement service returned balanced assets of **200.00 XAF** for nominal activity representing 100 EUR plus 100 XAF; under the supplied illustrative exchange rate the converted total would be **65,695.70 XAF**. The same wrong treatment on both sides still produced a green balance check.

The audit records **15 findings: 7 high-priority and 8 medium-priority**. Seven service probes reproduced relevant behavior with in-memory database doubles. They exercised actual service functions but do not prove live data exposure, deployed constraints, real concurrency behavior or an authenticated exploit. No financial loss estimate is asserted.

The complete findings, evidence, mitigations, owners, estimates and acceptance criteria are in the [risk register](<E:/ohada saas/Focused projects/stoquify/docs/accounting/risk-register.md>). The [architecture map](<E:/ohada saas/Focused projects/stoquify/docs/accounting/architecture-and-flow-map.md>) records integration coverage and limitations. The [remediation plan](<E:/ohada saas/Focused projects/stoquify/docs/accounting/remediation-plan.md>) orders the work by dependency.

## The most serious business risks

| Risk | How it occurs and propagates | Detection and recovery |
|---|---|---|
| Incorrect amounts that still balance — ACC-001/002 | Non-base amounts are not converted consistently; mutable base currency can relabel historical reports. Revenue, assets, expenses, tax balances and equity inherit the error. | Trial-balance equality does not detect equal errors. Compare currencies, source amounts, rates and historical settings. Repair needs accountant-reviewed adjustments or a controlled migration, preserving history. |
| Ledger detached from business truth — ACC-003 | Generic reversal can reverse a POS source journal without the corresponding sale, tender, stock or source-batch correction. Other source types are also not universally excluded. | Source reconciliation may detect disagreement; source-link coverage alone may remain healthy. Recovery requires tracing the source and intended correction, not adding another blind reversal. |
| A closed period that is incomplete or changes underneath the closer — ACC-004/005 | Close preflight and posting do not consistently share a lock protocol. Period closure also omits some inventory/payroll/assurance checks that certified export applies. | Actual races need PostgreSQL tests. Compare closed periods with latest source evidence and assurance blockers. Reopening or adjustments require controlled review. |
| Operational estimates mistaken for accounting or certification — ACC-014 | A capped sales-order list feeds revenue; a purchases-based margin formula is called gross profit; UI proof labels say Posted/Certified without corresponding accounting evidence. | Compare operational and ledger definitions. Correct labels and aggregation first, then reconcile representative periods and regenerate materially misleading outputs. |
| Posted history vulnerable through alternate privileged paths — ACC-007 | Multiple services write journals, while repository schema/migrations lack a uniform posted-content and tenant-consistency backstop. | Inspect deployed privileges/triggers and run direct-SQL tests on a disposable database. Repository gaps do not prove unauthorized edits occurred. Recovery difficulty rises sharply if historical provenance is lost. |

## What is working and should be preserved

1. **Meaningful ledger invariants.** [invariants.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/invariants.ts:52>) uses Decimal, rejects negative amounts and lines with both debit and credit, balances each currency, and checks open periods. Manual account validation rejects foreign, inactive, parent and non-manual accounts at draft creation. This is a useful control boundary, subject to the currency and later-write gaps in the register.
2. **Traceable accounting effects.** Journal entries, posting batches and accounting source links retain source identity, dates and correlation. Unique posting identities and request hashes support deduplication. Source-specific services validate more than a generic success flag; AP replay verifies journal and link evidence before reporting success.
3. **Stronger source workflows already exist.** The primary POS sale transaction connects stock, cash/receivable, payment and ledger effects with serializable retry. It supplies the transaction's cost amount to posting. Dedicated POS refund/void, customer-settlement reversal, purchase correction and inventory reversal paths are preferable to generic journal reversal. AP has source and row locks and durable blocked-posting recovery.
4. **Reversal reporting preserves evidence.** The trial balance and statements include POSTED and REVERSED originals. A separate reversing entry cancels the original in the proper reporting window. The audit does not recommend excluding REVERSED originals: doing so could leave only the negative correction.
5. **Financial statement basis is explicit.** The [statement service](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:478>) distinguishes selected-period activity from cumulative balances, retains archived accounts with posted evidence, validates account descriptors and presents the EBITDA bridge as a management measure. Tests exercise contra-account signs, archived evidence and tenant-period rejection. Its currency aggregation still requires correction.
6. **Close exports have substantive checks.** The [close-pack gate](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:1033>) requires READY, sufficient trust, no unresolved critical/high findings, available evidence, signed reconciliation provenance and current inventory/pilot evidence. This is stronger than the period-close action and should become a consistent policy contract rather than be weakened.
7. **Access and evidence have dedicated controls.** Protected actions derive organization from the server context; sensitive posting/export actions request fresh authentication. Accountant access has consent, expiry, roles and revocation. Receivable snapshots, payroll and certified fiscal/payment evidence have repository immutability migrations. Action/service tests cover relevant denial and evidence contracts, although live enforcement remains unverified.
8. **Events and AI have useful boundaries.** The outbox uses bounded claims, compare-and-set leases, attempt limits and retry scheduling. Copilot proposals carry evidence provenance, tenant/actor checks, expiry and `executionAuthority: NONE`; accepting a proposal is not a ledger-posting capability. No autonomous accounting authority should be inferred from the existence of AI suggestions.

## Readiness by capability

| Capability | Audit disposition | Required next evidence or correction |
|---|---|---|
| Single-currency manual accounting | Partially supported; conditional reliance | Lock policy; source ownership, concurrency, database invariants and UI amount/state corrections. |
| Multi-currency and non-XAF producers | Restrict until corrected | Enforce declared scope or implement validated conversion; independent currency tie-out. |
| Chart, journals and posting rules | Foundation present | Verify current mappings with an accountant; database and lifecycle enforcement across all writers. |
| POS sale/payment/refund/void | Substantial source integration; not fully released by this audit | Resolve shift-close test drift; real database concurrency, split-tender/provider and offline replay verification. |
| Purchasing/AP and supplier settlement | Substantial implementation under active change | Capture a stable revision; validate recovery, corrections, receipt/invoice timing and concurrent commands together. |
| Inventory valuation/COGS/adjustment | Source and reconciliation mechanisms present | Confirm cost policy and period cutoffs, currency, backdated behavior and negative-stock limits with realistic fixtures. |
| Customer receivables/statements | Stronger document and snapshot model | Run live allocation/reversal/expiry/access workflows and verify opening/movement/closing tie-out. |
| Finance analytics and treasury | Labels and definitions need correction | Separate operational outlook, cash movements and posted-ledger results; prove completeness beyond list caps. |
| Trial balance / GL / statements | Useful internal reporting; material caveats | Currency, GL opening semantics, consistent snapshots and bounded detail retrieval. |
| Period close / accountant assurance | Different levels of control | Align mandatory blockers and state meanings; collect real concurrency and stale-evidence tests. |
| Payroll accounting | Dedicated posting/control coverage; external readiness incomplete | Qualified country inputs, payment evidence, correction tie-out and isolated transaction verification. |
| Statutory filings and certified SYSCOHADA presentation | Not established | Jurisdiction/regime/version, official source packets and qualified approval; production adapters remain gated. |
| Accounting UX/accessibility | Static review and component/route tests only | Authenticated English/French journeys, keyboard/screen reader, mobile, stale/denied states and sensitive-action review. |

## Accounting and statutory boundaries

The historical financial-reporting implementation explicitly deferred a true cash-flow statement, certified SYSCOHADA presentation and associated export/mapping work. Current statements retain an internal-report boundary; these deferred capabilities must not be treated as silently completed. Opening customer statements and cumulative balance-sheet logic exist, but a full year-end closing/carry-forward programme was not proven by this audit. A standalone expense, bank-transfer or landed-cost posting command was not established in the reviewed producer inventory; those capabilities need an explicit supported/blocked/manual-workflow decision before promises are made.

OHADA's official AUDCIF page describes the revised SYSCOHADA framework and distinguishes effective dates for individual and consolidated/combined/IFRS accounts. That framework context does not validate Stoquify's mappings, jurisdictional tax rules or a particular entity's filing obligations. [Official OHADA source](https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/), accessed 8 September 2026.

The current Cameroon country pack explicitly sets `productionCalculationSupported: false` and identifies qualified-review requirements. The statutory integration gate passes with production activation and live authority submission disabled. Its success means the integration boundary is in place; it does not mean a country pack or statutory filing is approved.

## Evidence limits and release decision

This was a working-tree audit on branch `codex/migration-control-plane-release-2026-08-29`, anchored to commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. The worktree was already extensively modified. Two initially inventoried purchasing files changed during the audit and new invoice-correction files appeared. The evidence bundle retains source hashes, excerpts, command timestamps and the status delta. Findings apply to the recorded working files, not to the commit alone or to an assumed deployed build.

The local browser reached the login page when navigating to accounting. No credentials were supplied, no authenticated accounting workflow was executed, and the temporary development server was stopped after the observation. The audit did not inspect a deployed database, execute direct endpoint attacks with real sessions, run PostgreSQL concurrency scenarios, validate live providers, measure production query plans or certify accessibility. These are explicit remaining validation tasks, not passed checks.

Proceed first with the containment package in the remediation plan: currency scope, locked settings, source-owned reversal and truthful financial labels. Preserve the existing source/evidence controls. Do not declare enterprise or statutory readiness from test counts, balance equality, static gates or an attractive dashboard alone.
