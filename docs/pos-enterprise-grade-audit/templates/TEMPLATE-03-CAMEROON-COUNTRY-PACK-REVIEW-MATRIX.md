# Cameroon Country-Pack Review Matrix Template

Packet: `STOQUIFY-POS-PROD-GATE-<DATE>-<RUN_ID>`
Date of review: `YYYY-MM-DDTHH:MM:SSZ`
Reviewer: `<NAME> / <ROLE>`
Authority: `Qualified Cameroon statutory / fiscal specialist`

Scope:
- Organization: `Stoquify`
- Schema: `codex_pos_commit_result_cert_20260817`
- Host/DB: `<host> / <db> / <schema>`
- Review type: `Pre-production statutory/gap assessment`

## Review status legend

- `PASS`: Control implemented and evidenced
- `FAIL`: Control not implemented
- `N/A`: Out of scope by explicit approval decision
- `DEFER`: Planned for post-release with owner + date

## Matrix

| Control ID | Control topic | Requirement | Candidate behavior observed | Evidence path | Status | Remediation owner | Due date |
|---|---|---|---|---|---|---|
| CM-A | Receipt fiscal source | Receipt has immutable source evidence independent of delivery | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-B | Tax base and rounding | Tax/discount/rounding rules align with Cameroon requirements | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-C | Receipt numbering/sequence | Legal numbering and anti-repudiation controls are enforced | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-D | Payment state consistency | Unknown/pending states do not auto-close sales | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-E | Refund/void traceability | Corrections preserve original history and link evidence | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-F | Accounting journals | Sales, COGS, inventory, tax, fees balanced | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-G | Offline behavior | Offline replay does not assign final fiscal numbers | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |
| CM-H | Data residency boundaries | Country-specific legal data and evidence stored in approved locations | `<PASS/FAIL/N/A/DEFER>` | `<path>` | `<status>` | `<owner>` | `<date>` |

## Scope exclusions (must be explicit)

- Electronic capture: `<INCLUDED / EXCLUDED>`
- Offline device capture: `<INCLUDED / EXCLUDED>`
- Printer/cash drawer integrations: `<INCLUDED / EXCLUDED>`
- CRM/loyalty/recommendation engines: `<INCLUDED / EXCLUDED>`

## Findings summary

- Compliant controls count: `<n>`
- Non-compliant controls count: `<n>`
- Deferred controls count: `<n>`
- Total critical blockers for Cameroon statutory release: `<n>`

## Qualified decision

- Cameroon country-pack compliance result:
  - `COMPLIANT / CONDITIONAL / NON_COMPLIANT`
- Reviewer signature:
  - Name: `<NAME>`
  - Signature / certificate: `<signature>`
  - Signed at (UTC): `YYYY-MM-DDTHH:MM:SSZ`

## JSON payload (insert-ready)

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "POS-CM-PACK-REVIEW-<DATE>-<ID>",
  "gate": "G3A",
  "evidenceClass": "QUALIFIED_REVIEW",
  "candidate": {
    "commit": "0000000000000000000000000000000000000000",
    "tree": "0000000000000000000000000000000000000000",
    "dirty": false
  },
  "execution": {
    "command": "Cameroon country-pack review mapping and control trace",
    "environment": "review workspace",
    "startedAt": "2026-08-17T08:00:00Z",
    "finishedAt": "2026-08-17T09:00:00Z"
  },
  "result": {
    "status": "BLOCKED",
    "exitCode": null,
    "summary": "Cameroon country-pack review not yet finalized. Matrix completed for scoped controls.",
    "artifactPaths": [
      "<path to this completed template>"
    ],
    "findingIds": [
      "country_pack_cmr_pending"
    ]
  },
  "privacy": {
    "redactionChecked": true,
    "containsSecrets": false,
    "containsPaymentCredentials": false,
    "containsUnnecessaryPii": false
  },
  "limitations": [
    "Reviewer must confirm current statutory interpretation and attach supporting law references if required."
  ],
  "review": {
    "status": "PENDING"
  }
}
```

