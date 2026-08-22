"use server";

import { revalidatePath } from "next/cache";

import {
  approvePayrollPaymentBatch,
  approvePayrollRun,
  calculatePayrollRun,
  emitPayrollPayslips,
  getPayrollRunWorkbenchData,
  getPayrollWorkbenchData,
  payrollRunWorkbenchInputSchema,
  postPayrollRun,
  preparePayrollDeclarations,
  requestPayrollPaymentBatch,
  releasePayrollPaymentBatch,
  reviewPayrollRun,
  type PayrollWorkbenchData,
} from "@/services/payroll/payroll-control.service";
import {
  enqueuePayrollAuthorityAdapterExecution,
  enqueuePayrollAuthorityAdapterExecutionInputSchema,
} from "@/services/payroll/authority-adapter-execution.service";
import {
  getPayrollDeclarationWorkbenchData,
  payrollDeclarationWorkbenchInputSchema,
  recordPayrollDeclarationEvidence,
  recordPayrollDeclarationEvidenceInputSchema,
} from "@/services/payroll/declaration-lifecycle.service";
import {
  getPayrollEmployeeBalanceWorkbenchData,
  openPayrollEmployeeBalanceCaseFromCorrection,
  openPayrollEmployeeBalanceCaseInputSchema,
  openPayrollEmployeeBalanceCasesForCorrectionRun,
  openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema,
  payrollEmployeeBalanceWorkbenchInputSchema,
  planPayrollEmployeeBalanceCasesForCorrectionRun,
  planPayrollEmployeeBalanceCasesInputSchema,
  settlePayrollEmployeeBalanceCase,
  settlePayrollEmployeeBalanceCaseInputSchema,
} from "@/services/payroll/payroll-employee-balance.service";
import {
  approvePayrollPaymentBatchInputSchema,
  approvePayrollRunInputSchema,
  calculatePayrollRunInputSchema,
  emitPayrollPayslipsInputSchema,
  postPayrollRunInputSchema,
  preparePayrollDeclarationsInputSchema,
  requestPayrollPaymentBatchInputSchema,
  releasePayrollPaymentBatchInputSchema,
  reviewPayrollRunInputSchema,
} from "@/services/payroll/payroll-control.schemas";
import { protect } from "@/services/_shared/protect";
import { FreshAuthRequiredError } from "@/lib/security/auth-session";

export type { PayrollWorkbenchData };
export type PayrollRunWorkbenchResult = Awaited<
  ReturnType<typeof getPayrollRunWorkbenchData>
>;
export type PayrollEmployeeBalanceWorkbenchResult = Awaited<
  ReturnType<typeof getPayrollEmployeeBalanceWorkbenchData>
>;
export type PayrollDeclarationWorkbenchResult = Awaited<
  ReturnType<typeof getPayrollDeclarationWorkbenchData>
>;

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input
    : {};
}

function revalidatePayrollPaths() {
  revalidatePath("/dashboard/payroll", "page");
  revalidatePath("/dashboard/payroll/runs", "page");
  revalidatePath("/dashboard/payroll/payments", "page");
  revalidatePath("/dashboard/payroll/declarations", "page");
  revalidatePath("/dashboard/presence", "page");
  revalidatePath("/[locale]/dashboard/payroll", "page");
  revalidatePath("/[locale]/dashboard/payroll/runs", "page");
  revalidatePath("/[locale]/dashboard/payroll/payments", "page");
  revalidatePath("/[locale]/dashboard/payroll/declarations", "page");
  revalidatePath("/[locale]/dashboard/presence", "page");
}

const getWorkbench = protect<unknown, PayrollWorkbenchData>(
  {
    permission: "payroll.read",
    auditResource: "PayrollWorkbench",
    auditAllowed: false,
    module: {
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input) as { limit?: unknown };
    const limit = typeof raw.limit === "number" ? raw.limit : undefined;
    return getPayrollWorkbenchData({
      organizationId: ctx.orgId,
      limit,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    });
  },
);

export async function getPayrollWorkbenchAction(input: unknown = {}) {
  return getWorkbench(input);
}

const calculateRun = protect<
  unknown,
  Awaited<ReturnType<typeof calculatePayrollRun>>
>(
  {
    permission: "payroll.runs.calculate",
    auditResource: "PayrollRun",
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.calculate",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = calculatePayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      preparedById: ctx.userId,
    });
    const result = await calculatePayrollRun(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function calculatePayrollRunAction(input: unknown) {
  return calculateRun(input);
}

const reviewRun = protect<
  unknown,
  Awaited<ReturnType<typeof reviewPayrollRun>>
>(
  {
    permission: "payroll.runs.review",
    auditResource: "PayrollRun",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.review",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    if (!ctx.freshAuth) throw new FreshAuthRequiredError();
    const parsed = reviewPayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth.lastAuthAt,
      now: new Date(),
    });
    const result = await reviewPayrollRun(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function reviewPayrollRunAction(input: unknown) {
  return reviewRun(input);
}

const approveRun = protect<
  unknown,
  Awaited<ReturnType<typeof approvePayrollRun>>
>(
  {
    permission: "payroll.runs.approve",
    auditResource: "PayrollRun",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    if (!ctx.freshAuth) throw new FreshAuthRequiredError();
    const parsed = approvePayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth.lastAuthAt,
      now: new Date(),
    });
    const result = await approvePayrollRun(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function approvePayrollRunAction(input: unknown) {
  return approveRun(input);
}

const emitPayslips = protect<
  unknown,
  Awaited<ReturnType<typeof emitPayrollPayslips>>
>(
  {
    permission: "payroll.payslips.emit",
    auditResource: "PayrollRun",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payslips.emit",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    if (!ctx.freshAuth) throw new FreshAuthRequiredError();
    const parsed = emitPayrollPayslipsInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth.lastAuthAt,
      now: new Date(),
    });
    const result = await emitPayrollPayslips(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function emitPayrollPayslipsAction(input: unknown) {
  return emitPayslips(input);
}

const postRun = protect<unknown, Awaited<ReturnType<typeof postPayrollRun>>>(
  {
    permission: "payroll.runs.post",
    auditResource: "PayrollRun",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.post",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    if (!ctx.freshAuth) throw new FreshAuthRequiredError();
    const parsed = postPayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth.lastAuthAt,
      now: new Date(),
    });
    const result = await postPayrollRun(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function postPayrollRunAction(input: unknown) {
  return postRun(input);
}

const requestPaymentBatch = protect<
  unknown,
  Awaited<ReturnType<typeof requestPayrollPaymentBatch>>
>(
  {
    permission: "payroll.payments.request",
    auditResource: "PayrollPaymentBatch",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.request",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = requestPayrollPaymentBatchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      requestedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await requestPayrollPaymentBatch(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function requestPayrollPaymentBatchAction(input: unknown) {
  return requestPaymentBatch(input);
}

const approvePaymentBatch = protect<
  unknown,
  Awaited<ReturnType<typeof approvePayrollPaymentBatch>>
>(
  {
    permission: "payroll.payments.approve",
    auditResource: "PayrollPaymentBatch",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = approvePayrollPaymentBatchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await approvePayrollPaymentBatch(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function approvePayrollPaymentBatchAction(input: unknown) {
  return approvePaymentBatch(input);
}

const releasePaymentBatch = protect<
  unknown,
  Awaited<ReturnType<typeof releasePayrollPaymentBatch>>
>(
  {
    permission: "payroll.payments.release",
    auditResource: "PayrollPaymentBatch",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.release",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = releasePayrollPaymentBatchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      releasedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await releasePayrollPaymentBatch(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function releasePayrollPaymentBatchAction(input: unknown) {
  return releasePaymentBatch(input);
}

const getRunWorkbench = protect<
  unknown,
  Awaited<ReturnType<typeof getPayrollRunWorkbenchData>>
>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollRunWorkbench",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.workbench",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollRunWorkbenchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    });
    return getPayrollRunWorkbenchData(parsed);
  },
);

export async function getPayrollRunWorkbenchAction(input: unknown = {}) {
  return getRunWorkbench(input);
}
const getEmployeeBalanceWorkbench = protect<
  unknown,
  Awaited<ReturnType<typeof getPayrollEmployeeBalanceWorkbenchData>>
>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollEmployeeBalanceWorkbench",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_balance.workbench",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollEmployeeBalanceWorkbenchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    });
    return getPayrollEmployeeBalanceWorkbenchData(parsed);
  },
);

export async function getPayrollEmployeeBalanceWorkbenchAction(
  input: unknown = {},
) {
  return getEmployeeBalanceWorkbench(input);
}
const openEmployeeBalanceCase = protect<
  unknown,
  Awaited<ReturnType<typeof openPayrollEmployeeBalanceCaseFromCorrection>>
>(
  {
    permission: "payroll.payments.release",
    auditResource: "PayrollEmployeeBalanceCase",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_balance.open",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = openPayrollEmployeeBalanceCaseInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await openPayrollEmployeeBalanceCaseFromCorrection(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function openPayrollEmployeeBalanceCaseAction(input: unknown) {
  return openEmployeeBalanceCase(input);
}

const planEmployeeBalanceCases = protect<
  unknown,
  Awaited<ReturnType<typeof planPayrollEmployeeBalanceCasesForCorrectionRun>>
>(
  {
    permission: "payroll.payments.release",
    auditResource: "PayrollEmployeeBalancePlan",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_balance.plan",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = planPayrollEmployeeBalanceCasesInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
    });
    return planPayrollEmployeeBalanceCasesForCorrectionRun(parsed);
  },
);

export async function planPayrollEmployeeBalanceCasesAction(input: unknown) {
  return planEmployeeBalanceCases(input);
}

const openEmployeeBalanceCasesForCorrectionRun = protect<
  unknown,
  Awaited<ReturnType<typeof openPayrollEmployeeBalanceCasesForCorrectionRun>>
>(
  {
    permission: "payroll.payments.release",
    auditResource: "PayrollEmployeeBalanceCase",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_balance.bulk_open",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed =
      openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema.parse({
        ...asRecord(input),
        organizationId: ctx.orgId,
        approvedById: ctx.userId,
        actorPermissions: ctx.permissions,
        lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
      });
    const result =
      await openPayrollEmployeeBalanceCasesForCorrectionRun(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function openPayrollEmployeeBalanceCasesForCorrectionRunAction(
  input: unknown,
) {
  return openEmployeeBalanceCasesForCorrectionRun(input);
}

const settleEmployeeBalanceCase = protect<
  unknown,
  Awaited<ReturnType<typeof settlePayrollEmployeeBalanceCase>>
>(
  {
    permission: "payroll.payments.reconcile",
    auditResource: "PayrollEmployeeBalanceCase",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.employee_balance.settle",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = settlePayrollEmployeeBalanceCaseInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await settlePayrollEmployeeBalanceCase(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function settlePayrollEmployeeBalanceCaseAction(input: unknown) {
  return settleEmployeeBalanceCase(input);
}

const prepareDeclarations = protect<
  unknown,
  Awaited<ReturnType<typeof preparePayrollDeclarations>>
>(
  {
    permission: "payroll.declarations.prepare",
    auditResource: "PayrollDeclaration",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.prepare",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = preparePayrollDeclarationsInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      preparedById: ctx.userId,
    });
    const result = await preparePayrollDeclarations(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function preparePayrollDeclarationsAction(input: unknown) {
  return prepareDeclarations(input);
}

const getDeclarationWorkbench = protect<
  unknown,
  Awaited<ReturnType<typeof getPayrollDeclarationWorkbenchData>>
>(
  {
    permission: "payroll.command.read",
    auditResource: "PayrollDeclarationWorkbench",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.workbench",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollDeclarationWorkbenchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    });
    return getPayrollDeclarationWorkbenchData(parsed);
  },
);

export async function getPayrollDeclarationWorkbenchAction(
  input: unknown = {},
) {
  return getDeclarationWorkbench(input);
}

const recordDeclarationEvidence = protect<
  unknown,
  Awaited<ReturnType<typeof recordPayrollDeclarationEvidence>>
>(
  {
    permission: "payroll.declarations.manage",
    auditResource: "PayrollDeclaration",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.manage",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = recordPayrollDeclarationEvidenceInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(),
    });
    const result = await recordPayrollDeclarationEvidence(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function recordPayrollDeclarationEvidenceAction(input: unknown) {
  return recordDeclarationEvidence(input);
}

const enqueueAuthorityAdapterExecution = protect<
  unknown,
  Awaited<ReturnType<typeof enqueuePayrollAuthorityAdapterExecution>>
>(
  {
    permission: "payroll.declarations.manage",
    auditResource: "PayrollDeclaration",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.adapter_execution.enqueue",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = enqueuePayrollAuthorityAdapterExecutionInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    });
    const result = await enqueuePayrollAuthorityAdapterExecution(parsed);
    revalidatePayrollPaths();
    return result;
  },
);

export async function enqueuePayrollAuthorityAdapterExecutionAction(
  input: unknown,
) {
  return enqueueAuthorityAdapterExecution(input);
}
