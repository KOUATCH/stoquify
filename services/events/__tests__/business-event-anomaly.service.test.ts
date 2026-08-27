import { listOpenBusinessEventAnomalies } from "../business-event-anomaly.service"

function createClient() {
  const store = {
    businessEventAudit: {
      create: jest.fn(),
    },
    businessEventAnomaly: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  }

  return {
    ...store,
    $transaction: jest.fn(async (callback) => callback(store)),
  }
}

describe("business event anomaly queue", () => {
  it("lists only open operator anomalies for the requested tenant", async () => {
    const client = createClient()
    client.businessEventAnomaly.findMany.mockResolvedValue([
      {
        id: "anomaly-1",
        businessEventId: "event-1",
        code: "IDEMPOTENCY_CONFLICT",
        severity: "HIGH",
        status: "OPEN",
      },
    ])

    await expect(
      listOpenBusinessEventAnomalies(
        { organizationId: "org-1", limit: 10 },
        client,
      ),
    ).resolves.toHaveLength(1)
    expect(client.businessEventAnomaly.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      orderBy: [{ severity: "desc" }, { lastSeenAt: "desc" }],
      take: 10,
      select: expect.objectContaining({
        id: true,
        businessEventId: true,
        code: true,
        severity: true,
        status: true,
      }),
    })
  })
})
