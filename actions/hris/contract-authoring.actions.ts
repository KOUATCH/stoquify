"use server";
import { protect } from "@/services/_shared/protect";
import { ForbiddenError } from "@/services/_shared/action-errors";
import { assertSetupPilot } from "@/services/hris/setup-reviewer.service";
import { requestHrisContractActivation } from "@/services/hris/contract.service";
import { requestHrisContractDocumentEvidence } from "@/services/hris/document-evidence.service";

const requestActivation = protect<Record<string, unknown>, unknown>(
  {
    permission: "hris.people.manage",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "hris.contract.activation.request",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    assertSetupPilot(ctx.orgId);
    if (
      ctx.freshAuth?.claims.userId !== ctx.userId ||
      ctx.freshAuth?.claims.tenantId !== ctx.orgId
    )
      throw new ForbiddenError("Your session changed. Reload before saving.");
    return requestHrisContractActivation({
      ...input,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as never);
  },
);
const requestDocument = protect<Record<string, unknown>, unknown>(
  {
    permission: "hris.people.manage",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "hris.contract.document.request",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    assertSetupPilot(ctx.orgId);
    if (
      ctx.freshAuth?.claims.userId !== ctx.userId ||
      ctx.freshAuth?.claims.tenantId !== ctx.orgId
    )
      throw new ForbiddenError("Your session changed. Reload before saving.");
    return requestHrisContractDocumentEvidence({
      ...input,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as never);
  },
);
export async function requestHrisContractActivationAction(
  input: Record<string, unknown>,
) {
  return requestActivation(input);
}
export async function requestHrisContractDocumentAction(
  input: Record<string, unknown>,
) {
  return requestDocument(input);
}
