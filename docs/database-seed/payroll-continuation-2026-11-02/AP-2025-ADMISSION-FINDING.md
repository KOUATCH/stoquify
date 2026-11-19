# Historical AP admission finding — 2 November 2026

Source inspection only. No historical pack, registry entry, approval flag, tenant setting, invoice or database row was changed.

The current runtime would accept a `SOURCE_CHECKED` VAT envelope inside a registered `PUBLISHED` pack if it resolves for the invoice date. That behavior does **not** establish legal-owner approval, and a minimal VAT-only pack would not pass the ordinary full Cameroon publication validator without additional design work. Publishing one now would exceed evidence preparation and rely on a gap between resolver enforcement and the documented publication requirement.

| Current owner | Exact behavior and consequence |
|---|---|
| `services/purchasing/ap-control.service.ts:513` | `resolveAPCountryPackStatus` obtains organization country, tax regime and optional pinned pack. It resolves `taxes.vat.standardRateBps` for the document date. A failed VAT resolution returns `UNRESOLVED`; positive input tax makes operator action mandatory. It does not independently compare the supplied invoice tax with a legally classified taxable base. |
| Same service, withholding branch | Resolves `taxes.withholding.supplierPayments` separately. Any failure becomes `NOT_CONFIGURED`, while overall VAT status can remain `RESOLVED`. This is not proof that withholding is inapplicable. |
| `services/regulatory/country-packs/registry.ts:4` | The registry is static source and contains only the existing Cameroon pack. No database/API publication workflow was found in this owner. Adding a historical pack is a code change. |
| `services/regulatory/country-packs/resolve.ts:63` | Unpinned lookup requires `PUBLISHED` and a covering header window. A tenant pin selects that version and still requires a covering parameter envelope; merely adding another pack will not fix a tenant pinned to the 2026-only version. |
| Same resolver, effective-envelope branch | Requires a matching envelope and nonempty legal reference. It returns `verificationStatus` but does not require `EXPERT_REVIEWED`, a reviewer signature or independent fixtures. Its explicit capability rejections are `NOT_SUPPORTED`, `NOT_YET_SUPPORTED` and `OUT_OF_SCOPE`. |
| `services/regulatory/country-packs/validation.ts:138, 913` | Normal validation checks schema, canonical hash, references, effective windows and required parameters/fixtures. The default Cameroon required-path list has 17 entries across VAT, payroll, identifiers, filing, holidays, payments, e-invoicing and labels. A VAT-only pack does not satisfy that default contract. `canPublish` is a validation result for a pack already marked published, not a recorded human acceptance ceremony. |
| `services/regulatory/country-packs/cameroon.ts:10` | The existing source provenance explicitly requires legal-owner approval before statutory publication. Existing 2026 runtime permissiveness is not authorization to invent or backdate 2025 acceptance. |
| Work register package P17 | Requires applicable reviewed source and effective version, qualified evidence affecting runtime admission, and blocking unsupported/unreviewed cases. No genuine approved 2025 envelope was found; the user confirmed reviewer decisions are unavailable. |

Before the historical taxable invoices can be honestly completed, supply:

1. The official consolidated 2025 CGI, or a qualified legal owner's complete, retained amendment concordance from an authoritative baseline through the actual November/December 2025 transaction dates. The 2024 CGI, 2025 finance law and 2025 circular are now available, but their presence does not complete that concordance.
2. Accepted article-level treatment for the actual purchased goods/services: rate and additional levies, base, exemptions, input-tax deductibility and any withholding designation. Retained designation orders are candidates; no synthetic employer's legal designation is implied.
3. A dated VAT scope and approved publication record, plus independent expected invoice calculations including boundaries and exemptions. No cloned 2026 formula or assumed unchanged law.
4. A reviewed runtime design that either meets the existing Cameroon publication contract or explicitly supports a narrow historical VAT capability without weakening other gates. Preserve immutable historical packs and explicit effective periods.
5. Verification of each tenant's pin and each affected invoice date, then normal invoice approval/posting/recovery with independent actors, tax reconciliation, existing duplicate/idempotence safeguards and retained proof.

The earlier evidence index recorded 18 country-setup failures for November/December 2025 (three core organizations, three invoices per organization per month). This handoff does not requery the database or claim that all 18 remain in the same current state. Current counts belong to the parent execution/verifier lane.

Source hashes inspected for this conclusion are retained in [source-inspection-provenance.json](source-inspection-provenance.json). Official recovery attempts and their exact response bytes/hashes are in [cgi-2025-recovery-attempts.json](cgi-2025-recovery-attempts.json).
