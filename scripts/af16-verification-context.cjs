const path = require('node:path')
const root = path.resolve(__dirname, '..')
const privateRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const output = path.join(root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-25-run-01')
const cluster = path.join(privateRoot, 'af16-postgres')
const database = suffix => {
  if (!/^[a-z0-9_]+$/.test(suffix)) throw Error('Invalid owned target suffix')
  return `stoquify_local_af16_20261025_${suffix}_r1`
}
const url = suffix => `postgresql://af16@127.0.0.1:55451/${database(suffix)}`
async function guard(client) {
  const fs = require('node:fs')
  if (process.env.NODE_ENV === 'production') throw Error('Production is forbidden')
  const actual = (await client.query('SHOW data_directory')).rows[0].data_directory
  if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error('Wrong owned AF16 cluster')
}
module.exports = { root, privateRoot, output, cluster, database, url, guard }
