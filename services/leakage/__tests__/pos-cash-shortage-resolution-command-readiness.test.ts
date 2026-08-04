import fs from "fs";
import path from "path";

import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";

import {
  preparePosCashShortageResolutionCommandReadiness,
  POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REQUIREMENTS,
} from "../pos-cash-shortage-resolution-command-readiness";
import type { PosCashShortageResolutionSourceRecheckResult } from "../pos-cash-shortage-resolution-source-recheck";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage resolution command readiness", () => {
  it("certifies command readiness from certified source recheck and lifecycle policy evidence", () => {
    const result = preparePosCashShortageResolutionCommandReadiness({
      incident: incident(),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheck: sourceRecheck(),
      resolutionNote: "Manager reviewed the shortage evidence and attached reconciliation proof.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result).toEqual({
      version: 1,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      status: "certified",
      resolutionCommandReadinessCertified: true,
      activationAuthorized: false,
      commandInput: {
        organizationId: "org-1",
        incidentId: "incident-1",
        actorId: "manager-1",
        currentSourceHash: "source-hash-1",
        note: "Manager reviewed the shortage evidence and attached reconciliation proof.",
        metadata: {
          policy: "pos_cash_shortage_independent_resolution_v1",
          resolutionEvidenceHash: "resolution-evidence-hash-1",
          reviewedSourceType: "POSSession",
          reviewedSourceId: "session-1",
          amountAtRisk: "1000",
          currency: "XAF",
          policyId: "policy-1",
        },
      },
      sourceRecheckEvidence: {
        currentSourceHash: "source-hash-1",
        approvedPolicyHash: "policy-hash-1",
        evaluationHash: "evaluation-hash-1",
        evaluationOutcome: "triggered",
      },
      policy: "pos_cash_shortage_independent_resolution_v1",
      policyBlocker: null,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks when source-owned recheck evidence is not certified", () => {
    const result = preparePosCashShortageResolutionCommandReadiness({
      incident: incident(),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheck: sourceRecheck({
        resolutionSourceRecheckCertified: false,
        missingRequirements: ["evaluation_hash_matches"],
      }),
      resolutionNote: "Reviewed.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result.status).toBe("blocked");
    expect(result.commandInput).toBeNull();
    expect(result.policyBlocker).toBe(
      "Certified source-owned recheck evidence is required.",
    );
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "source_recheck_certified",
        "lifecycle_policy_allows_resolution",
      ]),
    );
  });

  it("blocks when lifecycle source hash confirmation is stale", () => {
    const result = preparePosCashShortageResolutionCommandReadiness({
      incident: incident({ sourceHash: "new-source-hash" }),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheck: sourceRecheck(),
      resolutionNote: "Reviewed.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result.status).toBe("blocked");
    expect(result.commandInput).toBeNull();
    expect(result.policyBlocker).toContain("source changed before resolution");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "lifecycle_policy_allows_resolution",
        "command_input_source_hash_bound",
      ]),
    );
  });

  it("blocks cashier or closer self-resolution through maker-checker policy", () => {
    for (const actorId of ["cashier-1", "closer-1"]) {
      const result = preparePosCashShortageResolutionCommandReadiness({
        incident: incident(),
        actorId,
        actorPermissions: ["pos.transactions.read"],
        sourceRecheck: sourceRecheck(),
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      });

      expect(result.status).toBe("blocked");
      expect(result.commandInput).toBeNull();
      expect(result.policyBlocker).toContain("independent reviewer");
      expect(result.missingRequirements).toEqual(
        expect.arrayContaining(["lifecycle_policy_allows_resolution"]),
      );
    }
  });

  it("blocks missing POS permission and missing resolution evidence hash", () => {
    const permissionResult = preparePosCashShortageResolutionCommandReadiness({
      incident: incident(),
      actorId: "manager-1",
      actorPermissions: ["dashboard.read"],
      sourceRecheck: sourceRecheck(),
      resolutionNote: "Reviewed.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(permissionResult.status).toBe("blocked");
    expect(permissionResult.policyBlocker).toContain(
      "certified POS read permission",
    );

    const evidenceResult = preparePosCashShortageResolutionCommandReadiness({
      incident: incident(),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      sourceRecheck: sourceRecheck(),
      resolutionNote: "Reviewed.",
      resolutionEvidenceHash: " ",
    });

    expect(evidenceResult.status).toBe("blocked");
    expect(evidenceResult.policyBlocker).toContain(
      "Resolution evidence hash is required",
    );
    expect(evidenceResult.missingRequirements).toEqual(
      expect.arrayContaining([
        "lifecycle_policy_allows_resolution",
        "command_input_resolution_evidence_hash_bound",
      ]),
    );
  });

  it("does not invoke terminal incident commands or add database, route, worker, or scheduler behavior", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-resolution-command-readiness.ts",
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

function sourceRecheck(
  overrides: Partial<PosCashShortageResolutionSourceRecheckResult> = {},
): Pick<
  PosCashShortageResolutionSourceRecheckResult,
  | "resolutionSourceRecheckCertified"
  | "activationAuthorized"
  | "currentSourceHash"
  | "approvedPolicyHash"
  | "evaluationHash"
  | "evaluationOutcome"
  | "missingRequirements"
> {
  return {
    resolutionSourceRecheckCertified: true,
    activationAuthorized: false,
    currentSourceHash: "source-hash-1",
    approvedPolicyHash: "policy-hash-1",
    evaluationHash: "evaluation-hash-1",
    evaluationOutcome: "triggered",
    missingRequirements: [],
    ...overrides,
  };
}

function incident(
  overrides: Partial<WorkflowAssuranceIncidentDto> = {},
): WorkflowAssuranceIncidentDto {
  return {
    id: "incident-1",
    organizationId: "org-1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    sourceId: "session-1",
    sourceLabel: "POS cash drawer close event",
    sourceHash: "source-hash-1",
    fingerprint: "fingerprint-1",
    title: "Cash shortage requiring review",
    detail: "Cash shortage meets the approved high-severity threshold.",
    severity: "high",
    status: "open",
    evidenceGrade: "blocked",
    actionRoute: "/dashboard/manager-action-center",
    ownerId: null,
    assignedRole: "branch_manager",
    dueAt: null,
    occurrenceCount: 1,
    firstDetectedAt: "2026-07-27T10:00:00.000Z",
    lastDetectedAt: "2026-07-27T10:00:00.000Z",
    resolvedAt: null,
    reopenedAt: null,
    suppressedAt: null,
    metadata: {
      resultMetadata: {
        eventId: "event-1",
        recordedAt: "2026-07-27T10:00:00.000Z",
        outcome: "triggered",
        amountAtRisk: "1000",
        currency: "XAF",
        locationId: "loc-1",
        terminalId: "terminal-1",
        cashDrawerId: "drawer-1",
        cashierId: "cashier-1",
        closerId: "closer-1",
        policyId: "policy-1",
        policyVersion: 1,
        policyMode: "observe",
        authorityMode: "SELF",
      },
    },
    sourceLinks: [],
    proofSubject: null,
    proofSummary: {
      evidenceGrade: "blocked",
      sourceHash: "source-hash-1",
      freshness: "blocked",
      proofSubject: null,
      actionRoute: "/dashboard/manager-action-center",
    },
    redactions: [],
    ...overrides,
  };
}
