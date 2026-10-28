jest.mock("server-only", () => ({}))

import { resolveCommandAgentRollout } from "../agent-rollout.service"

const actor = {
  organizationId: "org-pilot",
  roleCodes: ["manager"],
  permissions: ["dashboard.read"],
}

describe("Command Agent rollout", () => {
  it("fails closed when rollout configuration is missing", () => {
    expect(resolveCommandAgentRollout(actor, {})).toEqual({
      mode: "off",
      canRun: false,
      canRender: false,
      reason: "disabled",
    })
  })

  it("allows only an explicitly listed organization, role, and permission", () => {
    const environment = {
      STOQUIFY_COMMAND_AGENT_ROLLOUT: "internal",
      STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS: "org-pilot",
      STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES: "owner,manager",
    }
    expect(resolveCommandAgentRollout(actor, environment)).toMatchObject({
      mode: "internal",
      canRun: true,
      canRender: true,
      reason: "available",
    })
    expect(resolveCommandAgentRollout({ ...actor, organizationId: "org-other" }, environment).reason).toBe(
      "organization_not_allowed",
    )
    expect(resolveCommandAgentRollout({ ...actor, roleCodes: ["cashier"] }, environment).reason).toBe(
      "role_not_allowed",
    )
    expect(resolveCommandAgentRollout({ ...actor, permissions: [] }, environment).reason).toBe(
      "permission_denied",
    )
  })

  it("honors the kill switch before every other rollout setting", () => {
    expect(
      resolveCommandAgentRollout(actor, {
        STOQUIFY_COMMAND_AGENT_KILL_SWITCH: "1",
        STOQUIFY_COMMAND_AGENT_ROLLOUT: "internal",
        STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS: "org-pilot",
        STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES: "manager",
      }),
    ).toMatchObject({ canRun: false, canRender: false, reason: "kill_switch" })
  })
})
