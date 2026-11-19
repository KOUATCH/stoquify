# HR-09 — Organization, policy and reviewer setup

**Status: VERIFIED — bounded engineering scope.** Date: 2026-10-24. Dependency: HR-08 scoped verification retained. Next eligible slice: HR-10, not started here.

Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`. This was a dirty shared checkout, not a pristine HEAD candidate; `baseline-status.txt` records entry status. Unrelated edits and historical program statuses were preserved. No commit, deployment, live employer activation or production database change was performed.

## Delivered behavior

- `/[locale]/dashboard/people/setup` and People navigation provide EN/FR guided time setup. Existing employer identity/timezone and membership administration remain their authoritative owners and are linked directly.
- HR can create effective-dated optional departments/branches/teams, prepare employer-sourced time policies, prepare seven-day employee schedules, select a separately verified checker, and inspect/revoke bounded reviewer authority. Organization units do not silently create employment assignments or manager reporting authority; employee/contract administration is HR-10's next scope.
- The additive `HrisSetupReviewerGrant` supports organization-level TIME_POLICY review and exact-employee WORK_SCHEDULE / TIME_REQUEST review. It uses existing tenant user membership, including a checker who is not an employee. Read-only authority cannot decide. Current account/role, tenant, employee, domain, effective interval and revocation are checked. Source owners retain maker-checker rules.
- The reviewer sees policy sources, holidays, entitlement/carryover/accrual, weekly schedule/calendar/date details and request/correction evidence before deciding. Financial, contract and lifecycle approval workflows remain separately authorized and explicitly identified.
- Schedule preparation/approval rejects invalid coverage, missing/ambiguous weekdays and inconsistent totals while retaining named weekday compatibility. Policy approval cannot be overwritten by concurrent checkers. Grant retries are stable and cannot resurrect revoked authority.
- Missing, unavailable, expired and future reviewers, pending decisions and incomplete policy setup are visible. Draft input is retained on errors; a successful write followed by failed refresh is distinguished from a failed mutation. Optional organization setup does not gate employee directory access or unrelated operations.
- `HRIS_SETUP_PILOT_ORGANIZATIONS` is a deployment-owned exact allowlist, empty by default. No live tenant is enabled. Disabling it preserves all existing approved configuration and audit history.

## Acceptance matrix

| Criterion | Result | Current evidence and scope |
|---|---|---|
| HR-09-AC01: smallest / 200 employee setup without shared accounts or broad grants | PASS | Real PostgreSQL creates one actual employee and a non-employee verified checker, prepares/approves policy and schedule with only read permission plus domain grants; 200-person scoped selection tested. Browser owner/HR setup writes and checker time-request approval. Existing identity/membership links remain source-owned; their complete authenticated UI journey is not re-certified here. |
| HR-09-AC02: domain/employee isolation; read-only cannot approve | PASS | Direct service denials for wrong employee/domain/tenant, read-only, future/expired/revoked grants, disabled/locked/moved accounts and removed read role. SQL tenant FK checks. Actual browser read-only and narrow approval roles. Action tests prove context derivation, fresh-auth tenant consistency and explicit module enforcement options, with protect mocked. |
| HR-09-AC03: only dependent operations block with remedy | PASS | Policy absence only prevents schedule preparation; independent checker absence only prevents applicable review. UI retains entry values after rejected writes, displays corrective routes/messages, saved units and coverage. Scoped readers do not interpret invisible policies as missing. |
| HR-09-AC04: future changes / expired delegation preserve HR-04/05 | PASS | Future units retain dates without mutating current employment assignments. Current authorization intersects finite grants and live membership. Grant expiry/revocation tests plus the prior 60-case HR correctness suite pass; no reporting-scope/fallback owner changed. |
| HR-09-AC05: EN/FR, keyboard, 360/768/1440 | PASS | 30 rendered journeys: owner, HR, read-only manager, narrow decision reviewer and denied account × two locales × three widths. Keyboard submit/focus, error retention, allowed approval/removal of pending item, denied policy form and horizontal overflow checks. Screenshots and browser/results.json retained. |

These are scoped engineering acceptance results, not production rollout, qualified statutory approval or complete authentication/accessibility certification.

## Verification lanes

| Lane | Outcome | Artifact |
|---|---|---|
| Source/graph inspection | Existing org, role, time-policy and scope owners traced. Dated graph_actions HRIS nodes used only for discovery and checked against current source; new setup nodes are not claimed present in that graph. | Owned files; INDEPENDENT-REVIEW.md |
| Workflow contract | PASS; 196 other package scripts remain outside reviewed manifest | workflow.log |
| Mocked unit/action | 27/27, four suites | unit-final.log |
| Isolated real PostgreSQL | 22/22 HR-09 cases, including the integrated browser case; no skips | postgres-final.log |
| Shared real PostgreSQL regression | 60/60 prior HR correctness cases, no skips | prior-correctness-postgres.log |
| Browser | 30/30 actual setup-component/service/PostgreSQL role journeys | browser/results.json; browser/*.png |
| Focused TypeScript | 0 diagnostics, no emit/incremental metadata | typecheck-final.log |
| Schema validation | PASS using explicit no-dotenv config | schema-validation-r2.log |
| Additive migration | Applied successfully in one transaction to owned synthetic database only | migration-retry.log |
| Whitespace | PASS on modified tracked implementation surfaces | diff-check.log |
| Cleanup | Zero synthetic organizations; test server closes in finally; owned PostgreSQL stopped | cleanup.log; postgres-stop.log |

Reviewed target: PostgreSQL 17.5 on `127.0.0.1:55464`, database `stoquify_local_hris_20261024`, fixture namespaces `hris-setup-*` / `hris-verification-*`. No application `.env`, reset, seed or provider command was used. Local socket restrictions required an explicitly scoped escalation; no approval was rejected. Earlier failed draft checks, a harness charset defect and two fixture-isolation errors are retained in the evidence directory; final passing logs supersede their acceptance outcomes.

## Independent review

Fresh-context agent `/root/hr09_independent_review` identified five P2 findings. All were corrected and re-reviewed. An additional self-review finding, R6, closes grants over soft-deleted employees while preserving advisory-before-row lock order. Independent review confirmed that follow-up. Original findings: inclusive date semantics, schedule coverage/weekday validity, reviewer identity in revocation controls, concurrent policy approval evidence and unavailable reviewer coverage. The final source review found no remaining actionable correctness/security issue within the agreed domains. Details and regression mapping: INDEPENDENT-REVIEW.md.

## Ownership, rollout and limits

Owned new surfaces: setup-reviewer/workspace-setup services; workspace-setup actions; setup component/client/route; new grant model/migration; focused unit/action/PostgreSQL tests and config. Narrow modifications: operational-time approval/schedule validation, People setup navigation, Prisma relation fields, and appended execution register. The evidence manifest binds exact files and artifacts by SHA-256.

Migration is additive with tenant composite FKs and interval/domain/independence constraints; no legacy backfill. See MIGRATION-ROLLOUT.md. Rehearsal used the actual SQL migration, not db push. The shared operational-time behavior was tested after the changes. Production schema promotion and generated client/release artifact creation remain under existing release controls; this feature uses typed existing models and parameterized SQL for the new authorization evidence.

The rendered harness bundles the actual React component and project CSS, calls real services/PostgreSQL, and supplies a synthetic role cookie. It does **not** certify a full Next/BetterAuth session, deployed entitlements, screen-reader interaction or all WCAG criteria. No real provider, qualified country-policy review, payroll statutory admission or live pilot signoff was performed. Actual pilot employer structure, reviewed policy sources and checker identities must be collected before activation.

Review lenses: architecture/backend/data/security/UX/product/QA/release/SRE/SaaS applied through existing ownership, narrow scope, transactions, authorization, audit, failure recovery, rendered role evidence and fail-closed rollout. Payroll/records controls retained. Statutory/legal/finance: no new rules/defaults or certification. AI, recruitment, POS/inventory, purchasing and external payment/provider changes: not applicable because untouched.

Rollback disables new setup entry points through the pilot allowlist while retaining grants, approved policy/schedule state and audits. No destructive data rollback or reversal of committed employment/payroll history is prescribed.
