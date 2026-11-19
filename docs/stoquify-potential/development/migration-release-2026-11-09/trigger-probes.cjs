// PREPARED ONLY: root review and explicit --execute are required before use.
// Uses pg directly on the recorded new synthetic cluster. No application imports,
// dotenv, Prisma generation, authentication fabrication, DDL or guard disabling.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const dns = require('node:dns');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const qualifiedDate = '20261109';
const tables = [
  'customer_receivable_documents', 'customer_receivable_document_states',
  'customer_settlements', 'customer_settlement_allocations', 'customer_ledger_entries',
  'sales_orders', 'payments', 'customers', 'journal_entries', 'journal_entry_lines',
  'ledger_posting_batches', 'accounting_source_links', 'inventory_transactions',
  'pos_commit_results', 'close_runs', 'close_pack_exports', 'close_source_revisions',
  'close_source_changes', 'business_events', 'business_event_outbox', 'audit_logs', 'ledger_audit_events',
];
const expectedTriggers = [
  ['customer_receivable_documents', 'customer_receivable_documents_prevent_mutation_trigger', 'receivable_prevent_document_mutation'],
  ['customer_receivable_document_states', 'customer_receivable_document_states_prevent_mutation_trigger', 'receivable_prevent_state_mutation'],
  ['customer_settlement_allocations', 'customer_settlement_allocations_prevent_receivable_relink_trigger', 'receivable_prevent_allocation_relink'],
  ['journal_entries', 'journal_entries_prevent_posted_draft', 'stoquify_guard_journal_posted_status'],
  ['journal_entry_lines', 'journal_entry_lines_guard_posted_tenant', 'stoquify_guard_journal_line_boundary'],
  ['journal_entries', 'a_journal_period_write', 'guard_journal_period_write'],
  ['journal_entry_lines', 'a_journal_period_write', 'guard_journal_period_write'],
  ['accounting_periods', 'a_period_control_transition', 'guard_period_control_transition'],
  ['period_control_events', 'period_control_event_retention', 'protect_period_control_event'],
  ['pos_commit_results', 'pos_commit_results_enforce_scope_trigger', 'pos_commit_results_enforce_scope'],
  ['pos_commit_results', 'pos_commit_results_enforce_lifecycle_trigger', 'pos_commit_results_enforce_lifecycle'],
  ...['journal_entries', 'journal_entry_lines', 'ledger_posting_batches', 'accounting_source_links',
    'inventory_transactions', 'inventory_levels', 'business_events'].map(table => [table, 'close_source_revision_change', 'invalidate_close_on_source_change']),
  ['accounting_periods', 'close_source_revision_change', 'invalidate_close_on_period_change'],
];
const reversalCheck = 'customer_settlements_reversed_evidence_complete_check';

function argsFor(argv) {
  assert.equal(argv.length, 7, 'Expected --manifest FILE --workflow-evidence FILE --out NEW_FILE --execute');
  assert.equal(argv[6], '--execute', 'Database execution requires the explicit --execute flag');
  const args = {};
  for (let i = 0; i < 6; i += 2) {
    assert.ok(['--manifest', '--workflow-evidence', '--out'].includes(argv[i]), 'Unknown argument');
    assert.ok(!args[argv[i]], 'Duplicate argument');
    args[argv[i]] = path.resolve(argv[i + 1]);
  }
  for (const key of ['--manifest', '--workflow-evidence', '--out']) {
    assert.equal(path.dirname(args[key]), __dirname, 'Inputs and output must use this evidence directory');
  }
  assert.equal(path.basename(args['--manifest']), 'DATABASE_TARGET.json', 'Canonical target manifest required');
  assert.equal(path.basename(args['--workflow-evidence']), 'sales-accounting-workflow.json', 'Current POS workflow receipt required');
  assert.ok(!fs.existsSync(args['--out']), 'Refusing to overwrite retained evidence');
  return args;
}

function noLinks(absolute) {
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Linked target paths are refused');
  }
}

function loadTarget(filename) {
  const target = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const owned = fs.realpathSync(path.join(root, '.codex-tmp'));
  const directory = path.resolve(target.directory || '');
  noLinks(directory);
  assert.equal(path.dirname(fs.realpathSync(directory)), owned, 'Cluster must be a direct owned workspace child');
  assert.match(path.basename(directory), /^sales-release-migrations-20261109-[a-f0-9]{10}$/);
  assert.equal(target.clusterDirectory, directory);
  assert.equal(target.host, 'localhost');
  assert.equal(target.user, 'sales_release_fixture');
  assert.ok(Number.isSafeInteger(target.port) && target.port > 1023 && target.port < 65536, 'Invalid owned port');
  assert.match(target.posDatabase || '', /^stoquify_pos_audit_20261109_[a-f0-9]{10}$/);
  assert.match(target.freshDatabase || '', /^stoquify_replay_20261109_[a-f0-9]{10}$/);
  const suffix = path.basename(directory).slice(-10);
  assert.ok(target.posDatabase.endsWith(suffix) && target.freshDatabase.endsWith(suffix), 'Target identities must share the owned suffix');
  const dataDirectory = path.join(directory, 'data');
  noLinks(dataDirectory);
  return { ...target, directory, dataDirectory };
}

async function identity(client, target) {
  const { rows: [actual] } = await client.query(`SELECT current_database() AS database, current_user AS actor,
    current_setting('data_directory') AS directory, inet_server_port() AS port,
    host(inet_server_addr()) AS address, current_setting('session_replication_role') AS replication_role`);
  assert.equal(actual.database, target.posDatabase);
  assert.equal(actual.actor, target.user);
  assert.equal(actual.port, target.port);
  assert.ok(['127.0.0.1', '::1'].includes(actual.address), 'Server must be loopback');
  assert.equal(fs.realpathSync(actual.directory).toLowerCase(), fs.realpathSync(target.dataDirectory).toLowerCase());
  assert.equal(actual.replication_role, 'origin', 'Original triggers must be enabled');
  const { rows: history } = await client.query(`SELECT migration_name, checksum FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`);
  assert.equal(history.length, 121, 'Changed migration boundary requires review');
  const { rows: [failed] } = await client.query(`SELECT count(*)::integer AS count FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL`);
  assert.equal(failed.count, 0, 'Unfinished migration history is not qualified');
  return { database: actual.database, actor: actual.actor, host: target.host, address: actual.address,
    port: actual.port, schema: 'public', dataDirectory: target.dataDirectory,
    replicationRole: actual.replication_role, migrationCount: history.length, migrationHistorySha256: hash(JSON.stringify(history)) };
}

async function inventory(client) {
  const { rows: [limits] } = await client.query('SHOW max_identifier_length');
  const identifierBytes = Number(limits.max_identifier_length);
  assert.ok(Number.isSafeInteger(identifierBytes) && identifierBytes > 0 && identifierBytes < 1024, 'Unexpected identifier limit');
  const canonical = name => {
    assert.match(name, /^[A-Za-z0-9_]+$/, 'Expected guard identifiers are ASCII');
    return name.slice(0, identifierBytes);
  };
  const triggerNames = [...new Set(expectedTriggers.map(row => canonical(row[1])))];
  const { rows } = await client.query(`SELECT c.relname AS table_name, t.tgname AS trigger_name,
    t.tgenabled AS enabled, p.proname AS function_name, pg_get_triggerdef(t.oid, true) AS trigger_definition,
    pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS function_definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND NOT t.tgisinternal
      AND t.tgname=ANY($1::text[]) ORDER BY c.relname,t.tgname`, [triggerNames]);
  for (const [table, name, functionName] of expectedTriggers) {
    const found = rows.filter(row => row.table_name === table && row.trigger_name === canonical(name));
    assert.equal(found.length, 1, `Missing or ambiguous guard: ${table}.${name}`);
    assert.ok(['O', 'A'].includes(found[0].enabled), `Disabled guard: ${table}.${name}`);
    assert.equal(found[0].function_name, canonical(functionName), `Unexpected function: ${table}.${name}`);
  }
  const functionNames = [...new Set([...expectedTriggers.map(row => row[2]), 'advance_close_source_revision', 'assert_journal_period_open'].map(canonical))];
  const { rows: functions } = await client.query(`SELECT p.proname AS name,
    pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=ANY($1::text[]) ORDER BY p.proname,arguments`, [functionNames]);
  for (const name of functionNames) assert.ok(functions.some(row => row.name === name), `Missing guard function: ${name}`);
  const { rows: constraints } = await client.query(`SELECT c.relname AS table_name, k.conname AS name,
    k.contype AS type, k.convalidated AS validated, pg_get_constraintdef(k.oid, true) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='c'
    ORDER BY c.relname,k.conname`, [tables]);
  assert.ok(constraints.some(row => row.table_name === 'customer_settlements' && row.name === reversalCheck && row.validated), 'Validated reversal evidence CHECK required');
  return {
    maxIdentifierLength: identifierBytes,
    triggers: rows.map(row => ({ table: row.table_name, name: row.trigger_name, enabled: row.enabled,
      functionName: row.function_name, arguments: row.arguments,
      triggerDefinitionSha256: hash(row.trigger_definition), functionDefinitionSha256: hash(row.function_definition) })),
    functions: functions.map(row => ({ name: row.name, arguments: row.arguments, definitionSha256: hash(row.definition) })),
    checkConstraints: constraints.map(row => ({ table: row.table_name, name: row.name, validated: row.validated, definitionSha256: hash(row.definition) })),
  };
}

async function scopeFor(client, receipt) {
  assert.equal(receipt.synthetic, true, 'Synthetic workflow receipt required');
  for (const key of ['saleId', 'receivableDocumentId', 'settlementId', 'collectionJournalId', 'reversalJournalId']) {
    assert.ok(typeof receipt[key] === 'string' && receipt[key].length > 0 && receipt[key].length < 200, `Missing receipt identity: ${key}`);
  }
  const { rows: [document] } = await client.query(`SELECT id,"organizationId","customerId","sourceSalesOrderId",currency
    FROM customer_receivable_documents WHERE id=$1`, [receipt.receivableDocumentId]);
  assert.ok(document, 'Workflow receivable is missing');
  const org = document.organizationId;
  assert.match(org, /^org-full-pos-/);
  if (receipt.organizationId !== undefined) assert.equal(receipt.organizationId, org);
  assert.equal(document.sourceSalesOrderId, receipt.saleId);
  const { rows: [sale] } = await client.query(`SELECT id,"organizationId","customerId",status FROM sales_orders WHERE id=$1 AND "organizationId"=$2`, [receipt.saleId, org]);
  assert.ok(sale && sale.customerId === document.customerId && sale.status === 'COMPLETED', 'Workflow sale scope is invalid');
  const { rows: [settlement] } = await client.query(`SELECT id,"organizationId","customerId",status,"receivedById","reversedById",
    "journalEntryId","reversalJournalEntryId" FROM customer_settlements WHERE id=$1 AND "organizationId"=$2`, [receipt.settlementId, org]);
  assert.ok(settlement && settlement.customerId === document.customerId && settlement.status === 'REVERSED', 'Completed reversed settlement required');
  assert.notEqual(settlement.receivedById, settlement.reversedById, 'Independent real fixture actors required');
  assert.equal(settlement.journalEntryId, receipt.collectionJournalId);
  assert.equal(settlement.reversalJournalEntryId, receipt.reversalJournalId);
  const { rows: allocations } = await client.query(`SELECT id,"customerReceivableDocumentId","salesOrderId" FROM customer_settlement_allocations
    WHERE "organizationId"=$1 AND "customerSettlementId"=$2`, [org, settlement.id]);
  assert.equal(allocations.length, 1, 'Reviewed fixture has one allocation');
  assert.equal(allocations[0].customerReceivableDocumentId, document.id);
  assert.equal(allocations[0].salesOrderId, sale.id);
  const { rows: [state] } = await client.query(`SELECT id,status FROM customer_receivable_document_states
    WHERE "organizationId"=$1 AND "documentId"=$2 ORDER BY version DESC LIMIT 1`, [org, document.id]);
  assert.ok(state && state.status === 'PARTIALLY_PAID', 'Expected restored open receivable state after reversal');
  const { rows: journals } = await client.query(`SELECT j.id,j.status,j."reversalOfEntryId",j."sourceId",j.currency,
    p.status AS period_status FROM journal_entries j JOIN accounting_periods p
    ON p.id=j."periodId" AND p."organizationId"=j."organizationId"
    WHERE j."organizationId"=$1 AND (j.id=ANY($2::text[]) OR j."sourceId"=$3) ORDER BY j.id`, [org, [receipt.collectionJournalId, receipt.reversalJournalId], sale.id]);
  assert.ok(journals.every(row => row.period_status === 'OPEN'), 'Negative line/status probes require a genuinely open period');
  assert.equal(journals.find(row => row.id === receipt.collectionJournalId)?.status, 'REVERSED');
  assert.equal(journals.find(row => row.id === receipt.reversalJournalId)?.status, 'POSTED');
  assert.equal(journals.find(row => row.id === receipt.reversalJournalId)?.reversalOfEntryId, receipt.collectionJournalId);
  const posted = journals.find(row => row.sourceId === sale.id && row.status === 'POSTED');
  assert.ok(posted, 'Posted sale journal required');
  const { rows: [line] } = await client.query(`SELECT id FROM journal_entry_lines
    WHERE "organizationId"=$1 AND "journalEntryId"=$2 ORDER BY "lineNumber",id LIMIT 1`, [org, posted.id]);
  assert.ok(line, 'Posted sale journal line required');
  const { rows: [foreignAccount] } = await client.query(`SELECT a.id,a."organizationId" FROM chart_of_accounts a
    JOIN organizations o ON o.id=a."organizationId" WHERE a."organizationId"<>$1
      AND o.id LIKE 'org-full-pos-%' AND a.code='TEST_AR' ORDER BY a.id LIMIT 1`, [org]);
  assert.ok(foreignAccount, 'Another synthetic full-POS organization/account is required');
  return { organizationId: org, customerId: document.customerId, saleId: sale.id, documentId: document.id,
    stateId: state.id, settlementId: settlement.id, allocationId: allocations[0].id,
    postedJournalId: posted.id, postedLineId: line.id, collectionJournalId: receipt.collectionJournalId,
    reversalJournalId: receipt.reversalJournalId, currency: posted.currency,
    foreignAccountId: foreignAccount.id, foreignOrganizationId: foreignAccount.organizationId };
}

async function snapshot(client, organizationId) {
  const sql = tables.map(table => `SELECT '${table}' AS table_name,
    (SELECT count(*)::text FROM public."${table}") AS total_count, count(*)::text AS scoped_count,
    COALESCE(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') AS row_text
    FROM public."${table}" t WHERE t."organizationId"=$1`).join(' UNION ALL ');
  const { rows } = await client.query(sql, [organizationId]);
  return rows.map(row => ({ table: row.table_name, totalCount: row.total_count,
    scopedCount: row.scoped_count, scopedRowsSha256: hash(row.row_text) }));
}

async function rowHash(client, table, id, org) {
  assert.ok(tables.includes(table), 'Unreviewed probe table');
  const { rows } = await client.query(`SELECT to_jsonb(t)::text AS data FROM public."${table}" t
    WHERE id=$1 AND "organizationId"=$2`, [id, org]);
  assert.ok(rows.length < 2, 'Ambiguous probe row');
  return rows.length ? hash(rows[0].data) : null;
}

async function negative(client, scope, probe) {
  const before = await snapshot(client, scope.organizationId);
  const beforeRowSha256 = await rowHash(client, probe.table, probe.id, scope.organizationId);
  let observed = null, statementRowCount = null;
  await client.query('BEGIN');
  try {
    const result = await client.query(probe.sql, probe.params);
    statementRowCount = result.rowCount;
  } catch (error) {
    observed = { sqlstate: error.code || null, message: error.message, constraint: error.constraint || null };
  } finally {
    await client.query('ROLLBACK');
  }
  const after = await snapshot(client, scope.organizationId);
  const afterRowSha256 = await rowHash(client, probe.table, probe.id, scope.organizationId);
  const unchanged = JSON.stringify(before) === JSON.stringify(after) && beforeRowSha256 === afterRowSha256;
  const expectedError = observed?.sqlstate === probe.expected.sqlstate && observed?.message === probe.expected.message
    && (!probe.expected.constraint || observed?.constraint === probe.expected.constraint);
  return { name: probe.name, table: probe.table, id: probe.id, expected: probe.expected, observed,
    statementRowCount, rolledBack: true, beforeRowSha256, afterRowSha256,
    beforeScopeSha256: hash(JSON.stringify(before)), afterScopeSha256: hash(JSON.stringify(after)),
    rowsAndCountsUnchanged: unchanged, passed: Boolean(expectedError && unchanged) };
}

function probesFor(s) {
  const constraint = { sqlstate: '23514', message: `new row for relation "customer_settlements" violates check constraint "${reversalCheck}"`, constraint: reversalCheck };
  const scopedUpdate = (table, field, id) => ({ table, id, sql: `UPDATE "${table}" SET ${field} WHERE id=$1 AND "organizationId"=$2`, params: [id, s.organizationId] });
  const scopedDelete = (table, id) => ({ table, id, sql: `DELETE FROM "${table}" WHERE id=$1 AND "organizationId"=$2`, params: [id, s.organizationId] });
  const probes = [
    { name: 'reversed-settlement-independent-actor-check', ...scopedUpdate('customer_settlements', '"reversedById"="receivedById"', s.settlementId), expected: constraint },
    { name: 'reversed-settlement-document-hash-required', ...scopedUpdate('customer_settlements', '"reversalDocumentHash"=NULL', s.settlementId), expected: constraint },
    { name: 'reversed-settlement-evidence-hash-required', ...scopedUpdate('customer_settlements', '"reversalEvidenceHash"=NULL', s.settlementId), expected: constraint },
    { name: 'receivable-document-update-immutable', ...scopedUpdate('customer_receivable_documents', '"documentNumber"="documentNumber" || \'-probe\'', s.documentId), expected: { sqlstate: '23000', message: `Cannot modify immutable customer receivable document ${s.documentId}` } },
    { name: 'receivable-document-delete-immutable', ...scopedDelete('customer_receivable_documents', s.documentId), expected: { sqlstate: '23000', message: `Cannot delete immutable customer receivable document ${s.documentId}` } },
    { name: 'receivable-state-update-immutable', ...scopedUpdate('customer_receivable_document_states', '"unpaidAmount"="unpaidAmount"+1', s.stateId), expected: { sqlstate: '23000', message: `Cannot modify immutable customer receivable state ${s.stateId}` } },
    { name: 'receivable-state-delete-immutable', ...scopedDelete('customer_receivable_document_states', s.stateId), expected: { sqlstate: '23000', message: `Cannot delete immutable customer receivable state ${s.stateId}` } },
    { name: 'settlement-allocation-relink-immutable', ...scopedUpdate('customer_settlement_allocations', '"customerReceivableDocumentId"=NULL', s.allocationId), expected: { sqlstate: '23000', message: `Cannot relink customer settlement allocation ${s.allocationId} from immutable receivable document` } },
    ...[[s.postedJournalId, "'DRAFT'", 'posted-journal-cannot-return-to-draft'], [s.collectionJournalId, "'POSTED'", 'reversed-journal-cannot-reactivate']].map(([id, value, name]) => ({
      name, ...scopedUpdate('journal_entries', `status=${value}`, id), expected: { sqlstate: '23514', message: 'Posted journals may only become reversed; reversed journals cannot change status' },
    })),
    { name: 'posted-journal-line-edit-needs-compensation', ...scopedUpdate('journal_entry_lines', 'debit=debit+1', s.postedLineId), expected: { sqlstate: '23514', message: 'Posted journal lines require a compensating correction' } },
    { name: 'posted-journal-line-delete-needs-compensation', ...scopedDelete('journal_entry_lines', s.postedLineId), expected: { sqlstate: '23514', message: 'Posted journal lines require a compensating correction' } },
  ];
  const id = `trigger-probe-${crypto.randomUUID()}`;
  probes.push({ name: 'journal-line-foreign-account-tenant-denied', table: 'journal_entry_lines', id,
    sql: `INSERT INTO journal_entry_lines (id,"organizationId","journalEntryId","accountId","lineNumber",currency,debit,credit)
      VALUES ($1,$2,$3,$4,(SELECT COALESCE(max("lineNumber"),0)+100 FROM journal_entry_lines WHERE "journalEntryId"=$3),$5,0,0)`,
    params: [id, s.organizationId, s.postedJournalId, s.foreignAccountId, s.currency],
    expected: { sqlstate: '23514', message: 'Journal line, parent and account must belong to the same organization' },
  });
  return probes;
}

async function closeEvidence(client, scope, receipt) {
  const { rows: revisions } = await client.query(`SELECT revision::text FROM close_source_revisions WHERE "organizationId"=$1`, [scope.organizationId]);
  assert.equal(revisions.length, 1, 'Actual financial operations must retain a source revision');
  assert.ok(BigInt(revisions[0].revision) > 0n, 'Expected a positive financial-source revision');
  const { rows: changes } = await client.query(`SELECT "sourceTable" AS table,operation,count(*)::text AS count,
    min(revision)::text AS first_revision,max(revision)::text AS last_revision
    FROM close_source_changes WHERE "organizationId"=$1 GROUP BY "sourceTable",operation ORDER BY "sourceTable",operation`, [scope.organizationId]);
  assert.ok(changes.some(row => row.table === 'journal_entries' && row.operation === 'INSERT'), 'Actual journal source-change records required');
  assert.ok(Array.isArray(receipt.closeInvalidationIds) && receipt.closeInvalidationIds.length === 2, 'Workflow invalidation sentinels required');
  const { rows: runs } = await client.query(`SELECT id,status,metadata#>>'{staleState,status}' AS stale_status,
    metadata#>>'{staleState,sourceCode}' AS source_code FROM close_runs
    WHERE "organizationId"=$1 AND id=ANY($2::text[]) ORDER BY id`, [scope.organizationId, receipt.closeInvalidationIds]);
  assert.equal(runs.length, 2);
  assert.ok(runs.every(row => row.status === 'BLOCKED' && row.stale_status === 'EVIDENCE_STALE'), 'Both actual workflow sentinels must be stale');
  return { revision: revisions[0].revision, changes, invalidatedSentinels: runs,
    limitation: 'Observed after the real service chain; these are synthetic invalidation sentinels, not earned accountant certificates. Per-operation revision deltas require separately recorded stage snapshots.' };
}

async function main(argv = process.argv.slice(2)) {
  assert.notEqual(process.env.NODE_ENV, 'production', 'Production execution is refused');
  const args = argsFor(argv), target = loadTarget(args['--manifest']);
  const receipt = JSON.parse(fs.readFileSync(args['--workflow-evidence'], 'utf8'));
  dns.setDefaultResultOrder('ipv4first');
  // Explicit fields prevent libpq/pg environment or app configuration fallback.
  const client = new Client({ host: target.host, port: target.port, user: target.user, password: async () => '', database: target.posDatabase,
    ssl: false, application_name: 'stoquify-owned-trigger-probes', connectionTimeoutMillis: 5000,
    query_timeout: 15000, options: '-c search_path=public -c statement_timeout=10000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000' });
  const report = { stage: 'executed', qualifiedDate, startedAt: new Date().toISOString(), passed: false,
    runnerSha256: hash(fs.readFileSync(__filename)), targetManifestSha256: hash(fs.readFileSync(args['--manifest'])),
    workflowEvidenceSha256: hash(fs.readFileSync(args['--workflow-evidence'])), probes: [],
    limitations: [
      'Synthetic zero-tax financial fixture; no provider transfer or statutory qualification.',
      'Service/action tenant and session/RBAC authorization remain separate. Separate foreign keys do not prove complete database tenant isolation.',
      'No closed period is fabricated. Proper earned seal/reopen/write-denial qualification remains a separate period-control exercise.',
      'Posted journal status and line guards are probed; blanket immutability of every journal header field is not claimed.',
      'Sequences may advance in rolled-back transactions; retained rows/counts/hashes, not sequence counters, are compared.',
    ] };
  try {
    await client.connect();
    report.identity = await identity(client, target);
    report.scope = await scopeFor(client, receipt);
    report.guardInventory = await inventory(client);
    report.before = await snapshot(client, report.scope.organizationId);
    report.closeEvidenceBefore = await closeEvidence(client, report.scope, receipt);
    for (const probe of probesFor(report.scope)) {
      report.probes.push(await negative(client, report.scope, probe));
      console.log(`${probe.name}: ${report.probes.at(-1).passed ? 'passed' : 'FAILED'}`);
    }
    report.after = await snapshot(client, report.scope.organizationId);
    report.closeEvidenceAfter = await closeEvidence(client, report.scope, receipt);
    report.guardInventoryAfterSha256 = hash(JSON.stringify(await inventory(client)));
    assert.deepEqual(report.after, report.before, 'Probe rows/counts changed despite rollback');
    assert.deepEqual(report.closeEvidenceAfter, report.closeEvidenceBefore, 'Aborted probes changed close-source evidence');
    assert.equal(report.guardInventoryAfterSha256, hash(JSON.stringify(report.guardInventory)), 'Installed guards changed during probes');
    await identity(client, target);
    assert.ok(report.probes.every(probe => probe.passed), 'One or more negative guard probes failed');
    report.passed = true;
  } catch (error) {
    report.failure = { name: error.name, code: error.code || null,
      message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]') };
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(args['--out'], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(`Trigger probes ${report.passed ? 'passed' : 'failed'}; ${report.probes.length} attempted. Evidence: ${path.basename(args['--out'])}`);
}

if (require.main === module) main().catch(error => {
  console.error(`Trigger probe setup refused: ${String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]')}`);
  process.exitCode = 1;
});

module.exports = { argsFor, loadTarget, probesFor };
