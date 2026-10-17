# Cash Command source presentation

2026-09-30T10:29:58.648Z. FA-CASH-COMMAND remains In progress. The previous turn delivered currency/shared-label corrections; this turn delivers authorized source presentation and UTC due-date display. No workflow is added or closed.

## Delivered behavior

The Cash page applies a display-only presenter after server authorization and localized navigation. It translates the authorized brief, cards, risks, observations, actions, trust labels, canonical warnings and proof-link explanations into French. Existing snapshot warning translators are reused. Only known display strings and narrowly matched numeric templates change. Unknown/custom copy, tenant and object IDs, permissions, source hashes, evidence grades, states, monetary values, null totals, denied proof identities and navigation decisions remain intact. English returns the existing model unchanged.

The authorized brief is translated from its disclosed cards only when it matches the service's canonical summary. This avoids reconstructing hidden-domain totals or overwriting custom caveats. French amounts retain source precision and currency. Role labels and non-monetary count units are presented without changing role or currency identifiers used for enforcement.

Action and forecast dates previously used the server's implicit timezone. They now explicitly use UTC and show that context. A Honolulu-default test verifies a July 1 instant near midnight stays July 1 in EN and FR. The shared risk panel now translates watch urgency while preserving the assessment.

## Verification

- 130 tests across five suites, changed-file lint and full TypeScript passed: [final static receipt](evidence/cash-source-copy-checks-08040baa-533b-4b61-88ab-ead73b20ff3a.json). Tests cover route wiring, UTC dates, empty/partial/full disclosure, custom text, denied identities and preservation of non-display fields.
- Six actual views: full, partial and denied source access in EN desktop 1440px and FR mobile 320px. A persisted recovery source is 48 hours old, beyond the configured 24-hour limit; source staleness remains true and its canonical reason is French. Due labels, proof labels, the brief, next actions and watch urgency render. Keyboard focus remains usable. No page errors or horizontal overflow; balance rows, payment counts and journal counts remain unchanged during reads. [Final runtime](lanes/environment/cash-source-copy-f0f0e741-0495-4002-b5d2-fc77dffca9f7.json).
- The French service display-field audit has zero unchanged English prose in these fixtures. This is sampled current-source coverage, not a claim that arbitrary future/custom records or proof-drawer nodes have been translated. Machine identifiers remain unchanged.
- Final development view times: 10.5s, 9.0s, 12.3s, 10.6s, 4.9s, 4.6s. These are local observations, not production performance certification.
- Earlier receipts are retained in the review record. Two first tests assumed the wrong denial wording and a cross-domain redaction on an independently scoped cash card; assertions now exercise the real partial-payroll case. TypeScript found nullable observation drill-through; the presenter now preserves null. A prior 107-test/fresh-source browser pass preceded the final stale/watch additions.

## Shared impact and review

Graph components bi_biactionpriorityboard_tsx (community 98) and bi_bicommandbriefheader_tsx (community 50) guided shared-boundary inspection; current source governs behavior. The only change to Digest's closed source bindings is the risk renderer's exact watch-expression translation. Reconstructing that expression produces the original closure hash. Shared EN/FR regressions and real renderer checks support retaining the closure; all other closure guards remain exact.

Architecture/backend/data/security review: presentation follows authorization; no new queries, writes, grants or schema. Finance/controls review: values, currencies, unavailable totals, grades and blockers preserved. Frontend/workflow/product/accessibility review: existing shell/tokens retained, French prose and meaningful UTC context delivered; complete accessibility still open. Quality/SRE/rollout review: guarded disposable fixtures, regression and source-bound receipts. Statutory rules, commercial packaging, integration/events and AI decisions: not applicable to this display correction. These are engineering checks, not professional approvals.

## Operator guidance and recovery

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command with your organization's authorized role. The same permitted source facts appear in the chosen language. Review unavailable or stale indicators in their source workspace; refreshing does not resolve their blockers. Proof links explain missing records or access without granting permission. Dates marked UTC use UTC calendar boundaries. No new input, signing system, migration or live activation is required.

Rollback, if needed, reverses only this presenter, route wiring, UTC date-label and watch-label changes. Preserve previous source-admission, financial, proof and timezone corrections. The prior source bindings and exact impact hashes are retained in the review record.

## Remaining closure

- Verify remaining proof subjects through the actual browser lifecycle and complete EN/FR source reasons/nodes inside proof drawers. Main authorized read-model prose, proof-link labels, statuses and due dates are verified in the covered views; unknown/custom source text is preserved.
- Verify genuine posted payroll obligations and their downstream financial records. Synthetic read fixtures do not prove posting, payment, declaration or approval completion.
- Finish the Cash accessibility checklist: tablet coverage, keyboard/contrast/reflow, enlarged text and the identified payroll nested-main boundary. Native screen-reader speech and browser zoom remain unverified limits.
- Complete route-latency investigation against a recorded baseline or approved budget. The original truncated shell hydration trace remains unattributed; investigate any recurrence. The reproduced date mismatch is corrected.
- Reconcile complete lifecycle/failure/recovery evidence against CASH_COMMAND_CLOSURE_2026-09-27.md. Named source/destination handoffs are verified; this does not close downstream purchasing, close, inventory-loss or payroll workflows.
