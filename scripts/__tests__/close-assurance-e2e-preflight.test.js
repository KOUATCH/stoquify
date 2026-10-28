const {
  buildPayload,
  classifyConnection,
  redactedConnection,
} = require("../close-assurance-e2e-preflight")

describe("close-assurance-e2e-preflight", () => {
  it("allows local database URLs and redacts passwords", () => {
    const raw = "postgresql://user:secret@127.0.0.1:5432/stoquify_dev"

    expect(classifyConnection(raw)).toMatchObject({
      present: true,
      safe: true,
      hostClass: "local",
      databaseName: "stoquify_dev",
    })
    expect(redactedConnection(raw)).toBe(
      "postgresql://user:***@127.0.0.1:5432/<database>",
    )
    expect(redactedConnection(raw)).not.toContain("secret")
  })

  it("blocks remote database URLs without explicit override", () => {
    expect(
      classifyConnection("postgresql://user:secret@db.example.com:5432/app"),
    ).toMatchObject({
      safe: false,
      hostClass: "remote",
    })
  })

  it("blocks production environment markers", () => {
    const payload = buildPayload(
      { mode: "fail", allowRemote: false },
      {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:secret@localhost:5432/stoquify_dev",
      },
    )

    expect(payload.ok).toBe(false)
    expect(payload.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "environment:not-production", ok: false }),
      ]),
    )
  })
})