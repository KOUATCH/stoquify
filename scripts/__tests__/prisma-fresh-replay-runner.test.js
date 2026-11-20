const path = require("path")

const {
  parseArgs,
  runFreshReplay,
} = require("../prisma-fresh-replay-runner")

describe("Prisma fresh replay runner", () => {
  it("requires an explicit replay-only database name", () => {
    expect(() => parseArgs([])).toThrow(/--database is required/)
    expect(() =>
      parseArgs(["--database", "stoquify_local_existing"]),
    ).toThrow(/stoquify_replay/)
    expect(
      parseArgs(["--database", "stoquify_replay_control_plane"]),
    ).toMatchObject({
      mode: "create",
      databaseName: "stoquify_replay_control_plane",
    })
    expect(() =>
      parseArgs([
        "--mode",
        "unsafe",
        "--database",
        "stoquify_replay_control_plane",
      ]),
    ).toThrow(/create or certify-existing/)
  })

  it("creates once, deploys twice, certifies, and retains no URL", async () => {
    const calls = []
    const target = new URL(
      "postgresql://user:secret@localhost:5432/stoquify_replay_control_plane",
    )
    const report = await runFreshReplay(
      {
        root: path.resolve("."),
        mode: "create",
        databaseName: "stoquify_replay_control_plane",
        out: "what-next/test.md",
        jsonOut: "what-next/test.json",
      },
      {
        loadDatabaseUrl: () =>
          "postgresql://user:secret@localhost:5432/source",
        resolveTarget: () => target,
        createNewDatabase: async (_target, name) =>
          calls.push(["create", name]),
        deployMigrations: () => calls.push(["deploy"]),
        runner: (_command, args, options) => {
          calls.push(["certify", args, options.env])
          return { status: 0 }
        },
      },
    )

    expect(calls.filter(([kind]) => kind === "create")).toHaveLength(1)
    expect(calls.filter(([kind]) => kind === "deploy")).toHaveLength(2)
    expect(calls.filter(([kind]) => kind === "certify")).toHaveLength(1)
    expect(report).toEqual({
      status: "ready",
      mode: "create",
      databaseName: "stoquify_replay_control_plane",
      deployCount: 2,
      certificationStatus: "passed",
      databaseUrlRetained: false,
    })
    expect(JSON.stringify(report)).not.toContain("secret")
  })

  it("certifies an existing replay database without creating or deploying", async () => {
    const calls = []
    const target = new URL(
      "postgresql://user:secret@localhost:5432/stoquify_replay_control_plane",
    )
    const report = await runFreshReplay(
      {
        root: path.resolve("."),
        mode: "certify-existing",
        databaseName: "stoquify_replay_control_plane",
        out: "what-next/test.md",
        jsonOut: "what-next/test.json",
      },
      {
        loadDatabaseUrl: () =>
          "postgresql://user:secret@localhost:5432/source",
        resolveTarget: () => target,
        createNewDatabase: async () => calls.push(["create"]),
        deployMigrations: () => calls.push(["deploy"]),
        runner: () => {
          calls.push(["certify"])
          return { status: 0 }
        },
      },
    )

    expect(calls).toEqual([["certify"]])
    expect(report).toMatchObject({
      status: "ready",
      mode: "certify-existing",
      deployCount: 0,
      certificationStatus: "passed",
      databaseUrlRetained: false,
    })
  })
})
