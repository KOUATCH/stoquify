# P09 — Execution result

**PASS — portability inventory, proposed authorized archive contract, and bounded synthetic verification. No whole-tenant archive runtime or release gate established.** Run date: 18 October 2026. Only P09 executed.

HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971`. [Baseline](evidence/BASELINE.json) captures 93 selected inherited files and initial tracked status; [final validation](evidence/VALIDATION.json) records preservation, test timestamps/results and hashes. This is a dirty checkout, not an immutable release candidate. Landing, prior P07/P08 changes and other inherited work were preserved; no stage/commit/reset occurred.

## Delivered and decisions

- [ARCHIVE_CONTRACT](ARCHIVE_CONTRACT.md): versioned schema, relationships, decimal/unit metadata, counts/hashes, sensitive scope, privacy exclusions, ownership/retention and reconstruction expectations; current access map; minimal P10 decisions and specific V3/V4 plan.
- [PORTABILITY_COVERAGE](PORTABILITY_COVERAGE.md): all 20 pilot categories included as requirements, explicitly excluded or assigned named blockers; source anchors, graph nodes and current implementation limits.
- [ARCHIVE_FIXTURE_MANIFEST](ARCHIVE_FIXTURE_MANIFEST.md): 21 synthetic records, two locations, 11 JSON datasets, two attachment files; independent reconstruction and failure cases.
- Reusable pure [contract/checker](../../../../services/organization/authorized-archive-contract.ts), [static fixture](../../../../services/organization/__fixtures__/authorized-archive.v1.json), and [47-case test suite](../../../../services/organization/__tests__/authorized-archive-contract.test.ts). Nothing connects this profile to an application export endpoint.

The profile accepts only a synthetic source basis and is explicitly partial. It requires an independently supplied organization/owner/decision/sensitive scope and rejects structured unauthorized fields. It does not authenticate a user, validate legal consent, scan attachment contents or certify database completeness. Existing customer/AP/close/inventory export services and their redactions remain unchanged. Typed allowlists are retained instead of generic unredaction.

The owner archive needs a distinct lifecycle decision: current enforced read-only entitlement rejects export/job intents; inventory export uses export intent, while AP export gates purchasing with **read** intent. Accountant READ_ONLY cannot export client data. This variation is documented for P10/P16, not silently changed or represented as a commercial retention advantage.

## Prerequisites and source provenance

P01 planning scope/decisions and P04 access/recovery artifacts were read and their source fingerprints compared. [P04 drift](evidence/PREREQUISITE_DRIFT.json) reports nine changed files out of its 54-file source manifest, including protect and close-pack service. Current protect, role/grant, entitlement, export safety, AP/customer/background/close source and relevant schemas/callers/tests were inspected. The workflow registry and current lifecycle definition passed. P01 selected-source and historical artifact comparisons are separately retained in [P01 revalidation](evidence/P01_REVALIDATION.json); differing October 13 source hashes are not represented as current passing tests.

P01's 81 source fingerprints have 14 historical differences, retained explicitly; its BASELINE/PILOT_SCOPE/DECISIONS/RESULT artifact hashes still match. Its historical shared STATUS hash differs as expected after P02–P09 updates. The stable planning facts used here are the proposed scope and unresolved authority requirements, not an assumption that old code or live gates are unchanged. P04 runtime/restore gaps do not prevent this pure contract task. No old mocked/DB/browser count was added to P09's results. P08 is complete as bounded developer evidence but is not a P09 hard predecessor. Graphs are dated 9 August; [nodes/communities](evidence/GRAPH_NODES.json) were used for discovery and validated against current source, without regeneration.

## Acceptance

| Criterion | Status | Evidence / limit |
|---|---|---|
| Every pilot category included, explicitly excluded with reason, or named blocker | PASS | 20-category PORTABILITY_COVERAGE and strict coverage manifest. Production gaps are visible; fixture is not complete source extraction. |
| Independent fixture check detects omitted referenced evidence and mismatched totals/hashes | PASS | Independent reader plus negative cases that remove evidence/attachments and reseal file hashes/counts, break links/positions/journals, alter counts/currency totals/hashes. All 47 pure tests passed. |
| Secrets/access tokens excluded; customer-owned sensitive fields require explicit authorized archive scope | PASS — structural contract | Strict record/envelope schemas; representative password/token/key/provider/bank field denials; contact requires manifest declaration plus externally approved scope. No reconstructed records returned on failure. Runtime authorization and text/attachment content review remain unproved. |
| AP row/size limits and redacted reports recorded as constraints, not retention benefits | PASS | Current 5,000-row / 8 MiB / 20-second AP implementation, customer redactions/cap, close summaries and inventory cap/download gap documented. |
| Existing export tests inspected and V3/V4 plan retained | PASS — preparation | ARCHIVE_CONTRACT final section; no claim that DB/browser plans ran. |

## Verification classes

| Class | Actual procedure / result | Limit |
|---|---|---|
| S — source inspection | Instructions, P09/common/verification/roadmap R07/R08/M5, P01/P04 artifacts, current source/related schemas/actions/tests, graph nodes and selected hashes. [Baseline](evidence/BASELINE.json), [validation](evidence/VALIDATION.json), [manifest](evidence/MANIFEST.json). | Scoped review; not a whole-repository audit. Nine P04 source differences are documented, not swept into historical proof. |
| V1 — workflow | `npm run agent:workflow:check`, **exit 0**, 196 scripts outside reviewed manifest. Current package definition, absent pre/post hooks, fs/path/crypto runner and registry entry inspected first. [Record](evidence/WORKFLOW_CHECK.json). | No application commands run by this check. |
| M — pure contract | `node docs/retention/execution/P09/evidence/run-tests.cjs` → installed Jest with `jest.retention-archive.config.cjs`, one exact suite, runInBand/no-cache/JSON output. **47 passed, 1 suite, 0 failed/skipped, exit 0**. Exact run timestamps/file identity are in VALIDATION and dated execution/results/log files. | Node crypto + Zod + static fixture only; no Prisma/app mocks, database or network. SWC/Jest execution is not full TypeScript certification. |
| Artifact integrity | `node docs/retention/execution/P09/evidence/finalize.cjs`: checks exact final results, selected inherited hashes, P01 source/artifact drift, links and only P09 status row; writes provenance hashes. [Links](evidence/ARTIFACT_LINKS.json). | Selected-file scope; not an immutable archive of every untracked repository file. |
| D — real database | NOT_RUN; no target selected or connection made. | P09 requires pure fixtures and a V3 plan, not tenant extraction or transaction tests. |
| B — rendered/browser/device | NOT_RUN; no server/browser started. | No actual HTTP download, EN/FR task or accessibility proof. |
| P — provider/authority | NOT_RUN. | No upload, storage ACL, payment, live provider or filing operation. |
| C — customer outcomes | NOT_RUN. | No contact, adoption, retention/churn or satisfaction measurement. |
| E — qualified expert | NOT_RUN. | P10 privacy/commercial and applicable retention/accounting decisions unapproved. No compliance/security certification. |
| O — operational restore/load | NOT_RUN. | No archive-scale memory/time, interruption/restart, deployed backup/object restoration or RPO/RTO claim. |

Intermediate 41-, 45- and 46-case runs passed; review added targeted checks before the final 47-case run. Outputs are preserved and counts are not summed. A few source-discovery commands used absent/glob-incompatible PowerShell paths; actual files were discovered with `rg --files` and inspected. These discovery errors were not test failures or substituted passing evidence. The first artifact finalization exited 1 on concurrent changes to `components/landing/cinematic-hero.tsx` and `components/landing/cinematic.css`, before status publication. Those unrelated files were left untouched; the helper now records their old/current hashes explicitly while continuing to reject unexpected drift elsewhere. See [attempt record](evidence/ATTEMPTS.md). No test failure, skipped suite or hidden retry was converted into a pass.

A second finalization attempt found two missing links to its own not-yet-created output files. The publication order was corrected; the failed link evidence is retained, and final validation checks the actual materialized files. No application test rerun was needed for this evidence-helper change.

Skills applied: ECC security-review and verification-loop from installed 2.2.3, adapted to the project workflow. No broad generic build/typecheck/lint/coverage/security scanner ran, no install/upgrade, graph regeneration, migration, seed, provider operation or external contact. No slash-command capability was assumed.

## Exact ownership, data impact and recovery

Owned additions: `services/organization/authorized-archive-contract.ts`; `services/organization/__fixtures__/authorized-archive.v1.json`; `services/organization/__tests__/authorized-archive-contract.test.ts`; `jest.retention-archive.config.cjs`; this `docs/retention/execution/P09/` directory (four deliverables and task-owned evidence/helpers). Only P09's row in `docs/retention/execution/STATUS.md` changed through this task. Two unrelated landing files changed concurrently and were preserved without edits by P09; remaining selected inherited hashes match the start-of-run baseline. The final manifest lists every owned path/digest, and VALIDATION discloses concurrent drift rather than claiming complete checkout stability.

**Data/schema impact: none.** No existing production service, auth boundary, package script, database schema or persisted record changed. New module is a pure, unconnected synthetic contract. No runtime process/DB needs cleanup. Recovery is to supersede/remove only these owned additions and restore P09's prior status row if needed, preserving all dated evidence and unrelated work; no destructive data rollback applies.

## Metrics, risks and handoff

No product metric instrumented or measured. Proposed P16 metrics: archive success = authorized generation delivered and independently validated / authorized generation attempts; completeness exceptions = unresolved missing records/links/attachments per declared scope; reconstruction time = independent reader start to accepted reconciliation; support effort = recorded assistance time per request. Report cancelled/denied/expired/retried outcomes separately and fix denominators/snapshot scope before measuring. No baseline or retention benefit has been invented.

Remaining production blockers: full domain DTO/source inventory, approved sensitive fields/owner delegation, lifecycle and read-only/export policy, consistent snapshots and large pagination, object completeness, authenticated delivery and revocation, pending local work handling, retained history, applicable retention/deletion review and operational recovery. These block P16/runtime/M5/Gate B claims, **not P09's completed preparation acceptance**.

Exact next action, only when requested: run P10 to resolve the commercial lifecycle/support and retained archive-access decision packet, consuming ARCHIVE_CONTRACT's policy map. P12 may consume P09's bounded PASS while keeping production gaps open. P16 must implement the approved production profile, extraction and delivery and execute the V3/V4 plan; it cannot treat this fixture's PASS as completeness. **P10 and all later prompts were not run.**

Review lenses: architecture/domain integration — preserve domain-owned exporters; data integrity — strict scope/links/counts/hashes/decimal reconstruction; security/privacy — explicit authority and field projections, no secret export; product/workflow/commercial — useful portability and clear lifecycle decisions; QA/release/SRE — separate pure proof from runtime, scale and recovery; finance/audit — preserve source/review/position evidence without claiming statutory validity. Frontend/design/accessibility/localization — no UI change, EN/FR metadata retained, runtime usability deferred. Country/tax rule changes, payroll execution, live provider expansion, AI autonomy and new business-process automation — **not applicable**, none changed or executed.
