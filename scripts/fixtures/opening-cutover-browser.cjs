// Add credentials only to the retained synthetic AF10 journey actors.
const fs = require("node:fs"), path = require("node:path"), { randomBytes } = require("node:crypto")
const { PrismaClient } = require("../../.codex-tmp/af10-prisma/client"), argon2 = require("argon2")
const base = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993"
const name = "stoquify_local_af10_20261020_r1", url = `postgresql://af01@127.0.0.1:55449/${name}?connection_limit=5`
const source = JSON.parse(fs.readFileSync("docs/accounting-firms/roadmap-2026-10-19/execution/AF10/2026-10-20-run-01/browser-fixture.json", "utf8"))
async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Production forbidden")
  const db = new PrismaClient({ datasources: { db: { url } } })
  try {
    const actual = (await db.$queryRawUnsafe("SHOW data_directory"))[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(path.join(base, "af01-host/af01-postgres")).toLowerCase()) throw Error("Wrong cluster")
    const password = randomBytes(24).toString("base64url"), hash = await argon2.hash(password)
    for (const [role, id] of Object.entries(source.actors)) {
      if (!id.startsWith("af10-")) throw Error("Non-synthetic actor")
      const user = await db.user.findUniqueOrThrow({ where: { id } })
      if (![source.client, source.firm].includes(user.organizationId) || !user.email.endsWith("@example.invalid")) throw Error("Wrong synthetic actor scope")
      await db.user.update({ where: { id }, data: { password: hash, firstName: role, lastName: "Synthetic" } })
      await db.account.upsert({ where: { id: id + "-credential" }, create: { id: id + "-credential", accountId: id, userId: id, providerId: "credential", password: hash }, update: { password: hash } })
    }
    fs.writeFileSync(path.join(base, "af10-browser-private.json"), JSON.stringify({ url, name, password, base: "http://127.0.0.1:3150" }))
    console.log("Prepared synthetic AF10 credentials; secrets retained only in the task-private directory.")
  } finally { await db.$disconnect() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
