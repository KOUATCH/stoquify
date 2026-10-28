import { evaluateConnectorHealth, type ConnectorHealthInput } from "../connector-health.service"
import { PortfolioControlError } from "../evidence-trust.contracts"

const hash = "b".repeat(64)

function input(override: Partial<ConnectorHealthInput> = {}): ConnectorHealthInput {
  return {
    trustedOrganizationId: "org-1",
    organizationId: "org-1",
    actorAuthorized: true,
    correlationId: "corr-connector-1",
    connectorId: "connector-1",
    connectorKind: "mobile-money",
    sourceReference: "provider-account-1",
    sourceHash: hash,
    observedAt: "2026-08-02T09:59:00.000Z",
    evaluatedAt: "2026-08-02T10:00:00.000Z",
    lastSuccessfulSyncAt: "2026-08-02T09:55:00.000Z",
    freshnessSlaMinutes: 15,
    credentialExpiresAt: "2026-09-02T10:00:00.000Z",
    signatureValid: true,
    schemaDriftDetected: false,
    gapCount: 0,
    duplicateCount: 0,
    deadLetterCount: 0,
    evidenceGrade: "operational",
    ...override,
  }
}

describe("connector health service", () => {
  it("reports healthy connector evidence without action authority", () => {
    const result = evaluateConnectorHealth(input())
    expect(result).toEqual(
      expect.objectContaining({
        state: "HEALTHY",
        ageMinutes: 5,
        findings: [],
        risk: { level: "LOW", score: 0 },
        mayReconnectAutomatically: false,
        mayReplayDeadLettersAutomatically: false,
        mayExposeCredentials: false,
      }),
    )
    expect(result.credential).toMatchObject({
      warning: false,
      expired: false,
      warningWindowDays: 14,
    })
    expect(result.drift).toMatchObject({
      gapDelta: null,
      deadLetterDelta: null,
      worsening: false,
      improving: false,
    })
    expect(result.reliance.decision).toBe("ALLOW")
  })

  it("degrades credentials inside the warning window without reconnect authority", () => {
    const result = evaluateConnectorHealth(
      input({
        credentialExpiresAt: "2026-08-10T10:00:00.000Z",
        credentialWarningWindowDays: 10,
      }),
    )

    expect(result.state).toBe("DEGRADED")
    expect(result.reliance.decision).toBe("ALLOW_WITH_WARNING")
    expect(result.findings).toEqual([
      expect.objectContaining({
        code: "CREDENTIAL_EXPIRING_SOON",
        severity: "warning",
      }),
    ])
    expect(result.credential).toMatchObject({
      expiresAt: "2026-08-10T10:00:00.000Z",
      daysUntilExpiry: 8,
      warningWindowDays: 10,
      warning: true,
      expired: false,
    })
    expect(result.risk).toEqual({ level: "MEDIUM", score: 15 })
    expect(result.mayReconnectAutomatically).toBe(false)
    expect(result.mayReplayDeadLettersAutomatically).toBe(false)
    expect(result.mayExposeCredentials).toBe(false)
  })

  it("degrades shortened credential expiry against baseline", () => {
    const result = evaluateConnectorHealth(
      input({
        credentialExpiresAt: "2026-08-12T10:00:00.000Z",
        previousCredentialExpiresAt: "2026-08-20T10:00:00.000Z",
        credentialWarningWindowDays: 5,
      }),
    )

    expect(result.state).toBe("DEGRADED")
    expect(result.findings).toEqual([
      expect.objectContaining({
        code: "CREDENTIAL_EXPIRY_DRIFT",
        severity: "warning",
      }),
    ])
    expect(result.drift).toMatchObject({
      credentialExpiryDeltaDays: -8,
      worsening: true,
      improving: false,
    })
    expect(result.risk).toEqual({ level: "MEDIUM", score: 10 })
  })

  it("blocks stale connector data", () => {
    const result = evaluateConnectorHealth(
      input({ lastSuccessfulSyncAt: "2026-08-02T09:00:00.000Z" }),
      "draft",
    )
    expect(result.state).toBe("BLOCKED")
    expect(result.reliance.decision).toBe("BLOCK")
    expect(result.reasons).toContain("Connector data is outside its approved freshness SLA.")
  })

  it("blocks provider signature failure and schema drift", () => {
    const result = evaluateConnectorHealth(
      input({ signatureValid: false, schemaDriftDetected: true }),
    )
    expect(result.state).toBe("BLOCKED")
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Provider signature validation failed.",
        "Provider schema drift is detected.",
      ]),
    )
  })

  it("degrades duplicate and dead-letter events", () => {
    const result = evaluateConnectorHealth(
      input({ duplicateCount: 2, deadLetterCount: 1 }),
    )
    expect(result.state).toBe("DEGRADED")
    expect(result.reliance.decision).toBe("ALLOW_WITH_WARNING")
  })

  it("blocks worsening event-gap drift and records deterministic risk", () => {
    const result = evaluateConnectorHealth(
      input({
        gapCount: 2,
        previousGapCount: 0,
        deadLetterCount: 1,
        previousDeadLetterCount: 0,
      }),
    )

    expect(result.state).toBe("BLOCKED")
    expect(result.reliance.decision).toBe("BLOCK")
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "EVENT_GAPS", severity: "blocking" }),
        expect.objectContaining({ code: "EVENT_GAP_DRIFT", severity: "blocking" }),
        expect.objectContaining({ code: "DEAD_LETTER_DRIFT", severity: "warning" }),
      ]),
    )
    expect(result.drift).toMatchObject({
      gapDelta: 2,
      deadLetterDelta: 1,
      worsening: true,
      improving: false,
    })
    expect(result.risk).toEqual({ level: "CRITICAL", score: 100 })
    expect(result.mayReplayDeadLettersAutomatically).toBe(false)
  })

  it("validates drift baselines and credential warning windows", () => {
    expect(() =>
      evaluateConnectorHealth(input({ previousDeadLetterCount: -1 })),
    ).toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "VALIDATION_FAILED" }))

    expect(() =>
      evaluateConnectorHealth(input({ credentialWarningWindowDays: 181 })),
    ).toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "VALIDATION_FAILED" }))
  })

  it("fails closed on tenant mismatch", () => {
    expect(() =>
      evaluateConnectorHealth(input({ organizationId: "org-2" })),
    ).toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "TENANT_SCOPE_VIOLATION" }))
  })
})
