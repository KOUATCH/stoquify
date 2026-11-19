# AF11 — Capability and evidence matrix

**Date:** 20 October 2026. These controls supplement the existing live authority and module gates; a firm assignment is never client consent.

| Operation | Current permission / authority | Additional controls |
|---|---|---|
| Read ordinary register | `accounting.close.read`; current client-local role or eligible named mandate with AF04 engagement/assignment restrictions | Live session; home accounting and client Close module admission; bounded client/period scope |
| Create/revise applicability, operational date, evidence or owner | `accounting.close.finding.comment` plus Close read; eligible preparation/review mandate | Fresh current source hash, exact expected version, reason, tenant-bound period/evidence, idempotency; self-claim only |
| Review / request changes | `accounting.close.accountant.review` plus Close read; eligible managed review capability | Current password assurance within five minutes; different actor from the latest preparation; exact retained terms and evidence hash |
| Include or attach payroll evidence | Above controls plus current client-local `payroll.reports.read` and payroll module read | Firm mandates alone are denied even if their role claims payroll permission. No employee amounts, raw payloads, receipt hashes, private evidence notes or employee identities are returned |
| Publish a statutory definition | Not exposed by AF11 | Qualified country review and current official provenance are missing; no legal-deadline input is accepted |
| Submit a declaration / execute an adapter | Not exposed by AF11 | No call to a filing, payment, payroll-transition or authority adapter writer |
| Delete or rewrite history | Denied | SQL retention trigger blocks UPDATE/DELETE; client deletion is restricted while revisions exist |

## Evidence meaning

| Display | Meaning | Does not mean |
|---|---|---|
| UNKNOWN | Applicability unknown, country source changed, or regulatory coverage unreviewed/expired/unsupported | Zero risk or no obligation |
| NOT_APPLICABLE | Recorded operational applicability decision on a current source | Qualified statutory exemption |
| OVERDUE | Applicable operational task has passed its target date without current reviewed evidence | A calculated legal penalty or tax default |
| FULFILLED_WITH_EVIDENCE | Current operational collection task has an independently reviewed retained artifact | Certified Close run, correct national declaration, or accepted live filing |
| MANUAL_SUBMISSION / MANUAL_ACKNOWLEDGEMENT | Evidence already captured by the payroll domain, classified by its actual environment and transition | A live adapter transaction or independently verified regulator response |
| SANDBOX | Test-environment evidence | Production authority acceptance |
| UNVERIFIED_AUTHORITY | An unqualified environment/response reference | Production adapter execution |
| REDACTED | Payroll evidence is outside the current ordinary register scope | Missing evidence or permission to inspect payroll |

Deadline state is separate from compliance state: a regulatory candidate may be UNKNOWN and have an overdue operational follow-up target simultaneously. Revising a date preserves the earlier date and reason; it does not set a fulfillment or filing status.

## Rule-change and recovery tests

The focused pure lane tests source expiry at read time, unsupported countries, changed pack version/hash, unknown/overdue/not-applicable/fulfilled separation and rejected caller assertions. Real database tests cover source-country changes, stale versions, unavailable/voided artifacts, independent review, cross-client evidence, exact concurrent replay, competing edits, live role changes and suspension, payroll redaction, SQL retention, permission revocation while waiting and rollback on audit failure.

The browser journey uses real authentication and protected actions with synthetic actors. A response is deliberately lost after commit; exact retry must preserve the original revision. Password confirmation does not automatically execute the retained review. The detailed executed results are linked from [RESULT.md](RESULT.md).
