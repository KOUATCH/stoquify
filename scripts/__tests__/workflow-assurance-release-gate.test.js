const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  evaluateWorkflowAssuranceReleaseGate,
  extractDefinitions,
  parseArgs,
  renderMarkdown,
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
          metadata: { assuranceDomain: "ledger", productionActivationCertified: true },
        },
      ]
    `)

    expect(definitions).toEqual([
      expect.objectContaining({
        checkKey: "ledger.test",
        ownerRole: "accountant",
        sourceTables: true,
        assuranceDomain: true,
        productionActivationCertified: "true",
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
            metadata: { assuranceDomain: "ledger", productionActivationCertified: true },
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
        @@unique([organizationId, checkKey, definitionVersion, sourceType, sourceId], name: "workflow_assurance_incident_identity_key")
        @@index([organizationId, status, severity, lastDetectedAt])
        @@index([organizationId, workflow, status])
        @@index([organizationId, ownerId, status, dueAt])
        @@index([organizationId, runStatus, startedAt])
        @@index([organizationId, sourceType, sourceId])
        @@index([organizationId, status, createdAt])
        @@unique([organizationId, checkKey, definitionVersion, executionKey], name: "workflow_assurance_run_execution_key")
        model WorkflowAssuranceCheckFinding {
          @@unique([checkRunId, ordinal])
          @@unique([checkRunId, fingerprint])
          @@index([organizationId, sourceType, sourceId])
        }
      `,
    })

    const report = evaluateWorkflowAssuranceReleaseGate(root)

    expect(report.summary.enforceModeStatus).toBe("ready")
    expect(report.summary.blockerCount).toBe(0)
  })

  it("does not require runner activation for disabled staged definitions", () => {
    const root = makeFixtureRoot({
      contract: `
        export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
          {
            checkKey: "pos.closed_shift_cash_shortage.review",
            executionMode: "scheduled_scan",
            defaultSeverity: "high",
            requiredPermission: "pos.transactions.read",
            ownerRole: "branch_manager",
            enabled: false,
            enforceMode: false,
            sourceTables: ["business_events", "cash_shortage_policies"],
            actionRoute: "/dashboard/manager-action-center",
            metadata: { assuranceDomain: "pos_cash_shortage_review", stagedDefinitionOnly: true },
          },
        ]
      `,
      registry: "",
      registryTest: "",
      scheduler: `export const WORKFLOW_ASSURANCE_SCHEDULER_POLICIES = { scheduled_scan: { cursorFields: [] } }`,
      controlTower: `const staleRunningCount = 0; const failedRunCount = 0; const pendingAlertCount = 0; const failedAlertCount = 0;`,
      schema: `
        @@unique([organizationId, checkKey, definitionVersion, sourceType, sourceId], name: "workflow_assurance_incident_identity_key")
        @@index([organizationId, status, severity, lastDetectedAt])
        @@index([organizationId, workflow, status])
        @@index([organizationId, ownerId, status, dueAt])
        @@index([organizationId, runStatus, startedAt])
        @@index([organizationId, sourceType, sourceId])
        @@index([organizationId, status, createdAt])
        @@unique([organizationId, checkKey, definitionVersion, executionKey], name: "workflow_assurance_run_execution_key")
        model WorkflowAssuranceCheckFinding {
          @@unique([checkRunId, ordinal])
          @@unique([checkRunId, fingerprint])
          @@index([organizationId, sourceType, sourceId])
        }
      `,
    })

    const report = evaluateWorkflowAssuranceReleaseGate(root)

    expect(report.summary.blockerCount).toBe(0)
    expect(report.checks).toEqual([
      expect.objectContaining({
        checkKey: "pos.closed_shift_cash_shortage.review",
        enabled: false,
        blockers: [],
      }),
    ])
    expect(renderMarkdown(report)).toContain("| pos.closed_shift_cash_shortage.review | disabled |")
  })

  it("blocks enabled POS cash-shortage definitions without certified production activation", () => {
    const root = makeFixtureRoot({
      contract: `
        export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
          {
            checkKey: "pos.closed_shift_cash_shortage.review",
            executionMode: "scheduled_scan",
            defaultSeverity: "high",
            requiredPermission: "pos.transactions.read",
            ownerRole: "branch_manager",
            enabled: true,
            enforceMode: false,
            sourceTables: ["business_events", "cash_shortage_policies"],
            actionRoute: "/dashboard/manager-action-center",
            metadata: { assuranceDomain: "pos_cash_shortage_review", productionActivationCertified: false },
          },
        ]
      `,
      registry: `
        const CHECK_RUNNERS = { "pos.closed_shift_cash_shortage.review": runDormantPosShiftCashShortageReviewCheck }
        function runDormantPosShiftCashShortageReviewCheck() {
          const sourceHash = createAssuranceSourceHash({})
          return { evidenceLinks: [], sourceHash }
        }
      `,
      registryTest: `it("covers pos.closed_shift_cash_shortage.review clean and broken fixture", () => {})`,
      scheduler: `export const WORKFLOW_ASSURANCE_SCHEDULER_POLICIES = { scheduled_scan: { cursorFields: [] } }`,
      controlTower: `const staleRunningCount = 0; const failedRunCount = 0; const pendingAlertCount = 0; const failedAlertCount = 0;`,
      schema: `
        @@unique([organizationId, checkKey, definitionVersion, sourceType, sourceId], name: "workflow_assurance_incident_identity_key")
        @@index([organizationId, status, severity, lastDetectedAt])
        @@index([organizationId, workflow, status])
        @@index([organizationId, ownerId, status, dueAt])
        @@index([organizationId, runStatus, startedAt])
        @@index([organizationId, sourceType, sourceId])
        @@index([organizationId, status, createdAt])
        @@unique([organizationId, checkKey, definitionVersion, executionKey], name: "workflow_assurance_run_execution_key")
        model WorkflowAssuranceCheckFinding {
          @@unique([checkRunId, ordinal])
          @@unique([checkRunId, fingerprint])
          @@index([organizationId, sourceType, sourceId])
        }
      `,
    })

    const report = evaluateWorkflowAssuranceReleaseGate(root)

    expect(report.summary.enforceModeStatus).toBe("blocked")
    expect(report.blockers).toEqual([
      {
        area: "pos.closed_shift_cash_shortage.review",
        blocker: "missing certified POS cash-shortage production activation marker",
      },
    ])
    expect(renderMarkdown(report)).toContain("missing certified POS cash-shortage production activation marker")
  })

  it("accepts enabled POS cash-shortage definitions only with certified production activation", () => {
    const root = makeFixtureRoot({
      contract: `
        export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS = [
          {
            checkKey: "pos.closed_shift_cash_shortage.review",
            executionMode: "scheduled_scan",
            defaultSeverity: "high",
            requiredPermission: "pos.transactions.read",
            ownerRole: "branch_manager",
            enabled: true,
            enforceMode: false,
            sourceTables: ["business_events", "cash_shortage_policies"],
            actionRoute: "/dashboard/manager-action-center",
            metadata: { assuranceDomain: "pos_cash_shortage_review", productionActivationCertified: true },
          },
        ]
      `,
      registry: `
        const CHECK_RUNNERS = { "pos.closed_shift_cash_shortage.review": runDormantPosShiftCashShortageReviewCheck }
        function runDormantPosShiftCashShortageReviewCheck() {
          const sourceHash = createAssuranceSourceHash({})
          return { evidenceLinks: [], sourceHash }
        }
      `,
      registryTest: `it("covers pos.closed_shift_cash_shortage.review clean and broken fixture", () => {})`,
      scheduler: `export const WORKFLOW_ASSURANCE_SCHEDULER_POLICIES = { scheduled_scan: { cursorFields: [] } }`,
      controlTower: `const staleRunningCount = 0; const failedRunCount = 0; const pendingAlertCount = 0; const failedAlertCount = 0;`,
      schema: `
        @@unique([organizationId, checkKey, definitionVersion, sourceType, sourceId], name: "workflow_assurance_incident_identity_key")
        @@index([organizationId, status, severity, lastDetectedAt])
        @@index([organizationId, workflow, status])
        @@index([organizationId, ownerId, status, dueAt])
        @@index([organizationId, runStatus, startedAt])
        @@index([organizationId, sourceType, sourceId])
        @@index([organizationId, status, createdAt])
        @@unique([organizationId, checkKey, definitionVersion, executionKey], name: "workflow_assurance_run_execution_key")
        model WorkflowAssuranceCheckFinding {
          @@unique([checkRunId, ordinal])
          @@unique([checkRunId, fingerprint])
          @@index([organizationId, sourceType, sourceId])
        }
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
            metadata: { assuranceDomain: "ledger", productionActivationCertified: true },
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
        expect.objectContaining({
          area: "indexes",
          blocker: "organization + check + definition version + source identity",
        }),
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
