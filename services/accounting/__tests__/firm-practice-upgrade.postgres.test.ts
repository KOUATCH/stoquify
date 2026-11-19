jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = process.env.AF13_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF13_CLUSTER_DIR) throw Error("Explicit synthetic baseline required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55450" || url.pathname !== "/stoquify_local_af13_baseline_20261025_r1") throw Error("Wrong baseline")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 30000 } }) }
})
import { realpathSync } from "node:fs"
import { db } from "@/prisma/db"
import { advisoryFixture } from "./advisory-outcomes.fixture"
import { getReviewWorkpaperBinder, recordWorkpaperDecision } from "../review-workpaper.service"
import { executeAdvisoryCommand, getAdvisoryDesk } from "../advisory-outcomes.service"
afterAll(async () => db.$disconnect())
it("populates the pre-AF13 schema through the existing AF12 workflow", async () => {
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  expect(realpathSync(actual[0].data_directory).toLowerCase()).toBe(realpathSync(process.env.AF13_CLUSTER_DIR!).toLowerCase())
  const f = await advisoryFixture("af13-upgrade-baseline"), scope = { ...f.scope, engagementId: f.engagementId }
  const binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  const prepared = await recordWorkpaperDecision(f.actors.preparer, { ...f.scope, expectedSourceHash: binder.sourceHash, decision: "PREPARED", conclusion: "Baseline synthetic preparation", idempotencyKey: "baseline-prepare" })
  await recordWorkpaperDecision(f.actors.reviewer, { ...f.scope, expectedSourceHash: binder.sourceHash, decision: "REVIEWED", preparationId: prepared.id, conclusion: "Baseline synthetic independent review", idempotencyKey: "baseline-review" })
  const desk = await getAdvisoryDesk(f.actors.preparer, scope)
  await executeAdvisoryCommand(f.actors.preparer, { ...scope, command: "DRAFT", expectedVersion: 0, expectedSourceHash: desk.sourceHash, expectedReviewHash: desk.reviewHash,
    idempotencyKey: "baseline-advisory", reason: "Synthetic retained baseline", privateNote: "SYNTHETIC_BASELINE_NOTE", narrative: { conclusions: [{ kind: "CASH", text: "Baseline reviewed cash supporting evidence." }],
      actions: [{ title: "Collect subsequent period evidence", kind: "CASH", ownerId: f.actors.owner.actorId, dueAt: "2026-11-01T00:00:00Z" }] } })
  expect(await db.firmAdvisoryRevision.count()).toBeGreaterThan(0)
  expect(await db.journalEntry.count()).toBeGreaterThan(0)
})
