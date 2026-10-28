import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageProductCallerAuditEventPreflight,
  POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_REQUIREMENTS,
} from "../pos-cash-shortage-product-caller-audit-event-preflight";

const ROOT = process.cwd();

describe("POS cash-shortage product-caller audit/event preflight", () => {
  it("certifies the current product caller through protected action, command wrapper, and generic audit/event history", () => {
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight(currentSources());

    expect(result).toEqual({
      version: 1,
      status: "certified",
      productCallerAuditEventCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks if the product caller is not gated to the POS cash-shortage check key", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      incidentActionsComponentSourceText: sources.incidentActionsComponentSourceText
        .replace(/isPosCashShortageIncident/g, "isResolutionIncident")
        .replace(/incident\.checkKey === POS_CASH_SHORTAGE_CHECK_KEY/g, "incident.canManage"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["product_caller_pos_check_key_gated"]),
    );
  });

  it("blocks if the product caller stops binding currentSourceHash to incident.sourceHash", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      incidentActionsComponentSourceText: sources.incidentActionsComponentSourceText.replace(
        /currentSourceHash: incident\.sourceHash/g,
        "currentSourceHash: evidenceHash.trim()",
      ),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["product_caller_binds_current_source_hash"]),
    );
  });

  it("blocks if the protected action loses audit or fresh-auth posture", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      posResolutionActionSourceText: sources.posResolutionActionSourceText
        .replace('auditAllowed: true', 'auditAllowed: false')
        .replace('freshAuth: { maxAgeSeconds: 300 }', 'freshAuth: undefined'),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["protected_action_audit_posture"]),
    );
  });

  it("blocks if the protected action skips server-owned source loading", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      posResolutionActionSourceText: sources.posResolutionActionSourceText
        .replace(/loadPosCashShortageResolutionSourceForIncident/g, "trustClientSourceRecheck")
        .replace(/source\.sourceRecheckInput/g, "parsed.sourceRecheckInput"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["protected_action_server_owned_source_loader"]),
    );
  });

  it("blocks if the POS command writes Workflow Assurance persistence directly", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      posResolutionCommandSourceText: `${sources.posResolutionCommandSourceText}
        async function unsafe(client) {
          await client.workflowAssuranceIncident.update({ where: { id: "incident-1" }, data: {} });
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_command_avoids_direct_persistence"]),
    );
  });

  it("blocks if generic resolver event or audit history evidence is removed", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageProductCallerAuditEventPreflight({
      ...sources,
      genericIncidentServiceSourceText: sources.genericIncidentServiceSourceText
        .replace(/recordIncidentEvent\(client/g, "skipIncidentEvent(client")
        .replace(/recordAuditLog\(client/g, "skipAuditLog(client"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "generic_resolver_records_event_history",
        "generic_resolver_records_audit_history",
      ]),
    );
  });

  it("does not add resolver execution, database writes, routes, workers, alerts, rollback, AI, or WhatsApp authority", () => {
    const source = read(
      "services/leakage/pos-cash-shortage-product-caller-audit-event-preflight.ts",
    );

    expect(source).not.toMatch(/from "@\/services\/assurance\/assurance-incident.service"/i);
    expect(source).not.toMatch(/await\s+resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/await\s+transitionWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|upsertWorkflowAssuranceIncidentFromResult/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction/i);
    expect(source).not.toMatch(/sendAlert|dispatchAlert|rollback|whatsApp|copilot/i);
    expect(source).not.toMatch(/db\.|prisma\./i);
  });
});

function currentSources() {
  return {
    incidentActionsComponentSourceText: read(
      "components/assurance/AssuranceIncidentActions.tsx",
    ),
    incidentActionsComponentTestSourceText: read(
      "components/assurance/__tests__/AssuranceIncidentActions.test.tsx",
    ),
    posResolutionActionSourceText: read(
      "actions/assurance/pos-cash-shortage-resolution.actions.ts",
    ),
    posResolutionActionTestSourceText: read(
      "actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts",
    ),
    posResolutionCommandSourceText: read(
      "services/leakage/pos-cash-shortage-resolution-command.ts",
    ),
    genericIncidentServiceSourceText: read(
      "services/assurance/assurance-incident.service.ts",
    ),
    genericIncidentServiceTestSourceText: read(
      "services/assurance/__tests__/assurance-incident.service.test.ts",
    ),
  };
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
