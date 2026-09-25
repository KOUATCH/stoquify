# Independent exception closure: service implementation

The source trace confirmed that financial suspense resolution left the linked reconciliation exception open, with no general retained exception decision to bridge into run review. This batch implements that decision for financial-discrepancy exceptions. It does not yet supply the operator interface or move a run to READY_FOR_SIGNOFF. Full platform scope remains active.

## Delivered behavior

The server verifies the original exception/suspense pair, available original payment/provider/statement evidence, current independently approved financial resolution, clearing allocation and audit lineage. A proposal records the operator's reason and reviewed revision without changing the exception. A different authorized reviewer may approve or reject it; the run maker cannot approve. Both write operations require current exception-resolution permission and recent authentication, alongside reconciliation and accounting read authority.

Approval retains the complete prior exception and any prior run certificate, records a durable decision/audit/notification, and changes only the exception's closure state. It keeps the run in NEEDS_REVIEW and uses the close service's new `PAYMENT_RECONCILIATION_EXCEPTION_DECIDED` source to invalidate affected current close evidence. Rejection retains the original obligation. Closure posts no financial journal. Exact retries validate retained evidence and return the existing receipt; changed requests, stale sources, lost conditional updates and incomplete audit records fail explicitly.

The evidence manifest now includes the verified closure receipt and proposal hashes for terminal exceptions. A terminal label alone is insufficient. Changed original source, financial proof, decision content or missing audit cannot remain valid closure evidence. Existing source-owned clearing recovery reopens the exception, clears its terminal timestamp and retains the closure receipt. An old approval retry after reopening is refused.

Supported through this financial-evidence path: AMOUNT_MISMATCH, MISSING_PROVIDER_EVENT, MISSING_STATEMENT_LINE, MISSING_INTERNAL_PAYMENT, FEE_DEVIATION and LATE_SETTLEMENT. This records a human-reviewed exception outcome; it does not assert that a missing external event arrived. Fraud, tampering, signature, replay, duplicate-reference and other investigation types need their own verified remediation path. Financial clearing does not prove those investigations complete.

## Implementation boundaries and remaining work

- New contracts, closure service, transaction-only closure evidence, and four protected actions provide preview, proposal, independent review and decision.
- The existing original-link proof was separated into a transaction-only source-evidence file. Its behavior remains reused by link repair and closure. Evidence generation does not import request authentication through the command service.
- EN/FR notification labels were added to the existing workbench inbox. No new closure screen has been integrated or browser-verified yet.
- Case navigation, retained proposal/decision history, draft-preserving EN/FR UI, actual browser role/authentication journeys, additional investigation types and reviewed-run preparation remain implementation work. Do not ask users to paste database IDs to compensate for this missing interface.
- Terminal legacy or domain-specific exceptions without the required verified closure lineage will fail manifest validation. Historical/domain adapters and genuine expert-reviewed investigation evidence still require assessment before rollout. Do not manufacture closure receipts, relabel statuses or disable the check to pass a gate.
- Sign-off, export and cross-domain release regression remain incomplete for the full new closure journey. A generated manifest is not a signed certificate.

## Verification and retained failures

Final focused tests: `evidence/exception-closure-v111-tests-bound.json`, 129 tests / ten suites, receipt `c34aff`. These cover closure service/actions, link proof, manifests, certification, notifications, close invalidation, complete run counts and automatic-run producers. Eleven-file lint passed, receipt `283fd4`. Final typecheck binding is appended by the publisher.

Final owned PostgreSQL result: `lanes/environment/exception-closure-v111-4d54c95b-37a.json`, receipt `135e5e`, four check groups. The fixture runs actual original-pair repair, suspense proposal/posting, independently posted clearing, financial resolution, independent exception closure and independent clearing reversal. It verifies scope and authority refusals, exact proposal retry, rejection, full rollback on late audit failure, competing approvals, one retained decision, manifest verification, no financial changes during exception closure, and preserved decision history after actual reopening. Existing organizations remain unchanged. These are synthetic isolated records and trusted direct service inputs, not live approvals or browser-authentication proof. No run is synthetically marked SIGNED.

Earlier results remain retained: the first four-suite run passed 17 tests but three suites could not import the new auth dependency. Transaction-only evidence was separated from authenticated commands; this corrected the dependency rather than changing Jest to ignore it. A subsequent 55-test run and an 85-test run passed. The first typecheck rejected an unregistered custom error code; the implementation now uses the existing REVIEW_REQUIRED code. Earlier runtime `exception-closure-v111-f865ccdd-6de.json` passed before the additional proposal-audit replay guard; the final runtime binds that guard.

## User and operator inputs

Once the interface is integrated, the proposing operator must explain the discrepancy, investigation and why the retained financial treatment supports closure. The independent reviewer must supply their own decision and reason. Evidence IDs, current revisions, financial decisions, run references and receipt IDs come from Stoquify's records. The user supplies their own password if fresh authentication is needed. Accounting roles come from existing organization role management.

There is no missing user input preventing the remaining ordinary implementation. Missing navigation and UI are engineering work. A security investigation or country-specific financial treatment may require genuine authorized evidence from its responsible organization/expert; a file hash or arbitrary URL cannot substitute for that evidence.

## Rollout and review responsibilities

No schema migration, deployment, live customer activation, external delivery, real payment or X1 clearance occurred. Do not deploy the closure surface as a complete workflow until the UI, history, domain coverage and legacy compatibility checks above are finished. Preserve receipts and financial reversals; never recover by deleting decisions or resetting status directly.

Architecture/backend/data: reusable source proof, strict commands, transactional evidence and conditional state changes. Security/IAM/privacy: server identity, current roles, fresh authentication, independent reviewer, private before/certificate evidence and redacted previews. Finance/audit/close: distinct financial treatment and exception decision, retained evidence, current close/run invalidation and verified reopening. QA/SRE: focused regressions, owned transactions, concurrent writes and rollback; no production performance claim. UI/localization: existing notification semantics only; complete interactive EN/FR/accessibility/mobile work pending. Product/operations: separate responsibilities and actual receipt references, no pricing change. Statutory/country validation is not established by synthetic accounting fixtures. Payroll, POS/offline, inventory, billing, external provider protocols and AI behavior were not changed; their connected terminal-exception compatibility remains subject to the wider review. These are engineering responsibilities, not professional certification.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Changed files are listed in the aggregate receipt. Passed gates are limited to the checks above. Open gates include the full operator journey, nonfinancial investigation paths, historical/domain compatibility and release evidence. Next numbered skill after reconciliation: `010-aqstoqflow-inventory-valuation-kernel`.


## Final source binding

Source: evidence/source-baseline-v111.json, 2026-09-12T19:43:53.415Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Final configured typecheck passed (receipt 7fcdb2); eleven-file lint passed (283fd4). Tests: evidence/exception-closure-v111-tests-bound.json; runtime: lanes/environment/exception-closure-v111-4d54c95b-37a.json; aggregate: evidence/exception-closure-v111.json. Coverage: 234 provisional workflows / 0 whole workflows complete / 212 unmapped entry sources. The first tests/typecheck failed as documented; subsequent passes do not erase those attempts.
