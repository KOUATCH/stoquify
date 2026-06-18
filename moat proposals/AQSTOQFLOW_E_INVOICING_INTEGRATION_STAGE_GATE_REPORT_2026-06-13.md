# AqStoqFlow E-Invoicing Integration Stage-Gate Report

Date: 2026-06-13  
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`  
Companion proposal: `moat proposals/AQSTOQFLOW_COMPLIANCE_LAYER_INTEGRATION_PROPOSAL_2026-06-13.md`

## Executive Verdict

Verdict: APPROVED WITH REQUIRED CHANGES.

Use the `stockflow-e-invoicing-compliance-center` skill immediately for audit, ticketing, architecture review, and country-pack design. Do not use it yet to wire a production tax-authority adapter into live checkout.

The correct stage for complete integration is after POS-to-ledger preflight is green and before any real country adapter is connected. In practical terms:

1. Prove sale, payment, refund, void, source links, posting batches, fiscal-period gates, idempotency, and audit evidence in the existing accounting/POS path.
2. Then add the Compliance Center kernel: `FiscalDocument`, `FiscalSequence`, `ComplianceSubmission`, country-pack e-invoicing metadata, adapter registry, and outbox.
3. Then integrate POS receipts against a fake or sandbox adapter.
4. Only after that, build a real DGI/FNE/e-facture adapter using official technical specs, sandbox proof, and expert accountant/legal validation.

This order makes the compliance layer a moat. Building it earlier would certify documents that may not reconcile to the books. Building it later would tempt the project to hardcode one country's tax portal into POS, which would destroy the pan-OHADA adapter advantage.

## Critical Refinement To The Existing Proposal

The existing moat proposal is directionally strong: mandatory e-invoicing and digital tax services can turn compliance from optional software into a deadline-driven purchase. The refinement is that AqStoqFlow should not "build an invoicing module" first. It should build a certified-document control plane above ledger-backed events.

The proposal should be updated with these constraints:

| Proposal claim | Refinement |
| --- | --- |
| "Build the certified-invoice MVP" | Build the ledger preflight and Compliance Center kernel first; certification attaches to posted source evidence. |
| "Each country has a different e-invoicing platform" | Correct. Encode this as country-pack capability metadata plus adapters, not as country branches in POS or accounting code. |
| "Offline-first from day one" | Offline POS may issue provisional receipts only. Final legal fiscal numbers and certification artifacts must be allocated server-side after sync unless an official offline fiscal-device scheme says otherwise. |
| "Fear-based penalty copy" | Keep fear as a sales reality, but do not publish specific penalties or closure claims unless each country pack has a cited legal reference and review status. |
| "Pan-OHADA rollout" | Treat pan-OHADA as the strategic destination. Production launch should be one country first, with other countries modeled as `REQUIRES_EXPERT_REVIEW` until official specs and local validation exist. |

## Current Project Evidence

This is a readiness snapshot, not a full code audit.

| Evidence | Meaning | Integration impact |
| --- | --- | --- |
| `docs/ACCOUNTING_BACKBONE.md` says the ledger-first control plane exists: accounting settings, fiscal years, periods, chart, journals, posting batches, source links, posting rules, audit events, typed errors, and focused tests. | The right base exists. | Good foundation for fiscal documents. |
| `prisma/schema.prisma` contains `LedgerPostingBatch` and `AccountingSourceLink`. | Source traceability exists in the data model. | Fiscal documents can link to accounting truth instead of becoming a parallel truth. |
| `services/pos/pos.service.ts` imports `postSale`, `postPayment`, `postRefund`, and `postVoid`; current hits show calls in sale, payment, refund, and void paths. | POS appears to be moving from operational-only to ledger-backed. | This is the key preflight area to verify with tests before certification. |
| `docs/ACCOUNTING_BACKBONE.md` still contains older text saying POS commit was not yet wired. | Documentation may be stale against current code. | Before integration, update/readiness-check the docs so the team does not build from stale assumptions. |
| `services/regulatory/country-packs/cameroon.ts` has a capability matrix, and country-pack schemas include `REQUIRES_EXPERT_REVIEW`. | Regulatory pack infrastructure exists. | Extend it with e-invoicing/fiscalization metadata before engine code. |
| No current code hit was found for live `FiscalDocument`, `ComplianceSubmission`, or `services/compliance/*`. | The Compliance Center kernel is not implemented yet. | This should be the first new module after ledger preflight. |
| `docs/RUNBOOK.md` references Inngest jobs and retry behavior. | A durable worker system likely exists. | Use it for compliance submission outbox after commit. |

Official external anchors checked:

- OHADA AUDCIF is the active OHADA accounting framework, adopted on 2017-01-26, published on 2017-02-15, and effective for individual accounts from 2018-01-01. Source: https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/
- Cameroon DGI publicly lists e-services including DSF, Documents Fiscaux, and OTP/E_billing. Source: https://www.impots.cm/index.php/fr/e-services
- Cameroon DGI publishes fiscal calendar/declaration deadline information, reinforcing that filing/deadline logic must be country-pack data, not hardcoded code. Source: https://www.impots.cm/fr/calendrier-fiscal

These sources support the architecture direction. They do not provide enough API-level detail to build a production adapter without official technical specifications.

## Best Stage To Implement The Skill

### Stage 0: Use The Skill Now

Use now for:

- Refining the Compliance Center scope.
- Auditing ledger/POS readiness.
- Creating P0/P1 implementation tickets.
- Designing country-pack e-invoicing metadata.
- Reviewing the existing proposal for unsafe legal or architectural claims.

Do not use now for:

- Production authority submissions.
- Final fiscal numbering.
- Legal claims that a document is certified.
- Printing QR/sticker references not returned by a real authority or approved fallback workflow.

### Stage 1: Ledger And POS Preflight

This is the required gate before full integration.

Green means:

- POS sale commit creates operational sale, inventory movement, payment/drawer/session effects, sale posting, payment posting, source links, posting batch, and audit evidence in one transaction.
- Refund and void paths create compliant reversal postings and source traces.
- Closed periods reject sale/refund/void posting.
- Missing posting rules or invalid account mappings roll back the operational write.
- Replayed sale/payment/refund/void idempotency keys cannot duplicate postings.
- Journal line to POS document trace works in both directions.
- Customer receivable and cash/bank/tender effects reconcile to the ledger.

If this stage is red, fix accounting/POS first. E-invoicing on top of unproven ledger truth is worse than no e-invoicing because it creates official-looking documents that can disagree with the books.

### Stage 2: Compliance Center Kernel

This is the best first code stage for the skill.

Add:

- `FiscalDocument`
- `FiscalDocumentLine`
- `FiscalSequence`
- `ComplianceSubmission`
- `ComplianceAdapterConfig`
- `ComplianceEvidence`
- `ComplianceObligation`
- `ComplianceReminder`
- `AccountantFirm`
- `AccountantClientAccess`

Hard requirements:

- Fiscal document unique per organization, source type, source id, and document type.
- Legal sequence unique by organization, country, document type, fiscal year/period, location/register scope, and final number.
- Certified document fields immutable.
- Reversal or credit note links to the original; no edit/delete of finalized fiscal documents.
- Certification artifact hash required for `CERTIFIED`.
- Rejection reason required for `REJECTED`.
- `organizationId` on every compliance table.
- No cascade delete that can hide statutory evidence.

### Stage 3: Country-Pack E-Invoicing Metadata

Add pack paths before any country adapter:

- `compliance.eInvoicing.capability`
- `compliance.eInvoicing.requiredFields`
- `compliance.eInvoicing.certificationPolicy`
- `compliance.eInvoicing.authorityChannels`
- `compliance.eInvoicing.endpointMetadata`
- `compliance.eInvoicing.manualPortalFallback`
- `compliance.eInvoicing.certificationArtifactSchema`
- `compliance.filings.supportedFilingTypes`
- `compliance.filings.deadlineRules`

Every value needs legal reference, effective dates, verification status, pack version, and golden fixtures when it affects blocking, exports, or computations. Unsupported or uncertain countries must return typed `REQUIRES_EXPERT_REVIEW` behavior, not borrowed values from Cameroon or Cote d'Ivoire.

### Stage 4: Fake/Sandbox Adapter And Outbox

Build the adapter contract and fake adapter before real authority integration.

Adapter contract:

- Validate canonical payload.
- Build authority payload.
- Submit.
- Poll or refresh status.
- Parse authority response.
- Classify errors as rejection, retryable outage, credential/config error, validation error, rate limit, or unsafe unknown.

Outbox rule:

- POS/accounting transaction creates the fiscal document and enqueues a compliance submission.
- External authority calls happen only after commit through a durable worker.
- Authority outage must not hold the POS transaction open.
- Retry must preserve idempotency key and payload hash.

This stage gives the UI, queue, and tests something deterministic to exercise before legal/API risk is introduced.

### Stage 5: POS Receipt Integration

Wire POS only after the kernel and fake adapter are working.

The POS flow should be:

1. Validate active session, stock, tenders, customer, credit limits, and permissions.
2. Commit sale, payment, inventory, drawer, and session changes.
3. Post sale/payment through the accounting services.
4. Verify source trace.
5. Create `FiscalDocument` and `FiscalDocumentLine` from posted source evidence.
6. Allocate provisional or final sequence according to the country pack policy.
7. Enqueue `ComplianceSubmission`.
8. Return receipt payload with honest certification status and delivery constraints.

Receipt delivery rules:

- If certification-before-issue is required, block legal print/email/SMS/WhatsApp until certified or approved fallback evidence exists.
- If queued certification is allowed, display `QUEUED` or `SUBMITTED` truthfully.
- Display QR/sticker/reference only from stored certification artifacts.

### Stage 6: Compliance Center UI And Accountant Portfolio

Build the user-facing Compliance Center after real service state exists.

UI surfaces:

- Certification queue.
- Failed/rejected submissions.
- Certified document trace.
- Upcoming obligations and deadlines.
- Adapter configuration health.
- Manual portal fallback evidence.
- Accountant/CGA client portfolio.

Trust rules:

- Financial/statutory numbers must come from posted ledger and fiscal-document state.
- Missing data renders unavailable with reason, never zero.
- Every number shows provenance, as-of date, tenant scope, and period status.
- Actions are protected by RBAC and fresh-auth where needed.

### Stage 7: First Real Country Adapter

Build a production adapter only when all are true:

- Official technical spec is available.
- Sandbox or regulator test environment is available.
- Required payload fixtures exist.
- Country pack values are cited, effective-dated, and reviewed.
- Credential storage and redaction are implemented.
- Operator rejection/retry queues are live.
- Legal/accountant validation is documented.

Recommended first pilot:

- Cameroon if the team wants home-market alignment with the existing pack and XAF/CEMAC assumptions.
- Cote d'Ivoire only if the team has official FNE specs, partner accountant access, and a stronger deadline-led sales channel.

Do not build both as production adapters at once. Build one kernel, one fake adapter, one real pilot, then onboard the second country without engine-file changes.

## P0 Blockers Before Complete Integration

| ID | Blocker | Why it matters | Exit criteria |
| --- | --- | --- | --- |
| P0-1 | POS-to-ledger atomicity not proven by tests | Certified invoice could disagree with OHADA books | Integration tests prove sale/payment/refund/void rollback and source trace. |
| P0-2 | Fiscal document models missing | No immutable statutory envelope exists | Schema and service create fiscal docs from posted source events. |
| P0-3 | Final sequence policy missing | Number gaps or reuse can break statutory evidence | Serialized unique sequence allocation per legal scope. |
| P0-4 | Country-pack e-invoicing metadata missing | Engine would hardcode country behavior | Pack paths, citations, capability flags, fixtures, and expert-review states exist. |
| P0-5 | Authority calls inside POS transaction | Outage could corrupt checkout or hold locks | Transaction only enqueues; worker calls authority after commit. |
| P0-6 | Certification timing not modeled | Receipts may be issued illegally | Country pack policy controls delivery blocking and provisional status. |
| P0-7 | Certified docs editable or deletable | Evidence suppression risk | Immutability and reversal/avoir rules enforced in service and DB. |
| P0-8 | Accountant access not consent-scoped | Cross-tenant breach risk | Consent, scoped roles, expiry, and audit trail required. |
| P0-9 | Compliance dashboards read operational estimates | False statutory reporting | T3/T4 trusted surfaces with ledger/fiscal provenance. |
| P0-10 | Real adapter lacks official specs | Unsupported legal automation | Production adapter blocked until official API/legal/accountant validation. |

Any open P0 means the production e-invoicing integration should be rejected.

## Recommended Procedure

1. Freeze the integration scope.
   - Pilot country.
   - Taxpayer regimes.
   - Document types: POS receipt, sales invoice, credit note/avoir.
   - Online/offline behavior.
   - Certification-before-issue policy.
   - Accountant/CGA workflow.

2. Run a readiness audit using the skill.
   - Ledger/POS source trace.
   - Country-pack gaps.
   - RBAC and fresh-auth gaps.
   - Outbox/job infrastructure.
   - Dashboard/export trust.

3. Patch the preflight blockers.
   - Update stale accounting docs.
   - Add or strengthen POS/accounting integration tests.
   - Prove rollback, closed period, idempotency, and source trace.

4. Extend country-pack schema.
   - Add e-invoicing capability flags and metadata.
   - Mark uncertain values `REQUIRES_EXPERT_REVIEW`.
   - Add cited fixtures before production publication.

5. Add the compliance schema.
   - Fiscal documents.
   - Sequences.
   - Submissions.
   - Evidence.
   - Obligations/reminders.
   - Adapter config.
   - Accountant consent/access.

6. Build services before UI.
   - `services/compliance/fiscal-document.service.ts`
   - `services/compliance/adapter-contract.ts`
   - `services/compliance/adapters/fake-sandbox.ts`
   - `services/compliance/adapters/registry.ts`
   - `services/compliance/certification-outbox.service.ts`
   - `services/compliance/compliance-center.service.ts`
   - `services/compliance/obligations.service.ts`
   - `services/compliance/evidence.service.ts`
   - `services/compliance/portfolio.service.ts`

7. Wire POS to the service.
   - Create fiscal document only from posted source evidence.
   - Enqueue submission in the same database transaction.
   - Keep external submission outside the transaction.
   - Return honest receipt status.

8. Build actions, hooks, and routes.
   - `actions/compliance/*.actions.ts`
   - `hooks/complianceHooks/*`
   - `app/[locale]/(dashboard)/dashboard/compliance/*`
   - `components/compliance/*`

9. Add real adapter pilot.
   - Only after sandbox fixtures and expert review.
   - Store credentials outside packs and source code.
   - Redact logs.
   - Track payload hash, request/response hash, authority reference, artifact hash, and correlation ID.

10. Promote to production gradually.
    - Demo tenant and internal test.
    - One accountant/CGA design partner.
    - One SMB live pilot.
    - Expand by country only through new pack and adapter registration, not engine forks.

## Permanent Test Gates

Before complete integration is accepted, keep these as regression tests:

- Create fiscal document from posted POS sale.
- Reject fiscal document when posting batch or source link is missing.
- Reject missing required legal identity, tax id, VAT breakdown, or currency when country pack requires it.
- Allocate sequence without duplicates under concurrency.
- Preserve idempotency on duplicate enqueue/submission.
- Reject same idempotency key with different payload hash.
- Store certification artifact hash and authority reference.
- Prevent mutation/delete of certified document.
- Create reversal/avoir linked to original.
- Simulate authority outage and prove sale remains posted with queued retry.
- Simulate terminal rejection and prove it appears in Compliance Center.
- Block legal receipt delivery when certification-before-issue is required.
- Prove tenant A cannot read, retry, export, or existence-probe tenant B documents.
- Prove accountant access requires explicit consent and audit trail.
- Static check: no adapter import in POS service.
- Static check: no hardcoded country fiscal values in engine files.
- Static check: no production mocks/fakers/sample fiscal documents.

Suggested commands once code exists:

```powershell
npm test -- services/regulatory
npm test -- services/accounting
npm test -- services/pos
npm test -- services/compliance
npm run typecheck
```

Adjust to the repository's actual Jest/Next test layout.

## Moat Logic

The defensible advantage is not "we can print an invoice." Many competitors can print invoices.

The moat is:

- One ledger-first source of truth.
- Country packs that make national law data-driven.
- Adapters that isolate DGI/FNE/e-facture complexity.
- Immutable certified documents linked to posted source events.
- Durable outbox behavior under tax-authority outages.
- Accountant/CGA portfolio workflow with tenant consent.
- Dashboards and exports that can prove provenance.
- A growing library of regulator fixtures, rejection cases, and audit evidence per country.

That is difficult to copy because it compounds. Every country adapter, rejection fixture, compliance queue, accountant workflow, and audited exception teaches the platform something a generic POS cannot learn quickly.

## Final Recommendation

Implement the skill in two waves.

Wave 1 starts now: run the skill as an audit/planning/ticketing discipline and produce the P0/P1 backlog.

Wave 2 starts after ledger/POS preflight is green: build the Compliance Center kernel, country-pack e-invoicing metadata, fake adapter, outbox, and POS fiscal-document creation.

Real DGI/FNE/e-facture integration is Wave 3. It should be treated as a regulated adapter launch, not a normal feature task.

Current readiness: not production-ready for statutory e-invoicing, but well-positioned to begin the foundation work because the ledger-first accounting backbone, source-link models, POS posting calls, regulatory pack infrastructure, and job-runner hints already exist.

Professional boundary: this report is an engineering and product architecture report. It is not legal, tax, or accountant certification. Production launch in any country requires official regulator specs and validation by a qualified expert-comptable, counsel, or competent authority.
