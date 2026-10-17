# P01 — Proposed pilot scope

Run date: 13 October 2026. **PROPOSED planning envelope; not an approved live pilot or a support/certification statement.** P01 is complete as research. No customer was recruited or contacted and no environment was activated.

## Status meanings

- **CONFIRMED_SOURCE:** verified in current repository metadata/source only; no runtime or customer claim.
- **PROPOSED:** concrete default for future synthetic design/testing, requiring owner confirmation before relevant live work.
- **UNRESOLVED:** essential information/decision is unavailable.
- **EXCLUDED:** deliberately outside the proposed first pilot, even when some code exists.
- **UNSUPPORTED_SOURCE:** source explicitly limits the capability. Preserve its gate until independently established support exists.

## Customer and organizational envelope

| Dimension | Proposed choice and status | Prerequisite / owner |
|---|---|---|
| Country and segment | PROPOSED Cameroon retailer/distributor, one legal entity, 2–5 locations, recurring purchasing and an accountant/finance lead. A single-site fixture checks simplicity. | Product/domain owner must validate actual business jobs and applicability; D01/D05. CM-only bundled registry is CONFIRMED_SOURCE, not market validation. |
| Participants | PROPOSED owner/admin, location-scoped cashier, manager, stock/purchasing operator, finance reviewer and external accountant with scoped consent. One person may fill permitted roles, but preserve required independent approval. | D01/D04; use actual role codes and authority from source, not invented permission grants. |
| First local fixture | PROPOSED one synthetic organization with two synthetic sites and a second organization for denial cases; two items, customer/supplier masters and reviewed opening positions. P03 will implement fixtures. | No real names, customer records, payroll or credentials. This document creates no fixture records. |
| Language and money | PROPOSED FR primary and EN parity. Proposed XAF-denominated organization configuration, with source-owned precision and rounding. | D05; do not infer a statutory rounding/tax regime or uniform rules across OHADA countries. |
| Live customer count/dates | UNRESOLVED. No recruited organizations, rollout date, consent or paid offer established. | D13; relative days 1–30 are planning windows, not an active customer schedule. |

## Supported-scope proposal: jobs and financial boundaries

1. **Setup:** staged product/customer/supplier masters; location/role configuration; separately reviewed opening stock, AR/AP and ledger tie-out. Source confirms masters alone exclude openings/history. P03/P07/P13 must establish the complete cutover. Automatic historical transaction migration is EXCLUDED.
2. **Daily operations:** proposed cash checkout, receipt, cashier recovery, cash-return/void path, stock movements, receiving/partial receiving, approved adjustment and manager discrepancy review. Transfers are conditional on an actual multi-site need and verified lifecycle. P05/P06/P14 must prove each included path.
3. **Payment evidence:** retain recorded cash and relevant supplier/customer settlement evidence with source identifiers and reconciliation. Recording a transfer is not initiating it. Live provider API collections, disbursements, automatic settlement feeds and electronic refunds are EXCLUDED initially.
4. **Finance:** proposed source-linked reconciliation, exception ownership and an accountant-reviewed period close with retained pack. Actual accounting regime, tax applicability, mappings, review authority and reporting obligations are UNRESOLVED; P11 precedes supported financial-rule changes.
5. **Data rights:** proposed role-appropriate reports, authorized owner archive, attachment/evidence manifest and explicit access after cancellation. Complete archive and service lifecycle are UNRESOLVED until P09/P10/P16/P17. Preserve redaction and customer ownership; do not count incomplete portability as value.

### Named tender envelope

| Tender | Initial pilot proposal | Evidence/condition |
|---|---|---|
| CASH | PROPOSED primary checkout and local cash correction rail; supported status remains subject to runtime gates. | Source has cash allocation and correction branches. P05/P14 verify commit/retry/refund/shift tie-out. |
| ON_ACCOUNT / persisted CREDIT | PROPOSED synthetic characterization for existing receivables and control limits; **not initially promised as live checkout functionality**. | Source maps ON_ACCOUNT to CREDIT. Business owner must select credit policy and P13/P14 must prove balances, permissions and correction behavior before inclusion. |
| CARD, MOBILE_MONEY, BANK_TRANSFER | EXCLUDED from initial live checkout/automatic reversal promise. May appear as explicitly labeled synthetic external-evidence cases later. | POS correction code rejects non-CASH/non-CREDIT payments pending provider reversal evidence. Generic adapter is not live integration proof. P11/P20 govern expansion. |
| STORE_CREDIT or other tenders | EXCLUDED until customer need and end-to-end control evidence justify a separate slice. | Presence in a type is not an acceptance test. |

### Named device/connectivity envelope

These are **proposed test targets**, not purchased hardware, installed-version observations or verified compatibility. Record exact browser/OS versions during the actual rehearsal.

| Role/device | Proposed test target | Required proof |
|---|---|---|
| Cashier terminal | Windows 11 desktop/laptop; Microsoft Edge Chromium, pinned version at rehearsal; 1366×768; keyboard/mouse. | P05/P08 rendered checkout and recovery. Receipt printing/scanner/cash-drawer drivers excluded unless separately inventoried and tested. |
| Manager/accountant | Same desktop browser at 1440×900; keyboard-only navigation checks. | P08/P15 role, FR/EN, focus, evidence and download tasks. No SUPER_ADMIN-only acceptance substitute. |
| Manager mobile | Android device with Chrome, exact OS/browser/model to be selected; 390×844 portrait test viewport. | P08 representative actual-device/viewport evidence. No promise for every phone or native mobile application. |
| Offline cash operation | One registered Windows/Edge terminal only as a **conditional** test target; planned brief disconnect, browser restart, delayed acknowledgement and reconnect. | P06 must demonstrate queue persistence, authority/policy expiry, replay and close handling. Offline readiness is UNRESOLVED; no unlimited outage or disconnected credit promise. |
| Bandwidth/latency | Controlled normal and constrained-network profiles, defined and recorded by QA before measurement. | Three-second p95 checkout is a proposed roadmap budget, not measured performance. Record profile/latency/payload conditions rather than inventing measurements. |

## Explicit exclusions and unresolved support

- UNSUPPORTED_SOURCE / EXCLUDED: unrestricted Cameroon payroll, production IRPP calculation, broad country packs and automated statutory/authority filing. CNPS draft and IRPP false flags remain in force.
- EXCLUDED: production money movement, native provider launch, regulated/specialist-sector promises, AI autonomous financial decisions, a new payment marketplace or device fleet programme.
- UNRESOLVED: deployment identity, runtime environment, actual backup/attachment recovery, alert delivery, support staffing, live billing/cancellation and current paid/customer adoption.
- UNRESOLVED: external accountant's applicable-regime decision, versioned national-rule review, legal data-retention/deletion requirements. P01 introduces no legal assertions or rule changes.

## Entry/exit and measurement contract

Local source work and synthetic preparation may use the proposed defaults when the user authorizes the corresponding prompt. Real data, provider activity and pilot operation still require specific authority and Gate A evidence. P01 is not M0 completion: P03 fixtures, source-to-ledger map and other predecessor outputs are still NOT_RUN.

Minimum proposed activation: reviewed opening setup, first confirmed cash sale and first reconciled shift; multi-location review for multi-site firms; first eligible accountant-reviewed close for the finance journey. Measure time from onboarding start and separately from data-ready state. No current baselines or attainment rates exist in P01. P02 will define/instrument outcomes.

Stop or narrow dependent work for unexplained money/stock differences, unresolved tenant exposure, missing reviewer authority, unverified recovery/portability, or an untested tender/device. Do not weaken controls to meet a date. Gate B remains separate from successful local demonstrations.

## Capacity and responsibility assumptions

The roadmap assumes 3 engineers, 0.75 QA capacity, 0.5 product/customer-success capacity and 0.2 accountant/domain-review capacity, with platform/security help. None is a confirmed assignment. Thirteen weeks imply 39 gross engineer-weeks, about 29 after a 25% reserve; 28 EW are planned. The prompt pack's first-month 17.5–27.5 engineer-days are initial slices, not full R01–R10 completion. Re-estimate at P12 after actual staffing and blockers are known.

Accountable roles: product lead (scope/offer), engineering lead (candidate/source ownership), domain/accountant reviewer (financial applicability and tie-outs), QA lead (fixture/device evidence), platform/security lead (isolation/recovery), data lead (archive/measurement), integration lead (provider boundary), support/commercial owner (service and lifecycle). Names, availability and approvals are UNRESOLVED; see DECISIONS.md.
