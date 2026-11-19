import { randomUUID } from "node:crypto";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { FollowUpQuery, FollowUpCommand } from "../contracts";
jest.mock("server-only", () => ({}));
if (process.env.RUN_COMMAND_CENTER_INTEGRATION_POSTGRES !== "1")
  throw Error("Use the disposable Command Center runner");
const database = process.env.COMMAND_CENTER_DISPOSABLE_DATABASE!;
if (!/^stoquify_local_command_center_[a-f0-9]{10}$/.test(database ?? ""))
  throw Error("Unexpected target");
require("../../../scripts/disposable-fixture-guard").assertDisposableDatabaseTarget(
  process.env.DATABASE_URL,
  [database],
);
const { db } = require("@/prisma/db") as { db: PrismaClient };
const {
  loadFollowUps,
  changeFollowUp,
  reviewFollowUps,
  followUpCandidates,
  saveFollowUpPreference,
  acknowledgeFollowUpNotice,
} =
  require("../persistence.service") as typeof import("../persistence.service");
const query: FollowUpQuery = {
  center: "manager",
  periodStart: "2026-10-24T00:00:00.000Z",
  periodEnd: "2026-10-24T23:59:59.999Z",
};
const permissions = [
  "dashboard.read",
  "inventory.items.read",
  "controls.manage",
];
async function fixture(extra: string[] = []) {
  const suffix = randomUUID(),
    org = await db.organization.create({
      data: {
        name: "Synthetic follow-up",
        slug: "cc6-" + suffix,
        currency: "XAF",
      },
    });
  const role = await db.role.create({
    data: {
      organizationId: org.id,
      code: "admin",
      nameEn: "Fixture",
      permissions: [...permissions, ...extra],
    },
  });
  const create = (tag: string) =>
    db.user.create({
      data: {
        organizationId: org.id,
        email: `${tag}-${suffix}@example.invalid`,
        firstName: tag,
        isVerified: true,
        roles: { connect: { id: role.id } },
      },
    });
  const actor = await create("Actor"),
    owner = await create("Owner"),
    other = await create("Other");
  const session = await db.session.create({
    data: {
      userId: actor.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const location = await db.location.create({
    data: {
      organizationId: org.id,
      name: "Synthetic branch",
      code: "A",
      managerId: owner.id,
    },
  });
  const item = await db.item.create({
    data: {
      organizationId: org.id,
      sku: suffix,
      slug: suffix,
      nameEn: "Synthetic stock",
      imageUrls: [],
    },
  });
  const level = await db.inventoryLevel.create({
    data: { itemId: item.id, locationId: location.id, quantityAvailable: 0 },
  });
  const identity = {
    organizationId: org.id,
    actorId: actor.id,
    session: { id: session.id, token: session.token },
  };
  const load = (q = query) => loadFollowUps(identity, q);
  const command = async (
    ownerId: string | null = owner.id,
  ): Promise<FollowUpCommand> => {
    const data = await load();
    const work = data.items.find((i) => i.source === "stockout")!;
    return {
      ...query,
      requestId: randomUUID(),
      itemId: work.id,
      expectedRevision: work.revision,
      ownerId,
      state: "ASSIGNED",
      dueAt: "2026-11-01T00:00:00.000Z",
    };
  };
  const events = async (type = "COORDINATED") =>
    Number(
      (
        await db.$queryRaw<
          { n: bigint }[]
        >`SELECT count(*)::bigint AS n FROM "command_center_events" WHERE "organizationId"=${org.id} AND "type"=${type}`
      )[0].n,
    );
  return {
    org,
    role,
    actor,
    owner,
    other,
    session,
    location,
    item,
    level,
    identity,
    load,
    command,
    events,
  };
}
beforeAll(async () => {
  const rows = await db.$queryRaw<
    { name: string; directory: string; address: string }[]
  >`SELECT current_database() AS name,current_setting('data_directory') AS directory,host(inet_server_addr()) AS address`;
  expect(rows[0].name).toBe(database);
  expect(rows[0].address).toBe("127.0.0.1");
  expect(path.resolve(rows[0].directory).toLowerCase()).toBe(
    path.resolve(process.env.COMMAND_CENTER_DISPOSABLE_CLUSTER!).toLowerCase(),
  );
});
afterAll(async () => db.$disconnect());

it("shares one persistent occurrence and owner across all three centers and a new session", async () => {
  const f = await fixture(),
    input = await f.command();
  await changeFollowUp(f.identity, input);
  const fresh = await db.session.create({
    data: {
      userId: f.actor.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  for (const center of ["digest", "manager", "owner"] as const) {
    const data = await loadFollowUps(
      { ...f.identity, session: { id: fresh.id, token: fresh.token } },
      { ...query, center },
    );
    expect(data.items[0]).toMatchObject({
      id: input.itemId,
      ownerId: f.owner.id,
      dueAt: input.dueAt,
      coordination: "ASSIGNED",
    });
  }
  expect(await f.events("OBSERVED")).toBe(1);
});
it("keeps current-state identity across daily and weekly display windows", async () => {
  const f = await fixture();
  const a = await f.load();
  const b = await f.load({
    ...query,
    center: "digest",
    periodStart: "2026-10-18T00:00:00.000Z",
  });
  expect(a.items[0].id).toBe(b.items[0].id);
});
it("does not double-count negative inventory", async () => {
  const f = await fixture();
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: { quantityAvailable: -2 },
  });
  expect((await f.load()).items[0].condition).toBe("ACTIVE");
});
it("starts an unassigned occurrence only after source-confirmed clearance then recurrence", async () => {
  const f = await fixture(),
    input = await f.command();
  await changeFollowUp(f.identity, input);
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: { quantityAvailable: 4, version: { increment: 1 } },
  });
  expect((await f.load()).items[0].condition).toBe("CLEAR");
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: { quantityAvailable: 0, version: { increment: 1 } },
  });
  const next = (await f.load()).items[0];
  expect(next.id).not.toBe(input.itemId);
  expect(next).toMatchObject({
    episode: 2,
    ownerId: null,
    coordination: "OPEN",
  });
});
it("does not infer clearance from deletion or exclusion", async () => {
  const f = await fixture();
  await f.load();
  await db.item.update({
    where: { id: f.item.id },
    data: { deletedAt: new Date() },
  });
  expect((await f.load()).items[0].condition).toBe("UNKNOWN");
});
it("persists an evidence-bound review across centers and invalidates A-B-A", async () => {
  const f = await fixture(),
    a = await f.load();
  const input = {
    ...query,
    requestId: randomUUID(),
    expectedRevision: a.revision,
    evidenceKey: a.evidenceKey,
  };
  await reviewFollowUps(f.identity, input);
  await reviewFollowUps(f.identity, input);
  expect((await f.load({ ...query, center: "owner" })).review.current).toBe(
    true,
  );
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: { quantityAvailable: -1, version: 1 },
  });
  expect((await f.load()).review.current).toBe(false);
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: {
      quantityAvailable: 0,
      version: f.level.version,
      updatedAt: f.level.updatedAt,
    },
  });
  const reverted = await f.load();
  expect(reverted.review.current).toBe(false);
  expect(reverted.revision).toBeGreaterThan(a.revision);
});
it("invalidates coordination review on changed evidence without losing the assigned owner", async () => {
  const f = await fixture(),
    input = await f.command();
  await changeFollowUp(f.identity, { ...input, state: "REVIEWED" });
  await db.inventoryLevel.update({
    where: { id: f.level.id },
    data: { quantityAvailable: -1, version: { increment: 1 } },
  });
  expect((await f.load()).items[0]).toMatchObject({
    coordination: "ASSIGNED",
    ownerId: f.owner.id,
    episode: 1,
  });
});
it("replays exactly once and rejects changed intent", async () => {
  const f = await fixture(),
    input = await f.command();
  await changeFollowUp(f.identity, input);
  await changeFollowUp(f.identity, input);
  await expect(
    changeFollowUp(f.identity, { ...input, ownerId: f.other.id }),
  ).rejects.toThrow(/changed/);
  expect(await f.events()).toBe(1);
});
it("allows only one competing command at the same revision", async () => {
  const f = await fixture(),
    input = await f.command();
  const result = await Promise.allSettled([
    changeFollowUp(f.identity, input),
    changeFollowUp(f.identity, {
      ...input,
      ownerId: f.other.id,
      requestId: randomUUID(),
    }),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await f.events()).toBe(1);
});
it("converges parallel first observations without duplicate active occurrences", async () => {
  const f = await fixture();
  await Promise.allSettled([f.load(), f.load({ ...query, center: "owner" })]);
  await f.load();
  expect(await f.events("OBSERVED")).toBe(1);
});
it("rolls back the coordination change when event persistence fails", async () => {
  const f = await fixture(),
    input = await f.command();
  await db.$executeRawUnsafe(
    `CREATE FUNCTION cc6_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER cc6_fail_event BEFORE INSERT ON command_center_events FOR EACH ROW WHEN (NEW.type='COORDINATED') EXECUTE FUNCTION cc6_fail_event()`,
  );
  try {
    await expect(changeFollowUp(f.identity, input)).rejects.toThrow();
    expect((await f.load()).items[0]).toMatchObject({
      ownerId: null,
      coordination: "OPEN",
    });
    expect(await f.events()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      "DROP TRIGGER cc6_fail_event ON command_center_events",
    );
    await db.$executeRawUnsafe("DROP FUNCTION cc6_fail_event()");
  }
});
it("rejects foreign tenant work, assignees and immutable event references", async () => {
  const a = await fixture(),
    b = await fixture(),
    input = await a.command(),
    other = await b.command();
  await expect(
    changeFollowUp(a.identity, { ...input, itemId: other.itemId }),
  ).rejects.toThrow();
  await expect(
    changeFollowUp(a.identity, { ...input, ownerId: b.owner.id }),
  ).rejects.toThrow();
  await expect(
    db.$executeRaw(
      Prisma.sql`INSERT INTO "command_center_events" ("id","organizationId","occurrenceId","actorId","type","resultRevision","changes") VALUES (${randomUUID()},${a.org.id},${other.itemId},${a.actor.id},'FORGED',1,'{}'::jsonb)`,
    ),
  ).rejects.toThrow();
});
it.each(["account", "session", "permission", "module"])(
  "reauthorizes %s revocation on read and replay",
  async (kind) => {
    const f = await fixture(),
      input = await f.command();
    await changeFollowUp(f.identity, input);
    if (kind === "account")
      await db.user.update({
        where: { id: f.actor.id },
        data: { isActive: false },
      });
    if (kind === "session")
      await db.session.delete({ where: { id: f.session.id } });
    if (kind === "permission")
      await db.role.update({
        where: { id: f.role.id },
        data: { permissions: ["dashboard.read", "controls.manage"] },
      });
    if (kind === "module")
      await db.tenantModuleConfiguration.create({
        data: { organizationId: f.org.id, manifestHash: "fixture-empty" },
      });
    await expect(changeFollowUp(f.identity, input)).rejects.toThrow();
    if (kind === "permission") expect((await f.load()).items).toEqual([]);
    else await expect(f.load()).rejects.toThrow();
    expect(await f.events()).toBe(1);
  },
);
it("allows source-permitted Digest read while keeping tenant assignment and Manager scope restricted", async () => {
  const f = await fixture();
  await db.role.update({
    where: { id: f.role.id },
    data: {
      code: "finance",
      permissions: ["finance.read", "inventory.items.read"],
    },
  });
  const data = await f.load({ ...query, center: "digest" });
  expect(data.items[0].canAssign).toBe(false);
  await expect(f.load()).rejects.toThrow();
});
it("binds location responsibility and rechecks assignee manager replacement on replay", async () => {
  const f = await fixture();
  const role = await db.role.create({
    data: {
      organizationId: f.org.id,
      code: "branch_manager",
      nameEn: "Scoped",
      permissions,
    },
  });
  await db.user.update({
    where: { id: f.owner.id },
    data: { roles: { set: [{ id: role.id }] } },
  });
  const q = { ...query, locationId: f.location.id };
  const data = await f.load(q),
    input = {
      ...q,
      requestId: randomUUID(),
      itemId: data.items[0].id,
      expectedRevision: data.items[0].revision,
      ownerId: f.owner.id,
      state: "ASSIGNED" as const,
      dueAt: null,
    };
  await changeFollowUp(f.identity, input);
  await db.location.update({
    where: { id: f.location.id },
    data: { managerId: f.other.id },
  });
  await expect(changeFollowUp(f.identity, input)).rejects.toThrow();
});
it("retains immutable review receipts and events", async () => {
  const f = await fixture(),
    data = await f.load();
  await reviewFollowUps(f.identity, {
    ...query,
    requestId: randomUUID(),
    expectedRevision: data.revision,
    evidenceKey: data.evidenceKey,
  });
  await expect(
    db.$executeRaw`UPDATE "command_center_review_receipts" SET "revision"=999 WHERE "organizationId"=${f.org.id}`,
  ).rejects.toThrow(/immutable/);
  await expect(
    db.$executeRaw`DELETE FROM "command_center_events" WHERE "organizationId"=${f.org.id}`,
  ).rejects.toThrow(/immutable/);
});
it("lists only eligible current assignees", async () => {
  const f = await fixture(),
    input = await f.command();
  await db.user.update({
    where: { id: f.other.id },
    data: { isActive: false },
  });
  const result = await followUpCandidates(f.identity, {
    ...query,
    itemId: input.itemId,
    search: "",
  });
  expect(result.candidates.map((c) => c.id)).toContain(f.owner.id);
  expect(result.candidates.map((c) => c.id)).not.toContain(f.other.id);
});
it("does not treat cancelled receiving as successful source completion", async () => {
  const f = await fixture(["purchases.orders.read"]),
    supplier = await db.supplier.create({
      data: { organizationId: f.org.id, name: "Synthetic supplier" },
    });
  const po = await db.purchaseOrder.create({
    data: {
      organizationId: f.org.id,
      locationId: f.location.id,
      supplierId: supplier.id,
      orderNumber: randomUUID(),
      status: "APPROVED",
      expectedDeliveryDate: new Date("2026-01-01"),
    },
  });
  expect(
    (await f.load()).items.find((i) => i.source === "receiving")?.condition,
  ).toBe("ACTIVE");
  await db.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "CANCELLED" },
  });
  expect(
    (await f.load()).items.find((i) => i.source === "receiving")?.condition,
  ).toBe("UNKNOWN");
});
it("observes explicit receipt completion without changing financial sources", async () => {
  const f = await fixture(["purchases.orders.read"]),
    supplier = await db.supplier.create({
      data: { organizationId: f.org.id, name: "Synthetic supplier" },
    });
  const po = await db.purchaseOrder.create({
    data: {
      organizationId: f.org.id,
      locationId: f.location.id,
      supplierId: supplier.id,
      orderNumber: randomUUID(),
      status: "APPROVED",
      expectedDeliveryDate: new Date("2026-01-01"),
    },
  });
  await f.load();
  await db.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "RECEIVED" },
  });
  expect(
    (await f.load()).items.find((i) => i.source === "receiving")?.condition,
  ).toBe("CLEAR");
  expect(
    (
      await db.inventoryLevel.findUniqueOrThrow({ where: { id: f.level.id } })
    ).quantityAvailable.toString(),
  ).toBe("0");
});

it("reads all seven canonical source adapters from real records in the same transaction", async () => {
  const f = await fixture([
    "inventory.levels.read",
    "accounting.close.read",
    "payroll.command.read",
    "payments.reconciliation.read",
    "purchases.orders.read",
  ]);
  await db.suspenseItem.create({
    data: { organizationId: f.org.id, type: "UNKNOWN_CREDIT", amount: 10 },
  });
  await db.stockAdjustment.create({
    data: {
      organizationId: f.org.id,
      locationId: f.location.id,
      adjustmentNumber: randomUUID(),
      type: "DAMAGED",
      reason: "Synthetic loss",
      status: "COMPLETED",
      adjustmentDate: new Date(query.periodStart),
      lines: {
        create: {
          itemId: f.item.id,
          systemQuantity: 5,
          actualQuantity: 4,
          adjustedQuantity: -1,
          unitCost: 10,
          totalCost: 10,
        },
      },
    },
  });
  const year = await db.fiscalYear.create({
    data: {
      organizationId: f.org.id,
      name: "Synthetic",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });
  const period = await db.accountingPeriod.create({
    data: {
      organizationId: f.org.id,
      fiscalYearId: year.id,
      periodNumber: 10,
      name: "Synthetic October",
      startDate: new Date(query.periodStart),
      endDate: new Date(query.periodEnd),
    },
  });
  await db.closeRun.create({
    data: { organizationId: f.org.id, periodId: period.id, status: "BLOCKED" },
  });
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const payrollPeriod = await db.payrollPeriod.create({
    data: {
      organizationId: f.org.id,
      name: "Synthetic payroll",
      periodStart: today,
      periodEnd: new Date(today.getTime() + 86400000),
      payDate: today,
      countryCode: "CM",
    },
  });
  const employee = await db.payrollEmployee.create({
    data: {
      organizationId: f.org.id,
      employeeNumber: randomUUID(),
      displayName: "Synthetic employee",
      hireDate: new Date("2026-01-01"),
    },
  });
  const run = await db.payrollRun.create({
    data: {
      organizationId: f.org.id,
      payrollPeriodId: payrollPeriod.id,
      runNumber: randomUUID(),
      countryCode: "CM",
      countryPackVersion: "fixture",
      countryPackSchemaVersion: "fixture",
      countryPackResolutionHash: "a".repeat(64),
      countryPackCapabilityStatus: "SUPPORTED",
      ruleSetHash: "b".repeat(64),
      calculationHash: "c".repeat(64),
      attendanceSnapshotHash: "d".repeat(64),
    },
  });
  await db.payrollEmployeeBalanceCase.create({
    data: {
      organizationId: f.org.id,
      employeeId: employee.id,
      payrollRunId: run.id,
      caseNumber: randomUUID(),
      caseType: "RECEIVABLE",
      amount: 100,
      outstandingAmount: 100,
      sourceNetPayableAmount: -100,
      reason: "Synthetic fixture",
      openedById: f.actor.id,
      documentHash: "e".repeat(64),
      evidenceHash: "f".repeat(64),
    },
  });
  const supplier = await db.supplier.create({
    data: { organizationId: f.org.id, name: "Synthetic supplier" },
  });
  await db.purchaseOrder.create({
    data: {
      organizationId: f.org.id,
      locationId: f.location.id,
      supplierId: supplier.id,
      orderNumber: randomUUID(),
      status: "APPROVED",
      expectedDeliveryDate: new Date("2026-01-01"),
    },
  });
  const data = await f.load();
  expect(data.items.map((i) => i.source).sort()).toEqual(
    [
      "suspense",
      "stockout",
      "receiving",
      "loss",
      "close",
      "payroll_forecast",
      "employee_balance",
    ].sort(),
  );
  expect(data.items.every((i) => i.condition === "ACTIVE")).toBe(true);
  const weekly = await f.load({
    ...query,
    periodStart: "2026-10-18T00:00:00.000Z",
  });
  for (const key of ["close", "payroll_forecast"])
    expect(weekly.items.find((i) => i.source === key)?.id).toBe(
      data.items.find((i) => i.source === key)?.id,
    );
});
async function ownerIdentity(f: Awaited<ReturnType<typeof fixture>>) {
  const session = await db.session.create({
    data: {
      userId: f.owner.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  return {
    ...f.identity,
    actorId: f.owner.id,
    session: { id: session.id, token: session.token },
  };
}
it("publishes one current-recipient in-app notice and safely retries read acknowledgment", async () => {
  const f = await fixture(),
    input = await f.command();
  await changeFollowUp(f.identity, input);
  await changeFollowUp(f.identity, input);
  const owner = await ownerIdentity(f),
    first = await loadFollowUps(owner, query),
    again = await loadFollowUps(owner, { ...query, center: "digest" });
  expect(first.notices).toHaveLength(1);
  expect(again.notices).toEqual(first.notices);
  expect((await f.load()).notices).toEqual([]);
  const ack = { ...query, noticeId: first.notices[0].id };
  await acknowledgeFollowUpNotice(owner, ack);
  await acknowledgeFollowUpNotice(owner, ack);
  expect((await loadFollowUps(owner, query)).notices).toEqual([]);
});
it("defers pending notices during quiet hours and resumes the same delivery identity", async () => {
  const f = await fixture(),
    owner = await ownerIdentity(f),
    hour = new Date().getUTCHours();
  await saveFollowUpPreference(owner, {
    ...query,
    enabled: true,
    quietStart: hour,
    quietEnd: (hour + 1) % 24,
  });
  await changeFollowUp(f.identity, await f.command());
  expect((await loadFollowUps(owner, query)).notices).toEqual([]);
  const resumed = await saveFollowUpPreference(owner, {
    ...query,
    enabled: true,
    quietStart: null,
    quietEnd: null,
  });
  expect(resumed.notices).toHaveLength(1);
  expect((await loadFollowUps(owner, query)).notices[0].id).toBe(
    resumed.notices[0].id,
  );
});
it("rechecks recipient access before notice publication and private reads", async () => {
  const f = await fixture();
  await changeFollowUp(f.identity, await f.command());
  const owner = await ownerIdentity(f);
  await db.user.update({
    where: { id: f.owner.id },
    data: { isActive: false },
  });
  await expect(loadFollowUps(owner, query)).rejects.toThrow();
  const rows = await db.$queryRaw<
    { state: string }[]
  >`SELECT "state" FROM "command_center_notices" WHERE "organizationId"=${f.org.id}`;
  expect(rows).toEqual([{ state: "PENDING" }]);
});
it("rolls back assignment and history if notification enqueue fails", async () => {
  const f = await fixture(),
    input = await f.command();
  await db.$executeRawUnsafe(
    `CREATE FUNCTION cc6_fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture notice failure'; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER cc6_fail_notice BEFORE INSERT ON command_center_notices FOR EACH ROW EXECUTE FUNCTION cc6_fail_notice()`,
  );
  try {
    await expect(changeFollowUp(f.identity, input)).rejects.toThrow();
    expect((await f.load()).items[0].ownerId).toBe(null);
    expect(await f.events()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      "DROP TRIGGER cc6_fail_notice ON command_center_notices",
    );
    await db.$executeRawUnsafe("DROP FUNCTION cc6_fail_notice()");
  }
});

async function waitForLock(fragment: string) {
  const until = Date.now() + 7000;
  while (Date.now() < until) {
    const rows = await db.$queryRaw<
      { n: bigint }[]
    >`SELECT count(*)::bigint AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE ${"%" + fragment + "%"}`;
    if (Number(rows[0].n) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw Error("Expected PostgreSQL lock wait was not observed");
}
it("refuses assignment when concurrent assignee revocation commits first", async () => {
  const f = await fixture(),
    input = await f.command();
  let entered!: () => void, release!: () => void;
  const ready = new Promise<void>((resolve) => (entered = resolve)),
    gate = new Promise<void>((resolve) => (release = resolve));
  const revoke = db.$transaction(
    async (tx) => {
      await tx.user.update({
        where: { id: f.owner.id },
        data: { isActive: false },
      });
      entered();
      await gate;
    },
    { timeout: 15000 },
  );
  await ready;
  const assign = changeFollowUp(f.identity, input).then(
    () => "accepted",
    () => "refused",
  );
  try {
    await waitForLock('FROM "users"');
  } finally {
    release();
  }
  await revoke;
  expect(await assign).toBe("refused");
  expect(await f.events()).toBe(0);
});
it("retries a failed in-app publication without changing delivery identity", async () => {
  const f = await fixture();
  await changeFollowUp(f.identity, await f.command());
  const owner = await ownerIdentity(f);
  const before = await db.$queryRaw<
    { id: string; state: string }[]
  >`SELECT "id","state" FROM "command_center_notices" WHERE "organizationId"=${f.org.id}`;
  await db.$executeRawUnsafe(
    `CREATE FUNCTION cc6_fail_publish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture publication failure'; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER cc6_fail_publish BEFORE UPDATE ON command_center_notices FOR EACH ROW WHEN (NEW.state='PUBLISHED') EXECUTE FUNCTION cc6_fail_publish()`,
  );
  try {
    await expect(loadFollowUps(owner, query)).rejects.toThrow();
    expect(
      await db.$queryRaw`SELECT "id","state" FROM "command_center_notices" WHERE "organizationId"=${f.org.id}`,
    ).toEqual(before);
  } finally {
    await db.$executeRawUnsafe(
      "DROP TRIGGER cc6_fail_publish ON command_center_notices",
    );
    await db.$executeRawUnsafe("DROP FUNCTION cc6_fail_publish()");
  }
  const retried = await loadFollowUps(owner, query);
  expect(retried.notices).toEqual([{ id: before[0].id, source: "stockout" }]);
  expect((await loadFollowUps(owner, query)).notices).toEqual(retried.notices);
});
it("retains disabled notification preference across a new session", async () => {
  const f = await fixture(),
    owner = await ownerIdentity(f);
  await saveFollowUpPreference(owner, {
    ...query,
    enabled: false,
    quietStart: null,
    quietEnd: null,
  });
  await changeFollowUp(f.identity, await f.command());
  const fresh = await ownerIdentity(f),
    data = await loadFollowUps(fresh, query);
  expect(data.preference.enabled).toBe(false);
  expect(data.notices).toEqual([]);
});

it("shares a location occurrence across Manager, Digest and Owner without sharing the tenant occurrence", async () => {
  const f = await fixture(),
    q = { ...query, locationId: f.location.id },
    initial = await f.load(q),
    item = initial.items[0];
  await changeFollowUp(f.identity, {
    ...q,
    itemId: item.id,
    expectedRevision: item.revision,
    requestId: randomUUID(),
    ownerId: f.owner.id,
    state: "ASSIGNED",
    dueAt: null,
  });
  const tenant = await f.load();
  expect(tenant.items[0].id).not.toBe(item.id);
  expect(tenant.availableLocations).toContainEqual({
    id: f.location.id,
    name: f.location.name,
    assignedToActor: false,
  });
  for (const center of ["digest", "owner"] as const)
    expect((await f.load({ ...q, center })).items[0]).toMatchObject({
      id: item.id,
      ownerId: f.owner.id,
    });
  const role = await db.role.create({
    data: {
      organizationId: f.org.id,
      code: "branch_manager",
      nameEn: "Scoped",
      permissions,
    },
  });
  await db.user.update({
    where: { id: f.owner.id },
    data: { roles: { set: [{ id: role.id }] } },
  });
  const owner = await ownerIdentity(f);
  expect(
    (await loadFollowUps(owner, { ...q, center: "digest" })).notices,
  ).toHaveLength(1);
  await db.location.update({
    where: { id: f.location.id },
    data: { managerId: f.other.id },
  });
  expect(
    (await loadFollowUps(owner, { ...query, center: "digest" }))
      .availableLocations,
  ).toEqual([]);
  await expect(
    loadFollowUps(owner, { ...q, center: "digest" }),
  ).rejects.toThrow();
});
it("invalidates loss review when equal-total evidence records are replaced", async () => {
  const f = await fixture(["inventory.levels.read"]);
  const adjustment = await db.stockAdjustment.create({
    data: {
      organizationId: f.org.id,
      locationId: f.location.id,
      adjustmentNumber: randomUUID(),
      type: "DAMAGED",
      reason: "Synthetic loss",
      status: "COMPLETED",
      adjustmentDate: new Date(query.periodStart),
    },
  });
  const lineData = {
    adjustmentId: adjustment.id,
    itemId: f.item.id,
    systemQuantity: 5,
    actualQuantity: 4,
    adjustedQuantity: -1,
    unitCost: 10,
    totalCost: 10,
  };
  const line = await db.stockAdjustmentLine.create({ data: lineData }),
    before = await f.load();
  await reviewFollowUps(f.identity, {
    ...query,
    requestId: randomUUID(),
    expectedRevision: before.revision,
    evidenceKey: before.evidenceKey,
  });
  await db.stockAdjustmentLine.delete({ where: { id: line.id } });
  await db.stockAdjustmentLine.create({ data: lineData });
  const after = await f.load();
  expect(after.review.current).toBe(false);
  expect(after.items.find((i) => i.source === "loss")?.sourceRevision).not.toBe(
    before.items.find((i) => i.source === "loss")?.sourceRevision,
  );
});
it("preserves a declaration-only forecast when immutable evidence deletion is rejected", async () => {
  const f = await fixture([
      "payroll.command.read",
      "payments.reconciliation.read",
    ]),
    today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const period = await db.payrollPeriod.create({
    data: {
      organizationId: f.org.id,
      name: "Historical fixture",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      payDate: new Date("2025-01-31"),
      countryCode: "CM",
    },
  });
  const run = await db.payrollRun.create({
    data: {
      organizationId: f.org.id,
      payrollPeriodId: period.id,
      runNumber: randomUUID(),
      status: "POSTED",
      countryCode: "CM",
      countryPackVersion: "fixture",
      countryPackSchemaVersion: "fixture",
      countryPackResolutionHash: "a".repeat(64),
      countryPackCapabilityStatus: "SUPPORTED",
      ruleSetHash: "b".repeat(64),
      calculationHash: "c".repeat(64),
      attendanceSnapshotHash: "d".repeat(64),
    },
  });
  const declaration = await db.payrollDeclaration.create({
    data: {
      organizationId: f.org.id,
      payrollRunId: run.id,
      authority: "fixture",
      declarationType: "fixture",
      status: "REJECTED",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      dueDate: today,
      countryCode: "CM",
      countryPackVersion: "fixture",
      countryPackSchemaVersion: "fixture",
      countryPackResolutionHash: "a".repeat(64),
    },
  });
  expect(
    (await f.load()).items.find((i) => i.source === "payroll_forecast")
      ?.condition,
  ).toBe("ACTIVE");
  await expect(db.payrollDeclaration.delete({ where: { id: declaration.id } })).rejects.toThrow(/Cannot delete immutable payroll evidence/);
  expect(
    (await f.load()).items.find((i) => i.source === "payroll_forecast")
      ?.condition,
  ).toBe("ACTIVE");
});
