import { measureFinanceX1Route, readFinanceX1Result } from "../../../tests/e2e/finance-x1-route-observation"
import type { Page } from "@playwright/test"

const dataRow = '<tr><td>AR-001</td><td>100</td></tr>'
function table(state: string, rows = dataRow, id = 'finance.receivables-history') {
  return `<section data-table-id="${id}" data-table-state="${state}"><table><tbody>${rows}</tbody></table></section>`
}

beforeEach(() => {
  jest.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
    return (this.hidden ? [] : [{ width: 10, height: 10 }]) as unknown as DOMRectList
  })
})
afterEach(() => { document.body.innerHTML = ''; jest.restoreAllMocks() })

test('does not equate a loading skeleton or absent data surface with an empty result', () => {
  document.body.innerHTML = '<main><div class="skeleton"></div></main>'
  expect(readFinanceX1Result('cash-flow')).toBe(false)
  document.body.innerHTML = table('loading', '')
  expect(readFinanceX1Result('receivables-history')).toBe(false)
})
test('waits through refreshes even with old rows present', () => {
  document.body.innerHTML = table('refreshing')
  expect(readFinanceX1Result('receivables-history')).toBe(false)
})
test.each(['error', 'forbidden', 'not-entitled'])('rejects %s instead of recording a successful zero', state => {
  document.body.innerHTML = table(state)
  expect(readFinanceX1Result('receivables-history')).toMatchObject({ state: 'error' })
})
test('counts data rows while excluding headers, hidden copies, and empty placeholders', () => {
  document.body.innerHTML = table('ready', dataRow + '<tr><th>Header</th></tr><tr hidden><td>Hidden</td></tr><tr><td colspan="8">No rows</td></tr>')
  expect(readFinanceX1Result('receivables-history')).toEqual({ state: 'ready', resultKind: 'table-rows', renderedRowCount: 1 })
})
test('counts visible canonical mobile cards when responsive desktop rows are hidden', () => {
  document.body.innerHTML = table('ready', '<tr hidden><td>AR-001</td></tr><tr><td colspan="8">No rows</td></tr>')
  document.querySelector('[data-table-id]')!.insertAdjacentHTML('beforeend', '<article data-table-mobile-row>AR-001</article>')
  expect(readFinanceX1Result('receivables-history')).toEqual({ state: 'ready', resultKind: 'table-rows', renderedRowCount: 1 })
})
test('accepts an explicitly empty table with no fabricated data row', () => {
  document.body.innerHTML = table('empty', '<tr><td colspan="8">No disbursements</td></tr>', 'finance.payments-ledger')
  expect(readFinanceX1Result('payables')).toEqual({ state: 'ready', resultKind: 'table-empty', renderedRowCount: 0 })
})
test('does not accept ready state before its data rows are rendered', () => {
  document.body.innerHTML = table('ready', '')
  expect(readFinanceX1Result('receivables-history')).toBe(false)
})
test('recognizes a populated summary without requiring a table', () => {
  document.body.innerHTML = '<div data-finance-result="financial-statements" data-finance-result-state="ready" data-finance-result-layout="summary">Assets 889,020</div>'
  expect(readFinanceX1Result('financial-statements')).toEqual({ state: 'ready', resultKind: 'summary', renderedRowCount: 0 })
})
test('requires both journal tables and successful source responses', () => {
  document.body.innerHTML = '<div data-finance-result="journals" data-finance-result-state="ready"></div>' + table('empty', '', 'accounting.journal-entries-drafts')
  expect(readFinanceX1Result('journals')).toBe(false)
  document.body.innerHTML += table('ready', dataRow, 'accounting.journal-entries-posted')
  expect(readFinanceX1Result('journals')).toMatchObject({ state: 'ready', renderedRowCount: 1 })
  document.querySelector('[data-finance-result]')!.setAttribute('data-finance-result-state', 'error')
  expect(readFinanceX1Result('journals')).toMatchObject({ state: 'error' })
})

test('stops the useful-result timer at readiness before audits or screenshots', async () => {
  let clock = 1000
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
  const page = {
    goto: async () => { clock += 100 },
    url: () => 'http://localhost/en/dashboard/finance/cash-flow',
    waitForFunction: async () => {
      clock += 250
      return { jsonValue: async () => ({ state: 'ready', resultKind: 'table-rows', renderedRowCount: 13 }), dispose: async () => {} }
    },
  } as unknown as Page
  const timing = await measureFinanceX1Route(page, '/en/dashboard/finance/cash-flow', 'cash-flow')
  clock += 5000 // Later authorization, accessibility, and screenshot work.
  expect(timing).toEqual({ navigationMs: 100, usefulResultMs: 350 })
})

test('a background dashboard refresh prevents capturing its stale table', () => {
  document.body.innerHTML = '<main data-finance-result-state="refreshing">' + table('ready', dataRow, 'finance.cash-flow') + '</main>'
  expect(readFinanceX1Result('cash-flow')).toBe(false)
})
