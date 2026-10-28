# POS 9+ Decision Register

Version: GOV-01-2026-07-20

Status: BLOCKED — 0 of 8 decisions approved

| ID | Decision | Recommended decision | Accountable approval | Principal blockers |
|---|---|---|---|---|
| D-01 | STORE_CREDIT disposition | Disable, hide, and reject server-side now; treat an internal liability ledger as a separate governed program | Product + Payments/Accounting; CFO/Controller | HON-01, PAY-01, RET-02; G1/G6 |
| D-02 | Physical active-session boundary | Explicit physical register/terminal claim with one active terminal session and one active drawer claim enforced in DB; cashier is actor, not lock | POS Operations + Data/Platform Architecture | SEC-01, SH-01, SH-02, DEV-01; G2/G5 |
| D-03 | First electronic provider | Pilot one named provider in one country with sandbox, signed webhook/status query, reversals, statements, and kill switch | Payments + Treasury/Reconciliation + Security | PAY-02/03/04, REC-01, DEV-01, RCP-01 |
| D-04 | Offline tender/risk policy | Bounded cash-only pilot after independent G3/G4 PASS; no electronic offline without provider certification | Risk/Product + Offline Architecture + Finance | OFF-01 through OFF-06; G1/G3/G4/G5/G6/G8 |
| D-05 | Hardware/browser matrix | Certify a narrow named browser/OS/scanner/printer/drawer/terminal matrix first | POS Operations + Device QA/Support | DEV-01, A11Y-01, CERT-02 |
| D-06 | Returns/refund policy | Partial/full, supervised cross-shift, policy-bound cross-location, cash availability, provider outcome states, fiscal corrections, fresh auth, and risk-based maker-checker | Retail Ops + Controller + Payments/Risk | PAY-04, RET-01/02/03 |
| D-07 | Country/currency/fiscal/language scope | Certify one launch country first with EN/FR, approved XAF/minor units, tax/fiscal labels, rounding, and receipt-correction rules | Country Product + Controller/Tax Counsel + Localization | PAY-01, RCP-01, LOC-01; G1/G6/G7 |
| D-08 | POS 9+ SLOs | Baseline on the approved matrix, then approve percentile scan/search/render/charge/replay/recovery and availability/error budgets | Product/SRE + Frontend Performance + Support | UX-03, OPS-01, CERT-01/02, REL-01 |

## Approval record required

Each decision remains unapproved until a record contains: chosen option, rationale, accountable approver, effective version/date, expiry or review date where relevant, evidence links, affected capabilities, and rollback or disablement policy.

## Active hold

HP-1 remains active. No provider or offline implementation may begin until D-01, D-02, and D-07 plus the G1/G2/G5 design contracts are approved.
