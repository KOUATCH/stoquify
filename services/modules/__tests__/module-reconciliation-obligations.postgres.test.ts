import { Prisma } from "@prisma/client"
import { Client } from "pg"
import { getModuleReconciliationObligations } from "../module-reconciliation-obligations.service"

const TARGET = "stoquify_local_modern_modules_controls_20260905_01"
const run = process.env.RUN_MODULE_RECONCILIATION_OBLIGATIONS_POSTGRES === "1"
const describePostgres = run ? describe : describe.skip

describePostgres("reconciliation obligations on transaction-local PostgreSQL fixtures", () => {
  let client: Client
  let tx: Prisma.TransactionClient

  beforeAll(async () => {
    // Read existing bootstrap configuration without printing or mutating it.
    const { loadDatabaseUrl, resolveTarget } = require("../../../scripts/prisma-local-fresh-bootstrap")
    const target = resolveTarget({ databaseName: TARGET, sourceUrl: loadDatabaseUrl(process.env), nodeEnv: process.env.NODE_ENV }) as URL
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname) || decodeURIComponent(target.pathname.slice(1)) !== TARGET) {
      throw new Error("Refusing obligation fixtures outside the exact local controls database")
    }
    client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 })
    await client.connect()
    const identity = await client.query("SELECT current_database() AS name")
    if (identity.rows[0]?.name !== TARGET) throw new Error("Controls database identity mismatch")
    tx = { $queryRaw: async (query: Prisma.Sql) => (await client.query(query.text, query.values)).rows } as unknown as Prisma.TransactionClient
  }, 20000)

  afterAll(async () => { if (client) await client.end() })

  beforeEach(async () => {
    await client.query("BEGIN")
    await client.query("SET LOCAL search_path = pg_temp, pg_catalog")
    await client.query(`
      CREATE TEMP TABLE reconciliation_runs (id text, "organizationId" text, "providerAccountId" text, status text,
        "voidedAt" timestamp, "signedAt" timestamp, "signedById" text, "certificateHash" text) ON COMMIT DROP;
      CREATE TEMP TABLE suspense_items ("organizationId" text, status text) ON COMMIT DROP;
      CREATE TEMP TABLE payment_transactions (id text, "organizationId" text, "providerAccountId" text, state text,
        "occurredAt" timestamp, amount numeric, "currencyCode" text, "legacyPaymentId" text) ON COMMIT DROP;
      CREATE TEMP TABLE payments (id text, "organizationId" text, method text, status text, "deletedAt" timestamp, amount numeric DEFAULT 100) ON COMMIT DROP;
      CREATE TEMP TABLE provider_events (id text, "organizationId" text, "providerAccountId" text, status text,
        "signatureValid" boolean, amount numeric, "currencyCode" text) ON COMMIT DROP;
      CREATE TEMP TABLE statement_files (id text, "organizationId" text, status text) ON COMMIT DROP;
      CREATE TEMP TABLE statement_lines (id text, "organizationId" text, "providerAccountId" text, "statementFileId" text,
        status text, amount numeric, "currencyCode" text) ON COMMIT DROP;
      CREATE TEMP TABLE match_records (id text, "organizationId" text, "providerAccountId" text, "paymentTransactionId" text,
        "providerEventId" text, "statementLineId" text, "reconciliationRunId" text, "correctionOfId" text,
        status text, "amountMatched" numeric, "currencyCode" text,
        rule text DEFAULT 'MANUAL', "matchedById" text DEFAULT 'maker', metadata jsonb DEFAULT '{}',
        "correctionReason" text, "createdAt" timestamp DEFAULT now()) ON COMMIT DROP;
      CREATE TEMP TABLE payment_exceptions ("organizationId" text, "providerEventId" text, status text) ON COMMIT DROP;
      CREATE TEMP TABLE payment_reconciliation_inbox_items ("organizationId" text, status text) ON COMMIT DROP;
    `)
  })

  afterEach(async () => { await client.query("ROLLBACK") })

  it("retires only a valid replacement lineage and keeps malformed or foreign markers pending", async () => {
    await client.query(`
      INSERT INTO pg_temp.match_records (id,"organizationId","providerAccountId","paymentTransactionId","providerEventId",status,"amountMatched","currencyCode") VALUES
        ('original','tenant-a','provider','payment','event','PROPOSED',60,'XAF'),
        ('replacement','tenant-a','provider','payment','event','PROPOSED',50,'XAF');
      UPDATE pg_temp.match_records SET metadata = '{"supersedesProposalId":"original","evidenceRevision":"sha256:${"a".repeat(64)}"}' WHERE id = 'replacement';
      INSERT INTO pg_temp.match_records (id,"organizationId","providerAccountId","correctionOfId",status,"currencyCode","correctionReason",metadata) VALUES
        ('marker','tenant-a','provider','original','VOIDED','XAF','REPLACED_BY_CURRENT_EVIDENCE_PROPOSAL','{"replacementProposalId":"replacement"}');
    `)
    const pending = async () => (await getModuleReconciliationObligations(tx, "tenant-a")).find(row => row.code === "reconciliation_matches_pending")?.count
    expect(await pending()).toBe(1)
    for (const mutation of [
      `UPDATE pg_temp.match_records SET "organizationId" = 'tenant-b' WHERE id = 'marker'`,
      `UPDATE pg_temp.match_records SET "providerAccountId" = 'foreign' WHERE id = 'marker'`,
      `UPDATE pg_temp.match_records SET "matchedById" = 'other' WHERE id = 'marker'`,
      `UPDATE pg_temp.match_records SET metadata = '{"replacementProposalId":"missing"}' WHERE id = 'marker'`,
      `UPDATE pg_temp.match_records SET "paymentTransactionId" = 'unrelated' WHERE id = 'replacement'`,
      `UPDATE pg_temp.match_records SET "organizationId" = 'tenant-b' WHERE id = 'replacement'`,
      `UPDATE pg_temp.match_records SET "matchedById" = 'other' WHERE id = 'replacement'`,
      `UPDATE pg_temp.match_records SET metadata = '{}' WHERE id = 'replacement'`,
    ]) {
      await client.query("SAVEPOINT malformed_lineage")
      await client.query(mutation)
      const count = await pending()
      expect(count).toBe(mutation.includes('"organizationId"') && mutation.includes("'replacement'") ? 1 : 2)
      await client.query("ROLLBACK TO SAVEPOINT malformed_lineage")
    }
  })

  it("keeps partial, unsigned, cross-tenant, corrected and processing obligations visible", async () => {
    await client.query(`
      INSERT INTO pg_temp.reconciliation_runs VALUES
        ('signed','tenant-a','provider','SIGNED',NULL,now(),'checker','certificate'),
        ('unsigned','tenant-a','provider','READY_FOR_SIGNOFF',NULL,NULL,NULL,NULL),
        ('draft','tenant-a','provider','DRAFT',NULL,NULL,NULL,NULL),
        ('foreign','tenant-b','provider','SIGNED',NULL,now(),'checker','certificate');
      INSERT INTO pg_temp.suspense_items VALUES ('tenant-a','OPEN'),('tenant-a','RESOLVED'),('tenant-b','OPEN');
      INSERT INTO pg_temp.payment_transactions (id,"organizationId","providerAccountId",state,"occurredAt",amount,"currencyCode") VALUES
        ('paid','tenant-a','provider','SETTLED',now(),100,'XAF'),
        ('partial','tenant-a','provider','CONFIRMED',now(),100,'XAF'),
        ('unsigned','tenant-a','provider','SETTLED',now(),100,'XAF'),
        ('cross','tenant-a','provider','SETTLED',now(),100,'XAF'),
        ('corrected','tenant-a','provider','SETTLED',now(),100,'XAF'),
        ('unscoped','tenant-a',NULL,'CONFIRMED',NULL,100,'XAF'),
        ('pending','tenant-a','provider','UNKNOWN',now(),100,'XAF'),
        ('foreign','tenant-b','provider','UNKNOWN',now(),100,'XAF');
      INSERT INTO pg_temp.provider_events VALUES
        ('covered','tenant-a','provider','VERIFIED',true,100,'XAF'),
        ('unsigned','tenant-a','provider','PROCESSED',true,100,'XAF'),
        ('fake-signature','tenant-a','provider','VERIFIED',false,100,'XAF'),
        ('failed','tenant-a','provider','FAILED',false,100,'XAF'),
        ('tampered-resolved','tenant-a','provider','TAMPERED',false,100,'XAF'),
        ('tampered-open','tenant-a','provider','TAMPERED',false,100,'XAF');
      INSERT INTO pg_temp.statement_files VALUES
        ('covered','tenant-a','IMPORTED'),('partial','tenant-a','IMPORTED'),
        ('disputed','tenant-a','IMPORTED'),('empty','tenant-a','IMPORTED'),('processing','tenant-a','PROCESSING');
      INSERT INTO pg_temp.statement_lines VALUES
        ('covered','tenant-a','provider','covered','UNMATCHED',100,'XAF'),
        ('partial','tenant-a','provider','partial','MATCHED',100,'XAF'),
        ('disputed','tenant-a','provider','disputed','DISPUTED',100,'XAF');
      INSERT INTO pg_temp.match_records VALUES
        ('m-paid','tenant-a','provider','paid',NULL,NULL,'signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('m-partial','tenant-a','provider','partial',NULL,NULL,'signed',NULL,'AUTO_MATCHED',50,'XAF'),
        ('m-unsigned','tenant-a','provider','unsigned',NULL,NULL,'unsigned',NULL,'APPROVED',100,'XAF'),
        ('m-cross','tenant-b','provider','cross',NULL,NULL,'foreign',NULL,'APPROVED',100,'XAF'),
        ('m-old','tenant-a','provider','corrected',NULL,NULL,'signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('m-void','tenant-a','provider','corrected',NULL,NULL,'signed','m-old','VOIDED',100,'XAF'),
        ('e-paid','tenant-a','provider',NULL,'covered',NULL,'signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('e-unsigned','tenant-a','provider',NULL,'unsigned',NULL,'unsigned',NULL,'AUTO_MATCHED',100,'XAF'),
        ('e-fake','tenant-a','provider',NULL,'fake-signature',NULL,'signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('s-paid','tenant-a','provider',NULL,NULL,'covered','signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('s-partial','tenant-a','provider',NULL,NULL,'partial','signed',NULL,'AUTO_MATCHED',50,'XAF'),
        ('s-disputed','tenant-a','provider',NULL,NULL,'disputed','signed',NULL,'AUTO_MATCHED',100,'XAF'),
        ('proposed','tenant-a','provider',NULL,NULL,NULL,NULL,NULL,'PROPOSED',10,'XAF'),
        ('approval','tenant-a','provider',NULL,NULL,NULL,NULL,'proposed','APPROVED',10,'XAF'),
        ('candidate','tenant-a','provider',NULL,NULL,NULL,NULL,NULL,'CANDIDATE',10,'XAF'),
        ('cross-proposal','tenant-a','provider',NULL,NULL,NULL,NULL,NULL,'PROPOSED',10,'XAF'),
        ('cross-approval','tenant-b','provider',NULL,NULL,NULL,NULL,'cross-proposal','APPROVED',10,'XAF');
      INSERT INTO pg_temp.payment_exceptions VALUES
        ('tenant-a','tampered-resolved','RESOLVED'),('tenant-a','tampered-open','OPEN'),('tenant-b',NULL,'OPEN');
      INSERT INTO pg_temp.payment_reconciliation_inbox_items VALUES
        ('tenant-a','RECEIVED'),('tenant-a','PROCESSING'),('tenant-a','FAILED'),('tenant-a','DEAD_LETTER'),
        ('tenant-a','PROCESSED'),('tenant-a','IGNORED'),('tenant-b','FAILED');
    `)
    const result = await getModuleReconciliationObligations(tx, "tenant-a")
    expect(Object.fromEntries(result.map(item => [item.code, item.count]))).toEqual({
      reconciliation_drafts: 1, reconciliation_open: 1, suspense_open: 1,
      reconciliation_payments_pending: 1, reconciliation_payments_unreconciled: 5, reconciliation_legacy_payments_unlinked: 0,
      reconciliation_provider_events_pending: 2, reconciliation_provider_events_unreconciled: 2,
      reconciliation_statement_lines_open: 2, reconciliation_statement_imports_open: 4,
      reconciliation_matches_pending: 2, reconciliation_exceptions_open: 1, reconciliation_inbox_pending: 4,
    })
    expect(result.filter(item => item.kind === "draft")).toEqual([{ code: "reconciliation_drafts", count: 1, kind: "draft" }])
    expect((await getModuleReconciliationObligations(tx, "tenant-a' OR true --")).every(item => item.count === 0)).toBe(true)
  })

  it("counts unlinked legacy electronic payments without accepting another tenant's link", async () => {
    await client.query(`
      INSERT INTO pg_temp.payments (id,"organizationId",method,status,"deletedAt") VALUES
        ('unlinked','tenant-a','CARD','PAID',NULL),
        ('cross-link','tenant-a','MOBILE_MONEY','PARTIAL',NULL),
        ('linked','tenant-a','BANK_TRANSFER','PAID',NULL),
        ('cancelled-link','tenant-a','CARD','PAID',NULL),
        ('amount-mismatch','tenant-a','CARD','PAID',NULL),
        ('cash','tenant-a','CASH','PAID',NULL),
        ('refunded','tenant-a','CARD','REFUNDED',NULL),
        ('deleted','tenant-a','CARD','PAID',now()),
        ('other','tenant-b','CARD','PAID',NULL);
      INSERT INTO pg_temp.payment_transactions (id,"organizationId",state,"legacyPaymentId",amount) VALUES
        ('wrong-link','tenant-b','CONFIRMED','cross-link',100),
        ('right-link','tenant-a','CONFIRMED','linked',100),
        ('cancelled','tenant-a','CANCELLED','cancelled-link',100),
        ('mismatch','tenant-a','SETTLED','amount-mismatch',50);
    `)
    const result = await getModuleReconciliationObligations(tx, "tenant-a")
    expect(result.find(item => item.code === "reconciliation_legacy_payments_unlinked"))
      .toEqual({ code: "reconciliation_legacy_payments_unlinked", kind: "obligation", count: 4 })
  })

  it("returns a complete zero observation set only after successful empty-scope queries", async () => {
    const result = await getModuleReconciliationObligations(tx, "empty-tenant")
    expect(result).toHaveLength(13)
    expect(result.every(item => item.count === 0)).toBe(true)
  })
})
