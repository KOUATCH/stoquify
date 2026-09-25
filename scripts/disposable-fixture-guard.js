"use strict"

// This guard performs no connection or write. Call it before constructing a client.
function assertDisposableDatabaseTarget(value, databaseNames, env = process.env) {
  if ([env.NODE_ENV, env.AQSTOQFLOW_ENV, env.VERCEL_ENV].some(value => String(value || "").toLowerCase() === "production")) {
    throw new Error("Disposable fixtures refuse production environments.")
  }
  let url
  try { url = new URL(String(value || "")) } catch { throw new Error("An explicit disposable PostgreSQL URL is required.") }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Disposable fixtures require loopback PostgreSQL.")
  }
  const database = decodeURIComponent(url.pathname.slice(1))
  if (!databaseNames.includes(database)) throw new Error("Database is not an exact reviewed disposable fixture target.")
  // Reject connection parameters that could redirect libpq to another host or database.
  for (const [key, value] of url.searchParams) {
    if (!["connection_limit", "pool_timeout", "connect_timeout", "sslmode", "schema"].includes(key) || (key === "schema" && value !== "public")) {
      throw new Error("Unreviewed disposable database connection parameter.")
    }
  }
  if (url.hash) throw new Error("Disposable database URL fragments are not supported.")
  return { url: url.toString(), database }
}

async function assertDisposableDatabaseIdentity(prisma, expectedDatabase) {
  const rows = await prisma.$queryRaw`SELECT current_database() AS name`
  if (rows[0]?.name !== expectedDatabase) throw new Error("Connected disposable database identity does not match the reviewed target.")
}

module.exports = { assertDisposableDatabaseTarget, assertDisposableDatabaseIdentity }
