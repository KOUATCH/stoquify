const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, helper, root} = f;
const receipt = {at: new Date().toISOString(), stage: 'owned database'};
(async () => {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.findFirstOrThrow({where: {name: {startsWith: helper.prefix + 'Cash visibility presentation'}}, orderBy: {createdAt: 'desc'}});
  const role = await db.role.findFirstOrThrow({where: {organizationId: org.id, code: {startsWith: 'cash-a11y-'}}, include: {users: true}, orderBy: {createdAt: 'desc'}});
  const {getCashCommandData} = require(path.join(root, 'services/cash-command/cash-command.service.ts'));
  receipt.stage = 'actual cash read'; const started = Date.now();
  const data = await getCashCommandData({organizationId: org.id, actorId: role.users[0].id, actorPermissions: role.permissions, actorRoleCodes: [role.code]});
  receipt.elapsedMs = Date.now() - started; receipt.cards = data.cards.length; receipt.success = true;
})().catch(error => {receipt.success = false; receipt.error = f.safe(error); receipt.code = error.code; receipt.stack = f.safe({message: error.stack}); process.exitCode = 1;}).finally(async () => {await db.$disconnect(); const file = 'cash-source-diagnostic-' + crypto.randomUUID() + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'}); console.log(JSON.stringify({file, ...receipt}));});
