# AF11 — Obligation source register and refresh procedure

**Date:** 20 October 2026. **Scope:** technical operational pilot. No statutory definition is qualified or enabled for verified compliance. Existing repository provenance is retained as discovery evidence; this task does not assert a fresh official-source or professional review.

| Definition | Classification | Reused source and effective metadata | Current admission |
|---|---|---|---|
| CLOSE_EVIDENCE_COLLECTION | Nonstatutory operational reminder | Existing AccountingPeriod and ClosePackExport; local catalog `close-evidence-collection-v1` | Operational target, assignment to self, applicability and independent artifact review. Fulfillment means the collection task was reviewed; no Close certification |
| CM_VAT_MONTHLY | Regulatory review required | Static Cameroon pack `CM-2026.1`, effective from 1 January 2026; header source pass 11 June 2026 | UNKNOWN; no legal deadline computation, tax calculation, verified obligation or filing action |
| CM_CNPS_EVIDENCE | Regulatory review required; restricted payroll metadata | Same pack; existing PayrollDeclaration / PayrollDeclarationEvidence records and their original domain lifecycle | UNKNOWN; client-local payroll reporters may attach retained evidence; firm views redact its identity and notes. No declaration transition |

## Existing official provenance, not a current legal conclusion

The source URLs below come from `services/regulatory/country-packs/cameroon.ts`. Its own review text requires qualified independent approval. `PUBLISHED` and `SUPPORTED` labels are insufficient for this register's statutory gate. The existing regulatory capability service independently distinguishes authoritative production resolution from unreviewed metadata; AF11 does not override it.

| Existing reference | Recorded source | Repository date and limitation |
|---|---|---|
| DGI CGI | [Code général des impôts, 2025 reference](https://www.impots.cm/fr/code-general-des-impots-mis-jour-au-1er-janvier-2025) | Retrieved 11 June 2026 in the pack. A 2025 reference does not establish the current 2026 obligation |
| DGI calendar | [Calendrier fiscal](https://www.impots.cm/fr/calendrier-fiscal) | Retrieved 11 June 2026 in the pack. Current scope, deadlines and exceptions were not approved in AF11 |
| CNPS contribution decree | [CNPS-hosted decree](https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes.pdf) | Existing legal-reference retrieval 11 June 2026; parameter source review 26 June 2026. No new contribution rule is implemented |
| CNPS employer rules | [Règles générales pour les employeurs](https://www.cnps.cm/fr/employeurs/regles-generales-pour-les-employeurs1.html) | Same existing source trail; qualified country approval remains required |

The technical catalog uses the pack header's dated review and a conservative **90-day refresh policy**. This is an internal evidence-maintenance policy, not a statutory deadline. The current header review is expired under that policy. Payroll parameter review dates do not silently promote the whole obligation catalog.

Every source snapshot includes the country, catalog version, existing pack version/hash, effective dates, retrieval dates and official URLs. The current source hash is recomputed server-side. Historical snapshots remain immutable. No caller can supply a statutory-verified label, qualified-review identity, source URL or live-acceptance flag.

## Refresh and expiry procedure

1. The country compliance owner retrieves current official documents, recording retrieval date, publication/effective dates, exact applicability and document digests. Resolve conflicting or unavailable sources explicitly.
2. A qualified independent country reviewer records credentials, scope, reviewed version, conclusions and supporting evidence. Reuse the existing country-pack review processes where applicable; payroll intake is not a blanket approval of VAT obligations.
3. Engineering validates reviewed applicability and deadline examples, country/profile boundaries and transitions. Introduce only the approved definition/version through the existing country-pack publication controls. AF11 currently contains no production statutory publication path.
4. Changing a source version/hash or the client's country changes the register source hash. Existing entries become UNKNOWN with a visible source-change warning. Re-save applicability and operational targets with a reason; do not overwrite history or inherit the old evidence review.
5. An independent reviewer examines the new preparation. An expired/unreviewed/unsupported regulatory source remains UNKNOWN even when an artifact was reviewed. No notification, manual receipt or sandbox response removes that gate.
6. To stop operational work, record a reasoned non-applicable revision for the operational reminder, or restrict new writes through the existing role/module controls. Retain history and source references. For statutory candidates, keep the unknown coverage visible; do not mark them complied.

Rules are not implemented before country approval, so this phase adds no legal rates or computed legal deadlines requiring a new authoritative source claim. [Country-review gaps](COUNTRY_REVIEW_GAPS.md) identify the exact remaining external work.
