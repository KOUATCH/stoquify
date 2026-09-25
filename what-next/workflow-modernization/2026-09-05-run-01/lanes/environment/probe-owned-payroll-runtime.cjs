const f = require('./statement-recipient-fixtures.cjs');
(async () => {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const started = Date.now();
  await f.db.$queryRawUnsafe('SELECT 1');
  const waits = await f.db.$queryRawUnsafe("SELECT state, wait_event_type, count(*)::int AS connections FROM pg_stat_activity WHERE datname = current_database() GROUP BY state, wait_event_type");
  console.log(JSON.stringify({ ownedDatabase: f.target.pathname.slice(1), readMs: Date.now() - started, waits }));
})().catch(error => { console.error(f.safe(error)); process.exitCode = 1; }).finally(() => f.db.$disconnect());
