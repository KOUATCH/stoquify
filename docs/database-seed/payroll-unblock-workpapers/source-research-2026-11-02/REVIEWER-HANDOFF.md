# Payroll and historical AP source handoff — 2 November 2026

This preparation is ready for a qualified Cameroon reviewer. It retains additional official evidence and makes the remaining decisions concrete. It does not approve calculations, publish a country pack, change admission flags or run payroll.

The user explicitly confirmed that **signed reviewer decisions, independent fixtures and an approved calculation contract are not available yet**. The inspected repository working returns and templates are unsigned. That availability fact and the bounded repository search are recorded in [reviewer-return-inventory.json](reviewer-return-inventory.json). No additional confirmation is requested.

## Evidence completed autonomously

Seven official DGI PDFs and six provenance/search/error HTML responses were retained locally with SHA-256 hashes. The PDF files parsed successfully: 1,327 pages in total. Eight previously retained CNPS/DGI artifacts were rehashed. These are automated integrity checks, not an independent statutory review.

| Retained document | Pages | Purpose and limitation |
|---|---:|---|
| [2025 fiscal implementation circular](DGI-CIRCULAIRE-LF2025.pdf) | 68 | Supports amendment research for the 2025 finance law. The cover was visually inspected and bears 24 February 2025. It does not replace the complete 2025 CGI. |
| [2026 fiscal implementation circular](DGI-CIRCULAIRE-LF2026.pdf) | 107 | Supports 2026 amendment research. The cover was visually inspected and bears circular 008, 2 March 2026. The cover refers to law 2025/013, while the [Presidency's finance-law publication](https://www.prc.cm/fr/actualites/actes/lois/8092-loi-n-2025-012-du-17-decembre-2025-portant-loi-des-finances-de-la-republique-du-cameroun-pour-l-exercice-2026) identifies 2025/012. This citation discrepancy needs reconciliation; no corrected statutory identity was assumed. |
| [Indicative IRPP and other salary withholding table](DGI-BAREME-IRPP.pdf) | 70 | Official payroll calculation comparison candidate. The posting does not establish its exact applicable historical period or a complete approved formula. |
| [Indicative salary-base TDL table](DGI-BAREME-TDL.pdf) | 29 | Official TDL comparison candidate, subject to dated legal applicability and independent recomputation. |
| [2025 withholding designation order](DGI-RETENUES-SOURCE-2025.pdf) | 32 | Supports employer/entity applicability review. No designation of the synthetic organizations is inferred. |
| [2026 withholding designation order](DGI-RETENUES-SOURCE-2026.pdf) | 3 | Same scope for 2026. An absent runtime withholding configuration does not establish a legal exemption. |
| [CGI 2024 historical baseline](DGI-CGI-2024.pdf) | 1,018 | A baseline for a qualified amendment concordance. It is not a substitute for the 2025 consolidated code. |

Source URLs, exact retained byte lengths, hashes and retrieval times are in [retained-source-manifest.json](retained-source-manifest.json). PDF parsing and inspected page scope are in [pdf-inspection.json](pdf-inspection.json). Both circulars are scanned PDFs without extractable text in the inspected document scope; cover inspection is not a full article-level legal audit. Existing 2026 CGI and 2025 finance-law copies remain at their original paths, indexed by [existing-source-integrity-refresh.json](existing-source-integrity-refresh.json).

The missing **official consolidated 2025 CGI remains unresolved**. The current official navigation link and the original referenced URL both returned HTTP 404. All three pages of the official site's 2025 search were inspected; they exposed circulars, finance law and other documents, but no working consolidated 2025 code. The response evidence is retained. A non-government lookalike website and other countries' 2025 codes surfaced in broad search and were not accepted as Cameroon evidence.

## Exact reviewer work remaining

[source-gap-matrix.json](source-gap-matrix.json) lists all 15 rule paths in the existing expanded worksheet, the available evidence, remaining decisions and the 11 required scenario families. All proposed approval/effective-envelope fields remain null. The main missing decisions are:

1. Establish separate applicable rule windows for November–December 2025 and January–October 2026. Confirm source identity, provision, commencement, amendment/supersession and employer/workforce scope; a retrieval date or edition label is not an effective-date approval. October's planned month-end paydate is later than the original dataset observation cutoff and needs an actual-date decision before execution.
2. Approve the full employee/employer obligation inventory: CNPS branches and class-specific bases/ceilings; IRPP and CAC; CFC, FNE, RAV, TDL and any applicable exemptions or other charges. Existing contribution sources are retained but still need dated independent acceptance.
3. Approve compensation and employment treatment: allowances, benefits in kind, permitted deductions/recoveries, leave/absence, overtime, sector/collective terms and employer-specific evidence. The employment implementing instruments and applicable agreements are not supplied by tax tables.
4. Return the calculation contract with taxable/contributory bases, reliefs, rounding, tax year, complete YTD membership, same-day/off-cycle ordering, prior-employer history, retroactive changes and refund/correction semantics. Source research does not fill missing rule values or independent expected results.
5. Independently recompute the required fixtures, including period and YTD IRPP, corrections, component scenarios and composite register tie-out. Bind each result to exact source bytes, rule version, date, employer scope, inputs and expected outputs. Retain the reviewer's calculation evidence separately from implementation-generated results.
6. Accept declaration templates/schema, deadlines, correction procedure, recipient obligations and payment/receipt evidence. An export is not submitted/accepted status, and no external authority API is assumed.
7. Return actual reviewer identity/qualification/conflict evidence, signed decisions with included/excluded scope and review dates, the signed artifact and digest, and independent maker/checker identity/signature verification. The existing [working return](../review-decision.return.working.json), [maker/checker form](../maker-checker-approval.working.json), [source verification form](../source-hash-verification.working.json), [qualification form](../reviewer-qualification-conflict.working.json) and [fixture workbook](../fixture-review-workbook.working.json) are prepared inputs, not completed attestations.

After genuine returns exist, their normal review/preflight and publication gates must be inspected and executed by the owner against the final evidence. Engineering corrections, admission, ordered payroll execution and database verification remain separate work. Nothing in this folder authorizes changing `PENDING` to `APPROVED`, claiming expert identity, inventing signatures or silently enabling statutory calculation.

## Historical AP decision

[AP-2025-ADMISSION-FINDING.md](AP-2025-ADMISSION-FINDING.md) documents the current resolver and publication contract. A `SOURCE_CHECKED` VAT envelope can technically resolve if placed in a published registry pack; it does not have independent signature enforcement. The default full Cameroon validator also requires 17 parameter paths, so a VAT-only pack is not a drop-in approved publication. The retained historical baseline and amendments support reviewer preparation; they do not justify cloning/backdating the 2026 pack or making the historical invoices appear legally qualified.

## Verification scope

- Source inspection: current AP resolver, registry, effective-envelope selection, schema/publication validation, Cameroon provenance and work-register P17; hashes retained.
- Local evidence: seven new PDFs parsed; hashes checked; two circular covers rendered and inspected; eight existing source artifacts rehashed. Retrieval failures are preserved as failures.
- Workflow contract: passed; 196 package scripts remain outside its reviewed manifest. No application commands were executed by that check.
- Mocked tests, real database tests, application browser verification and reviewer acceptance: not performed in this preparation lane.

The parent owns shared-register/report updates and current database findings. This folder contains source preparation only; the shared register, completion packet, runtime packs, engine and database were not edited by this lane.
