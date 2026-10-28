# Stoquify OHADA Compliance Deferral Architecture Review

Date: 2026-08-11  
Workspace: `E:\ohada saas\Focused projects\stoquify`  
Branch: `codex/service-boundary-burndown`  
Observed commit: `4a6cc16`  
Mode: read-only architecture, controls, product-sequencing, and gate audit plus this report write

## 1. Executive verdict

**Verdict: `CONDITIONALLY VIABLE`**  
**Confidence: high for the repository architecture and current local gate state; limited for external statutory, provider, and production-environment facts.**

Stoquify can safely defer **qualified OHADA/SYSCOHADA approval, live authority adapters, production statutory claims, and country-specific promotion evidence** while ordinary product development continues. It cannot safely delete the compliance stack or postpone all compliance architecture until the end.

The original hypothesis contains three different claims:

1. **Correct:** the production country-pack gate is currently embedded in the ordinary `policy:gates` chain. It stops that chain after eight preceding gates pass and hides sixteen downstream commands. This makes one statutory approval blocker look like a platform-wide engineering stop.
2. **Overstated:** removing the OHADA gate would not remove most of Stoquify's real blockers. Only one of the 25 commands in the current `policy:gates` composition is directly and exclusively the qualified country-pack production gate. When the sixteen hidden commands were run independently, fourteen exited successfully and two still failed: payroll immutability runtime verification and Prisma migration safety. Production release also remains blocked by secrets, a safe database target, destructive-migration approval, and current TypeScript errors.
3. **Incorrect:** it is not safe to develop the entire system first and integrate compliance at the end. Ledger/source-link contracts, monetary precision, immutable history, regulatory provenance, deferred fiscalization, idempotency, correction/reversal semantics, and fail-closed production states must be designed now. They are the seam that makes later country packs safe and affordable.

The right move is therefore **isolation, not removal**:

- restore an integration-only gate profile for normal development;
- retain the production `policy:gates` chain for promotion;
- keep a compliance-neutral accounting and controls kernel;
- keep the regulatory capability port, provenance schema, sandbox watermarking, outbox, and production fail-closed checks;
- defer qualified country-pack approval and live authority behavior until the relevant pilot or release boundary.

This is not a new architectural direction. The repository already selected it in `docs/country-pack/COUNTRY_PACK_REGULATORY_ISOLATION_TARGET_ARCHITECTURE_2026-07-26.md`, and much of the runtime implementation exists. The immediate problem is that the current `package.json` no longer exposes the documented integration chain or six aliases referenced by `scripts/policy-gates-integration-contract.json`.

## 2. Direct answer in plain language

Your instinct is directionally right about **development sequencing** but wrong about **removing the stack**.

The OHADA production approval gate should not block ordinary feature integration. Stoquify already has enough separation to let POS, inventory, customers, suppliers, finance, and many payroll/HR workflows progress with non-authoritative, visibly watermarked, or deferred statutory states.

However, removing compliance code would buy less than it appears to buy. It would expose the next independent blockers, weaken existing contracts, and create expensive retrofit work in payroll, fiscal documents, receipts, AP, close assurance, exports, schema migrations, and audit evidence. Restore the intended development-versus-release gate split and keep the minimum compliance spine in place.

## 3. What the repository currently treats as the OHADA compliance stack

The repository does not contain one removable monolith. It contains six layers.

| Layer | Current evidence | Deferral decision |
|---|---|---|
| Market and product positioning | `app/[locale]/ohada-os`, `components/marketing/ohada-os-landing.tsx`, OHADA labels in the module catalog | Can be changed independently of runtime correctness, but removing the label does not remove accounting or release blockers. |
| Country-pack configuration | `services/regulatory/country-packs/*`, Cameroon pack/constants, evidence manifests under `docs/HR-Payroll/evidence/country-packs/CM/` | Country-specific values and qualified approval can be deferred; the versioned contract and provenance format must remain. |
| Regulatory isolation boundary | `services/regulatory/ports/regulatory-capability.port.ts`, `regulatory-capability.service.ts`, published-pack adapter, runtime deployment classification | Must remain now. This is the seam that permits safe deferral. |
| Compliance kernel | `services/compliance/*`; Prisma `FiscalDocument`, `FiscalDocumentLine`, `ComplianceSubmission`, `ComplianceAdapterConfig`, and `ComplianceEvidence` | Keep the schema and contracts. Live adapters and authoritative outcomes can be deferred. |
| Domain integrations | POS fiscalization outbox, receipt states, payroll calculation/provenance, AP country-pack status, close/export evidence | Keep explicit pending/non-authoritative states. Defer only authoritative statutory effects. |
| Promotion governance | country-pack development/integration/production gates, expert-review packet, adapter pilot evidence, release evidence index | Split by maturity: integration safety in normal CI, qualified approval only in production promotion. |

The following are **not** OHADA-specific even when the product describes them as part of an “OHADA operating spine”:

- tenant isolation, RBAC, fresh authentication, segregation of duties, and abuse controls;
- inventory event ownership and valuation truth;
- balanced journals, posting batches, source links, reversals, and closed-period integrity;
- payment-provider ingestion, suspense, reconciliation, and cash truth;
- AP maker-checker and supplier-destination protection;
- append-only audit/evidence history, redaction, idempotency, and safe error boundaries;
- schema/migration safety, secrets, CI, runtime tables, and operational observability.

## 4. Repository boundary and coupling findings

### 4.1 Evidence that separation is already real

- `RegulatoryDecision` distinguishes `AUTHORITATIVE`, `NON_AUTHORITATIVE`, and `PENDING_COUNTRY_PACK`. Non-authoritative outcomes carry `NOT FOR STATUTORY USE`; production accepts only reviewed authoritative capability states.
- Production deployment classification overrides a caller-requested sandbox mode.
- The additive migration `20260726143000_regulatory_isolation_outbox` adds `FISCALIZATION` and `DEFERRED` without rewriting historical financial facts.
- POS tests explicitly prove that country-pack or fiscal-adapter failure does not roll back a completed sale. The sale commits payment, inventory, ledger, audit, business event, and a stable fiscalization outbox request while the fiscal result remains pending.
- The country-adapter pilot gate is 14/14 ready for internal sandbox development while explicitly listing four production-certification blockers.
- AP already represents `MISSING_COUNTRY` and `UNRESOLVED` country-pack states instead of fabricating statutory truth.
- Accounting settings make `countryPack`, `taxRegime`, `syscohadaClass`, and `syscohadaReference` optional. The core journal/ledger structures are not structurally dependent on a published Cameroon pack.

### 4.2 Coupling that prevents deletion or end-stage retrofit

- `FiscalDocument` requires a posted `LedgerPostingBatch` and stores country-pack version, schema version, resolution hash, source hash, canonical payload hash, and correction/reversal relationships. This is intentionally downstream of accounting truth.
- Payroll stores country-pack identity and resolution hashes across run lines, declarations, payments, posting proofs, and close evidence. Generic HR/presence can continue, but authoritative net pay, statutory liabilities, declarations, payment release, and certified close cannot be bolted on cheaply at the end.
- `OrganizationAccountingSettings` contains Cameroon-specific CNPS sector/risk fields. They are optional but show that the current accounting schema is not fully jurisdiction-neutral.
- `services/pos/pos.schemas.ts` imports `CAMEROON_PAYMENT_PROVIDER_CODES` directly from a country-pack constants file. The current regulatory boundary gate only prohibits direct imports of `resolve` and `registry`, so this country-specific schema coupling is outside its coverage.
- Workflow Assurance contains compliance/fiscal-document checks alongside ledger, POS, AP, payment, inventory, payroll, and close checks. Deleting the compliance models would require deliberate registry/version changes; it would not make the assurance system disappear.
- The module catalog calls the accounting module “OHADA Accounting,” but the compliance catalog entry uses `dependenciesFor("accounting")` rather than declaring and resolving a `compliance -> accounting` dependency. The intended dependency is described in prose and code behavior but is not enforced by the catalog.

### 4.3 Current integration-profile wiring gap

`scripts/policy-gates-integration-contract.json` defines a 26-gate integration profile. In the current `package.json`:

- `policy:gates:integration` is absent;
- `statutory:country-pack:integration:gate` is absent;
- `inventory:valuation:truth:gate` is absent;
- `regulatory:boundary:fail` is absent;
- `ap:fraud-control:gate` is absent;
- `country:adapter:pilot:gate` is absent;
- `payroll:presence:gate` is absent.

All six underlying gate scripts exist. Direct execution showed that the country-adapter pilot passes, while inventory valuation, AP fraud, and payroll presence are blocked only on policy wiring. The statutory integration gate is likewise blocked because the integration and promotion command paths are not independently exposed.

This contradicts the older implementation record `docs/country-pack/COUNTRY_PACK_REGULATORY_ISOLATION_IMPLEMENTATION_2026-07-26.md`, which says the integration chain is the default repository verification path. Current source and current gate runs are authoritative for this review.

## 5. Current gate inventory and classification

Legend: `P` passed, `F` failed, `C` exited successfully but is conditional for release, `H` hidden by the earlier statutory failure in the composed run and then executed independently.

| Gate and source | Run | Classification and trigger | OHADA-specific? | Upstream -> downstream | Removal/deferral effect | Disposition, evidence, confidence |
|---|---:|---|---|---|---|---|
| `policy:gates` (`package.json`) | F | Release orchestration; runs 25 commands sequentially | Partly; composition is not statutory, but contains the production pack gate at position 9 | Domain/static gates -> repository promotion signal | Removing the statutory command exposes later gates but does not make the chain pass | **Split**, do not weaken: integration chain for ordinary CI; full chain for release. Current run stopped at country-pack approval. High. |
| `inventory:boundary:fail` | P | Data-integrity boundary on direct stock mutations | No | Inventory/POS/AP mutations -> stock event kernel and valuation | Removal permits quantity and valuation divergence | **Retain blocking.** 0 active violations. High. |
| `service:boundary:fail` | P | Architecture/data boundary on direct Prisma and action-owned mutations | No | UI/actions/routes -> service-owned truth | Removal reintroduces cross-layer writes and unsafe transactions | **Retain blocking.** 0 active violations. High. |
| `api:guard:inventory:fail` | P | Security and tenant/API guard inventory | No | API routes/session context -> tenant-safe services | Removal exposes unguarded routes | **Retain blocking.** 16 routes, no active issue. High. |
| `public-identity:abuse:gate` | P | Security/privacy/abuse control | No | Public identity requests + HMAC config -> safe auth boundary | Removal weakens rate limiting and identifier privacy | **Retain.** 15/15 ready; local warning for missing release secret. High. |
| `ledger:close-truth:gate` | P | Core accounting invariant and close invalidation | No | Posted/reversed journals and POS postings -> close evidence | Removal permits stale or false close readiness | **Retain blocking.** 10/10; gate expressly does not certify SYSCOHADA mappings. High. |
| `payment:cash-truth:gate` | P | Payment, reconciliation, ledger, and audit integrity | No | Provider accounts/events -> reconciliation, suspense, certificates, close | Removal permits duplicate, unmatched, or drifted cash truth | **Retain blocking.** 12/12; not statutory certification. High. |
| `purchasing:ap:gate` | P | Maker-checker, stock, AP ledger, reconciliation, audit | No | PO/receipt/invoice/bank destination -> AP release and posting | Removal weakens fraud and three-way-match controls | **Retain blocking.** 11/11; not tax/statutory certification. High. |
| `offline:pos:replay:gate` | P | Distributed consistency, device trust, idempotency, provisional receipt truth | No, despite “fiscal” in name | Offline device events -> sale/stock/payment/ledger/fiscalization queue | Removal risks duplicate sale effects and false final receipts | **Retain blocking.** 16/16; authority certification explicitly out of scope. High. |
| `statutory:country-pack:gate` | F | OHADA/Cameroon production promotion and qualified-review evidence | **Yes, directly** | Source artifacts + hashes + expert approval -> authoritative payroll/fiscal outcomes and release evidence | Deferral unblocks normal CI only; removal would permit unsupported production claims | **Exclude from integration; retain blocking in release.** 11/12, only expert approval blocked. High. |
| `report:trust:export:gate` | H/P | Audit, provenance, RBAC, redaction, immutable export evidence | No; contains statutory coverage but is broader | Ledger/close/customer/accountant evidence -> exports and referrals | Removal permits misleading or tampered reports | **Retain blocking.** 35/35; explicitly not a statutory filing certification. High. |
| `role:cockpit:gate` | H/P | Product/workflow UX, permission filtering, state completeness | No | Role/session/module data -> Daily Digest | Removal can expose unauthorized or misleading workspaces | **Retain for the cockpit slice.** 9/9. High. |
| `settings:surface:fail` | H/P | Security/governance of settings surfaces | No | Settings routes/actions -> protected configuration | Removal weakens privileged configuration boundaries | **Retain blocking.** Zero-findings baseline preserved. High. |
| `workflow:assurance:runtime-check` | H/P | Runtime schema/migration presence | No | Prisma migrations/database -> assurance scheduler and incidents | Removal hides missing assurance tables | **Retain blocking.** 7/7 tables and 3/3 migration rows. High. |
| `workflow:assurance:release-gate` | H/P | Multi-domain operational assurance and close readiness | No; three checks are compliance-related | Ledger/POS/AP/payment/payroll/compliance/close definitions -> scheduler | Deleting compliance requires versioned registry changes, not wholesale gate removal | **Retain; parameterize check activation by module/maturity.** 38/38. High. |
| `kontava:moat:release-gate` | H/P | Tenant/RBAC/entitlement/evidence/backfill release quality | No | Seed/backfill/read models -> pilot evidence | Removal weakens tenancy, redaction, and evidence-grade guarantees | **Retain.** 8/8 scenarios, 6/6 backfill, 8/8 release groups. High. |
| `receipt:token:config-gate` | H/P | Security/privacy of public receipt access | No | Token helper + secret -> public receipt route | Removal exposes receipt data; production remains unsafe without secret | **Retain.** 4/4 locally, one production-secret warning. High. |
| `payroll:immutability:runtime` | H/F | Data integrity, audit, correction-only history | No | Dedicated test DB + migrations -> finalized payroll/payslip immutability | Removal permits rewriting finalized pay facts | **Retain blocking for payroll work.** Current run failed at migration deploy before triggers were checked. Medium-high until DB failure is diagnosed. |
| `hard-delete:fail` | H/P | Data retention, audit, and correction history | No | Runtime delete call sites -> retained business truth | Removal permits silent financial/evidence destruction | **Retain blocking.** 0 active unsafe findings. High. |
| `regulatory:hardcode:fail` | H/P | Country-pack modularity and regulatory provenance | Not exclusively OHADA; it protects any jurisdictional adapter | Runtime literals -> versioned regulatory resolution | Removal speeds coding by embedding volatile law in services, creating retrofit debt | **Retain in integration and release.** 0 findings, but coverage gap exists for country-specific constants/imports. Medium-high. |
| `demo:trust:fail` | H/P | Product truth and non-misrepresentation | No | Demo/mock/report data -> production UI and exports | Removal can expose fabricated production truth | **Retain blocking.** 0 active findings. High. |
| `error:boundary:fail` | H/P | Security/privacy/recoverability | No | Internal exceptions -> client-safe outcomes/logs | Removal leaks internals and destabilizes workflows | **Retain blocking.** 0 active findings. High. |
| `ci:release:gate` | H/P | Engineering/release configuration | No | CI workflow/Postgres/test isolation -> release verification | Removal weakens repeatability and secret isolation | **Retain blocking.** 11/11 configuration checks. High. |
| `prisma:migration:safety:gate` | H/F | Migration/data-loss safeguard | No | Migration history + approval registry + target -> deployment | Removal can destroy or strand financial data | **Retain blocking.** 13 destructive findings lack exact-hash approval. High. |
| `release:secrets:preflight` | H/C | Security and production integration configuration | No | Environment secrets/origin/providers -> public identity, receipts, statements, referrals | Deferrable locally; unavoidable before production | **Warn locally, block release.** Local command was conditional; release mode had 16 blockers. High. |
| `release:evidence:gate` | H/C | Audit/release evidence aggregator | Partly; statutory readiness is only one member | Readiness reports + environment evidence -> promotion packet | Removal erases visibility into statutory and non-statutory release gaps | **Retain; report blocker classes separately.** Current index has six release blockers, only one directly statutory. High. |

### Supplementary integration and maturity gates

| Gate | Current result | Classification | Decision |
|---|---|---|---|
| `statutory-country-pack-integration-gate.js` | F, 8/9 | Regulatory isolation contract; no expert approval required | Must block integration only when the safe boundary/wiring is absent. Restore its package alias and integration profile. |
| `statutory:country-pack:dev:gate` | F, 9/11 | Sandbox evidence, non-claims, and production-disable controls | Retain for statutory simulation work. Fix missing non-claim text and CI split; do not replace it with no gate. |
| `regulatory-boundary-gate.js` | P, 1,648 files | Import/dependency boundary | Retain and expand to cover country-specific constants such as the POS provider list. |
| `inventory-valuation-truth-gate.js` | F, 5/6 | Inventory valuation and class-3 reconciliation truth | Underlying checks pass; blocked on policy wiring. Non-statutory, always required for inventory/accounting work. |
| `ap-fraud-control-readiness.js` | F, 8/9 | Fraud/maker-checker and payment-destination controls | Underlying controls pass; blocked on policy wiring. Non-statutory, always required for AP release. |
| `country-adapter-pilot-gate.js` | P, 14/14 | Internal sandbox adapter readiness | Safe for development only; production still lacks official contract, expert review, credentials, and external conformance. |
| `payroll-presence-readiness-gate.js` | F, 12/13 | Payroll/presence source truth, correction, RBAC, and tie-out | Underlying controls pass; blocked on policy wiring. Not a statutory approval gate. |

## 6. What disabling OHADA would actually unblock

### Immediate mechanical effect

Removing only `statutory:country-pack:gate` from the current sequential command would allow `policy:gates` to proceed past position 9. It would then encounter:

1. payroll immutability runtime failure;
2. Prisma migration-safety failure;
3. conditional release-secret and release-evidence states.

It would not repair the current TypeScript failure in `app/[locale]/(dashboard)/dashboard/finance/finance-route-access.ts`, which contains JSX in a `.ts` file. It would not provision production secrets or a production database. It would not approve destructive migrations, complete provider/authority validation, produce a frozen release, or create real pilot evidence.

### Product capability effect

| Capability | Can continue without qualified OHADA approval? | Boundary |
|---|---|---|
| Inventory, customers, suppliers, generic sales, dashboards | Yes | Keep tenant, service, stock, error, migration, and UX gates. |
| POS operational sale | Yes in development/sandbox | Sale must retain ledger/payment/stock/audit/outbox truth; receipt must remain pending/non-certified. |
| Payment reconciliation and cash truth | Yes | External provider proof is still needed for production claims. |
| Generic accounting journals and internal reports | Yes | No SYSCOHADA/statutory filing certification; preserve source links, reversals, close invalidation, and provenance. |
| AP workflow | Yes | Tax/withholding/country-pack status may be unresolved; unsafe payment release must remain blocked. |
| HRIS, contracts, attendance, leave, compensation approvals | Largely yes | Preserve privacy, correction history, RBAC, and payroll-input provenance. |
| Payroll previews | Yes with versioned sandbox fixtures | Must remain non-payable, non-declarable, non-postable as authoritative statutory truth. |
| Final payroll, statutory liabilities, declarations, live payment | No | Requires reviewed country-pack semantics, provider readiness, and production controls. |
| Certified fiscal receipt/invoice | No | Requires authoritative pack and approved authority adapter or legally reviewed fallback. |
| Certified close/statutory export | No | Requires current authoritative statutory and reconciliation evidence. |

## 7. Counterfactual: deleting the stack

Deleting `services/regulatory`, `services/compliance`, their schema models, and their gates would cause more than the removal of legal checks:

- POS imports and fiscalization queue behavior would break or require new response contracts.
- Receipt status and delivery safeguards would lose the distinction between operational receipt and legal fiscal document.
- Payroll calculation, register proof, declaration, payment, and close services would lose their provenance contract.
- AP workbenches and read models would lose country-pack/tax/withholding resolution states.
- Workflow Assurance definitions would reference missing compliance/fiscal sources.
- Close and export evidence would need a new definition of certified versus operational truth.
- Prisma relations and immutable certified-evidence triggers would need destructive schema work.
- Previously deferred obligations would have no deterministic reconciliation path when the country pack returns.
- The compliance SaaS module and OHADA product moat would be removed commercially, not merely postponed technically.

Therefore, a full removal is not a reversible development convenience. It is a product and data-model fork.

## 8. Strategy comparison

| Dimension | Strategy A: remove and retrofit | Strategy B: neutral kernel + adapters | Strategy C: minimum compliance spine |
|---|---|---|---|
| Immediate speed | Medium: removes one visible chain stop but creates compilation/schema/contract work | High after the CI split is restored | Medium-high |
| Architecture debt | Very high | Low | Low-medium if the spine is explicit |
| Data migration exposure | Very high; late fiscal, payroll, provenance, reversal, and evidence backfills | Low; stable contracts and additive records | Low if schema/provenance are retained |
| Control gap | High | Low | Low for development; production remains intentionally blocked |
| Likely rework | POS receipts, payroll, AP, close, exports, schema, UI states, events, migrations | Primarily country values/adapters and promotion evidence | Country rules, real adapters, and production workflows |
| Reversibility | Poor | High | High |
| Suitable maturity | Disposable UI prototype only | Prototype through controlled pilot; production after promotion evidence | Prototype and internal/sandbox pilot |
| Recommendation | Reject | **Primary recommendation** | Use as the implementation shape of Strategy B |

### Recommended combination

Adopt Strategy B, implemented with the minimum spine from Strategy C:

- compliance-neutral accounting, payments, inventory, AP, audit, and close kernels;
- `RegulatoryDecision` contract and deployment-derived mode;
- versioned source/provenance fields and immutable hashes;
- deferred fiscalization outbox and reconciliation;
- visible `PENDING_COUNTRY_PACK` / `NOT FOR STATUTORY USE` states;
- production-only qualified-review, live-adapter, secrets, database, and promotion gates.

## 9. Contracts and invariants that must exist now

1. Organization/tenant scope on every financial and regulatory record.
2. Monetary decimals, currency ownership, rounding policy, and effective-date semantics.
3. Balanced journal and posting-batch contracts.
4. Immutable accounting source links and business-event identity.
5. Idempotency keys plus payload/source hashes for sale, payment, fiscalization, declaration, and provider operations.
6. Versioned regulatory decision and provenance contract, including country, pack/schema version, effective window, verification state, legal reference, and resolution hash.
7. Explicit authoritative, non-authoritative, pending, rejected, reversed, and superseded states.
8. Outbox-based authority/provider work outside the sale/accounting transaction.
9. Correction and reversal rather than mutation of finalized facts.
10. RBAC, fresh auth, maker-checker, redaction, audit, and secret-reference boundaries.
11. Deferred-obligation inventory and deterministic reprocessing when approved rules become available.
12. Migration/backfill/rollback rules that never invent missing evidence.

## 10. Recommended phased development sequence

### Phase 0 — Restore the verification split

- Reintroduce the six missing package aliases and `policy:gates:integration`.
- Point `verify:repo` and normal CI to integration safety.
- Keep `policy:gates` and `verify:release` as production-promotion paths.
- Preserve the qualified expert-approval gate in the release path.
- Add a test that proves integration can pass while production statutory approval remains blocked.

Exit: normal feature CI no longer requires qualified statutory approval, but it still enforces regulatory isolation and non-claims.

### Phase 1 — Freeze the neutral kernel

- Keep tenant, RBAC, stock, ledger, payment, AP, evidence, migration, error, and hard-delete gates blocking.
- Treat optional SYSCOHADA mappings as adapters/configuration, not journal identity.
- Move Cameroon-specific CNPS/account-provider choices out of generic accounting/POS contracts over time without rewriting historical data.

Exit: operational events have stable source, money, posting, idempotency, and correction semantics independent of country rules.

### Phase 2 — Complete safe deferral states

- Keep regulatory resolution behind the port.
- Expand the import-boundary gate to country-specific constants.
- Preserve the fiscalization outbox, queue health, and reconciliation path.
- Ensure every UI/read model distinguishes operational, pending, non-authoritative, and certified states.

Exit: country-pack unavailability cannot roll back valid operational transactions or create false statutory claims.

### Phase 3 — Finish non-authoritative vertical slices

- Complete inventory, customers, suppliers, POS, reconciliation, internal accounting, HRIS, and sandbox payroll workflows.
- Use versioned fixtures only where statutory values are necessary.
- Keep payment, declaration, legal receipt, and certified close actions disabled for non-authoritative outcomes.

Exit: feature-complete internal/sandbox platform with no production statutory claim.

### Phase 4 — Controlled pilot

- Run authenticated browser/accessibility and operational queue evidence.
- Validate provider, device, migration, recovery, and workload behavior in the selected pilot environment.
- If the pilot uses real payroll, legal invoices, live payments, filings, or authority effects, reactivate the corresponding country-pack and adapter approvals before that capability enters the pilot.

Exit: bounded pilot evidence tied to an exact revision and explicit capability matrix.

### Phase 5 — Country promotion and production

- Obtain qualified source review and signed checker evidence.
- Validate official authority/provider contracts and external sandbox behavior.
- Provision distinct secrets and a safe production database target.
- Resolve exact-hash migration approvals.
- Run full `verify:release`, production country-pack, release evidence, and promotion gates.

Exit: an authorized release decision; not an automatic legal or accounting certification.

## 11. Gate policy by maturity

### May be non-blocking for ordinary development

- qualified country-pack expert approval;
- live authority-adapter certification;
- production source-artifact approval;
- production secrets, origin, and provider configuration;
- production database-target proof;
- real pilot and operational promotion evidence.

These controls should be **excluded from the integration profile**, not deleted. They become blocking when their capability is activated or a release is promoted.

### Must remain blocking during development

- typecheck and focused behavioral tests for the changed slice;
- tenant/API/RBAC/fresh-auth boundaries;
- service and inventory mutation ownership;
- ledger balance, source links, reversals, and close invalidation;
- payment/cash reconciliation and AP maker-checker;
- offline replay/idempotency and outbox durability;
- payroll immutability when payroll is in scope;
- migration safety, hard-delete prevention, safe errors, redaction, and secrets non-disclosure;
- regulatory import/hardcode boundaries;
- sandbox watermarks, non-claims, and production fail-closed behavior.

## 12. Maturity thresholds

| Maturity | Statutory deferral status | Required boundary |
|---|---|---|
| Feature-complete prototype | Allowed | No real statutory or authority claims; fixtures clearly watermarked. |
| Internally usable development system | Allowed | Integration profile green; operational and accounting truth preserved. |
| Sandbox/internal pilot | Allowed | Exact scope, sandbox adapter, queue/recovery evidence, no real legal effect. |
| Real-money or real-payroll controlled pilot | Capability-dependent | Country rules become blocking before live payroll, fiscal receipt, declaration, payment, or filing is exercised. |
| Production SaaS with financial workflows | Mostly unavoidable | Production secrets, migrations, providers, statutory capability matrix, and release evidence required. |
| Legally operable OHADA product | Unavoidable | Qualified human review and jurisdiction-specific authority evidence required. |

Compliance therefore becomes unavoidable no later than the first pilot capability that produces a real statutory, payroll, payment, fiscal-document, filing, or certified-close effect. It does not need to block unrelated application development before then.

## 13. Command and result ledger

### Discovery and architecture evidence

| Command/check | Result | Notes |
|---|---|---|
| `git status --short` | passed | Worktree is heavily dirty; the report preserves unrelated changes. |
| Package-script inspection | passed | Current scripts and gate composition recorded. |
| `rg` graph/report/source discovery | passed | Graph, `what-next`, `innovation`, schema, gate, and coupling evidence inspected. |
| Required compliance/gate `rg -n` search | passed | Relevant paths found across app, actions, services, components, hooks, config, Prisma, scripts, and tests. |
| Initial sandboxed batched setup | blocked | Windows sandbox returned `helper_unknown_error`; consequential commands were rerun successfully with approved read/audit access. |
| One broad batched inspection | timed out | Rerun as focused commands; no evidence was inferred from the timed-out attempt. |

### Verification commands

| Command | Result | Evidence |
|---|---|---|
| `npm run policy:gates` | failed | Eight gates passed; chain stopped at `statutory:country-pack:gate` on `source_artifact_expert_approval`. |
| Sixteen downstream policy commands, run independently | 14 passed, 2 failed | Payroll immutability and Prisma migration safety failed; downstream status is no longer hidden. |
| `npm run workflow:assurance:runtime-check` | passed | 7/7 runtime tables, 3/3 migration rows. |
| `npm run statutory:country-pack:dev:gate` | failed | 9/11; non-claim text and integration/release command separation blocked. |
| Direct statutory integration gate | failed | 8/9; integration/promotion command independence blocked. |
| Direct regulatory boundary gate | passed | 1,648 files; no `resolve`/`registry` import violation. |
| Direct inventory valuation gate | failed | 5/6; only policy wiring blocked. |
| Direct AP fraud gate | failed | 8/9; only policy wiring blocked. |
| Direct country-adapter pilot gate | passed | 14/14 internal readiness; four production certification blockers remain. |
| Direct payroll presence gate | failed | 12/13; only policy wiring blocked. |
| `npm run typecheck` | failed | Syntax errors in untracked `finance-route-access.ts`, consistent with JSX in a `.ts` file. Not compliance-related. |
| `npm run prisma:validate` | passed | Active Prisma schema is valid. |
| `npm run release:secrets:preflight:release` | failed | 16 production environment/configuration blockers. |
| `npm run prisma:migration:release:preflight` | failed | 13 destructive findings lack approval; database URL/target also missing. |
| `npm run build:app` | skipped | Current typecheck and policy failures are upstream; build would add generated output and is unnecessary for this read-only architecture conclusion. |
| Broad `npm test` | skipped | No behavior was changed; focused gates and existing tests were inspected. No whole-suite certification is claimed. |
| `verify:repo` / `verify:release` | skipped | They would repeat known failures and artifact-producing commands; constituent failures were run directly for better classification. |

No command was treated as permission to delete or bypass a failed control.

## 14. Risks and unresolved questions

1. **Dirty-tree limitation:** this review describes the current shared workspace, not a clean committed candidate. `package.json`, gate scripts, services, UI, tests, and generated reports were already modified before the audit.
2. **Wiring drift:** the target and implementation documents say the integration chain is active, while current `package.json` does not expose it. The exact commit where this diverged was not reconstructed.
3. **Static-gate limits:** many gates prove source structure and wiring, not live database/provider/authority behavior.
4. **Regulatory-boundary coverage:** the import gate misses country-specific constants such as Cameroon provider codes in generic POS schema.
5. **Runtime classification:** current non-production default is `SANDBOX`; the target document's stricter local/preview/unknown classification should be reconciled before relying on it as a complete fail-closed contract.
6. **Module dependency metadata:** the compliance-to-accounting dependency is not correctly encoded in the catalog.
7. **Payroll immutability failure:** the dedicated DB wrapper failed during migration deploy; the underlying triggers were not exercised in this run.
8. **Migration risk:** the current 62-migration history includes 13 unapproved destructive statements in an accounting/auth bridge migration.
9. **External unknowns:** no legal review, official DGI contract, provider conformance, production credentials, hardware/connectivity proof, live load, or real pilot evidence was established locally.
10. **No certification claim:** this review is architecture and sequencing advice, not legal, tax, accounting, security, privacy, accessibility, or release certification.

## 15. Multidisciplinary review-board disposition

| Lens | Finding |
|---|---|
| Enterprise/platform architecture | Isolation is viable; deletion violates dependency direction and creates a product fork. |
| Backend/API/distributed systems | Preserve service ownership, transaction boundaries, idempotency, and deferred outbox processing. |
| Database/migrations | Keep additive compliance schema and provenance; do not create a later destructive retrofit. |
| Security/IAM/privacy/fraud | Non-statutory controls remain mandatory; secrets and AP fraud gaps are independent blockers. |
| Frontend/design system | Preserve explicit pending/non-authoritative/certified states; do not hide a deferred obligation. No UI implementation was reviewed for visual certification. |
| Workflow UX/accessibility/localization | Limited but applicable: status, non-claim, recovery, and escalation copy must remain accessible and bilingual. Browser accessibility was not rerun. |
| Product strategy | Build toward one bounded integration-ready vertical slice; do not let qualified production approval block unrelated feature work. |
| Finance/accounting/reconciliation/controls | Ledger, payment, AP, close, and evidence controls are universal foundations, not removable OHADA decoration. |
| SRE/DevSecOps/observability | Deferred queues require ownership, SLA, alerts, dead-letter recovery, stable worker identity, and production configuration. |
| SaaS packaging/growth/customer success | Compliance can remain a separately entitled moat, but its dependency on accounting truth must be explicit. |
| Analytics/data governance | Evidence grade, provenance, and authoritative/non-authoritative status must survive exports and metrics. |
| AI/agent governance | Not applicable to the separation decision; no agent action authority or model behavior changes were proposed. |
| Change management/support | Operators need clear capability matrices and runbooks distinguishing operational receipts from certified fiscal documents. |

## 16. Success-criteria decision

- Every material command in the current policy chain has an evidence-backed classification: **met**.
- OHADA-specific rules are separated from universal platform invariants: **met, with documented residual coupling**.
- What would genuinely be unblocked is identified: **met**.
- Late-integration rework is evaluated across data, services, workflows, controls, UI, and operations: **met**.
- Verdict is clear and actionable: **met — `CONDITIONALLY VIABLE` through isolation only**.
- Development sequence states what can be deferred and what must remain: **met**.

## 17. Final recommendation

Do not remove the OHADA compliance stack.

Restore and enforce the repository's intended **Regulatory Isolation Boundary**. Make integration CI independent from qualified production approval, while preserving the minimum compliance spine and every universal accounting, security, audit, data-integrity, and operational gate.

The immediate high-leverage next task is a narrow verification-wiring remediation: reconcile `package.json` with `scripts/policy-gates-integration-contract.json`, make `verify:repo` integration-oriented, keep `verify:release` production-oriented, and prove that ordinary CI can pass while the qualified country-pack production gate remains safely blocked.

That delivers the acceleration behind the original idea without creating the end-stage compliance retrofit risk.
