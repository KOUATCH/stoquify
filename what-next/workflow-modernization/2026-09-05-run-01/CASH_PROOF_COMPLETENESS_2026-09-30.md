# Cash proof grading: complete blocker checks

FA-CASH-COMMAND remains In progress. This correction completes a source-truth prerequisite discovered while examining the remaining proof drawers. It does not close Cash Command or its downstream workflows.

## Defect and correction

The proof service graded reconciliation and payment evidence from the latest ten exceptions and suspense items. Close grading used twenty checklist, finding and evidence rows, and ten exports. Journal/payment event checks similarly inspected ten recent events. Older open issues, later failed checklist items and older certified exports could fall outside those display samples.

An isolated PostgreSQL reproduction put an unresolved high-severity issue outside each sample. Before the change, reconciliation was **reconciled**, payment and close were **operational**, and each reported no blockers. After the change, all four reproduced cases are **blocked**, with the correct missing issue counts. The fourth case isolates an older failed business event after resolving the synthetic payment exceptions and suspense.

The service now uses tenant-and-subject-scoped aggregates over every relevant exception, suspense, close finding, failed checklist item, unavailable evidence item and certified export. Event checks count failures outside the displayed sample and add an explicit blocker. Existing severity policy remains unchanged. Displayed evidence lists remain bounded. Missing subjects stop before related queries; query failures propagate rather than becoming successful zero counts. Action permissions, module guards, redaction and audit behavior are preserved.

## Verification

- Baseline reproduction: [receipt](lanes/environment/proof-completeness-baseline-f7b89bb6-be5a-4e93-bc57-656f70f346fb.json).
- Corrected persisted-record checks: [receipt](lanes/environment/proof-completeness-corrected-84b05cfd-980d-4ab7-8783-6df941d1d0df.json). Four blocked cases; foreign-tenant subject rejected; resolved synthetic payment becomes operational with no blockers; source record fingerprints unchanged during each proof read; no payment or journal records created.
- Static checks: [receipt](evidence/proof-completeness-checks-d0f80961-b576-45ce-bf65-b764de05edf9.json). 40 tests across service, grade policy, actions, module boundaries and drawer; changed-file ESLint; repository TypeScript check all passed. Commands and exact source hashes are in the receipt.
- Preserved failed attempt: [receipt](evidence/proof-completeness-checks-39697116-f03c-40be-8348-6b41eb29ac2a.json). One new test used MOBILE_MONEY_STATEMENT, which is not an AccountingSourceType and therefore correctly did not query BusinessEvent. That test now uses PAYMENT_RECONCILIATION; production source validation was not relaxed.

Runtime fixture runner: `lanes/environment/verify-proof-completeness.cjs`. It uses the existing disposable database ownership and identity guard, disables external fetch, creates uniquely named synthetic records and never signs a reconciliation, posts a journal or issues a payment. Static runner: `run-proof-completeness-checks.cjs`; invokes inspected Jest, ESLint and migration-free tsc directly.

## Impact and review

Graph action node `evidence_proof_trail_actions_ts` (community 31) and service node `evidence_proof_trail_service_ts` (community 45) locate the shared boundary. Current source confirms consumers in Cash Command, Payment Reconciliation Workbench, Stock-to-Cash and Owner War Room. The return contract is unchanged; any consumer can now receive a blocked grade when an older issue exists. Existing closed workflow source bindings are unaffected by the two product/test files changed here.

Architecture/backend/data: aggregate queries keep response size bounded and use root ownership before child queries. Security/IAM/privacy: tenant filters on every new query; action admission, redaction and audit retained. Finance/controls/audit: completeness corrected without changing certification or approval policy. Quality: meaningful hidden-record, severity, aggregate failure, tenant and certified-export cases. Product/workflow/frontend: more accurate proof status; no layout or navigation change. SRE: a bounded number of additional queries, with observed local durations in the runtime receipt; no production performance certification. Commercial packaging, statutory/country rules, providers, migrations and AI decisions: not applicable to this read-only grading correction. These are engineering reviews, not professional approvals.

## Operator guidance and recovery

Open `/en/dashboard/finance/cash-command` or `/fr/dashboard/finance/cash-command` and use an authorized proof link. A blocked grade can refer to an issue outside the visible evidence sample. Use the owning reconciliation or close workspace to inspect and resolve the underlying records, then reopen the proof. A grade change is not a new approval or posting. Query errors require retry or source-service recovery; they do not mean there are no blockers.

No migration or new setup input is required. Preserve the exact before/after hashes in the review record if preparing a rollback. Reverting this correction restores a demonstrated omission; prefer a forward fix if aggregate queries encounter a runtime problem. No deployment occurred.

## Remaining limits

This checkpoint verifies service/database behavior and existing action/drawer regressions. It adds no browser screenshot or new EN/FR proof-content evidence. Journal hidden-event behavior and older certified close exports are unit-verified, not new persisted journal/export lifecycle proofs. Proof reads are not an atomic approval snapshot; concurrent writes can change records between queries, and governing mutations must revalidate their own controls. Complete proof-subject browser lifecycle/localization, genuine posted payroll, accessibility, latency and the original Cash closure checklist remain open.
