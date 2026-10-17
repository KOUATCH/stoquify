const fs = require("fs"), path = require("path"), crypto = require("crypto")
const { Client } = require("pg")
const { parse } = require("pg-connection-string")
const dotenv = require("dotenv")
for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true })
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const migrations = fs.readdirSync("prisma/migrations", { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join("prisma/migrations", entry.name, "migration.sql")))
  .map(entry => ({ migration_name: entry.name, checksum: hash(fs.readFileSync(path.join("prisma/migrations", entry.name, "migration.sql"))) }))
  .sort((a, b) => a.migration_name.localeCompare(b.migration_name))
const result = {
  capturedAt: new Date().toISOString(), status: "NOT_STARTED",
  scope: "Aggregate diagnostics on the configured loopback database only; no record identifiers, mutations, repair or production inference.",
  schemaSha256: hash(fs.readFileSync("prisma/schema.prisma")),
  repositoryMigrationCount: migrations.length, repositoryMigrationSetSha256: hash(JSON.stringify(migrations)),
  assumptions: ["Posted population includes POSTED and REVERSED journal entries.",
    "Stored amounts are Decimal(18,2); conversion candidates use ROUND(amount * stored exchangeRate, 2).",
    "Current settings cannot reconstruct the settings effective when historical journals were posted.",
    "Foreign denomination with unit rate is a review candidate, not proof of an incorrect rate.",
    "Absence of candidates on a local fixture does not close implementation or production-data risk."], checks: [],
}
const queries = {
  postedPopulation: `SELECT COUNT(*)::text AS all_journal_entries,
    COUNT(*) FILTER (WHERE status::text IN ('POSTED','REVERSED'))::text AS posted_or_reversed_entries,
    COUNT(*) FILTER (WHERE status::text = 'DRAFT')::text AS draft_entries,
    COUNT(*) FILTER (WHERE status::text = 'VOIDED')::text AS voided_entries FROM public.journal_entries`,
  postedLineBaseAndDenomination: `SELECT COUNT(*)::text AS posted_or_reversed_lines,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NULL OR l."baseCredit" IS NULL)::text AS missing_either_base_amount,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NULL)::text AS missing_base_debit,
    COUNT(*) FILTER (WHERE l."baseCredit" IS NULL)::text AS missing_base_credit,
    COUNT(*) FILTER (WHERE s.id IS NULL)::text AS missing_current_accounting_settings,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL)::text AS current_settings_comparison_denominator,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL AND (s."roundingScale" <> 2 OR s."roundingMode" <> 'HALF_UP'))::text AS lines_with_other_current_rounding_policy,
    COUNT(*) FILTER (WHERE l."exchangeRate" <= 0)::text AS nonpositive_stored_rate,
    COUNT(*) FILTER (WHERE l."exchangeRate" <> 1)::text AS nonunit_stored_rate,
    COUNT(*) FILTER (WHERE UPPER(TRIM(l.currency)) <> UPPER(TRIM(j.currency)))::text AS line_header_currency_mismatch,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL AND UPPER(TRIM(l.currency)) = UPPER(TRIM(s."baseCurrency")))::text AS current_base_denomination_lines,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL AND UPPER(TRIM(l.currency)) = UPPER(TRIM(s."baseCurrency")) AND l."exchangeRate" <> 1)::text AS current_base_denomination_nonunit_rate_candidates,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL AND UPPER(TRIM(l.currency)) <> UPPER(TRIM(s."baseCurrency")))::text AS current_foreign_denomination_lines,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL AND UPPER(TRIM(l.currency)) <> UPPER(TRIM(s."baseCurrency")) AND l."exchangeRate" = 1)::text AS current_foreign_denomination_unit_rate_review_candidates,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NOT NULL AND l."baseCredit" IS NOT NULL)::text AS complete_base_conversion_denominator,
    COUNT(*) FILTER (WHERE l."baseDebit" IS NOT NULL AND l."baseCredit" IS NOT NULL AND
      (l."baseDebit" <> ROUND(l.debit * l."exchangeRate", 2) OR l."baseCredit" <> ROUND(l.credit * l."exchangeRate", 2)))::text AS stored_rate_conversion_candidates,
    COUNT(*) FILTER (WHERE l."organizationId" <> j."organizationId")::text AS line_header_organization_mismatch
    FROM public.journal_entry_lines l JOIN public.journal_entries j ON j.id = l."journalEntryId"
    LEFT JOIN public.organization_accounting_settings s ON s."organizationId" = j."organizationId"
    WHERE j.status::text IN ('POSTED','REVERSED')`,
  suspiciousManualReversals: `SELECT COUNT(*)::text AS posted_or_reversed_entries_with_explicit_reversal_link,
    COUNT(*) FILTER (WHERE o.id IS NULL)::text AS unresolved_original_links,
    COUNT(*) FILTER (WHERE r."sourceType"::text = 'MANUAL')::text AS manual_reversal_denominator,
    COUNT(*) FILTER (WHERE r."sourceType"::text = 'MANUAL' AND o."sourceType" IS NOT NULL AND o."sourceType"::text <> 'MANUAL')::text AS source_owned_to_manual_reversal_candidates,
    COUNT(*) FILTER (WHERE r."sourceType"::text = 'MANUAL' AND o."sourceType" IS NULL)::text AS manual_reversals_with_unknown_original_source,
    COUNT(*) FILTER (WHERE o.id IS NOT NULL AND o."organizationId" <> r."organizationId")::text AS reversal_original_organization_mismatch
    FROM public.journal_entries r LEFT JOIN public.journal_entries o ON o.id = r."reversalOfEntryId"
    WHERE r.status::text IN ('POSTED','REVERSED') AND r."reversalOfEntryId" IS NOT NULL`,
  manualReversalSourceLinks: `SELECT COUNT(*)::text AS posted_or_reversed_manual_reversal_entries,
    COUNT(*) FILTER (WHERE r."sourceId" IS NOT NULL)::text AS source_id_link_denominator,
    COUNT(*) FILTER (WHERE o.id IS NOT NULL)::text AS source_id_resolves_to_journal_entry,
    COUNT(*) FILTER (WHERE o."sourceType" IS NOT NULL AND o."sourceType"::text <> 'MANUAL')::text AS source_id_resolves_to_source_owned_original,
    COUNT(*) FILTER (WHERE o.id IS NOT NULL AND r."reversalOfEntryId" IS DISTINCT FROM o.id)::text AS source_id_and_explicit_reversal_disagree
    FROM public.journal_entries r LEFT JOIN public.journal_entries o ON o.id = r."sourceId"
    WHERE r.status::text IN ('POSTED','REVERSED') AND r."sourceType"::text = 'MANUAL' AND r."postingPurpose"::text = 'REVERSAL'`,
  fiscalPeriodBounds: `SELECT COUNT(*)::text AS accounting_periods,
    COUNT(*) FILTER (WHERE f.id IS NOT NULL)::text AS fiscal_year_bound_comparison_denominator,
    COUNT(*) FILTER (WHERE f.id IS NULL)::text AS missing_fiscal_year,
    COUNT(*) FILTER (WHERE p."startDate" < f."startDate" OR p."endDate" > f."endDate")::text AS periods_outside_fiscal_year,
    COUNT(*) FILTER (WHERE p."startDate" > p."endDate")::text AS reversed_period_bounds,
    COUNT(*) FILTER (WHERE f."startDate" > f."endDate")::text AS periods_linked_to_reversed_fiscal_year_bounds,
    COUNT(*) FILTER (WHERE p."organizationId" <> f."organizationId")::text AS period_year_organization_mismatch
    FROM public.accounting_periods p LEFT JOIN public.fiscal_years f ON f.id = p."fiscalYearId"`,
  postedEntryPeriodBounds: `SELECT COUNT(*)::text AS posted_or_reversed_entries,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL)::text AS period_bound_comparison_denominator,
    COUNT(*) FILTER (WHERE p.id IS NULL)::text AS missing_period,
    COUNT(*) FILTER (WHERE j."entryDate" < p."startDate" OR j."entryDate" > p."endDate")::text AS entries_outside_assigned_period,
    COUNT(*) FILTER (WHERE j."organizationId" <> p."organizationId")::text AS entry_period_organization_mismatch
    FROM public.journal_entries j LEFT JOIN public.accounting_periods p ON p.id = j."periodId"
    WHERE j.status::text IN ('POSTED','REVERSED')`,
  journalBalances: `WITH posted AS (SELECT id FROM public.journal_entries WHERE status::text IN ('POSTED','REVERSED')),
    totals AS (SELECT j.id, COUNT(l.id) AS line_count,
      COUNT(*) FILTER (WHERE l.id IS NOT NULL AND (l."baseDebit" IS NULL OR l."baseCredit" IS NULL)) AS null_base_lines,
      SUM(l."baseDebit") AS base_debit, SUM(l."baseCredit") AS base_credit
      FROM posted j LEFT JOIN public.journal_entry_lines l ON l."journalEntryId" = j.id GROUP BY j.id),
    nominal AS (SELECT l."journalEntryId", l.currency, SUM(l.debit) AS debit, SUM(l.credit) AS credit
      FROM public.journal_entry_lines l JOIN posted j ON j.id = l."journalEntryId" GROUP BY l."journalEntryId", l.currency)
    SELECT (SELECT COUNT(*)::text FROM posted) AS posted_or_reversed_entries,
      (SELECT COUNT(*)::text FROM totals WHERE line_count = 0) AS entries_without_lines,
      (SELECT COUNT(*)::text FROM nominal) AS nominal_currency_group_denominator,
      (SELECT COUNT(*)::text FROM nominal WHERE debit <> credit) AS unbalanced_nominal_currency_groups,
      (SELECT COUNT(DISTINCT "journalEntryId")::text FROM nominal WHERE debit <> credit) AS entries_with_unbalanced_nominal_group,
      (SELECT COUNT(*)::text FROM totals WHERE line_count > 0 AND null_base_lines = 0) AS complete_base_entry_denominator,
      (SELECT COUNT(*)::text FROM totals WHERE line_count > 0 AND null_base_lines = 0 AND base_debit <> base_credit) AS unbalanced_complete_base_entries,
      (SELECT COUNT(*)::text FROM totals WHERE null_base_lines > 0) AS entries_not_base_testable`,
  migrationComparison: `WITH expected AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS e(migration_name text, checksum text)),
    applied AS (SELECT migration_name, checksum FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)
    SELECT (SELECT COUNT(*)::text FROM expected) AS repository_migrations,
      (SELECT COUNT(*)::text FROM applied) AS successful_unrolled_back_migration_rows,
      (SELECT COUNT(DISTINCT migration_name)::text FROM applied) AS successful_distinct_migrations,
      (SELECT COUNT(*)::text FROM expected e WHERE NOT EXISTS (SELECT 1 FROM applied a WHERE a.migration_name = e.migration_name)) AS repository_migrations_not_applied,
      (SELECT COUNT(*)::text FROM applied a WHERE NOT EXISTS (SELECT 1 FROM expected e WHERE e.migration_name = a.migration_name)) AS applied_migrations_absent_from_repository,
      (SELECT COUNT(*)::text FROM applied a JOIN expected e USING (migration_name) WHERE a.checksum <> e.checksum) AS checksum_mismatch_rows,
      (SELECT COUNT(*)::text FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished_unrolled_back_rows`,
}

async function run() {
  let client, transactionStarted = false
  try {
    const raw = process.env.DATABASE_URL || process.env.DIRECT_URL
    if (!raw) { result.status = "BLOCKED_NO_CONNECTION_CONFIGURATION"; return }
    const expanded = raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || "").replace(/^['"]|['"]$/g, "").trim()
    const url = new URL(expanded), connection = parse(expanded)
    const normalizedHost = host => String(host || "").toLowerCase().replace(/^\[|\]$/g, "")
    const isLoopback = host => ["localhost", "127.0.0.1", "::1"].includes(normalizedHost(host))
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !isLoopback(url.hostname) || !isLoopback(connection.host) ||
        (url.searchParams.has("hostaddr") && !isLoopback(url.searchParams.get("hostaddr")))) {
      result.status = "BLOCKED_NON_LOOPBACK_TARGET"; return
    }
    result.targetKind = "configured_loopback"
    result.targetFingerprint = hash(`${normalizedHost(connection.host)}:${connection.port || "5432"}/${connection.database || ""}`)
    // Override parsed URI options so they cannot weaken the read-only connection guard.
    client = new Client({ ...connection, connectionTimeoutMillis: 12_000, query_timeout: 18_000,
      application_name: "stoquify_read_only_remediation_impact",
      options: "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=20000" })
    await client.connect()
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    transactionStarted = true
    const session = (await client.query("SELECT transaction_timestamp() AS as_of, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation, current_setting('statement_timeout') AS statement_timeout, current_setting('lock_timeout') AS lock_timeout")).rows[0]
    if (session.read_only !== "on" || session.isolation !== "repeatable read") throw new Error("Read-only snapshot verification failed")
    result.snapshot = session
    for (const [name, sql] of Object.entries(queries)) {
      await client.query("SAVEPOINT impact_check")
      try {
        const response = await client.query(sql, name === "migrationComparison" ? [JSON.stringify(migrations)] : undefined)
        result.checks.push({ name, status: "EXECUTED", sql, rows: response.rows })
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT impact_check")
        result.checks.push({ name, status: "QUERY_FAILED", sql, errorCode: error.code || "QUERY_ERROR" })
      }
      await client.query("RELEASE SAVEPOINT impact_check")
    }
    await client.query("ROLLBACK")
    transactionStarted = false
    result.rollbackConfirmed = true
    result.status = result.checks.some(check => check.status !== "EXECUTED") ? "PARTIAL_READ_ONLY_SCAN" : "READ_ONLY_SCAN_COMPLETE"
  } catch (error) {
    result.status = "BLOCKED_CONNECTION_OR_SESSION_ERROR"
    result.errorCode = error.code || "SESSION_ERROR"
    // Never emit credential-bearing connection errors or arbitrary server messages.
  } finally {
    if (client) {
      if (transactionStarted) {
        try { await client.query("ROLLBACK"); result.rollbackConfirmed = true }
        catch { result.rollbackConfirmed = false }
      }
      await client.end().catch(() => {})
    }
    result.completedAt = new Date().toISOString()
    result.schemaUnchangedDuringScan = result.schemaSha256 === hash(fs.readFileSync("prisma/schema.prisma"))
    fs.writeFileSync(path.join(__dirname, "aggregate-impact.json"), JSON.stringify(result, null, 2) + "\n")
    console.log(JSON.stringify({ status: result.status, targetKind: result.targetKind, snapshot: result.snapshot, rollbackConfirmed: result.rollbackConfirmed,
      schemaUnchangedDuringScan: result.schemaUnchangedDuringScan,
      checks: result.checks.map(({ name, status, rows, errorCode }) => ({ name, status, rows, errorCode })) }, null, 2))
  }
}
run().catch(() => { process.exitCode = 1 })
