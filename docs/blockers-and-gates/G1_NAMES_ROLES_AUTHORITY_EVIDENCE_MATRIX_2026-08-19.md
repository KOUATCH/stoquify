# G1 names, roles, authority and evidence matrix - 2026-08-19

## Executive result

G1 has **11 decisions, 33 role obligations and 17 distinct required roles**. The frozen decision structure is complete, but the repository currently proves **zero G1 approver names, zero G1 authority assignments and zero authentic approvals**.

The correct current result is:

- technical G1: **13/13 passed**;
- approved decisions: **0/11**;
- completed role obligations: **0/33**;
- G1: **blocked on governance input**;
- G2: **not yet eligible**;
- production authorization: **false**.

The names found in the authorization DOCX are retained below as candidate/conflict provenance only. None may be copied into the live G1 register.

## Authoritative contract binding

| Field | Verified value |
| --- | --- |
| Artifact | `STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817` |
| Version | `0.2.0` |
| Path | `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json` |
| SHA-256 | `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db` |
| File size | 18,732 bytes |
| Production authorized | `false` |

Any contract-byte or selected-option change creates a new hash and invalidates approvals for this artifact.

## Evidence source inventory

| Source | SHA-256 | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Frozen G1 contract JSON | `11434eb...a36db` | Decision IDs, titles, options, exact roles and fail-closed scope | Human authority or approval intent |
| Live approval register | `49e19d...e8340` | Exact contract binding and current empty approval state | Any completed approval |
| Working template | `00494c...1fad0` | Structurally correct 11-decision/33-role preparation content | Identity, authority, authentication or signature evidence |
| Authorization DOCX | `cdca6c...26f3f` | Stable candidate names, declared roles and two media-byte hashes | Trusted identity, exact G1 authority, signature mapping or decision approval |
| DOCX validation JSON | `638ca4...39fdf` | OOXML inspection, identity conflicts and zero-credit disposition | A replacement for authority or approval evidence |

Full source paths:

- `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`
- `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`
- `docs/blockers-and-gates/G1_DECISION_APPROVAL_WORKING_TEMPLATE_20260818.json`
- `docs/Compliance/Complaince authorization validation.docx`
- `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-18/compliance-authorization-document-validation.json`

## Every discovered name

| Name | Documentary assertion | G1 classification | Authority evidence | May enter live G1 register? | Required resolution |
| --- | --- | --- | --- | --- | --- |
| SANGO MALO | Migration operator; database administrator / engineering lead | `NOT_RELEVANT_TO_G1` | None | No | Keep separate from G1. Resolve the migration-maker conflict and prove migration-specific identity/authority if used there. |
| MAXIMILLIANO BONGA | Migration checker; database administrator / engineering lead | `NOT_RELEVANT_TO_G1` | None | No | Keep separate from G1. Prove migration checker identity, authority and independence if used there. |
| Tamen Marceline | Maker | `CONFLICTING_IDENTITY_OR_ROLE` | None | No | Resolve against SANGO MALO through an authoritative identity/appointment source. Do not map either image to either person. |
| Yonga Springfield | Checker | `CONFLICTING_IDENTITY_OR_ROLE` | None | No | Resolve against MAXIMILLIANO BONGA through an authoritative identity/appointment source. Do not map either image to either person. |
| KOUATCHOUA MARK | Product approver; Product Owner or Financial Controller | `MENTIONED_UNVERIFIED` | None | No | Provide a stable subject ID and one or more unambiguous, dated G1 authority appointments with scope and SoD result. |
| KOUATCHOUA MARCELINE | Controller approver; SYSTEM ADMINISTRATION | `MENTIONED_UNVERIFIED` | None | No | Provide explicit finance authority or designate a qualified replacement. System administration does not prove controller, treasury or accounting authority. |

The DOCX metadata naming KOUATCHOUA MARK as creator/last modifier proves authorship only. It does not prove that the author authenticated, intended to approve any D-01 through D-11 decision, or held the required authority.

## Signature-media disposition

The DOCX contains two handwritten-signature-like JPEG files:

| Package path | Bytes | SHA-256 | Placement | Approval credit |
| --- | ---: | --- | --- | ---: |
| `word/media/image1.jpeg` | 268,495 | `aa77607039406b919bef4d65fc16424aea9f45b10de39fa47415a98a1e8a864a` | Unlabelled paragraph before the Maker section | 0 |
| `word/media/image2.jpeg` | 180,993 | `cdfd3824056ea30ea941c0ed8395cf75ad07d632e53e1c7812c59c9f64072b29` | Same unlabelled paragraph | 0 |

There are zero OOXML digital-signature parts, zero certificate relationships, zero signature-origin relationships, zero detached-signature references and zero immutable approval identifiers. The images must not be extracted and reused as portable signature tokens.

## Distinct G1 roles and authority owners

| Required role | Obligations | Verified names | Who must resolve the role | Minimum authority evidence |
| --- | ---: | ---: | --- | --- |
| Product owner | 4 | 0 | Governance/product owner | Stable subject ID; dated Product owner appointment; G1 scope; SoD result |
| Financial controller | 5 | 0 | Governance/finance owner | Stable subject ID; explicit controller appointment; dates, scope and SoD |
| Payments owner | 2 | 0 | Payments governance owner | Stable subject ID; payment-policy authority and scope |
| Retail operations owner | 5 | 0 | Retail governance owner | Stable subject ID; accountable POS operating-policy appointment |
| POS architect | 1 | 0 | Technology governance owner | Stable subject ID; accountable POS architecture appointment |
| Security owner | 2 | 0 | Security governance owner | Stable subject ID; security decision authority; not merely administrator access |
| Treasury owner | 2 | 0 | Treasury governance owner | Stable subject ID; settlement/reconciliation authority |
| Risk owner | 2 | 0 | Risk governance owner | Stable subject ID; risk-acceptance authority |
| QA owner | 1 | 0 | Quality governance owner | Stable subject ID; support-matrix evidence authority |
| Support owner | 2 | 0 | Support governance owner | Stable subject ID; supportability/escalation authority |
| Qualified Cameroon country-pack reviewer | 1 | 0 | Country-pack governance owner | Stable identity; dated qualification; Cameroon scope; independence evidence |
| SRE owner | 1 | 0 | Reliability governance owner | Stable subject ID; SLO/error-budget authority |
| Order-to-cash product owner | 1 | 0 | O2C governance owner | Stable subject ID; end-to-end O2C appointment |
| Qualified accounting reviewer | 1 | 0 | Accounting governance owner | Stable identity; dated qualification and review scope |
| Inventory controller | 1 | 0 | Inventory governance owner | Stable subject ID; inventory-control authority |
| Fulfillment owner | 1 | 0 | Fulfillment governance owner | Stable subject ID; fulfillment-process authority |
| Accounting owner | 1 | 0 | Accounting governance owner | Stable subject ID; stock/COGS accounting-policy authority |

## Complete 33-obligation matrix

Every approver name and signature field below is `UNRESOLVED`. The canonical machine-readable rows are in `G1_33_OBLIGATION_FINALIZATION_REGISTER_2026-08-19.json`.

| Obligation | Decision | Exact role | Accountable name | Authority | Fresh auth | Signature/evidence | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1-D01-01 | D-01 Store-credit disposition | Product owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D01-02 | D-01 Store-credit disposition | Financial controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D01-03 | D-01 Store-credit disposition | Payments owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D02-01 | D-02 Terminal/session/drawer boundary | Retail operations owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D02-02 | D-02 Terminal/session/drawer boundary | POS architect | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D02-03 | D-02 Terminal/session/drawer boundary | Security owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D03-01 | D-03 Electronic-provider disposition | Payments owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D03-02 | D-03 Electronic-provider disposition | Treasury owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D03-03 | D-03 Electronic-provider disposition | Security owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D04-01 | D-04 Offline-capture policy | Product owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D04-02 | D-04 Offline-capture policy | Risk owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D04-03 | D-04 Offline-capture policy | Retail operations owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D05-01 | D-05 Support matrix | Retail operations owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D05-02 | D-05 Support matrix | QA owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D05-03 | D-05 Support matrix | Support owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D06-01 | D-06 Refund/void policy | Financial controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D06-02 | D-06 Refund/void policy | Retail operations owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D06-03 | D-06 Refund/void policy | Risk owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D07-01 | D-07 Cameroon development profile | Product owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D07-02 | D-07 Cameroon development profile | Financial controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D07-03 | D-07 Cameroon development profile | Qualified Cameroon country-pack reviewer | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D08-01 | D-08 SLO/error-budget policy | SRE owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D08-02 | D-08 SLO/error-budget policy | Product owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D08-03 | D-08 SLO/error-budget policy | Support owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D09-01 | D-09 Delivery/invoice recognition | Financial controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D09-02 | D-09 Delivery/invoice recognition | Order-to-cash product owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D09-03 | D-09 Delivery/invoice recognition | Qualified accounting reviewer | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D10-01 | D-10 Reservation/goods issue/COGS | Inventory controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D10-02 | D-10 Reservation/goods issue/COGS | Fulfillment owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D10-03 | D-10 Reservation/goods issue/COGS | Accounting owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D11-01 | D-11 Cash/reconciliation/close boundary | Financial controller | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D11-02 | D-11 Cash/reconciliation/close boundary | Treasury owner | Unresolved | Missing | Missing | Missing | Not verified | Open |
| G1-D11-03 | D-11 Cash/reconciliation/close boundary | Retail operations owner | Unresolved | Missing | Missing | Missing | Not verified | Open |

## What a governance owner must return for each role

For each distinct role, return a controlled authority record containing:

1. The real accountable name for display and audit readability.
2. A stable identity-provider subject ID or another immutable identity identifier.
3. The exact G1 role label.
4. The organization/tenant scope.
5. A durable authority/appointment reference.
6. Appointment start and end timestamps.
7. Any delegation reference, scope and expiry.
8. A conflict-of-interest result.
9. A segregation-of-duties result, including allowed multi-role combinations.
10. For qualified reviewers, dated qualification and jurisdiction/domain scope.
11. The identity and authority of the person who verified the appointment.

Application authentication and RBAC may confirm who is logged in and what application permission they hold. They do not, by themselves, prove governance authority for a G1 role.

## What each signer must produce

For each assigned decision-role obligation, the signer must:

1. Review the exact decision, selected option, rationale, evidence paths, capability impact and fail-closed rollback policy.
2. See the complete frozen contract SHA-256, not an abbreviated value.
3. Re-authenticate through the approved organization-controlled workflow, preferably with MFA.
4. Deliberately select approve or reject within ten minutes of fresh authentication.
5. Produce an immutable evidence record containing stable identity, exact role, authority reference, decision ID, selected option, contract hash and trusted timestamps.
6. Export the signed/attested evidence and audit trail without editing either file.
7. Provide the provider/envelope reference and the exact exported-evidence path or URI.

## What the independent verifier must produce

The verifier must be separate from the evidence producer and must:

- resolve the stable identity and authority record;
- verify role scope, dates, qualification and SoD;
- recompute the frozen contract hash;
- verify the decision and selected option;
- confirm `approvedAt >= freshAuthenticatedAt` and the difference is at most ten minutes;
- resolve the signature/envelope reference;
- recompute SHA-256 over the final evidence bytes;
- verify the audit trail and post-signature immutability;
- record a pass/fail decision, verifier identity, role, timestamp and evidence reference.

## When the register can be populated

Populate a live decision only when all three exact roles have passed every identity, authority, authentication, signature and independent-verification check. A decision with one or two approvals remains pending and receives no decision credit.

The live register is:

`docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`

It must remain untouched until authentic evidence exists.

## Exit condition

The names/roles blocker clears when governance has verified real people for all 17 roles and those assignments cover all 33 obligations. G1 clears only after the 33 authentic approvals are independently verified, imported under the 11 decisions and accepted by the actual G1 validator.
