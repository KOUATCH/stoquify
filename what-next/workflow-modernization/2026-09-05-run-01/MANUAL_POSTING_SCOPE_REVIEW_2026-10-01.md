# Manual journal posting — scope and contention review

Evidence date: 2026-10-01. This is a read-only design review of the existing source contract. The proposed all-period posting helper was rejected by automatic approval review because of its contention/availability impact and insufficiently specific implementation evidence. This document supports a concrete local-code review; it does not override that rejection, authorize database execution, or establish deployment readiness. The coordinator owns any candidate proof and single narrowed retry. Local source edits are reversible; this review performs no financial operation, migration, seed or deployment.

## Why the affected evidence scope is tenant-wide

This dependency is present in retained Close records and exported packs, not only a diagnostic dashboard:

1. `services/accounting/close-assurance.service.ts:1578` obtains `getTenantOperatingSnapshot` for the selected Close period. `payrollForecastEvidence` at line 846 retains the complete snapshot's `sourceHash` in metadata at line 905 and in `CloseEvidenceItem.sourceId/sourceHash` at lines 917/920. The evidence list includes this item at line 2170. Finalization persists its metadata in `CloseRun.metadata.payrollFinanceForecastProof` at line 2484 and its source hash in the evidence row at line 2584.
2. `services/snapshots/tenant-operating-snapshot.service.ts:450` reads the most recently updated journal with `where: { organizationId }`. It has **no entry-date or status predicate**: DRAFT, POSTED and REVERSED rows can supply the timestamp. The separate posted-journal count at line 400 does filter POSTED and period dates; that does not narrow the timestamp query.
3. The latest accounting source-link query at `tenant-operating-snapshot.service.ts:455` also filters only the organization, with no source-date filter. Lines 652–665 include the journal timestamp and source-link creation time in `sourceMaxUpdatedAt`.
4. `services/snapshots/snapshot-utils.ts:157` hashes `freshness.sourceMaxUpdatedAt` along with the snapshot scope, metrics and other source inputs. Posting updates a journal and creates its source link, so it can change that retained hash for an earlier, later or overlapping Close period. It need not change a forecast amount. A newer unrelated source timestamp can temporarily mask this particular timestamp change; that does not remove the dependency.
5. `services/accounting/close-assurance-pack.service.ts:771` preserves the saved proof's source hash. The pack payload includes it as `annexes.payrollFinanceForecast.saved` at line 1601 and retains the evidence list. Thus retaining an old Close result as current after posting can retain obsolete proof even when its trial balance is unchanged.

The narrower financial dependencies also remain: period preflight and ledger totals use the journal's period; operating posted counts/source-link counts use date overlap; `services/inventory/inventory-reconciliation.service.ts:421` selects class-3 posted/reversed lines, and lines 448–460 include opening/closing/orphan balances cumulatively through each period end. A class-3 manual post can additionally create a genuine inventory orphan or tie-out failure. It must not be made READY merely to demonstrate recovery.

Graph locators corroborate the relationship, but current source controls this conclusion: `ordered-code-graph.json` node `accounting_posting_service_postjournalentry`, community 3; `accounting_posting_service_linkaccountingsource`, community 7; and `graph_actions.json` node `accounting_journals_actions_postjournalentryaction`, community 38. Their stored line numbers are historical.

## Alternatives and the minimum compatible boundary

| Option | Consequence under current source |
| --- | --- |
| Lock only the journal period/date overlaps, adding later periods only for class 3 | Leaves the retained whole-snapshot proof in other Close periods uncoordinated. This is a known correctness gap, not equivalent coverage. |
| Lock only periods with currently discovered eligible Close runs | A new assessment can publish in another existing period between discovery and posting. An empty current run set does not mean no affected publication. |
| Remove or narrow the global timestamp/hash from payroll proof | Potentially a better long-term dependency contract, but changes existing proof identity, collection receipts and exported provenance. It requires separately reviewed source semantics, compatibility/history handling and consumer verification; silently changing the hash to avoid locking would discard a current dependency. |
| Use one new tenant-wide lock | Existing assessment creators/certifiers do not acquire it. It works only after migrating those readers too, expanding this posting-only correction. |
| Coordinate all existing periods of the same tenant using current catalog/assessment locks | Matches the retained evidence contract and current creator/certifier protocol. It serializes more work and requires measured capacity before rollout. This is the proposed bounded implementation, subject to approval and verification. |

The compatible sequence is: explicit Read Committed owner transaction; shared tenant catalog lock before period/source locks; tenant-filtered manual journal row lock and a fresh DRAFT read; the existing OPEN posting-period row SHARE check; one tenant-filtered period-ID query; sorted, deduplicated existing assessment locks; current trusted authority/freshness check after waits; existing financial effects; then exact-scope invalidation using the same period IDs. No financial values, journal lines or existing source records should be rewritten by preparation. A competing post must reread the winner's state and refuse a second effect.

The catalog lock shares the existing `accounting-period-catalog` tenant key. Fiscal-period creation takes its exclusive counterpart, preventing membership from appearing after discovery. Assessment locks use the existing `close-assessment-order` tenant/period keys. `lockCloseAssessmentPeriodsInTx` already sorts/deduplicates and issues one advisory-lock query per period; the proposal adds no additional per-period query beyond that helper. Current-source Read Committed reads after waits are essential: a held lock does not refresh a Repeatable Read/Serializable snapshot.

`getOpenPeriodForDate` holds a period row SHARE lock. `closeAccountingPeriod` takes the conflicting row UPDATE lock before preflight and reads journals without locking them. Assessment creation and certification take the assessment lock before Close-run row locks; the producer must likewise obtain its complete period set before any Close-run invalidation locks. No shared-to-exclusive catalog upgrade is proposed.

## Contention, operational bounds and proof required

All-period locking is intentionally broader than direct ledger arithmetic. Two manual posts in different periods of one tenant will serialize at their first common assessment lock; assessment creation/certification can also wait. Distinct tenant keys remain separate. The application client in `prisma/db.ts:25` configures `maxWait: 10000` ms and `timeout: 15000` ms. The proposal retains those defaults, adds explicit isolation only, and does not extend timeouts to hide contention.

Production period counts, concurrent posting rates, database round-trip latency and lock-wait percentiles are **unknown**. There is no production capacity or latency certification. The existing per-period helper costs O(number of tenant periods) advisory-lock calls. Required evidence includes sorted/tenant-scoped IDs, unchanged financial values, exact one-effect competing posts, both assessment/posting lock orders with actual blocker PIDs, empty-run publication coverage, rollback, and expiry/authority refusal after a real wait. A small synthetic fixture cannot establish production throughput. Controlled rollout must observe actual period cardinality, total transaction time and timeout rates before broader use.

## Genuine remaining boundaries

- No production manual draft editing/deletion or line-edit service was found in the scoped `services`, `actions`, `app` and `lib` sources. `journals.service.ts` creates a draft and fills `sourceId` within its creation transaction. The concrete existing race is concurrent posting of the same unlocked DRAFT, not an invented draft-edit API.
- Draft creation itself changes the tenant-wide latest-journal timestamp and period draft count. It currently has no equivalent Close publication/invalidation boundary. A posting-only patch must not claim coverage of draft creation or other producers.
- The posting action formerly supplied `Date.now()` instead of the assurance timestamp that `protect` already provides as `ctx.freshAuth.lastAuthAt`. A trusted callback must use verified server evidence and matching tenant/actor after lock waits; client input must not supply callback or assurance state. This does not hold session/role authority through transaction commit.
- `requireFreshAuth` rereads the persisted session ID/token, expiry and assurance. Current canonical RBAC loads role permissions without filtering each role to the home tenant and does not lock them through commit. Preserve this as a known limitation; a callback alone is not complete revocation serialization.
- Draft creation uses `assertModuleNewWorkInTx` for accounting. The baseline post action/service lacks an equivalent module admission call. Existing drafts after module changes need an explicit retained-work/new-work policy; this review does not invent one.
- Creation checks journal manual readiness and account `allowManualPost`/currency. Baseline posting rechecks active/nondeleted leaf accounts and amounts, but does not repeat every creation policy or hold account/journal configuration against concurrent edits. Broad account-policy hardening is outside this publication-order correction.

## Source bindings

These hashes bind the dependency/authority source observed for this review. Posting/action files are being coordinated separately; their final candidate/application receipt must bind the implemented change and is not replaced by this document.

| Source | SHA-256 |
| --- | --- |
| `services/snapshots/tenant-operating-snapshot.service.ts` | `5748cff1466d1336f250407e366453e1829b7c75eddfeb9dbb5ee0adf7e2c883` |
| `services/snapshots/snapshot-utils.ts` | `dfe4045db41e1ad5c0f67fb86058077628cb05a3551f01202c91d46e545b84a4` |
| `services/accounting/close-assurance.service.ts` | `7e85e6465d76d2416a1a4a1f1fa2482e44a0428d74b08162f3050eb8e38f6f2d` |
| `services/accounting/close-assurance-pack.service.ts` | `7f8dc465c49cf2a9a6fda7bae7a40fce4146084a324b7547d8e7c8e951f4bdd5` |
| `services/inventory/inventory-reconciliation.service.ts` | `888b85530c40348b974a4971942ee53fdc99c8439312d6f94b662620de4b22ef` |
| `services/accounting/journals.service.ts` | `c8134774870509bf849d252eba9632abe55bb35e59fded9c4d5e01fc9c64535e` |
| `services/accounting/accounting-period-catalog.service.ts` | `1e106ed0efb017b5d1e5a712e723ccf3fdf3ea2ade4c6344163247dce78c3217` |
| `services/accounting/close-assessment-order.service.ts` | `2fbd7de7f959cce907d9538596f22ebf29ace4af4e24c90c695ccb00771abdb9` |
| `lib/security/rbac.ts` | `cfcfee37b7336fef505252c369ea071f6546fa810352f85a7992969bf3b30376` |
| `lib/security/auth-session.ts` | `d72bbbd03dda9045a973a0a0a9ba7d60309d8b4626d56325cd07959c32adeaae` |
| `services/_shared/protect.ts` | `10cbdc803232c66ac6a763d0a32634e43706f481d40949026c959373095d097e` |

No tests or database operations were run for this read-only review. Cash/Close/X1 and professional or release approval remain open according to their existing evidence requirements.
