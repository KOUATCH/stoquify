const h = require('./registration-local.cjs');
h.withClient(h.targetUrl(), async client => {
  await h.assertOwned(client);
  const result = await client.query("SELECT pid,state,wait_event_type,wait_event,extract(epoch from (now()-xact_start))::integer AS transaction_age_seconds,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() ORDER BY pid");
  console.log(JSON.stringify({ at: new Date().toISOString(), sessions: result.rows }));
}).catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
