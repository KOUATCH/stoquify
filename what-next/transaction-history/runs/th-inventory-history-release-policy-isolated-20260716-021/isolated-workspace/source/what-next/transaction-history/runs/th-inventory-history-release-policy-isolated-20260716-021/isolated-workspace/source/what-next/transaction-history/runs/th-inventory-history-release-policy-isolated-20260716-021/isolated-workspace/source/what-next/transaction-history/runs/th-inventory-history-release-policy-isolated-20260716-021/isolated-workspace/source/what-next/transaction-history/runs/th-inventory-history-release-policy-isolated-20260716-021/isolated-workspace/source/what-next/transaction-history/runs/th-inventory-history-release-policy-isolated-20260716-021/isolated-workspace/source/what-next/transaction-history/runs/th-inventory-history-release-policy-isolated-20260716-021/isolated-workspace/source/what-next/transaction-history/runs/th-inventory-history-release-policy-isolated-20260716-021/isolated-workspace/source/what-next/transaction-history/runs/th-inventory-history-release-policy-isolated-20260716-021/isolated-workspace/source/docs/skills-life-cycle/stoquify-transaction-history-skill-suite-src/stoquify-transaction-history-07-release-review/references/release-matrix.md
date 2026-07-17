# Stage 07 Release Matrix

Evaluate every row for each active lane. A row is mandatory unless current source and prerequisite policy prove the behavior is outside that lane. Fresh current-run execution is required for a release `PASS`.

| Claim | Independent check | Passing evidence | Primary owner on defect |
|---|---|---|---|
| `TH07_CONTRACT_API` | Exercise direct route/action/API success, invalid input, denied input, detail, filter, summary, and error contracts; prove read paths have no workflow side effect. | Focused contract/integration tests pass with stable response and error semantics. | 04 for service/read contract; 06 for client transport; 01 if ownership is undefined |
| `TH07_TENANT` | Use two tenants and foreign IDs/cursors at table, detail, export, action, proof root, and supporting relations. | Generic denial, zero foreign fields, and no downstream call where entrypoint denial is required. | 02 |
| `TH07_RBAC` | Test missing auth, each table/drawer/export/action permission, direct invocation, aliases, wildcard roles, and missing/suspended/expired/dependency-incomplete modules. | Least-privilege denial occurs at the server boundary for every independently reachable operation. | 02 |
| `TH07_FRESH_AUTH` | Test missing, stale, and current freshness for designated sensitive reads, exports, overrides, approvals, signoff/certificates, and token revocation. | Missing/stale freshness denies before service access; current authorized freshness succeeds. | 02 |
| `TH07_REDACTION` | Compare role/subject outputs and logs for provider references, bank/payment destinations, supplier bank changes, customer credit/contact, salary/tax/social data, tokens, and private notes. | Values are removed/replaced server-side; proof reads are audited; logs and exports contain no raw sensitive value. | 02 |
| `TH07_ACCOUNTING` | Verify source links, signs, decimal/currency semantics, opening + movements = closing, subledger/control tie-out, correction/reversal behavior, posting/reconciliation state, and close blockers as applicable. | Exact expected entries/totals and period behavior pass at one knowledge cutoff; posted history is not edited in place. | 03 |
| `TH07_PAGINATION` | Traverse multiple pages with equal effective/recorded timestamps; reject malformed, modified, expired, cross-tenant, cross-surface, and filter-mismatched cursors. | Stable `(effectiveAt, recordedAt, id)` traversal has no duplicate or omission; cursor scope is enforced. | 04 for traversal; 02 for cursor authenticity/scope |
| `TH07_BACKDATED_INSERT` | Fetch page one, insert a newly recorded row with an older effective time beyond the frozen cutoff, finish traversal, then start a new traversal. | The row is absent from the frozen traversal, present exactly once in the new traversal, and totals/exports follow the same cutoff. | 04 |
| `TH07_EXPORT` | Export beyond the visible page with active filters; compare row identity, count, totals, cutoff, completeness, permissions, redaction, formula neutralization, limits, and audit events. | Full server-filtered export matches rows/summary at the same cutoff and leaks no unauthorized field. | 04 for completeness/parity; 02 for access/redaction/abuse |
| `TH07_TIMEZONE` | Test date-only half-open ranges, UTC-midnight edges, displayed effective versus recorded time, and DST transitions when the organization timezone observes them. | Server filters and UI formatting use the declared organization timezone without period drift. | 04 for query semantics; 05 for contract; 06 for rendering |
| `TH07_ACCESSIBILITY` | Run configured automated checks plus keyboard-only table/filter/drawer flows at 320px and desktop in EN/FR; verify focus trap/restore, announcements, names, text status, zoom, and no critical content loss. | No serious/critical automated issue; primary identity/value/status/action remain operable and drawer focus returns to its trigger. | 06; route a specification gap to 05 |
| `TH07_REGRESSION` | Run focused service/action/component/browser tests, then repository validation/build/test after focused checks pass. | No in-scope or repository regression and no unauthorized tracked-file change. | Root-cause stage; 06 owns integration regressions |
| `TH07_POLICY_GATES` | Run slice-relevant named gates and the final package policy ladder in an isolated verification environment. | Every applicable gate exits zero; warnings are classified and cannot hide a fail-mode result. | Route by gate: 02 security, 03 accounting, 04 read/export, 05 UX contract, 06 delivery, 00 artifact control |

## Package Command Ladder

Resolve actual focused test paths from current source; never use placeholders in evidence.

1. Run focused Jest tests with `npm test -- --runInBand <exact test paths>` and focused browser/API specs with `npm run test:e2e -- <exact project/spec arguments>`.
2. Run slice-relevant package gates: foundation/inventory uses `inventory:boundary:fail`, `api:guard:inventory:fail`, `report:trust:export:gate`, and `role:cockpit:gate`; cash/payment uses `payment:cash-truth:gate`, applicable offline/receipt gates, `report:trust:export:gate`, and `role:cockpit:gate`; AP/AR uses `purchasing:ap:gate`, `ledger:close-truth:gate`, `report:trust:export:gate`, and `role:cockpit:gate`.
3. After focused and named gates pass, run `npm run verify:repo`. Its `prisma:validate`, typecheck, lint, full policy-gate, build, and test results are the final repository regression evidence.

Do not run `build`, `verify:ci`, migration deploy/reset, seeding, or release-environment commands against shared or production state. If fixed gate outputs overlap concurrent work, use an isolated checkout or return `BLOCKED`.

## Defect Routing

For each failure record `defectId`, claim, lane, severity, expected, observed, reproduction command, log/evidence paths, owner stage, invalidated stages, and rerun criteria. Route artifact/checksum/eligibility defects to Stage 00; security/privacy to 02; accounting/control to 03; read-model/pagination/export-data to 04; UX contract gaps to 05; and implementation/accessibility/regression defects to 06. Route to 01 only when the authoritative owner or boundary itself is undefined. Stage 07 never patches or approves the remediation.
