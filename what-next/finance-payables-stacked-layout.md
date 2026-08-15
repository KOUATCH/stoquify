# Finance Payables Stacked Layout

Date: 2026-08-13

## Outcome

Updated `FinancePayablesSurface` so **Recent supplier disbursements** and **Payables workflows** render as a full-width vertical stack. The disbursements card remains first in DOM and visual order, with workflows immediately below it.

## Implementation

- Changed only the target Payables container from `grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]` to `grid gap-3`.
- Reused the shared `PaymentsTable`; no table, data, API, service, schema, migration, finance calculation, RBAC, or entitlement behavior was added or changed.
- Preserved the complete `outboundPayments` collection passed to `PaymentsTable` and the `direction === "out"` filter.
- Preserved the canonical AP-history link: `/dashboard/purchases/payables/history`.
- Strengthened `components/finance/__tests__/FinancePaymentsTable.test.tsx` to assert the stacked layout, DOM order, search/pagination controls, and AP-history destination.
- The two touched finance files already contained substantial user-owned, uncommitted work. Those edits were preserved.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused ESLint | Passed | `npx eslint components/finance/FinanceSpecializedLedgerSurfaces.tsx components/finance/__tests__/FinancePaymentsTable.test.tsx` exited 0. |
| Focused Payables regression | Passed | The new Payables layout test passed. |
| Full finance-table test file | Passed | 1 suite, 6 tests passed. The fixture-based table tests verify complete-collection pagination, search/date filtering, and sorting. |
| Source contract | Passed | Outbound filtering, unsliced `outboundPayments`, disbursements-before-workflows order, single-column target section, and canonical AP-history link were all present. |
| Repository typecheck | Failed on unrelated worktree errors | `npm run typecheck` reported existing errors in sales, accounting, assurance, inventory, settings, inventory export, and supplier E2E files. Neither changed finance file appeared in the diagnostics. |
| Authenticated desktop browser | Passed | Both target cards had equal full-row width, disbursements appeared above workflows, the section class was `grid gap-3`, search and AP-history controls were present, and page-level horizontal overflow was false. |
| Authenticated mobile browser | Passed | Both target cards remained vertically ordered and equal-width; page-level horizontal overflow was false and the table remained inside its responsive container. |
| Live pagination interaction | Not applicable to current live scope | The authenticated dataset returned no recent supplier disbursements, so live page controls correctly showed the empty state. Pagination behavior is verified by the passing 12-record fixture test. |

## Visual Evidence

- Desktop: `C:\Users\J COMPUTER\.codex\visualizations\2026\08\13\019ffbea-9e27-7150-8286-f54ab2840f24\finance-payables-stacked-layout\payables-desktop.png`
- Mobile: `C:\Users\J COMPUTER\.codex\visualizations\2026\08\13\019ffbea-9e27-7150-8286-f54ab2840f24\finance-payables-stacked-layout\payables-mobile.png`

## Reviewer Decisions

- Frontend, workflow UX, accessibility, localization, finance controls, and purchasing/AP controls: applicable and verified for this layout slice.
- Security/IAM: route access, tenant scoping, RBAC, and module entitlement were untouched.
- Backend contracts, database/migrations, infrastructure/SRE, statutory rules, and SaaS packaging: not applicable because the implementation is presentation-only.

## Residual Repository Condition

The requested Payables slice is verified, but repository-wide type safety cannot be claimed until the unrelated existing TypeScript errors are resolved.
