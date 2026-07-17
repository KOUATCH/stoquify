import { createHash } from "crypto"
import { logger } from "@/lib/logger"

export async function isPasswordBreached(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "stockflow-password-policy",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn("hibp password check failed open", { status: response.status })
      return false
    }

    const body = await response.text()
    return body.split(/\r?\n/).some((line) => line.split(":")[0] === suffix)
  } catch (error) {
    logger.warn("hibp password check failed open", {
      err: error instanceof Error ? error.message : String(error),
    })
    return false
  } finally {
    clearTimeout(timeout)
  }
}
