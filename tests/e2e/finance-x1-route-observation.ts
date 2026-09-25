import type { Page } from "@playwright/test"

export type FinanceX1Result = {
  state: "ready" | "error"
  resultKind: "table-rows" | "table-empty" | "summary"
  renderedRowCount: number
}

// Self-contained because Playwright serializes this function into the page.
// false means pending: a missing table is never evidence of an empty result.
export function readFinanceX1Result(routeKey: string): FinanceX1Result | false {
  const failed = document.querySelector('[data-table-state="error"], [data-table-state="forbidden"], [data-table-state="not-entitled"], [data-finance-result-state="error"]')
  if (failed) return { state: "error", resultKind: "table-empty", renderedRowCount: 0 }
  if (document.querySelector('[data-finance-result-state="refreshing"]')) return false

  const selectors: Record<string, string[]> = {
    "receivables-history": ['[data-table-id="finance.receivables-history"]'],
    payables: ['[data-table-id="finance.payments-ledger"]'],
    "cash-flow": ['[data-table-id="finance.cash-flow"]'],
    journals: ['[data-finance-result="journals"]', '[data-table-id="accounting.journal-entries-drafts"]', '[data-table-id="accounting.journal-entries-posted"]'],
    "trial-balance": ['[data-table-id="accounting.trial-balance"]'],
    "financial-statements": ['[data-finance-result="financial-statements"]'],
    "accountant-portal": ['[data-finance-result="accountant-portal"]'],
  }
  const required = selectors[routeKey]
  if (!required) throw new Error(`Unknown finance evidence route: ${routeKey}`)
  const surfaces = required.map(selector => document.querySelector<HTMLElement>(selector))
  if (surfaces.some(surface => !surface)) return false
  for (const surface of surfaces) {
    if (!surface!.getClientRects().length || getComputedStyle(surface!).visibility === 'hidden') return false
    const state = surface!.dataset.tableState ?? surface!.dataset.financeResultState
    if (!['ready', 'empty', 'no-results'].includes(state ?? '') || surface!.getAttribute('aria-busy') === 'true') return false
  }
  if (routeKey === "financial-statements" && surfaces[0]!.dataset.financeResultLayout === "summary") {
    return { state: "ready", resultKind: "summary", renderedRowCount: 0 }
  }

  const rows = new Set(surfaces.flatMap(surface => Array.from(surface!.querySelectorAll<HTMLTableRowElement>('tbody tr'))))
  const renderedTableRowCount = Array.from(rows).filter(row => {
    const cells = Array.from(row.cells)
    // Exclude empty/error placeholders, hidden responsive copies, and headers.
    return cells.some(cell => cell.tagName === 'TD') && !(cells.length === 1 && cells[0].colSpan > 1) &&
      row.getClientRects().length > 0 && getComputedStyle(row).visibility !== 'hidden'
  }).length
  const mobileRows = new Set(surfaces.flatMap(surface => Array.from(surface!.querySelectorAll<HTMLElement>('[data-table-mobile-row]'))))
  const renderedMobileRowCount = Array.from(mobileRows).filter(row =>
    row.getClientRects().length > 0 && getComputedStyle(row).visibility !== 'hidden'
  ).length
  const renderedRowCount = renderedTableRowCount + renderedMobileRowCount
  // A ready canonical table promises data rows. Missing rows may mean its
  // children have not rendered yet; only an explicit empty state permits zero.
  if (!renderedRowCount && surfaces.some(surface => surface!.dataset.tableState === 'ready')) return false
  return { state: "ready", resultKind: renderedRowCount ? "table-rows" : "table-empty", renderedRowCount }
}

export async function waitForFinanceX1Result(page: Page, routeKey: string): Promise<FinanceX1Result> {
  const handle = await page.waitForFunction(readFinanceX1Result, routeKey, { timeout: 60_000 })
  const result = await handle.jsonValue() as FinanceX1Result
  await handle.dispose()
  if (result.state !== "ready") throw new Error(`Finance route ${routeKey} reached an error or access-denied state`)
  return result
}

export async function measureFinanceX1Route(page: Page, path: string, routeKey: string) {
  const startedAt = Date.now()
  await page.goto(path, { waitUntil: "domcontentloaded" })
  const navigationMs = Date.now() - startedAt
  if (/\/(?:login|unauthorized)(?:\?|$)/.test(page.url())) throw new Error("Finance evidence requires an authorized session")
  await waitForFinanceX1Result(page, routeKey)
  return { navigationMs, usefulResultMs: Date.now() - startedAt }
}
