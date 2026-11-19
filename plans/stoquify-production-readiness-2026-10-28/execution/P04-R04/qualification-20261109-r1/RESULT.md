# P04-R04 — sibling item-list response repair

Candidate **p04-r04-20261109-ef3f203a9ded**. **Independently accepted for local completion** ([assessment](independent-review/ASSESSMENT.json)). Source, unit, static and native qualification passed; controlled publication review is recorded separately. **Parent P04 and production remain blocked.**

## Change and source refresh

The separate actions/item/listItemsAction.ts still returned raw exception messages through useListItems. Captured current [scope/guard inventory](inventory/INVENTORY.md), [baseline hashes](source-before.json), [owned files](owned-source.json) and [candidate](candidate.json) bind the repair. Original catch location is 71–75 (message at 73); the older 76–80 locator was inaccurate and historical evidence is preserved.

Only two imports and the catch changed in one product file. Existing safe logged normalization now uses fixed validation/authentication/access messages or Failed to list items. Arbitrary strings, provider codes, typed unknown errors and Prisma details cannot become client response text. No business-message allowlist is needed by this read-only service. Object/positional normalization, guard order, server-owned org override, query filters/sort/pagination, empty results and success envelope remain unchanged. One regression-test file was added; unrelated changes were preserved.

[Response contract](RESPONSE-CONTRACT.md) and [independent source review](independent-review/SOURCE-REVIEW.json) record the bounded behavior. Reversing only the owned changes reconstructs the pre-repair action after CRLF normalization.

## Verification outcomes

| Class | Outcome | Receipt |
|---|---|---|
| Baseline reproduction | Both input styles returned the private synthetic canary; 2 expected failures, 56 explicit filter exclusions | [Baseline](unit/attempt01/result.json) |
| Isolated unit/action/hook contract | 276/276 tests, 3 suites, zero failures/skips; 58 new + 218 continuity; 26 inputs unchanged | [Unit](unit/attempt02/result.json) |
| Native PostgreSQL/action/RBAC/service | 34/34 tests; 121 migrations; 5,209 stable source inputs | [Native](database/native-result.json), [database report](database/RESULT.md) |
| Business-state evidence | 36 equal before/after pairs across 24 groups: 9 denied/failed, 27 authorized reads; 4 intentional security-audit additions separate | [Observations](database/native-observations.json) |
| Static/controls | Two-owned-entry/import/hook closure typecheck passed; two-file lint 0 errors/0 warnings; workflow/diff checks passed | [Types](unit/typecheck01/result.json), [Lint](unit/lint01/result.json), [Workflow](workflow-check.json) |

[Verification matrix](VERIFICATION-MATRIX.md) maps both calling styles, forged organization, foreign relation filters, search (English/French/SKU/barcode), active filters, sorting, pagination, empty results, current permission revocation/restoration and actual Prisma query-failure redaction. The test-only column fault was restored; this is read-action evidence, not a new application transaction guarantee.

Unit tests execute actual schemas/normalizer and hook queryFn with authority/service/useQuery mocks. Native runs actual action/RBAC/service/PostgreSQL with **Better Auth/Next transport stubs**. No signed-cookie HTTP, session expiry/revocation/signature, rendered/browser recovery, full build, provider/hosted or operator qualification is claimed. Those remain P04-V02 and broader gates.

## Isolation and recovery

Fresh local PostgreSQL 17 database stoquify_local_p04_r04_20261109_r1 at 127.0.0.1:55501; owned PID 22660 stopped cleanly, port released, clients empty. Source and migration hashes stayed unchanged. Synthetic data retained; prior R01/R02/R03 fixtures were not reset. Executed native test and baseline source are archived inertly with hash/relocation receipts. Repeat runs require fresh reviewed identities; retained exclusive-output recipes must not be blindly rerun.

Rollback only the owned imports/catch using the preserved baseline while preserving unrelated edits; unsafe action remains outside production admission if repair is reverted. Invalidate affected evidence after source changes. No commit/push, production data/schema/flag changes or deployment occurred.

## Remaining gates and next action

P04-R04 local completion closes the recorded sibling list-action disclosure only. P04-V01–V05 and P04-D01 remain open; R01 production-role/custodian/actual transport obligations, R02 original-owner/hosted/release limits, all production gates and deferred commitments remain unchanged.

**Next eligible package: P04-V02. Exact first action:** capture a fresh source/artifact scope and endpoint/browser matrix for actual Better Auth plugins/callbacks/implicit methods and private UI recovery. Define the isolated runtime and synthetic signed-session fixtures before running revoked/expired/permission-change requests and browser back/reload/stale-tab checks. Include UploadThing callback/signature/origin protocol scope and keep hosted-provider proof separate.
