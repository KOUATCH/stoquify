const {
  evaluateRuntimeTablePresence,
  exitCodeForReport,
  parseArgs,
  renderMarkdown,
} = require("../workflow-assurance-runtime-table-check")

describe("workflow assurance runtime table check", () => {
  it("reports ready when required runtime tables and migration rows are present", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: ["workflow_assurance_incidents"],
      requiredMigrations: ["20260621113000_workflow_assurance_incident_spine"],
      tableRows: [{ tableName: "workflow_assurance_incidents", present: true }],
      migrationRows: [{ migrationName: "20260621113000_workflow_assurance_incident_spine", present: true }],
    })

    expect(report.status).toBe("ready")
    expect(report.summary.blockerCount).toBe(0)
  })

  it("blocks when a required table is missing", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: ["workflow_assurance_incidents"],
      requiredMigrations: [],
      tableRows: [{ tableName: "workflow_assurance_incidents", present: false }],
    })

    expect(report.status).toBe("blocked")
    expect(report.blockers).toEqual([
      {
        area: "runtime_table",
        blocker: "workflow_assurance_incidents",
      },
    ])
  })

  it("fails the release gate in fail mode when required runtime tables are missing", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: ["workflow_assurance_incidents"],
      requiredMigrations: [],
      tableRows: [{ tableName: "workflow_assurance_incidents", present: false }],
    })

    expect(exitCodeForReport(report, "fail")).toBe(1)
    expect(exitCodeForReport(report, "warn")).toBe(0)
  })

  it("blocks when a required migration row is missing", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: [],
      requiredMigrations: ["20260621103000_workflow_assurance_registry_foundation"],
      migrationRows: [{ migrationName: "20260621103000_workflow_assurance_registry_foundation", present: false }],
    })

    expect(report.status).toBe("blocked")
    expect(report.blockers).toEqual([
      {
        area: "migration_history",
        blocker: "20260621103000_workflow_assurance_registry_foundation",
      },
    ])
  })

  it("surfaces database query errors as blockers", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: [],
      requiredMigrations: [],
      queryError: new Error("schema engine unavailable"),
    })

    expect(report.status).toBe("blocked")
    expect(report.blockers).toEqual([
      {
        area: "database_query",
        blocker: "schema engine unavailable",
      },
    ])
  })

  it("renders a readable runtime check report", () => {
    const report = evaluateRuntimeTablePresence({
      requiredTables: ["workflow_assurance_incidents"],
      requiredMigrations: [],
      tableRows: [{ tableName: "workflow_assurance_incidents", present: true }],
      generatedAt: "2026-06-24T00:00:00.000Z",
    })

    expect(renderMarkdown(report, "fail")).toContain("Status: `ready`")
    expect(renderMarkdown(report, "fail")).toContain("present: workflow_assurance_incidents")
  })

  it("parses report mode by default", () => {
    expect(parseArgs(["node", "script"])).toMatchObject({ mode: "report" })
  })
})
