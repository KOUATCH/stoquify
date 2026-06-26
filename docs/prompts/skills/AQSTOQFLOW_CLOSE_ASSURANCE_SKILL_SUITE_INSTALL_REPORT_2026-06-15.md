# AqStoqFlow Close & Assurance Skill Suite Install Report

Date: 2026-06-15
Status: Installed and validated
Source blueprint: `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_BLUEPRINT_2026-06-15.md`
Install root: `C:\Users\J COMPUTER\.codex\skills`

## Naming Decision

The existing local skill namespace already uses AqStoqFlow sequence numbers through `017`, plus a separate `01` through `05` payment reconciliation suite. To avoid collisions and preserve the existing sequence convention, the Close & Assurance Center suite was installed as `018` through `023`.

## Installed Skills

### 018-aqstoqflow-close-assurance-audit

Path:

`C:\Users\J COMPUTER\.codex\skills\018-aqstoqflow-close-assurance-audit\SKILL.md`

Purpose:

Audit and plan the Close & Assurance Center before implementation. It inspects period close, payment reconciliation, suspense, ledger traceability, evidence, permissions, notifications, exports, and dashboard readiness.

Default prompt:

`Use $018-aqstoqflow-close-assurance-audit to audit AqStoqFlow Close & Assurance readiness before implementation.`

### 019-aqstoqflow-close-assurance-schema

Path:

`C:\Users\J COMPUTER\.codex\skills\019-aqstoqflow-close-assurance-schema\SKILL.md`

Purpose:

Add durable schema, permissions, DTOs, Zod contracts, and domain errors for close runs, checklist items, findings, evidence, accountant reviews, comments, exports, and certification metadata.

Default prompt:

`Use $019-aqstoqflow-close-assurance-schema to add the Close & Assurance schema and contracts after audit gates pass.`

### 020-aqstoqflow-close-assurance-engine

Path:

`C:\Users\J COMPUTER\.codex\skills\020-aqstoqflow-close-assurance-engine\SKILL.md`

Purpose:

Build the server-only assessment engine: readiness scoring, checklist generation, blocker aggregation, evidence graph mapping, provenance, close run persistence, notifications, and tests.

Default prompt:

`Use $020-aqstoqflow-close-assurance-engine to build the server-side Close & Assurance assessment engine.`

### 021-aqstoqflow-close-assurance-portal

Path:

`C:\Users\J COMPUTER\.codex\skills\021-aqstoqflow-close-assurance-portal\SKILL.md`

Purpose:

Build the professional dashboard and accountant portal with protected actions, TanStack Query hooks, enterprise UI, findings board, evidence graph, accountant review/comments, notifications, bilingual copy, and system dashboard color semantics.

Default prompt:

`Use $021-aqstoqflow-close-assurance-portal to build the Close & Assurance dashboard and accountant portal.`

### 022-aqstoqflow-close-pack-certification

Path:

`C:\Users\J COMPUTER\.codex\skills\022-aqstoqflow-close-pack-certification\SKILL.md`

Purpose:

Build close pack export, deterministic JSON, hashes, watermarks, certification, recertification, audit logging, fresh-auth signing, blocker enforcement, and T3/T4 data-trust gates.

Default prompt:

`Use $022-aqstoqflow-close-pack-certification to build Close & Assurance pack export and certification.`

### 023-aqstoqflow-close-assurance-suite

Path:

`C:\Users\J COMPUTER\.codex\skills\023-aqstoqflow-close-assurance-suite\SKILL.md`

Purpose:

Orchestrate the full ordered suite: audit, schema/contracts, engine, portal, pack export/certification, and all verification gates.

Default prompt:

`Use $023-aqstoqflow-close-assurance-suite to build the full AqStoqFlow Close & Assurance Center in order.`

## Execution Order

1. `018-aqstoqflow-close-assurance-audit`
2. `019-aqstoqflow-close-assurance-schema`
3. `020-aqstoqflow-close-assurance-engine`
4. `021-aqstoqflow-close-assurance-portal`
5. `022-aqstoqflow-close-pack-certification`
6. `023-aqstoqflow-close-assurance-suite` orchestrates the first five.

## Validation

Scaffolding:

The six skills were scaffolded with the bundled `skill-creator` `init_skill.py` script.

Collision check:

No existing skills matched the selected `018` through `023` Close & Assurance names before installation.

Placeholder check:

No scaffold placeholders remained after writing the final skill bodies.

Official validation:

All six installed skills passed `quick_validate.py` after normalizing Windows UTF-8 BOM output.

Result:

`Skill is valid!` for all six skills.

## Recommended Launch Command

To build the full module later, run:

`Use $023-aqstoqflow-close-assurance-suite to build the full AqStoqFlow Close & Assurance Center in order.`

The suite is designed to stop on critical non-compliance, tenant isolation failures, missing evidence foundations, or failed verification gates.
