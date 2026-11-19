import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
  markBusinessEventAppliedInTx,
} from "@/services/events/business-event.service";
import { assertSetupManager, type SetupActor } from "./setup-reviewer.service";
import { upsertHrisEmployeeProfile } from "./employee.service";
import {
  analyzeEmployeeCsv,
  employeeImportErrorCsv,
  HRIS_IMPORT_VERSION,
  HRIS_IMPORT_FIELDS,
  EmployeeImportFormatError,
  type ImportIssue,
} from "./employee-import.csv";

type Client = typeof db | Prisma.TransactionClient;
type Tx = Prisma.TransactionClient;
const inputSchema = z.object({
  content: z.string().max(262144),
  mapping: z.record(z.string().max(120), z.string().max(40)),
  version: z.literal(HRIS_IMPORT_VERSION),
});
const commitSchema = inputSchema.extend({
  previewId: z.string().min(1),
  idempotencyKey: z.string().trim().min(1).max(100),
});
const keySchema = z.string().trim().min(1).max(100);
const previewType = "hris.employee.import.previewed",
  commitType = "hris.employee.import.committed";
const transaction = <T>(
  client: Client,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> =>
  "$transaction" in client
    ? client.$transaction(fn, { maxWait: 15000, timeout: 120000 })
    : fn(client);
const payload = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
const lock = async (tx: Tx, organizationId: string) => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"hris-profile:" + organizationId},0))::text`;
};
const receiptKey = (key: string) => "hris-import:commit:" + key;
const digest = (input: z.infer<typeof inputSchema>) =>
  hashBusinessPayload(input);

async function analyze(
  tx: Tx,
  organizationId: string,
  input: z.infer<typeof inputSchema>,
) {
  let result: ReturnType<typeof analyzeEmployeeCsv>;
  try {
    result = analyzeEmployeeCsv(input.content, input.mapping);
  } catch (error) {
    if (error instanceof EmployeeImportFormatError)
      throw new BusinessRuleError(error.message);
    throw error;
  }
  const existing = await tx.payrollEmployee.findMany({
    where: {
      organizationId,
      employeeNumber: {
        in: result.rows.map((row) => row.values.employeeNumber ?? ""),
      },
    },
    select: { employeeNumber: true },
  });
  const retained = new Set(existing.map((row) => row.employeeNumber));
  for (const row of result.rows)
    if (retained.has(row.values.employeeNumber ?? ""))
      row.issues.push({
        line: row.line,
        field: "employeeNumber",
        code: "NUMBER_ALREADY_RETAINED",
      });
  return {
    ...result,
    total: result.rows.length,
    accepted: result.rows.filter((row) => !row.issues.length).length,
    rejected: result.rows.filter((row) => row.issues.length).length,
    unchanged: 0,
  };
}
async function record(
  tx: Tx,
  actor: SetupActor,
  eventType: string,
  key: string,
  value: Record<string, unknown>,
) {
  const result = await recordBusinessEventInTx(tx as never, {
    organizationId: actor.organizationId,
    actorId: actor.actorId,
    eventType,
    eventSource: "IMPORT",
    idempotencyKey: key,
    payload: value,
    occurredAt: new Date(),
  });
  await markBusinessEventAppliedInTx(
    tx as never,
    actor.organizationId,
    result.event.id,
  );
  return result.event.id;
}
async function ownPreview(tx: Tx, actor: SetupActor, id: string) {
  const event = await tx.businessEvent.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      eventType: previewType,
      status: "APPLIED",
    },
  });
  if (!event) throw new NotFoundError("HRIS_IMPORT_PREVIEW_UNAVAILABLE");
  if (event.actorId !== actor.actorId)
    throw new ForbiddenError("HRIS_IMPORT_PREVIEW_ACTOR_CHANGED");
  return { event, data: payload(event.payload) };
}
function recovered(event: { id: string; payload: unknown }) {
  const receipt = payload(event.payload).receipt;
  return {
    ...receipt,
    receiptId: event.id,
    replayed: true,
    originalCreated: receipt.created,
    created: 0,
    unchanged: receipt.created,
    rows: receipt.rows.map((row: any) => ({ ...row, status: "UNCHANGED" })),
  };
}

export async function previewEmployeeImport(
  actor: SetupActor,
  raw: unknown,
  client: Client = db,
) {
  const input = inputSchema.parse(raw);
  return transaction(client, async (tx) => {
    await assertSetupManager(tx, actor);
    const result = await analyze(tx, actor.organizationId, input),
      sourceHash = digest(input),
      expiresAt = new Date(Date.now() + 86400000).toISOString();
    const previewId = await record(
      tx,
      actor,
      previewType,
      "hris-import-preview:" + randomUUID(),
      {
        version: input.version,
        sourceHash,
        expiresAt,
        total: result.total,
        accepted: result.accepted,
        rejected: result.rejected,
        issues: result.rows.flatMap((row) => row.issues),
      },
    );
    return {
      ...result,
      sourceHash,
      previewId,
      expiresAt,
      version: input.version,
      retention: "RAW_SOURCE_NOT_STORED" as const,
    };
  });
}

export async function commitEmployeeImport(
  actor: SetupActor,
  raw: unknown,
  client: Client = db,
) {
  const input = commitSchema.parse(raw),
    sourceHash = digest(inputSchema.parse(raw)),
    key = receiptKey(input.idempotencyKey);
  return transaction(client, async (tx) => {
    await assertSetupManager(tx, actor);
    await lock(tx, actor.organizationId);
    const prior = await tx.businessEvent.findFirst({
      where: {
        organizationId: actor.organizationId,
        eventType: commitType,
        idempotencyKey: key,
        status: "APPLIED",
      },
    });
    if (prior) {
      if (prior.actorId !== actor.actorId)
        throw new ForbiddenError("HRIS_IMPORT_RECEIPT_ACTOR_CHANGED");
      if (payload(prior.payload).sourceHash !== sourceHash)
        throw new ConflictError("HRIS_IMPORT_RETRY_PAYLOAD_CHANGED");
      return recovered(prior);
    }
    const preview = await ownPreview(tx, actor, input.previewId);
    if (preview.data.sourceHash !== sourceHash)
      throw new ConflictError("HRIS_IMPORT_PREVIEW_CHANGED");
    if (Date.parse(preview.data.expiresAt) <= Date.now())
      throw new ConflictError("HRIS_IMPORT_PREVIEW_EXPIRED");
    if (preview.data.rejected !== 0)
      throw new BusinessRuleError("HRIS_IMPORT_CORRECT_REJECTED_ROWS_FIRST");
    const current = await analyze(tx, actor.organizationId, input);
    if (current.rejected)
      throw new ConflictError("HRIS_IMPORT_DATA_CHANGED_PREVIEW_AGAIN");
    const rows: Array<{ line: number; employeeId: string; status: string }> =
      [];
    for (const row of current.rows) {
      const values = row.values;
      const created = await upsertHrisEmployeeProfile(
        {
          ...actor,
          createOnly: true,
          status: "DRAFT",
          employeeNumber: values.employeeNumber!,
          displayName: values.displayName!,
          hireDate: new Date(values.hireDate!),
          countryCode: values.countryCode!,
          ...(values.department ? { department: values.department } : {}),
          ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
          sourceReference: {
            sourceSystem: HRIS_IMPORT_VERSION,
            sourceRecordId: input.previewId + ":" + row.line,
            sourceHash: "sha256:" + sourceHash,
          },
          idempotencyKey:
            "hris-import:employee:" + input.idempotencyKey + ":" + row.line,
        },
        tx,
      );
      rows.push({
        line: row.line,
        employeeId: created.payrollEmployee.id,
        status: "CREATED",
      });
    }
    const receipt = {
      total: current.total,
      created: rows.length,
      rejected: 0,
      unchanged: 0,
      rows,
      version: input.version,
      previewId: input.previewId,
    };
    const receiptId = await record(tx, actor, commitType, key, {
      sourceHash,
      receipt,
    });
    return {
      ...receipt,
      receiptId,
      replayed: false,
      originalCreated: rows.length,
    };
  });
}

export async function getEmployeeImportReceipt(
  actor: SetupActor,
  rawKey: unknown,
  client: Client = db,
) {
  const key = receiptKey(keySchema.parse(rawKey));
  return transaction(client, async (tx) => {
    await assertSetupManager(tx, actor);
    await lock(tx, actor.organizationId);
    const event = await tx.businessEvent.findFirst({
      where: {
        organizationId: actor.organizationId,
        eventType: commitType,
        idempotencyKey: key,
        status: "APPLIED",
      },
    });
    if (!event)
      return {
        status: "NO_COMMITTED_RECEIPT" as const,
        observedAt: new Date().toISOString(),
      };
    if (event.actorId !== actor.actorId)
      throw new ForbiddenError("HRIS_IMPORT_RECEIPT_ACTOR_CHANGED");
    return { status: "COMMITTED" as const, ...recovered(event) };
  });
}

export async function downloadEmployeeImportErrors(
  actor: SetupActor,
  previewId: string,
  client: Client = db,
) {
  return transaction(client, async (tx) => {
    await assertSetupManager(tx, actor);
    const preview = await ownPreview(tx, actor, previewId);
    if (Date.parse(preview.data.expiresAt) <= Date.now())
      throw new ConflictError("HRIS_IMPORT_PREVIEW_EXPIRED");
    return {
      filename: "hris-import-errors.csv",
      content: employeeImportErrorCsv(preview.data.issues as ImportIssue[]),
      retention: "NO_RAW_SOURCE_OR_VALUES" as const,
    };
  });
}
export type EmployeeImportPreview = Awaited<
  ReturnType<typeof previewEmployeeImport>
>;

export async function getEmployeeImportTemplate(
  actor: SetupActor,
  client: Client = db,
) {
  return transaction(client, async (tx) => {
    await assertSetupManager(tx, actor);
    return {
      organizationId: actor.organizationId,
      version: HRIS_IMPORT_VERSION,
      content: HRIS_IMPORT_FIELDS.join(",") + "\r\n",
      filename: "hris-employee-drafts-v1.csv",
    };
  });
}
