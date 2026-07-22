import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE,
  BRANCH_DAILY_CLOSE_SIGN_OFF_STATUSES,
  isBranchDailyCloseSignOffStatus,
} from "../branch-daily-close-sign-off-contracts"

const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")
const migration = readFileSync(
  join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260718130000_branch_daily_close_sign_off_foundation",
    "migration.sql",
  ),
  "utf8",
)

function prismaBlock(kind: "enum" | "model", name: string) {
  const match = schema.match(new RegExp(`${kind} ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`Missing Prisma ${kind} ${name}`)
  return match[1]
}

describe("branch daily-close sign-off persistence foundation", () => {
  it("freezes lifecycle, assurance, active-key, and immutable evidence semantics", () => {
    expect(BRANCH_DAILY_CLOSE_SIGN_OFF_STATUSES).toEqual([
      "ACTIVE",
      "REVOKED",
      "SUPERSEDED",
    ])
    expect(BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE).toMatchObject({
      tableName: "branch_daily_close_sign_offs",
      requiredAssurance: "L1",
      freshAuthMaxAgeSeconds: 300,
      hashPrefix: "sha256:",
      hashLength: 71,
      activeKeyStrategy: "BRANCH_DAILY_CLOSE_RUN_ID",
      terminalStatuses: ["REVOKED", "SUPERSEDED"],
    })
    expect(BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE.immutableEvidenceFields).toEqual(
      expect.arrayContaining([
        "organizationId",
        "branchDailyCloseRunId",
        "signedReadinessSourceHash",
        "signedEvidenceHash",
        "signedEvidenceObservedAt",
        "signedById",
        "signedAt",
        "authAssuranceLevel",
        "freshAuthAt",
        "idempotencyKey",
        "requestHash",
        "correlationId",
      ]),
    )
    expect(isBranchDailyCloseSignOffStatus("ACTIVE")).toBe(true)
    expect(isBranchDailyCloseSignOffStatus("SIGNED")).toBe(false)
  })

  it("adds a separate tenant/run-bound sign-off history model", () => {
    const statusEnum = prismaBlock("enum", "BranchDailyCloseSignOffStatus")
    const runModel = prismaBlock("model", "BranchDailyCloseRun")
    const signOffModel = prismaBlock("model", "BranchDailyCloseSignOff")

    expect(statusEnum).toMatch(/\bACTIVE\b/)
    expect(statusEnum).toMatch(/\bREVOKED\b/)
    expect(statusEnum).toMatch(/\bSUPERSEDED\b/)
    expect(runModel).toMatch(/signOffs\s+BranchDailyCloseSignOff\[\]/)
    expect(runModel).toMatch(/@@unique\(\[organizationId, id\]\)/)
    expect(runModel).not.toMatch(/signedById|signedAt|signedEvidenceHash/)

    expect(signOffModel).toMatch(
      /organization\s+Organization\s+@relation\(fields: \[organizationId\], references: \[id\], onDelete: Restrict\)/,
    )
    expect(signOffModel).toMatch(
      /branchDailyCloseRun\s+BranchDailyCloseRun\s+@relation\(fields: \[organizationId, branchDailyCloseRunId\], references: \[organizationId, id\], onDelete: Restrict\)/,
    )
    expect(signOffModel).toMatch(/signedById\s+String/)
    expect(signOffModel).toMatch(/signedAt\s+DateTime/)
    expect(signOffModel).toMatch(/signedReadinessSourceHash\s+String\s+@db\.VarChar\(71\)/)
    expect(signOffModel).toMatch(/signedEvidenceHash\s+String\s+@db\.VarChar\(71\)/)
    expect(signOffModel).toMatch(/signedEvidenceObservedAt\s+DateTime/)
    expect(signOffModel).toMatch(/authAssuranceLevel\s+String\s+@db\.VarChar\(2\)/)
    expect(signOffModel).toMatch(/freshAuthAt\s+DateTime/)
    expect(signOffModel).toMatch(/activeKey\s+String\?\s+@db\.VarChar\(200\)/)
    expect(signOffModel).toMatch(/invalidatedById\s+String\?/)
    expect(signOffModel).toMatch(/invalidatedAt\s+DateTime\?/)
    expect(signOffModel).toMatch(/invalidationReason\s+String\?\s+@db\.VarChar\(500\)/)
    expect(signOffModel).toMatch(/supersedesSignOffId\s+String\?/)
    expect(signOffModel).toMatch(/@@unique\(\[organizationId, activeKey\]\)/)
    expect(signOffModel).toMatch(/@@unique\(\[organizationId, idempotencyKey\]\)/)
    expect(signOffModel).toMatch(/@@map\("branch_daily_close_sign_offs"\)/)
  })

  it("creates additive SQL with tenant, lifecycle, hash, and fresh-auth invariants", () => {
    expect(migration).toContain(
      `CREATE TYPE "BranchDailyCloseSignOffStatus" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED')`,
    )
    expect(migration).toContain(`CREATE TABLE "branch_daily_close_sign_offs"`)
    expect(migration).toContain(
      `CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_id_key"`,
    )
    expect(migration).toContain(
      `CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_activeKey_key"`,
    )
    expect(migration).toContain(
      `FOREIGN KEY ("organizationId", "branchDailyCloseRunId") REFERENCES "branch_daily_close_runs"("organizationId", "id")`,
    )
    expect(migration).toContain(`CONSTRAINT "branch_daily_close_sign_offs_lifecycle_check"`)
    expect(migration).toContain(`"activeKey" = "branchDailyCloseRunId"`)
    expect(migration).toContain(`CONSTRAINT "branch_daily_close_sign_offs_hash_check"`)
    expect(migration).toContain(`left("signedEvidenceHash", 7) = 'sha256:'`)
    expect(migration).toContain(`CONSTRAINT "branch_daily_close_sign_offs_assurance_check"`)
    expect(migration).toContain(`"authAssuranceLevel" = 'L1'`)
    expect(migration).toContain(`INTERVAL '300 seconds'`)
    expect(migration).toContain(`ON DELETE RESTRICT ON UPDATE CASCADE`)
    expect(migration).toMatch(
      /FOREIGN KEY \("organizationId"\) REFERENCES "organizations"\("id"\)\r?\n\s+ON DELETE RESTRICT ON UPDATE CASCADE/,
    )
  })

  it("keeps the migration non-destructive and stores no raw authentication material", () => {
    const signOffModel = prismaBlock("model", "BranchDailyCloseSignOff")

    expect(migration).not.toMatch(/\bDROP\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+"branch_daily_close_runs"\b/i)
    expect(migration).not.toMatch(
      /sessionToken|accessToken|refreshToken|password|credential|cookie|mfaSecret/i,
    )
    expect(signOffModel).not.toMatch(
      /sessionToken|accessToken|refreshToken|password|credential|cookie|mfaSecret/i,
    )
  })
})
