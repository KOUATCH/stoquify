const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  CAPABILITY_IDS,
  FOUNDATION_IDS,
  parseArgs,
  parseRoadmapWorkItems,
  validateProgramme,
} = require("../top12-programme-gate");

const root = process.cwd();
const manifestPath = resolve(
  root,
  "docs/stoquify-skills-agents/execution/top12-programme-status.json",
);

function fixture() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const roadmapMarkdown = readFileSync(resolve(root, manifest.roadmap), "utf8");
  return { manifest, roadmapMarkdown, root };
}

describe("Top 12 programme gate", () => {
  it("covers every roadmap work item with an acyclic dependency graph", () => {
    const input = fixture();
    const items = parseRoadmapWorkItems(input.roadmapMarkdown);
    const result = validateProgramme(input);

    expect(items.size).toBe(63);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual(
      expect.objectContaining({ capabilities: 12, foundations: 7, workItems: 63 }),
    );
  });

  it("keeps exact capability and foundation sets", () => {
    const { manifest } = fixture();
    expect(manifest.capabilities.map((item) => item.id)).toEqual(CAPABILITY_IDS);
    expect(manifest.foundations.map((item) => item.id)).toEqual(FOUNDATION_IDS);
  });

  it("rejects capability autonomy above programme ceiling", () => {
    const input = fixture();
    input.manifest.capabilities[0].autonomy = "L3";
    const result = validateProgramme(input);
    expect(result.errors).toContain("CAPABILITY_AUTONOMY_INVALID:C01");
  });

  it("rejects duplicate or missing WBS state", () => {
    const input = fixture();
    input.manifest.workItemStates.PENDING.push("PGM-002");
    input.manifest.workItemStates.COMPLETE =
      input.manifest.workItemStates.COMPLETE.filter((id) => id !== "RUN-001");
    const result = validateProgramme(input);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "WBS_STATE_DUPLICATE:PGM-002",
        "WBS_STATE_MISSING:RUN-001",
      ]),
    );
  });

  it("rejects production or Phase 3 authority claims", () => {
    const input = fixture();
    input.manifest.policy.productionActivation = "ACTIVE";
    input.manifest.policy.phase3Authority = "AUTHORIZED";
    const result = validateProgramme(input);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "PRODUCTION_ACTIVATION_MUST_REMAIN_BLOCKED",
        "PHASE3_AUTHORITY_MUST_REMAIN_UNAUTHORIZED",
      ]),
    );
  });

  it("parses report and fail modes", () => {
    expect(parseArgs([])).toEqual(
      expect.objectContaining({ mode: "report" }),
    );
    expect(parseArgs(["--mode", "fail", "--manifest", "status.json"])).toEqual({
      mode: "fail",
      manifest: "status.json",
    });
    expect(() => parseArgs(["--mode", "unsafe"])).toThrow(
      "Mode must be report or fail.",
    );
  });
});
