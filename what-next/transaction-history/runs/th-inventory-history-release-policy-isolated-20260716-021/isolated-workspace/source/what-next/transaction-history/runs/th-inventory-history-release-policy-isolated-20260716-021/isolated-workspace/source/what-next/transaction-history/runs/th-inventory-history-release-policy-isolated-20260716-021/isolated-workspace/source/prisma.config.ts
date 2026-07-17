import "dotenv/config"
import { defineConfig } from "prisma/config"
const expandEnvValue = (value: string) =>
  value.replace(/\$\{([^}]+)\}/g, (_match, key: string) => process.env[key] ?? "")

if (process.env.DATABASE_URL?.includes("${")) {
  process.env.DATABASE_URL = expandEnvValue(process.env.DATABASE_URL)
}

const seedCommand =
  'ts-node -r tsconfig-paths/register --compiler-options {"module":"CommonJS","moduleResolution":"node"} prisma/comprehensive-seed.ts'

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: seedCommand,
  },
})
