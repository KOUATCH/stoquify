jest.mock("@/actions/purchasing/ap-history.actions", () => ({
  getAPHistoryAction: jest.fn(),
  prepareAPHistoryExportAction: jest.fn(),
}))

import {
  filtersForAPHistoryAction,
  buildAPHistoryHref,
  parseAPHistorySearchParams,
} from "../useAPHistoryWorkbench"

describe("AP history URL contract", () => {
  it("keeps the continuation cursor when opening and closing a detail on a later page", () => {
    const params=new URLSearchParams('supplierId=s1&cursor=current&pageSize=25')
    const opened=buildAPHistoryHref('/en/dashboard/purchases/payables/history',params,{selected:'supplier-invoice:i1'})
    expect(new URL(opened,'http://localhost').searchParams.get('cursor')).toBe('current')
    const closed=buildAPHistoryHref('/en/dashboard/purchases/payables/history',new URL(opened,'http://localhost').searchParams,{selected:undefined})
    expect(new URL(closed,'http://localhost').searchParams.get('cursor')).toBe('current')
  })
  it("clears stale positions on scope change or explicit restart while retaining the intended filters", () => {
    const params=new URLSearchParams('supplierId=s1&cursor=old&selected=i1&dateFrom=2026-08-01')
    for(const patch of [{lane:'payment' as const},{cursor:undefined,selected:undefined}]){const href=buildAPHistoryHref('/en/history',params,patch),next=new URL(href,'http://localhost').searchParams;expect(next.has('cursor')).toBe(false);expect(next.has('selected')).toBe(false);expect(next.get('supplierId')).toBe('s1');expect(next.get('dateFrom')).toBe('2026-08-01')}
  })
  it("preserves the supplier filter for tenant-scoped server reads", () => {
    const filters = parseAPHistorySearchParams(
      new URLSearchParams(
        "supplierId=supplier-1&lane=invoice&pageSize=25&dateFrom=2026-07-01&cursor=abc&selected=invoice-1",
      ),
    )

    expect(filters).toMatchObject({
      supplierId: "supplier-1",
      selected: "invoice-1",
    })
    expect(filtersForAPHistoryAction(filters)).toEqual({
      lane: "invoice",
      supplierId: "supplier-1",
      dateFrom: "2026-07-01",
      cursor: "abc",
      pageSize: 25,
    })
  })
})

