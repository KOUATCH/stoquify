# Stoquify UI/UX Audit Traceability Register

**Register ID:** STQ-UIUX-REM-2026-08-06  
**Status:** execution-ready planning baseline  
**Finding system of record:** `docs/system-audit/STOQUIFY_ENTERPRISE_UI_UX_SYSTEM_AUDIT_2026-08-06.md`  
**Machine-readable mirror:** `01_AUDIT_TRACEABILITY_REGISTER.json`

## Closure contract

An audit item is not closed because code was merged. Closure requires all of the following:

1. the mapped work packages satisfy their Definition of Done;
2. automated verification is green on the release candidate;
3. the named human/domain reviewer accepts the validation evidence;
4. the evidence is reproducible, linked, and within its freshness window;
5. the applicable phase/rollout gate is signed;
6. rollback has been rehearsed or proven safe; and
7. residual risk is accepted by an authority who did not implement the change.

`confirmed-open` means the current repository still exhibits the weakness. `partially-remediated` means current source differs materially from the dated audit but the system contract is not closed. `design-required` means the roadmap establishes a prerequisite contract; it does not claim that contract exists today.

## Audit finding coverage

| Finding | Current disposition | Primary work packages | Blocking verification | Human acceptance | Release gate |
|---|---|---|---|---|---|
| P0-01 — Inventory aggregation truth | Confirmed open | G0-03, A-01, A-02, A-03, C-01, D-02 | Pagination-invariant KPI; failure/partial state; currency and tenant isolation | Inventory controller + Accounting Controls Lead | A-P0; C-Inventory |
| P0-02 — Currency/locale contract | Open with partial foundations | G0-02, A-03, A-04, C-01..C-06, D-01 | Money-literal guard; EN/FR × XAF/XOF/EUR/USD; notification/export parity | Internationalization + finance reviewer | A-P0; each C module |
| P0-03 — Module/package enforcement | Confirmed open; counts refreshed | G0-02, G0-03, A-08, A-09, B-01, B-02, B-06, D-01, D-04 | 100% protected registry coverage; role/package UI-server parity; observe/enforce telemetry | Security + billing/package owner + support | A-Entitlement; cohort rollout |
| P0-04 — Dead/simulated actions | Confirmed open | A-05, A-09, C-00, C-01..C-03, D-01 | Action inventory; real artifact metadata E2E; simulated-success prohibition | Application platform + audit evidence | A-P0 |
| P0-05 — Public/auth accessibility | Changed since audit, still open | G0-03, A-06, A-07, B-06, D-01, D-02 | Zero critical/serious axe; keyboard; field semantics; 320 px/400% zoom | Accessibility Lead; NVDA/VoiceOver and EN/FR review | A-Accessibility |
| P1-01 — Duplicate/misleading routes | Partially remediated | A-09, B-01, B-02, B-06, C-01, C-02, C-05 | Typed registry; locale-preserving redirects; no duplicate implementations | Web platform + support + analytics | B-IA |
| P1-02 — Theme promise mismatch | Confirmed open | G0-02, B-04, B-05, B-06, C-00..C-06 | Theme matrix; contrast; literal-color ratchet | Design Systems + Accessibility | B-Theme; C modules |
| P1-03 — Static dashboard shortcuts | Confirmed open | A-08, B-01, B-02, B-06 | Role/package snapshots; denied destination absence | Product Experience Lead | B-Navigation |
| P1-04 — Front-loaded registration | Confirmed open | A-06, A-07, B-07, D-02 | First-control viewport; resume/idempotency; funnel analytics | Mobile usability + Growth Product | B-Onboarding |
| P1-05 — Over-composed login | Confirmed open | A-06, A-07, B-06, D-02 | Visual/contrast; auth completion; semantic regression | Cognitive, keyboard and screen-reader walkthrough | A-Accessibility |
| P1-06 — Incomplete route-state contract | Confirmed open; counts refreshed | A-02, B-01, B-03, B-06, C-01..C-06 | Registry completeness; state fixtures; correlation IDs | Support + Accessibility | B-State Contract; C modules |
| P1-07 — Client-component hotspots | Confirmed; graph stale | G0-01, G0-03, C-01..C-07, D-03 | Characterization parity; refreshed graph; bundle/render budgets | Domain owners + Principal Frontend Engineer | C modules |
| P1-08 — Narrow authenticated certification | Confirmed open; counts refreshed | G0-03, B-06, C-01..C-06, D-01, D-02 | Manifest coverage; browser matrix; screenshot gate | QE + screen-reader + domain owners | D-Automated |
| P2-01 — Ungoverned dense tables | Confirmed open | C-00, C-01..C-05 | Reflow/keyboard; filter/export parity; measured virtualization | Operational role walkthrough | C modules |
| P2-02 — Native prompt/confirm | Confirmed open | C-00, C-01, C-03, C-05 | Native-dialog scan; focus/escape; audit/idempotency | Accessibility + control owner | C-Shared Primitives |
| P2-03 — Raw interactive images | Confirmed open | C-00, C-01, C-06, D-03 | No-img gate; CLS; offline fallback; alt semantics | POS offline visual review | C modules |
| P2-04 — Literal copy bypass | Confirmed heuristic; classify at G0 | A-03, C-00..C-06, D-02 | Literal-copy ratchet; missing keys; pseudo-localization | French linguistic review | C modules |
| P2-05 — Global CSS/theme islands | Confirmed open | B-04, B-05, C-00..C-06 | CSS token ratchet; visual regression; exception inventory | Design-system governance | B-Theme; C modules |
| P2-06 — Fixed-width legacy forms | Confirmed open | A-06, A-07, B-06 | Fixed-width scan; 320 px; 400% zoom | Keyboard + low-vision review | A-Accessibility |

## Required contract coverage

| Contract | Purpose | Producing packages | Principal consumers | Failure-safe behavior |
|---|---|---|---|---|
| CT-01 Inventory summary | Scoped, as-of, provenance-bearing inventory KPIs | A-01 | C-01, reporting, accounting review | Render unavailable/partial; never substitute zero |
| CT-02 Read completeness | Complete/partial/stale/unavailable semantics | A-02 | B-03, all C modules | Preserve error and correlation metadata |
| CT-03 DisplayContext | Locale, currency, time zone, format and scope | A-03, A-04 | All modules, exports, notifications | Explicit unavailable/configuration state; no silent USD |
| CT-04 Capability decision | Permission + entitlement + org/location state | A-08 | B-02, routes, actions, server policy | Server denial remains authoritative; policy can return to observe |
| CT-05 Route registry | Canonical route/alias/owner/capability/state metadata | B-01 | B-02, B-03, B-06, support, analytics | Time-boxed redirect alias |
| CT-06 Action/artifact | Real outcome and evidence-bearing exports | A-05, C-00 | All action surfaces | Explicit disablement with reason |
| CT-07 Accessible primitives | Fields, route states, dialogs, focus and announcements | A-06, A-07, B-03, C-00 | Public/auth and all modules | Semantic compatibility wrapper |
| CT-08 Visual token/recipe | Semantic appearance and governed exceptions | B-04, B-05, C-00 | All modules | Versioned compatibility alias |
| CT-09 Resumable onboarding | Persisted, recoverable first-value sequence | B-07 | Signup and workspace setup | Preserve progress across version fallback |
| CT-10 Certification evidence | Risk tiers, fixtures, dimensions, evidence freshness | G0-03, B-06, D-01, D-02, D-05 | Release board | Block or reverse release cohort |

## Revalidated baseline deltas

The dated audit remains authoritative for finding intent. Execution starts from these current-source deltas:

- localized application pages: 139; dashboard pages: 124; all application pages: 140;
- module surface inventory: 19 modules, 387 surfaces, 353 mapped, 257 enforcement candidates, 6 unmapped, 4 missing permissions;
- entitlement default remains `observe`, with explicit `enforce` islands already present;
- current route-state files: 11 loading, 23 error, 14 layouts, 2 not-found; explicit state usage remains incomplete;
- current E2E specs: 10; current axe-integrated files: 6;
- two create-item legacy routes now redirect to the canonical create route and must be verified, not reimplemented;
- earlier landing-page prohibited-ARIA selectors are no longer present; auth field semantics remain deficient and the accessibility suite must be rerun;
- graph evidence (4,121 nodes, 5,321 edges, 135 communities, 755 isolated nodes) is stale/partial and cannot authorize high-risk decomposition until refreshed;
- public EN/FR route smoke passed on 2026-08-06, but dev-server timings are not production performance evidence.

## Machine-readable field contract

Every entry in the JSON mirror carries: stable ID, category, priority, evidence/revalidation state, impacted roles/domains, control boundary, target outcome, producing work packages, contract dependencies, automated verification, human validation, accountable reviewer, rollout gate, rollback action, residual risk, and disposition. The roadmap validator rejects missing mappings, unknown work-package IDs, unknown contract dependencies, and dependency cycles.
