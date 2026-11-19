// This fixture replaces every action. It has no account, session, DB or provider.
import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()
let revision = 0
const longReference = "SYNTHETIC-CONFIRMED-BANK-" + "REFERENCE-".repeat(13)
const bankReceipt = { id: "fixture-native-bank", method: "BANK_TRANSFER", providerReference: longReference, accountLabel: "Synthetic operating bank / compte bancaire de fonctionnement " + "long label ".repeat(8), amount: "75.00", currency: "XAF", occurredAt: "2026-10-25T14:12:00.000Z" }
const mobileReceipt = { id: "fixture-native-mobile", method: "MOBILE_MONEY", providerReference: "SYNTHETIC-MOBILE-RECEIPT", accountLabel: "Synthetic mobile account", amount: "40.00", currency: "XAF", occurredAt: "2026-10-15T12:34:00.000Z" }
const ok = (data: unknown) => ({ success: true, data, error: null, status: 200 })
const failure = (code: string) => ({ success: false, data: null, code, status: 403, error: "Mocked private diagnostic must not be displayed" })

export const fixture = {
  actorId: "fixture-collector-a", organizationId: "fixture-organization", customerId: "fixture-customer", referenceId: "fixture-invoice-a",
  ready: true, allowRead: true, allowCollect: true, mounted: true, showReceipts: true, fresh: false,
  collectMode: "success", readDenial: null as null | string,
  calls: { reads: 0, collect: [] as Array<Record<string, unknown>>, reverse: 0, password: 0 },
  waiting: [] as Array<() => void>,
  set(patch: Record<string, unknown>) { Object.assign(this, patch); revision++; listeners.forEach(listener => listener()) },
  release() { const pending = this.waiting.splice(0); pending.forEach(resolve => resolve()) },
  clearCalls() { this.calls.collect.length = 0; this.calls.password = 0 },
  receipt: bankReceipt,
}
Object.assign(window, { collectionFixture: fixture })

export function useFixture() {
  useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => revision)
  return fixture
}

export async function getCustomerSettlementWorkbenchAction(input: { customerId: string; referenceId: string }) {
  fixture.calls.reads++
  if (fixture.readDenial) return failure(fixture.readDenial)
  return ok({ scope: { organizationId: fixture.organizationId, actorUserId: fixture.actorId },
    document: { customerId: input.customerId, referenceId: input.referenceId, salesOrderId: null, documentNumber: "SYNTHETIC-OPENING-AR", currency: "XAF", openAmount: "100.00", status: "PARTIALLY_PAID" },
    canCollect: fixture.allowCollect, providerReceipts: fixture.allowCollect && fixture.showReceipts ? [bankReceipt, mobileReceipt] : [], settlements: [],
  })
}

export async function collectCustomerSettlementAction(input: Record<string, unknown>) {
  fixture.calls.collect.push(JSON.parse(JSON.stringify(input)))
  const mode = fixture.collectMode
  if (mode === "pending") await new Promise<void>(resolve => fixture.waiting.push(resolve))
  if (["AUTH_REQUIRED", "FORBIDDEN", "TENANT_SCOPE_VIOLATION"].includes(mode)) return failure(mode)
  if (mode === "uncertain") throw Error("Synthetic unknown outcome")
  if (mode === "fresh" && !fixture.fresh) return failure("FRESH_AUTH_REQUIRED")
  return ok({ settlementId: "mocked-settlement", settlementNumber: "MOCKED-NOT-POSTED", status: "POSTED", journalEntryId: "mocked-not-a-journal", replayed: false })
}

export async function reverseCustomerSettlementAction() { fixture.calls.reverse++; return failure("FORBIDDEN") }
export async function stepUpWithPasswordAction(..._input: unknown[]) { fixture.calls.password++; fixture.fresh = true; return { success: true } }
