import { defineConfig } from "prisma/config"
// Explicit config prevents the application's dotenv-config loader from running.
export default defineConfig({schema: "../../../prisma/schema.prisma"})
