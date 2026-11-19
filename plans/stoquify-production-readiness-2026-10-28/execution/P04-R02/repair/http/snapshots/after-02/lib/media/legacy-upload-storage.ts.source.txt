import { constants, promises as fs } from "node:fs"
import path from "node:path"

export function isLegacyUploadComponent(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value) && !value.includes("..") &&
    !value.endsWith(".") && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)
}

// Runtime directories are operator-owned, never writable by tenant upload APIs.
// Refuse known links in every ancestor; this is not a hostile-local-process sandbox.
async function assertPlainDirectory(directory: string): Promise<void> {
  const parent = path.dirname(directory)
  if (parent !== directory) await assertPlainDirectory(parent)
  const stat = await fs.lstat(directory)
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Unsafe legacy upload storage")
}

export async function readLegacyUpload(organizationId: string, fileName: string): Promise<Buffer> {
  if (!isLegacyUploadComponent(organizationId) || !isLegacyUploadComponent(fileName)) {
    throw new Error("Invalid legacy upload path")
  }
  let storage = path.resolve(process.cwd(), ".private", "uploads")
  // Local source compatibility only. Production must never recover a missing private
  // asset from public/, including when an old artifact was packaged incorrectly.
  if (process.env.NODE_ENV !== "production") {
    try { await fs.lstat(storage) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      storage = path.resolve(process.cwd(), "public", "uploads")
    }
  }
  const directory = path.join(storage, organizationId)
  await assertPlainDirectory(directory)
  const filename = path.join(directory, fileName)
  const before = await fs.lstat(filename)
  if (before.isSymbolicLink() || !before.isFile()) throw new Error("Unsafe legacy upload asset")
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
  try {
    const opened = await handle.stat()
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error("Legacy upload asset changed")
    }
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}
