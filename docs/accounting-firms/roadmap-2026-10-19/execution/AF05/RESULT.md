# AF05 firm engagement workflows

**Updated:** 20 October 2026. **Status:** VERIFIED within AF05's scope.  
**Scope:** AF05 only. AF04 owns engagement authorization and lifecycle mutations.  
**Source:** `6ee84a90c760d2864f6aef672d8b393ac2b65971` plus the shared working tree. Prior AF01–AF04 and unrelated landing, onboarding and retention changes were preserved. No commit, production migration, deployment or real client enrollment was performed.

## Delivered behavior and reuse

The existing Accountant Access route now offers **Client mandates** and **Firm engagements**. A firm manager can prepare a draft, assign existing firm staff, explicitly enroll their named mandates, activate or suspend an engagement, replace staff, end assignments and end an engagement. Consequence dialogs identify the intended change and reuse the existing password step-up. Versions and idempotency remain AF04-owned.

Assignment, client consent and enrollment are shown separately. Staff cards distinguish missing, scheduled, expired and revoked consent, assignment windows, engagement restrictions and current managed read access. Other domain permissions are checked again when the user performs the relevant action. A home organization is never silently changed. Other-firm accountants follow the existing separate named reviewer path.

Client owners grant and revoke access through the existing protected mandate form. The register now identifies each named accountant. Password confirmation and retry preserve the attempted payload. Renewal instructions require fresh client consent and explicit enrollment of the new mandate.

The handover summary reuses the existing evidence work desk. It distinguishes work awaiting client recipients from work awaiting the review team, exposes partial coverage, and checks current delegated review authority. Handover retains requests, findings, comments, recipient ownership and historical attribution. It does not transfer consent or silently reassign evidence recipients.

The client-owned invitation panel reads the existing invitation and outbox records. It shows redacted email, acceptance, delivery, attempts, expiry and a scheduled retry separately. Delivery failure is not mandate acceptance. No new delivery worker or provider call was added.

## Source evidence and owned changes

| Area | Current implementation |
| --- | --- |
| Existing route and shell | `app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx`; existing route permission and AccountingPageShell |
| Workflow UI and bilingual copy | `components/accounting/FirmEngagementWorkspace.tsx`, `firm-engagement-copy.ts`; existing dashboard tokens and AlertDialog |
| Named client mandates and delivery | `components/accounting/AccountantAccessManager.tsx`, `AccountantInvitationDelivery.tsx`; existing invite/revoke/password actions |
| Trusted server boundary | `actions/accounting/firm-engagement.actions.ts`; protected workspace, delivery and work-summary actions |
| Management read model | `services/accounting/firm-engagement-workspace.service.ts`; own-firm metadata, persistent AF04 authority before/after the read, bounded lists and safe DTOs |
| Existing domain reuse | `services/accounting/accountant-work-desk.service.ts` adds an authorized summary; `accountant-access.service.ts` adds named register identity |
| Existing mutations | `services/accounting/firm-engagement.service.ts` and managed-access resolver reused; no new lifecycle writer or schema |
| Design contract | `design-system/stoquify/pages/firm-engagements.md` |
| Tests and fixture tooling | AF05 component/service/PostgreSQL tests, protected-action regressions, focused Jest/TypeScript configs, and `scripts/*firm-engagement*browser*.cjs` |

The August 2026 graphs were used only for discovery: AccountantAccessManager in component community 48 and accountant-access actions in action community 58. Current source, not graph counts, establishes behavior.

Verified source entry points: [workflow UI, line 14](<E:/ohada saas/Focused projects/stoquify/components/accounting/FirmEngagementWorkspace.tsx:14>), [protected reads, line 21](<E:/ohada saas/Focused projects/stoquify/actions/accounting/firm-engagement.actions.ts:21>), [management reader, line 16](<E:/ohada saas/Focused projects/stoquify/services/accounting/firm-engagement-workspace.service.ts:16>), [redacted delivery reader, line 94](<E:/ohada saas/Focused projects/stoquify/services/accounting/firm-engagement-workspace.service.ts:94>), [authorized work summary, line 194](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.service.ts:194>) and [named mandate register, line 381](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts:381>). The final source-hash record confirms all nine changed application files matched the browser snapshot.

## Acceptance evidence

| Criterion | Result and evidence |
| --- | --- |
| AF05-AC1: setup and intelligible access | PASS — Real manager browser setup, assignment, explicit enrollment and activation; service tests bind lists/details to the actor's firm and reject injected authority |
| AF05-AC2: client consent is independent | PASS — Client-owner browser grants/revocation use existing protected forms; PostgreSQL proves assignment creates no mandate link and draft enrollment denies financial access |
| AF05-AC3: safe handover and retained work | PASS — PostgreSQL seeds an open request and finding, verifies summary counts, retains comments and original ownership through handover, denies outgoing managed access and requires incoming enrollment; browser replaces staff and verifies unchanged work rows |
| AF05-AC4: UI and recovery | PASS — Component tests cover EN/FR, focus, denied states, partial coverage and exact-key retry. Four authenticated locale/viewport checks found no horizontal overflow or scoped axe violations. Six recovery checks pass: keyboard cancellation, expiry, transport retry, route denial, module lock and session revocation |
| AF05-AC5: delivery is not acceptance | PASS — Browser queues a synthetic invitation through the real action, injects a synthetic worker failure, verifies retry display and pending acceptance without an additional grant; service tests exclude sealed envelopes and tokens |

## Verification classes

Canonical evidence: [2026-10-20-run-01](2026-10-20-run-01/).

| Class | Command or evidence | Result |
| --- | --- | --- |
| Workflow contract | `npm run agent:workflow:check` | Passed; 196 unclassified package scripts remain. This is not an application test |
| Focused mocked/component lane | `node node_modules/jest/bin/jest.js --config jest.firm-engagement-workflows.config.cjs --runInBand --json --outputFile docs/accounting-firms/roadmap-2026-10-19/execution/AF05/2026-10-20-run-01/unit-verified.json` | Exit 0; 7 suites, 102 tests |
| Existing accounting regressions | Same Jest invocation with `jest.firm-engagement.config.cjs`, output `regression.json` | Exit 0; 16 suites, 541 tests; overlaps the focused lane, so counts are not additive |
| Scoped types | `node node_modules/typescript/bin/tsc --project tsconfig.firm-engagement-workflows.json --noEmit --incremental false` | Exit 0; `typecheck-verified.log` |
| Real PostgreSQL | Scoped Jest with `jest.firm-engagement-workflows-postgres.config.cjs`; `postgres-current-client.json` | Exit 0; 5 tests. Tenant/session denials, consent/enrollment, retained work/handover, expiry and ended history |
| Authenticated browser | `scripts/verify-firm-engagement-browser.cjs` and `scripts/verify-firm-engagement-browser-recovery.cjs` | Combined journey/recovery PASS in `browser-verification.json`; real Better Auth, protected actions and PostgreSQL. Initial/resumed journey exit 1 on harness assertions, recovery exit 0; not represented as one uninterrupted passing run |
| Publication | Repository docs-report-publisher plus PDF extraction, source hashes and rendered samples | See `accounting-publication-verification.json` and contact sheet |

The browser and SQL fixture is explicitly synthetic: `stoquify_local_af05_browser_20261020_r1` on `127.0.0.1:55441`, using the task-owned cluster. The existing 101 migrations were applied to this new database. AF05 adds no migration. No configured application database was used. The local app ran on port 3045 from an environment-free source snapshot; credentials remain outside published evidence.

The recorded Next process tree and task-owned PostgreSQL cluster were stopped after verification; databases and evidence were retained. The scoped whitespace check passed. Full application build and whole-repository type certification were not run.

The shared generated Prisma client was stale: it lacked AF04 assignment end-attribution fields. The first bounded SQL run failed two tests for that reason. A current isolated client was generated from the existing schema; all five then passed. Shared dependencies were not overwritten. The initial unbounded test-root scan was stopped and replaced with an accounting-only root. Failed evidence is retained.

Early browser attempts exposed harness timing assumptions around the password form. The long run also required renewed password confirmation before revocation. A later assertion expected a panel alert after role removal, while the actual server route correctly replaced the whole workspace with its permission-denial screen. These attempts remain archived; the recovery lane verifies the actual route boundary.

## Design, operations and limits

The implementation follows the existing UI constitution, shell, tokens, native labels and modal primitives. English and French copy explain business consequences. Refresh clears private cards before a new authorization read; visibility changes invalidate older responses. Current access is an observation, not a reusable authorization decision.

Engagements paginate in pages of 20. Staff/setup-client selectors are capped at 100 and explicitly marked partial. Large-firm selector search and production latency qualification remain follow-up limits. Selected history is retained; this phase does not claim a scale benchmark. Partial-state behavior has component/service evidence, rather than a 101-member browser fixture.

An uncertain mutation retains its exact command and key while that dialog remains open. This is not durable recovery across navigation or reload: inspect current retained history before creating another command after leaving the page. The UI creates no local authorization store.

The authenticated scans cover the new workspace in English/French at 1440 and 390 pixels. Scoped axe results and keyboard checks are not whole-application accessibility certification. Synthetic delivery failure tests exercise presentation and persistence; no provider delivery or live accountant acceptance is claimed.

Architecture, backend, database, IAM, privacy, workflow, frontend, QA and operational lenses are material and addressed above. Product/customer-success implications are documented in the journey and training notes. Accounting/evidence work remains owned by its existing domain. Country-rule, tax, filing, AI, payment, subscription/billing and commercial-pricing changes are not applicable: this phase introduces none.

## Activation, rollback and next phase

Before activation, deploy the existing AF03/AF04 migrations, generate the matching Prisma client and retain managed-access enforcement across readers/writers. Confirm current home-firm roles, accounting-module entitlement, individual client mandates and fresh authentication. No new feature-flag framework is introduced.

Observe protected-action denials, stale versions, identity failures, uncertain commands, partial coverage and outbox retry/dead-letter states separately. For UI rollback, remove the new setup/enrollment navigation and mutation entry points while retaining authorized history access and AF04 restrictions. Do not delete grant links, reopen ended assignments or restore legacy access by rolling back enforcement. Existing client mandate revocation remains available.

AF16 still owns release qualification and a separately authorized real pilot. The next justified phase is **AF06: delegated evidence desk**; it has not been started.

Companion documents: [engagement journey](ENGAGEMENT_JOURNEY.md), [permission/state matrix](PERMISSION_STATE_MATRIX.md), [pilot training](PILOT_TRAINING_NOTES.md).
