# Stoquify HRIS–Payroll Skill Capability Registry

Date: 2026-07-19  
Status: Active program control

## Authority decision

Use `aqstoqflow-hris-payroll-00` through `18` as the authoritative dependency-ordered program chain. Reuse the installed `stoquify-hris-*`, `aqstoqflow-hrpayroll-*`, Payroll, module-control-plane, security, accessibility, migration, accounting, and assurance skills as bounded specialists. They must not act as competing program orchestrators or issue independent final production decisions.

## Why no new full suite was created

The installed filesystem already contains three overlapping HRIS/payroll generations totaling 62 skills. Creating another 18–20-skill suite would worsen trigger ambiguity, duplicated instructions, and conflicting GO/NO-GO authority. Skill-creator guidance favors reuse, concise instructions, progressive disclosure, deterministic validation, and forward testing.

## Capability ownership

| Capability | Authoritative skill(s) | Reused specialists | Current status |
|---|---|---|---|
| Program orchestration and status | `aqstoqflow-hris-payroll-00..02` | `stoquify-hris-00..01` | Active; Phase 0 produced |
| Employee identity | `aqstoqflow-hris-payroll-03` | `stoquify-hris-04` | First writer tranche passed |
| Organization and manager scope | `aqstoqflow-hris-payroll-04` | `stoquify-hris-06,15` | Pending |
| Contract lifecycle | `aqstoqflow-hris-payroll-05` | `stoquify-hris-05,07` | Pending adapter tranche |
| Compensation | `aqstoqflow-hris-payroll-06` | `stoquify-hris-08` | Pending adapter tranche |
| Documents/privacy | `aqstoqflow-hris-payroll-07` | `stoquify-hris-07,09` | Pending relational migration |
| Time/leave/attendance | `aqstoqflow-hris-payroll-08` | `stoquify-hris-10` | Pending source engine |
| Readiness and immutable snapshots | `aqstoqflow-hris-payroll-09..11` | `stoquify-hris-13` | Partial; persisted aggregate open |
| Statutory, payments and declarations | `aqstoqflow-hris-payroll-12..13` | Existing Payroll/country-pack skills | Reuse; production evidence blocked |
| Accounting and close | `aqstoqflow-hris-payroll-14` | Existing accounting/assurance skills | Reuse |
| Self-service and browser certification | `aqstoqflow-hris-payroll-15..16` | `stoquify-hris-14..17` | Controlled evidence only |
| Migration and final readiness | `aqstoqflow-hris-payroll-17..18` | `stoquify-hris-18..19` | NO-GO for unrestricted production |

## Narrow skill gaps to stage, not duplicate

1. Ownership freeze and direct-writer ratchet.
2. Effective-dated metadata-to-relational migration.
3. Persisted immutable HRIS-to-Payroll snapshot contract.
4. Legacy-writer retirement and zero-caller certification.
5. HRIS-to-Payroll module dependency enforcement.
6. Characterization-test-led Payroll control-service decomposition.

Each gap should be added only when its execution tranche is next, using the existing authoritative skill as parent and shared references/scripts rather than repeating the operating law in another full suite.

## Validation

`quick_validate.py` passed for the four skills used in this tranche:

- `aqstoqflow-hris-payroll-00-orchestrator`
- `aqstoqflow-hris-payroll-01-status-register`
- `aqstoqflow-hris-payroll-02-source-truth-map`
- `aqstoqflow-hris-payroll-03-employee-identity`

## Coordination rule

Every specialist receives a bounded artifact/file responsibility, dependencies, acceptance criteria, tests, and handoff. The authoritative orchestrator reconciles outputs. No agent may broaden into production integrations, statutory formulas, tenant backfill, or unrelated HRIS features without the relevant prerequisite gate and explicit scope.
