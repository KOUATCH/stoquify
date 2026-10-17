import "server-only"
import { appendFileSync } from "node:fs"
import { join } from "node:path"
import { headers } from "next/headers"

// Temporary owned-environment diagnostic. No business data or result is logged.
export async function profileCashStage<T>(stage: string, work: () => T | Promise<T>): Promise<T> {
  let enabled = false
  try { enabled = process.env.NODE_ENV === "development" && new URL(process.env.DATABASE_URL ?? "").pathname === "/stoquify_local_registration_20260906_01" } catch {}
  if (!enabled) return work()
  const id = (await headers()).get("x-owned-cash-profile")
  if (!id || !/^cash-profile-[a-z0-9-]{1,100}$/.test(id)) return work()
  const start = performance.now()
  try { return await work() }
  finally {
    try { appendFileSync(join(process.cwd(), "what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/cash-batch-spans-2026-09-30.jsonl"), JSON.stringify({id, stage, at: new Date().toISOString(), milliseconds: performance.now() - start}) + "\n") } catch { /* Diagnostic failure must not change the original operation. */ }
  }
}
