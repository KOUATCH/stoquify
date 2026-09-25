import { db } from "@/prisma/db"
import { createCustomerForManagement } from "../customer.service"

jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn() } }))
jest.mock("@/prisma/db", () => ({ db: { customer: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn() } } }))

const mockCustomer = db.customer as unknown as { findFirst: jest.Mock; create: jest.Mock; count: jest.Mock }
const input = { name: "Test customer", code: "CUST-TEST", isActive: true, preferredLocale: "FR" as const }
const committed = { id: "customer-saved", organizationId: "org-1", name: "Test customer", code: "CUST-TEST", creditLimit: null }

beforeEach(() => {
  jest.resetAllMocks()
  mockCustomer.findFirst.mockResolvedValueOnce(null).mockRejectedValue(new Error("Aggregate lookup unavailable"))
  mockCustomer.create.mockResolvedValue(committed)
})

it("returns the committed customer identity without a fallible aggregate reload", async () => {
  await expect(createCustomerForManagement("org-1", input)).resolves.toEqual({
    id: committed.id, organizationId: committed.organizationId, name: committed.name, code: committed.code,
  })
  expect(mockCustomer.create).toHaveBeenCalledTimes(1)
  expect(mockCustomer.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", preferredLocale: "FR" }) }))
  expect(mockCustomer.findFirst).toHaveBeenCalledTimes(1)
  expect(mockCustomer.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", code: input.code } })
})

it("still rejects an actual create failure without returning a receipt or retrying", async () => {
  mockCustomer.create.mockRejectedValue(new Error("Insert failed"))
  await expect(createCustomerForManagement("org-1", input)).rejects.toThrow("Insert failed")
  expect(mockCustomer.create).toHaveBeenCalledTimes(1)
  expect(mockCustomer.findFirst).toHaveBeenCalledTimes(1)
})

it("preserves tenant-scoped code conflicts before any insert", async () => {
  mockCustomer.findFirst.mockReset().mockResolvedValue({ id: "existing" })
  await expect(createCustomerForManagement("org-1", input)).rejects.toThrow("already exists")
  expect(mockCustomer.create).not.toHaveBeenCalled()
})
