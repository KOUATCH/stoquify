# Stage 02 Security Proof Gate - AP Supplier History

Status: PARTIAL

Run: `th-ap-supplier-history-security-accounting-20260717-026`  
Slice: `ap-ar`  
Active lane: `ap`  
Mode: audit

## What Passed

- AP read boundary exists through `actions/purchasing/ap-control.actions.ts:getAPWorkbenchAction`, protected by `purchasing.ap.invoice.view`.
- AP mutating actions derive tenant and actor IDs in the server handler and pass `organizationId: ctx.orgId` into parsed inputs.
- Supplier bank approval, supplier payment approval, and supplier payment release actions require `freshAuth: true`.
- High-risk AP permissions exist for invoice posting, match review, supplier bank approval, supplier payment approval, supplier payment release, and finance payables read.
- AP page has a server route permission boundary through `requirePermission("purchasing.ap.invoice.view")`.

## Security Gaps Before Stage 04 Can Claim Complete AP History

- The AP page uses module access observation, not hard entitlement enforcement, so a canonical AP history route/action must enforce the exact module slug at the server entrypoint.
- The current AP workbench read is a bounded operational queue with `limit`, not a complete transaction-history read model with signed cursor, normalized filters, export parity, and recorded-through semantics.
- No AP transaction-history export action exists yet with field allowlisting, formula neutralization, fresh-auth export proof, row/byte/time limits, rate/concurrency controls, and start/completion/failure audit events.
- Supplier bank details, destination references, payment provider references, notes, and internal evidence fields need an explicit subject/role redaction policy before history drawers and exports are exposed.
- Current AP workbench read sets `auditAllowed: false`; a canonical AP history read/proof/export surface should record appropriate read/proof/export audit evidence.

## Verdict

PARTIAL. Existing AP command controls are credible, but the AP supplier transaction-history surface itself does not yet exist. Stage 04 should not start as a release implementation until these Stage 02 requirements are either implemented or carried as exact Stage 04 acceptance criteria.

## Focused Verification Added

- PASS: `npm test -- services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts "app/[locale]/(dashboard)/dashboard/purchases/payables/__tests__/page.test.tsx" --runInBand` - Jest ran 2 suites / 23 tests for AP service/action controls.
- PASS: `npx jest --runTestsByPath "app/[locale]/(dashboard)/dashboard/purchases/payables/__tests__/page.test.tsx" --runInBand` - 1 suite / 4 tests for AP payables route boundary.
