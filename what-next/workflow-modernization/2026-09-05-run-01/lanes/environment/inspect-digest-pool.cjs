const h = require('./registration-local.cjs');
h.withClient(h.targetUrl(), async client => {
  await h.assertOwned(client);
  console.log(JSON.stringify({ maxConnections: (await client.query('SHOW max_connections')).rows, connections: (await client.query('SELECT datname, application_name, state, count(*)::int AS count FROM pg_stat_activity GROUP BY datname, application_name, state ORDER BY count(*) DESC')).rows }));
}).catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
