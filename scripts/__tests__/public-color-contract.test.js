const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

describe("public color contract", () => {
  const globals = read("app/globals.css")
  const landing = read("app/[locale]/(home)/landing.css")
  const authLayout = read("components/auth/AuthLayout.tsx")

  it("keeps dashboard, landing, and auth on the canonical product brand", () => {
    expect(globals).toContain("--product-brand: #2f7df6;")
    expect(globals).toContain("--dash-brand: var(--product-brand);")
    expect(globals).toContain("--auth-brand: var(--product-brand);")
    expect(landing).toContain("--color-brand: var(--product-brand);")
    expect(authLayout).toContain("auth-shell")
  })

  it.each([
    ["success", "success"],
    ["warning", "warning"],
    ["danger", "danger"],
    ["info", "info"],
  ])("maps public %s to the shared %s semantic token", (publicName, productName) => {
    expect(landing).toContain(`--color-${publicName}: var(--product-${productName});`)
  })

  it("uses the accessible action shade for public primary calls to action", () => {
    expect(globals).toContain("--product-brand-action: #2563eb;")
    expect(landing).toContain("--color-brand-action: var(--product-brand-action);")
    expect(read("components/landing/hero.tsx")).toContain("bg-[var(--color-brand-action)]")
    expect(read("components/landing/landing-header.tsx")).toContain("bg-[var(--color-brand-action)]")
  })

  it("does not restore the retired green landing brand or canvas", () => {
    expect(landing).not.toContain("#278f82")
    expect(landing).not.toContain("#07110f")
  })
})