import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, PayrollRunStatus } from "@prisma/client";
import { assertPayrollBlockersTestUrl } from "../../../scripts/payroll-blockers-postgres-target.cjs";
import { db } from "@/prisma/db";
import { approvePayrollRun } from "@/services/payroll/payroll-control.service";
import { assertPayrollHistoryCurrent, type HistoryRun } from "@/services/payroll/payroll-history-proof";
import { historyFixture, proofHash } from "@/tests/fixtures/payroll-history-proof";

// Isolated engineering records only. No reviewed country rules or payroll calculation is asserted.
if (process.env.RUN_PAYROLL_BLOCKERS_POSTGRES !== "1") throw new Error("Use the payroll blockers PostgreSQL runner");
assertPayrollBlockersTestUrl(process.env.DATABASE_URL, process.env.PAYROLL_BLOCKERS_DATABASE);
const observer = new PrismaClient();
const originalSwitch = process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;
const uid = () => `history-${randomUUID()}`;
const json = (value: unknown) => value as Prisma.InputJsonValue;

async function insertRun(run: HistoryRun, contractId: string, extra: Record<string, unknown> = {}, createPeriod = true) {
  if (createPeriod) await db.payrollPeriod.create({ data: { id: run.payrollPeriodId, organizationId: run.organizationId,
    name: `Synthetic history ${run.id}`, countryCode: "CM", periodStart: new Date("2026-01-01"),
    periodEnd: run.payrollPeriod.payDate, payDate: run.payrollPeriod.payDate } });
  await db.payrollRun.create({ data: { id: run.id, organizationId: run.organizationId, payrollPeriodId: run.payrollPeriodId,
    runNumber: run.id, status: run.status as PayrollRunStatus, currency: run.currency, documentHash: run.documentHash,
    countryCode: "CM", countryPackVersion: "synthetic", countryPackSchemaVersion: "synthetic",
    countryPackResolutionHash: proofHash({ synthetic: true }), countryPackCapabilityStatus: "EXPERT_REVIEW_REQUIRED",
    ruleSetHash: proofHash({ synthetic: "rules" }), calculationHash: proofHash({ synthetic: "calculation" }),
    attendanceSnapshotHash: proofHash({ synthetic: "attendance" }), metadata: json(run.metadata), ...extra } });
  for (const line of run.lines) await db.payrollRunLine.create({ data: {
    id: line.id, organizationId: line.organizationId, payrollRunId: run.id, employeeId: line.employeeId, contractId,
    currency: line.currency, documentHash: line.documentHash, calculationSnapshot: json(line.calculationSnapshot),
    ruleProvenance: { classification: "SYNTHETIC_INTEGRITY_TEST_ONLY" },
    grossAmount: line.grossAmount, taxableBaseAmount: line.taxableBaseAmount, socialBaseAmount: line.socialBaseAmount,
    employeeDeductionAmount: line.employeeDeductionAmount, employerChargeAmount: line.employerChargeAmount, netPayableAmount: line.netPayableAmount,
  } });
}
async function fixture() {
  const organizationId = uid(), prefix = uid();
  await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Synthetic history integrity test" } });
  const { current, prior } = historyFixture(organizationId, prefix);
  const actors = { preparer: uid(), reviewer: uid(), approver: uid() };
  for (const id of Object.values(actors)) await db.user.create({ data: { id, organizationId, email: `${id}@example.test` } });
  await db.payrollEmployee.create({ data: { id: current.lines[0].employeeId, organizationId, employeeNumber: prefix,
    displayName: "Synthetic integrity employee", hireDate: new Date("2026-01-01") } });
  const contract = await db.payrollContract.create({ data: { organizationId, employeeId: current.lines[0].employeeId,
    contractNumber: prefix, type: "CDI", effectiveFrom: new Date("2026-01-01"), baseSalary: 1000 } });
  const review = await db.businessEvent.create({ data: { organizationId, eventType: "PAYROLL_RUN_REVIEWED", eventSource: "INTERNAL",
    idempotencyKey: uid(), payloadHash: proofHash({ synthetic: "review" }), payload: { classification: "SYNTHETIC_ENGINEERING_FIXTURE" },
    occurredAt: new Date(), status: "APPLIED" } });
  await insertRun(prior, contract.id);
  await insertRun(current, contract.id, { version: 2, preparedById: actors.preparer, reviewedById: actors.reviewer,
    reviewedAt: new Date(), reviewedBusinessEventId: review.id });
  return { organizationId, current, prior, actors, contractId: contract.id };
}
const inspect = (f: Awaited<ReturnType<typeof fixture>>) => db.$transaction(tx => assertPayrollHistoryCurrent(tx, f.organizationId, f.current.id),
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
const approval = (f: Awaited<ReturnType<typeof fixture>>, key = uid()) => ({ organizationId: f.organizationId, payrollRunId: f.current.id,
  actorId: f.actors.approver, actorPermissions: ["payroll.runs.approve"], lastAuthAt: new Date(), now: new Date(), expectedVersion: 2, idempotencyKey: key });

beforeAll(async () => {
  expect((await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`)[0].database).toBe(process.env.PAYROLL_BLOCKERS_DATABASE);
  process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = "true";
});
afterAll(async () => {
  if (originalSwitch === undefined) delete process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;
  else process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = originalSwitch;
  await Promise.all([db.$disconnect(), observer.$disconnect()]);
});

test("real unchanged v2 observations approve once and preserve committed approval replay after later history changes", async () => {
  const f = await fixture();
  await expect(inspect(f)).resolves.toEqual({ legacyOnly: false, proofCount: 1 });
  const request = approval(f);
  const first = await approvePayrollRun(request);
  expect(first).toMatchObject({ idempotent: false, payrollRun: { status: "APPROVED", version: 3 } });
  await db.payrollRun.update({ where: { id: f.prior.id }, data: { deletedAt: new Date() } });
  expect(await observer.payrollRun.count({ where: { id: f.prior.id, deletedAt: null } })).toBe(0);
  await expect(inspect(f)).rejects.toMatchObject({ code: "CONFLICT", metadata: { reason: "OBSERVED_HISTORY_CHANGED" } });
  await expect(approvePayrollRun(request)).resolves.toMatchObject({ idempotent: true, businessEventId: first.businessEventId });
  expect(await observer.payrollRunTransition.count({ where: { organizationId: f.organizationId, payrollRunId: f.current.id } })).toBe(1);
  expect(await observer.businessEvent.count({ where: { organizationId: f.organizationId, eventType: "PAYROLL_RUN_APPROVED" } })).toBe(1);
});

test.each(["missing", "new", "snapshot", "hash", "tenant", "employee", "currency"])("real %s history is rejected before a new approval and leaves no transition effects", async kind => {
  const f = await fixture();
  await expect(inspect(f)).resolves.toMatchObject({ proofCount: 1 });
  const line = f.prior.lines[0];
  if (kind === "missing") {
    await db.payrollRun.update({ where: { id: f.prior.id }, data: { deletedAt: new Date() } });
    expect(await observer.payrollRun.count({ where: { id: f.prior.id, deletedAt: null } })).toBe(0);
  }
  if (kind === "new") {
    const extra = historyFixture(f.organizationId, uid()).prior;
    extra.payrollPeriodId = f.prior.payrollPeriodId;
    extra.lines[0].employeeId = line.employeeId;
    await insertRun(extra, f.contractId, {}, false);
  }
  if (kind === "snapshot") {
    const changed = { ...(line.calculationSnapshot as object), sourceRevision: "new-evidence-same-totals" };
    await db.payrollRunLine.update({ where: { id: line.id }, data: { calculationSnapshot: changed, documentHash: proofHash(changed) } });
  }
  if (kind === "hash") await db.payrollRunLine.update({ where: { id: line.id }, data: { documentHash: proofHash({ unrelated: true }) } });
  if (kind === "tenant") {
    const other = uid(); await db.organization.create({ data: { id: other, slug: other, name: "Foreign synthetic scope" } });
    await db.payrollRunLine.update({ where: { id: line.id }, data: { organizationId: other } });
  }
  if (kind === "employee") {
    const other = await db.payrollEmployee.create({ data: { organizationId: f.organizationId, employeeNumber: uid(), displayName: "Other synthetic employee", hireDate: new Date("2026-01-01") } });
    await db.payrollRunLine.update({ where: { id: line.id }, data: { employeeId: other.id } });
  }
  if (kind === "currency") await db.payrollRunLine.update({ where: { id: line.id }, data: { currency: "EUR" } });
  await expect(inspect(f)).rejects.toMatchObject({ status: 409, metadata: { domain: "payroll_history_proof" } });
  await expect(approvePayrollRun(approval(f))).rejects.toMatchObject({ status: 409, metadata: { domain: "payroll_history_proof" } });
  expect(await observer.payrollRun.findUnique({ where: { id: f.current.id } })).toMatchObject({ status: "REVIEWED", version: 2, approvedById: null });
  expect(await observer.payrollRunTransition.count({ where: { organizationId: f.organizationId } })).toBe(0);
  expect(await observer.businessEvent.count({ where: { organizationId: f.organizationId, eventType: "PAYROLL_RUN_APPROVED" } })).toBe(0);
  expect(await observer.auditLog.count({ where: { organizationId: f.organizationId, action: "PAYROLL_RUN_APPROVED" } })).toBe(0);
});

test.each(["sql-null", "json-null", "missing", "null-key", "version-one", "version-three", "string-two"])("database rejects v2 discriminator %s without rewriting frozen evidence", async kind => {
  const f = await fixture();
  const metadata: any = kind === "sql-null" ? Prisma.DbNull : kind === "json-null" ? Prisma.JsonNull : kind === "missing" ? {} :
    { ...(f.current.metadata as object), yearToDateProofVersion: kind === "null-key" ? null : kind === "version-one" ? 1 : kind === "version-three" ? 3 : "2" };
  await expect(db.payrollRun.update({ where: { id: f.current.id }, data: { metadata } })).rejects.toThrow("Payroll history proof version cannot be changed or removed");
  expect((await observer.payrollRun.findUniqueOrThrow({ where: { id: f.current.id } })).metadata).toEqual(f.current.metadata);
});

test("database allows unrelated v2 metadata updates and unchanged legacy-only metadata policy", async () => {
  const f = await fixture();
  await db.payrollRun.update({ where: { id: f.current.id }, data: { metadata: { ...(f.current.metadata as object), newReviewNote: "synthetic" } } });
  await expect(inspect(f)).resolves.toMatchObject({ proofCount: 1 });
  await db.payrollRun.update({ where: { id: f.prior.id }, data: { metadata: { legacyNote: "preserved" } } });
  expect((await observer.payrollRun.findUniqueOrThrow({ where: { id: f.prior.id } })).metadata).toEqual({ legacyNote: "preserved" });
});
