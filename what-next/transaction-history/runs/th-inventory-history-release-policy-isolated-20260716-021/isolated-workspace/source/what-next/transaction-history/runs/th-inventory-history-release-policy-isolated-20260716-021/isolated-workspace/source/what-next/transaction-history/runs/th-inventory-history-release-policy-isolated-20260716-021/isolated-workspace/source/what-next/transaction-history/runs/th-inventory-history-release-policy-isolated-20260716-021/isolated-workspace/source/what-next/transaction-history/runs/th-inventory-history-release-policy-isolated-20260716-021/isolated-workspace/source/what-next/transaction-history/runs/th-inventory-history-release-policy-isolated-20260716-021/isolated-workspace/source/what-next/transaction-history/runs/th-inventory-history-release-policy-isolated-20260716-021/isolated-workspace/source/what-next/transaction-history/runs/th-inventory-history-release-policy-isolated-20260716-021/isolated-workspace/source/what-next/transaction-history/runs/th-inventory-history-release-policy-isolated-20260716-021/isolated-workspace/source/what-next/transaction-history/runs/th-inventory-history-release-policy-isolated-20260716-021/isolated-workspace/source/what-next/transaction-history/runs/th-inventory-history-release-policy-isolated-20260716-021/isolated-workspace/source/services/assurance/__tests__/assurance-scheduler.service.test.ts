jest.mock("server-only", () => ({}))

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "../assurance-registry-contracts"
import {
  WORKFLOW_ASSURANCE_SCHEDULER_POLICIES,
  buildWorkflowAssuranceSchedulerPlan,
} from "../assurance-scheduler.service"

describe("workflow assurance scheduler service", () => {
  it("classifies every execution mode with cursor strategy and run type", () => {
    expect(WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan).toMatchObject({
      runType: "scheduled",
      hotPathAllowed: false,
      cursorStrategy: expect.objectContaining({
        tenantScoped: true,
        sourceHashRequired: true,
      }),
    })
    expect(WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.pre_close_gate).toMatchObject({
      runType: "pre_close",
      cadence: "monthly_pre_close",
    })
  })

  it("builds an enforce-mode readiness plan and reports missing fixture tests", () => {
    const plan = buildWorkflowAssuranceSchedulerPlan({
      definitions: INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.slice(0, 2),
      testedCheckKeys: [INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS[0].checkKey],
      now: "2026-06-21T10:00:00.000Z",
    })

    expect(plan.checkCount).toBe(2)
    expect(plan.byCadence.daily + plan.byCadence["5_to_15_minutes"]).toBe(2)
    expect(plan.checks[0]).toMatchObject({
      checkKey: INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS[0].checkKey,
      releaseReady: true,
    })
    expect(plan.checks[1]).toMatchObject({
      checkKey: INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS[1].checkKey,
      releaseReady: false,
      blockers: expect.arrayContaining(["missing_clean_or_broken_fixture_test"]),
    })
  })
})
