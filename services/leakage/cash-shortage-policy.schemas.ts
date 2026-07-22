import { Prisma } from "@prisma/client";
import { z } from "zod";

import { cashShortagePolicyV1Schema } from "./pos-shift-cash-shortage-contracts";

const identifierSchema = z.string().trim().min(1);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/));
const policyAmountSchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/);

export const createCashShortagePolicyDraftInputSchema = z
  .object({
    organizationId: identifierSchema,
    currency: currencySchema,
    reviewThreshold: policyAmountSchema,
    highThreshold: policyAmountSchema,
    minorUnitScale: z.number().int().min(0).max(4),
    roundingMode: z.enum(["HALF_UP", "HALF_EVEN"]),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date().nullable().default(null),
    mode: z.literal("observe").default("observe"),
  })
  .strict()
  .superRefine((input, context) => {
    const reviewThreshold = new Prisma.Decimal(input.reviewThreshold);
    const highThreshold = new Prisma.Decimal(input.highThreshold);

    if (reviewThreshold.lte(0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewThreshold"],
        message: "Review threshold must be greater than zero.",
      });
    }
    if (highThreshold.lt(reviewThreshold)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["highThreshold"],
        message:
          "High threshold must be greater than or equal to review threshold.",
      });
    }
    if (reviewThreshold.decimalPlaces() > input.minorUnitScale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewThreshold"],
        message: "Review threshold exceeds the declared minor-unit scale.",
      });
    }
    if (highThreshold.decimalPlaces() > input.minorUnitScale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["highThreshold"],
        message: "High threshold exceeds the declared minor-unit scale.",
      });
    }
    if (
      input.effectiveTo !== null &&
      input.effectiveTo <= input.effectiveFrom
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveTo"],
        message: "Effective end must be later than effective start.",
      });
    }
  });

export const approveCashShortagePolicyInputSchema = z
  .object({
    organizationId: identifierSchema,
    policyId: identifierSchema,
  })
  .strict();

export const resolveCashShortagePolicyInputSchema = z
  .object({
    organizationId: identifierSchema,
    currency: currencySchema,
    effectiveAt: z.coerce.date(),
  })
  .strict();

export const cashShortagePolicyApprovalEventPayloadSchema = z
  .object({
    evidenceVersion: z.literal(1),
    organizationId: identifierSchema,
    policy: cashShortagePolicyV1Schema,
    policyHash: sha256Schema,
  })
  .strict();

export type CreateCashShortagePolicyDraftInput = z.input<
  typeof createCashShortagePolicyDraftInputSchema
>;
export type ParsedCreateCashShortagePolicyDraftInput = z.output<
  typeof createCashShortagePolicyDraftInputSchema
>;
export type ApproveCashShortagePolicyInput = z.input<
  typeof approveCashShortagePolicyInputSchema
>;
export type ResolveCashShortagePolicyInput = z.input<
  typeof resolveCashShortagePolicyInputSchema
>;
