/** @jest-environment node */
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { validate, hashText, repositoryFile } = require("../verify-agent-workflow-contract")

let root, registry, scripts
function save() {
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts }))
  fs.writeFileSync(path.join(root, "docs/ecc/command-registry.json"), JSON.stringify(registry))
}
function entry(script, auditAllowed = true) {
  return { script, auditAllowed, reason: "Reviewed fixture", lifecycle: { pre: null, post: null }, files: { "runner.js": hashText("// inspected runner\n") } }
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-workflow-contract-"))
  fs.mkdirSync(path.join(root, "docs/ecc"), { recursive: true })
  fs.writeFileSync(path.join(root, "runner.js"), "// inspected runner\n")
  fs.writeFileSync(path.join(root, "WORKFLOW.md"), "Project workflow")
  scripts = { check: "node runner.js", build: "prisma migrate deploy" }
  registry = { schemaVersion: 1, requiredReferences: ["WORKFLOW.md"], commands: { check: entry(scripts.check), build: entry(scripts.build, false) } }
  save()
})
afterEach(() => {
  // Only remove the exact temporary fixture allocated by this test.
  if (!root.startsWith(path.join(os.tmpdir(), "stoquify-workflow-contract-"))) throw new Error("Unexpected fixture root")
  fs.rmSync(root, { recursive: true, force: true })
})

test("accepts the reviewed lane and returns classification without executing it", () => {
  const marker = path.join(root, "executed.txt")
  const source = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')`
  fs.writeFileSync(path.join(root, "runner.js"), source)
  registry.commands.check.files["runner.js"] = hashText(source)
  registry.commands.build.files["runner.js"] = hashText(source)
  save()
  expect(validate(root, "check")).toMatchObject({ ok: true, classification: { auditAllowed: true } })
  expect(fs.existsSync(marker)).toBe(false)
})
test("rejects command text drift even if the executable name is unchanged", () => {
  scripts.check += " --write"
  save()
  expect(validate(root).errors).toContain("Script drift or missing command: check")
})
test("unknown new commands remain outside the manifest and cannot be selected", () => {
  scripts.newcheck = "node runner.js"
  save()
  expect(validate(root)).toMatchObject({ ok: true, unclassifiedCount: 1 })
  expect(validate(root, "newcheck").errors.join("\n")).toContain("Unclassified command")
})
test.each(["pre", "post"])("rejects an added %s lifecycle hook", phase => {
  scripts[phase + "check"] = "node dangerous.js"
  save()
  expect(validate(root).errors).toContain(`Lifecycle drift: ${phase}check`)
})
test("copying a hook into an audit entry does not approve the hook", () => {
  scripts.precheck = "node dangerous.js"
  registry.commands.check.lifecycle.pre = scripts.precheck
  save()
  expect(validate(root).errors.join("\n")).toContain("unapproved lifecycle hook")
})
test("rejects delegated helper drift and missing files", () => {
  fs.writeFileSync(path.join(root, "runner.js"), "// changed behavior\n")
  expect(validate(root).errors.join("\n")).toContain("Reviewed file drift")
  fs.unlinkSync(path.join(root, "runner.js"))
  expect(validate(root).ok).toBe(false)
})
test("normalizes checkout line endings without accepting content changes", () => {
  fs.writeFileSync(path.join(root, "runner.js"), "// inspected runner\r\n")
  expect(validate(root).ok).toBe(true)
})
test("prohibits migration-bearing commands in audit mode", () => {
  expect(validate(root, "build")).toMatchObject({ ok: false, classification: { auditAllowed: false } })
})
test.each(["npm run unknown", "npm run build", "npm test"])("rejects unreviewed delegated chain %s", script => {
  scripts.check = script
  registry.commands.check.script = script
  save()
  expect(validate(root).errors.join("\n")).toContain("Unreviewed or prohibited npm dependency")
})
test("checks lifecycle drift on an explicitly reviewed delegated command", () => {
  scripts.parent = "npm run check"
  registry.commands.parent = entry(scripts.parent)
  scripts.postcheck = "node extra.js"
  save()
  expect(validate(root, "parent").ok).toBe(false)
})
test("missing workflow references fail", () => {
  fs.unlinkSync(path.join(root, "WORKFLOW.md"))
  expect(validate(root).errors.join("\n")).toContain("Required reference WORKFLOW.md")
})
test.each(["../outside", "C:/outside", "/outside", "docs/../WORKFLOW.md", "docs\\ecc\\file"])("rejects noncanonical reference %s", reference => {
  registry.requiredReferences = [reference]
  save()
  expect(validate(root).ok).toBe(false)
})
test("rejects a directory in place of a required file", () => {
  expect(() => repositoryFile(root, "docs")).toThrow("not a file")
})
test("rejects prototype property names as commands", () => {
  expect(validate(root, "constructor").ok).toBe(false)
})
test("malformed registry fails closed", () => {
  fs.writeFileSync(path.join(root, "docs/ecc/command-registry.json"), "{")
  expect(validate(root).ok).toBe(false)
})
test("null classifications fail without crashing the read-only API", () => {
  registry.commands.check = null
  save()
  expect(validate(root, "check").ok).toBe(false)
})
