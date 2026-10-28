const fs = require("fs")
const path = require("path")

function tempPathFor(target) {
  const directory = path.dirname(target)
  const base = path.basename(target)
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return path.join(directory, `.${base}.${nonce}.tmp`)
}

function cleanupTemp(tempPath, fsImpl) {
  try {
    if (fsImpl.existsSync(tempPath)) fsImpl.unlinkSync(tempPath)
  } catch {
    // Best-effort cleanup only; the write failure below is the useful signal.
  }
}

function writeGeneratedReportFile(target, content, encoding = "utf8", fsImpl = fs) {
  const resolvedTarget = path.resolve(target)
  const directory = path.dirname(resolvedTarget)
  fsImpl.mkdirSync(directory, { recursive: true })

  const tempPath = tempPathFor(resolvedTarget)
  try {
    fsImpl.writeFileSync(tempPath, content, encoding)
    try {
      fsImpl.renameSync(tempPath, resolvedTarget)
    } catch (renameError) {
      try {
        fsImpl.copyFileSync(tempPath, resolvedTarget)
        cleanupTemp(tempPath, fsImpl)
      } catch (copyError) {
        cleanupTemp(tempPath, fsImpl)
        const error = new Error(
          `Unable to replace generated report ${resolvedTarget}: ${copyError.message || renameError.message}`,
        )
        error.cause = copyError
        throw error
      }
    }
  } catch (error) {
    cleanupTemp(tempPath, fsImpl)
    throw error
  }
}

module.exports = {
  writeGeneratedReportFile,
}
