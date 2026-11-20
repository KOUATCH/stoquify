const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  HASH_CONTRACT,
  buildManifest,
  validateManifest,
  writeManifest,
} = require("../prisma-migration-catalog-gate");

function makeRepo(names = ["20260828090000_first"]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-catalog-gate-"));
  for (const name of names) {
    const target = path.join(root, "prisma", "migrations", name, "migration.sql");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `-- ${name}\r\nSELECT 1;\r\n`, "utf8");
  }
  fs.writeFileSync(
    path.join(root, "prisma", "migration-catalog-exceptions.json"),
    JSON.stringify({ schemaVersion: 1, duplicateTimestampGroups: [] }),
    "utf8",
  );
  return root;
}

describe("Prisma migration catalog gate", () => {
  it("writes a deterministic manifest with raw and canonical hash identities", () => {
    const root = makeRepo();
    writeManifest(root);
    const report = validateManifest(root);
    const manifest = buildManifest(root);

    expect(report.status).toBe("ready");
    expect(manifest.hashContract).toEqual(HASH_CONTRACT);
    expect(manifest.migrations[0]).toEqual(
      expect.objectContaining({
        rawSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        canonicalLfSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        canonicalCrlfSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(manifest.migrations[0].rawSha256).toBe(
      manifest.migrations[0].canonicalCrlfSha256,
    );
  });

  it("fails when an immutable manifested migration changes", () => {
    const root = makeRepo();
    writeManifest(root);
    fs.appendFileSync(
      path.join(
        root,
        "prisma/migrations/20260828090000_first/migration.sql",
      ),
      "SELECT 2;\n",
    );

    const report = validateManifest(root);

    expect(report.status).toBe("blocked");
    expect(report.changed).toEqual(["20260828090000_first"]);
    expect(report.errors).toContain("manifested_migration_changed");
  });

  it("rejects a new duplicate timestamp unless the exact group is grandfathered", () => {
    const names = [
      "20260828090000_first",
      "20260828090000_second",
    ];
    const root = makeRepo(names);
    writeManifest(root);

    const blocked = validateManifest(root);
    expect(blocked.errors).toContain(
      "duplicate_migration_timestamp_not_grandfathered",
    );

    fs.writeFileSync(
      path.join(root, "prisma", "migration-catalog-exceptions.json"),
      JSON.stringify({
        schemaVersion: 1,
        duplicateTimestampGroups: [
          {
            timestamp: "20260828090000",
            migrations: names,
            reason: "Test-only exact grandfathered group.",
          },
        ],
      }),
      "utf8",
    );

    expect(validateManifest(root).status).toBe("ready");
  });

  it("fails on an unmanifested migration", () => {
    const root = makeRepo();
    writeManifest(root);
    const target = path.join(
      root,
      "prisma/migrations/20260828100000_second/migration.sql",
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "SELECT 2;\n", "utf8");

    const report = validateManifest(root);

    expect(report.unmanifested).toEqual(["20260828100000_second"]);
    expect(report.errors).toContain("unmanifested_migration");
  });
});
