# Provider statement import and independent review — v118

## Delivered behavior

PR-06 previously imported a statement, created a reconciliation run and signed that newly created evidence in one programmatic call. It could not establish that the signer had reviewed the evidence before submission. Current scoped source search found no production caller of that combined helper; this is a service contract correction, not a newly exposed API or customer automation.

`importProviderStatementForReview` now imports and reconciles under a server-derived active tenant actor with read/import/run permissions and current module eligibility. It returns the actual run ID, observed status and review route. It never signs. The old `ingestAndSignProviderStatement` entry rejects before import or reconciliation; an integration must migrate deliberately rather than silently losing its signing step.

The immutable request reference binds tenant, actor, provider, business date, filename, provider adapter identity and exact file hash. Its private inbox record denotes registration of the request only. Actual StatementFile and ReconciliationRun records establish subsequent outcomes; the request record is not approval evidence. The run producer validates the intent and retained source before accepting its provenance.

Imports and runs remain separate transactions. Partial completion is explicit and retry uses the same request. Committed run recovery does not create a replacement run. Duplicate statement rejection reuses its retained exception, including concurrent attempts serialized on the tenant's provider row. New imports obey current module new-work admission; retained duplicate evidence can still be returned.

Missing accounting-period setup now produces the existing actionable review blocker. Actual query failures still propagate as failures. A run's READY_FOR_SIGNOFF status does not itself establish current eligibility to sign.

## Procedure and required inputs

| Input/action | Owner and source |
| --- | --- |
| Provider account ID | Authorized operator selects an existing same-tenant provider mapping; obtain its ID from the provider configuration/read model. Never substitute a display label or external bank account number. |
| Statement contents and filename | Operator obtains the actual provider statement using the organization's authorized channel. Keep the exact bytes for retry. The adapter remains a trusted server implementation, not client-submitted executable code. |
| Business date | Operator chooses the day being reconciled. The current service normalizes it to a UTC business day; provider/country-specific cutoff interpretation remains an integration requirement. |
| Organization, actor and permissions | Calling server boundary resolves these from the authenticated session and current authorization. They are not form fields or values to copy from client input. |
| Request UUID | Calling application generates one UUID before submission and retains it with the original request. Same request, same UUID; changed file/date/actor requires a newly reviewed request, not reuse of the old UUID. |
| Review link | Returned by the service after an actual bound run is confirmed. Prefix the application's current locale, for example `/en/dashboard/finance/reconciliation?reviewRun=<returned ID>` or `/fr/...`. A link does not grant permission. |
| Independent signature | Authorized checker opens the actual run, inspects current evidence and setup conditions, authenticates freshly where requested, and explicitly signs through the existing reviewed-sign action. The browser binds both reviewed hashes. |
| Missing accounting period | Finance administrator supplies the configured period covering the run date through established accounting setup. Do not fabricate a period, country approval or signer authority to dismiss a blocker. |

Response handling:

- `REVIEW_REQUIRED`: a bound run exists; inspect `currentStatus` and open the review. Signing was not performed by this helper, even if a later independent operation has already signed the run.
- `IMPORT_BLOCKED`: inspect the retained duplicate exception; correct source selection before a new request. Blind retries do not resolve duplicated content.
- `IMPORT_UNCONFIRMED`: import success is unconfirmed. Retain the same request and retry after resolving access/source/infrastructure errors; do not claim zero imported rows or successful reconciliation.
- `IMPORTED_RECONCILIATION_UNCONFIRMED`: the returned file is retained but a bound run is unconfirmed. Retry the same request. A conflict can mean another current run already occupies that provider/day and needs operator review.
- A thrown transport/storage error is still unconfirmed. Retain the request. Never infer that no effects occurred from a failed response.

## Review responsibilities

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend/API | Separate command intake, import, run and independent sign; no public endpoint added. Direct trusted callers must supply genuine server-derived control context. |
| Data/migration | Existing inbox/file/run records reused; no schema migration. Provider lock serializes imports; source intent validated before run creation. |
| IAM/privacy/security | Active scoped actor, explicit permissions and module enforcement; no raw statement or credentials retained in request summary. Actual statement persistence follows existing domain retention. |
| Finance/controls/audit | No automatic signature; preserved independent review, admission and financial invariants. Request registration is not professional approval or a signature certificate. |
| Frontend/design/UX/localization | Existing dashboard review route and EN/FR blocker language reused; no new visual system. Missing setup distinguished from query failure. |
| Quality/release/SRE | Focused tests and owned PostgreSQL failure/concurrency verification; actual handoff evidence recorded separately. No deployment or performance certification. |
| SaaS packaging | Existing commercial eligibility and stop-new-work policy remain authoritative. No prices or subscription changes. |
| Payments/providers/ledger/close/events | Real local domain import/run effects verified using synthetic provider inputs. Existing close invalidation and outbox behavior retained; no live provider authentication claim. |
| Statutory/country rules | No statutory rule changed; UTC-day interpretation and real provider setup need applicable integration validation. No statutory/accounting certification. |
| Inventory/POS/offline/purchasing/HRIS/payroll | Not applicable to this change: no domain behavior or data changed. Their workflow review remains in the overall register. |
| Analytics/AI/agents | No analytics or agent execution changed. Programmatic callers must use the same independent approval handoff. |
| Rollout/support | Migrate old trusted helper callers to the new contract and document partial outcomes. No live customer activation authorized by this record. |

## Rollout and recovery

No migration, production build, deployment or external delivery was performed. Before enabling an actual integration, inventory its callers and update them for retained request IDs and explicit review. Keep the old helper's fail-closed retirement until all callers migrate. If import succeeded but matching failed, retain its file and retry; do not delete the imported statement or generate another signing intent to obscure failure. Never restore automatic signing as a rollback.

All verification uses the owned local database and synthetic source/setup. Existing prior reports remain historical. The whole-platform inventory and unverified workflows remain open; this batch is not completion of PR-06 or the overall assignment.


## Verification and source binding

evidence/source-baseline-v118.json, 2026-09-13T11:22:11.935Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Working-tree changes preserved. PostgreSQL lanes/environment/provider-review-v118-5d85a27d-68ef-431c-ae20-05c1e8131a38.json receipt a0bcb2; browser lanes/environment/provider-review-handoff-v118-ee0e95bf-0f4e-45d4-83f5-9f498c459de5.json receipt0cd9d9. French 320px screenshot visually inspected. Tests:29 across import/helper/run suites receipt239e2b;46 across certification/preparation suites receipt663f00. Final typecheck36fe3e; lintc3aed6 plus8a1ec0, eight changed files, zero warnings. Failed browser attempt307254 retained in provider-review-handoff-v118-17f6a9ad-aef8-4626-8133-9b6f437caf69.json; corrected actual setup classification, not fabricated fixture readiness. Initial evidence-write EPERM d1f924 retained as an unsuccessful verification attempt.

Exact focused commands use the bundled Node runtime with node_modules/jest/bin/jest.js --runInBand --runTestsByPath for services/payments/__tests__/provider-operations.service.test.ts, services/payments/__tests__/statement-import.service.test.ts, services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts; separately services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts and services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts. Typecheck: node_modules/typescript/bin/tsc --noEmit --pretty false. Lint: node_modules/eslint/bin/eslint.js on those three changed tests and five changed service files. Owned drivers: lanes/environment/verify-provider-review-v118.cjs and verify-provider-review-handoff-v118.cjs. Do not rerun completed one-use evidence capture/publisher. No default migration-bearing build invoked.

All v118 verification handles completed. No current global blocker; entire platform work remains active. Next restricted-role run discovery is ordinary engineering work, not an external approval request.
