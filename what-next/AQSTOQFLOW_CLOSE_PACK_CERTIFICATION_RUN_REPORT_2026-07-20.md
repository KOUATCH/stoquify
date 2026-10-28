# AqStoqFlow Close Pack Certification Run Report

Date: 2026-07-20
Skill: `022-aqstoqflow-close-pack-certification`

## Scope

Implemented the close-pack certification hardening requested by the skill without fabricating statutory, OHADA, SYSCOHADA, regulatory, or authority evidence. The close pack remains a system evidence pack; statutory filing/certification still requires qualified expert validation and configured authority adapters.

## Files Changed

- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/__tests__/close-assurance-pack.service.test.ts`

## Changes Completed

- Added data-trust certification gates:
  - Draft packs expose a blocker when close-run trust is below `T3`.
  - Certified packs are blocked unless close-run trust is `T4`.
- Added recursive close-pack metadata redaction for raw provider payloads, secrets, tokens, credentials, auth headers, employee identifiers, salary/person-level amounts, payment destinations, and raw audit/authority payloads.
- Kept existing payroll forecast handling aggregate-only, with person-level payroll values redacted.
- Added explicit `evidenceSummaries` to the deterministic JSON pack:
  - data trust summary
  - ledger reconciliation summary
  - trial balance summary
  - signed payment reconciliation runs
  - reconciliation certificate hashes
  - suspense register
  - open/resolved exception summary
  - AR/AP availability summary
  - inventory valuation summary
  - tax/VAT availability summary
  - redacted close-sensitive ledger audit excerpt
- Added a bounded prior ledger audit excerpt to the pack and included its row count in the export row count.
- Preserved existing draft/certified modes, watermarking, deterministic hashing, segregation-of-duties checks, fresh-auth checks, inventory stale-evidence invalidation, and close-run certification updates.

## Focused Tests Added

- Certified export requires fresh authentication.
- Certified export blocks below `T4` data trust.
- Certified export blocks unsigned or hashless reconciliation certificate references.
- Public pack content redacts raw provider payloads, secrets, and audit metadata.

Existing tests continue to cover:

- Draft exports with blockers and watermarking.
- Certified exports blocked by high-risk findings.
- Pilot-cycle certification evidence blocking.
- Segregation of duties.
- Clean certification and close-run status update.
- Inventory stale-evidence invalidation.
- Recertification stale-state recording.
- Deterministic hashes for the same canonical close snapshot.

## Validation

Passed:

```powershell
npx jest --runTestsByPath "services/accounting/__tests__/close-assurance-pack.service.test.ts" --runInBand --forceExit
```

Result: 1 suite passed, 12 tests passed.

Passed:

```powershell
npx eslint "services/accounting/close-assurance-pack.service.ts" "services/accounting/__tests__/close-assurance-pack.service.test.ts"
```

Passed:

```powershell
npm run typecheck
```

Passed with exit code 0:

```powershell
npx jest --runTestsByPath "actions/accounting/__tests__/close-assurance.actions.test.ts" --runInBand --forceExit
```

Prisma validate was not rerun because this skill pass did not change the Prisma schema.

## Post-Run Live Smoke Evidence

After the certification hardening pass, the authenticated close-assurance browser smoke was approved and run against the local e2e PostgreSQL database:

```powershell
npm run test:e2e:close-assurance
```

Result:

```text
4 passed (6.3m)
```

Evidence index:

- `what-next/AQSTOQFLOW_CLOSE_PACK_CERTIFICATION_EVIDENCE_INDEX_2026-07-20.md`

Live smoke evidence:

- `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_LIVE_SMOKE_PASS_2026-07-20.md`
- `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json`
- `what-next/accounting/close-assurance-browser-smoke/close-dashboard.png`
- `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-download.png`
- `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-not-certified-cmrt863st001jmabgcwg1i6jj-c22b6967-c03.json`

Draft close-pack content hash:

```text
sha256:0d85df79afdb5468a7fadbc72bd2ec04a96a7265d591f362faa2f9231879f64a
```

This live smoke closed the `BusinessEvent.sourceType` regression by confirming close-assurance assessment and draft close-pack export complete through the authenticated browser route after mapping close workflow events to an enum-valid business-event source and preserving close-domain source identity in metadata.
## Limitations And Controls

- No statutory, authority, OHADA, SYSCOHADA, or legal certification evidence was fabricated.
- AR/AP and tax/VAT sections report only what is captured in the close-run evidence/checklist snapshot; when absent, the pack marks them as `NOT_CAPTURED_IN_CLOSE_RUN` with a limitation.
- Audit excerpt is bounded to the latest matching ledger audit events selected by the service query.
- Certified close packs remain blocked by critical/high unresolved gates, unsigned reconciliation evidence, stale inventory evidence, failed pilot-cycle evidence, SoD conflict, missing permission, or stale/missing fresh auth.