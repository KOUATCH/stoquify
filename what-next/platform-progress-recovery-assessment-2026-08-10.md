# Stoquify Platform Progress Recovery Assessment - 2026-08-10

Workspace: `E:\ohada saas\Focused projects\stoquify`
Branch: `codex/service-boundary-burndown`
Mode: read-only assessment plus this report write

## 1. Executive verdict

Stoquify is progressing meaningfully in bounded engineering/control slices, but not efficiently enough toward releaseable, user-usable platform outcomes.

The strongest current evidence is not absence of progress. It is conditional progress: service boundaries are cleaner, several gates pass, supplier/customer/referral/payroll controls exist, and the current worktree passes TypeScript, Prisma validation, workflow runtime checks, service-boundary checks, inventory-boundary checks, hard-delete checks, and demo/report trust checks. However, important workstreams still stop at "conditional pass", "pilot-ready but not production-ready", "blocked by release isolation", or "blocked by external evidence".

Token consumption cannot be judged precisely from the repository alone. I did not find an actual AI token/cost/session ledger in the repository evidence inspected. Therefore, any token-efficiency conclusion is provisional. The repository does show a poor activity-to-release ratio: 12 commits in the primary 30-day window, 8,328 recent files under `what-next`, 1,109 recent docs files, 68 audit reports, 193 readiness reports, 83 roadmap reports, 121 `docs` skill definitions, and a 60-day diff of 12,402 files changed with 3,848,331 insertions and 50,174 deletions.

The single biggest reason for the current result is that the platform is running too many broad, partially overlapping control/product/program streams without one binding critical path that ends in a small verified pilot outcome.

What must change immediately: freeze new broad audits, skill-suite expansion, and parallel roadmap generation; choose one releaseable vertical slice; clear the few cross-cutting gates that block repo-wide confidence; and require every future task to end in a verified artifact, a user decision, or a precise external blocker.

## 2. Evidence limitations

Facts:

- `git status --short --branch` showed a clean worktree on `codex/service-boundary-burndown`.
- Current verification passed for `npm run prisma:validate`, `npm run typecheck`, `npm run workflow:assurance:runtime-check`, `npm run service:boundary:fail`, `npm run inventory:boundary:fail`, `npm run hard-delete:fail`, `npm run demo:trust:fail`, and `npm run receipt:token:config-gate`.
- Current verification failed for `npm run error:boundary:fail` with 12 active unsafe raw-error findings and for `npm run regulatory:hardcode:fail` with 1 critical country VAT literal in `scripts/inventory-items-e2e-fixture.js:420`.
- `npm run policy:gates` was skipped because the script chain intentionally writes multiple `what-next` report artifacts, and the prompt allowed only this final assessment write.
- `npm run build:app` was skipped because a build writes generated output and the prompt prohibited writes other than this report.

Inferences:

- Repository artifact volume is high enough to slow rediscovery, review, and release isolation.
- The delivery pattern favors report/control readiness over a small number of finished, externally exercised product outcomes.

Unknowns:

- Actual daily token consumption, cost per task, session counts, and agent/task history are not proven by repository evidence.
- Production deployment status, external provider readiness, statutory/legal approval, and real pilot adoption are not proven locally.

## 3. Assessment-period evidence

Primary period: 2026-07-11 through 2026-08-10.
Comparison period: 2026-06-11 through 2026-07-10.

| Evidence | Primary period | Comparison period | Interpretation |
|---|---:|---:|---|
| Git commits | 12 | 10 | Commit volume is similar across periods. It does not prove value. |
| `what-next` recent files | 8,328 | not fully separated | Very high assessment/evidence churn in the primary period. |
| `docs` recent files | 1,109 | not fully separated | High planning/control documentation activity. |
| Full `what-next` files | 14,786 | n/a | Evidence archive is large enough to make rediscovery costly. |
| `what-next` markdown files | 3,243 | n/a | Report volume is material. |
| `what-next` JSON files | 680 | n/a | Structured evidence exists, but is spread broadly. |
| `what-next` screenshots/images | 752 | n/a | Browser evidence exists, but not consistently tied to current release blockers. |
| Audit reports | 68 | n/a | Repeated audit mode is a major work pattern. |
| Readiness reports | 193 | n/a | Readiness reporting is extensive. |
| Roadmap reports | 83 | n/a | Planning volume is high. |
| 60-day diff | 12,402 files, 3,848,331 insertions, 50,174 deletions | n/a | Includes generated artifacts, reports, screenshots, skill bundles, app code, and build/dev output. |

## 4. Progress scorecard

No overall score is calculated because actual token/cost data is missing.

| Area | Score | Evidence |
|---|---:|---|
| Product-value delivery | 2/5 | Supplier and customer/referral slices exist, but both retain release or pilot blockers. |
| Vertical-slice completion | 2/5 | Many slices are marked complete internally, yet major reports still say production activation, release isolation, real pilot evidence, or browser evidence remain incomplete. |
| Architecture convergence | 3/5 | Service-boundary and inventory-boundary gates pass; graph refresh shows very large service/app/component/action surfaces. |
| Implementation throughput | 3/5 | TypeScript and Prisma now pass; several gates are green. Volume is high, but release outcomes remain limited. |
| Verification discipline | 3/5 | Many gates exist and current focused gates pass, but some verification is side-effectful and full policy/build verification was skipped under prompt constraints. |
| Rework control | 1/5 | Repeated audit/readiness/roadmap artifacts and old blockers contradicted by current checks show rediscovery and stale-evidence drag. |
| Blocker resolution | 2/5 | Some old type/build blockers appear resolved, but statutory approval, real pilot evidence, release isolation, production secrets, and raw-error/regulatory gates remain. |
| Token efficiency | not scored | No actual token/cost/session records found. Repository activity suggests inefficient output-to-release conversion, but this is provisional. |
| Release readiness | 2/5 | CI config is ready and typecheck passes, but raw-error and regulatory-hardcode gates fail; customer/referral release scope is blocked. |
| Operational readiness | 2/5 | Workflow runtime tables, payroll immutability, CI config, and some control gates are ready; production evidence and external operations are not. |

## 5. Progress ledger

| Workstream | Intended value | Current status | Repository evidence | Verification evidence | Remaining gap | Dependency/blocker | Continue? |
|---|---|---|---|---|---|---|---|
| Service boundary burndown | Move runtime mutations behind services | Completed for scanned runtime boundaries | Branch name and `package.json` gate | `service:boundary:fail` passed, 0 active violations | Keep ratchet in CI | None current | Yes, maintain only |
| Inventory mutation boundary | Preserve stock integrity | Completed for scanned stock mutations | `inventory:boundary:fail` script | 0 active violations | Keep new changes behind kernel | None current | Yes, maintain only |
| Workflow assurance runtime | Ensure workflow tables exist | Completed locally | `workflow:assurance:runtime-check` | 7/7 tables, 3/3 migrations present | Does not replace full migration workflow | None current | Yes, maintain only |
| Supplier workflow | Supplier/AP workflow, exports, analytics | Partially completed | `docs/suppliers/STOQUIFY_SUPPLIER_WORKFLOW_COMPLETION_REPORT_2026-08-09.md` | Report claims 9 suites/38 tests, typecheck, lint, AP gate, service boundary passed | Authenticated browser fixtures/screenshots missing; not release-certified | Test tenant/restricted-role/lifecycle fixtures | Yes, near-term |
| Customer workflow | Customer lifecycle and controlled exports | Partially completed | `what-next/STOQUIFY_CUSTOMER_WORKFLOW_COMPLETION_REPORT_2026-08-09.md` | Report claims 7 suites/43 tests, export trust gate 35/35 | Browser/accessibility and high-volume export design missing | Authenticated browser evidence | Yes, after gate cleanline |
| Customer referral loop | Statement, delivery, referral, accountant invite pilot | Partially completed/pilot-ready | `CUSTOMER_REFERRAL_TAKEOFF_READINESS_2026-08-09.md` | Report claims PostgreSQL smoke, browser pass, 29 suites/155 tests, build pass, migration replay | Not production-ready; exact release, secrets, provider, migration approvals, real pilot evidence missing | External release/pilot inputs | Yes, but only after release isolation |
| Referral exact release | Isolated referral release candidate | Blocked | `customer-referral-release-scope-readiness.md` | Classification blocked, 556 changed paths inspected | 9 unclassified paths, 4 mixed shared paths, protected staged paths, no exact revision/security scan | Release owner must isolate hunks/revision | Yes, after user decision |
| Referral pilot evidence | Real pilot proof | Blocked | `customer-referral-pilot-evidence-readiness.md` | 0/16 checks ready | Needs exact release revision, production pilot, PostgreSQL target, real event sequence | Product/release owner and pilot operator | Yes, when pilot exists |
| Statutory country pack | OHADA/Cameroon statutory production readiness | Blocked | `statutory-country-pack-production-readiness.md` | 11/12 ready, blocker is expert approval | Qualified expert approval incomplete | Qualified statutory reviewer | Pause production claims |
| Payroll/HRIS controls | Controlled payroll/presence/immutability | Partially completed | `payroll-immutability-runtime-check.md`, `payroll-presence-readiness.md` | Immutability 9/9 triggers, 14/14 mutation blocks; presence 13/13 | Production statutory/provider/migration handoff still blocked | Country-pack approval and production evidence | Continue only pilot-safe work |
| Payment/cash truth | Payment reconciliation controls | Completed internally | `payment-cash-truth-readiness.md` | 12/12 ready | External provider certification not proven | Provider evidence for release | Maintain |
| Purchasing/AP | Maker-checker and AP control seams | Completed internally | `purchasing-ap-consolidation-readiness.md` | 11/11 ready | Does not certify supplier/bank/tax production | External production evidence | Maintain |
| Offline POS replay | Offline replay controls | Completed internally | `offline-pos-fiscal-replay-readiness.md` | 16/16 ready | Hardware/connectivity/statutory not certified | Production environment proof | Maintain |
| Release hygiene | Repo-wide safe release posture | Partially completed | `ci-release-readiness.md`, current gate runs | CI readiness 11/11; typecheck/prisma pass | Raw-error and regulatory hardcode fail; production secrets warnings | Engineering fixes plus release env config | Highest priority |

## 6. Symptoms versus root causes

| Symptom | Root cause or not? | Evidence | Interpretation |
|---|---|---|---|
| High token consumption concern | Symptom | No token ledger found | Cannot quantify; likely driven by repeated discovery and broad scope. |
| Large planning/report volume | Symptom and cause amplifier | 3,243 `what-next` markdown files, 193 readiness reports, 83 roadmaps | Reports have become a major output class and can crowd out release work. |
| Repeated rediscovery | Root-cause contributor | Large `what-next`, many skill suites, old blockers contradicted by current gates | Current truth is hard to find, so tasks spend time re-proving state. |
| Conditional completion | Root-cause contributor | Supplier/customer/referral reports say not release-certified or production-ready | Work stops before user-facing acceptance evidence. |
| Broad platform scope | Root cause | Required domains span supplier, customer, referral, POS, payroll, country packs, agents, analytics, CI | Too many active streams compete for attention and verification. |
| Test/build/gate failures | Symptom | Current raw-error and regulatory gates fail; older type/build blockers appear stale | Some failures are real, but some reports are obsolete. |
| Genuine external blockers | Root-cause contributor when mixed with ordinary engineering | Country-pack expert approval, real pilot evidence, provider secrets, production migration approval | External blockers must be isolated so normal engineering can continue elsewhere. |

## 7. Ranked root-cause matrix

| Rank | Root cause | Symptoms explained | Evidence | Impact | Confidence | Controllability | Corrective action | Expected unlock | User decision required |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Too many simultaneous workstreams without one critical path | High token use, broad reports, partial slices, release delay | Supplier, customer, referral, payroll, POS, country-pack, agents, UI, CI all active in reports | Very high | High | High | Choose one releaseable slice and pause everything else except gate hygiene | Verified progress becomes measurable | Yes, choose critical path |
| 2 | Planning/evidence machinery is not bounded by stop conditions | Repeated reports, old blockers, rediscovery | 68 audit reports, 193 readiness reports, 83 roadmaps, 121 docs skills | Very high | High | High | No new audit/report unless new evidence or changed question; every report must replace or close an old one | Fewer tokens spent reclassifying | Yes, approve operating rule |
| 3 | Slices stop at conditional/internal readiness instead of release acceptance | "Complete" claims but not production/pilot-ready | Supplier, customer, referral, payroll reports all retain residual blockers | High | High | High | Define acceptance as current gate plus browser/pilot/release evidence | More usable outcomes | Yes, select acceptance target |
| 4 | Release isolation and artifact sprawl slow conversion of work into a clean release | Hunk isolation, unclassified paths, protected staged paths, huge artifact tree | Referral release scope: 556 paths, 9 unclassified, 4 mixed shared, 280 excluded; `what-next` 14,786 files | High | High | Medium | Isolate release candidates before additional feature work | Exact revision and security scan become possible | Yes, release-scope authority |
| 5 | Genuine external blockers are mixed with ordinary engineering difficulty | "Blocked" becomes noisy | Statutory expert approval, real pilot evidence, provider secrets are external; raw-error findings are normal engineering | Medium-high | High | Medium | Separate external blockers from engineering backlog and assign owners | Engineers stop waiting on non-blocking work | Yes, owners for external inputs |
| 6 | Some verification is late or side-effectful | Full gates cannot be run under read-only constraints | `policy:gates` writes many reports; `build:app` writes generated output | Medium | Medium | Medium | Split read-only checks from artifact-generating certification commands | Cheaper routine verification | Engineering decision |
| 7 | Architecture size increases coordination cost | Dependency-order friction, stale context, hard impact analysis | Graph refresh: services 5,719 nodes/10,287 edges; merged graph 9,484 nodes/14,371 edges | Medium | Medium | Medium | Use graph evidence only for scoped impact analysis; avoid architecture-wide rediscovery | Faster bounded changes | No |

## 8. Multidisciplinary coverage

| Lens | Finding |
|---|---|
| Enterprise architecture, ownership, modularity | Service/inventory boundaries are improving, but portfolio-level dependency order is not binding enough. |
| Backend, APIs, transactions, events | Service-boundary gate passes, but raw-error gate finds 12 active service/action error-boundary issues. |
| Data architecture, migrations, monetary precision | Prisma validates; referral production migration adoption/checksum evidence remains blocked. |
| Security, tenancy, IAM/RBAC, privacy, abuse | Public identity, settings, API guard, supplier/customer export controls show strong patterns; production secrets and raw-error boundary remain gaps. |
| Frontend/design system | Supplier/customer UI work exists; authenticated browser/accessibility evidence is missing for release claims. |
| Workflow UX, accessibility, localization | Screenshots and UI evidence exist, but supplier report explicitly says authenticated screenshots were not run. |
| Product strategy and prioritization | The roadmap is too wide; progress is not organized around one measurable releaseable outcome. |
| Quality/release assurance | Many gates exist and several pass; raw-error and regulatory-hardcode fail today. |
| SRE/DevSecOps/observability/cost | CI readiness is configured; actual AI token cost governance is not evidenced. |
| SaaS packaging, billing, adoption | Module/entitlement work exists, but commercialization/pilot adoption proof is mostly absent. |
| Finance/accounting/reconciliation/controls | Ledger close, payment cash truth, purchasing/AP gates are internally ready; external/accounting certification is not claimed. |
| OHADA/SYSCOHADA/statutory/country packs | Country-pack production gate remains blocked on expert approval; no legal/statutory certification is proven. |
| Audit evidence/records governance/data quality | Evidence exists in large volume, but current truth is fragmented. |
| POS/inventory/offline consistency | Inventory and offline POS replay gates pass internally; hardware/statutory/production proof remains outside local evidence. |
| Purchasing/AP/supplier/payments | Purchasing/AP gate and supplier implementation are strong, but supplier release lacks authenticated browser proof. |
| HRIS/payroll/attendance/privacy/self-service | Payroll immutability and presence gates are ready; production HR/payroll remains blocked by statutory/provider/release evidence. |
| Payment providers/settlement/suspense | Payment cash truth controls are ready internally; live provider evidence is not proven. |
| Analytics/metric governance | Referral and dashboard artifacts exist, but token efficiency and pilot success metrics are not instrumented as a repo-visible ledger. |
| AI-agent safety/evaluation/context/token governance | Many agent/skill artifacts exist; no actual token ledger or stop-condition governance was found. |
| Change management/documentation/training/support | Documentation volume is high, but it needs consolidation into one current operating contract. |

## 9. Genuine blockers

| Blocker | Evidence | Minimum unblock | Owner/decision-maker | Useful work that can continue |
|---|---|---|---|---|
| Country-pack production approval | `statutory-country-pack-production-readiness.md`: source_artifact_expert_approval blocked | Qualified expert approval artifact and runtime promotion evidence | User/business statutory reviewer | Keep statutory production claims paused; continue non-statutory engineering |
| Referral real pilot evidence | `customer-referral-pilot-evidence-readiness.md`: 0/16 ready | Exact deployed revision, real pilot database evidence, event sequence | Product/release owner | Finish release isolation and non-prod rehearsal |
| Referral exact release isolation | `customer-referral-release-scope-readiness.md`: unclassified paths, mixed shared hunks, protected staged paths | Classify 9 paths, isolate 4 shared hunks, create exact revision, regenerate graphs, run security diff | Release owner/engineering | Gate hygiene and supplier certification |
| Production provider/secrets/origin | `CUSTOMER_REFERRAL_TAKEOFF_READINESS_2026-08-09.md` lists boundary secrets, HTTPS origin, provider channels | Configure target environment secrets and provider channels | Release/platform owner | Local smoke and non-prod rehearsal |
| Supplier authenticated browser fixtures | Supplier completion report and screenshot README say fixtures unavailable | Safe tenant, restricted-role, lifecycle mutation fixtures | Product/QA owner | Keep supplier code and focused tests; prepare fixtures |
| Raw-error gate failure | Current `error:boundary:fail`: 12 active findings | Replace/allowlist with canonical typed errors | Engineering | Can be fixed without external inputs |
| Regulatory fixture literal | Current `regulatory:hardcode:fail`: critical VAT literal in fixture | Move fixture value to reviewed config/country-pack path or classify fixture safely | Engineering/control owner | Can be fixed without external inputs |

Not blocked:

- Service-boundary cleanup is not blocked. It currently passes.
- Inventory-boundary cleanup is not blocked. It currently passes.
- TypeScript and Prisma validation are not blocked. They currently pass.
- Raw-error and regulatory-hardcode gates are failing, but they are ordinary engineering work, not external blockers.

## 10. Work-state register

Completed:

- Current `npm run typecheck` passed.
- Current `npm run prisma:validate` passed.
- Current `npm run workflow:assurance:runtime-check` passed.
- Current `npm run service:boundary:fail` passed.
- Current `npm run inventory:boundary:fail` passed.
- Current `npm run hard-delete:fail` passed.
- Current `npm run demo:trust:fail` passed.
- Internal gates for purchasing/AP, payment cash truth, offline POS replay, payroll presence, payroll immutability, CI readiness, and settings surface classification are reported ready.

Partially completed:

- Supplier workflow: strong implementation and focused tests, but missing authenticated browser/restricted-role/lifecycle evidence.
- Customer workflow: focused tests and export gate evidence, but missing browser/accessibility evidence and production certification.
- Customer referral loop: pilot-ready on seeded/fresh PostgreSQL evidence per report, but exact release and production pilot evidence remain blocked.
- HRIS/payroll: controlled/internal readiness exists, but production/statutory/provider/migration evidence remains blocked.

Blocked:

- Country-pack production approval.
- Referral real pilot evidence.
- Referral exact release isolation.
- Production provider/secrets/origin for referral.
- Supplier authenticated browser fixtures.

Unverified:

- Actual token efficiency.
- Production deployment readiness.
- External provider operation.
- Legal/tax/accounting/security/accessibility/privacy certification.
- Full `policy:gates` and `build:app` status for this assessment run.

Superseded or stale:

- Older typecheck/build syntax blockers in supplier/customer reports appear stale because current `npm run typecheck` passed on 2026-08-10.
- Older "dirty worktree" warnings are stale for this assessment run because current `git status` was clean.

Work that should be stopped now:

- New broad platform audits without new evidence.
- New skill-suite creation or orchestration layers unless they close a named bottleneck.
- Additional graph refreshes unless source changed after 2026-08-09 or release isolation requires it.
- Parallel expansion of supplier, customer, referral, HRIS, payroll, statutory, POS, and agent workstreams without one primary release path.
- Production-readiness claims for country-pack, payroll, referral, or supplier flows until their specific blockers are closed.

## 11. Recovery plan

### A. Immediate containment

Stop now:

- More "whole platform" rediscovery.
- Any new readiness report that does not replace, supersede, or close a named existing blocker.
- Broad redesign proposals.
- New product areas.

Continue now:

- Current release hygiene gates.
- One near-complete product slice.
- Evidence consolidation into a single current truth register.

Archive/consolidate:

- Mark old type/build blocker reports as superseded where current verification contradicts them.
- Keep graph reports as architecture navigation, not as release proof.
- Treat generated screenshots and report artifacts as evidence only when tied to a current acceptance criterion.

Decisions required before spending more tokens:

- Which slice is the first recovery pilot: supplier workflow or customer referral.
- Whether engineering is authorized to fix the 12 raw-error findings and 1 regulatory fixture finding.
- Who owns statutory expert approval and who owns referral pilot evidence.

### B. Next three vertical slices

Slice 1: Release Hygiene Greenline

- Outcome: repo has a small, current, repeatable green gate set that can support release decisions.
- Exact scope: 12 raw-error findings, 1 regulatory fixture literal, current typecheck/prisma/service/inventory/hard-delete/demo gates.
- Likely files: `services/accounting/*`, `services/agents/portfolio/connector-inventory-read-model.service.ts`, `scripts/inventory-items-e2e-fixture.js`, relevant error helpers.
- Non-goals: no product feature work, no broad refactor, no schema changes unless unavoidable.
- Acceptance criteria: `typecheck`, `prisma:validate`, `error:boundary:fail`, `regulatory:hardcode:fail`, `service:boundary:fail`, `inventory:boundary:fail`, `hard-delete:fail`, and `demo:trust:fail` pass.
- Verification: run the above commands and record outputs.
- Evidence artifact: one short greenline report under `what-next`.
- Discovery/planning allowance: maximum 30 minutes or one source scan per failing gate.
- Stop condition: if a finding requires business policy rather than code, record the exact owner and stop that sub-item.

Slice 2: Supplier Workflow Browser Certification

- Outcome: supplier workflow moves from conditional code pass to verified authenticated workflow pass.
- Exact scope: canonical `/dashboard/purchases/suppliers` list/create/detail/edit, restricted-role denial, export redaction, lifecycle confirmation, responsive screenshots.
- Likely files/modules: supplier routes, `SupplierManagementDashboard`, supplier actions/services, AP history service, Playwright or browser-smoke fixtures.
- Non-goals: no supplier model redesign, no supplier statements, no purchase-order rewrite.
- Acceptance criteria: safe tenant fixture works; restricted-role fixture works; desktop/mobile/tablet smoke passes; screenshots saved; no console errors; focused tests remain green.
- Verification: focused supplier tests plus authenticated browser smoke.
- Evidence artifact: updated supplier completion evidence with screenshots and fixture IDs redacted.
- Discovery/planning allowance: maximum one fixture-read pass before implementation.
- Stop condition: if no safe fixture can be provided, record exact fixture requirements and do not simulate proof.

Slice 3: Customer Referral Exact Pilot Release

- Outcome: referral loop has an exact isolated release candidate and either a ready real pilot evidence gate or a precise external pilot blocker.
- Exact scope: classify 9 unclassified paths, isolate 4 mixed shared hunks, preserve protected inventory paths, create exact revision, regenerate graphs on isolated revision, run security diff, configure non-prod secret/provider rehearsal.
- Likely files/modules: referral/customer statement/accountant invite actions, public statement routes, referral gates, migration history approvals, release-scope gate.
- Non-goals: supplier statements, financing, broad AI expansion, unrestricted production launch.
- Acceptance criteria: release-scope gate has 0 blockers; exact revision exists; security diff completed; non-prod smoke passes; pilot evidence gate moves from 0/16 to either pass or exactly external-only blockers.
- Verification: referral release scope gate, shared hunk gate, migration replay/health gates in target environment, referral smoke, pilot evidence gate.
- Evidence artifact: exact-release handoff and pilot evidence packet with no PII.
- Discovery/planning allowance: maximum one release-scope audit before path classification work begins.
- Stop condition: if production pilot data or provider credentials are not available, stop at non-prod rehearsal plus external blocker owner.

### C. Ten-working-day recovery sequence

Day 1: Freeze WIP and choose the first recovery pilot. Output: one current truth register and one selected critical path.

Day 2: Fix or classify raw-error findings. Output: `error:boundary:fail` ready or a precise owner-needed exception.

Day 3: Fix regulatory fixture literal and rerun core non-mutating gates. Output: current greenline command log.

Day 4: If authorized, run side-effectful policy/build certification in a clean branch/worktree and record results. Output: release hygiene report.

Day 5: Build supplier authenticated fixtures or document exact missing fixture requirements. Output: fixture readiness proof.

Day 6: Run supplier authenticated browser/screenshot evidence. Output: supplier workflow certification packet or precise fixture blocker.

Day 7: Classify referral unclassified paths and isolate mixed shared hunks. Output: release-scope gate without classification blockers.

Day 8: Create exact referral revision and regenerate architecture graphs only for that isolated revision. Output: revision-bound evidence.

Day 9: Run non-prod referral migration/release rehearsal. Output: environment-bound readiness result.

Day 10: Go/no-go review. Output: either one pilot launch packet or a blocker register with owners and no further rediscovery.

### D. Sustainable execution contract

- One bounded outcome per task.
- Named files/modules in scope before implementation.
- Acceptance criteria before code changes.
- Reuse graph/reports before new discovery.
- No new audit of the same area without new evidence or a changed question.
- No broad redesign without user approval.
- Verification commands selected before implementation.
- Every task ends as completed, partially completed, genuinely blocked, or deliberately stopped.
- Track token spend against verified deliverables, not reports, files, prompts, or lines of code.

## 12. Decision register

| Decision | Why it matters now | Options | Tradeoffs | Recommended option | Consequence of delay |
|---|---|---|---|---|---|
| Choose first recovery pilot | Parallel work is the top root cause | Supplier first, referral first, payroll/statutory first | Supplier is smaller; referral is more commercial but externally blocked; payroll requires expert approval | Supplier after gate greenline, then referral | More tokens spent across partial streams |
| Authorize release hygiene fixes | Raw-error/regulatory gates fail today | Fix now, defer, or allowlist | Fixing now improves all future work; deferring keeps policy gates noisy | Fix now | Every slice carries release uncertainty |
| Assign statutory country-pack reviewer | Payroll/country-pack production remains blocked | Name reviewer, keep paused, or remove production claims | Reviewer unlocks production path; paused is honest | Keep paused until qualified review exists | Repeated statutory rediscovery |
| Authorize referral pilot environment | Referral cannot prove real pilot readiness locally | Non-prod rehearsal only, real pilot, or defer | Real pilot is highest proof but needs ops readiness | Non-prod rehearsal after supplier, then real pilot | Referral remains "pilot-ready" narrative |
| Adopt artifact/report discipline | Evidence sprawl is slowing work | Keep all, archive/supersede, or central index | Archive policy reduces rediscovery; must preserve audit history | Supersede through a single truth register, not deletion | Continued context loss and stale blockers |

## 13. Immediate actions

1. Owner: user plus engineering lead. Output: select `Release Hygiene Greenline -> Supplier Workflow Browser Certification -> Customer Referral Exact Pilot Release` as the next critical path. Verification: a one-page current truth register names all paused work and the selected first slice. Stop condition: if the user selects a different pilot, rewrite only the sequence, not the whole platform plan. Reason it outranks remaining work: without one critical path, every other improvement keeps feeding parallel partial progress.

2. Owner: engineering. Output: clear the 12 raw-error gate findings and 1 regulatory fixture literal, or produce a precise exception owner for any item that cannot be fixed as code. Verification: `npm run error:boundary:fail`, `npm run regulatory:hardcode:fail`, `npm run typecheck`, `npm run prisma:validate`, `npm run service:boundary:fail`, and `npm run inventory:boundary:fail` pass. Stop condition: stop any sub-item that requires a product/control decision instead of engineering judgment. Reason it outranks remaining work: current release hygiene failures make every slice harder to trust.

3. Owner: product/QA with engineering support. Output: authenticated supplier workflow fixture pack and browser evidence for list/create/detail/edit/restricted-role/export-redaction flows. Verification: focused supplier tests plus desktop/tablet/mobile browser evidence with no screenshot claim unless actually captured. Stop condition: if fixtures are unavailable, record the exact fixture gap and switch to the next authorized work instead of simulating completion. Reason it outranks remaining work: supplier is the closest near-complete vertical slice and can restore a visible verified-delivery rhythm quickly.
