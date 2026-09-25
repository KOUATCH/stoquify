# Terminal stale-edit review and scoped reads

2026-09-13. The previous goal turn made verified progress; this batch continues the full-platform assignment using `007-aqstoqflow-pos-ledger-controls`. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Unrelated changes preserved. No whole-workflow or release certification.

## Finding, contract and correction

Current terminal service, actions, hooks and form were inspected again. The before PostgreSQL verifier (`40cb94`) loaded two snapshots, saved operator A's change and then saved operator B's stale form. B silently overwrote A. Serializable transactions alone cannot distinguish a previously loaded form from current intent.

Terminal read rows now contain a server-computed configuration revision, derived from the station's identity, editable fields, session link and update time. Updates require the displayed revision in both the action schema and domain service. The transaction compares it with current records before writes. Missing/stale revisions reject; two simultaneous submissions of one revision cannot both succeed. This marker is a version, not an entitlement, signature or approval. Existing permissions, organization checks and domain restrictions still apply.

The form retains rejected inputs and offers **Review latest configuration**. A fresh authorized read supplies the current row. The comparison displays current and proposed values for every editable field. Explicitly changed fields remain in the draft; newer values in untouched fields are carried forward. Accepting this comparison updates the draft's base version only. The separate save revalidates the revision and current domain controls. A further change can therefore reject again safely. Invalid names/lengths receive validation guidance rather than an incorrect stale-form message.

Terminal management reads now reuse the existing POS scoped-read hook. Read actions return the server organization/actor; cache keys include both; mismatched or failed responses are withheld. Current permissions guard forced refetch as well as normal reads. Actor/tenant changes reset local workspace state; a same-actor temporary permission refresh does not discard the local draft. Retry after denial refreshes permissions before reads resume.

## Verification

Commands use bundled Node `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, from the repository. The inspected default build remains migration-bearing and was not executed.

- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-terminal-revision-v126.cjs`: before reproduction passed (`40cb94`), report `lanes/environment/terminal-revision-v126-before-d3404f5d-9441-4f7f-accb-851216f0c9b6.json`.
- Same script `--after`: passed (`a909a6`), report `lanes/environment/terminal-revision-v126-after-abf9b5b7-65f2-4cc7-822d-b64c4e1c5842.json`. Actual PostgreSQL stale/missing-revision denial, reviewed update success and exactly one successful same-revision concurrent edit. No payments or journals.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath actions/pos/__tests__/terminal-management.actions.test.ts hooks/posHooks/__tests__/terminal-errors.test.ts hooks/posHooks/__tests__/terminal-read-scope.test.tsx hooks/posHooks/__tests__/pos-read-scope.test.tsx components/pos/__tests__/terminal-draft.test.ts`: 24 tests / five suites passed (`a24792`). Covers revision forwarding/validation, actor changes, cache revocation, forced reads, response scope and three-way draft merging.
- Eleven changed TypeScript files passed `node_modules/eslint/bin/eslint.js` (`e323c7`). Final typecheck and browser receipts are appended below.
- Initial test run failed (`8f93b3`): the new read-hook import needed a permission mock in the isolated copy test; action expectations needed scope and revision. Those contracts were strengthened, not bypassed. Initial typecheck failed (`ffabff`) because the display label is `location` while the draft key is `locationId`; the mapping was corrected. Intermediate typecheck then passed (`579975`).
- Initial actual EN/FR stale-review browser run passed (`e6cb1e`), report `lanes/environment/terminal-review-browser-v126-3fa2ef86-d89c-4e67-807d-b5f494289d49.json`: retained draft, no write during review, preservation of the other update's terminal number, explicit reviewed save and six responsive screenshots. The French mobile comparison was visually inspected. Development readiness EN19,586ms/FR6,809ms; no performance certification. The expanded final run adds invalid-input and real role-revocation/restoration checks.

Runtime: owned local database `stoquify_local_registration_20260906_01` and app `http://127.0.0.1:3110`. Fixture provenance is checked; external traffic is fenced. Browser uses real credential login and server actions. A competing operator is represented by an actual service update between browser form load and submission, not a second authenticated browser. The separate concurrent-service verifier establishes the database conflict behavior.

## User and operator guide

Open `/en/dashboard/settings/terminals` or `/fr/dashboard/settings/terminals`. Organization administrators supply current read/edit authority and the valid location list. Operators supply the intended terminal configuration. The application supplies the version automatically; nobody needs to find, sign or paste a hash.

If another change intervenes, your draft stays visible. Choose **Review latest configuration / Vérifier la configuration actuelle**, compare current and proposed values, then choose **Use this reviewed version / Utiliser cette version vérifiée** if the comparison represents your intent. Adjust any fields as needed and save separately. Review itself changes no terminal record. Repeating a stale submission cannot override the newer record.

For invalid details, use a name of 1–100 characters, an organization location and a terminal number no longer than 40 characters. For an active shift or historical-location restriction, use the ordinary shift/terminal process described in `TERMINAL_EDIT_V125.md`. If permissions were removed, an organization administrator must restore the appropriate rights; retry cannot grant them. After restoration, retry reloads current authority and data.

## Rollout and compatibility

No database schema, migration or backfill. Deploy the read model, required update schema, actions and UI together through the existing authorized release process. Older forms without a revision must reload; do not make the revision optional to accommodate stale clients. Existing historical verification scripts written before v126 omit the new required argument and are historical evidence, not current passing checks. No live customer activation, production deployment, purchase, external message or X1 clearance.

If rolling back, restore a coherent application version; rolling back the revision check reintroduces the demonstrated overwrite. Contain terminal editing if an operational rollback requires older code. No claim of database migration rollback is needed because no schema changed.

## Review accountability and remaining work

| Responsibility | Current evidence or limitation |
| --- | --- |
| Architecture/backend/API/distributed systems | Required revision connects read → retained draft → fresh comparison → save; concurrent writers checked. |
| Database/integrity | Actual PostgreSQL before/after and same-version concurrency; v125 terminal/drawer transaction remains intact. |
| IAM/privacy/fraud | Current permission, tenant/actor response binding and cache partitioning; revision is not authority. Full module/read-only coverage remains open. |
| Frontend/design/EN-FR/workflow/accessibility | Existing dark dashboard form, error, review and button patterns reused. Explicit comparison avoids silently overwriting untouched values; native screen-reader, full keyboard loop/focus return and zoom remain unverified. |
| Product/operations/support | Operator retains work and can inspect conflicts; input sources and owners described above. No invented efficiency metric. |
| Finance/controls/records | No payments/postings. Existing terminal/location/active-shift history constraints retained; no financial assurance claim. |
| QA/SRE/release | Focused tests and real browser/database evidence; variable development loading and full release requirements remain open. |
| SaaS/modules | No pricing or entitlement changes. Existing management observe/read-only policy needs its own complete review. |
| POS/offline/events/providers | Online terminal configuration only. Offline and unknown-outcome sale effects remain outside this batch's evidence. |
| Statutory/country, purchasing/AP, HRIS/payroll, analytics and AI/agents | Not applicable to changed configuration behavior; still part of the full-platform scope. |

Remaining work includes complete module/read-only and operation-role consistency, archive preview-version binding, terminal creation/history and all remaining platform workflows. Revision and cache checks alone do not certify an entire workflow.

## Final verification and retained attempts

Final typecheck `node_modules/typescript/bin/tsc --noEmit --pretty false` passed (`be6573`); eleven-file lint passed (`e323c7`). Source inventory `evidence/source-baseline-v126.json` was captured at 2026-09-13T13:20:19.142Z (`5cee8c`). It inventories 2,882 files, including 1,021 tests; this is not a count of verified workflows.

Expanded browser attempts `terminal-review-browser-v126-48a23b0f-d538-4faf-a844-f4431fd61bff.json` (`a2c763`) and `terminal-review-browser-v126-fc79dacb-d121-4241-9d9d-817f66c7ab18.json` (`4caf57`) completed the English invalid-input/review/save assertions but timed out waiting for the expected revocation view. The first dispatched a non-bubbling visibility event on document, while the inspected query library listens on window. Changing only that target did not resolve the second attempt; its visibility/refetch timing was not established, so no product root cause is claimed from that timeout.

Final browser passed (`8f5b81`), `lanes/environment/terminal-review-browser-v126-6bd4e9f4-0e36-4e75-9bcb-395546aec60d.json`. The verifier confirms the current server permission response after revocation, brings the page to the foreground, checks visible document state and triggers the actual window visibility listener. In both EN/FR, terminal data disappears after that refresh; restoring the owned role and using retry recovers it. This establishes refreshed authority/display recovery, not instantaneous push revocation or a real user switching browser tabs. The server guard remains responsible for current operation authorization.

The same final run verifies localized invalid-name guidance, stale-write rejection, retained draft, no database change during comparison, explicit reviewed save preserving the newer terminal number, and Enter-key save. Six screenshots cover 1440/768/320 widths; horizontal reflow was checked and the final French 320px comparison inspected. No page errors; no payment/journal; all seven production source hashes stable. Final development readiness EN5,100ms/FR4,843ms is a local observation, not a comparable speedup or approved latency result.

Detailed denied/failed-read body copy, full screen-reader/focus-return/zoom coverage and all boundaries listed above remain review work. Current permission-denied recovery is verified even though those broader UX checks are incomplete.
