/** @jest-environment node */
const { assertDisposableDatabaseTarget, assertDisposableDatabaseIdentity } = require("../disposable-fixture-guard")

describe("disposable fixture database isolation", () => {
  const names = ["stoquify_pos_demo_disposable"]
  const valid = "postgresql://fixture:secret@127.0.0.1:5432/stoquify_pos_demo_disposable"

  it.each([
    undefined,
    "",
    "not a url",
    "postgresql://fixture:secret@127.0.0.1:5432/stoquify_replay_next_20260830",
    "postgresql://fixture:secret@db.example.com/stoquify_pos_demo_disposable",
    "https://localhost/stoquify_pos_demo_disposable",
    valid + "?host=remote.example.com",
    valid + "?dbname=application",
    valid + "?schema=tenant",
    valid + "#application",
  ])("rejects an unowned or redirectable target without opening a connection: %s", value => {
    expect(() => assertDisposableDatabaseTarget(value, names, {})).toThrow()
  })

  it.each(["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"])("refuses %s production even on an owned target", key => {
    expect(() => assertDisposableDatabaseTarget(valid, names, { [key]: "PRODUCTION" })).toThrow(/production/)
  })

  it("accepts only the explicit local reviewed name and harmless pool settings", () => {
    expect(assertDisposableDatabaseTarget(valid + "?connection_limit=2&schema=public", names, {})).toMatchObject({ database: names[0] })
  })

  it("checks actual database identity before admitting a write", async () => {
    const query = jest.fn().mockResolvedValue([{ name: "stoquify_replay_next_20260830" }])
    const write = jest.fn()
    await expect((async () => {
      await assertDisposableDatabaseIdentity({ $queryRaw: query }, names[0])
      write()
    })()).rejects.toThrow(/identity/)
    expect(write).not.toHaveBeenCalled()
    query.mockResolvedValue([{ name: names[0] }])
    await expect(assertDisposableDatabaseIdentity({ $queryRaw: query }, names[0])).resolves.toBeUndefined()
  })
})
