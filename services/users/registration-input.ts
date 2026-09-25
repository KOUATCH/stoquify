import { z } from "zod"

const requiredText = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max).optional()
const identity = {
  firstName: requiredText(100), lastName: requiredText(100),
  email: z.string().trim().max(254).email().transform(value => value.toLowerCase()),
  phone: requiredText(32), password: z.string().min(1).max(128),
}
const context = {
  country: optionalText(100), state: optionalText(100), address: optionalText(500), industry: optionalText(100),
  currency: z.string().regex(/^(?:[A-Z]{3})?$/).optional(), timezone: optionalText(80), defaultLocale: z.enum(["en", "fr"]).optional(),
}
export const guidedRegistrationInput = z.object({
  ...identity, ...context, companyName: requiredText(200), companySize: requiredText(40),
  countryCode: z.string().regex(/^(?:[A-Z]{2})?$/).optional(), businessType: optionalText(80), branchCount: optionalText(40), primaryPain: optionalText(200),
  setupRole: z.enum(["owner", "accountant", "implementation_partner", "financial_partner"]).optional(),
  tradeName: optionalText(200), taxIdentifier: optionalText(100), firstBranchName: optionalText(100),
  requestedModules: z.array(requiredText(80)).max(12).optional(), assistedSetupRequested: z.boolean().optional(), onboardingSource: optionalText(80),
  referralCode: optionalText(120), accountantInviteToken: optionalText(1024), accountantInviteAccepted: z.boolean().optional(),
  confirmPassword: z.string().min(1).max(128), termsAccepted: z.literal(true),
}).refine(value => value.password === value.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })

export const legacyOwnerInput = z.object({
  user: z.object({ ...identity, image: optionalText(2048) }),
  organization: z.object({
    ...context, name: requiredText(200), slug: optionalText(200),
    industry: z.string().trim().max(100).nullable().optional(), country: z.string().trim().max(100).nullable().optional(), state: z.string().trim().max(100).nullable().optional(),
  }),
})
