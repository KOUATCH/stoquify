// Inspect only the two explicitly owned local listener addresses after shutdown.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net')
const target = JSON.parse(fs.readFileSync(path.join(__dirname, 'DATABASE_TARGET.json'), 'utf8'))
function probe(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(2000)
    socket.once('connect', () => { socket.destroy(); resolve({ port, listenerOpen: true }) })
    socket.once('error', error => resolve({ port, listenerOpen: false, code: error.code }))
    socket.once('timeout', () => { socket.destroy(); resolve({ port, unknown: true }) })
  })
}
async function main() {
  const listeners = await Promise.all([probe(3187), probe(target.port)])
  const stop = JSON.parse(fs.readFileSync(path.join(__dirname, 'pg-stop.execution.json'), 'utf8'))
  const result = { utc: new Date().toISOString(), application: 'Owned exec session 66450 intentionally interrupted after browser completion; exit 1 is shutdown, not a test result', databaseStopExit: stop.exit, listeners, retainedDirectory: target.directory, dataRetained: fs.existsSync(target.directory), deletedCustomerData: false }
  result.success = stop.exit === 0 && listeners.every(l => l.code === 'ECONNREFUSED')
  fs.writeFileSync(path.join(__dirname, 'CLEANUP.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result)); if (!result.success) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
