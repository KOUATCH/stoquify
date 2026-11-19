import { defineConfig } from "prisma/config"
import { resolve } from "node:path"
// Isolated generator/validation config. No dotenv import, seed or migration runner.
export default defineConfig({ schema: resolve(process.cwd(), "prisma/schema.prisma") })
