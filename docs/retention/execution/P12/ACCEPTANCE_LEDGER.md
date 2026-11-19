# P12 — Exact first-month acceptance ledger

20 October 2026 checkpoint rerun. **41 PASS, 1 PARTIAL**, within the stated preparation/fixture scopes. M0 remains PARTIAL. Original criterion wording and role owners are retained; role labels are not assigned people. Runtime results cited below are dated evidence, not new P12 executions. See [decision](DAY_30_CHECKPOINT.md), [freshness](review-2026-10-20/PREREQUISITE_FINGERPRINTS.json), [new evidence review](review-2026-10-20/REFRESH_REVIEW.json) and [prior ledger](review-2026-10-20/PRIOR_ACCEPTANCE_LEDGER.md).

## P01

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P01-A1: The baseline identifies the exact checkout and relevant local modifications without leaking secrets. | PASS | [Result](../P01/RESULT.md). Baseline and relevant local edits recorded; P12 refreshes source observation, not candidate approval. | Engineering/release |
| P01-A2: The pilot scope distinguishes proposed, confirmed, unsupported and unresolved entries; external approvals are not fabricated. | PASS | [Result](../P01/RESULT.md). Proposed/confirmed/unsupported/unresolved states explicit; D01-D14 open. | Product/programme |
| P01-A3: All 24 prompts and roadmap R01–R12 are accounted for in a dependency-aware register; no deployment or customer-readiness claim is made. | PASS | [Result](../P01/RESULT.md). 24-prompt/R01-R12 register exists; no deployment claim. | Programme |

## P02

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P02-A1: A repeated finalized operation counts once; a reversal is explicit; a failed or uncertain operation is not reported as completed. | PASS | [Result](../P02-P06-verification-2026-10-18/P02_DATABASE_VERIFICATION.md). 18 October: 65/65 mocked and 18/18 real PostgreSQL cases verify persisted counts, reversal/uncertainty, uniqueness, concurrency, snapshot and error propagation. U01 closed for the recorded reader/target; combined candidate remains U17. | Data/QA |
| P02-A2: Cross-tenant reads are denied; no sensitive customer/payroll/provider payload enters analytics. | PASS | [Result](../P02-P06-verification-2026-10-18/P02_DATABASE_VERIFICATION.md). Real persisted tenant/site, permission/module denials and scalar privacy checks passed. Session-subject/headers seam is disclosed; no complete cookie/session lifecycle claim. U01 closed. | Security/data/QA |
| P02-A3: Demo/jobs are excluded from human adoption; missing or immature observations never become inferred churn. | PASS | [Result](../P02-P06-verification-2026-10-18/P02_DATABASE_VERIFICATION.md). Pure cohort contract excludes known demo/test/jobs and returns UNKNOWN without human provenance/calendar/coverage. Actual human classification remains U02. | Data/product |
| P02-A4: One working measurement slice and documented remaining instrumentation exist, or a concrete architecture blocker is recorded without building a speculative warehouse. | PASS | [Result](../P02-P06-verification-2026-10-18/P02_DATABASE_VERIFICATION.md). Working bounded reader has real database evidence and documented remaining instrumentation. Human provenance/calendar/completeness remain UNKNOWN under U02/D12. | Data/engineering |

## P03

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P03-A1: Fixture source counts, quantities, values and control totals reconcile with no unexplained difference. | PASS | [Result](../P03/RESULT.md). Independent synthetic fixture controls reconcile; not a live opening. | QA/accountant |
| P03-A2: Tests expose a duplicated opening posting and a ledger imbalance rather than making the generated expected values mirror implementation. | PASS | [Result](../P03/RESULT.md). 48 fixture/import plus three selected inventory-boundary cases expose duplicate/imbalanced expectations. | QA/domain |
| P03-A3: The ownership map names existing services, missing paths and explicit reviewer requirements; it does not invent approved accounting mappings. | PASS | [Result](../P03/RESULT.md). Source-to-ledger ownership map and reviewer requirements explicit; mappings unapproved. | Domain/accountant |

## P04

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P04-A1: The trust matrix maps every pilot path to server authority and a specific denial case. | PARTIAL | [Result](../P04/RESULT.md). Trust matrix exists; U08–U15 remain. New accountant access/export composition and AF04 work have no completed retention-path qualification; inspect current integrated authority under U17 before consuming. | Security/domain/QA |
| P04-A2: Any changed authority boundary has focused regression evidence and no client-supplied tenant trust. | PASS | [Result](../P04/RESULT.md). Original bounded work has focused mocked regression evidence; P12 changes no authority. This is not current full-path certification. | Security/engineering |
| P04-A3: The recovery protocol identifies database, files and operational dependencies; the roadmap’s proposed 15-minute RPO/4-hour RTO are not reported as achieved. | PASS | [Result](../P04/RESULT.md). Recovery protocol covers DB/files/keys/queues; 15-minute RPO/4-hour RTO remain unmeasured. | SRE/platform |
| P04-A4: Missing deployment evidence is explicit and cannot unlock live onboarding. | PASS | [Result](../P04/RESULT.md). Missing deployed evidence explicit and cannot admit onboarding. | Programme/SRE |

## P05

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P05-A1: Identical replay produces one set of financial/stock effects and returns the original confirmed outcome. | PASS | [Result](../P05-P06-closure-2026-10-17/RESULT.md). Historical 9 lifecycle + 16 financial-commit cases remain bounded evidence; POS transaction source unchanged. Additive accountant schema drift is disclosed, not a current combined-candidate pass (U17). | POS/QA |
| P05-A2: Changed payload and unauthorized tenant/location attempts are rejected consistently. | PASS | [Result](../P05-P06-closure-2026-10-17/RESULT.md). Closure DB denial/idempotency evidence plus authenticated boundary; limited to recorded tenant/location fixture. | POS/security/QA |
| P05-A3: Uncertain state remains recoverable without duplicate sale or forced cart reset. | PASS | [Result](../P05-P06-closure-2026-10-17/RESULT.md). Actual lost-response/retry and later P08 cashier evidence retain original identity without extra effects. | POS/UX/QA |
| P05-A4: Mocks and actual transaction/concurrency evidence are reported separately; the zero-tax fixture does not certify tax behavior. | PASS | [Result](../P05-P06-closure-2026-10-17/RESULT.md). M/D/B and zero-tax limits explicitly separate. Broader envelope F02 remains untested. | QA/accountant |

## P06

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P06-A1: Replay into sale commit cannot double-post; changed payload/invalid authority is denied. | PASS | [Result](../P02-P06-verification-2026-10-18/P06_OPERATOR_REFRESH.md). Bounded historical economic replay proof (16 DB cases) plus 18 October current-source authenticated ingestion/retry/authority refresh. No new financial replay in that refresh; production replay disabled. U17 combined candidate qualification remains. | POS/security/QA |
| P06-A2: Restart/reconnect preserves pending operations on the tested device and makes unknown status visible. | PASS | [Result](../P02-P06-verification-2026-10-18/P06_OPERATOR_REFRESH.md). 18 October seven-step authenticated loss/reconnect/reload/retry journey and earlier 25-case isolated storage refresh establish retained identity/unknown state on the tested browser. F06 wider durability and U18 visual uncertainty remain. | POS/QA |
| P06-A3: Expired/revoked policy has a defined operator path; no silent drop or false paid state. | PASS | [Result](../P02-P06-verification-2026-10-18/P06_OPERATOR_REFRESH.md). 18 October actual expired/revoked conflicts remain retained with disabled send and manager guidance; acknowledgement is not paid. F04 closed; F05 renewal/correction/production enablement remains excluded. | POS/security/UX |
| P06-A4: Supported envelope and untested combinations are documented. | PASS | [Result](../P02-P06-verification-2026-10-18/P06_OPERATOR_REFRESH.md). Loaded Chromium, fixture-generated signatures, current-browser-only visibility and excluded production capture/offline boot clearly documented. | Product/QA |

## P07

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P07-A1: A user can import synthetic masters and see the exact remaining opening-position steps. | PASS | [Result](../P07-media-2026-10-18/RESULT.md). Media closure complete synthetic customer/supplier/two-item journey and remaining opening steps; current owned hashes match. | Onboarding/QA |
| P07-A2: Masters success does not mark opening stock, AR/AP or accounting complete. | PASS | [Result](../P07-media-2026-10-18/RESULT.md). Masters success retains stock/AR/AP/accounting blockers; no opening writes. | Onboarding/accountant |
| P07-A3: Wrong-tenant and unauthorized/reviewer-self-approval attempts are denied according to current controls. | PASS | [Result](../P07-media-2026-10-18/RESULT.md). 107 mocked + 12 real-DB and independent-checker/tenant/media browser checks; no media ownership bypass. | Onboarding/security/QA |
| P07-A4: FR/EN and loading/empty/error/recovery states are usable in the tested view. | PASS | [Result](../P07-media-2026-10-18/RESULT.md). Bounded EN/FR states and journey recorded in media closure. U05 actual provider upload/durable-read success remains separate. | UX/QA |

## P08

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P08-A1: Cashier can find and execute the supported recovery action without losing the operation identity. | PASS | [Result](../P08/RESULT.md). Recorded cashier original-identity recovery, keyboard acknowledgement and DB effects; two owned hashes match and 119/120 selected dependencies match (schema differs). No current full-schema runtime claim. | POS/UX/QA |
| P08-A2: Manager can trace a discrepancy to its source and next permitted action; source unavailability is explicit. | PASS | [Result](../P08/RESULT.md). Source navigation/next permitted action and unavailable-source state verified. Not completed discrepancy resolution (U04). | Dashboard/UX/QA |
| P08-A3: No unauthorized action is exposed by optimistic UI; all mutations remain server-authorized. | PASS | [Result](../P08/RESULT.md). 201-case focused regression evidence and current admission preserved; not every-role live audit. | Security/UX/QA |
| P08-A4: Record actual FR/EN renderings, keyboard/focus and representative viewport behavior; list untested accessibility claims. | PASS | [Result](../P08/RESULT.md). Recorded EN/FR keyboard/focus and declared viewport evidence; broad accessibility/customer claims excluded. | UX/QA |

## P09

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P09-A1: Every pilot data category is included, explicitly excluded with reason, or a named blocker. | PASS | [Result](../P09/RESULT.md). 20-category contract names scope/omissions/blockers. | Data/export/security |
| P09-A2: The independent fixture check detects omitted referenced evidence and mismatched totals/hashes. | PASS | [Result](../P09/RESULT.md). 47 pure cases include independent missing-reference and hash/total detection. | QA/export |
| P09-A3: Secrets and access tokens are excluded; customer-owned sensitive fields require explicit authorized archive scope. | PASS | [Result](../P09/RESULT.md). Secret/token exclusions and sensitive archive approval explicit; real extraction not implemented. | Data/privacy/security |
| P09-A4: Current AP row/size limits and redacted reports are recorded as implementation constraints, not retention benefits. | PASS | [Result](../P09/RESULT.md). Existing AP caps/redactions retained as constraints, not customer lock-in benefits. | Export/domain |

## P10

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P10-A1: Each lifecycle transition has an owner, trigger, business effect, data-access effect and recovery path. | PASS | [Result](../P10/RESULT.md). 11 proposed transitions/17 scenarios with role, trigger, effect/access and recovery; people not assigned. | Commercial/product/support |
| P10-A2: Cancellation does not require feedback and does not intentionally trap data. | PASS | [Result](../P10/RESULT.md). Proposed cancellation requires no feedback; no trapping recommendation. No deployed cancellation flow asserted. | Commercial/data |
| P10-A3: Read-only/export policy and unsupported stop behavior have explicit resolutions or blockers. | PASS | [Result](../P10/RESULT.md). Retained-read/export and unsupported-stop blockers explicit; P10 D3/D4/D5 not resolved by tests. | Module/security/data |
| P10-A4: Policies and prices awaiting owner/legal review are clearly proposed; no inferred approval appears in UI or code. | PASS | [Result](../P10/RESULT.md). Terms/prices/support proposals clearly unapproved; 30 mocked cases do not approve policy. | Commercial/legal |

## P11

| Item and original criterion | Status | Evidence / remaining condition | Accountable role |
|---|---|---|---|
| P11-A1: Implemented, tested, expert-reviewed and live-supported statuses remain separate for every capability. | PASS | [Result](../P11/RESULT.md). 13-capability matrix separates source/tests/review/live support. | Country/domain/QA |
| P11-A2: Accounting regime and national obligations are unresolved until appropriate review exists. | PASS | [Result](../P11/RESULT.md). E01-E10 and C01-C12 retain regime/rule/reviewer gaps. | Qualified accountant/country |
| P11-A3: Generic HMAC ingestion is not labeled a native live connector; sandbox is not labeled production. | PASS | [Result](../P11/RESULT.md). Generic HMAC and sandbox separated from native/live connector. | Integration/security |
| P11-A4: The packet names missing inputs and owners without contacting providers, authorities or customers. | PASS | [Result](../P11/RESULT.md). Missing inputs/role owners explicit; no customer/provider/authority contact. | Programme/country/integration |

