const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
const name = "stoquify_local_ui_workflow_guard_test"
const environment = (url = "postgresql://synthetic:unused@127.0.0.1:5432/application?schema=private") => ({ DATABASE_URL: url, NODE_ENV: "test" })

it("derives a distinct named local database and pins the public test schema", () => {
  const target = resolveWorkflowTestTarget(name, environment())
  expect(target.pathname).toBe(`/${name}`)
  expect(target.hostname).toBe("127.0.0.1")
  expect(target.searchParams.get("schema")).toBe("public")
  expect(target.searchParams.get("connection_limit")).toBe("5")
})
it.each(["application", "public", "stoquify_local_ui_workflow_../../application", "stoquify_local_ui_workflow_x;DROP DATABASE application", undefined])("rejects invalid target name %s", value => {
  expect(() => resolveWorkflowTestTarget(value, environment())).toThrow("named local UI workflow")
})
it.each(["postgresql://synthetic:unused@remote.invalid/application", "postgresql://synthetic:unused@localhost.evil.invalid/application", "https://localhost/application"])("rejects non-local/non-PostgreSQL sources", url => {
  expect(() => resolveWorkflowTestTarget(name, environment(url))).toThrow("local PostgreSQL")
})
it("rejects the current application database even if its name has the test prefix", () => {
  expect(() => resolveWorkflowTestTarget(name, environment(`postgresql://synthetic:unused@localhost/${name}`))).toThrow("application database")
})
it("refuses production mode", () => {
  expect(() => resolveWorkflowTestTarget(name, { ...environment(), NODE_ENV: "production" })).toThrow()
})
