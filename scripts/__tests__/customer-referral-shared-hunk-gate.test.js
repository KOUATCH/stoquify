const {
  buildReport,
  gateResult,
  validateManifest,
} = require("../customer-referral-shared-hunk-gate");

function manifest() {
  return validateManifest({
    valid: true,
    errors: [],
    value: {
      version: 1,
      releaseScopePolicy: "scope.json",
      files: [
        {
          path: "shared.ts",
          referralAnchors: ["referral-line"],
          unrelatedAnchors: ["unrelated-line"],
        },
      ],
    },
  });
}

function scope(paths = ["shared.ts"]) {
  return {
    valid: true,
    errors: [],
    value: { categories: { split: { exact: paths } } },
  };
}

describe("customer referral shared-hunk gate", () => {
  it("certifies positive and negative anchors without exposing diff content", () => {
    const report = buildReport(
      ".",
      manifest(),
      scope(),
      () => "+referral-line\n+unrelated-line\n",
    );
    expect(report.summary.status).toBe("ready");
    expect(report.selectionDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(report)).not.toContain("referral-line");
  });

  it("fails closed when a referral or unrelated anchor disappears", () => {
    const report = buildReport(
      ".",
      manifest(),
      scope(),
      () => "+referral-line\n",
    );
    expect(report.blockers).toContain("unrelated_hunk_anchor_missing");
    expect(gateResult(report, "fail").exitCode).toBe(1);
  });

  it("requires exact parity with the release split scope", () => {
    const report = buildReport(
      ".",
      manifest(),
      scope(["other.ts"]),
      () => "+referral-line\n+unrelated-line\n",
    );
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "split_scope_path_missing_from_hunk_policy",
        "hunk_policy_path_missing_from_split_scope",
      ]),
    );
  });

  it("rejects an anchor selected as both referral and unrelated", () => {
    const current = manifest();
    current.value.files[0].unrelatedAnchors = ["referral-line"];
    const report = buildReport(
      ".",
      current,
      scope(),
      () => "+referral-line\n",
    );
    expect(report.blockers).toContain("hunk_anchor_overlap");
  });
});
