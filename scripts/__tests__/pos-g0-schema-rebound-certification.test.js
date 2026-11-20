const {
  assertSafeName,
  canonicalizeRows,
  normalizeConstraintRow,
  parseArgs,
  redactedTarget,
  rewritePublicReferences,
} = require("../pos-g0-schema-rebound-certification")

describe("POS G0 schema-rebound certification harness", () => {
  it("rewrites only explicit public-schema references in temporary SQL", () => {
    const projected = rewritePublicReferences(
      `SELECT to_regclass('public.sales_orders');
       SELECT 1 FROM information_schema.tables WHERE table_schema = 'public';
       ALTER TABLE public.sales_orders RENAME TO legacy_sales_orders;
       COMMENT ON TABLE "public".payments IS 'historical public evidence';
       SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus';
       SELECT 1 FROM pg_constraint WHERE conname = 'payments_pkey';`,
      "codex_pos_commit_result_cert_20260817",
    )

    expect(projected).toContain(
      `to_regclass('"codex_pos_commit_result_cert_20260817".sales_orders')`,
    )
    expect(projected).toContain(
      "table_schema = 'codex_pos_commit_result_cert_20260817'",
    )
    expect(projected).toContain(
      'ALTER TABLE "codex_pos_commit_result_cert_20260817".sales_orders',
    )
    expect(projected).toContain(
      'COMMENT ON TABLE "codex_pos_commit_result_cert_20260817".payments',
    )
    expect(projected).toContain("historical public evidence")
    expect(projected).toContain(
      "FROM pg_type WHERE typnamespace = to_regnamespace('codex_pos_commit_result_cert_20260817') AND typname = 'PaymentStatus'",
    )
    expect(projected).toContain(
      "FROM pg_constraint WHERE connamespace = to_regnamespace('codex_pos_commit_result_cert_20260817') AND conname = 'payments_pkey'",
    )
  })

  it("keeps credentials out of the reported database target", () => {
    expect(
      redactedTarget(
        "postgresql://operator:secret@localhost:5432/stoquify_dev_migrated_20260814?schema=codex_pos_commit_result_cert_20260817",
      ),
    ).toEqual({
      protocol: "postgresql:",
      host: "localhost",
      port: "5432",
      database: "stoquify_dev_migrated_20260814",
      schema: "codex_pos_commit_result_cert_20260817",
    })
  })

  it("requires an explicit supported mode", () => {
    expect(parseArgs(["node", "script", "--mode", "execute"]).mode).toBe("execute")
    expect(parseArgs(["node", "script", "--mode", "reassess"]).mode).toBe(
      "reassess",
    )
    expect(() => parseArgs(["node", "script", "--mode", "reset"])).toThrow(
      /preflight, execute, or reassess/,
    )
  })

  it("accepts the approved r2 restore suffix during argument parsing", () => {
    const restoreSchema = parseArgs([
      "node",
      "script",
      "--restore-schema",
      "codex_pos_commit_result_restore_20260817_r2",
    ]).restoreSchema
    expect(restoreSchema).toBe("codex_pos_commit_result_restore_20260817_r2")
    expect(() => assertSafeName(restoreSchema, "restore schema")).not.toThrow()
  })

  it("canonicalizes fingerprint rows independently of database row order", () => {
    const left = canonicalizeRows([
      { table_name: "z", constraint_type: "FOREIGN KEY" },
      { table_name: "a", constraint_type: "PRIMARY KEY" },
    ])
    const right = canonicalizeRows([
      { constraint_type: "PRIMARY KEY", table_name: "a" },
      { constraint_type: "FOREIGN KEY", table_name: "z" },
    ])

    expect(left).toEqual(right)
  })

  it("normalizes only PostgreSQL-generated NOT NULL constraint names", () => {
    expect(
      normalizeConstraintRow({
        table_name: "sales",
        constraint_name: "589320_589321_1_not_null",
        constraint_type: "CHECK",
      }),
    ).toEqual({
      table_name: "sales",
      constraint_name: "<generated-not-null>",
      constraint_type: "CHECK",
    })
    expect(
      normalizeConstraintRow({
        table_name: "sales",
        constraint_name: "sales_total_nonnegative",
        constraint_type: "CHECK",
      }).constraint_name,
    ).toBe("sales_total_nonnegative")
  })
})
