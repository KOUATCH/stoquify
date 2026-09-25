# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: finance-x1-local-authenticated-evidence.spec.ts >> en receivables-history local authenticated evidence
- Location: tests\e2e\finance-x1-local-authenticated-evidence.spec.ts:172:9

# Error details

```
TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
```

# Test source

```ts
  1  | import type { Page } from "@playwright/test"
  2  | 
  3  | export type FinanceX1Result = {
  4  |   state: "ready" | "error"
  5  |   resultKind: "table-rows" | "table-empty" | "summary"
  6  |   renderedRowCount: number
  7  | }
  8  | 
  9  | // Self-contained because Playwright serializes this function into the page.
  10 | // false means pending: a missing table is never evidence of an empty result.
  11 | export function readFinanceX1Result(routeKey: string): FinanceX1Result | false {
  12 |   const failed = document.querySelector('[data-table-state="error"], [data-table-state="forbidden"], [data-table-state="not-entitled"], [data-finance-result-state="error"]')
  13 |   if (failed) return { state: "error", resultKind: "table-empty", renderedRowCount: 0 }
  14 |   if (document.querySelector('[data-finance-result-state="refreshing"]')) return false
  15 | 
  16 |   const selectors: Record<string, string[]> = {
  17 |     "receivables-history": ['[data-table-id="finance.receivables-history"]'],
  18 |     payables: ['[data-table-id="finance.payments-ledger"]'],
  19 |     "cash-flow": ['[data-table-id="finance.cash-flow"]'],
  20 |     journals: ['[data-finance-result="journals"]', '[data-table-id="accounting.journal-entries-drafts"]', '[data-table-id="accounting.journal-entries-posted"]'],
  21 |     "trial-balance": ['[data-table-id="accounting.trial-balance"]'],
  22 |     "financial-statements": ['[data-finance-result="financial-statements"]'],
  23 |     "accountant-portal": ['[data-finance-result="accountant-portal"]'],
  24 |   }
  25 |   const required = selectors[routeKey]
  26 |   if (!required) throw new Error(`Unknown finance evidence route: ${routeKey}`)
  27 |   const surfaces = required.map(selector => document.querySelector<HTMLElement>(selector))
  28 |   if (surfaces.some(surface => !surface)) return false
  29 |   for (const surface of surfaces) {
  30 |     if (!surface!.getClientRects().length || getComputedStyle(surface!).visibility === 'hidden') return false
  31 |     const state = surface!.dataset.tableState ?? surface!.dataset.financeResultState
  32 |     if (!['ready', 'empty', 'no-results'].includes(state ?? '') || surface!.getAttribute('aria-busy') === 'true') return false
  33 |   }
  34 |   if (routeKey === "financial-statements" && surfaces[0]!.dataset.financeResultLayout === "summary") {
  35 |     return { state: "ready", resultKind: "summary", renderedRowCount: 0 }
  36 |   }
  37 | 
  38 |   const rows = new Set(surfaces.flatMap(surface => Array.from(surface!.querySelectorAll<HTMLTableRowElement>('tbody tr'))))
  39 |   const renderedRowCount = Array.from(rows).filter(row => {
  40 |     const cells = Array.from(row.cells)
  41 |     // Exclude empty/error placeholders, hidden responsive copies, and headers.
  42 |     return cells.some(cell => cell.tagName === 'TD') && !(cells.length === 1 && cells[0].colSpan > 1) &&
  43 |       row.getClientRects().length > 0 && getComputedStyle(row).visibility !== 'hidden'
  44 |   }).length
  45 |   // A ready canonical table promises data rows. Missing rows may mean its
  46 |   // children have not rendered yet; only an explicit empty state permits zero.
  47 |   if (!renderedRowCount && surfaces.some(surface => surface!.dataset.tableState === 'ready')) return false
  48 |   return { state: "ready", resultKind: renderedRowCount ? "table-rows" : "table-empty", renderedRowCount }
  49 | }
  50 | 
  51 | export async function waitForFinanceX1Result(page: Page, routeKey: string): Promise<FinanceX1Result> {
> 52 |   const handle = await page.waitForFunction(readFinanceX1Result, routeKey, { timeout: 60_000 })
     |                             ^ TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
  53 |   const result = await handle.jsonValue() as FinanceX1Result
  54 |   await handle.dispose()
  55 |   if (result.state !== "ready") throw new Error(`Finance route ${routeKey} reached an error or access-denied state`)
  56 |   return result
  57 | }
  58 | 
  59 | export async function measureFinanceX1Route(page: Page, path: string, routeKey: string) {
  60 |   const startedAt = Date.now()
  61 |   await page.goto(path, { waitUntil: "domcontentloaded" })
  62 |   const navigationMs = Date.now() - startedAt
  63 |   if (/\/(?:login|unauthorized)(?:\?|$)/.test(page.url())) throw new Error("Finance evidence requires an authorized session")
  64 |   await waitForFinanceX1Result(page, routeKey)
  65 |   return { navigationMs, usefulResultMs: Date.now() - startedAt }
  66 | }
  67 | 
```