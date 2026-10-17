const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
jest.mock('child_process', () => ({ ...jest.requireActual('child_process'), spawnSync: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })) }));
jest.mock('../../scripts/prisma-migration-history-health-check', () => ({
  buildMigrationHistoryHealth: () => ({ summary: { status: 'ready', repositoryMigrationCount: 1, completedRowCount: 1 }, blockers: [] }),
  queryHistoryRows: jest.fn(),
}));
const { runRestoreRehearsal } = require('../../scripts/prisma-local-restore-rehearsal');

it.each([['empty', '0', false], ['populated', '1', true]])('requires populated source data for a %s structural rehearsal', async (_label, rowCount, ready) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's12-restore-unit-'));
  try {
    for (const name of ['pg_dump', 'pg_restore']) fs.writeFileSync(path.join(root, name + (process.platform === 'win32' ? '.exe' : '')), 'fake binary, never executed');
    const report = await runRestoreRehearsal({ root, databaseName: 'stoquify_restore_s12_unit', out: 'report.md', jsonOut: 'report.json', pgBin: root, retainDatabase: true }, {
      nodeEnv: 'test', loadDatabaseUrl: () => 'postgresql://synthetic:synthetic@localhost/source',
      createNewDatabase: async () => {}, profileDatabase: async () => [{ table: 'users', present: true, rowCount }],
      queryHistoryRows: async () => ({ rows: [], succeeded: true }), runSchemaDiff: () => '',
      runBinary: (_command, args) => { const dump = args.find(arg => arg.startsWith('--file=')); if (dump) fs.writeFileSync(dump.slice(7), 'synthetic dump'); return { status: 0 }; },
    });
    expect(report.ready).toBe(ready);
    expect(report.dataProfile.sourcePopulated).toBe(ready);
  } finally {
    const resolved = path.resolve(root), parent = path.resolve(os.tmpdir());
    if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('s12-restore-unit-')) throw new Error('Unsafe fixture cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
