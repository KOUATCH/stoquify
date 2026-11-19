import "server-only"

import { revalidatePath, revalidateTag } from "next/cache"
import { logger } from "@/lib/logger"

/** Cache freshness must never replace the outcome of an already saved operation. */
export function revalidateAfterCommit(input: {
  tags?: string[]
  paths?: Array<string | { path: string; type?: "page" | "layout" }>
}) {
  const attempts = [
    ...(input.tags ?? []).map(tag => () => revalidateTag(tag)),
    ...(input.paths ?? []).map(path => () => typeof path === "string"
      ? revalidatePath(path, "page") : revalidatePath(path.path, path.type)),
  ]
  for (const revalidate of attempts) {
    try { revalidate() } catch {
      // Exception details may contain payloads or credentials.
      try { logger.warn("Cache revalidation failed after a committed operation") } catch { /* Preserve the saved result if logging also fails. */ }
    }
  }
}
