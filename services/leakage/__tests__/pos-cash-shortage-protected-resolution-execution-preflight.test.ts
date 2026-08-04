import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageProtectedResolutionExecutionPreflight,
  POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_REQUIREMENTS,
} from "../pos-cash-shortage-protected-resolution-execution-preflight";

const ROOT = process.cwd();

describe("POS cash-shortage protected resolution execution preflight", () => {
  it("certifies current generic protected resolve action and Slice 38 readiness posture", () => {
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight(
      currentSources(),
    );

    expect(result).toEqual({
      version: 1,
      status: "certified",
      protectedResolutionExecutionCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks resolve actions that do not derive tenant and actor from protected context", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight({
      ...sources,
      genericIncidentActionSourceText: replaceResolveBlock(
        sources.genericIncidentActionSourceText,
        (block) =>
          block
            .replace("organizationId: ctx.orgId", "organizationId: parsed.organizationId")
            .replace("actorId: ctx.userId", "actorId: parsed.actorId"),
      ),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["protected_tenant_actor_context"]),
    );
  });

  it("blocks resolve actions without fresh authentication and controls-manage protection", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight({
      ...sources,
      genericIncidentActionSourceText: replaceResolveBlock(
        sources.genericIncidentActionSourceText,
        (block) =>
          block
            .replace("freshAuth: { maxAgeSeconds: 300 },", "")
            .replace('permission: "controls.manage"', 'permission: "controls.audit.read"'),
      ),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["fresh_auth_required", "controls_manage_permission"]),
    );
  });

  it("blocks callers that do not bind current source hash from the current incident", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight({
      ...sources,
      incidentActionsComponentSourceText:
        sources.incidentActionsComponentSourceText.replace(
          "currentSourceHash: incident.sourceHash",
          'currentSourceHash: "caller-source-hash"',
        ),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["ui_binds_current_incident_source_hash"]),
    );
  });

  it("blocks when the Slice 38 command-readiness contract is not present", () => {
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight({
      ...currentSources(),
      commandReadinessSourceText: "export const unrelated = true;",
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["command_readiness_contract_present"]),
    );
  });

  it("blocks POS-specific sources that directly invoke terminal incident commands", () => {
    const result = evaluatePosCashShortageProtectedResolutionExecutionPreflight({
      ...currentSources(),
      posResolutionActionSourceText: `
        export async function unsafePosResolver(input) {
          return resolveWorkflowAssuranceIncident(input);
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_resolution_action_not_active"]),
    );
  });

  it("does not add POS resolver execution, database writes, routes, workers, or schedulers", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-protected-resolution-execution-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/transitionWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|upsertWorkflowAssuranceIncidentFromResult/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/db\.|prisma\./i);
  });
});

function currentSources() {
  return {
    genericIncidentActionSourceText: read(
      "actions/assurance/workflow-assurance-incident.actions.ts",
    ),
    genericIncidentActionTestSourceText: read(
      "actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts",
    ),
    incidentActionsComponentSourceText: read(
      "components/assurance/AssuranceIncidentActions.tsx",
    ),
    commandReadinessSourceText: read(
      "services/leakage/pos-cash-shortage-resolution-command-readiness.ts",
    ),
    posResolutionActionSourceText: null,
  };
}

function replaceResolveBlock(source: string, transform: (block: string) => string) {
  const start = source.indexOf("const resolveIncident = protect");
  const end = source.indexOf("const suppressIncident = protect", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return `${source.slice(0, start)}${transform(source.slice(start, end))}${source.slice(end)}`;
}
function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
