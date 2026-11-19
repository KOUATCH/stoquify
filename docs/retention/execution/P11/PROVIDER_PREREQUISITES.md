# P11 — One-provider prerequisite packet

18 October 2026. **Prepared hypothesis, not provider selection or integration execution.** No tender-volume/customer evidence, credentials, signed provider contract or live settlement is supplied by P01/P03. P20 is not run. [Country matrix](COUNTRY_SUPPORT_MATRIX.md); [official sources L05–L07](evidence/PRIMARY_SOURCES.md).

## Candidate decision

MTN MoMo and Orange Money are **unranked candidates**. Official product information provides discovery context for both; it does not prove this tenant's contractual eligibility or the needed statement interface. Other provider codes in the Cameroon pack remain unvalidated, not rejected or ranked. Do not infer market share or customer preference from code enums, public marketing or synthetic fixtures.

**One possible P20 job:** import one Cameroon merchant account's **MTN MoMo collections settlement statement**, retain source evidence, and prepare a reconciliation run for an independent finance reviewer. MTN is a concrete design placeholder, not a winner; replace only after evidence-based selection. Start with an authorized statement file if a documented, representative export exists. Automatic retrieval is conditional on an official accessible interface. Public collection API descriptions do not establish a statement API. No charge initiation, payout, refund execution, customer credential capture or automatic sign-off is included.

Commercial hypothesis: reduced manual statement entry and fewer unexplained settlement differences may increase recurring finance value. Neither benefit nor usage is measured. Do not extend the initial live checkout tender envelope merely by preparing this job.

## Evidence needed before ranking

Product/finance owner must obtain separately authorized, minimized pilot data for a defined representative period (proposed four weeks including relevant closing days; extend when seasonality makes it unrepresentative). No collection occurs in P11. Record per provider/account/site: eligible tender count and gross value, settlement value, reversals/fees, unmatched value, manual reconciliation minutes, data completeness and access constraints. Separate real from demo, cash from electronic tenders, sales time from settlement time, and confirmed from unknown outcomes.

Rank only after volume and operational pain are established. Consider verified tender share, exception burden, attainable official data access, commercial/support readiness and implementation risk; retain raw denominators and missing-data caveats. Do not set an arbitrary market-share score or select on synthetic data. If access or volume cannot be established, keep a manual evidence workflow and defer a native connector.

## Current reusable boundaries

| Source anchor | What can be reused | What it does not establish |
|---|---|---|
| `services/payments/adapters/mobile-money-hmac.adapter.ts:132` | Canonical payload/HMAC, timestamp window and parsing interface | Native provider signature protocol; its `x-provider-*` headers must not be attributed to MTN or Orange |
| Same file `:175` | JSON/simple CSV normalization, dates/direction/amount/fees and line fingerprint | Real exported columns, quoted CSV dialect, encoding, units, completeness, balances or statement authenticity |
| `actions/payments/reconciliation.actions.ts:180` | Protected import with `payments.reconciliation.import`, server org/user and selected account | Production provider onboarding; provider name passed to generic adapter is not connector implementation |
| `services/payments/statement-import.service.ts:80`, `:123` | Tenant/account-scoped import, retained file/hash, duplicate handling, transaction/close integration | Runtime/provider acceptance in P11; no DB run performed |
| `services/payments/provider-operations.service.ts:32` | Retained operation intent, replay stages, separate reconciliation and review; `:90` retires automatic import-and-sign | Provider settlement attestation, automatic financial approval or payment execution |
| `services/payments/provider-event.service.ts:145` | Account lock, event/evidence and close-invalidation boundaries | Exhaustive live callback handling or official webhook route contract |

Exact files and hashes: [source evidence](evidence/SOURCE_REVIEW.json). Inspected HMAC, event and statement test definitions use synthetic/mocked evidence; no current provider contract, sandbox or live test was performed.

## P20 readiness checklist

All below are **MISSING / OPEN**, with roles rather than invented assigned people. No credential values or customer samples belong in these docs.

| ID | Required input / acceptance | Accountable role | Blocks |
|---|---|---|---|
| I01 Demand | Named pilot merchant and product; tender volumes, pain, denominator completeness, approved narrow job | Product + finance owner | Selection and benefit claim |
| I02 Official protocol | Provider-issued current Cameroon product/version documentation; statement export/schema or retrieval entitlement, field dictionary, encoding/dialect, units/currency, dates/timezones, status lifecycle, IDs, pagination/completeness and revision rules | Integration lead | Parser/adapter design |
| I03 Commercial/legal | Merchant/technical-partner role, authorized account ownership, applicable contract/fees, limits, statement rights, data use, responsibilities and local approvals | Commercial/legal + merchant finance | Provider/account admission; BEAC framework alone is insufficient |
| I04 Representative samples | Authorized sanitized statement + corresponding independently controlled ledger/settlement sheet; normal, duplicate, reversal, fees, missing page, correction and multi-day settlement examples | Provider relationship owner + finance reviewer | Contract fixtures and exact expected outputs |
| I05 Access/security | Separate sandbox/production entitlements; least-privilege read scope for the job; vault references only; account-to-tenant binding; rotation/revocation owner, certificate/auth protocol, network/rate limits | Platform/security + integration | Any API execution; read-only file job may instead require authorized provenance/transfer process |
| I06 Settlement semantics | Gross versus net, fee timing, bank liquidation, timezone/cutoffs/weekends, FX if any, reversal/dispute treatment, authoritative balance/source and reconciliation equation | Finance/accountant + provider relationship owner | Match/tie-out and sign-off |
| I07 Operations/support | Named provider escalation and internal on-call/working hours, incident classification, retry/backoff, outage communication, manual fallback, recovery/replay procedure and evidence-access responsibilities | Support/platform owner | Supported launch; no external SLA invented |
| I08 Verification | Reviewed runner/disposable target; independent expected controls, sandbox permission, authorization for any later live statement reconciliation; no real money movement | QA + finance + integration | Claim beyond source/mock preparation |
| I09 Release decision | Candidate hashes/version, supported format/account envelope, limits, unresolved exceptions, rollback/disable plan, customer authorization and explicit acceptance | Programme + security/domain leads | Production rollout |

Do not use customer PIN/OTP/password in Stoquify or in test fixtures. If future provider protocol requires end-user confirmation, it is a separately scoped official flow. P11 does not procure credentials or submit an onboarding form.

## Planned verification and expected-result ownership

These cases are **NOT_RUN**. Independent expected values come from authorized statement/control evidence authored by finance, not the parser or matching implementation. Use synthetic cases first; actual private records require separately established authority.

| Case | Expected invariant / evidence |
|---|---|
| Exact statement conservation | Source row counts, accepted/rejected rows and gross/fees/net/balance movement match the independent sheet using the provider's reviewed sign conventions; missing periods/pages prevent completeness claims |
| Duplicate and conflicting revision | Same file/line replay produces no duplicate effect; same identifier with changed amount/source retains a conflict for review |
| Delayed / out-of-order / partial settlement | Statement chronology and provider status don't silently become payment truth; unexplained amounts remain visible and unapproved |
| Reversal, fee and settlement mismatch | Preserve source links and separate amounts; do not erase prior evidence or mark a sale/refund confirmed from a weak match |
| Currency / units / locale / CSV | Reject unsupported currency/precision; prove quoted separators, BOM/encoding, locale decimal/date and timezone parsing against the official format, not generic CSV assumptions |
| Authenticity and tenant scope | Wrong account/tenant/permission/expired credential denied; if signed transport is in scope, official signature bytes/timestamp/replay/rotation cases required; generic HMAC tests are insufficient |
| Import/matching failure and retry | Connection loss after possible commit resumes retained intent and confirms source/run state; no double import/sign; independent review remains required |
| Close / export / recovery | Late or corrected statement invalidates affected close proof; authorized evidence is retrievable with relationships and redaction after retry/restore |
| Provider outage / limits | Bounded retry and clear uncertainty; pause intake safely, retain audit/replay and manual statement path; never assume paid on timeout |

Report source, pure/mock, PostgreSQL, rendered operator, provider sandbox and authorized live statement evidence separately. The file-ingestion job may have no webhook or money-movement case; mark it not applicable with a reason rather than inventing a callback endpoint. If scope adds webhooks, status queries or retrieval later, I02 and the corresponding signature/outage cases become mandatory. Sandbox acceptance does not demonstrate production settlement or support.

## Measurement, fallback and handoff

Planned metrics: statement coverage = accounts/periods with independently complete accepted evidence divided by in-scope expected accounts/periods; unexplained settlement amount and oldest unresolved age; duplicate effects (target zero); independently reviewed false matches; manual reconciliation minutes per complete period; retries recovered without extra effects; time to reviewer acceptance. Segment by provider/account and completeness, preserve denominators; all baselines currently UNKNOWN.

Future fallback: pause the new adapter at its existing admission boundary, preserve ingested records/intent and audit history, use approved manual evidence import/review, and reconcile uncertain outcomes before resuming. Do not delete records or block customer exports. Provider execution/irreversible operations are excluded from this job. Current P11 recovery is document supersession only.

P20 may consume this job hypothesis and checklist after I01–I09 are resolved for the chosen scope. If no official statement format/access or customer volume evidence exists, it must return a blocked/deferred connector decision rather than promote the generic adapter. No later prompt or external action is authorized by this handoff.
