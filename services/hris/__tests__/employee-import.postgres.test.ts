import { randomUUID } from "node:crypto";
import { db } from "@/prisma/db";
import {
  previewEmployeeImport,
  commitEmployeeImport,
  getEmployeeImportReceipt,
  downloadEmployeeImportErrors,
  getEmployeeImportTemplate,
} from "../employee-import.service";
import { HRIS_IMPORT_VERSION } from "../employee-import.csv";
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"),
    url = process.env.HRIS_CORRECTNESS_DATABASE_URL;
  if (
    url !==
    "postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public"
  )
    throw Error("Owned explicit database required");
  return {
    db: new PrismaClient({
      datasources: { db: { url } },
      transactionOptions: { maxWait: 15000, timeout: 120000 },
    }),
  };
});
const ns = "hris-import-" + randomUUID(),
  org = ns + "-a",
  foreign = ns + "-b",
  users = [ns + "-hr", ns + "-read", ns + "-foreign", ns + "-other"];
const actor = (i = 0) => ({
  organizationId: i === 2 ? foreign : org,
  actorId: users[i],
  actorPermissions: i === 1 ? ["hris.people.read"] : ["hris.people.manage"],
});
const header =
    "employeeNumber,displayName,hireDate,countryCode,department,jobTitle",
  mapping = Object.fromEntries(header.split(",").map((f) => [f, f]));
const file = (count = 1, prefix = randomUUID()) => ({
  version: HRIS_IMPORT_VERSION,
  mapping,
  content:
    header +
    "\n" +
    Array.from(
      { length: count },
      (_, i) =>
        `${prefix}-${i},Synthetic import person ${i},2026-10-24,CM,Office,Analyst`,
    ).join("\n"),
});
beforeAll(async () => {
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS = org + "," + foreign;
  for (const id of [org, foreign])
    await db.organization.create({
      data: { id, name: "Synthetic import employer", slug: id, country: "CM" },
    });
  for (let i = 0; i < users.length; i++) {
    await db.user.create({
      data: {
        id: users[i],
        organizationId: actor(i).organizationId,
        email: users[i] + "@example.invalid",
        isVerified: true,
      },
    });
    await db.role.create({
      data: {
        organizationId: actor(i).organizationId,
        code: users[i],
        nameEn: users[i],
        permissions: actor(i).actorPermissions,
        users: { connect: { id: users[i] } },
      },
    });
  }
});
afterAll(async () => {
  try {
    await db.payrollEmployee.deleteMany({
      where: { organizationId: { in: [org, foreign] } },
    });
    await db.organization.deleteMany({ where: { id: { in: [org, foreign] } } });
    expect(
      await db.organization.count({ where: { id: { in: [org, foreign] } } }),
    ).toBe(0);
  } finally {
    delete process.env.HRIS_SETUP_PILOT_ORGANIZATIONS;
    await db.$disconnect();
  }
}, 120000);

test("200-person preview and atomic commit reconcile; uncertain response recovers and exact replay creates none", async () => {
  const input = file(200),
    preview = await previewEmployeeImport(actor(), input),
    key = randomUUID();
  expect(preview).toMatchObject({ total: 200, accepted: 200, rejected: 0 });
  expect(
    await db.payrollEmployee.count({ where: { organizationId: org } }),
  ).toBe(0);
  const command = {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: key,
    },
    saved = await commitEmployeeImport(actor(), command);
  expect(saved).toMatchObject({
    total: 200,
    created: 200,
    rejected: 0,
    unchanged: 0,
  });
  expect(
    await db.payrollEmployee.count({
      where: { organizationId: org, status: "DRAFT" },
    }),
  ).toBe(200);
  const recovered = await getEmployeeImportReceipt(actor(), key);
  expect(recovered).toMatchObject({
    status: "COMMITTED",
    created: 0,
    unchanged: 200,
    receiptId: saved.receiptId,
  });
  const again = await commitEmployeeImport(actor(), command);
  expect(again).toMatchObject({ created: 0, unchanged: 200 });
  expect(again.rows.map((r: any) => r.employeeId)).toEqual(
    saved.rows.map((r: any) => r.employeeId),
  );
  await expect(
    commitEmployeeImport(actor(), {
      ...command,
      content: input.content.replace("Analyst", "Different"),
    }),
  ).rejects.toThrow("RETRY_PAYLOAD_CHANGED");
  const previews = await db.businessEvent.findMany({
    where: { organizationId: org, eventType: "hris.employee.import.previewed" },
  });
  expect(JSON.stringify(previews.map((e) => e.payload))).not.toContain(
    "Synthetic import person",
  );
});
test("bad and duplicate rows cannot disappear and no partial commit occurs", async () => {
  const input = file(),
    line = input.content.split("\n")[1];
  input.content += "\n" + line + "\nBAD,=SUM(A1),not-a-date,zz,,\n";
  const preview = await previewEmployeeImport(actor(), input);
  expect(preview).toMatchObject({ total: 3, accepted: 0, rejected: 3 });
  await expect(
    commitEmployeeImport(actor(), {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow("CORRECT_REJECTED_ROWS");
  const errors = await downloadEmployeeImportErrors(actor(), preview.previewId);
  expect(errors.content).toContain("FORMULA_CELL");
  expect(errors.content).not.toContain("Synthetic import person");
  expect(errors.content).not.toContain("=SUM");
});
test("concurrent identical commits retain one set of drafts and one receipt", async () => {
  const input = file(3),
    preview = await previewEmployeeImport(actor(), input),
    command = {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: randomUUID(),
    };
  const results = await Promise.all([
    commitEmployeeImport(actor(), command),
    commitEmployeeImport(actor(), command),
  ]);
  expect(results.map((r) => r.created).sort()).toEqual([0, 3]);
  expect(results[0].receiptId).toBe(results[1].receiptId);
});
test("a second key cannot use a stale preview to duplicate already committed identities", async () => {
  const input = file(2),
    preview = await previewEmployeeImport(actor(), input);
  const results = await Promise.allSettled([
    commitEmployeeImport(actor(), {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: randomUUID(),
    }),
    commitEmployeeImport(actor(), {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: randomUUID(),
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(await previewEmployeeImport(actor(), input)).toMatchObject({
    total: 2,
    accepted: 0,
    rejected: 2,
  });
});
test("outer transaction rollback leaves neither drafts nor a committed receipt", async () => {
  const prefix = randomUUID(),
    input = file(4, prefix),
    preview = await previewEmployeeImport(actor(), input),
    key = randomUUID();
  await expect(
    db.$transaction(async (tx) => {
      await commitEmployeeImport(
        actor(),
        { ...input, previewId: preview.previewId, idempotencyKey: key },
        tx,
      );
      throw Error("synthetic interruption");
    }),
  ).rejects.toThrow("synthetic interruption");
  expect(
    await db.payrollEmployee.count({
      where: { organizationId: org, employeeNumber: { startsWith: prefix } },
    }),
  ).toBe(0);
  expect(await getEmployeeImportReceipt(actor(), key)).toMatchObject({
    status: "NO_COMMITTED_RECEIPT",
  });
  expect(
    await commitEmployeeImport(actor(), {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: key,
    }),
  ).toMatchObject({ created: 4 });
});
test("preview expiry blocks new effects but does not strand committed recovery", async () => {
  const input = file(),
    preview = await previewEmployeeImport(actor(), input),
    key = randomUUID(),
    command = { ...input, previewId: preview.previewId, idempotencyKey: key };
  const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 86400001);
  try {
    await expect(commitEmployeeImport(actor(), command)).rejects.toThrow(
      "PREVIEW_EXPIRED",
    );
  } finally {
    clock.mockRestore();
  }
  await commitEmployeeImport(actor(), command);
  const later = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 86400001);
  try {
    expect(await commitEmployeeImport(actor(), command)).toMatchObject({
      created: 0,
      unchanged: 1,
    });
  } finally {
    later.mockRestore();
  }
});
test("foreign actor, reader, revoked manager and changed preview payload cannot commit or download", async () => {
  const input = file(),
    preview = await previewEmployeeImport(actor(), input),
    command = {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: randomUUID(),
    };
  await expect(commitEmployeeImport(actor(2), command)).rejects.toThrow(
    "PREVIEW_UNAVAILABLE",
  );
  await expect(commitEmployeeImport(actor(3), command)).rejects.toThrow(
    "ACTOR_CHANGED",
  );
  await expect(
    downloadEmployeeImportErrors(actor(2), preview.previewId),
  ).rejects.toThrow("PREVIEW_UNAVAILABLE");
  await expect(
    downloadEmployeeImportErrors(actor(1), preview.previewId),
  ).rejects.toThrow("MANAGER_REQUIRED");
  await expect(
    commitEmployeeImport(actor(), {
      ...command,
      content: input.content.replace("Analyst", "Changed"),
    }),
  ).rejects.toThrow("PREVIEW_CHANGED");
  const role = await db.role.findFirstOrThrow({
    where: { organizationId: org, code: users[0] },
  });
  await db.role.update({ where: { id: role.id }, data: { permissions: [] } });
  try {
    await expect(commitEmployeeImport(actor(), command)).rejects.toThrow(
      "MANAGER_REQUIRED",
    );
    await expect(
      downloadEmployeeImportErrors(actor(), preview.previewId),
    ).rejects.toThrow("MANAGER_REQUIRED");
  } finally {
    await db.role.update({
      where: { id: role.id },
      data: { permissions: actor().actorPermissions },
    });
  }
});
test("recovery keys normalize surrounding whitespace consistently", async () => {
  const input = file(),
    preview = await previewEmployeeImport(actor(), input),
    key = " " + randomUUID() + " ";
  const command = {
      ...input,
      previewId: preview.previewId,
      idempotencyKey: key,
    },
    saved = await commitEmployeeImport(actor(), command);
  expect(await commitEmployeeImport(actor(), command)).toMatchObject({
    created: 0,
    unchanged: 1,
    receiptId: saved.receiptId,
  });
  expect(await getEmployeeImportReceipt(actor(), key)).toMatchObject({
    status: "COMMITTED",
    receiptId: saved.receiptId,
  });
  expect(await getEmployeeImportReceipt(actor(), key.trim())).toMatchObject({
    status: "COMMITTED",
    receiptId: saved.receiptId,
  });
});
test("receipt recovery waits for an in-flight commit instead of reporting a false missing outcome", async () => {
  const input = file(),
    preview = await previewEmployeeImport(actor(), input),
    key = randomUUID();
  let reached!: () => void, release!: () => void;
  const inside = new Promise<void>((r) => (reached = r)),
    barrier = new Promise<void>((r) => (release = r));
  const committing = db.$transaction(async (tx) => {
    const result = await commitEmployeeImport(
      actor(),
      { ...input, previewId: preview.previewId, idempotencyKey: key },
      tx,
    );
    reached();
    await barrier;
    return result;
  });
  await inside;
  let finished = false;
  const recovering = getEmployeeImportReceipt(actor(), key).then((result) => {
    finished = true;
    return result;
  });
  await new Promise((r) => setTimeout(r, 30));
  expect(finished).toBe(false);
  release();
  await committing;
  expect(await recovering).toMatchObject({ status: "COMMITTED", unchanged: 1 });
});
test("rendered EN/FR preview correct commit recover and restricted reader journeys", async () => {
  const http = require("node:http"),
    fs = require("node:fs"),
    path = require("node:path"),
    directory = path.resolve(
      "what-next/hris-implementation-2026-10-24/HR-11/browser",
    );
  const server = http.createServer(async (req: any, res: any) => {
    try {
      if (req.url === "/api") {
        res.setHeader("Content-Type", "application/json");
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 1000000) throw Error("Too large");
        }
        const { command, input } = JSON.parse(body);
        const name = /fixtureRole=([^;]+)/.exec(req.headers.cookie || "")?.[1],
          context = actor(name === "hr" ? 0 : 1);
        let data;
        if (command === "PREVIEW")
          data = await previewEmployeeImport(context, input);
        else if (command === "COMMIT")
          data = await commitEmployeeImport(context, input);
        else if (command === "RECEIPT")
          data = await getEmployeeImportReceipt(context, input?.idempotencyKey);
        else if (command === "ERRORS")
          data = await downloadEmployeeImportErrors(context, input?.previewId);
        else if (command === "TEMPLATE")
          data = await getEmployeeImportTemplate(context);
        else throw Error("Unknown command");
        res.end(JSON.stringify({ success: true, data }));
        return;
      }
      if (["/bundle.js", "/styles.css"].includes(req.url)) {
        res.setHeader(
          "Content-Type",
          req.url.endsWith("css") ? "text/css" : "text/javascript",
        );
        res.end(fs.readFileSync(path.join(directory, req.url.slice(1))));
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    } catch (error) {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unavailable",
        }),
      );
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    await require("../../../what-next/hris-implementation-2026-10-24/HR-11/browser/check.cjs")(
      `http://127.0.0.1:${server.address().port}`,
    );
  } finally {
    await new Promise<void>((r) => server.close(r));
  }
}, 240000);
