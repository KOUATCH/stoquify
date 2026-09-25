# Stoquify Mission-Credible Development Action Plan

Date: 2026-08-28
Planning horizon: 90 days
Target state: QUALIFIED_FOR_CONTROLLED_PHASE_2B_PILOT
Current state: DEVELOPMENT_CONTINUES_PILOT_AND_PRODUCTION_FAIL_CLOSED

## 1. Planning rule

This plan is a blocker-closure program. It is not a feature roadmap.

Work in progress is limited to:

1. One internal control-plane and candidate-readiness stream.
2. One external evidence and operations stream.

Do not start new modules, countries, providers, hardware, broad UI migrations, billing integration, or autonomous agent capability while a critical release prerequisite is open.

## 2. Pilot mission boundary

The product and release authorities must approve one written boundary before implementation continues.

Recommended included scope:

- One named tenant cohort and approved seeded or migrated dataset.
- Cash-only POS sale, refund, and shift lifecycle.
- Inventory movement and valuation effects required by the POS flow.
- Accounting posting, source trace, reconciliation, and close-readiness evidence.
- Manual or file-based payment evidence where production provider settlement is not approved.
- Internal payroll calculation and accounting only if payroll and country-scope gates pass.
- EN/FR operator experience on the selected routes.

Required exclusions until separately proven:

- Production tax-authority submission.
- Final offline fiscal numbering or certification.
- Fiscal printer or other hardware certification.
- Production provider settlement not covered by approved evidence.
- Broad commercial module enforcement.
- Live billing-driven entitlement changes.
- Autonomous AI posting, payment, approval, reversal, filing, certification, access change, or credential action.

Scope approval gate:

- Product owner signs the included workflows and excluded behavior.
- Security owner signs tenant, role, data-classification, and tool boundaries.
- Compliance owner signs the country-pack scope.
- Release manager signs rollback and evidence requirements.

## 3. Workstreams and owners

| Workstream | Accountable role | Supporting roles | Blockers |
| --- | --- | --- | --- |
| Candidate and evidence control | Release manager | QA, security, domain owners | B09, B10 |
| Database and migration | Platform database owner | Migration maker, independent checker, SRE | B03, X02 |
| Secrets and credentials | Security platform owner | Service owners, SRE | B04, B07 |
| Statutory scope | Compliance/legal owner | Qualified reviewer, independent checker | B05, B06 |
| Operations and recovery | SRE/operations owner | Release manager, support, security incident owner | B08 |
| Module and access control | Platform security owner | Module product owner, backend owners | X01 |
| Payroll integrity | Payroll engineering owner | Payroll controller, database owner | B02, X03 |
| UX, accessibility, and localization | Frontend platform owner | QA, accessibility, localization, domain owners | X04 |
| Gate 017 and Phase 2B | Independent enterprise release reviewer | Product, security, compliance, operations authorities | GATE-017, B11 |

Named identities, backups, acceptance timestamps, and source-system references must replace role placeholders before B08 or B10 can pass.

## 4. Days 0-30: internal closure and authority setup

### 4.1 Canonical current truth

Owner: Release manager

Actions:

1. Create one current candidate/evidence register.
2. Mark older status reports as historical or superseded without deleting them.
3. Record commit, branch, dirty-state, schema hash, migration set, package lock hash, and evidence timestamps.
4. Refuse release claims from artifacts bound to a different candidate.
5. Keep raw external blocker lists in the authoritative JSON sources.

Pass gate:

- One active status exists for each release program.
- Every cited artifact has candidate, date, digest, status, and supersession state.
- The current working tree is either deliberately in development or clean and candidate-bound; it is never ambiguous.

### 4.2 Database parity and destructive migration control

Owner: Platform database owner

Actions:

1. Apply 20260823100000_business_event_gateway_completion to an approved disposable local database.
2. Rerun native migration status and history health.
3. Recompute the 13 destructive finding hashes.
4. Produce per-finding disposition: approved, redesigned, or removed.
5. For approvals, require migration maker, independent checker, backup reference, restore procedure, row/count reconciliation, and expiry rule.
6. Execute a production-shaped restore and migration rehearsal before any real target deploy.

Commands:

    npm run prisma:migrate:status
    npm run prisma:migration:history:health
    npm run prisma:migration:release:preflight

Pass gate:

- No pending migration on the approved development/rehearsal targets.
- 13/13 destructive findings have valid exact-hash dispositions.
- Backup and restore proof is executable and independently checked.
- No production DATABASE_URL or secret appears in evidence.

### 4.3 Payroll trust-spine closure

Owner: Payroll engineering owner

Actions:

1. Add the missing compare-and-set conflict regression.
2. Add same-key/same-payload replay coverage.
3. Add same-key/different-payload rejection coverage.
4. Add failure injection proving no partial payroll commit.
5. Run the disposable PostgreSQL certificate after the static gate passes.

Commands:

    npm run payroll:trust-spine:gate
    npm run payroll:trust-spine:postgres
    npm run payroll:immutability:runtime

Pass gate:

- Static readiness is 6/6.
- PostgreSQL concurrency and failure injection pass.
- Runtime immutability remains 9/9, 14/14, and 3/3.

### 4.4 Module access truth

Owner: Platform security owner

Actions:

1. Freeze the 19-module vocabulary and pilot dependencies.
2. Introduce the minimum durable tenant entitlement and entitlement-event records needed by the pilot.
3. Keep Organization.requestedModules only as onboarding intent and migration input.
4. Remove or replace hard-coded session modulesEnabled claims.
5. Choose one coherent pilot behavior: enforce from durable entitlements at server boundaries; keep all non-pilot modules fail-closed or explicitly outside the pilot.
6. Classify 5 unmapped surfaces.
7. Resolve 79 missing-permission findings.
8. Resolve 77 dashboard-only risks.
9. Prioritize purchasing, finance, payroll, dashboard, sales, analytics, and cash drawer.
10. Add a ratchet that allows no new gaps.

Commands:

    npm run module:surface:inventory
    npm run module:surface:fail

Pass gate:

- Every pilot route, action, API, report, export, and job has tenant, module, permission, and access-intent ownership.
- Direct URL and direct action calls deny safely.
- Wildcard RBAC cannot bypass entitlement.
- No hard-enforcement claim conflicts with the control-center truth.
- New gaps equal zero.

### 4.5 Pilot UX and accessibility contract

Owner: Frontend platform and accessibility owners

Actions:

1. Approve a table and workflow contract for the pilot routes only.
2. Make server query, count, selection, and export scope consistent.
3. Verify loading, empty, filtered-empty, error, permission-denied, module-locked, stale, retry, and partial-failure states.
4. Verify EN/FR copy and locale-safe dates, numbers, and currency.
5. Verify keyboard sorting, focus retention, announced counts, selection state, action menus, and visible focus.
6. Approve desktop, tablet, and phone adaptation.
7. Record representative data-size and latency budgets.

Pass gate:

- Authenticated browser evidence exists for each pilot route.
- Keyboard and representative screen-reader checks pass.
- No false total, false zero, or ambiguous selection scope is shown.
- No presentation change weakens service-owned authorization or business truth.

### 4.6 External owner mobilization

Owner: Enterprise release authority

Actions:

1. Assign accepted primary and backup owners.
2. Approve the database, secrets, compliance, credential, operations, and release workstream handoffs.
3. Provide only redacted authoritative references in the intake manifest.
4. Record owner acceptance, time windows, conflict declarations, and escalation references.

Pass gate:

- Every B03-B08 workstream has an accountable identity and accepted execution window.
- No placeholder, example, or self-approval reference is accepted.

## 5. Days 31-60: production-shaped rehearsal

### 5.1 B03 database target

Owner: Platform database owner

Deliverables:

- Approved managed PostgreSQL target reference.
- Runtime and migration identity references.
- Backup and restore-test references.
- Change and deployment references.
- Direct post-deploy migration history evidence.

Pass gate:

    npm run prisma:migration:release:preflight
    npm run prisma:migrate:deploy
    npm run prisma:migration:history:health
    npm run prisma:migrate:status

All must pass against the approved target.

### 5.2 B04 managed secrets

Owner: Security platform owner

Deliverables:

- Purpose-specific signing, hashing, cursor, statement, and invitation key references.
- Valid HTTPS public base URL.
- Explicit statement and invitation delivery policy.
- Version references and owner activation evidence.

Pass gate:

    npm run release:secrets:preflight:release
    npm run public-identity:abuse:gate:release
    npm run receipt:token:config-gate:release
    npm run release:evidence:gate:release

Release secret readiness must be 21/21.

### 5.3 B06 qualified Cameroon review

Owner: Compliance/legal owner

Deliverables:

- Reviewer and checker identities.
- Appointment, qualification, and conflict references.
- Recomputed source digests.
- Fixture-family decisions.
- Signed final decision and signature validation.
- Explicit unsupported behavior list.

Pass gate:

    npm run statutory:country-pack:review:preflight
    npm run statutory:country-pack:gate

No legal or statutory claim may exceed the signed scope.

### 5.4 B07 credential rotation

Owner: Security owner with service owners

Deliverables:

- Complete credential inventory and classification.
- Managed reference for each included credential.
- Rotation execution evidence.
- Old-version rejection evidence.
- Security approval.

Pass gate:

    npm run agent:credential-rotation:evidence:apply
    npm run agent:credential-rotation:gate

### 5.5 B08 operations

Owner: SRE/operations owner

Deliverables:

- Frozen deployment and CI references.
- Accepted rollout, rollback, support, pilot, incident, and on-call owners.
- Scheduler provider, workload, managed identity, single-concurrency proof, lease evidence, and heartbeat.
- Three successful scheduled windows.
- Alert delivery, acknowledgement, retry, dead-letter, recovery, escalation, and secret-rotation evidence.
- Executable rollback command and measured recovery result.

Pass gate:

    npm run agent:operational-release:gate

No operational section may remain PENDING.

### 5.6 Candidate-bound verification

Owner: QA/release assurance owner

Minimum evidence:

- Prisma validation and generation.
- Typecheck.
- Focused tenant/RBAC/module negative tests.
- Accounting, event/outbox, POS, inventory, payment reconciliation, payroll, and close tests in pilot scope.
- Production-mode build.
- Authenticated EN/FR browser smoke.
- Accessibility and mobile checks.
- Migration restore/replay.
- Release evidence index.

Pass gate:

- Every result is bound to the same commit, artifact digest, database target class, and evidence bundle.
- No critical failure, skipped required check, or unexplained flaky result exists.

## 6. Days 61-90: freeze, Gate 017, and pilot entry

### 6.1 Freeze

Owner: Release manager

Actions:

1. Stop unrelated feature work on the candidate.
2. Create a clean immutable commit.
3. Produce source, migration, package-lock, build, browser, and evidence digests.
4. Rerun B01-B08 from the frozen candidate.
5. Reject any post-freeze runtime drift.

Pass gate:

- B09 READY.

### 6.2 Governance

Owner: Product and security release authorities

Actions:

1. Review the final evidence bundle.
2. Record product and security decisions.
3. Verify segregation of duties.
4. Confirm all six operational owner assignments.

Pass gate:

- B10 READY.

### 6.3 Gate 017

Owner: Independent enterprise release reviewer

Required decision:

- APPROVED only if every required gate passes.
- APPROVED WITH REQUIRED FIXES only for non-critical, explicitly bounded fixes that do not invalidate pilot safety.
- REJECTED on any critical or high tenant, financial, statutory, security, migration, recovery, or operational invariant.

Pass gate:

- Gate 017 GO.

### 6.4 Phase 2B entry

Owner: Enterprise release authority

Actions:

1. Run the 23-check entry gate.
2. Confirm cohort, roles, data, modules, locations, time window, kill switch, rollback, and support.
3. Activate only the approved scope.

Pass gate:

    npm run agent:phase2b:entry:gate

All 23 checks pass.

### 6.5 Controlled pilot

Owner: Pilot owner

Required telemetry and evidence:

- Unauthorized side effects: zero.
- Critical tenant, redaction, or secret incidents: zero.
- Ledger and reconciliation drift: zero unresolved critical drift.
- Payroll partial commits: zero.
- Outbox dead letters and queue age within approved limits.
- Alert acknowledgement and recovery within approved limits.
- Accessibility blockers in required tasks: zero critical.
- User task completion and support incidents recorded.
- Latency and unit cost recorded, not estimated.

Stop conditions:

- Any cross-tenant access.
- Any unauthorized module or permission bypass.
- Any unbalanced or orphaned financial posting.
- Any mutation of finalized payroll, ledger, fiscal, reconciliation, or evidence facts.
- Any secret or restricted-data disclosure.
- Any unsupported statutory behavior.
- Any failed rollback, stale alert, or missing accountable owner.

## 7. Go/no-go decision table

| Decision point | GO condition | NO-GO condition |
| --- | --- | --- |
| Day 30 internal closure | Module/pilot scope safe; payroll 6/6; migration dispositions complete | Any P0 access, migration, payroll, or evidence ambiguity |
| Day 60 rehearsal | B03-B08 ready; operations and expert evidence complete | Missing target, secret, owner, signature, alert, run window, or recovery proof |
| B09 freeze | Clean immutable candidate; no drift | Dirty tree, stale evidence, mixed candidate hashes |
| B10 governance | Product/security approvals and owners bound | Placeholder identity, self-approval, expired or unbound approval |
| Gate 017 | No critical/high invariant failure | Any unresolved critical/high gate |
| Phase 2B | 23/23 and explicit scoped activation | Any failed check or ambiguous scope |
| Phase 3 | Successful pilot and 34/34 with explicit GO | Pilot incomplete, unsafe, stale, or unapproved |

## 8. Evidence package

Required outputs:

- what-next/system-evaluation-2026-08-28-comprehensive-report.md
- what-next/system-evaluation-2026-08-28-blocker-matrix.json
- what-next/system-evaluation-2026-08-28-action-plan.md
- what-next/system-evaluation-2026-08-28-risk-register.md
- Refreshed B01-B12, external intake, CI, migration, secrets, payroll, and module inventory artifacts.
- One final candidate evidence manifest when the freeze is cut.

## 9. Definition of mission completion

The mission is acceptably complete for this development stage only when Stoquify can truthfully state:

1. The important pilot workflows are implemented and bound to one candidate.
2. Tenant, role, module, privacy, and fresh-auth boundaries are enforced and tested.
3. Economic facts are evented, posted, source-linked, immutable, and recoverable.
4. Country behavior is limited to expert-approved scope.
5. Database, secrets, credentials, scheduler, alerts, support, and rollback are operationally proven.
6. Users can complete pilot tasks in EN/FR with acceptable accessibility and mobile behavior.
7. Gate 017 and Phase 2B entry pass.
8. Production remains a separate Phase 3 decision after pilot evidence.

Until those conditions hold, the correct statement is: substantial development-grade platform, not mission-complete and not production-ready.
