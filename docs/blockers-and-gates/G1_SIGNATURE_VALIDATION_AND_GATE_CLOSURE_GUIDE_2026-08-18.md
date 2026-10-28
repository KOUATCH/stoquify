# G1 signature validation and gate closure guide — 2026-08-18

## Plain-language outcome

The software-side G1 defect is fixed. The POS screen now offers cash only, and all 13 technical G1 checks pass.

G1 is still closed because the system needs real people, acting in the required roles, to approve all 11 frozen decisions. A pasted or photographed signature is only a picture. A valid approval must prove who signed, what authority they had, what exact decision and file hash they approved, when they authenticated, when they signed, and where the immutable signed evidence can be independently checked.

Frozen G1 contract:

- Artifact: `STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817`
- Version: `0.2.0`
- Path: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`
- SHA-256: `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`
- Live approval register: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`

Do not edit the frozen contract. Any change creates a different contract and invalidates approvals for the hash above.

## What makes a signature valid

Each approval must contain all of the following:

1. **Verified identity** — the signer’s real accountable identity, established through the organization’s identity provider or another authoritative directory.
2. **Verified role and authority** — the exact required role, plus a durable authority reference proving the person is allowed to approve in that role.
3. **Fresh authentication** — the signer re-authenticates, preferably with MFA, immediately before approval.
4. **Exact decision binding** — the signed content names the decision ID, frozen selected option, contract artifact ID, version, path, and complete SHA-256.
5. **Decision metadata** — rationale, effective version, review/expiry time, evidence links, affected capabilities, and rollback/disable policy.
6. **Timestamps** — `approvedAt` must be no more than ten minutes after `freshAuthenticatedAt`.
7. **Verifiable signature evidence** — an immutable e-signature envelope, digitally signed PDF/JSON, or detached cryptographic signature with an independently checkable reference and audit trail.
8. **Evidence hash** — the completed signature artifact is downloaded in its final form and hashed with SHA-256; that digest becomes `signatureEvidenceSha256`.

An image of handwriting can remain as a visual mark, but it receives no approval credit unless it is inside an authenticated, tamper-evident signing envelope that supplies the evidence above.

## Recommended signing method

Use an organization-controlled e-sign or approval workflow that can export an immutable signed artifact and audit certificate. The export should show the envelope or approval ID, signer identity, authentication method, signing time, decision text, exact G1 contract hash, and verification reference.

Acceptable patterns include:

- a digitally signed PDF with a trusted certificate and timestamp plus an audit certificate;
- a signed JSON approval envelope with a detached signature and certificate chain;
- an enterprise approval record protected by the organization’s identity provider, MFA, immutable audit log, and downloadable evidence bundle.

The signing workflow must not rely only on typed names, pasted signature images, email assertions, or a locally invented `approval://` value.

## Exact signing sequence

### Step 1 — establish the authority roster

An authorized HR, security, governance, or corporate-secretary function must produce a canonical role roster. For each signer, record:

- full legal or accountable name;
- exact G1 role;
- identity-provider name;
- stable subject ID or redacted authoritative reference;
- authority or delegation record reference;
- authority start/end date;
- conflict-of-interest and segregation-of-duties result.

The current DOCX names cannot be assigned automatically:

- `SANGO MALO` is described as a migration operator/proposed maker, not proven as a G1 decision owner.
- `MAXIMILLIANO BONGA` is described as a migration checker, not proven as a G1 decision owner.
- `Tamen Marceline` and `Yonga Springfield` conflict with the maker/checker identities above.
- `KOUATCHOUA MARK` is associated with product approval but the document ambiguously labels the role as Product Owner or Financial Controller.
- `KOUATCHOUA MARCELINE` is labelled SYSTEM ADMINISTRATION, which does not prove Financial Controller authority.
- The qualified Cameroon reviewer, independent Cameroon checker, qualified accounting reviewer, and several operational owners are not identified.

Resolve these conflicts in the authoritative roster before signing. Do not copy uncertain names into the live approval register.

### Step 2 — prepare the decision envelopes

Prepare one approval envelope per decision, or one signer envelope that explicitly enumerates every decision the signer is approving. Even when one signed artifact covers multiple decisions, the approval register must contain a role-complete approval entry under each covered decision.

There are 11 decisions and three required roles per decision: 33 decision-role approval entries. The same verified person may appear in several entries only when the authority roster proves that role and the segregation-of-duties policy permits it.

Use `docs/blockers-and-gates/G1_DECISION_APPROVAL_WORKING_TEMPLATE_20260818.json` as the preparation file. It is not approval evidence and must never be copied into the live register until the real fields and signed artifacts exist.

### Step 3 — perform fresh authentication

For each signer:

1. Start the e-sign/approval session through the approved identity provider.
2. Require fresh authentication and MFA rather than relying on an old browser session.
3. Record `freshAuthenticatedAt` from the trusted workflow clock.
4. Display the exact decision, selected option, and full contract SHA-256 to the signer.
5. Obtain the decision within ten minutes.
6. Record `approvedAt` from the trusted workflow clock.

If more than ten minutes passes, re-authenticate before signing.

### Step 4 — export and hash the final evidence

After completion:

1. Export the final signed artifact and its audit certificate without editing either file.
2. Store them in a durable, access-controlled evidence location.
3. Give the evidence an immutable `signatureReference`, such as the organization’s e-sign envelope ID or approval-record URI.
4. Compute SHA-256 over the exact final evidence file.
5. Put the lowercase 64-character digest in `signatureEvidenceSha256`.
6. Confirm the independent verification link or certificate validation succeeds.

Example hash command on Windows:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '<final-signed-evidence-file>'
```

### Step 5 — populate the detached approval register

For every D-01 through D-11 record, copy the frozen `selectedOption` exactly and fill:

```json
{
  "decisionId": "D-01",
  "selectedOption": "DISABLE_HIDE_AND_REJECT_STORE_CREDIT",
  "rationale": "Accountable rationale confirmed by the required approvers",
  "approvalStatus": "APPROVED",
  "effectiveVersion": "0.2.0",
  "reviewOrExpiryAt": "ISO-8601 timestamp",
  "evidenceLinks": ["durable evidence reference"],
  "affectedCapabilities": ["pos.store-credit"],
  "rollbackOrDisablePolicy": "Fail closed by hiding and rejecting store credit if the control or evidence becomes invalid.",
  "approvals": [
    {
      "accountableApprover": "Verified accountable identity",
      "approverRole": "Exact required role",
      "authorityReference": "Authoritative identity/role/delegation reference",
      "freshAuthenticatedAt": "ISO-8601 timestamp",
      "approvedAt": "ISO-8601 timestamp within ten minutes",
      "signatureReference": "Externally verifiable evidence reference",
      "signatureEvidenceSha256": "64-character lowercase SHA-256"
    }
  ]
}
```

The live register must keep its existing contract bindings:

- `contractArtifactId = STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817`
- `contractVersion = 0.2.0`
- `contractPath = docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`
- `contractSha256 = 11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`

### Step 6 — independently verify before gate credit

A person who did not prepare the register should verify:

- the contract file still hashes to `11434eb3...a36db`;
- every decision ID appears once;
- every selected option exactly matches the frozen contract;
- every required role appears for that decision;
- the signer identity and role match the authority roster;
- `approvedAt - freshAuthenticatedAt` is between zero and ten minutes;
- every signature reference resolves;
- every signed artifact hash recomputes correctly;
- no signature artifact was modified after signing;
- no unresolved identity conflict or prohibited role combination remains.

### Step 7 — rerun the gates

Run:

```powershell
npm run pos:g1:contract:gate
npm run pos:enterprise:program:gate
```

Expected result after authentic completion:

- G1 technical checks: 13/13.
- G1 decision approvals: 11/11.
- G1 overall: `PASSED`.
- The POS program’s first blocker moves from G1 to G2.
- G2 becomes eligible for its own assessment; it does not pass automatically.

Only after the wider candidate is clean and all release prerequisites exist should the team run `npm run policy:gates` and then `npm run verify:release`.

## Decision-by-decision signing matrix

| Decision | Frozen option | Required roles | Evidence focus |
| --- | --- | --- | --- |
| D-01 | `DISABLE_HIDE_AND_REJECT_STORE_CREDIT` | Product owner; Financial controller; Payments owner | Store credit hidden/rejected; liability-ledger dependency |
| D-02 | `TERMINAL_CURRENT_SESSION_CAS_PLUS_ONE_SESSION_DRAWER_OPENING_CLAIM` | Retail operations owner; POS architect; Security owner | Terminal/session ownership and drawer-claim limits |
| D-03 | `ELECTRONIC_TENDER_DISABLED_UNTIL_NAMED_PROVIDER_APPROVED` | Payments owner; Treasury owner; Security owner | Electronic tender remains disabled until provider approval |
| D-04 | `OFFLINE_CAPTURE_DISABLED` | Product owner; Risk owner; Retail operations owner | Offline capture fail-closed policy |
| D-05 | `EDGE_151_WINDOWS_10_25H2_SIMULATED_DESKTOP_PDF_ONLY_DEVELOPMENT` | Retail operations owner; QA owner; Support owner | Named development-only browser/hardware matrix |
| D-06 | `LINKED_COMPENSATING_FULL_SALE_REFUND_AND_VOID_CURRENT_SCOPE` | Financial controller; Retail operations owner; Risk owner | Full-sale corrections only; partial/maker-checker gaps acknowledged |
| D-07 | `CAMEROON_XAF_EN_FR_DEVELOPMENT_ONLY` | Product owner; Financial controller; Qualified Cameroon country-pack reviewer | Qualified Cameroon review and development-only limit |
| D-08 | `NO_PRODUCTION_SLO_UNTIL_D05_MATRIX_AND_MEASURED_BASELINE` | SRE owner; Product owner; Support owner | No production SLO claim before measured evidence |
| D-09 | `ORDER_CONFIRMATION_NON_POSTING_INVOICE_FROM_ACCEPTED_DELIVERED_QUANTITY` | Financial controller; Order-to-cash product owner; Qualified accounting reviewer | Revenue/invoice recognition boundary |
| D-10 | `RESERVATION_AFFECTS_AVAILABILITY_ONLY_PHYSICAL_ISSUE_OWNS_STOCK_AND_COGS` | Inventory controller; Fulfillment owner; Accounting owner | Reservation, goods issue, stock, and COGS ownership |
| D-11 | `KEEP_SESSION_DRAWER_BUSINESS_DAY_STATEMENT_RECONCILIATION_AND_CLOSE_SEPARATE` | Financial controller; Treasury owner; Retail operations owner | Separation of session, cash, statement, reconciliation, and close |

## What was technically liberated

- The POS UI cash-only mismatch is fixed.
- The focused G1 and POS program test suites pass: 2 suites, 4 tests.
- The affected POS component suite passes: 1 suite, 12 tests.
- Prisma schema validation passes.
- TypeScript type checking passes.
- G1 technical status is now `READY_FOR_ACCOUNTABLE_REVIEW` with 13/13 checks.
- The enterprise POS program controller is now `PROGRAM_CONTROL_PLANE_READY`.

## What remains blocked

- G1 remains `BLOCKED_0_OF_11` until authentic approvals are returned.
- The two existing handwritten-image files remain zero-credit evidence.
- G2 through G9 remain dependency-blocked.
- Production, statutory, provider, hardware, migration, pilot, and enterprise release authorization remain separate fail-closed gates.

