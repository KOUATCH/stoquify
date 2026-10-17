jest.mock("server-only", () => ({}))

import type { Prisma } from "@prisma/client"
import { lockAccountingPeriodCatalogInTx } from "../accounting-period-catalog.service"

it("uses the same tenant-scoped transaction key for shared and exclusive acquisition", async () => {
  const query = jest.fn().mockResolvedValue([])
  const tx = { $queryRaw: query } as unknown as Prisma.TransactionClient
  await lockAccountingPeriodCatalogInTx(tx, "org:one/two", "shared")
  await lockAccountingPeriodCatalogInTx(tx, "org:one/two", "exclusive")
  await lockAccountingPeriodCatalogInTx(tx, "org:two/one", "shared")
  const [shared, exclusive, otherTenant] = query.mock.calls.map(([sql]) => sql)
  expect(shared.text).toContain("pg_advisory_xact_lock_shared")
  expect(exclusive.text).toContain("pg_advisory_xact_lock(")
  expect(shared.values).toEqual([JSON.stringify(["accounting-period-catalog", "org:one/two"])])
  expect(exclusive.values).toEqual(shared.values)
  expect(otherTenant.values).not.toEqual(shared.values)
})

it.each(["shared", "exclusive"] as const)("waits for %s acquisition and propagates failure", async mode => {
  let reject!: (error: Error) => void
  const query = jest.fn(() => new Promise((_resolve, fail) => { reject = fail }))
  const tx = { $queryRaw: query } as unknown as Prisma.TransactionClient
  let acquired = false
  const pending = lockAccountingPeriodCatalogInTx(tx, "org-1", mode).then(() => { acquired = true })
  await Promise.resolve()
  expect(acquired).toBe(false)
  const failure = new Error("Catalog lock unavailable")
  reject(failure)
  await expect(pending).rejects.toBe(failure)
  expect(acquired).toBe(false)
})
