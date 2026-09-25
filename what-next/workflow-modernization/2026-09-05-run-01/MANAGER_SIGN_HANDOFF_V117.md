# Manager signing handoff and canonical review requirement

The full workflow-modernization assignment remains active. This checkpoint addresses the manager action center's independent signing path and its connection to reconciliation, retained requests and certificate export.

## Findings and implementation

The former manager command rendered a separate password-and-sign dialog. It sent only a header revision and refreshed away the local notice after a failed or successful request. That diverged from the full evidence review and persistent request implemented in v116.

The command now opens the selected run in the existing reconciliation workspace through `?reviewRun=<run-id>`. The normal page read/module guard still runs. The parameter selects a run; it grants no authority, establishes no readiness and causes no write. The destination's scoped sign-review action rechecks the actual current record, maker/preparer independence and complete evidence. Reload retains the selected run and exact pending request, including when a signature has already committed and the run is no longer in the ready queue.

The browser's canonical signing action now requires both the header hash and complete evidence revision. The exported signing hook accepts the same reviewed command and does not retry automatically. Removing the manager's parallel signing implementation means authentication, stale evidence, uncertain outcomes and certificate export follow one working interface. Large retained amount strings are displayed with the existing precise EN/FR formatter rather than conversion to `Number`.

The source-owned manager command projection now reads a preparation pointer and verifies its retained receipt/audit before offering a command. A current preparer receives `PREPARER_CHECKER_REQUIRED` and no actionable signing command. Corrupt or missing preparation proof propagates an error, rather than becoming eligible work. The final sign review still revalidates current evidence and separation; discovery is not approval.

## User and operator instructions

Open `/en/dashboard/manager-action-center` or `/fr/dashboard/manager-action-center`. Use **Review for signing** / **Examiner avant signature** on the reconciliation command. It opens the exact run in the existing reconciliation workspace. Review the run totals and current evidence checks, confirm, and supply your own password if prompted. Password confirmation does not submit automatically; explicitly retry the retained request.

The amounts describe the retained run's original totals. Current unresolved obligations are revalidated separately; a retained original suspense amount is not a current outstanding balance. Closed exceptions and resolved suspense remain in evidence counts.

You need an account with the existing tenant-wide manager authority and dashboard-read permission to use the manager entry. Reconciliation-read, sign permission, current module eligibility and an independent signer are checked again at the destination. Obtain role changes from your workspace administrator; obtain run/source explanations from the reconciliation maker or preparer. If you prepared the run, an independently authorized colleague must sign. Export still requires its separate permission and produces a retained JSON certificate and receipt; it supplies no organizational product approval or X1 clearance.

After an interrupted response, reopen the same review in the same browser session and retry. The pending request keeps its original evidence hashes. A committed signature is recovered from durable state, not reconstructed from a success message. Use the confirmed certificate's export review for the actual file and receipt.

## Review responsibilities and rollout

Architecture/backend: consolidate browser signing through an existing service/UI path and require review at the canonical action. Data/migration: additive certificate field already introduced in v116, no schema or migration here. IAM/privacy: normal page guard, scoped action, current permissions, verified preparation evidence and redacted command output. Finance/audit: no ledger mutation in discovery/sign/export; existing signer/receipt/audit invariants remain. UX/frontend/accessibility: semantic existing link/button, precise amounts, EN/FR handoff and shared recoverable review. Quality: service, action, route and component tests plus owned browser verification. Operations/SRE: lost-response recovery and development route timings; no invented production budget. Packaging: existing module read/write admission preserved, no subscription changes. API/events: canonical reviewed command; existing signing transaction owns events and audit.

Statutory/country rules, purchasing/AP, inventory/POS/offline, payroll, analytics, AI/agents and new provider integrations are not applicable to this bounded patch because their behavior is unchanged; their workflows remain in the full assignment. This is engineering review, not professional certification.

No production deployment, live activation/payment, external message, seed or migration is part of this patch. Keep pending review requests and signed evidence during rollout. Returning to an older manager dialog would lose this review/recovery behavior; do not remove the canonical evidence requirement to make an old client work. Retained source correction/reversal services remain the route for changing financial obligations.

## Verification checkpoint

96 tests across seven suites passed: `91543f` reports67 tests/four passing suites and one component suite-load failure; the Lucide test boundary was corrected, and `c38b56` reports29 tests/three passing suites. The historical dialog tests were replaced with handoff/precision tests because signing is now performed by the separately tested shared review. Canonical action tests verify that both review hashes are required, including a valid request for the fresh-auth provenance test. Full typecheck `6ab2dd`; twelve changed files lint `acbeb4`, no warnings. Browser result and current source binding will be appended after completion.

Remaining engineering: all-run discovery for signers without accounting-read; native assistive technology/zoom; wider lifecycle/concurrency/provider cases; continuing all registered and unmapped platform workflows. The separate exported `ingestAndSignProviderStatement` service still imports, creates and then signs a run using trusted control input without a human full-evidence review. Current production-source search found its definition but no caller outside tests. Trace and assess that programmatic workflow before changing its contract; it is not covered by this browser result.


## Final verified browser/source binding

lanes/environment/manager-sign-v117-browser-01c79679-b20.json, receipt99f9ae: both languages passed, stable source, ten actual screenshots. Manager entry, retained preparer denial, password/reload, deliberate response loss after real commit, one signing audit after exact retry, actual downloaded bytes/receipt match, unchanged financial records and keyboard/320/768/1440 reflow verified. French narrow review screenshot inspected. Expected injected503 and CSS preload warnings retained; no page errors. Native assistive technology/zoom remain unverified.

Manager route EN58961ms/FR5382ms; reconciliation initial visits EN8564ms/FR7210ms. Aggregate local DB diagnostic69491d showed12idle clients and the one active diagnostic, without a lock wait. It does not establish the root cause of cold loading.

evidence/source-baseline-v117.json, 2026-09-13T11:03:23.511Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Aggregate evidence/manager-sign-v117.json. Application8757 remained live; all verification handles are terminal. Source capture and this publisher are one-use checkpoints. Selected skill009 payment reconciliation; next recommended numbered skill010 inventory valuation, without limiting the active whole-platform goal.
