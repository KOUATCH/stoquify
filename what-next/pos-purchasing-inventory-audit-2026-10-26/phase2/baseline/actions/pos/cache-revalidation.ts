import "server-only"

import { revalidatePath, revalidateTag } from "next/cache"
import { logger } from "@/lib/logger"

/** Cache freshness must never replace the outcome of an already saved operation. */
export function revalidatePOSAfterCommit(input: {
  tags?: string[]
  paths?: string[]
}) {
  const attempts = [
    ...(input.tags ?? []).map(tag => () => revalidateTag(tag)),
    ...(input.paths ?? []).map(path => () => revalidatePath(path, "page")),
  ]
  for (const revalidate of attempts) {
    try {
      revalidate()
    } catch {
      // Do not log cache exception details: they may contain payloads or credentials.
      try { logger.warn("POS cache revalidation failed after a committed operation") } catch { /* Preserve the saved result even if logging fails. */ }
    }
  }
}
