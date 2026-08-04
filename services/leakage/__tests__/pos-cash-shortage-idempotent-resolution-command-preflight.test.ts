import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageIdempotentResolutionCommandPreflight,
  POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS,
} from "../pos-cash-shortage-idempotent-resolution-command-preflight";

const ROOT = process.cwd();

describe("POS cash-shortage idempotent resolution command preflight", () => {
  it("certifies generic transition evidence while blocking the absent live POS command wrapper", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight(
      currentSources(),
    );

    expect(result.version).toBe(1);
    expect(result.status).toBe("blocked");
    expect(result.genericTransitionEvidenceCertified).toBe(true);
    expect(result.posCommandWrapperCertified).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual(
      expect.arrayContaining([
        "generic_transition_transaction_boundary",
        "generic_tenant_scoped_incident_lookup",
        "generic_legal_transition_guard",
        "generic_current_source_hash_conflict_guard",
        "generic_event_and_audit_history",
        "command_readiness_contract_present",
        "protected_execution_preflight_present",
      ]),
    );
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "pos_command_wrapper_present",
        "pos_command_idempotency_key_required",
        "pos_command_concurrency_guard_required",
        "pos_command_source_recheck_required",
        "pos_command_uses_prepared_command_input",
      ]),
    );
  });

  it("certifies a fixture wrapper only when idempotency, concurrency, recheck, and prepared command input are present", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...currentSources(),
      posResolutionCommandSourceText: certifiedWrapperFixture(),
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      genericTransitionEvidenceCertified: true,
      posCommandWrapperCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks wrappers without a stable idempotency key bound to incident and source hash", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...currentSources(),
      posResolutionCommandSourceText: certifiedWrapperFixture()
        .replace(/idempotencyKey/g, "dedupeKey")
        .replace(/buildPosCashShortageResolutionIdempotencyKey/g, "buildRuntimeLabel"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_command_idempotency_key_required"]),
    );
  });

  it("blocks wrappers without an incident/source-hash concurrency guard", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...currentSources(),
      posResolutionCommandSourceText: certifiedWrapperFixture().replace(/withPosCashShortageResolutionConcurrencyGuard/g, "withoutResolutionGuard"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_command_concurrency_guard_required"]),
    );
  });

  it("blocks wrappers that skip source-owned recheck and command-readiness preparation", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...currentSources(),
      posResolutionCommandSourceText: certifiedWrapperFixture()
        .replace(/evaluatePosCashShortageResolutionSourceRecheck/g, "trustCallerPayload")
        .replace(/sourceRecheckResult/g, "callerPayload"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_command_source_recheck_required"]),
    );
  });

  it("blocks wrappers that write Workflow Assurance persistence directly", () => {
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...currentSources(),
      posResolutionCommandSourceText: `${certifiedWrapperFixture()}
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

  it("blocks if generic current-source-hash conflict evidence is removed", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageIdempotentResolutionCommandPreflight({
      ...sources,
      genericIncidentServiceSourceText: sources.genericIncidentServiceSourceText
        .replace("assertCurrentIncidentSourceHash", "trustCurrentIncidentSourceHash")
        .replace("new ConflictError", "new BusinessRuleError"),
    });

    expect(result.status).toBe("blocked");
    expect(result.genericTransitionEvidenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["generic_current_source_hash_conflict_guard"]),
    );
  });

  it("does not add resolver execution, database writes, routes, workers, or schedulers", () => {
    const source = read(
      "services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts",
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
    genericIncidentServiceSourceText: read(
      "services/assurance/assurance-incident.service.ts",
    ),
    genericIncidentServiceTestSourceText: read(
      "services/assurance/__tests__/assurance-incident.service.test.ts",
    ),
    commandReadinessSourceText: read(
      "services/leakage/pos-cash-shortage-resolution-command-readiness.ts",
    ),
    protectedResolutionPreflightSourceText: read(
      "services/leakage/pos-cash-shortage-protected-resolution-execution-preflight.ts",
    ),
    posResolutionCommandSourceText: null,
  };
}

function certifiedWrapperFixture() {
  return `
    import { resolveWorkflowAssuranceIncident } from "@/services/assurance/assurance-incident.service";
    import { preparePosCashShortageResolutionCommandReadiness } from "./pos-cash-shortage-resolution-command-readiness";
    import { evaluatePosCashShortageResolutionSourceRecheck } from "./pos-cash-shortage-resolution-source-recheck";

    export function buildPosCashShortageResolutionIdempotencyKey(input) {
      return [
        "pos-cash-shortage-resolution",
        input.incidentId,
        input.currentSourceHash,
      ].join(":");
    }

    async function withPosCashShortageResolutionConcurrencyGuard(input, callback) {
      return callback({
        incidentId: input.incidentId,
        currentSourceHash: input.currentSourceHash,
      });
    }

    export async function executePosCashShortageResolutionCommand(input) {
      const idempotencyKey = buildPosCashShortageResolutionIdempotencyKey({
        incidentId: input.incidentId,
        currentSourceHash: input.currentSourceHash,
      });
      return withPosCashShortageResolutionConcurrencyGuard(
        { incidentId: input.incidentId, currentSourceHash: input.currentSourceHash, idempotencyKey },
        async () => {
          const sourceRecheckResult = evaluatePosCashShortageResolutionSourceRecheck(input);
          const commandReadiness = preparePosCashShortageResolutionCommandReadiness({
            ...input,
            sourceRecheckResult,
          });
          if (!commandReadiness.commandInput) return commandReadiness;
          return resolveWorkflowAssuranceIncident(commandReadiness.commandInput);
        },
      );
    }
  `;
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
