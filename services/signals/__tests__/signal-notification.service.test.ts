import { buildBusinessSignalsFromFacts } from "../business-signal-rules.service"
import {
  buildSignalDigest,
  shouldNotifyForSignal,
} from "../signal-notification.service"

describe("Kontava signal notification service", () => {
  it("respects minimum severity and digest-only preferences", () => {
    const signals = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "stockout_risk",
          moduleSlug: "inventory",
          sourceModule: "inventory",
          subjectType: "inventory.level",
          subjectId: "item-1",
          severity: "medium",
        },
        {
          organizationId: "org-1",
          signalType: "close_blocker",
          moduleSlug: "close_assurance",
          sourceModule: "close",
          subjectType: "close.run",
          subjectId: "close-1",
          severity: "critical",
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    )
    const mediumSignal = signals.find((signal) => signal.signalType === "stockout_risk")
    const criticalSignal = signals.find((signal) => signal.signalType === "close_blocker")
    const preference = {
      organizationId: "org-1",
      userId: "owner-1",
      channels: ["digest" as const],
      enabledSignalTypes: ["stockout_risk" as const, "close_blocker" as const],
      minimumSeverity: "medium" as const,
      digestOnly: true,
    }

    expect(shouldNotifyForSignal({ signal: mediumSignal!, preference })).toBe(false)
    expect(shouldNotifyForSignal({ signal: criticalSignal!, preference })).toBe(true)
  })

  it("builds a safe digest for eligible signals", () => {
    const signals = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "close_blocker",
          moduleSlug: "close_assurance",
          sourceModule: "close",
          subjectType: "close.run",
          subjectId: "close-1",
          severity: "critical",
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    )

    const digest = buildSignalDigest({
      organizationId: "org-1",
      userId: "owner-1",
      signals,
      preference: {
        organizationId: "org-1",
        userId: "owner-1",
        channels: ["in_app"],
        enabledSignalTypes: ["close_blocker"],
        minimumSeverity: "high",
      },
      now: "2026-06-20T09:00:00.000Z",
    })

    expect(digest).toMatchObject({
      organizationId: "org-1",
      userId: "owner-1",
      signalCount: 1,
      criticalCount: 1,
    })
    expect(digest.signals[0]).toEqual(
      expect.objectContaining({
        signalType: "close_blocker",
        actionPath: "/dashboard/accounting/close-assurance",
      }),
    )
  })
})
