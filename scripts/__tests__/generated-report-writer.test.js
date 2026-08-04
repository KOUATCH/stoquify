const fs = require("fs")
const os = require("os")
const path = require("path")

const { writeGeneratedReportFile } = require("../generated-report-writer")

describe("generated report writer", () => {
  it("replaces an existing generated report through a same-directory temp file", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "generated-report-writer-"))
    const target = path.join(root, "what-next", "api-route-guard-inventory.json")

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, "old", "utf8")

    writeGeneratedReportFile(target, "new", "utf8")

    expect(fs.readFileSync(target, "utf8")).toBe("new")
    expect(fs.readdirSync(path.dirname(target)).filter((name) => name.endsWith(".tmp"))).toEqual([])
  })

  it("falls back to copy when replacing the generated report cannot rename over the target", () => {
    const files = new Map()
    const target = path.resolve("what-next/api-route-guard-inventory.json")
    const fsImpl = {
      mkdirSync: jest.fn(),
      writeFileSync: jest.fn((file, content) => files.set(file, content)),
      renameSync: jest.fn(() => {
        const error = new Error("UNKNOWN: unknown error, rename")
        error.code = "UNKNOWN"
        throw error
      }),
      copyFileSync: jest.fn((source, destination) => files.set(destination, files.get(source))),
      unlinkSync: jest.fn((file) => files.delete(file)),
      existsSync: jest.fn((file) => files.has(file)),
    }

    writeGeneratedReportFile(target, "fresh report", "utf8", fsImpl)

    expect(fsImpl.renameSync).toHaveBeenCalled()
    expect(fsImpl.copyFileSync).toHaveBeenCalled()
    expect(files.get(target)).toBe("fresh report")
    expect(Array.from(files.keys()).filter((file) => file.endsWith(".tmp"))).toEqual([])
  })
})
