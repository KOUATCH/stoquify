export type EnabledPilotBrowserReport = {
  evidencePolicy?: {
    rawReportRetained?: boolean;
    environmentIncluded?: boolean;
  };
  stats?: {
    expected?: number;
    skipped?: number;
    unexpected?: number;
    flaky?: number;
  };
  tests?: Array<{
    projectName?: string;
    title?: string;
    status?: string;
  }>;
};

const REQUIRED_SCENARIOS = [
  {
    projectName: "command-agent-enabled-pilot-desktop",
    title:
      "certifies the governed enabled Command Agent without activation authority",
  },
  {
    projectName: "command-agent-enabled-pilot-mobile",
    title:
      "certifies the governed enabled Command Agent without activation authority",
  },
  {
    projectName: "command-agent-enabled-pilot-desktop",
    title: "denies a role outside the controlled pilot allowlist",
  },
  {
    projectName: "command-agent-enabled-pilot-mobile",
    title: "denies a role outside the controlled pilot allowlist",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "fails closed when the governed definition is DRAFT",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "fails closed when the release role scope no longer matches",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "fails closed when the release manifest no longer matches",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "fails closed when a required approval has expired",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "fails closed when required owner coverage has expired",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "denies a second tenant without a governed release package",
  },
  {
    projectName: "command-agent-enabled-pilot-degradation",
    title: "shows a safe rollback state after release suspension",
  },
] as const;

export function assertEnabledPilotBrowserCertification(
  rawReport: unknown,
): asserts rawReport is EnabledPilotBrowserReport {
  if (!rawReport || typeof rawReport !== "object") {
    throw new Error("Enabled-pilot browser report is invalid.");
  }
  const report = rawReport as EnabledPilotBrowserReport;
  if (
    report.evidencePolicy?.rawReportRetained !== false ||
    report.evidencePolicy?.environmentIncluded !== false
  ) {
    throw new Error(
      "Enabled-pilot browser evidence must exclude raw and environment data.",
    );
  }
  if (
    report.stats?.skipped !== 0 ||
    report.stats?.unexpected !== 0 ||
    report.stats?.flaky !== 0
  ) {
    throw new Error(
      "Enabled-pilot browser certification contains skipped, unexpected, or flaky tests.",
    );
  }
  const tests = Array.isArray(report.tests) ? report.tests : [];
  for (const scenario of REQUIRED_SCENARIOS) {
    const result = tests.find(
      (test) =>
        test.projectName === scenario.projectName &&
        test.title === scenario.title,
    );
    if (!result || result.status !== "passed") {
      throw new Error(
        `Enabled-pilot browser certification is missing a passing scenario: ${scenario.projectName}:${scenario.title}`,
      );
    }
  }
}
