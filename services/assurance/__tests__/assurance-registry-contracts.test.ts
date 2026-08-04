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

  it("stages the POS cash-shortage check as disabled registry metadata only", () => {
    const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
      (candidate) => candidate.checkKey === "pos.closed_shift_cash_shortage.review",
    )

    expect(definition).toEqual(
      expect.objectContaining({
        workflow: "pos",
        moduleSlug: "pos",
        executionMode: "scheduled_scan",
        defaultSeverity: "high",
        requiredPermission: "pos.transactions.read",
        ownerRole: "branch_manager",
        enabled: false,
        enforceMode: false,
        sourceTables: ["business_events", "cash_shortage_policies"],
        actionRoute: "/dashboard/manager-action-center",
        metadata: expect.objectContaining({
          assuranceDomain: "pos_cash_shortage_review",
          stagedDefinitionOnly: true,
          adapter: "pos-shift-cash-shortage-assurance-adapter",
          productionThresholdConfigured: true,
          productionActivationCertified: false,
          activationHold: "worker_scheduler_incident_integration_required",
        }),
      }),
    )
    expect(definition?.metadata.activationBlockedBy).toEqual([])
    expect(definition?.metadata.activationBlockedBy).not.toContain("production_policy_entry")
    expect(definition?.metadata.activationBlockedBy).not.toContain("runner_registration")
    expect(definition?.metadata.activationBlockedBy).not.toContain("worker_checkpoint_contract")
    expect(definition?.metadata.activationBlockedBy).not.toContain("pos_specific_lifecycle_gating")
    expect(definition?.metadata.certifiedPrerequisites).toEqual(
      expect.arrayContaining([
        "worker_checkpoint_contract",
        "pos_specific_lifecycle_gating",
        "runner_registration",
        "production_policy_entry",
      ]),
    )
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
  it("rejects POS cash-shortage activation without a certified production activation marker", () => {
    const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
      (candidate) => candidate.checkKey === "pos.closed_shift_cash_shortage.review",
    )
    if (!definition) throw new Error("POS cash-shortage definition missing")

    expect(() =>
      assertCheckDefinitionComplete({
        ...definition,
        enabled: true,
      }),
    ).toThrow(/separately certified production activation/i)

    expect(() =>
      assertCheckDefinitionComplete({
        ...definition,
        enabled: true,
        metadata: {
          ...definition.metadata,
          productionActivationCertified: true,
        },
      }),
    ).not.toThrow()
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

  it("keeps case fingerprint stable when evidence and mutable observations change", () => {
    const baseline = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: "pos.closed_shift_cash_shortage.review",
      definitionVersion: 3,
      status: "failed",
      severity: "blocking",
      sourceType: "pos_shift",
      sourceId: "shift-1",
      sourceHash: "source-hash-1",
      evidenceLinks: [{ sourceTable: "business_events", sourceId: "event-1", label: "Shift close event 1" }],
      recommendedAction: "Review the count.",
      metadata: { variance: "-100" },
    })
    const changedObservation = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: "pos.closed_shift_cash_shortage.review",
      definitionVersion: 3,
      status: "warning",
      severity: "high",
      sourceType: "pos_shift",
      sourceId: "shift-1",
      sourceHash: "source-hash-2",
      evidenceLinks: [{ sourceTable: "business_events", sourceId: "event-2", label: "Shift close event 2" }],
      recommendedAction: "Assign an independent reviewer.",
      message: "The evidence changed.",
      counts: { scanned: 2, warning: 1 },
      metadata: { variance: "-150", reviewed: true },
    })

    expect(changedObservation.sourceHash).not.toBe(baseline.sourceHash)
    expect(changedObservation.fingerprint).toBe(baseline.fingerprint)
    expect(changedObservation.definitionVersion).toBe(3)
  })

  it("changes case fingerprint for every logical identity dimension", () => {
    const base = {
      organizationId: "org-1",
      checkKey: "pos.closed_shift_cash_shortage.review",
      definitionVersion: 1,
      status: "failed" as const,
      sourceType: "pos_shift",
      sourceId: "shift-1",
      sourceHash: "source-hash",
    }
    const baseline = normalizeAssuranceResult(base)
    const changedIdentities = [
      { ...base, organizationId: "org-2" },
      { ...base, checkKey: "pos.closed_shift_cash_overage.review" },
      { ...base, definitionVersion: 2 },
      { ...base, sourceType: "pos_terminal" },
      { ...base, sourceId: "shift-2" },
    ]

    for (const identity of changedIdentities) {
      expect(normalizeAssuranceResult(identity).fingerprint).not.toBe(baseline.fingerprint)
    }
  })

  it("canonicalizes missing source identity and rejects invalid definition versions", () => {
    const result = normalizeAssuranceResult({
      organizationId: "org-1",
      checkKey: "ledger.test",
      status: "failed",
    })

    expect(result).toMatchObject({
      definitionVersion: 1,
      sourceType: "workflow_assurance_check",
      sourceId: "ledger.test",
    })
    expect(() =>
      normalizeAssuranceResult({
        organizationId: "org-1",
        checkKey: "ledger.test",
        definitionVersion: 0,
        status: "failed",
      }),
    ).toThrow(/positive integer/i)
  })
})
