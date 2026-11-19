# P04 authority qualification result — 29 October 2026

**Disposition: BLOCKED.** The requested current-source inventory, selected isolated negative tests, finding reconciliation and repair planning are complete. P04 is not verified and production gate R03 remains open. No application fixes were implemented.

Candidate: p04-20261029-07216cdcb1fb; HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62; current dirty working tree. The initial manifest fingerprints 3,425 source/configuration/migration files. Scoped route/action manifests provide additional traceability. Historical graph snapshots were used only for discovery. P03 frozen-artifact browser results were not reused as proof of current P04 authority.

## Scope and guard accounting

The first artifact created was [scope-and-guard-register.json](scope-and-guard-register.json). It links the authoritative detailed registers:

| Surface | Inventory | Qualification limit |
|---|---:|---|
| Server action exports under actions | 748 in 209 module-level use-server files | 742 direct exports and 6 reexports; aliases are records, not distinct deployed network IDs. 72 exports reviewed, 30 through selected callchains;676 remain inventory-only. |
| App-local server-action candidates | 13 | Two module exports and 11 inline functions; eight accounting delegates traced. Compiled reachability and remaining continuations remain open. |
| API handlers | 22 files /30 explicit method exports | Entry boundaries traced; nested provider/callback and implicit methods remain open. |
| Pages/layouts | 190 pages /21 layouts | Five sensitive public page entry chains traced; 185 downstream page continuations remain unqualified. |
| Page surface declarations | 146 | Declarations and observe-mode calls do not establish enforcement. |

The register lists actor/session, tenant, permission, resource/location and module boundaries with exact source references. Source-reviewed roles include location-limited branch manager/reader, a custom reserved Admin role, foreign-tenant wildcard roles, anonymous callers and revoked/inactive/locked/unverified authority states. The private test roster is synthetic; no production users or role memberships were inspected.

Shared guard ownership: current authority and permission projection in lib/security/rbac.ts; exact live-session and fresh-assurance binding in lib/security/auth-session.ts; configured action gates in services/_shared/protect.ts; API current-org guards in lib/security/server-authz.ts; grant enforcement in services/modules/module-entitlement.service.ts. Arbitrary related-resource IDs and location scopes remain handler/service obligations. The operating-scope policy has the confirmed F01 defect below.

## Executed evidence

| Evidence lane | Outcome | What it establishes |
|---|---|---|
| Workflow contract | PASS | Repository contract checked;196 other commands remain unclassified, not implicitly safe. |
| Mocked API/action/shared-guard tests | 12 suites;109 ordinary checks pass;4 disclosure characterizations reproduce F03;0 skipped | Component boundary behavior under explicit mocks. No live session/database/browser proof. |
| Real PostgreSQL authority tests | 23 pass;1 security regression fails | Current guards, real persisted permissions/session mirrors and role/member transactions. Better Auth transport/Next headers are explicitly stubbed. Failure reproduces F01. |
| Synthetic component HTTP | Anonymous request returns200 and private sentinel | Current middleware plus installed Next public filesystem/static transport reproduce F02. No full application build/ingress or real tenant file was served. |
| Actual signed-cookie/current browser/provider/operator tests | Not run | Explicit blocking qualification packages retain these obligations. |

The fresh database was stoquify_local_p04_authority_20261029_r1 on the owned loopback cluster. All 120 migration checksums and directory count were checked before tests; no migrations ran. The 26-file private Prisma client matched its manifest; all 452 schema blocks matched after declaration-format normalization. No application environment files were read by the guarded Jest lanes. The runner stopped the owned cluster after completion.

For the tested protected denials, handlers were not called, responses contained no private canary, and before/after digests matched across both fixture tenants for organizations, users/role memberships, roles, sessions, locations and module configuration/grants/commands. **This is not a claim of literal zero database writes:** intended security audit records are excluded. Other service families can also persist control/failure records and need their own explicit side-effect assertions. No unauthorized business write was observed in the tested denial paths.

## Confirmed findings

| Finding | Evidence and bounded impact | Repair |
|---|---|---|
| F01 — reserved-code scope escalation | A legitimate location-scoped role delegator creates Admin with dashboard.read and assigns it to a distinct member. Real PostgreSQL service composition produces TENANT scope although the delegator lacks it. Same-tenant operating scope escalation; no cross-tenant or actual HTTP exploit claimed. | P04-R01 |
| F02 — alternate public upload delivery | The guarded upload API reads public/uploads files that also resolve through unauthenticated static delivery. Current middleware and installed Next components returned synthetic private bytes without credentials. Actual deployed file inclusion/exposure remains untested. | P04-R02 |
| F03 — arbitrary exception messages | getItemAction/listItemsAction forward injected guard/service errors verbatim. Four mocked characterizations reproduce this. Seven additional mutation catches are source-matched obligations; no live confidential DB payload was demonstrated. | P04-R03 |

These findings were independently source-reviewed and their executed evidence was checked. The known native failing assertion is retained unchanged as evidence; the harness completion flag does not mean security PASS. See [findings-register.json](findings-register.json), [gate-matrix.json](gate-matrix.json) and the final [independent review](guard-review/FINAL-INDEPENDENT-REVIEW.md).

## Remaining work and decision gate

P04-V01 must subdivide the remaining action/page inventory into bounded domain/route-family authority packets before execution. P04-V02 covers actual signed-session transport, provider endpoint protocols and private browser restoration. P04-V03 covers public capability/referral negatives. P04-V04 covers HR document object/manager scope and revocation during storage latency. P04-V05 retains current dependency, secret-handling, log/export/storage and artifact-content review.

P04-D01 is a business/security decision: define which same-tenant report readers may inspect another user's report export artifact. Current reports.read behavior is recorded as a policy gap, not an asserted defect. Dependent acceptance waits for an approved visibility matrix.

The main work register now has 54 packages (41 original parents,4 earlier P03 children and 9 P04 children), an acyclic 183-edge graph, all 57 domains and 12 audit gaps. All unrelated prior packages,14 existing decisions,18 production gates and deferred X01–X04 commitments remain unchanged. P01–P03 retain their prior verified, scoped outcomes. No production readiness gate was promoted.

## Next eligible package and exact first action

**P04-R02 — close alternate public-static access to private uploads — is the recommended first repair.** Its first action is to create a content-hash/reference manifest from an isolated copy of the legacy upload assets and enumerate every API/static delivery URL, then add a two-path failing regression before changing serving/storage behavior. Preserve existing authorized references and originals. No production data migration or deletion is authorized by this packet.

R01 and R03 can proceed in parallel with distinct ownership once repair execution is requested; their acceptance must preserve legitimate administrator behavior and safe business errors. Read-only scope subdivision and the D01 policy decision can also proceed in parallel. P05 and other P04 dependants remain blocked.

Evidence to advance: R02 two-path negatives and valid authorized-read controls pass on a current isolated application artifact; private assets are absent from public delivery; reference/recovery mappings reconcile; independent review passes. P04 itself closes only when all required child packages and admitted-surface evidence gates are satisfied.

No commits, pushes, production flag changes, production data migrations or deployments were performed. Cleanup/source-preservation details are recorded in [final-integrity.json](final-integrity.json).

Source-preservation qualification: all 3,425 captured files and HEAD remained unchanged, but four new untracked disposable Prisma scripts appeared outside this task. They were preserved and not executed. The strict whole-worktree check remains failed in final-integrity.json; [preservation-disposition.json](preservation-disposition.json) records the scoped result and requires a fresh snapshot before the next package.

Forensic test hygiene: the two newly authored test sources were archived byte-for-byte as .source.txt after execution so ordinary Jest/TypeScript discovery cannot collect a retained failing security reproduction. [test-source-relocation.json](test-source-relocation.json) maps historical executed paths and hashes to their preserved sources. Historical run scripts/configs are one-shot evidence, not instructions to rerun against the same target.
