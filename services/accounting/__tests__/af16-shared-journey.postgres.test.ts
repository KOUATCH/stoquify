jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"), c = require("@/scripts/af16-verification-context.cjs")
  if (process.env.NODE_ENV === "production" || process.env.AF16_POSTGRES_URL !== c.url("af12")) throw Error("Explicit AF16 shared journey target required")
  return { db: new PrismaClient({ datasources: { db: { url: process.env.AF16_POSTGRES_URL } }, transactionOptions: { maxWait: 10000, timeout: 30000 } }) }
})
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs"
import { db } from "@/prisma/db"
import { getReviewWorkpaperBinder, type WorkpaperActor } from "../review-workpaper.service"
import { getAdvisoryDesk } from "../advisory-outcomes.service"
import { executeFirmPracticeCommand, getFirmPracticeDesk } from "../firm-practice.service"
const c = require("@/scripts/af16-verification-context.cjs")
afterAll(async () => db.$disconnect())
it("uses one managed engagement's reviewed workpapers and delivered advisory alongside separately authorized fee budgets", async () => {
  expect(realpathSync((await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory"))[0].data_directory).toLowerCase()).toBe(realpathSync(c.cluster).toLowerCase())
  const f = JSON.parse(readFileSync(c.output + "/AF12/browser-fixture.json", "utf8"))
  const reviewer = await db.user.findUniqueOrThrow({ where: { id: f.actors.reviewer }, include: { roles: true } })
  expect(reviewer.organizationId).toBe(f.firm)
  const role = reviewer.roles.find(row => row.organizationId === f.firm)!
  const permissions = [...new Set([...role.permissions, "finance.profitability.read"])]
  await db.role.update({ where: { id: role.id }, data: { permissions } })
  const session = await db.session.findFirstOrThrow({ where: { userId: reviewer.id }, orderBy: { createdAt: "desc" } })
  await db.session.update({ where: { id: session.id }, data: { assuranceVerifiedAt: new Date() } })
  const actor: WorkpaperActor = { homeOrganizationId: f.firm, actorId: reviewer.id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  const scope = { clientOrganizationId: f.client, periodId: f.periodId, engagementId: f.engagementId }
  const workpaperScope = { clientOrganizationId: f.client, periodId: f.periodId }
  const binder = await getReviewWorkpaperBinder(actor, workpaperScope), advisory = await getAdvisoryDesk(actor, scope)
  expect(advisory.revisions.some(row => row.state === "DELIVERED")).toBe(true)
  for (const [currency, amount] of [["XAF", "90000.00"], ["EUR", "150.00"]]) {
    await executeFirmPracticeCommand(actor, { ...scope, command: "SAVE", recordKey: `fee:${currency}`, payload: { kind: "FEE", currency, amount }, expectedVersion: 0, idempotencyKey: `af16-shared-fee-${currency}`, reason: "Synthetic cross-phase planning budget" })
  }
  const practice = await getFirmPracticeDesk(actor, { cohort: [scope], mode: "manager", includeEconomics: true })
  expect(practice.cohorts[0].summary.economics.map(row => row.currency)).toEqual(["EUR", "XAF"])
  expect((await getReviewWorkpaperBinder(actor, workpaperScope)).sourceHash).toBe(binder.sourceHash)
  expect((await getAdvisoryDesk(actor, scope)).sourceHash).toBe(advisory.sourceHash)
  const output = c.output + "/AF13/shared-browser"; mkdirSync(output, { recursive: true })
  writeFileSync(output + "/browser-fixture.json", JSON.stringify(f, null, 2))
  writeFileSync(c.output + "/shared-journey.json", JSON.stringify({ synthetic: true, scope, sourceHash: binder.sourceHash, advisorySourceHash: advisory.sourceHash, retainedDelivery: true, currencies: ["EUR", "XAF"], financialSourceUnchanged: true, scopeNote: "Reuses AF12's independently reviewed synthetic support and managed engagement; adds AF13 planning records only." }, null, 2))
})
