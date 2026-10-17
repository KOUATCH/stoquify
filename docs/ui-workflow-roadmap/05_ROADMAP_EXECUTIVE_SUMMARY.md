# UI workflow roadmap — executive summary

4 October 2026 | Planning baseline: working files at HEAD 62a56036a5ac9b37236a20c9b148052199069479 plus existing local changes

**Scope: eight proposals, 20 executable work packages.** All six audit recommendations are retained. Two additions have current source evidence and comparable operational value: new purchase-order draft/retry recovery, and reconciliation alert processing diagnosis/recovery. The complete [detailed implementation roadmap](<E:/ohada saas/Focused projects/stoquify/docs/ui-workflow-roadmap/04_IMPLEMENTATION_ROADMAP.md>) defines implementation steps, owners, dependencies, migrations, controls, tests and completion gates.

| Proposal | Value | Delivery |
| --- | --- | --- |
| UC01 Read-only item workspace | Answer item and permitted-stock questions without update authority. | UX02, UX03 |
| UC02 Business-record search | Open the correct authorized item, customer or PO directly. | UX04, UX05 |
| UC03 Guided payroll evidence selection | Complete proof submission using understandable eligible records. | UX06, UX07 |
| UC04 Communication delivery exceptions | Find failed/deferred communications before recipients report them. | UX08, UX09 |
| UC05 Cross-record audit explorer | Reconstruct incidents across records without developer log queries. | UX10, UX11 |
| UC06 Trackable access requests | Give blocked work an owner, tracked outcome and safe return path. | UX12, UX13 |
| UC07 Resumable new purchase orders | Avoid re-entry after interruption and duplicate creation after uncertain responses. | UX14, UX15 |
| UC08 Reconciliation alert processing recovery | Locate stalled alerts and recover eligible work with clear ownership. | UX16, UX17 |


## Recommended start

Assign owners and establish baseline/contract evidence through UX00 and UX01, then deliver the read-only item workspace (UX02/03). It fixes a concrete missing destination and enables business-record search (UX04/05). Payroll guidance, PO authoring recovery and alert diagnostics can proceed as separate lanes after their contracts are approved. Communications, audit and access requests follow with their own source permissions and operational owners.

Each completed feature can pilot after its own G4 evidence; the program closes only when all eight have passed integration and operational acceptance. Existing platform roadmap R00–R37 remains separate and unchanged; the detailed roadmap identifies overlapping parent work to avoid duplicate implementation.

## Capacity and decisions

Initial estimate: **69–111 combined engineering/QA person-days**. Capacity arithmetic at 12–15 effective days/week is roughly 5–10 weeks before external review, environment setup and pilot waiting; this is not a date commitment. Re-estimate after UX00/01. Decide customer search destinations, payroll proof eligibility, channel meanings, audit fields, access-review ownership, draft retention and alert retry authority before dependent work.

## Evidence and release limits

This planning run passed **13 existing tests across two suites** for PO edit-draft and reconciliation worker foundations. The earlier audit’s 79 passes remain historical. No new feature, migration, live provider action or authenticated end-to-end workflow was implemented or verified. Protected role/browser access remains a release-evidence dependency.

Success means faster correct task completion, safe recovery and clear ownership—not just eight new screens. Baseline time, success, error and recovery metrics first. Keep all existing settlement, permission, idempotency and lease controls. Release gradually and disable affected exposure on any critical correctness or disclosure failure while preserving durable history.

## Published package

1. [Refined execution prompt](<E:/ohada saas/Focused projects/stoquify/docs/ui-workflow-roadmap/01_REFINED_PROMPT.md>)
2. [Actual planning execution report](<E:/ohada saas/Focused projects/stoquify/docs/ui-workflow-roadmap/02_EXECUTION_REPORT.md>)
3. [Findings and risks](<E:/ohada saas/Focused projects/stoquify/docs/ui-workflow-roadmap/03_EXECUTION_FINDINGS_AND_RISKS.md>)
4. [detailed implementation roadmap](<E:/ohada saas/Focused projects/stoquify/docs/ui-workflow-roadmap/04_IMPLEMENTATION_ROADMAP.md>)
5. This executive summary.

Every Markdown report has a matching PDF. [Publication validation](<E:/ohada saas/Focused projects/stoquify/what-next/ui-workflow-roadmap/publication-validation.json>) records actual artifact checks; [package registry](<E:/ohada saas/Focused projects/stoquify/what-next/ui-workflow-roadmap/work-package-registry.json>) supports tracking and future execution.
