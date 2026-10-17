// This guard is loaded only by the disposable-clone smoke server child.
// Stop copied outbox/provider configuration from opening any external socket.
const net = require("node:net")
const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const values = Array.isArray(args[0]) ? args[0] : args
  const first = values[0]
  const options = first && typeof first === "object" ? first : null
  const host = String(options?.host || (typeof values[1] === "string" ? values[1] : "localhost"))
    .toLowerCase().replace(/^\[|\]$/g, "")
  if (options?.path || (typeof first === "string" && !/^\d+$/.test(first)) ||
      !["localhost", "127.0.0.1", "::1"].includes(host)) {
    const error = new Error("External network disabled for isolated restore smoke")
    error.code = "ERR_SMOKE_EXTERNAL_NETWORK_DISABLED"
    throw error
  }
  return originalConnect.apply(this, args)
}
