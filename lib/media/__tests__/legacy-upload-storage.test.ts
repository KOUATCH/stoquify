import { promises as fs } from "node:fs"
import path from "node:path"
import { isLegacyUploadComponent, readLegacyUpload } from "../legacy-upload-storage"

const workspace = process.cwd()
const fixtureParent = path.resolve(workspace, ".codex-tmp")
const privateBytes = Buffer.from("synthetic-private-legacy-image")
const publicBytes = Buffer.from("synthetic-stale-public-image")
let fixture: string
let originalNodeEnv: string | undefined

async function write(relative: string, bytes: Buffer) {
  const target = path.resolve(fixture, relative)
  if (!target.startsWith(fixture + path.sep)) throw new Error("Test fixture path escaped")
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, bytes)
}

describe("legacy upload storage", () => {
  beforeEach(async () => {
    await fs.mkdir(fixtureParent, { recursive: true })
    fixture = await fs.mkdtemp(path.join(fixtureParent, "p04-r02-unit-"))
    originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    jest.spyOn(process, "cwd").mockReturnValue(fixture)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    // Tiny synthetic fixtures remain under the owned ignored root for review.
  })

  it("reads the private runtime asset, even when stale public bytes also exist", async () => {
    await write(".private/uploads/org-1/item.png", privateBytes)
    await write("public/uploads/org-1/item.png", publicBytes)
    expect(await readLegacyUpload("org-1", "item.png")).toEqual(privateBytes)
  })

  it("never falls back to public in production when the private root is absent", async () => {
    await write("public/uploads/org-1/item.png", publicBytes)
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("never falls back to public in production when only the private file is absent", async () => {
    await fs.mkdir(path.join(fixture, ".private/uploads/org-1"), { recursive: true })
    await write("public/uploads/org-1/item.png", publicBytes)
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("supports guarded source-tree reads in development", async () => {
    process.env.NODE_ENV = "development"
    await write("public/uploads/org-1/item.png", publicBytes)
    expect(await readLegacyUpload("org-1", "item.png")).toEqual(publicBytes)
  })

  it("does not resurrect a missing private asset from public when private storage exists in development", async () => {
    process.env.NODE_ENV = "development"
    await fs.mkdir(path.join(fixture, ".private/uploads/org-1"), { recursive: true })
    await write("public/uploads/org-1/item.png", publicBytes)
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toMatchObject({ code: "ENOENT" })
  })

  test.each(["", "..", "../org", "org/other", "org\\other", "org:stream", "org.", "CON", "LPT1.png"])("rejects invalid components before touching storage: %s", async value => {
    const lstat = jest.spyOn(fs, "lstat")
    expect(isLegacyUploadComponent(value)).toBe(false)
    await expect(readLegacyUpload(value, "item.png")).rejects.toThrow("Invalid legacy upload path")
    await expect(readLegacyUpload("org-1", value)).rejects.toThrow("Invalid legacy upload path")
    expect(lstat).not.toHaveBeenCalled()
  })

  test.each([".private", ".private/uploads", ".private/uploads/org-1"])("refuses real directory junction at %s", async relative => {
    const destination = path.join(fixture, relative)
    const backing = path.join(fixture, "link-target")
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.mkdir(backing, { recursive: true })
    await fs.symlink(backing, destination, process.platform === "win32" ? "junction" : "dir")
    await write(".private/uploads/org-1/item.png", privateBytes)
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toThrow("Unsafe legacy upload storage")
  })

  it("refuses a directory masquerading as an image", async () => {
    await fs.mkdir(path.join(fixture, ".private/uploads/org-1/item.png"), { recursive: true })
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toThrow("Unsafe legacy upload asset")
  })

  it("refuses a known file link before opening it (lstat adapter fixture)", async () => {
    await write(".private/uploads/org-1/item.png", privateBytes)
    const original = fs.lstat.bind(fs)
    const filename = path.join(fixture, ".private/uploads/org-1/item.png")
    jest.spyOn(fs, "lstat").mockImplementation((async (input: any) => {
      const stat = await original(input)
      return String(input) === filename ? { ...stat, isSymbolicLink: () => true, isFile: () => true } : stat
    }) as any)
    const open = jest.spyOn(fs, "open")
    await expect(readLegacyUpload("org-1", "item.png")).rejects.toThrow("Unsafe legacy upload asset")
    expect(open).not.toHaveBeenCalled()
  })
})
