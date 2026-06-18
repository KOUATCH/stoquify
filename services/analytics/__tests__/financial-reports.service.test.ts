jest.mock("server-only", () => ({}))

import { buildReportProvenance } from "../financial-reports.service"

describe("financial report read-model provenance", () => {
  it("marks analytics reports as internal operational read models with blockers", () => {
    const provenance = buildReportProvenance({
      organizationId: "org-1",
      locationId: "all",
      start: new Date("2026-06-01T00:00:00.000Z"),
      end: new Date("2026-06-30T23:59:59.999Z"),
      sourceTables: ["salesOrder", "payment"],
      rowCount: 12,
    })

    expect(provenance).toMatchObject({
      source: "PRISMA_OPERATIONAL_READ_MODEL",
      sourceLabel: "Service-backed operational database read model",
      evidenceStatus: "OPERATIONAL_READ_MODEL",
      certificationStatus: "INTERNAL_REPORT_ONLY",
      certificationLabel: "Internal management report only",
      rowCount: 12,
      sourceTables: ["salesOrder", "payment"],
    })
    expect(provenance.knownBlockers).toEqual(
      expect.arrayContaining([
        "Not a statutory OHADA certified export",
        "Not signed by Close & Assurance pack controls",
      ]),
    )
    expect(provenance.filterHash).toHaveLength(64)
  })
})
