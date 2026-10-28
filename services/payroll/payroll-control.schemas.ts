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
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
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

const payrollRunTransitionInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  expectedVersion: z.number().int().positive(),
  idempotencyKey: idSchema,
  actorId: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  correlationId: idSchema.optional(),
  evidenceHash: z.string().trim().min(1).optional(),
  documentHash: z.string().trim().min(1).optional(),
  metadata: z.unknown().optional(),
});

export const reviewPayrollRunInputSchema = payrollRunTransitionInputSchema;
export const approvePayrollRunInputSchema = payrollRunTransitionInputSchema;
export const emitPayrollPayslipsInputSchema = payrollRunTransitionInputSchema;
export const postPayrollRunInputSchema = payrollRunTransitionInputSchema;

const payrollPaymentAllocationInputSchema = z.object({
  payslipId: idSchema,
  employeeId: idSchema,
  amount: decimalInputSchema,
});

export const requestPayrollPaymentBatchInputSchema = z.object({
  organizationId: idSchema,
  payrollRunId: idSchema,
  requestedById: idSchema,
  method: z.nativeEnum(PaymentMethod),
  paymentDate: dateInputSchema,
  idempotencyKey: idSchema,
  bankFileHash: z.string().trim().min(1).optional(),
  documentHash: z.string().trim().min(1).optional(),
  allocations: z.array(payrollPaymentAllocationInputSchema).min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  notes: z.string().trim().optional(),
  metadata: z.unknown().optional(),
});

export const approvePayrollPaymentBatchInputSchema = z.object({
  organizationId: idSchema,
  payrollPaymentBatchId: idSchema,
  approvedById: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  idempotencyKey: idSchema,
});

export const releasePayrollPaymentBatchInputSchema = z.object({
  organizationId: idSchema,
  payrollPaymentBatchId: idSchema,
  releasedById: idSchema,
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  idempotencyKey: idSchema,
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
export type ReviewPayrollRunInput = z.input<typeof reviewPayrollRunInputSchema>;
export type ApprovePayrollRunInput = z.input<
  typeof approvePayrollRunInputSchema
>;
export type EmitPayrollPayslipsInput = z.input<
  typeof emitPayrollPayslipsInputSchema
>;
export type PostPayrollRunInput = z.input<typeof postPayrollRunInputSchema>;
export type RequestPayrollPaymentBatchInput = z.input<
  typeof requestPayrollPaymentBatchInputSchema
>;
export type ApprovePayrollPaymentBatchInput = z.input<
  typeof approvePayrollPaymentBatchInputSchema
>;
export type ReleasePayrollPaymentBatchInput = z.input<
  typeof releasePayrollPaymentBatchInputSchema
>;
export type PreparePayrollDeclarationsInput = z.input<
  typeof preparePayrollDeclarationsInputSchema
>;
