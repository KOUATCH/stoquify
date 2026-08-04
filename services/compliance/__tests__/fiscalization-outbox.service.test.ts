import { Prisma } from "@prisma/client"

import {
  posFiscalizationRequestSchema,
  sourceFingerprint,
} from "../fiscalization-outbox.service"

describe("fiscalization outbox contract", () => {
  it("accepts a tenant-scoped immutable POS request", () => {
    const sourcePayloadHash = sourceFingerprint({
      salesOrderId: "sale-1",
      orderNumber: "POS-001",
      total: new Prisma.Decimal("119.25"),
      postingBatchId: "batch-1",
      issueAt: "2026-07-26T10:00:00.000Z",
    })

    expect(
      posFiscalizationRequestSchema.parse({
        organizationId: "org-1",
        salesOrderId: "sale-1",
        orderNumber: "POS-001",
        actorId: "user-1",
        locationId: "location-1",
        terminalId: "terminal-1",
        postingBatchId: "batch-1",
        issueAt: "2026-07-26T10:00:00.000Z",
        sourcePayloadHash,
      }),
    ).toMatchObject({
      organizationId: "org-1",
      sourcePayloadHash,
    })
  })

  it("rejects an unscoped request", () => {
    expect(() =>
      posFiscalizationRequestSchema.parse({
        salesOrderId: "sale-1",
      }),
    ).toThrow()
  })
})
