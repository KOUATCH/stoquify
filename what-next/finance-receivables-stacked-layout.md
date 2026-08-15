# Finance Receivables Stacked Layout

Date: 2026-08-13

## Outcome

Updated `FinanceReceivablesSurface` in `components/finance/FinanceSpecializedLedgerSurfaces.tsx` so **Recent customer receipts** and **Receivables workflows** render in a single full-width vertical stack. Receipt content remains first; the workflows panel remains directly below it.

## Scope

- Changed the target receivables section container from `grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]` to `grid gap-3`.
- Preserved the receipt table, workflow actions, translations, routing, permissions, finance values, and all other page sections.
- The target file had substantial pre-existing uncommitted changes. Those changes were preserved; this task added only the container-class change described above.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused ESLint | Passed | `npx eslint components/finance/FinanceSpecializedLedgerSurfaces.tsx` exited 0. |
| Source structure | Passed | Receipts occur before workflows; the target section uses `grid gap-3`; no two-column breakpoint occurs after the target section begins. |
| TypeScript typecheck | Timed out | `npm run typecheck` produced no diagnostics but exceeded both 180-second and 360-second limits in the heavily modified worktree. This is not recorded as a pass. |
| Local HTTP route | Passed with authentication redirect | The route returned HTTP 307 to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance%2Freceivables`, confirming the local server responded and the route remains access-controlled. |
| Desktop/mobile browser verification | Blocked | The in-app browser webview failed to attach after three attempts, so no authenticated visual certification or screenshots are claimed. |

## Reviewer Decisions

- Frontend/UI: applicable; the layout is now single-column at every breakpoint.
- Accessibility/workflow: source order is receipts followed by workflows, preserving reading and focus order.
- Finance/internal controls: applicable; no data, monetary, posting, evidence, or reconciliation behavior changed.
- Security/IAM: applicable; route access, tenant boundaries, RBAC, and entitlement code were untouched.
- Database/migrations, backend contracts, infrastructure, statutory rules, SaaS packaging: not applicable; this was a layout-only change.

## Remaining Verification

When an authenticated browser session is available, visually inspect the route at desktop width (at least 1280 px) and mobile width to capture final responsive and horizontal-overflow evidence.
