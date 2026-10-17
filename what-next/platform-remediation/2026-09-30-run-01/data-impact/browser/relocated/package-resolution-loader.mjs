import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
const root = fs.realpathSync(process.env.SMOKE_PACKAGE_ROOT)
function check(url) {
  if (url.startsWith("node:")) return
  let inside = false
  if (url.startsWith("file:")) {
    const relative = path.relative(root, fs.realpathSync(fileURLToPath(url)))
    inside = relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
  }
  if (!inside) {
    const error = new Error("ES module resolved outside relocated package")
    error.code = "ERR_SMOKE_ESM_OUTSIDE_PACKAGE"
    throw error
  }
}
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context)
  check(result.url)
  return result
}
export async function load(url, context, nextLoad) {
  check(url)
  return nextLoad(url, context)
}
