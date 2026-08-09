import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"

const authStatePath =
  process.env.PLAYWRIGHT_INVENTORY_ITEMS_STORAGE_STATE ??
  "playwright/.auth/inventory-items.json"
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "inventory-item-create-edit-2026-08-07",
)

test.setTimeout(120_000)

test("removes the inventory item E2E tenants and records zero residue", () => {
  try {
    const output = execFileSync(
      process.execPath,
      ["scripts/inventory-items-e2e-fixture.js", "cleanup"],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
      },
    )
    const result = JSON.parse(output) as {
      mode: string
      organizations: number
      users: number
      items: number
    }
    const passed =
      result.mode === "cleanup" &&
      result.organizations === 0 &&
      result.users === 0 &&
      result.items === 0

    mkdirSync(evidenceDir, { recursive: true })
    writeFileSync(
      join(evidenceDir, "cleanup.json"),
      `${JSON.stringify(
        {
          status: passed ? "PASS" : "FAIL",
          checkedAt: new Date().toISOString(),
          fixtureSource: "scripts/inventory-items-e2e-fixture.js",
          residual: {
            organizations: result.organizations,
            users: result.users,
            items: result.items,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    )

    expect(passed).toBe(true)
  } finally {
    if (existsSync(authStatePath)) rmSync(authStatePath)
  }
})
