import fs from "node:fs";
import path from "node:path";

import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";

import {
  assertPosCashShortageIncidentResolutionAllowed,
} from "../pos-cash-shortage-incident-lifecycle-policy";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("assertPosCashShortageIncidentResolutionAllowed", () => {
  it("approves an independent POS cash-shortage reviewer with current source evidence", () => {
    const result = assertPosCashShortageIncidentResolutionAllowed({
      incident: incident(),
      actorId: "manager-1",
      actorPermissions: ["pos.transactions.read"],
      currentSourceHash: "source-hash-1",
      resolutionNote: "Manager reviewed the cash count and attached reconciliation evidence.",
      resolutionEvidenceHash: "resolution-evidence-hash-1",
    });

    expect(result).toMatchObject({
      incidentId: "incident-1",
      organizationId: "org-1",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      sourceType: "POSSession",
      sourceId: "session-1",
      sourceHash: "source-hash-1",
      actorId: "manager-1",
      policy: "pos_cash_shortage_independent_resolution_v1",
      evidence: {
        cashierId: "cashier-1",
        closerId: "closer-1",
        amountAtRisk: "1000",
        currency: "XAF",
        policyId: "policy-1",
      },
      commandInput: {
        organizationId: "org-1",
        incidentId: "incident-1",
        actorId: "manager-1",
        currentSourceHash: "source-hash-1",
        note: "Manager reviewed the cash count and attached reconciliation evidence.",
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
    });
  });

  it("rejects stale source confirmation", () => {
    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident(),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "older-source-hash",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("source changed before resolution");
  });

  it("rejects non-POS, aggregate, blocked, or final incidents", () => {
    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({ checkKey: "ledger.posted_source_link.required" }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("Only POS cash-shortage incidents");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({ sourceType: "workflow_assurance_check" }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("concrete POS session source");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({
          sourceType: "BusinessEvent",
          metadata: {
            resultMetadata: {
              outcome: "blocked",
              blockCode: "POLICY_MISSING",
            },
          },
        }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("concrete POS session source");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({ status: "resolved" }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("not in a resolvable lifecycle state");
  });

  it("rejects cashier or closer self-resolution", () => {
    for (const actorId of ["cashier-1", "closer-1"]) {
      expect(() =>
        assertPosCashShortageIncidentResolutionAllowed({
          incident: incident(),
          actorId,
          actorPermissions: ["pos.transactions.read"],
          currentSourceHash: "source-hash-1",
          resolutionNote: "Reviewed.",
          resolutionEvidenceHash: "resolution-evidence-hash-1",
        }),
      ).toThrow("independent reviewer");
    }
  });

  it("requires POS permission, note, evidence hash, and unredacted shortage metadata", () => {
    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident(),
        actorId: "manager-1",
        actorPermissions: ["dashboard.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("certified POS read permission");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident(),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: " ",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("Resolution note is required");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident(),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: " ",
      }),
    ).toThrow("Resolution evidence hash is required");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({ metadata: { redacted: true } }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("unredacted result metadata");

    expect(() =>
      assertPosCashShortageIncidentResolutionAllowed({
        incident: incident({
          metadata: { resultMetadata: { ...resultMetadata(), cashierId: "" } },
        }),
        actorId: "manager-1",
        actorPermissions: ["pos.transactions.read"],
        currentSourceHash: "source-hash-1",
        resolutionNote: "Reviewed.",
        resolutionEvidenceHash: "resolution-evidence-hash-1",
      }),
    ).toThrow("missing cashierId");
  });

  it("does not activate generic incident commands, routes, workers, schedulers, or direct registry loaders", () => {
    const policySource = fs.readFileSync(
      path.join(ROOT, "services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts"),
      "utf8",
    );
    const registryService = fs.readFileSync(
      path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
      "utf8",
    );

    expect(policySource).not.toContain("resolveWorkflowAssuranceIncident");
    expect(policySource).not.toContain("workflowAssuranceIncident");
    expect(registryService).toContain(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(registryService).toContain("runDormantPosShiftCashShortageReviewCheck");
    expect(registryService).toContain("enabled: true");
    expect(registryService).not.toContain("loadPosShiftCashShortageEvaluationBatch");
    expect(registryService).not.toContain("buildPosShiftCashShortageBatchInputForAssuranceRun");
    expect(policySource).not.toMatch(/CHECK_RUNNERS|schedule|worker|router|createSafeAction/i);
  });
});

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
    metadata: { resultMetadata: resultMetadata() },
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

function resultMetadata() {
  return {
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
  };
}
