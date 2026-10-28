import { Prisma } from "@prisma/client"

import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  assertBalancedJournalEntry,
  assertOpenPeriod,
  assertSameOrganizationAccounts,
  buildPostingIdempotencyKey,
} from "../invariants"

describe("accounting invariants", () => {
  it("accepts balanced journal lines by currency", () => {
    expect(
      assertBalancedJournalEntry([
        { debit: new Prisma.Decimal(1000), currency: "XAF" },
        { credit: "1000.00", currency: "xaf" },
      ]),
    ).toBe(true)
  })

  it("rejects unbalanced journal lines", () => {
    expect(() =>
      assertBalancedJournalEntry([
        { debit: 1000, currency: "XAF" },
        { credit: 900, currency: "XAF" },
      ]),
    ).toThrow(BusinessRuleError)

    expect(() =>
      assertBalancedJournalEntry([
        { debit: 1000, currency: "XAF" },
        { credit: 900, currency: "XAF" },
      ]),
    ).toThrow(/not balanced/i)
  })

  it("rejects lines with both debit and credit", () => {
    expect(() =>
      assertBalancedJournalEntry([{ debit: 100, credit: 100, currency: "XAF" }]),
    ).toThrow(BusinessRuleError)

    expect(() =>
      assertBalancedJournalEntry([{ debit: 100, credit: 100, currency: "XAF" }]),
    ).toThrow(/both debit and credit/i)
  })

  it("requires all accounts to belong to the posting organization", () => {
    expect(
      assertSameOrganizationAccounts("org-a", [
        { id: "cash", code: "571", organizationId: "org-a" },
        { id: "sales", code: "701", organizationId: "org-a" },
      ]),
    ).toBe(true)

    expect(() =>
      assertSameOrganizationAccounts("org-a", [
        { id: "cash", code: "571", organizationId: "org-b" },
      ]),
    ).toThrow(ForbiddenError)

    expect(() =>
      assertSameOrganizationAccounts("org-a", [
        { id: "cash", code: "571", organizationId: "org-b" },
      ]),
    ).toThrow(/does not belong/i)
  })

  it("builds stable posting idempotency keys", () => {
    expect(
      buildPostingIdempotencyKey({
        organizationId: "org 1",
        sourceType: "pos_sale",
        sourceId: "sale-123",
        postingPurpose: "sale_completion",
        sourceVersion: 2,
      }),
    ).toBe("ORG-1:POS_SALE:SALE-123:SALE_COMPLETION:V2")
  })

  it("accepts open periods and rejects closed or out-of-range periods", () => {
    const period = {
      id: "period-1",
      organizationId: "org-a",
      name: "June 2026",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
      status: "OPEN",
    }

    expect(assertOpenPeriod(period, new Date("2026-06-09T12:00:00.000Z"), "org-a")).toBe(true)

    expect(() =>
      assertOpenPeriod({ ...period, status: "CLOSED" }, new Date("2026-06-09T12:00:00.000Z"), "org-a"),
    ).toThrow(BusinessRuleError)

    expect(() =>
      assertOpenPeriod({ ...period, status: "CLOSED" }, new Date("2026-06-09T12:00:00.000Z"), "org-a"),
    ).toThrow(/not open/i)

    expect(() =>
      assertOpenPeriod(period, new Date("2026-07-01T00:00:00.000Z"), "org-a"),
    ).toThrow(/outside accounting period/i)
  })
})
