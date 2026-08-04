jest.mock("server-only", () => ({}));

import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";
import {
  WORKFLOW_ASSURANCE_SCHEDULER_POLICIES,
  buildWorkflowAssuranceSchedulerPlan,
} from "@/services/assurance/assurance-scheduler.service";

import {
  composePosCashShortageSchedulerPolicyActivationEvidence,
  evaluatePosCashShortageSchedulerPolicyPreflight,
} from "../pos-cash-shortage-scheduler-policy-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage scheduler-policy preflight", () => {
  it("certifies the current disabled definition scheduler-policy shape without authorizing activation", () => {
    const definition = currentDefinition();
    const result = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [definition.checkKey],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
    });

    expect(result).toEqual({
      version: 1,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      status: "certified",
      schedulerPolicyCertified: true,
      activationAuthorized: false,
      plannedCadence: "daily",
      blockers: [],
    });
  });

  it("composes production activation evidence only from a certified scheduler-policy preflight", () => {
    const definition = currentDefinition();
    const preflight = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [definition.checkKey],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
    });

    const evidence = composePosCashShortageSchedulerPolicyActivationEvidence({
      preflight,
    });

    expect(evidence).toEqual({
      schedulerPolicyCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
  });

  it("keeps production activation evidence blocked when scheduler-policy preflight is blocked", () => {
    const definition = currentDefinition();
    const preflight = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
    });

    const evidence = composePosCashShortageSchedulerPolicyActivationEvidence({
      preflight,
    });

    expect(evidence).toEqual({
      schedulerPolicyCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["scheduler_policy_preflight"],
    });
  });
  it("blocks when the scheduler plan lacks clean fixture evidence", () => {
    const definition = currentDefinition();
    const result = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
    });

    expect(result.status).toBe("blocked");
    expect(result.schedulerPolicyCertified).toBe(false);
    expect(result.blockers).toContain("scheduler_plan_not_release_ready");
    expect(result.activationAuthorized).toBe(false);
  });

  it("blocks hot-path, non-tenant, or missing source-hash scheduled policies", () => {
    const definition = currentDefinition();
    const result = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [definition.checkKey],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: {
        ...WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
        hotPathAllowed: true,
        cursorStrategy: {
          tenantScoped: false as true,
          cursorFields: ["organizationId", "sourceType", "sourceId"],
          sourceHashRequired: false,
        },
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "must_not_allow_hot_path",
        "must_be_tenant_scoped",
        "must_require_source_hash",
        "must_cursor_by_organization_and_source",
      ]),
    );
  });

  it("blocks definitions that are already enabled or production-activation certified", () => {
    const definition = {
      ...currentDefinition(),
      enabled: true,
      metadata: {
        ...currentDefinition().metadata,
        productionActivationCertified: true,
      },
    };
    const result = evaluatePosCashShortageSchedulerPolicyPreflight({
      definition,
      schedulerPlan: buildWorkflowAssuranceSchedulerPlan({
        definitions: [definition],
        testedCheckKeys: [definition.checkKey],
        now: "2026-07-27T20:00:00.000Z",
      }),
      scheduledScanPolicy: WORKFLOW_ASSURANCE_SCHEDULER_POLICIES.scheduled_scan,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("definition_must_remain_activation_held");
    expect(result.activationAuthorized).toBe(false);
  });

  it("does not add scheduler, worker, route, action, incident command, or database behavior", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken|router|createSafeAction/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/db\.|prisma/i);
  });
});

function currentDefinition() {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition missing.");
  return definition;
}
