import { z } from "zod"

const optionalText = (max: number) => z.string().trim().max(max).optional()
const timezone = z.string().trim().min(1).max(80).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true }
  catch { return false }
}, "Select a valid timezone")
const annualStart = z.string().trim().refine(value => {
  if (value === "") return true
  if (!/^\d{2}-\d{2}$/.test(value)) return false
  const [month, day] = value.split("-").map(Number)
  // An annual default must identify a day present in every year.
  const date = new Date(Date.UTC(2001, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}, "Use a valid annual month and day")

export const organizationProfileInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  industry: optionalText(100), country: optionalText(100), state: optionalText(100), address: optionalText(500),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  timezone: timezone.optional(), defaultLocale: z.enum(["en", "fr"]).optional(),
  inventoryStartDate: z.date().nullable().optional(), fiscalYearStart: annualStart.optional(),
}).strict().refine(value => Object.values(value).some(item => item !== undefined), "Select a setting to update")
