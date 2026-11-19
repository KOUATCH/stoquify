/** Continue the owned synthetic dataset; never load the application database. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { signIn } from './disposable-business-workflows';
const { OUT, assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
const organizations = ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'];
const lanes = ['commerce', 'people', 'firm-close', 'platform', 'stock-pos'];
const selected = process.argv[2] || 'all';
const report: { generatedAt: string; lane: string; scenarios: any[]; issues: any[] } = { generatedAt: new Date().toISOString(), lane: selected, scenarios: [], issues: [] };
const save = () => writeFileSync(path.join(OUT, `remaining-${selected}-results.json`), JSON.stringify(report, null, 2) + '\n');
let clock: { uninstall: () => void } | undefined;
async function main() {
  if (selected !== 'all' && !lanes.includes(selected)) throw Error('Unknown remaining-scenario lane');
  const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
  assertManifestTarget(new URL(process.env.DATABASE_URL!), manifest);
  if (process.env.NODE_ENV !== 'test' || (await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name !== manifest.target.database) throw Error('Owned disposable database required');
  clock = require('@sinonjs/fake-timers').install({ now: new Date('2026-10-28T20:00:00Z').getTime(), toFake: ['Date'] });
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS = organizations.join(',');
  process.env.RESEND_API_KEY = '';
  const credentials = JSON.parse(readFileSync('.seed-artifacts/disposable-dataset-2026-10-28/credentials.json', 'utf8'));
  for (const org of organizations) {
    const actors: Record<string, Awaited<ReturnType<typeof signIn>>> = {};
    for (const [role, required] of Object.entries({ owner: ['hris.tasks.read', 'hris.tasks.review', 'accounting.close.evidence.request'], payroll_administrator: ['hris.tasks.read', 'hris.tasks.work'], checker: ['purchases.orders.read', 'purchases.orders.update'], manager:['controls.manage'] })) {
      const current = await db.role.findUniqueOrThrow({ where: { id: `${org}_role_${role}` } });
      const permissions = [...new Set([...current.permissions, ...required])];
      if (permissions.length !== current.permissions.length) await db.role.update({ where: { id: current.id }, data: { permissions } });
    }
    for (const credential of credentials.filter((entry: any) => entry.organizationId === org)) actors[credential.role] = await signIn(credential);
    for (const lane of selected === 'all' ? lanes : [selected]) {
      console.log('Remaining scenarios', org, lane);
      try {
        const module = require(`./disposable-remaining-${lane}`);
        const execute = module[{ commerce: 'seedRemainingCommerce', people: 'seedRemainingPeople', 'firm-close': 'seedRemainingFirmClose', platform: 'seedRemainingPlatform', 'stock-pos':'seedRemainingStockPos' }[lane]!];
        const result = await execute(org, actors, OUT);
        report.scenarios.push({ organizationId: org, lane, result });
        for (const issue of result?.issues || []) report.issues.push({ organizationId: org, lane, ...issue });
      } catch (error) {
        report.issues.push({ organizationId: org, lane, message: error instanceof Error ? error.message : String(error) });
      }
      save();
    }
  }
  if (report.issues.length) process.exitCode = 1;
}
main().catch(error => { report.issues.push({ message: error.message }); save(); console.error(error.message); process.exitCode = 1; }).finally(async () => { clock?.uninstall(); await db.$disconnect(); console.log('Remaining fixture database connection closed'); process.exit(process.exitCode || 0); });
