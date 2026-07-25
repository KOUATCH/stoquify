import { assertEnabledPilotBrowserCertification } from "../agent-enabled-pilot-browser-report";

describe("enabled-pilot browser report certification", () => {
  it("accepts the complete sanitized browser matrix", () => {
    expect(() =>
      assertEnabledPilotBrowserCertification(validReport()),
    ).not.toThrow();
  });

  it.each([
    ["skipped", { skipped: 1 }],
    ["unexpected", { unexpected: 1 }],
    ["flaky", { flaky: 1 }],
  ])("rejects a report with %s results", (_label, stats) => {
    const report = validReport();
    report.stats = { ...report.stats, ...stats };

    expect(() => assertEnabledPilotBrowserCertification(report)).toThrow(
      "skipped, unexpected, or flaky",
    );
  });

  it("rejects a missing degradation scenario", () => {
    const report = validReport();
    report.tests = report.tests.filter(
      (test) =>
        test.title !== "shows a safe rollback state after release suspension",
    );

    expect(() => assertEnabledPilotBrowserCertification(report)).toThrow(
      "missing a passing scenario",
    );
  });

  it("rejects retained raw or environment evidence", () => {
    const report = validReport();
    report.evidencePolicy.rawReportRetained = true;

    expect(() => assertEnabledPilotBrowserCertification(report)).toThrow(
      "exclude raw and environment data",
    );
  });
});

function validReport() {
  const baselineTitle =
    "certifies the governed enabled Command Agent without activation authority";
  const deniedTitle = "denies a role outside the controlled pilot allowlist";
  return {
    evidencePolicy: {
      rawReportRetained: false,
      environmentIncluded: false,
    },
    stats: {
      expected: 12,
      skipped: 0,
      unexpected: 0,
      flaky: 0,
    },
    tests: [
      passed("command-agent-enabled-pilot-desktop", baselineTitle),
      passed("command-agent-enabled-pilot-mobile", baselineTitle),
      passed("command-agent-enabled-pilot-desktop", deniedTitle),
      passed("command-agent-enabled-pilot-mobile", deniedTitle),
      passed(
        "command-agent-enabled-pilot-degradation",
        "fails closed when the governed definition is DRAFT",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "fails closed when the release role scope no longer matches",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "fails closed when the release manifest no longer matches",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "fails closed when a required approval has expired",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "fails closed when required owner coverage has expired",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "denies a second tenant without a governed release package",
      ),
      passed(
        "command-agent-enabled-pilot-degradation",
        "shows a safe rollback state after release suspension",
      ),
    ],
  };
}

function passed(projectName: string, title: string) {
  return { projectName, title, status: "passed" };
}
