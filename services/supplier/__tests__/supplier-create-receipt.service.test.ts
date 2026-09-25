import { db } from "@/prisma/db"
import { createSupplierForManagement } from "../supplier.service"

jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn() } }))
jest.mock("@/prisma/db", () => ({ db: { supplier: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn() } } }))

const mockSupplier = db.supplier as unknown as { findFirst: jest.Mock; create: jest.Mock; count: jest.Mock }
const input = { name: "Test supplier", code: "SUP-TEST", isActive: true, preferredLocale: "FR" as const }
const committed = { id: "supplier-saved", organizationId: "org-1", name: "Test supplier", code: "SUP-TEST", creditLimit: null }

beforeEach(() => {
  jest.resetAllMocks()
  mockSupplier.findFirst.mockResolvedValueOnce(null).mockRejectedValue(new Error("Aggregate lookup unavailable"))
  mockSupplier.create.mockResolvedValue(committed)
})

it("returns the committed supplier identity without a fallible aggregate reload", async () => {
  await expect(createSupplierForManagement("org-1", input)).resolves.toEqual({
    id: committed.id, organizationId: committed.organizationId, name: committed.name, code: committed.code,
  })
  expect(mockSupplier.create).toHaveBeenCalledTimes(1)
  expect(mockSupplier.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", preferredLocale: "FR" }) }))
  expect(mockSupplier.findFirst).toHaveBeenCalledTimes(1)
  expect(mockSupplier.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", code: input.code } })
})

it("still rejects an actual create failure without returning a receipt or retrying", async () => {
  mockSupplier.create.mockRejectedValue(new Error("Insert failed"))
  await expect(createSupplierForManagement("org-1", input)).rejects.toThrow("Insert failed")
  expect(mockSupplier.create).toHaveBeenCalledTimes(1)
  expect(mockSupplier.findFirst).toHaveBeenCalledTimes(1)
})

it("preserves tenant-scoped code conflicts before any insert", async () => {
  mockSupplier.findFirst.mockReset().mockResolvedValue({ id: "existing" })
  await expect(createSupplierForManagement("org-1", input)).rejects.toThrow("already exists")
  expect(mockSupplier.create).not.toHaveBeenCalled()
})
