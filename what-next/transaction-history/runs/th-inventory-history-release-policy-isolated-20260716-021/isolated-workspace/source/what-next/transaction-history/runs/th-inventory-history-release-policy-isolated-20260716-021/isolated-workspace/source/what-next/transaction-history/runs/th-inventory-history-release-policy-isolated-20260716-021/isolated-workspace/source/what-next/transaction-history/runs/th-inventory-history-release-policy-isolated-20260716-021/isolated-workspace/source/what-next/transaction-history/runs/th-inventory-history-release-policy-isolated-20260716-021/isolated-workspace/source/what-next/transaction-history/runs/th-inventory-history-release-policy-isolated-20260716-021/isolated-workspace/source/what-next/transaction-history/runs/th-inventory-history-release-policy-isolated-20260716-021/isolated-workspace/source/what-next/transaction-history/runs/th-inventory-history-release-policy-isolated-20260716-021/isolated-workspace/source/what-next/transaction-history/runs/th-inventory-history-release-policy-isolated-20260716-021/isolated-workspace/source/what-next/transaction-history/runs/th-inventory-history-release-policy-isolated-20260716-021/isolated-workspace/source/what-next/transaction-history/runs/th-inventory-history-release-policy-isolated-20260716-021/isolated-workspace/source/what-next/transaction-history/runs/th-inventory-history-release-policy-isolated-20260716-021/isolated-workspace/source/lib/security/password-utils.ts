import { z } from "zod"
import { hashPassword, verifyPassword } from "@/lib/password"

const commonPasswords = new Set([
  "password",
  "password123",
  "admin123",
  "qwerty123",
  "letmein123",
  "welcome123",
  "stockflow123",
])

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((value) => !/(.)\1\1/.test(value), "Password must not repeat the same character 3 times")
  .refine((value) => !commonPasswords.has(value.toLowerCase()), "Password is too common")

export { hashPassword, verifyPassword }
