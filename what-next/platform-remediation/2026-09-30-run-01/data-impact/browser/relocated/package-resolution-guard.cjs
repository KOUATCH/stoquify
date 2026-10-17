const Module = require("node:module"), fs = require("node:fs"), path = require("node:path")
const root = fs.realpathSync(process.env.SMOKE_PACKAGE_ROOT)
const builtin = request => Module.isBuiltin(request)
const inside = filename => {
  const relative = path.relative(root, fs.realpathSync(filename))
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}
const resolve = Module._resolveFilename
Module.globalPaths.splice(0)
Module._resolveFilename = function (request, ...args) {
  const result = resolve.call(this, request, ...args)
  if (!builtin(result) && !inside(result)) {
    const error = new Error("Application dependency resolved outside relocated package")
    error.code = "ERR_SMOKE_RESOLUTION_OUTSIDE_PACKAGE"
    throw error
  }
  return result
}
