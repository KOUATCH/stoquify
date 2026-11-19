# AF11 — Country-specific obligations and evidence register

**2 November 2026 sealed obligation follow-up:** [AF11 operational browser verification](../AF16/SEALED_OBLIGATION_BROWSER_2026-11-02.md) PASS: 8 workflow groups, 4 scoped EN/FR scans, exact retry, independent review, UNKNOWN statutory state and authority recovery. AF11 country qualification remains IMPLEMENTED_UNVERIFIED; production NO_GO. Next: AF06 delegated evidence workflow on the same artifact.

**Date:** 20 October 2026. **Status:** IMPLEMENTED_UNVERIFIED for the full country-specific phase. The operational register is implemented; qualified country approval and current statutory definition evidence remain external dependencies. AF16 release qualification remains open. No production migration, deployment, filing, commit or real-client enrollment was performed.

Canonical technical evidence: [2026-10-20-run-01](2026-10-20-run-01/). Read alongside the [source register and refresh procedure](OBLIGATION_SOURCE_REGISTER.md), [capability matrix](CAPABILITY_MATRIX.md), [country-review gaps](COUNTRY_REVIEW_GAPS.md), and unchanged [AF11 prompt](../../prompts/AF11-obligation-register.md).

## Outcome and acceptance

Authorized accountants can maintain a client-period obligation register inside the existing accountant portal and firm work desk. Each preparation retains applicability, responsibility, an optional operational target date, the country source snapshot and an existing domain evidence reference. A different authorized reviewer can review that preparation after password step-up. Changed sources or evidence invalidate the current evidence conclusion while preserving history.

The bounded catalog contains one operational Close evidence-collection reminder and two unverified Cameroon candidates: VAT and CNPS evidence. No legal deadline, tax computation, new filing lifecycle or production adapter is introduced. Existing PUBLISHED/SUPPORTED country-pack labels never imply qualified approval.

| Criterion | Result | Evidence and limit |
|---|---|---|
| AF11-AC1: verified statutory obligations require dated official provenance and qualified review | Guard PASS; statutory admission NOT_VERIFIED | All statutory candidates remain UNKNOWN with `statutoryVerified: false` and no qualified-review receipt. Existing source dates/URLs are displayed, but no current professional approval was obtained. Pure/source-change tests prove metadata labels cannot promote coverage |
| AF11-AC2: sandbox/manual evidence never appears as accepted live filing | PASS for implemented pilot | Real PostgreSQL declaration evidence covers manual submission, manually captured acceptance, sandbox acceptance and production-labelled evidence. All retain `liveFilingAccepted: false`; unknown authority strings cannot enable a filing |
| AF11-AC3: applicability/source changes remain reviewable without losing history | PASS | Append-only revisions, source hashes, country/version/hash change tests, optimistic version checks, independent re-review and SQL UPDATE/DELETE rejection |
| AF11-AC4: overdue, not applicable, unknown and fulfilled-with-evidence are distinct | PASS | Pure state matrix and real database journeys. An unknown obligation may separately have an overdue operational target. Only reviewed operational collection can become fulfilled in this pilot |
| AF11-AC5: no live authority requests or financial declarations sent | PASS | Service reads existing domain evidence and writes only register revisions/audit records. Browser journal count stays zero and the existing Close pack remains uncertified |

The phase cannot be marked VERIFIED merely because the unreviewed catalog safely refuses statutory claims. Its required qualified country evidence is still missing, as specified by the phase execution contract.

## Reuse and owned implementation

| Area | Current implementation |
|---|---|
| Source and status projection | [obligation-register-source.ts](<E:/ohada saas/Focused projects/stoquify/services/compliance/obligation-register-source.ts>) reads the existing country-pack registry, retains provenance, computes source identity and separates coverage, work state and target-date state |
| Domain service | [obligation-register.service.ts](<E:/ohada saas/Focused projects/stoquify/services/compliance/obligation-register.service.ts>) uses existing Close periods/source revision, ClosePackExport and PayrollDeclarationEvidence; versioned commands and reads use existing authority and audit controls |
| Contract/actions | [contract](<E:/ohada saas/Focused projects/stoquify/services/compliance/obligation-register.contract.ts>) and [protected actions](<E:/ohada saas/Focused projects/stoquify/actions/accounting/obligation-register.actions.ts>) reject extra caller claims and bind trusted session/actor context |
| Live authority | [close-evidence-acceptance-authority.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-acceptance-authority.service.ts>) reuses AF04 mandates, engagements, assignments, current roles, modules and session locks. Its new optional payroll-read requirement is client-local and checks the existing payroll module and permission |
| Existing UI | [ObligationRegister.tsx](<E:/ohada saas/Focused projects/stoquify/components/accounting/ObligationRegister.tsx>) is embedded in AccountantPortal and AccountantWorkDesk; existing dashboard controls, EN/FR, native forms, password assurance, exact retry and private-state clearing are reused |
| Persistence | `FirmObligationRevision` in [schema.prisma](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma>) and [additive migration](<E:/ohada saas/Focused projects/stoquify/prisma/migrations/20261020180000_firm_obligation_register/migration.sql>) retain immutable obligation history, tenant-period binding, independent review and idempotency |
| UI contract | [obligation-register.md](<E:/ohada saas/Focused projects/stoquify/design-system/stoquify/pages/obligation-register.md>) records states, privacy, terminology and bounded behavior |

The existing actions graph is historical discovery evidence, dated 8 September 2026: Close assurance is in community 6 and payroll country-pack review intake in community 17. Current services/actions establish behavior; the graph was not regenerated. Existing regulatory capability and adapter services were inspected and reused as boundaries, without changing their publication or submission behavior.

## Authority, evidence and consistency

Read, preparation and review use the existing workpaper authority boundary. A firm assignment alone grants no client access. Current named-accountant mandate and managed-engagement restrictions remain required. Review also requires the existing accountant-review permission, password assurance no older than five minutes, and an actor different from the latest preparer.

Restricted payroll reads/writes require the actor's home organization to be the client, live `payroll.reports.read` permission and payroll module access. Ordinary firm reads return a redacted payroll entry without its evidence ID, notes or history, and do not fetch payroll evidence rows. The DTO never exposes declaration amounts, payloads or employee information. A firm mandate cannot be used to enable payroll disclosure.

Each command runs in one Read Committed transaction, with a 20-second timeout and 10-second maximum acquisition wait. Existing authority locks precede per-client obligation serialization, ordered period locks and the Close source-revision lock. Current authority is rechecked after waits and before completion. The audit record and new revision commit together. An injected audit failure leaves neither effect; the same command can then retry successfully.

An idempotency key is bound to the actor, client and complete normalized command. Exact retries return the retained receipt; changed payloads conflict. Version checks prevent lost updates, and the service permits one obligation code per client period. SQL adds retained chain identity, tenant-period checks, independent positive review constraints and immutable UPDATE/DELETE guards. The scoped service owns creation uniqueness under its advisory lock.

Close evidence is an existing same-client/same-period export from a non-voided Close run. Its current identity includes the Close source revision. Reviewing collection does not certify the pack or its underlying accounts. CNPS evidence must reference an existing same-client Cameroon CNPS declaration whose dates fit the accounting period. Reading or reviewing it never invokes the declaration lifecycle writer. Manual acknowledgement, sandbox and unverified authority evidence remain separate classifications.

## Bounded behavior and limitations

- Up to 100 accounting periods, 100 obligation instances and 500 retained revisions per client. Writes stop at the revision cap while existing reads remain available. Historical data is not deleted to make room.
- Evidence pickers return the latest 100 Close artifacts and, only with explicit payroll authority, 100 payroll evidence records. This is not an assertion of complete evidence coverage.
- Responsibility defaults to the creator and can be claimed by the current actor. Arbitrary staff reassignment, notification delivery and background scheduling are outside this slice.
- Dates are user-selected operational targets stored at end of day UTC. The UI says they are not legal deadlines. No national holiday, taxpayer exception or statutory due-date calculation is implemented.
- The internal 90-day refresh policy is evidence-maintenance policy. It does not turn existing June 2026 pack metadata into current country approval. Unsupported, expired and unreviewed regulatory coverage stays UNKNOWN.
- Reads are explicit snapshots. Client changes, hidden tabs and access denial clear private data and drafts; late responses cannot restore an old client's data. Every protected request rechecks authority; no continuously live dashboard freshness is claimed.
- Existing module/role/engagement controls govern the feature. There is no new flag framework, parallel identity system, provider integration, AI assistant, payment flow or commercial package change.

## Verification by evidence class

The source revision at task start was `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`. The working tree already contained AF01–AF10 and unrelated product work. This task preserves those changes; source manifests and focused checks describe the owned slice, not whole-repository certification.

| Evidence class | Command or artifact | Result |
|---|---|---|
| Workflow contract | `npm run agent:workflow:check`; [final log](2026-10-20-run-01/workflow-final.log) | PASS; 196 scripts remain outside the reviewed manifest; no application commands executed by this check |
| Prisma schema and isolated client | `node node_modules/prisma/build/index.js validate --config .codex-tmp/af11-prisma/prisma.config.ts`; corresponding `generate` | PASS; [schema](2026-10-20-run-01/schema.log) and [generation](2026-10-20-run-01/generate.log) logs; generated only the isolated AF11 client |
| Scoped TypeScript | `node node_modules/typescript/bin/tsc -p tsconfig.obligation-register.json --noEmit` | PASS, exit 0; includes service, actions, register and integrating portal/work-desk code |
| Pure/mocked unit tests | `node node_modules/jest/bin/jest.js --config jest.obligation-register.config.cjs --runInBand --json --outputFile <run>/unit-results.json` | 112 PASS: 14 source/state/strict-input tests and 98 existing authority regressions |
| Component/jsdom checks | Same focused Jest lane | 26 PASS: six register tests and 20 existing work-desk regressions; these are not rendered-browser proof |
| Real PostgreSQL | `node node_modules/jest/bin/jest.js --config jest.obligation-register-postgres.config.cjs --runInBand --json --outputFile <run>/postgres-results.json` with explicit synthetic AF11 target/fixture guards | 14 PASS; [results](2026-10-20-run-01/postgres-results.json). No database/service behavior mocked |
| Clean migration | `node scripts/fixtures/obligation-register-database.cjs` | PASS; 105 migrations on a fresh explicitly named local database |
| Populated upgrade/replay | `node scripts/fixtures/obligation-register-upgrade.cjs` | PASS; 104→105 migrations on an isolated clone of populated AF10 fixtures; replay made no additional migration; nine existing tables retained identical counts/digests, including 35 journals |
| Authenticated browser | `node scripts/verify-obligation-register-browser.cjs` against the env-free source snapshot | PASS, exit 0; five journey checks, four EN/FR desktop/mobile scoped axe scans with zero violations, no panel overflow or page errors; [browser verification](2026-10-20-run-01/browser-verification.json) |
| Publication | Repository docs-report-publisher plus independent PDF/source verification | Matching Markdown/PDF reports; see [publication evidence](2026-10-20-run-01/accounting-publication-verification.json) |

Database scenarios cover independent evidence review; unknown/not-applicable/overdue history; concurrent exact retries; competing versions and duplicate period entries; maker-checker and changed prepared terms; country/source change; voided artifacts; cross-client references and SQL immutability; fresh-auth/role/engagement denial; caller permission spoofing; four payroll evidence environments and redaction; a real role-revocation lock race; and atomic rollback after audit failure. The fourteenth scenario retains the synthetic browser fixture.

The database target is `127.0.0.1:55449/stoquify_local_af11_20261020_r1`; the upgrade target is `stoquify_local_af11_upgrade_20261020_r1`. Both are inside the explicitly identified private local PostgreSQL 17 cluster. Browser users use synthetic `example.invalid` addresses and random credentials held outside published artifacts. The browser server runs on loopback port 3151 from an environment-free source snapshot with the isolated generated client. No configured application database or production credentials were used.

The final browser run passed real sign-in, preparation, deliberate response loss after commit, exact retry, separate reviewer password step-up and explicit retry, evidence fulfillment, restricted-payroll denial and current-role revocation. Revocation may remove the whole register through the existing portal's access-denied state; the harness checks that path as well as a local register denial. Earlier harness attempts used an exact label selector that included native select option text, and assumed denial always stayed inside the register. Diagnostics showed a loaded form and the existing parent denial boundary; the corrected full journey passed on fresh synthetic actors. These harness failures are not omitted from the retained run evidence.

Four screenshots at 1440 and 390 pixels cover English and French; the French narrow layout was visually inspected for wrapping and control readability. Scoped axe checks are not full accessibility certification or screen-reader testing. The [source manifest](2026-10-20-run-01/source-manifest.json) records 24 owned files/shared-file states and confirms all matching application sources equal the browser snapshot. No production build or whole-repository test suite was claimed.

## Rollout, observation and retained rollback

Before any real activation, review the additive migration in the normal release process, complete the statutory evidence gate for any claimed regulatory obligation, and qualify expanded scope through AF16. The current technical pilot can only claim operational evidence collection. Nothing in these test results authorizes production promotion.

Observe permission/fresh-auth denials, version/source/evidence conflicts, missing domain artifacts, expired coverage, transaction failures and bounded-cap errors. Existing protected-action correlation/error handling and atomic audit records remain the operational evidence. Repeated conflicts should prompt a reload and new preparation; an uncertain response should use the exact retained command. Do not manually mark a failed review successful.

Safe fallback is to remove the two UI entry points or restrict new work through existing permissions/module controls, while retaining the additive schema, historical revisions and domain evidence. An operational reminder can be revised to not applicable with a reason. Unsupported statutory entries remain visible as unknown where reads stay authorized. Dropping the table or deleting histories is not a supported rollback; restrictive tenant/period references intentionally preserve audit evidence.

## Remaining decision and next work

Obtain current official definition evidence and qualified independent Cameroon review, then implement only the approved statutory admission/rule changes with the documented source-refresh procedure. Current technical reviews are evidence reviews, not professional country approval. AF12 and AF16 were not executed automatically.

Architecture, backend, database, security/privacy, UX/localization, accounting/evidence, QA and operational recovery are material and addressed above. Legal/country approval remains external. New AI behavior, pricing, billing, event delivery and live-provider operations are not applicable because this slice introduces none of them. Real-client usefulness and workload outcomes remain unmeasured until an authorized operating pilot.
