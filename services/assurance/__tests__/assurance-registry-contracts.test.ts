import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  assertCheckDefinitionComplete,
  createAssuranceSourceHash,
  normalizeAssuranceResult,
} from "../assurance-registry-contracts"

describe("workflow assurance registry contracts", () => {
  it("keeps initial check definitions complete and observe-mode only", () => {
    for (const definition of INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS) {
      expect(() => assertCheckDefinitionComplete(definition)).not.toThrow()
      expect(definition.enforceMode).toBe(false)
      expect(definition.sourceTables.length).toBeGreaterThan(0)
      expect(definition.requiredPermission).toContain(".")
    }
  })

  it("registers payroll operations checks with safe aggregate routing", () => {
    const prompt20CheckKeys = [
      "payroll.released_payment_evidence.required",
      "payroll.payment_reconciliation_exception.visible",
      "payroll.declaration_lifecycle_exception.visible",
      "payroll.close_evidence.stale.visible",
    ]
    const definitions = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.filter((definition) =>
      prompt20CheckKeys.includes(definition.checkKey),
    )

    expect(definitions).toHaveLength(prompt20CheckKeys.length)

    for (const definition of definitions) {
      expect(definition.workflow).toBe("payroll")
      expect(definition.moduleSlug).toBe("payroll")
      expect(definition.enforceMode).toBe(false)
      expect(["/dashboard/payroll", "/dashboard/accounting/close"]).toContain(definition.actionRoute)
      expect(definition.metadata).toEqual(expect.objectContaining({ evidenceLevel: "aggregate_redacted" }))
      expect(JSON.stringify(definition.metadata).toLowerCase()).not.toMatch(/salary|bank|iban|raw|payload|destination/)
    }
  })
  it("rejects an enforce-mode definition during the foundation rollout", () => {
    const definition = {
      ...INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS[0],
      enforceMode: true,
    }

    expect(() => assertCheckDefinitionComplete(definition)).toThrow(/cannot start in enforce mode/i)
  })

  it("hashes source evidence deterministically regardless of object key order", () => {
    const left = createAssuranceSourceHash({
      sourceId: "entry-1",
      counts: { failed: 1, scanned: 3 },
      evidence: [{ sourceTable: "journal_entries", sourceId: "je-1" }],
    })
    const right = createAssuranceSourceHash({
      evidence: [{ sourceId: "je-1", sourceTable: "journal_entries" }],
      counts: { scanned: 3, failed: 1 },
      sourceId: "entry-1",
    })

    expect(left).toBe(right)
  })

  it("normalizes result status, counts, source hash, and fingerprint", () => {
    const result = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: "ledger.posted_source_link.required",
      status: "warning",
      sourceType: "journal_entries",
      sourceId: "aggregate",
      metadata: { missingSourceLinkCount: 2 },
    })

    expect(result.severity).toBe("warning")
    expect(result.counts).toEqual({
      scanned: 1,
      passed: 0,
      warning: 1,
      failed: 0,
      blocked: 0,
      skipped: 0,
      error: 0,
    })
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })
})
