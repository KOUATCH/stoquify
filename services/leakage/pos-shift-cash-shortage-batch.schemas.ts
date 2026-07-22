import { z } from "zod";

const identifierSchema = z.string().trim().min(1);

export const posShiftCashShortageBatchCursorSchema = z
  .object({
    recordedAt: z.coerce.date(),
    eventId: identifierSchema,
  })
  .strict();

export const loadPosShiftCashShortageBatchInputSchema = z
  .object({
    organizationId: identifierSchema,
    recordedFromInclusive: z.coerce.date(),
    recordedThroughExclusive: z.coerce.date(),
    cursor: posShiftCashShortageBatchCursorSchema.nullable().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.recordedThroughExclusive <= input.recordedFromInclusive) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordedThroughExclusive"],
        message: "Recorded-through time must be later than recorded-from time.",
      });
    }

    if (
      input.cursor &&
      (input.cursor.recordedAt < input.recordedFromInclusive ||
        input.cursor.recordedAt >= input.recordedThroughExclusive)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cursor", "recordedAt"],
        message:
          "Batch cursor must belong to the requested recorded-time window.",
      });
    }
  });

export type PosShiftCashShortageBatchCursorInput = z.input<
  typeof posShiftCashShortageBatchCursorSchema
>;
export type ParsedPosShiftCashShortageBatchCursor = z.output<
  typeof posShiftCashShortageBatchCursorSchema
>;
export type LoadPosShiftCashShortageBatchInput = z.input<
  typeof loadPosShiftCashShortageBatchInputSchema
>;
export type ParsedLoadPosShiftCashShortageBatchInput = z.output<
  typeof loadPosShiftCashShortageBatchInputSchema
>;
