"use server";
import { protect } from "@/services/_shared/protect";
import { ForbiddenError } from "@/services/_shared/action-errors";
import {
  previewEmployeeImport,
  commitEmployeeImport,
  getEmployeeImportReceipt,
  downloadEmployeeImportErrors,
  getEmployeeImportTemplate,
} from "@/services/hris/employee-import.service";
import type { SetupActor } from "@/services/hris/setup-reviewer.service";

function boundary<T>(
  surface: string,
  operation: (actor: SetupActor, input: any) => Promise<T>,
  accessIntent: "read" | "write" = "write",
) {
  return protect<any, T>(
    {
      permission: "hris.people.manage",
      freshAuth: true,
      tenantGuard: "handler-derived",
      module: { moduleSlug: "payroll", surface, accessIntent, mode: "enforce" },
    },
    async (input, ctx) => {
      if (
        ctx.freshAuth?.claims.userId !== ctx.userId ||
        ctx.freshAuth?.claims.tenantId !== ctx.orgId
      )
        throw new ForbiddenError(
          "Your session changed. Reload before continuing.",
        );
      return operation(
        {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
        },
        input,
      );
    },
  );
}
const preview = boundary("hris.import.preview", previewEmployeeImport),
  commit = boundary("hris.import.commit", commitEmployeeImport);
const receipt = boundary(
  "hris.import.receipt",
  (actor, input) => getEmployeeImportReceipt(actor, input?.idempotencyKey),
  "read",
);
const errors = boundary(
  "hris.import.errors",
  (actor, input) => downloadEmployeeImportErrors(actor, input?.previewId),
  "read",
);
const template = boundary(
  "hris.import.template",
  (actor) => getEmployeeImportTemplate(actor),
  "read",
);
export async function previewEmployeeImportAction(input: unknown) {
  return preview(input);
}
export async function commitEmployeeImportAction(input: unknown) {
  return commit(input);
}
export async function getEmployeeImportReceiptAction(input: unknown) {
  return receipt(input);
}
export async function downloadEmployeeImportErrorsAction(input: unknown) {
  return errors(input);
}
export async function getEmployeeImportTemplateAction() {
  return template({});
}
