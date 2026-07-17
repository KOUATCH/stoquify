const fs = require("fs")
const path = require("path")

describe("Jest and Playwright test routing", () => {
  it("keeps Playwright e2e specs out of the Jest unit suite", () => {
    const root = path.resolve(__dirname, "..", "..")
    const jestConfig = fs.readFileSync(path.join(root, "jest.config.ts"), "utf8")
    const playwrightConfig = fs.readFileSync(path.join(root, "playwright.config.ts"), "utf8")

    expect(jestConfig).toContain("'<rootDir>/tests/e2e/'")
    expect(playwrightConfig).toContain('testDir: "./tests/e2e"')
  })
})