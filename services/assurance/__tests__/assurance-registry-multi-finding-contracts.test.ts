import {
  WORKFLOW_ASSURANCE_MAX_SOURCE_FINDINGS,
  normalizeAssuranceResult,
  normalizeWorkflowAssuranceRunnerOutput,
} from "../assurance-registry-contracts"

const EXECUTION_IDENTITY = {
  organizationId: "org-1",
  checkKey: "pos.closed_shift_cash_shortage.review",
  definitionVersion: 3,
} as const

describe("workflow assurance multi-finding contracts", () => {
  it("normalizes an aggregate execution with zero source findings", () => {
    const execution = normalizeWorkflowAssuranceRunnerOutput({
      ...EXECUTION_IDENTITY,
      output: {
        aggregate: {
          status: "passed",
          message: "No closed-shift cash shortages require review.",
        },
        findings: [],
      },
    })

    expect(execution.aggregate).toMatchObject({
      ...EXECUTION_IDENTITY,
      sourceType: "workflow_assurance_check",
      sourceId: EXECUTION_IDENTITY.checkKey,
      status: "passed",
    })
    expect(execution.findings).toEqual([])
  })

  it("trims source identities, rebinds server identity, and orders a copied finding collection", () => {
    const findings = [
      {
        ordinal: 1,
        status: "warning" as const,
        sourceType: " pos_shift ",
        sourceId: " shift-2 ",
        sourceHash: "source-hash-2",
      },
      {
        ordinal: 0,
        status: "failed" as const,
        sourceType: " pos_shift ",
        sourceId: " shift-1 ",
        sourceHash: "source-hash-1",
      },
    ]

    const execution = normalizeWorkflowAssuranceRunnerOutput({
      ...EXECUTION_IDENTITY,
      output: {
        aggregate: { status: "failed" },
        findings,
      },
    })

    expect(execution.findings.map((finding) => [finding.ordinal, finding.sourceType, finding.sourceId])).toEqual([
      [0, "pos_shift", "shift-1"],
      [1, "pos_shift", "shift-2"],
    ])
    for (const finding of execution.findings) {
      expect(finding).toMatchObject(EXECUTION_IDENTITY)
      expect(finding.sourceHash).toBeTruthy()
      expect(finding.fingerprint).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(findings.map((finding) => finding.ordinal)).toEqual([1, 0])
    expect(findings[0]).toMatchObject({
      sourceType: " pos_shift ",
      sourceId: " shift-2 ",
    })
  })

  it("accepts exactly 100 source findings and rejects an over-limit collection", () => {
    const findings = Array.from({ length: WORKFLOW_ASSURANCE_MAX_SOURCE_FINDINGS }, (_, ordinal) => ({
      ordinal,
      status: "warning" as const,
      sourceType: "pos_shift",
      sourceId: `shift-${ordinal}`,
    }))

    expect(
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: { aggregate: { status: "warning" }, findings },
      }).findings,
    ).toHaveLength(WORKFLOW_ASSURANCE_MAX_SOURCE_FINDINGS)

    expect(() =>
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: {
          aggregate: { status: "warning" },
          findings: [
            ...findings,
            {
              ordinal: WORKFLOW_ASSURANCE_MAX_SOURCE_FINDINGS,
              status: "warning",
              sourceType: "pos_shift",
              sourceId: "shift-over-limit",
            },
          ],
        },
      }),
    ).toThrow(/more than 100 source findings/i)
  })

  it.each([
    { name: "negative", ordinals: [-1] },
    { name: "fractional", ordinals: [0.5] },
    { name: "duplicate", ordinals: [0, 0] },
    { name: "gapped", ordinals: [0, 2] },
  ])("rejects $name source-finding ordinals", ({ ordinals }) => {
    expect(() =>
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: {
          aggregate: { status: "failed" },
          findings: ordinals.map((ordinal, index) => ({
            ordinal,
            status: "failed" as const,
            sourceType: "pos_shift",
            sourceId: `shift-${index}`,
          })),
        },
      }),
    ).toThrow(/ordinal/i)
  })

  it.each([
    { sourceType: " ", sourceId: "shift-1" },
    { sourceType: "pos_shift", sourceId: "\t" },
  ])("rejects blank source-finding identity", ({ sourceType, sourceId }) => {
    expect(() =>
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: {
          aggregate: { status: "failed" },
          findings: [{ ordinal: 0, status: "failed", sourceType, sourceId }],
        },
      }),
    ).toThrow(/source finding source (type|ID) is required/i)
  })

  it("rejects duplicate normalized case identities even when observations differ", () => {
    expect(() =>
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: {
          aggregate: { status: "failed" },
          findings: [
            {
              ordinal: 0,
              status: "failed",
              severity: "blocking",
              sourceType: "pos_shift",
              sourceId: "shift-1",
              sourceHash: "source-hash-1",
            },
            {
              ordinal: 1,
              status: "warning",
              severity: "high",
              sourceType: " pos_shift ",
              sourceId: " shift-1 ",
              sourceHash: "source-hash-2",
            },
          ],
        },
      }),
    ).toThrow(/duplicate source finding identity/i)
  })

  it("rejects blank source identity when adapting a legacy single result", () => {
    const legacy = {
      ...normalizeAssuranceResult({
        organizationId: "org-1",
        checkKey: "legacy.check",
        status: "failed",
        sourceType: "pos_shift",
        sourceId: "shift-1",
      }),
      sourceId: " ",
    }

    expect(() =>
      normalizeWorkflowAssuranceRunnerOutput({
        ...EXECUTION_IDENTITY,
        output: legacy,
      }),
    ).toThrow(/source finding source ID is required/i)
  })

  it("adapts and rebinds a legacy single result to one ordinal-zero finding", () => {
    const legacy = normalizeAssuranceResult({
      organizationId: "spoofed-org",
      checkKey: "spoofed.check",
      definitionVersion: 9,
      status: "failed",
      sourceType: "pos_shift",
      sourceId: "shift-1",
      sourceHash: "source-hash-1",
    })
    const execution = normalizeWorkflowAssuranceRunnerOutput({
      ...EXECUTION_IDENTITY,
      output: legacy,
    })

    expect(execution.aggregate).toMatchObject({
      ...EXECUTION_IDENTITY,
      sourceType: "pos_shift",
      sourceId: "shift-1",
      sourceHash: "source-hash-1",
    })
    expect(execution.aggregate.fingerprint).not.toBe(legacy.fingerprint)
    expect(execution.findings).toEqual([
      expect.objectContaining({
        ordinal: 0,
        ...EXECUTION_IDENTITY,
        sourceType: "pos_shift",
        sourceId: "shift-1",
      }),
    ])
  })
})
