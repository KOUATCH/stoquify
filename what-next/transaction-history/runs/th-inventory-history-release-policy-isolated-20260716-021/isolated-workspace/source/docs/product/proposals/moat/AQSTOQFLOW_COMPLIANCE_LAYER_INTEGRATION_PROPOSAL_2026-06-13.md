# AqStoqFlow Compliance Layer Integration Proposal

Date: 2026-06-13

Source proposal: `moat proposals/The Compliance Layer for OHADA SMBs.md`

## Executive Summary

The Compliance Layer concept should be integrated into AqStoqFlow, but not as a detached side product. The strongest path is to make it a first-class AqStoqFlow module: a compliance, certified-invoice, tax-deadline, and accountant-portfolio layer sitting on top of the existing POS, payments, accounting, RBAC, regulatory country-pack, and audit backbone.

The product wedge is strong because mandatory e-invoicing and online tax filing turn compliance from a "nice-to-have" into a deadline-driven purchase. AqStoqFlow already has the right product base: POS, inventory, customers, suppliers, payment capture, mobile-money fields, accounting periods, posting rules, source links, audit logs, and country-pack infrastructure. The missing moat is the certification and filing orchestration layer that converts operational events into legally usable fiscal evidence.

Recommended positioning:

> AqStoqFlow keeps OHADA SMBs operationally accurate and fiscally compliant: every sale, payment, invoice, tax obligation, and ledger posting can be traced from the shop counter to the accountant and, where supported, to the tax authority.

## Core Proposal

Build a new module called **Compliance Center**.

It should provide:

- Certified fiscal documents for POS sales, customer invoices, credit notes, refunds, and later supplier invoices.
- Country-specific compliance adapters for tax authority formats and certification workflows.
- Tax-deadline and filing obligation calendars by country, regime, and organization profile.
- Certification queue with retry, failure reasons, manual fallback, and audit trail.
- Accountant/CGA portfolio dashboard for managing many client organizations.
- Ledger-backed VAT and filing drafts, never statutory totals computed directly from operational dashboard tables.

## Integration Architecture

Recommended architecture:

```text
POS / Sales / Payments / Customer workflows
        |
        v
Operational source documents
        |
        v
Accounting posting gateway
        |
        v
LedgerPostingBatch + JournalEntry + AccountingSourceLink
        |
        v
FiscalDocument + ComplianceSubmission
        |
        v
Compliance Adapter by country
        |
        v
DGI/FNE/e-invoice portal or manual portal fallback
```

Important rule: external tax authority calls must not run inside the sale or accounting transaction. The transaction should commit the sale, payment, inventory movement, posting batch, source link, and audit evidence first. Certification should then run through an idempotent compliance outbox/queue.

## Proposed Data Model Additions

Add these models to the active Prisma schema after a schema design pass:

- `FiscalDocument`
  - Organization-scoped legal document wrapper.
  - Links to `SalesOrder`, `PaymentRefund`, `Customer`, `LedgerPostingBatch`, and `AccountingSourceLink`.
  - Stores document type, provisional number, final fiscal number, status, issue date, fiscal period, country, tax regime, currency, totals, certification reference, QR/sticker data, source hash, and reversal reference.

- `FiscalDocumentLine`
  - Snapshot of item/service description, quantity, unit price, discount, VAT/tax code, tax rate version, net amount, tax amount, gross amount, account mapping, and source line reference.

- `ComplianceSubmission`
  - One submission attempt or lifecycle record for a fiscal document.
  - Stores adapter key, payload hash, request/response metadata, status, retry count, failure classification, certified-at timestamp, and authority reference.

- `ComplianceAdapterConfig`
  - Per-organization and per-country adapter credentials/configuration.
  - Must be encrypted or secret-referenced, audited, and protected by fresh authentication.

- `ComplianceObligation`
  - Filing calendar and deadline tasks such as VAT return, DSF, IGS, annual statements, and other country-specific obligations.

- `ComplianceReminder`
  - Reminder scheduling, delivery state, actor acknowledgements, and escalation history.

- `AccountantClientAccess`
  - Explicit relationship between an accounting firm/CGA tenant and client organizations.
  - Supports delegated access, consent, role scope, expiry, and audit.

## Service Layer Additions

Create these service areas:

```text
services/compliance/
  fiscal-document.service.ts
  compliance-submission.service.ts
  compliance-obligation.service.ts
  compliance-adapter-registry.ts
  compliance-outbox.service.ts
  accountant-portfolio.service.ts
  adapters/
    cm-dgi/
    ci-fne/
    sn-efacture/
    sandbox/
```

Adapter contract:

```ts
type ComplianceAdapter = {
  key: string
  countryCode: string
  validate(input: FiscalDocumentPayload): Promise<ValidationResult>
  buildPayload(input: FiscalDocumentPayload): Promise<AuthorityPayload>
  submit(input: AuthorityPayload, config: AdapterConfig): Promise<SubmissionResult>
  getStatus?(reference: string, config: AdapterConfig): Promise<SubmissionStatus>
  normalizeError(error: unknown): ComplianceSubmissionError
}
```

Start with a sandbox adapter first. It lets the platform test queueing, idempotency, fiscal document states, audit logs, UI, and accountant workflows before depending on a real DGI/FNE integration.

## Country-Pack Expansion

The existing regulatory country-pack foundation should become the source of truth for compliance capabilities. Extend country packs with:

- `eInvoicing.capabilityStatus`
- `eInvoicing.requiredFields`
- `eInvoicing.certificationTiming`
- `eInvoicing.numberingPolicy`
- `eInvoicing.manualPortalFallback`
- `eInvoicing.supportedDocumentTypes`
- `filings.deadlines`
- `filings.frequencyByTaxRegime`
- `filings.exportFormats`
- `identifiers.requiredTaxIds`
- `payments.supportedProviderEvidence`

Do not hardcode country tax rates, filing deadlines, or e-invoice rules in services. Resolve them by country, regime, effective date, and pack version.

## Workflow Proposal

### POS Sale To Certified Invoice

1. Cashier commits POS sale.
2. Sale transaction writes `SalesOrder`, `SalesOrderLine`, `Payment`, `InventoryTransaction`, `CashDrawerTransaction`, source audit, and ledger postings.
3. Service creates or queues a `FiscalDocument` from the committed source event.
4. Compliance outbox submits the document through the configured country adapter.
5. Adapter returns certification reference, QR/sticker, status, or rejection reason.
6. Receipt/invoice UI displays certification state.
7. Accountant dashboard shows all certified, queued, failed, and manually handled documents.

### Offline Sale

Offline mode should not assign final fiscal numbers. It should use provisional local identifiers and idempotency keys. On sync, the server resolves the organization, period, sequence, posting, and certification queue. If the jurisdiction requires certification before issue, the UI must clearly mark the sale as pending legal certification and block the final legal invoice until certification succeeds.

### Refund Or Void

Refunds and voids must not edit certified documents. They create a correction document, reversal, credit note, or jurisdiction-specific cancellation reference linked to the original fiscal document.

## Required RBAC And Controls

Add permissions:

- `compliance.documents.read`
- `compliance.documents.issue`
- `compliance.documents.certify`
- `compliance.documents.reverse`
- `compliance.submissions.retry`
- `compliance.obligations.read`
- `compliance.obligations.manage`
- `compliance.filings.prepare`
- `compliance.filings.export`
- `compliance.adapter-config.manage`
- `compliance.portfolio.manage`
- `compliance.portfolio.review`

Fresh authentication should be required for:

- adapter credential changes
- manual certification override
- document reversal/credit note
- filing export
- accountant-client access approval
- retrying a failed submission after payload correction

## Advantages

- Turns AqStoqFlow from retail software into a compliance operating layer for OHADA SMBs.
- Creates urgency through legal deadlines and penalties.
- Strengthens retention because certified invoice history, filings, and audit evidence are hard to migrate.
- Gives accountants and CGAs a reason to distribute the product to many clients.
- Builds a defensible adapter library country by country.
- Reuses existing accounting, POS, payments, and RBAC investments instead of creating a separate product.
- Makes mobile money and offline-first workflows practical for the target market.

## Complexities

- Every country adapter has different payloads, credentials, portal behavior, certification states, and failure modes.
- Regulations and technical specs can change with little notice.
- Offline-first sales conflict with jurisdictions that require real-time certification before invoice issuance.
- Final fiscal numbering must be gapless and server-controlled.
- Tax authority outages become customer support issues even when AqStoqFlow is not at fault.
- DGI credentials are sensitive secrets and require stronger operational controls.
- Legal and accountant validation is mandatory before claiming statutory compliance.
- Filing reports must reconcile to ledger accounts, not operational dashboard totals.

## Market Target Analysis

Recommended first buyer: accountants and Centres de Gestion Agréés.

Recommended end user: SMB owners, cashiers, and managers.

### Pros Of Accountant/CGA-Led Go-To-Market

- One accountant can bring many SMB clients.
- Trust transfer is much stronger than direct advertising.
- Accountants feel the compliance pain directly.
- Portfolio dashboards create professional lock-in.
- The channel can educate SMBs about legal obligations.

### Cons Of Accountant/CGA-Led Go-To-Market

- Sales cycles are slower than pure self-serve SMB acquisition.
- Accountants may fear disintermediation unless the product clearly strengthens their practice.
- The product must include review queues, client consent, delegation, and exception handling.
- Support expectations will be higher because professional users will rely on the system for client work.

### Pros Of SMB-Direct Go-To-Market

- Faster self-serve growth if the free tier is simple.
- Strong emotional pitch: stay open, avoid penalties, issue a legal invoice quickly.
- WhatsApp and mobile-money channels can drive referrals.

### Cons Of SMB-Direct Go-To-Market

- Low willingness to pay without visible legal pressure.
- Higher support load for basic tax questions.
- Lower trust for a new compliance SaaS without accountant endorsement.
- Churn risk if onboarding does not immediately produce a certified document.

## Beachhead Recommendation

Start with Cameroon if the priority is platform fit and faster internal delivery:

- Existing country-pack work already targets Cameroon.
- Mobile money provider assumptions are already present.
- The team likely has stronger local context.
- Good proving ground for OHADA/SYSCOHADA + retail + mobile-money workflows.

Evaluate Côte d'Ivoire in parallel if the priority is the strongest e-invoicing deadline-driven market wedge:

- The FNE mandate may create stronger immediate urgency.
- It is commercially attractive but requires real adapter discovery and DGI/FNE technical validation.

Do not attempt pan-OHADA launch first. The pan-OHADA moat should come from an adapter architecture, not from launching many countries at once.

## Recommended Build Order

### Phase 1: Compliance Kernel

- Add `FiscalDocument`, `FiscalDocumentLine`, `ComplianceSubmission`, and adapter registry.
- Implement sandbox adapter.
- Wire POS sale completion to create a fiscal document after accounting posting.
- Add certification queue states and idempotency.
- Add tests for duplicate retry, rejection, period lock, and source-link traceability.

### Phase 2: Compliance Center UI

- Add `/dashboard/compliance`.
- Show certification status, failed submissions, upcoming obligations, manual fallback states, and document trace.
- Add document detail page from sale to ledger posting to fiscal document to submission.

### Phase 3: Country-Pack Compliance Metadata

- Extend Cameroon pack first.
- Add validation tests for required fields, capability status, filing deadlines, and provider evidence.
- Keep legal-owner approval status visible in pack metadata.

### Phase 4: Accountant Portfolio

- Add accountant-client access model.
- Add consent and scoped delegation.
- Add portfolio dashboard with client compliance status, deadline risk, failed certifications, and filing readiness.

### Phase 5: Real Adapter Pilot

- Choose Cameroon or Côte d'Ivoire.
- Obtain verified technical specs and legal review.
- Implement one real adapter behind feature flags.
- Pilot with 5 to 10 accountant/CGA design partners.

### Phase 6: VAT And Filing Drafts

- Generate VAT draft from posted ledger/tax accounts.
- Reconcile fiscal documents to ledger postings.
- Export filing-ready evidence with hash and audit record.

## Non-Negotiable Guardrails

- No fiscal document finalization without tenant scope.
- No final legal number assigned client-side.
- No certified document mutation after issuance.
- No direct tax authority payload built from client-submitted totals.
- No statutory report totals from operational dashboards.
- No DGI/FNE credential changes without fresh auth and audit.
- No adapter launch without country-specific legal/accountant validation.
- No offline sale treated as fully certified until authority certification succeeds.

## Success Criteria

The first production-ready compliance slice is successful when:

- A POS sale creates a ledger-backed fiscal document.
- The fiscal document is traceable to `SalesOrder`, `Payment`, `LedgerPostingBatch`, `JournalEntry`, and `AccountingSourceLink`.
- A sandbox adapter can certify, reject, and retry idempotently.
- The UI shows certified, queued, failed, and manual fallback states.
- A failed certification does not corrupt the sale, payment, inventory, or journal state.
- A duplicate retry cannot create a duplicate certified document.
- Accountant users can review client compliance status without gaining unauthorized operational access.

## Strategic Conclusion

The Compliance Layer is one of the strongest moat opportunities for AqStoqFlow. It should become the bridge between operational retail truth and statutory compliance truth. The product should not merely "generate invoices"; it should prove, preserve, reconcile, and certify business events in a way that accountants, SMB owners, and eventually tax authorities can trust.

The right order is: ledger-backed source truth first, sandbox certification second, country adapter third, accountant channel fourth, pan-OHADA expansion fifth.
