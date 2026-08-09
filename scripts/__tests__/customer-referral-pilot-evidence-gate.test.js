const {
  buildReport,
  classifyDatabaseUrl,
  gateResult,
  queryPilotEvidence,
  renderMarkdown,
  validateManifest,
} = require("../customer-referral-pilot-evidence-gate");

const manifest = {
  version: 1,
  pilotId: "customer-referral-pilot-001",
  sourceOrganizationId: "source-org-1",
  statementSnapshotId: "statement-1",
  targetOrganizationId: "target-org-1",
  releaseRevision: "a".repeat(40),
  pilotStartedAt: "2026-08-09T08:00:00.000Z",
  pilotCompletedAt: "2026-08-09T12:00:00.000Z",
  requiredRecipientAction: "EITHER",
  requiredDeliveryChannel: "EITHER",
  realUserPilot: true,
  productionEnvironment: true,
  tenantConsentConfirmed: true,
  testAndSeedDataExcluded: true,
  piiExcludedFromManifest: true,
  approvedBy: "release-owner",
  approvedAt: "2026-08-09T12:15:00.000Z",
  evidenceReferences: ["release-run-142", "pilot-review-019"],
};

const readyRow = {
  statement_exists: true,
  statement_integrity: true,
  token_count: 1,
  token_integrity: true,
  sent_delivery_count: 1,
  delivery_integrity: true,
  granted_view_count: 1,
  redacted_view_evidence: true,
  recipient_action_count: 1,
  response_log_count: 1,
  recipient_action_integrity: true,
  impression_count: 1,
  click_count: 1,
  conversion_count: 1,
  conversion_integrity: true,
  target_organization_ready: true,
  target_user_ready: true,
  sequence_complete: true,
};

describe("customer referral pilot evidence gate", () => {
  it("accepts a PII-free, exact-revision real-user pilot manifest", () => {
    const result = validateManifest(manifest, new Date("2026-08-10T00:00:00Z"));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.scopeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.evidenceReferenceDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects fixtures, same-tenant conversions, missing consent, and mutable revisions", () => {
    const result = validateManifest(
      {
        ...manifest,
        targetOrganizationId: manifest.sourceOrganizationId,
        releaseRevision: "working-tree",
        tenantConsentConfirmed: false,
        testAndSeedDataExcluded: false,
      },
      new Date("2026-08-10T00:00:00Z"),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "manifest_source_target_must_differ",
        "manifest_release_revision",
        "manifest_tenantConsentConfirmed",
        "manifest_testAndSeedDataExcluded",
      ]),
    );
  });

  it("requires the complete statement-to-activation chain", () => {
    const manifestResult = validateManifest(
      manifest,
      new Date("2026-08-10T00:00:00Z"),
    );
    const report = buildReport({
      mode: "fail",
      manifestResult,
      database: classifyDatabaseUrl("postgresql://db.example.invalid/stoquify"),
      query: { succeeded: true, row: readyRow },
    });
    expect(report.summary.status).toBe("ready");
    expect(report.summary.readyCount).toBe(report.summary.checkCount);
    expect(gateResult(report, "fail").exitCode).toBe(0);
  });

  it("blocks when a click, verified login, or response log is missing", () => {
    const manifestResult = validateManifest(
      manifest,
      new Date("2026-08-10T00:00:00Z"),
    );
    const report = buildReport({
      mode: "fail",
      manifestResult,
      database: classifyDatabaseUrl("postgresql://db.example.invalid/stoquify"),
      query: {
        succeeded: true,
        row: {
          ...readyRow,
          click_count: 0,
          response_log_count: 0,
          target_user_ready: false,
          sequence_complete: false,
        },
      },
    });
    expect(report.summary.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "recipient_response_captured_and_logged",
        "referral_click_logged",
        "referred_organization_activated",
        "end_to_end_event_sequence_complete",
      ]),
    );
    expect(gateResult(report, "fail").exitCode).toBe(1);
  });

  it("uses a repeatable-read, read-only transaction and always closes the client", async () => {
    const calls = [];
    const client = {
      connect: jest.fn(),
      query: jest.fn(async (sql, params) => {
        calls.push({ sql, params });
        return sql.includes("WITH statement_row") ? { rows: [readyRow] } : { rows: [] };
      }),
      end: jest.fn(),
    };
    const result = await queryPilotEvidence(
      "postgresql://secret:secret@db.example.invalid/stoquify",
      manifest,
      () => client,
    );
    expect(result.succeeded).toBe(true);
    expect(calls[0].sql).toContain("REPEATABLE READ READ ONLY");
    expect(calls.at(-1).sql).toBe("ROLLBACK");
    expect(calls.find((call) => call.params)?.params).toEqual([
      manifest.statementSnapshotId,
      manifest.sourceOrganizationId,
      manifest.targetOrganizationId,
      manifest.pilotStartedAt,
      manifest.pilotCompletedAt,
      manifest.requiredRecipientAction,
      manifest.requiredDeliveryChannel,
    ]);
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it("never renders database credentials, IDs, or raw evidence references", () => {
    const manifestResult = validateManifest(
      manifest,
      new Date("2026-08-10T00:00:00Z"),
    );
    const report = buildReport({
      manifestResult,
      database: classifyDatabaseUrl(
        "postgresql://private-user:private-password@db.example.invalid/stoquify",
      ),
      query: { succeeded: true, row: readyRow },
    });
    const rendered = renderMarkdown(report);
    expect(rendered).not.toContain("private-user");
    expect(rendered).not.toContain("private-password");
    expect(rendered).not.toContain(manifest.sourceOrganizationId);
    expect(rendered).not.toContain(manifest.statementSnapshotId);
    expect(rendered).not.toContain(manifest.targetOrganizationId);
    for (const reference of manifest.evidenceReferences) {
      expect(rendered).not.toContain(reference);
    }
  });
});
