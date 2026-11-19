const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = process.cwd(), base = __dirname, runtime = path.join(base, 'runtime-files');
fs.mkdirSync(runtime, {recursive: true});
for (const name of ['actions','components','config','hooks','i18n','lib','messages','prisma','public','services','types','validations','src','scripts','node_modules']) {
  const target = path.join(root, name), link = path.join(runtime, name);
  if (!fs.existsSync(target)) continue;
  if (!fs.existsSync(link)) fs.symlinkSync(target, link, 'junction');
  if (fs.realpathSync(link) !== fs.realpathSync(target)) throw Error('Unexpected runtime link ' + name);
}
fs.cpSync(path.join(root, 'app'), path.join(runtime, 'app'), {recursive: true});
const files = ['next.config.mjs','middleware.ts','tsconfig.json','package.json','postcss.config.js','postcss.config.mjs','tailwind.config.ts','next-env.d.ts'];
const hashes = {};
for (const file of files) if (fs.existsSync(path.join(root, file))) {
  const bytes = fs.readFileSync(path.join(root, file)); fs.writeFileSync(path.join(runtime, file), bytes);
  hashes[file] = crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.writeFileSync(path.join(base, 'runtime-provenance.json'), JSON.stringify({runtime, configurationHashes: hashes, sourceMode: 'Copied app routes plus current source junctions; isolated output and environment', noRootEnvironmentCopied: true}, null, 2));
console.log('Prepared isolated Next runtime');
