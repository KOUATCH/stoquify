# Account reconciliation coverage — Phase 2

Implemented 2026-10-16 on the existing working tree. This extends the [close control contract](CLOSE_CONTROL_CONTRACT.md); it does not change its version-1 scope hash or certify a complete period close.

## Required evidence

Close and period-scoped accountant data trust call the same account coverage reader. Each provider account known by the observation cutoff has a separate required period window, currency, gaps, source references, and result. There are no dashboard row limits. Current archive/suspension status cannot remove an account's historical obligation. One account's statement or reconciliation cannot cover another account.

The current schema does not establish independently reviewed effective opening/closure dates. Consequently **all accounts known by the cutoff are conservatively required for the full period**, including late-onboarded accounts. This can over-block a genuinely newly opened account. Effective-dated applicability and safe `NOT_APPLICABLE` evidence remain future work; creation timestamps and mutable account status are not accepted as historical opening/closure proof.

For an account with observed activity, imported/processed statement intervals and signed reconciliation intervals must each cover the complete period. The evaluator unions intervals and retains exact gaps. Close and statement endpoints are inclusive stored instants; reconciliation runs have exclusive ends, converted by subtracting one millisecond. A daily run cannot cover a monthly close. Signatures must be available by the observation cutoff, have a certificate hash, and have consistent business date/period assignment. This collector consumes existing signed certificates; independently reconstructing and verifying their current source contents remains part of broader freshness work.

Provider events, payments and statement lines contradict a no-activity claim, including failed imports and undated provider/payment records. Open exceptions, suspense, pending reconciliation runs, and older unsettled payment states remain blockers. Completely unassigned suspense/exceptions conservatively block account coverage until assigned or resolved. Line currencies inconsistent with the account currency block coverage; amounts are not netted across accounts or currencies.

Cadence comes from existing metadata (`statementCadenceDays`, `statement_cadence_days`, or `cadenceDays`, default one day). The collector records cadence, settlement lag, and an informational due date at period end plus cadence and lag. **Neither cadence nor lag waives final-close coverage.** This is a conservative completeness rule, not a new statutory deadline policy.

## Explicit no-activity evidence

An empty query, empty statement, signed empty run, or successful collection receipt is insufficient. The new `reconciliation_no_activity_evidence` table retains:

- Tenant, account, period, exact period endpoints and currency.
- Retained source document reference and SHA-256 document hash, plus the preparer's rationale.
- A deterministic hash binding those fields and the preparer; an organization-scoped idempotency key.
- Proposal time, independent reviewer and approval time, and any later revocation actor/time/reason.

The reference and document hash represent an external document reviewed by people. The service does not fetch a URL, verify bank authenticity, or prove the bytes exist in an external document store. The reviewer must inspect the retained source. This is reviewed no-activity evidence, not a certification of account balances or bank identity.

Server actions in `actions/payments/no-activity-evidence.actions.ts` provide proposal, scoped reading for review, approval and revocation. All derive organization and actor from the authenticated context and enforce the payment reconciliation module. Proposal requires `payments.reconciliation.run`; review reads require `payments.reconciliation.read`; approval/revocation require `payments.reconciliation.sign`. Mutations require fresh authentication within five minutes. Input cannot supply tenant or actor authority.

Proposal and approval require a completed period and no contradictory observed activity or unresolved obligations. Approval re-reads the account, period and sources, requires a different reviewer, and compares the reviewed evidence hash. The same idempotency key cannot change the proposal payload. Repeating the same decision by its original actor is idempotent; changed decisions conflict. Revocation needs a reason and cannot be undone; corrections require a new proposal.

Composite database foreign keys prevent cross-tenant account/period references. SQL constraints enforce approval separation and lifecycle shape. A retention trigger prevents payload edits, deletion, reversal of revocation, and replacement of approval history. Failed approval leaves the proposal unchanged. Source rechecks at collection reject revoked, post-cutoff, altered, period/currency-mismatched, or newly contradicted evidence.

Mutations use the existing catalog → close-period → provider lock order in Serializable transactions. Approval and revocation invalidate affected ready/certified close evidence in the same transaction. Existing retry handling remains bounded; database serialization conflicts may require a caller retry. This work does not claim to complete Phase 3's full mutation/race coverage.

## Close and export behavior

The payment close collector exposes required/covered/blocked account counts and the complete account rows. Missing account coverage fails the payment checklist and creates a high-severity finding. Period-scoped data trust exposes the same rows and blocks certification for every uncovered account. Organization-wide operational portal behavior retains its existing aggregate checks.

Close persists each account's coverage and source references in evidence metadata, included in the existing close-pack payload and hash. Accountant trust exports retain the account coverage matrix too. New proposal/review forms have not been added; the protected actions and existing close evidence output are the implemented surfaces. No-account scopes have zero required/covered accounts, not invented no-activity proof.

## Verification and rollout

Use the reviewed isolated lanes described in [Phase 2 execution evidence](ACCOUNT_RECONCILIATION_COVERAGE_EVIDENCE_2026-10-16.md). The additive migration has only been deployed to newly created local test databases. Application deployment still needs the normal schema release workflow and generated application client. Do not point these tests at an application database.

Rollback before release is removal of this implementation's owned changes; preserve unrelated edits. After release, retain evidence rows and revoke incorrect claims rather than deleting history. Do not drop the table as an operational rollback. Effective-dated account applicability, full freshness/race assurance, external document storage integration, balance reconciliation, and review forms require subsequent scoped work.
