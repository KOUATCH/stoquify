import {
  PayrollFrequency,
  PayrollRunType,
  PaymentMethod,
} from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().trim().min(1);
const dateInputSchema = z.union([z.date(), z.string().trim().min(1)]);
const decimalInputSchema = z.union([
  z.string().trim().min(1),
  z.number(),
  z.bigint(),
]);

export const createPayrollPeriodInputSchema = z.object({
  organizationId: idSchema,
  name: z.string().trim().min(1),
  frequency: z.nativeEnum(PayrollFrequency).default(PayrollFrequency.MONTHLY),
  periodStart: dateInputSchema,
  periodEnd: dateInputSchema,
  payDate: dateInputSchema,
  countryCode: z.string().trim().min(2).max(32),
  accountingPeriodId: idSchema.optional(),
  actorId: idSchema.optional(),
  metadata: z.unknown().optional(),
});

export const freezeAttendanceSnapshotInputSchema = z.object({
  organizationId: idSchema,
  payrollPeriodId: idSchema,
  employeeId: idSchema,
  scheduledMinutes: z.number().int().nonnegative(),
  workedMinutes: z.number().int().nonnegative(),
  overtimeMinutes: z.number().int().nonnegative().default(0),
  absenceMinutes: z.number().int().nonnegative().default(0),
  leaveMinutes: z.number().int().nonnegative().default(0),
  sourcePayload: z.unknown(),
  frozenById: idSchema,
  idempotencyKey: idSchema.optional(),
  metadata: z.unknown().optional(),
});

export const calculatePayrollRunInputSchema = z.object({
  organizationId: idSchema,
  payrollPeriodId: idSchema,
  preparedById: idSchema,
  idempotencyKey: idSchema,
  runType: z.nativeEnum(PayrollRunType).default(PayrollRunType.ORDINARY),
  originalRunId: idSchema.optional(),
  employeeIds: z.array(idSchema).min(1).optional(),
  runDate: dateInputSchema.optional(),
  metadata: z.unknown().optional(),
});

export const approveAndPostPayrollRunInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  approvedById: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  idempotencyKey: idSchema.optional(),
  documentHash: z.string().trim().min(1).optional(),
  metadata: z.unknown().optional(),
});

export const releasePayrollPaymentBatchInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  requestedById: idSchema,
  approvedById: idSchema,
  releasedById: idSchema.optional(),
  method: z.nativeEnum(PaymentMethod),
  paymentDate: dateInputSchema,
  idempotencyKey: idSchema,
  bankFileHash: z.string().trim().min(1).optional(),
  documentHash: z.string().trim().min(1).optional(),
  allocations: z
    .array(
      z.object({
        payslipId: idSchema,
        employeeId: idSchema,
        amount: decimalInputSchema,
      }),
    )
    .min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  notes: z.string().trim().optional(),
  metadata: z.unknown().optional(),
});

export const preparePayrollDeclarationsInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  preparedById: idSchema,
  declarationTypes: z.array(z.string().trim().min(1)).optional(),
  idempotencyKey: idSchema.optional(),
  metadata: z.unknown().optional(),
});

export type CreatePayrollPeriodInput = z.input<
  typeof createPayrollPeriodInputSchema
>;
export type FreezeAttendanceSnapshotInput = z.input<
  typeof freezeAttendanceSnapshotInputSchema
>;
export type CalculatePayrollRunInput = z.input<
  typeof calculatePayrollRunInputSchema
>;
export type ApproveAndPostPayrollRunInput = z.input<
  typeof approveAndPostPayrollRunInputSchema
>;
export type ReleasePayrollPaymentBatchInput = z.input<
  typeof releasePayrollPaymentBatchInputSchema
>;
export type PreparePayrollDeclarationsInput = z.input<
  typeof preparePayrollDeclarationsInputSchema
>;
