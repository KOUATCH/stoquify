# P04 action scope and guard review

Current working-tree source at base commit `80e4abb283216b9f8e04b94e5020393f7dcabf62`, inspected 2026-10-29. This subtask owns only this directory. No application code, flags, migrations or deployment were changed.

## Scope and coverage

| Measure | Count | Meaning |
|---|---:|---|
| Non-test source files in `actions/` | 217 | Current source discovery |
| Module-level `use server` files | 209 | Eight helper/reexport-only files excluded from action count |
| Server-module export records | 748 | 742 direct exports + 6 resolved reexports |
| Distinct local implementations | 738 | Four implementations have both named/default export aliases |
| Action export records with manual entry semantics reviewed | 72 | Includes 30 with selected guard/service call chains inspected |
| Action export records with inventory only | 676 | Explicit blocking review gaps; no inferred pass |
| Additional app module exports / inline server functions | 2 / 11 | Eight inline accounting delegates manually traced |
| Production-admitted surfaces from this review | 0 | Source review and discovery do not establish release acceptance |

These are source records, not unique deployed HTTP action IDs. The Next server-reference manifest and direct action invocation still need qualification. The candidate inventory does not decide the business production scope.

- [server-action-exports.json](server-action-exports.json): one record per export, with source hash, line, import/local-call candidates, manually reviewed boundaries where available, and explicit unresolved gaps.
- [app-local-server-actions.json](app-local-server-actions.json): inline functions, downstream accounting actions and the eight excluded helper files. The routes reviewer also owns [the independent app inventory](../routes-review/app-server-actions.json).
- [findings.json](findings.json): findings, bounded repair packages, acceptance requirements and exact runtime limitations.
- [source-manifest.json](source-manifest.json): hashes for scanned action/app source and consulted dependencies.

Inventory uses the installed TypeScript 5.8.3 AST, excludes type-only exports, resolves named/default aliases and expands the analytics wildcard. Candidate calls follow local declaration references; candidate guard names do **not** establish that execution must pass the guard. Every unreviewed export remains blocked. The dated `graphify-out/graph_actions.json` (2026-08-09; 1,044 nodes / 1,284 links) was consulted for discovery only, including nodes `auth_ts`, `actions_auth_registeruser` and `actions_auth_signinwithcredentials`. Current source replaces historical graph line numbers and behavior.

## Reviewed authority paths

The shared `protect` boundary obtains current permission authority via RBAC, optionally checks stored fresh-session assurance, compares fresh user/tenant identity, and enforces its configured module decision. Its default tenant check examines `organizationId`/`orgId` and one nested `data` object. It does not authorize arbitrary related-resource IDs. `handler-derived` and `false` skip that generic tenant-input check and therefore require explicit handler/service evidence.

Current RBAC disables the Better Auth cookie cache and reloads active user, active organization and tenant-only roles. `requireSession` additionally requires the stored unexpired session ID/token/subject. These source controls are distinct from proof that signed cookies or deployed HTTP paths behave correctly.

Manually reviewed groups include all role actions; member access, directory, self-profile, session, password and invitation action boundaries; all eight access-request exports; chart accounts; journal/settings entry boundaries; accountant grant/delegated trust entry boundaries; handler-derived finance statement exports; and owner/manager operating-scope entrypoints. The register distinguishes entry-only review from selected service-chain review. Public registration/invitation acceptance/reset/OTP entrypoints are intentionally public identity operations and retain token/rate-limit/provider verification gaps.

Administrative settings actions mostly call module access in `observe` mode. That is not an enforced commercial-module denial. Several foundational accounting actions have no action-level module option. These are explicit policy/verification gaps, not automatically confirmed defects; production admission must specify the intended foundation/retained-read policy. No mode or flag was changed.

## Confirmed findings

### P04-A-F01 → P04-R01: reserved role code expands operating scope

An authorized but narrowly scoped role manager can create an unused `Admin`/`Super Admin` display name with only `dashboard.read`, then assign that role to another tenant member. Role creation normalizes the display name into `admin`/`super_admin`. Permission grant ceilings inspect permission arrays, while the operating-scope resolver grants tenant-wide authority based on those codes. This is same-tenant location/operating-scope expansion, not a cross-tenant escape.

The independent reviewer verified the source composition. Root then ran the dedicated PostgreSQL lane: **23 passed; one security assertion failed**, expecting `LOCATIONS` and receiving `TENANT`. [Native receipt](../native-authority-result.json), [Jest details](../native-authority-jest.json). The receipt's `passed:true` means the harness completed and reproduced the finding; `securityQualificationPassed:false` is the admission result. Real guards and role/member/scope services ran against the isolated database; Better Auth transport and Next headers were stubbed. The cluster stopped and captured source hashes were unchanged. This does not establish signed-cookie/HTTP exploitation or downstream private-data extraction.

Repair ownership: security engineer, identity/RBAC owner and operating-access owner. Treat code-derived scope as explicit grant authority, preserve legitimate owner provisioning, inventory existing custom reserved-code roles, and verify all assignment paths. No automatic cleanup or data migration is authorized by this finding.

### P04-A-F02 → P04-R03: raw item exception text reaches clients

`getItemAction` and `listItemsAction` return arbitrary `Error.message` from authorization/service failures. The independent reviewer confirmed the source behavior. Root ran the [isolated characterization](item-read-error-disclosure.test.ts): **four cases passed by reproducing disclosure**, covering both handlers with a synthetic service exception and a synthetic authorization denial. Denial blocked service execution but still returned the sentinel. [Mocked receipt](../mocked-tests-result.json), [Jest details](../mocked-tests-jest.json).

All imported dependencies are mocked, including schema parsing. These cases qualify only the error-response behavior, not validation, real authorization or live database privacy. Seven additional mutation catches in the same file use the same raw-error pattern; those are source-only observations and were not exercised by the four read tests.

Repair ownership: application engineer and security reviewer. Use the existing safe-error helper within this action family, retain fixed nonprivate outcomes, and change post-repair tests to require sentinel absence. The characterization passing is not a green security gate. Canonical P04-R02 belongs to the separate upload finding; this action repair is P04-R03.

## Remaining admission evidence

1. Reconcile the 748 action export records against approved production scope and deployed action manifests. Either qualify each admitted surface or explicitly exclude it with an enforced boundary; an inventory-only record is a blocker.
2. Finish downstream tenant, related-resource, location, module and mid-request authority checks for the admitted entries. The finance-export status path returns completed artifact metadata to a same-tenant `accounting.reports.read` caller; the intended distinction from export-creation authority remains an explicit policy/negative-test gap, not a confirmed defect.
3. Link direct action/HTTP and browser denial evidence for revoked/expired sessions, changed roles, forged related IDs and stale UI state. Existing mocked test sources were read; they cannot establish database or HTTP behavior. The parent receipts provide bounded shared-guard/service evidence, not blanket coverage of 748 exports.
4. Account for writes precisely. Permission/scope denial intentionally records security audit rows. Access-request reads may expire pending records; failed application may record `FAILED` without granting roles. Verify zero unauthorized business mutations and report expected audit/control deltas separately. Do not claim literal zero database writes across those paths.
5. Repair P04-R01 and P04-R03 only in separately authorized bounded work, independently review, and rerun the relevant acceptance tests. Keep production admission closed while confirmed defects or required evidence remain unresolved.

Rollback/recovery for this audit is removal of only this owned evidence/test directory if superseded. Preserve unrelated working-tree changes. Future repairs must retain pre-repair evidence and separate data-remediation decisions from source fixes.
