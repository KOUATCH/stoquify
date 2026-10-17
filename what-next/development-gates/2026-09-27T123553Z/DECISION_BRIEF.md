# Stoquify development gates — read-only audit

**Development can continue. The reseed has not established pilot/production authority or completed every workflow.** The main remaining work is access/configuration reconciliation, trustworthy transaction evidence, and genuine appointed-owner/expert approvals.

## Confirmed current state

- Database: `localhost:5432/stoquify_replay_next_20260830`; snapshot 2026-09-27T12:40:06.709Z; commit `62a56036a5ac9b37236a20c9b148052199069479`. Supplementary workflow/runtime extractions have their own timestamps. The workspace was already dirty; unrelated work was preserved.
- **All 87 migrations are applied**, latest `20260920060000_pos_checkout_lifecycle`. Migration status, history and catalog checks all pass.
- **58 distinct role codes, 174 tenant role records, 180 users across 3 organizations; 23 supplied candidate assignments preserved.** No verified human appointment was established by seeded names or role labels.
- **All 41 items remain at least 1500 aggregate on hand** across their tenant locations. All 572 FK checks and checked tenant links pass. Stock/movement/class-3 valuations agree: 57,620,125 XAF and 56,858,075 XAF for rds_org_001/rds_org_002. This aggregate threshold is not 1500 at every location.
- **21 gate validators rerun: 13 pass, 8 blocked.** Some blocked outcomes are genuine stage-specific authority requirements; others are engineering/scanner gaps. They are not 8 reasons to stop all coding.

## Existing main gate-owner nominations

| Responsibility | Existing nominated name |
| --- | --- |
| Product owner / product approval | Arielle Yongwa / Kouatchoua Mark |
| Financial control / controller approval | Tchami Jennifer / Kouatchoua Marceline |
| Accounting owner / qualified accounting review | Yongwa Eli / Tchana Nikita |
| Qualified Cameroon country-pack review | Kouatchoua mMark — exact stored spelling; identity needs confirmation |
| Security / risk | Yonga Springfield / Tamen Martial |
| Payments / treasury | Yonga Junie / Tamen Stanick |
| Inventory / fulfillment | Tchana Rose / Yonga Lysette |
| Retail operations / POS architecture | Tamen Max / tchakoumiLorrain |
| QA / SRE / support | Sonkeng Steve / Ronald Djakou / Etoo Naomie |
| Migration operator / independent migration check | Sango Malo / Maximilliano Bonga |
| Maker / order-to-cash ownership | Tamen Marceline (two accounts; do not treat as independent people) |
| Checker | DB: Yonga Springfield; supplied working copy: Yonga Claude — resolve |

These are existing nominations, not confirmed appointments or automatically eligible operators. [The complete role/person register](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/ROLE_PERSON_REGISTER.md>) includes exact user/role/employee/organization/location IDs. [The actual capability checks](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/CAPABILITY_ELIGIBILITY.md>) show which permissions, module grants and scopes match.

## What remains blocked or incomplete

1. **Access and modules:** all tenants lack purchasing, which the AP service enforces. Primary reseeded tenants have branch-close and AI permission gaps; users.roles.remove is absent from the full access-maintenance contract. Intended inventory checker roles may lack inventory.stock.adjust. Broad seeded close-certification permissions also need least-privilege review; permission is not qualification.
2. **Historical source/evidence:**24 receipt mismatches, 24 sales with line/header-tax discrepancies, 48 missing stock events, and 192 generic field findings across 168 records remain. Arithmetic/FK integrity alone does not establish meaningful business history.
3. **Setup/integrations:** both reseeded accounting settings are IN_PROGRESS, employer sector/risk classifications are null, 24 provider accounts are DRAFT and 24 country adapters retain synthetic sandbox/review configuration. Complete only the chosen pilot scope.
4. **POS G1:**13/13 technical checks pass, runtime conformance is partial, 0/11 decisions have accountable approval. 33 role approval obligations map to 17 existing nominated responsibilities; this does not imply 33 new people. Trusted attestation configuration and genuine decisions are needed.
5. **Statutory/AI promotion:** CM production expert review remains pending; optional AI release needs real identity, approvals, package/CI/operational evidence and backups. These do not block unrelated development.
6. **Engineering validators:** stale payroll test-title matching and module scanner findings require triage; the release aggregate also consumes historical reports/process-local configuration. No deployed production environment was certified.

## What can proceed now

- Independent software development and explicitly synthetic local scenarios.
- Preparation of least-privilege role/module fixes, coherent fixture corrections and regression evidence.
- Accountable review of frozen G1 decisions and genuine reviewer evidence collection in parallel.

## What engineering must resolve

- Permission/guard/manager-scope gaps and selected module/provider/accounting setup.
- Protected source inconsistencies, missing events, generic payloads and meaningful tax fixtures.
- Stale validator/scanner assumptions, fresh release evidence and scoped workflow/browser/deployment verification.

## What you must provide

- Next target stage/tenant/modules and appointment confirmation using the existing roster.
- Resolution of the named identity conflicts and actual authority/qualification evidence.
- Genuine POS G1 decisions, qualified country/accounting review, and selected real company/provider/workforce inputs.
- AI operational owners/backups and external infrastructure references only if that pilot is selected.

Start with [the copy-and-fill checklist](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/USER_INPUT_CHECKLIST.md>). Full formats/storage/validators are supplied; no existing database IDs or raw secrets need to be sent again. The dependency order is in [NEXT_STEPS.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/NEXT_STEPS.md>).

## Evidence package

- [GATE_REGISTER.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/GATE_REGISTER.md>)
- [G1_APPROVAL_ROSTER.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/G1_APPROVAL_ROSTER.md>)
- [FIELD_REGISTER.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/FIELD_REGISTER.md>)
- [Exact database field values and IDs](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/field-register.json>)
- [External document/configuration fields](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/external-field-register.csv>)
- [assurance/READINESS_FINDINGS.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/assurance/READINESS_FINDINGS.md>)
- [assurance/REVIEWER_MATRIX.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/assurance/REVIEWER_MATRIX.md>)
- [runtime/runtime-issues.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/runtime/runtime-issues.md>)
- [extraction-audit.json](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/extraction-audit.json>)
- [workflow-extraction-audit.json](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/workflow-extraction-audit.json>)
- [commands/results.json](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/commands/results.json>)

Only audit scripts and reports in this run directory were written. Database queries were enforced read-only and rolled back; no migrations, reseed, privilege changes, approvals, protected workflow actions, application edits or production activation were performed.

## Tax and unit detail

All 41 items reference active tax rows; product-specific applicability is unverified, not proven incorrect. Two zero-rate rows are unused, and current contracts lack reason-specific product-tax provenance. Units comprise 20 meaningful active rows and two retired unused generic packs; four drink items need litre-versus-package confirmation. See [runtime/tax-classification-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/runtime/tax-classification-assessment.md>) and INPUT-09 in the checklist.
