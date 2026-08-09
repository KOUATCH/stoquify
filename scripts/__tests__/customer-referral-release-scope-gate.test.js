const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildReleaseScope,
  classifyPath,
  gateResult,
  renderMarkdown,
} = require("../customer-referral-release-scope-gate");

function policy() {
  return {
    version: 1,
    requiredCandidatePaths: ["services/referrals/referral.service.ts"],
    categories: {
      candidate: {
        exact: [],
        prefix: ["services/referrals/"],
        contains: [],
        suffix: [],
      },
      split: {
        exact: ["shared/mixed.ts"],
        prefix: [],
        contains: [],
        suffix: [],
      },
      regenerate: {
        exact: [],
        prefix: ["graphify-out/"],
        contains: ["/graphify-out/"],
        suffix: [],
      },
      exclude: {
        exact: [],
        prefix: ["components/inventory/"],
        contains: [],
        suffix: [".tmp"],
      },
    },
  };
}

function inventory(files, staged = []) {
  return {
    all: files,
    staged,
    unstaged: files.filter((file) => !staged.includes(file)),
    untracked: [],
    stateByPath: new Map(
      files.map((file) => [
        file,
        {
          staged: staged.includes(file),
          unstaged: !staged.includes(file),
          untracked: false,
        },
      ]),
    ),
  };
}

describe("customer referral release scope gate", () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "referral-release-scope-"));
    fs.mkdirSync(path.join(root, "services/referrals"), { recursive: true });
    fs.mkdirSync(path.join(root, "components/inventory"), { recursive: true });
    fs.mkdirSync(path.join(root, "graphify-out"), { recursive: true });
    fs.mkdirSync(path.join(root, "shared"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "services/referrals/referral.service.ts"),
      "export const referral = true\n",
    );
    fs.writeFileSync(
      path.join(root, "components/inventory/form.tsx"),
      "export const form = true\n",
    );
    fs.writeFileSync(path.join(root, "graphify-out/graph.json"), "{}\n");
    fs.writeFileSync(path.join(root, "shared/mixed.ts"), "mixed\n");
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("classifies candidate, generated, and unrelated paths deterministically", () => {
    const currentPolicy = policy();
    expect(
      classifyPath(
        "services/referrals/referral.service.ts",
        currentPolicy,
      ).category,
    ).toBe("candidate");
    expect(classifyPath("graphify-out/graph.json", currentPolicy).category).toBe(
      "regenerate",
    );
    expect(
      classifyPath("components/inventory/form.tsx", currentPolicy).category,
    ).toBe("exclude");
  });

  it("lets an exact rule exclude generated evidence from a broader candidate prefix", () => {
    const currentPolicy = policy();
    currentPolicy.categories.candidate.prefix.push("what-next/referrals/");
    currentPolicy.categories.exclude.exact.push(
      "what-next/referrals/scope-readiness.json",
    );
    expect(
      classifyPath(
        "what-next/referrals/scope-readiness.json",
        currentPolicy,
      ),
    ).toMatchObject({ category: "exclude", conflict: false });
  });

  it("makes classification ready while exact release remains fail-closed", () => {
    const report = buildReleaseScope(
      root,
      inventory([
        "services/referrals/referral.service.ts",
        "components/inventory/form.tsx",
        "graphify-out/graph.json",
      ]),
      { valid: true, errors: [], policy: policy() },
      { mode: "fail" },
    );
    expect(report.summary.classificationStatus).toBe("ready");
    expect(report.summary.releaseStatus).toBe("blocked");
    expect(report.candidateScopeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(report.releaseBlockers).toContain(
      "architecture_graph_must_be_regenerated_on_isolated_revision",
    );
    expect(gateResult(report, "fail").exitCode).toBe(1);
  });

  it("classifies mixed shared files but blocks release until their hunks are isolated", () => {
    const report = buildReleaseScope(
      root,
      inventory([
        "services/referrals/referral.service.ts",
        "shared/mixed.ts",
      ]),
      { valid: true, errors: [], policy: policy() },
    );
    expect(report.summary.classificationStatus).toBe("ready");
    expect(report.paths.split).toEqual(["shared/mixed.ts"]);
    expect(report.releaseBlockers).toContain(
      "mixed_shared_files_require_hunk_isolation",
    );
  });

  it("protects unrelated staged paths and reports no content or secrets", () => {
    const report = buildReleaseScope(
      root,
      inventory(
        [
          "services/referrals/referral.service.ts",
          "components/inventory/form.tsx",
        ],
        ["components/inventory/form.tsx"],
      ),
      { valid: true, errors: [], policy: policy() },
    );
    expect(report.paths.protectedStaged).toEqual([
      "components/inventory/form.tsx",
    ]);
    expect(report.releaseBlockers).toContain(
      "unrelated_user_index_changes_present",
    );
    const markdown = renderMarkdown(report);
    expect(markdown).not.toContain("export const referral");
  });

  it("blocks ambiguous and unclassified paths", () => {
    const currentPolicy = policy();
    currentPolicy.categories.exclude.prefix.push("services/");
    const report = buildReleaseScope(
      root,
      inventory([
        "services/referrals/referral.service.ts",
        "unknown/file.ts",
      ]),
      { valid: true, errors: [], policy: currentPolicy },
    );
    expect(report.classificationBlockers).toEqual(
      expect.arrayContaining([
        "release_scope_category_conflicts",
        "release_scope_has_unclassified_paths",
        "required_referral_candidate_paths_missing",
      ]),
    );
  });
});
