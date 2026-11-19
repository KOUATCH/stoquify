# HR-11 — Reviewed employee import

**Status: VERIFIED — bounded engineering scope.** Date: 2026-10-24. Dependency HR-10 owner hashes checked unchanged; its directory file intentionally gains this slice's import link. Next eligible slice: HR-12 under the user's authorized continuation.

Baseline HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886; dirty shared checkout retained in baseline-status.txt. No commit, production import, schema migration, live activation or deployment.

## Delivered

EN/FR /[locale]/dashboard/people/import is linked from People. It supports a versioned UTF-8 comma CSV with 1–200 nonblank rows, 256 KiB limit, six explicit fields and source-header mapping. All mapped values and every nonblank row outcome appear before confirmation. Blank physical records are explicitly ignored. Invalid UTF-8, malformed quotes, invalid dates/country-code format, formula cells, missing fields and duplicate identities fail visibly. Existing employee numbers, including retained numbers, never merge or overwrite.

Preview is server-issued and bound to version/source/mapping digest, creator, tenant and 24-hour expiry. Commit rechecks live pilot/account/manager authorization and duplicates under the existing profile organization lock, then calls the existing employee owner with createOnly in one transaction. Every imported person is DRAFT. No salary, linked account, bank destination, employment status or approved history can be imported through this template.

Commit receipts bind normalized recovery keys to source identity. Exact retries create no new employees, changed payloads conflict, and expiry does not strand a committed receipt. Receipt recovery waits for an in-flight transaction before deciding whether a committed outcome exists. A receipt from an older batch remains separate from the current preview, with batch/receipt references and source-row links to created employees. No generic undo deletes approved history.

Raw CSV is never stored server-side. Browser/session state holds source text; sessionStorage retains only the tenant-scoped last recovery key. Preview evidence retains digests/counts/error codes, not names or source values. Error download requires current fresh protected authorization and the same preview creator/tenant; it contains row/field/error only, uses shared spreadsheet escaping and expires after 24 hours. Minimal audit/commit evidence follows existing audit retention. The blank template has a fresh protected download. There is no stored-source download endpoint.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC01 200-person preview/commit reconciliation | PASS | Real PostgreSQL: total/accepted 200 before commit, 200 DRAFT after commit, exact row IDs and counts in receipt |
| AC02 replay and changed key payload | PASS | Concurrent identical requests produce one receipt/effect; retry reports created 0/unchanged 200; changed source conflicts; whitespace keys recover consistently |
| AC03 no missing bad/duplicate rows | PASS | Parser and DB rows preserve line numbers, errors/totals, duplicate occurrences; invalid preview commits zero; EN/FR correction flow |
| AC04 uncertain response/rollback recovery | PASS | Outer rollback leaves no drafts/receipt; same request later succeeds; in-flight reader waits; browser reload recovers retained receipt; no destructive undo |
| AC05 authorized source/error access and retention | PASS | No persisted source; fresh scoped download options and real denied/revoked/foreign access; browser error export excludes source values; explicit 24-hour preview/download expiry |

## Verification classes

- Source inspection: existing generic onboarding importer only supports customer/supplier/item domains. Reused the employee owner, business-event receipts and safeCsvValue; bounded strict HR CSV parsing does not alter those domains. Existing graph/source ownership was used for discovery, not runtime certification.
- Mocked/pure: **18/18**, parser and action suites, unit-r2.log. Action tests mock protect and verify server actor context, fresh-auth mismatch denial and explicit read/write module enforcement settings.
- Real PostgreSQL: **10/10 cases including one integrated browser case**, postgres-browser-r1.log. Includes 200 rows, parallel replay/distinct-key contention, atomic rollback, expiry, current authorization, whitespace key recovery and in-flight receipt recovery. Explicit owned loopback database only; cleanup asserts zero suite organizations.
- Browser: **8 results**: EN/FR complete preview→correct→commit→recover journeys with screenshots at 360/768/1440, plus EN/FR denied reader. Checks all interpreted values, invalid UTF-8 preservation, error CSV, receipt separation, row links, session reload recovery, keyboard/status focus, no horizontal overflow and no JS errors. Screenshots inspected. Harness uses actual React/project CSS and real services/PostgreSQL with a synthetic role cookie; full Next/BetterAuth, production module entitlement and screen-reader certification are not claimed.
- TypeScript: **0 diagnostics**, explicit roots/no emit, typecheck-r2.log. Workflow contract passes. New source formatted with repository-installed Prettier; no semantic changes after passing behavior checks. No schema change or additional broad regression run was needed: existing HR-10 source owners remain byte-for-byte unchanged.
- Providers, actual customer migration, qualified HR/legal approval and production activation: **NOT_RUN**, outside this slice.

## Review, ownership and rollout

Independent reviewer closed R1–R4; details in INDEPENDENT-REVIEW.md. Owned files are the new import parser/service/actions/UI/route, focused tests/config, directory navigation link and this evidence/register append. Manifest binds exact files and command artifacts. Other working-tree changes remain untouched.

Enable only an accepted pilot through the existing setup allowlist and existing HR management permission. Removing the entry/pilot availability prevents new guided imports without deleting employees, events or receipts. A failed transaction rolls back atomically; uncertain clients recover the receipt. Retain approved history and use source-owned correction workflows after commit.

Review lenses: architecture/backend/data/security/privacy/UX/product/QA/release/SRE/SaaS applied through ownership reuse, transaction/replay, current authority, bounded input, minimal retention, explicit reconciliation and scoped rollout. HR source-data controls retained. Statutory/ledger/provider/AI/POS/purchasing: not applicable; this slice creates only employee drafts and no legal rules, amounts, postings or payments.
