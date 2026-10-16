import { z } from "zod"

/** Reject by length before Zod traverses or collects issues for array elements. */
export function boundedArray<T extends z.ZodTypeAny>(schema: z.ZodArray<T>, maximum: number) {
  return z.custom<z.input<T>[]>(
    (value) => !Array.isArray(value) || value.length <= maximum,
    { message: `At most ${maximum} entries are allowed`, fatal: true },
  ).pipe(schema)
}

export const MAX_MANUAL_JOURNAL_LINES = 500
export const MAX_AP_BATCH_ENTRIES = 100
export const MAX_POS_TENDERS = 20
