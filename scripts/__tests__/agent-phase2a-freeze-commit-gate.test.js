const { createHash } = require("node:crypto");
const {
  agentRuntimeSchemaChanged,
  classifyCurrentChange,
  evaluateFreezeCommit,
  extractAgentRuntimeSchema,
  parsePorcelainStatus,
  renderMarkdown,
  validateManifest,
  verifyCommittedFile,
} = require("../agent-phase2a-freeze-commit-gate");

const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);
const CURRENT_HEAD = "c".repeat(40);
const SELF =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_CANDIDATE_FILE_MANIFEST_2026-07-25.json";

describe("Phase 2A freeze commit gate", () => {
  it("verifies the exact candidate commit while keeping a dirty release blocked", () => {
    const fixture = completeFixture();
    fixture.currentChanges = [
      {
        status: "M",
        path: "docs/agents-runtime/freeze-evidence.md",
      },
      { status: "M", path: "services/unrelated-domain.ts" },
    ];

    const result = evaluateFreezeCommit(fixture);

    expect(result).toEqual(
      expect.objectContaining({
        status: "FROZEN_COMMIT_VERIFIED",
        freezeVerified: true,
        cleanReleaseReady: false,
        activationAuthorized: false,
        phase3Authorized: false,
        blockers: [],
      }),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        manifestFiles: 2,
        commitCandidateFiles: 2,
        verifiedFiles: 2,
        contentMismatches: 0,
        evidenceControlChanges: 1,
        phase2aRuntimeDrift: 0,
        outsideCandidateChanges: 1,
      }),
    );
  });

  it("accepts line-ending, historical Git-filter, and clean-filter equivalence", () => {
    const lineEnding = verifyCommittedFile({
      committed: Buffer.from("one\ntwo\n"),
      current: null,
      currentPathChanged: false,
      expectedBytes: Buffer.byteLength("one\r\ntwo\r\n"),
      expectedSha256: sha(Buffer.from("one\r\ntwo\r\n")),
    });
    const mixedCheckout = Buffer.from("one\r\ntwo\n");
    const cleanFilter = verifyCommittedFile({
      committed: Buffer.from("one\ntwo\n"),
      current: mixedCheckout,
      currentPathChanged: false,
      expectedBytes: mixedCheckout.length,
      expectedSha256: sha(mixedCheckout),
    });
    const filteredCommit = verifyCommittedFile({
      committed: Buffer.from("normalized\n"),
      filteredCommitted: mixedCheckout,
      current: null,
      currentPathChanged: true,
      expectedBytes: mixedCheckout.length,
      expectedSha256: sha(mixedCheckout),
    });

    expect(lineEnding).toEqual(
      expect.objectContaining({
        verified: true,
        method: "LINE_ENDING_EQUIVALENT",
      }),
    );
    expect(cleanFilter).toEqual(
      expect.objectContaining({
        verified: true,
        method: "GIT_CLEAN_FILTER_EQUIVALENT",
      }),
    );
    expect(filteredCommit).toEqual(
      expect.objectContaining({
        verified: true,
        method: "GIT_FILTERED_COMMIT_EQUIVALENT",
      }),
    );
  });

  it("blocks committed-content mismatch and post-freeze runtime drift", () => {
    const fixture = completeFixture();
    fixture.committedContents.set(
      "services/agents/runtime.ts",
      Buffer.from("changed runtime"),
    );
    fixture.currentChanges = [
      { status: "M", path: "services/agents/runtime.ts" },
    ];

    const result = evaluateFreezeCommit(fixture);

    expect(result.freezeVerified).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "FREEZE_COMMIT_CONTENT_MISMATCH:services/agents/runtime.ts",
        "POST_FREEZE_RUNTIME_DRIFT:services/agents/runtime.ts",
      ]),
    );
  });

  it("verifies the historical freeze after HEAD advances through evidence-only work", () => {
    const fixture = completeFixture();
    fixture.currentHead = CURRENT_HEAD;
    fixture.postFreezeCommittedChanges = [
      {
        status: "COMMITTED",
        path: "scripts/agent-phase2a-freeze-commit-gate.js",
      },
      {
        status: "COMMITTED",
        path: "services/unrelated-domain.ts",
      },
    ];

    const result = evaluateFreezeCommit(fixture);

    expect(result).toEqual(
      expect.objectContaining({
        status: "FROZEN_COMMIT_VERIFIED",
        freezeVerified: true,
        cleanReleaseReady: false,
        frozenCommitIsCurrentHead: false,
        currentHeadCommit: CURRENT_HEAD,
        blockers: [],
      }),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        postFreezeCommittedChanges: 2,
        committedEvidenceControlChanges: 1,
        committedPhase2aRuntimeDrift: 0,
        committedOutsideCandidateChanges: 1,
      }),
    );
  });

  it("blocks runtime drift committed after the historical freeze", () => {
    const fixture = completeFixture();
    fixture.currentHead = CURRENT_HEAD;
    fixture.postFreezeCommittedChanges = [
      {
        status: "COMMITTED",
        path: "services/agents/runtime.ts",
      },
    ];

    const result = evaluateFreezeCommit(fixture);

    expect(result.freezeVerified).toBe(false);
    expect(result.summary.committedPhase2aRuntimeDrift).toBe(1);
    expect(result.blockers).toContain(
      "POST_FREEZE_COMMITTED_RUNTIME_DRIFT:services/agents/runtime.ts",
    );
  });
  it("blocks missing and unexpected commit paths", () => {
    const fixture = completeFixture();
    fixture.commitPaths = [
      "services/agents/runtime.ts",
      "unexpected/runtime.ts",
      SELF,
    ];

    const result = evaluateFreezeCommit(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "FREEZE_COMMIT_PATH_MISSING:docs/agents-runtime/freeze-evidence.md",
        "FREEZE_COMMIT_PATH_UNEXPECTED:unexpected/runtime.ts",
      ]),
    );
  });

  it("rejects authority drift and inconsistent manifest totals", () => {
    const fixture = completeFixture();
    fixture.manifest.activationAuthorized = true;
    fixture.manifest.counts.total = 3;

    const blockers = validateManifest(fixture.manifest);
    const result = evaluateFreezeCommit(fixture);

    expect(blockers).toEqual(
      expect.arrayContaining([
        "FREEZE_MANIFEST_AUTHORITY_BOUNDARY_INVALID",
        "FREEZE_MANIFEST_TOTAL_COUNT_MISMATCH",
      ]),
    );
    expect(result.freezeVerified).toBe(false);
  });

  it("parses NUL-delimited Git status paths without quote artifacts", () => {
    const result = parsePorcelainStatus(
      Buffer.from(" M docs/file one.md\0?? new file.txt\0", "utf8"),
    );

    expect(result).toEqual([
      { status: " M", path: "docs/file one.md" },
      { status: "??", path: "new file.txt" },
    ]);
  });

  it("classifies phased-execution audit files as evidence controls", () => {
    expect(
      classifyCurrentChange(
        "scripts/agent-phased-execution-requirements-gate.js",
      ),
    ).toBe("EVIDENCE_CONTROL_REMEDIATION");
    expect(
      classifyCurrentChange(
        "scripts/__tests__/agent-phased-execution-requirements-gate.test.js",
      ),
    ).toBe("EVIDENCE_CONTROL_REMEDIATION");
  });
  it("treats unrelated shared-schema work and formatting as outside the frozen agent slice", () => {
    const baseline = Buffer.from(`
model Organization {
  agentRuns AgentRun[]
}

model AgentRun {
  id     String @id
  status AgentRunStatus
}

enum AgentRunStatus {
  PENDING
  COMPLETED
}

model InventoryItem {
  id String @id
}
`);
    const current = Buffer.from(`
model Organization {
  agentRuns       AgentRun[]
}

model AgentRun {
  id String @id
  status   AgentRunStatus
}

enum AgentRunStatus {
  PENDING
  COMPLETED
}

model InventoryItem {
  id       String @id
  sku      String
}
`);

    expect(extractAgentRuntimeSchema(current)).toBe(
      extractAgentRuntimeSchema(baseline),
    );
    expect(agentRuntimeSchemaChanged(baseline, current)).toBe(false);
    expect(
      classifyCurrentChange(
        "prisma/schema.prisma",
        { category: "RUNTIME_SOURCE_TEST" },
        { baselineContent: baseline, currentContent: current },
      ),
    ).toBe("OUTSIDE_CANDIDATE_SCOPE");
  });

  it("fails closed for real or unverifiable agent-runtime schema drift", () => {
    const baseline = Buffer.from(`
model Organization {
  agentRuns AgentRun[]
}

model AgentRun {
  id String @id
}
`);
    const changed = Buffer.from(`
model Organization {
  agentRuns AgentRun[]
}

model AgentRun {
  id        String @id
  writeMode Boolean @default(false)
}
`);

    expect(agentRuntimeSchemaChanged(baseline, changed)).toBe(true);
    expect(
      classifyCurrentChange(
        "prisma/schema.prisma",
        { category: "RUNTIME_SOURCE_TEST" },
        { baselineContent: baseline, currentContent: changed },
      ),
    ).toBe("PHASE2A_RUNTIME_DRIFT");
    expect(
      classifyCurrentChange(
        "prisma/schema.prisma",
        { category: "RUNTIME_SOURCE_TEST" },
        { baselineContent: baseline, currentContent: null },
      ),
    ).toBe("PHASE2A_RUNTIME_DRIFT");
  });

  it("renders a value-free no-activation attestation", () => {
    const result = evaluateFreezeCommit(completeFixture());
    const markdown = renderMarkdown(result);

    expect(markdown).toContain("Freeze verified:** Yes");
    expect(markdown).toContain("Activation authorized:** No");
    expect(markdown).toContain("Phase 3 authorized:** No");
    expect(markdown).toContain("None for promotion point 1 commit attestation");
  });
});

function completeFixture() {
  const runtime = Buffer.from("runtime source\n");
  const evidence = Buffer.from("# evidence\n");
  const manifest = {
    schemaVersion: 1,
    manifestId: "phase2a-freeze-test",
    baseHeadCommit: BASE,
    sourceTreeClean: false,
    activationAuthorized: false,
    phase3Authorized: false,
    selfExcluded: SELF,
    counts: {
      runtimeSourceTest: 1,
      releaseEvidenceDoc: 1,
      total: 2,
      excludedChangedFiles: 0,
    },
    files: [
      {
        category: "RUNTIME_SOURCE_TEST",
        path: "services/agents/runtime.ts",
        sha256: sha(runtime),
        bytes: runtime.length,
      },
      {
        category: "RELEASE_EVIDENCE_DOC",
        path: "docs/agents-runtime/freeze-evidence.md",
        sha256: sha(evidence),
        bytes: evidence.length,
      },
    ],
  };
  return {
    branch: "codex/test",
    commitPaths: [
      "services/agents/runtime.ts",
      "docs/agents-runtime/freeze-evidence.md",
      SELF,
    ],
    committedContents: new Map([
      ["services/agents/runtime.ts", runtime],
      ["docs/agents-runtime/freeze-evidence.md", evidence],
    ]),
    currentChanges: [],
    currentFileContents: new Map([
      ["services/agents/runtime.ts", runtime],
      ["docs/agents-runtime/freeze-evidence.md", evidence],
    ]),
    head: HEAD,
    manifest,
    manifestReference: "manifest.json",
    now: new Date("2026-07-25T14:00:00.000Z"),
    parent: BASE,
  };
}

function sha(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
