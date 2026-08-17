const {
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
    expect(() => parseArgs(["node", "script", "--mode", "reset"])).toThrow(
      /preflight or execute/,
    )
  })
})
