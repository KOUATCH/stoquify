# X1 local evidence and approval handoff

Prepared 2026-09-05. Product approval and authorization for release evidence remain pending.

The completed local authenticated run `LOCAL-X1-20260905093056` passed 43 Playwright checks, including aggregation of 42 screenshots. It covers seven finance/accounting routes in English and French on desktop, tablet, and mobile. The regression test run for route observation passed 13 tests. The local application process was stopped after capture.

## Captured scope

Database: `stoquify_replay_next_20260830`. Tenant: `rds_org_001`. Foreign tenant probe: `rds_org_002`. Persona: Carine Manga, `external_accountant`, user `rds_org_001_compliance_user_external_accountant`. These identifiers describe the fixture scope; the approval record must authorize any release evidence use.

Source: `what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260905093056/manifest.local-simulation.json`. Aggregation timestamp: `2026-09-05T09:41:56.194Z`. Classification: `LOCAL_SIMULATION_AUTHENTICATED_EVIDENCE_NOT_FOR_RELEASE`. All artifacts retain `approvedForReleaseEvidence: false`.

| Viewport | Locale | Screenshots | Observed useful result time in ms | Maximum rendered rows |
| --- | --- | ---: | --- | ---: |
| desktop | en | 7 | 4973 to 32455 | 35 |
| desktop | fr | 7 | 4453 to 12537 | 35 |
| tablet | en | 7 | 3934 to 9585 | 35 |
| tablet | fr | 7 | 4025 to 9261 | 35 |
| mobile | en | 7 | 2467 to 8363 | 35 |
| mobile | fr | 7 | 2474 to 25883 | 35 |

These are observed development-server route times. Each cell contains seven different routes, not repeated samples for one performance signal. The table does not establish p75 budget acceptance, server-filter latency, cached page navigation, export duration, or scale-tier performance.

## Corrections represented in this package

- The cash-flow view, location, and period controls have localized accessible names.
- Scroll areas can receive keyboard focus.
- Mobile history cards carry row markers recognized by the evidence observer.
- The regression test covers mobile cards when desktop rows are hidden.

The first full run failed on missing control names, scroll-region focus, and mobile-row observation. The corrected run above covers all 42 combinations. The automated checks are limited to what the harness tests; independent review and any remaining performance work still apply.

## Material presented for the next product decision

Form: `docs/X1/X1_PRODUCT_PERFORMANCE_APPROVAL_FOR_SIGNATURE_2026-09-05.docx`.

Review bundle: `docs/X1/X1_PRODUCT_APPROVAL_REVIEW_BUNDLE_2026-09-05.zip`. SHA-256: `7f662d12912865564abcbd9600e52c7a0a13ce5d25a7a8016a576aa997945cf8`.

Contract URI: `repository://stoquify/docs/X1/X1_CONTRACT_ARTIFACT_MANIFEST_2026-09-05.json`. Manifest SHA-256: `54660e27a4813556a944adc3a58cf68c00c06dee4356bf2958d438a94fae8601`.

The September 3 form and bundle are retained. That form has an incomplete decision without a registered approval ID or verifiable signature; it does not authorize this revised code. Its proposed 900-day validity is carried forward for the approver to confirm or revise. The new form leaves decision, signature, appointment reference, and real signing timestamp for the authorized person.

## Inputs and next actions

The refreshed read-only readiness report at `2026-09-05T09:47:04.286Z` found all 21 checked artifact hashes valid, retrieved the exact isolated database context, and found zero X1 activation packages. Its 22 remaining findings concern approval configuration and the unsigned delegation. The standard capture preflight at `2026-09-05T09:47:32.027Z` reports three prerequisites: traceable approvals, a new run ID, and an approved storage-state path. A run ID can be generated automatically once the authorized capture is scheduled; the existing local storage state is not, by itself, evidence of release authorization.

Current readiness register: `what-next/evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-09-05.md`.

| Item | Current status | Next action |
| --- | --- | --- |
| Local EN/FR capture | Complete for 42 combinations | Retain the local manifest and screenshots under their original timestamps. |
| Current contract package | Refreshed | Review and sign the September 5 package. |
| Product decision | Pending | Supply the decision, registered approval ID, actual signed timestamp, and signature reference. |
| Evidence authorization | Pending | Supply the security decision, credential approval ID, seeded-data approval ID, actual signed timestamp, and signature reference. |
| Approval automation | Requires configured authority and provider | Use the existing local profile for development; supply recognized approval records before release binding. |
| Release evidence | Pending authorization | Capture a new run after both effective approval timestamps; never relabel or backdate the local screenshots. |
| Performance acceptance | Not demonstrated by the route matrix | Evaluate the agreed signals and dataset scope with the approved measurement method. |

The nine human fields remain in `docs/X1/X1_FINANCE_ACCOUNTING_APPROVAL_INTAKE_PREFILLED_2026-09-01.docx`. IDs and timestamps must come from the recognized approval process. Automation can transfer issued values after they exist.
