import "dotenv/config"
import { defineConfig } from "prisma/config"

const seedCommand =
  'ts-node -r tsconfig-paths/register --compiler-options {"module":"CommonJS","moduleResolution":"node"} prisma/comprehensive-seed.ts'

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: seedCommand,
  },
})
