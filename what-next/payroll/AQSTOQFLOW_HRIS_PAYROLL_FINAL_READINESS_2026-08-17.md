# AqStoqFlow HRIS/payroll final readiness — 2026-08-17

Skill: `aqstoqflow-hris-payroll-18-final-readiness`

- Development continuation: **GO WITH LIMITATIONS**
- Synthetic integration / no-legal-effect sandbox: **CONDITIONAL**
- Production-like testing with real employee data, money, or credentials: **NO-GO**
- Unrestricted production: **NO-GO**
- Earliest failing prerequisite: `aqstoqflow-hris-payroll-12-country-pack-provenance`

## Decision

HRIS/payroll engineering may continue with synthetic or approved anonymized data while production flags, real disbursement, legally effective declarations, authority calls, and production tenant writes remain disabled. The current code-level ratchets support continued development, but neither the current administrative names nor the supplied `Production authorization: YES` value substitutes for artifact-bound qualified review and independent signatures.

## Live evidence replay

| Gate | Current result | Production meaning |
|---|---|---|
| Prisma schema validation | `PASS` | Schema parses; no deployment proof |
| TypeScript typecheck | `PASS` | Current dirty tree typechecks; not a frozen build |
| Service boundary | `PASS`, 0 active / 13 allowed test findings | UI/actions do not become direct persistence owners in the scanned surface |
| Payroll presence | `PASS`, 13/13 | Development control presence only |
| Statutory development | `PASS`, 11/11 | Synthetic development/sandbox only |
| Statutory integration | `PASS`, 9/9 | Core fail-closed integration; no production activation |
| Qualified-review preflight | `BLOCKED`, 4/12 | Eight genuine reviewer/signature conditions absent |
| Statutory production | `BLOCKED`, 11/12 | `source_artifact_expert_approval` absent |
| Payroll payments/declarations development | `PASS`, 9/9 | No live payments or legally effective declarations |
| Payroll accounting-close development | `PASS`, 10/10 | Synthetic close only |
| HRIS/payroll migration development | `PASS`, 11/11 | Dry-run only; mutation and owner signoff disabled |
| Payroll immutability runtime | `PASS_WITH_LIMITATIONS` | Isolated non-production PostgreSQL proof; production database unverified |
| Enterprise release | `BLOCKED`, 3/12 ready | Production activation unauthorized |

Focused Jest replay was attempted with explicit paths and `--no-cache`, but three processes produced no result within the bounded window and were interrupted. This is recorded as `NOT_TESTED` for the current candidate, not as a pass. Existing earlier focused-suite reports remain historical supporting evidence only.

## Production requirements by HRIS/payroll slice

| Slice | Development state | Production gap | Accountable owner |
|---|---|---|---|
| Employee identity and lifecycle | Implemented/tested locally | Production tenant identity, duplicate, joiner/mover/leaver, retention and cross-tenant proof | HRIS product owner + security/privacy |
| Organization and manager scope | Implemented/tested locally | Production organization hierarchy and delegated-manager negative proof | HRIS owner + IAM owner |
| Contracts and compensation | Approval patterns present | Signed contract provenance, production maker-checker, effective-date and retroactivity review | HR + payroll controller |
| Documents and redaction | Local controls present | Retention schedule, lawful access, deletion/legal-hold policy, production export review | DPO/privacy + HR records owner |
| Time, leave, attendance | Development gate present | Cameroon policy/calendar review, device/source integrity and production correction workflow | HR operations + qualified labor/payroll reviewer |
| Input readiness and snapshots | Service-owned controls present | Current production-like dataset replay and snapshot/correction concurrency evidence | Payroll engineering + controller |
| Payroll calculation and payslips | Deterministic local proof exists | Qualified country-pack approval, golden tie-outs, effective-date breadth and production data validation | Qualified reviewer + payroll controller |
| Payments and declarations | Development 9/9 | Certified provider/authority adapters, credentials, callback trust, settlement and filing response evidence | Treasury/payroll ops + compliance + security |
| Accounting and close | Development 10/10 | Production postings, register-to-ledger tie-out, close blockers and signed close evidence | Controller + close assurance |
| Self-service | Local RBAC/redaction/browser evidence exists | Production IdP, entitlement, accessibility, privacy, secure export and supported-browser evidence | IAM + accessibility + privacy |
| Migration/backfill | Synthetic 11/11 | Current tenant inventory, stable dry-run rerun, correction-only rollback, reconciliation and owner signature | Tenant owner + HRIS migration lead + checker |
| Operations | Runbook exists | Managed secrets, monitoring, alert ownership, DR rehearsal, capacity, support and incident exercises | SRE/release owner |

## Ownership contract

- HRIS is the only writer of employee identity, employment, contract, compensation, document, payment-destination, attendance, leave and workforce source facts.
- Payroll consumes certified HRIS snapshots and owns calculations, runs, payslips, correction runs, payroll registers, payment batches and declaration records.
- Country packs own statutory meaning, provenance, reviewed parameters, effective dates, fixture expectations and authority capability state.
- Accounting owns journals, posting, source links, periods, ledger balances and close evidence.
- Reconciliation owns provider/statement matching, suspense, exceptions, settlement truth and reconciliation certificates.
- Dashboards, actions, exports and AI assistants are consumers; none may invent financial, payroll, employee, compliance or settlement truth.

## Stop conditions

Stop promotion on any cross-tenant access; missing entitlement/RBAC/fresh-auth enforcement; unredacted employee or payment evidence; payroll calculation without a certified snapshot; post-finalization mutation; unreviewed statutory logic; real provider/authority use without certification; unreconciled payroll payment; unsigned tenant migration; or missing authenticated browser/operations evidence.

## Required production closure sequence

1. Complete and independently verify the Cameroon qualified-review packet; pass preflight 12/12 and production country-pack 12/12.
2. Certify one provider/payment rail and one authority declaration flow with sandbox conformance, signed callbacks, replay tests, settlement/response evidence and maker-checker release.
3. Rerun payroll payments/declarations and accounting-close assurance against the approved provenance and provider/authority evidence.
4. Execute a current production-shaped tenant dry run, stable rerun, correction-only rollback simulation and signed owner acceptance.
5. Run authenticated EN/FR supported-browser, keyboard, screen-reader, RBAC-negative, tenant-negative, export-redaction and accessibility evidence against the frozen candidate.
6. Close managed secrets, observability, DR, incident, support and release-governance gates; then rerun this final-readiness skill.

Final disposition: **development may continue inside the stated boundary; production remains NO-GO.**
