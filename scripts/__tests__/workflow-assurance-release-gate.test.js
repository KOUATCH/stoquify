const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  evaluateWorkflowAssuranceReleaseGate,
  extractDefinitions,
  parseArgs,
} = require("../workflow-assurance-release-gate")

describe("workflow assurance release gate", () => {
  it("extracts workflow assurance definitions from the registry contract", () => {
    const definitions = extractDefinitions(`
      export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
        {
          checkKey: "ledger.test",
          executionMode: "scheduled_scan",
          defaultSeverity: "blocking",
          requiredPermission: "accounting.audit.read",
          ownerRole: "accountant",
          enforceMode: false,
          sourceTables: ["journal_entries"],
          actionRoute: "/dashboard/accounting/journals",
          metadata: { assuranceDomain: "ledger" },
        },
      ]
    `)

    expect(definitions).toEqual([
      expect.objectContaining({
        checkKey: "ledger.test",
        ownerRole: "accountant",
        sourceTables: true,
        assuranceDomain: true,
      }),
    ])
  })

  it("returns ready when static assurance release foundations exist", () => {
    const root = makeFixtureRoot({
      contract: `
        export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
          {
            checkKey: "ledger.test",
            executionMode: "scheduled_scan",
            defaultSeverity: "blocking",
            requiredPermission: "accounting.audit.read",
            ownerRole: "accountant",
            enforceMode: false,
            sourceTables: ["journal_entries"],
            actionRoute: "/dashboard/accounting/journals",
            metadata: { assuranceDomain: "ledger" },
          },
        ]
      `,
      registry: `
        const CHECK_RUNNERS = { "ledger.test": runLedgerTest }
        function runLedgerTest() {
          const sourceHash = createAssuranceSourceHash({})
          return { evidenceLinks: [], sourceHash }
        }
      `,
      registryTest: `it("covers ledger.test clean and broken fixture", () => {})`,
      scheduler: `export const WORKFLOW_ASSURANCE_SCHEDULER_POLICIES = { scheduled_scan: { cursorFields: [] } }`,
      controlTower: `const staleRunningCount = 0; const failedRunCount = 0; const pendingAlertCount = 0; const failedAlertCount = 0;`,
      schema: `
        @@index([organizationId, status, severity, lastDetectedAt])
        @@index([organizationId, workflow, status])
        @@index([organizationId, ownerId, status, dueAt])
        @@index([organizationId, runStatus, startedAt])
        @@index([organizationId, sourceType, sourceId])
        @@index([organizationId, status, createdAt])
      `,
    })

    const report = evaluateWorkflowAssuranceReleaseGate(root)

    expect(report.summary.enforceModeStatus).toBe("ready")
    expect(report.summary.blockerCount).toBe(0)
  })

  it("blocks enforce-mode when route, runner, tests, and indexes are missing", () => {
    const root = makeFixtureRoot({
      contract: `
        export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
          {
            checkKey: "ledger.test",
            executionMode: "scheduled_scan",
            defaultSeverity: "blocking",
            requiredPermission: "accounting.audit.read",
            ownerRole: "accountant",
            enforceMode: false,
            sourceTables: ["journal_entries"],
            metadata: { assuranceDomain: "ledger" },
          },
        ]
      `,
      registry: "",
      registryTest: "",
      scheduler: "",
      controlTower: "",
      schema: "",
    })

    const report = evaluateWorkflowAssuranceReleaseGate(root)

    expect(report.summary.enforceModeStatus).toBe("blocked")
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: "ledger.test", blocker: "missing action route" }),
        expect.objectContaining({ area: "ledger.test", blocker: "missing registered runner" }),
        expect.objectContaining({ area: "indexes" }),
      ]),
    )
  })

  it("parses report mode by default", () => {
    expect(parseArgs(["node", "script"])).toMatchObject({ mode: "report" })
  })
})

function makeFixtureRoot(input) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-assurance-release-gate-"))
  write(root, "services/assurance/assurance-registry-contracts.ts", input.contract)
  write(root, "services/assurance/assurance-registry.service.ts", input.registry)
  write(root, "services/assurance/__tests__/assurance-registry.service.test.ts", input.registryTest)
  write(root, "services/assurance/assurance-scheduler.service.ts", input.scheduler)
  write(root, "services/assurance/assurance-control-tower.service.ts", input.controlTower)
  write(root, "prisma/schema.prisma", input.schema)
  return root
}

function write(root, relativePath, content) {
  const absolute = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, content, "utf8")
}
