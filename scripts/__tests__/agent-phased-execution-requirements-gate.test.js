const {
  REQUIREMENTS,
  evaluatePhasedExecution,
  parseArgs,
  renderMarkdown,
} = require("../agent-phased-execution-requirements-gate");

describe("Agent phased execution requirements gate", () => {
  it("proves the authorized repository scope without fabricating external readiness", () => {
    const result = evaluatePhasedExecution(completeInput());

    expect(result).toEqual(
      expect.objectContaining({
        status: "AUTHORIZED_SCOPE_COMPLETE_EXTERNAL_BLOCKED",
        authorizedScopeComplete: true,
        fullProgramComplete: false,
        activationAuthorized: false,
        phase3Authorized: false,
        repositoryBlockers: [],
      }),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        requirements: REQUIREMENTS.length,
        satisfied: REQUIREMENTS.length,
        repositoryBlockers: 0,
        externalBlockers: 6,
        secretValuesPrinted: false,
      }),
    );
  });

  it("blocks when a required implementation marker is absent", () => {
    const input = completeInput();
    input.files["services/agents/agent-context.service.ts"] = input.files[
      "services/agents/agent-context.service.ts"
    ].replace("requireRbacContext", "");

    const result = evaluatePhasedExecution(input);

    expect(result.authorizedScopeComplete).toBe(false);
    expect(result.status).toBe("BLOCKED_REPOSITORY_REQUIREMENTS");
    expect(result.repositoryBlockers).toEqual(
      expect.arrayContaining([expect.stringContaining("P1-04:MARKER_MISSING")]),
    );
  });

  it("blocks premature provider or orchestration dependencies", () => {
    const input = completeInput();
    input.packageJson.dependencies["@ai-sdk/openai"] = "1.0.0";

    const result = evaluatePhasedExecution(input);

    expect(result.repositoryBlockers).toContain(
      "P1-13:PREMATURE_PROVIDER_DEPENDENCY:@ai-sdk/openai",
    );
  });

  it("blocks activation-authority drift", () => {
    const input = completeInput();
    input.operationalEvidence.activation.authorized = true;

    const result = evaluatePhasedExecution(input);

    expect(result.repositoryBlockers).toContain(
      "BOUNDARY-02:JSON_FIELD_MISMATCH:operationalEvidence:activation.authorized",
    );
    expect(result.activationAuthorized).toBe(false);
  });

  it("blocks unauthorized Phase 3 implementation drift", () => {
    const input = completeInput();
    input.promotionLedger.phase3Authorized = true;
    input.files["prisma/schema.prisma"] += "\nmodel AgentActionDraft {}\n";

    const result = evaluatePhasedExecution(input);

    expect(result.repositoryBlockers).toEqual(
      expect.arrayContaining([
        "BOUNDARY-03:JSON_FIELD_MISMATCH:promotionLedger:phase3Authorized",
        "BOUNDARY-03:FORBIDDEN_MARKER:prisma/schema.prisma:model AgentActionDraft",
      ]),
    );
  });

  it("parses report and fail modes with explicit output paths", () => {
    expect(
      parseArgs([
        "--mode",
        "fail",
        "--out",
        "audit.md",
        "--json-out",
        "audit.json",
      ]),
    ).toEqual({
      mode: "fail",
      markdownOut: "audit.md",
      jsonOut: "audit.json",
    });
    expect(() => parseArgs(["--mode", "activate"])).toThrow(
      "Mode must be report or fail.",
    );
  });

  it("renders a no-activation, no-Phase-3 requirement matrix", () => {
    const markdown = renderMarkdown(evaluatePhasedExecution(completeInput()));

    expect(markdown).toContain("Authorized scope complete:** Yes");
    expect(markdown).toContain("Full phased program complete:** No");
    expect(markdown).toContain("Activation authorized:** No");
    expect(markdown).toContain("Phase 3 authorized:** No");
    expect(markdown).toContain("EXTERNAL_OPERATIONAL_RELEASE_BLOCKED");
  });
});

function completeInput() {
  const input = {
    files: {},
    packageJson: {
      scripts: {},
      dependencies: {},
      devDependencies: {},
    },
    operationalEvidence: {
      declaredStatus: "BLOCKED",
      activation: {
        requested: false,
        authorized: false,
        activatedAt: null,
      },
      approvals: {
        product: { decision: "PENDING", actorDirectoryId: null },
        security: { decision: "PENDING", actorDirectoryId: null },
      },
    },
    credentialRegister: {
      declaredStatus: "BLOCKED",
    },
    promotionLedger: {
      overallStatus: "BLOCKED",
      phase3Authorized: false,
    },
    freezeAttestation: {
      status: "FROZEN_COMMIT_VERIFIED",
      freezeVerified: true,
      cleanReleaseReady: false,
      activationAuthorized: false,
      phase3Authorized: false,
      summary: {
        contentMismatches: 0,
        phase2aRuntimeDrift: 0,
      },
    },
    now: new Date("2026-07-25T16:00:00.000Z"),
  };

  for (const requirement of REQUIREMENTS) {
    for (const check of requirement.checks) {
      if (check.type === "file" || check.type === "forbiddenFileMarker") {
        input.files[check.path] ??= "";
      }
      if (check.type === "file") {
        input.files[check.path] += `${check.markers.join("\n")}\n`;
      } else if (check.type === "packageScript") {
        input.packageJson.scripts[check.name] = "node gate.js";
      }
    }
  }

  return input;
}
