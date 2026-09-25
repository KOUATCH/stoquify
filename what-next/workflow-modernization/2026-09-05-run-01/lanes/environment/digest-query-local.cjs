const helper = require('./registration-local.cjs'), path = require('node:path'), http = require('node:http');
async function main() {
  await helper.withClient(helper.targetUrl(), helper.assertOwned);
  const next = require('next');
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3111, dir: helper.root });
  await app.prepare();
  const server = http.createServer(app.getRequestHandler());
  server.listen(3111, '127.0.0.1', () => console.log('Owned Digest query-failure server ready'));
  process.on('SIGTERM', () => server.close(() => app.close().finally(() => process.exit(0))));
}
main().catch(error => { console.error(String(error.message).replaceAll(process.env.DATABASE_URL || 'NO_DATABASE', '[database]')); process.exitCode = 1; });
