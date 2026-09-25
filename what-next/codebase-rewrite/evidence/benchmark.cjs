const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../../..');
const cache = new Map();
function load(file, text) {
  if (!text && cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  if (!text) cache.set(file, module);
  const code = ts.transpileModule(text || fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'server-only') return {}; // This harness executes only in Node, never in a browser.
    if (specifier === '@/prisma/db') return { db: {} }; // No database is opened by this benchmark.
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
    const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
    const target = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(candidate => fs.existsSync(candidate));
    if (!target) throw new Error(`Unsupported local benchmark import: ${specifier}`);
    return load(target);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
function variants(relative) {
  const file = path.join(root, relative);
  return {
    before: load(file, fs.readFileSync(path.join(__dirname, path.basename(file) + '.before.txt'), 'utf8')),
    after: load(file),
  };
}
function distribution(samples) {
  const values = [...samples].sort((a,b) => a-b);
  return { samples: values.length, p50Ms: values[Math.floor(values.length * .5)], p95Ms: values[Math.min(values.length-1,Math.floor(values.length*.95))] };
}
async function main() {
  const { Prisma, CashDrawerTransactionType, PaymentMethod, PaymentStatus } = require('@prisma/client');
  const history = variants('services/pos/cash-payment-history.service.ts');
  const now = new Date('2026-09-24T12:00:00Z');
  const cashTypes = Object.values(CashDrawerTransactionType), methods = Object.values(PaymentMethod), statuses = Object.values(PaymentStatus);
  const cash = [], payments = [];
  // Deterministic, exactly representable two-decimal data, matching the schema scale.
  for (let i=0; i<100_000; i++) {
    const amount = new Prisma.Decimal((i % 10001) - 5000).div(100);
    cash.push({ type: cashTypes[i % cashTypes.length], amount });
    payments.push({ method: methods[i % methods.length], status: statuses[Math.floor(i / methods.length) % statuses.length], amount });
  }
  function group(rows, fields) {
    const groups = new Map();
    for (const row of rows) {
      const key = fields.map(field => row[field]).join(':');
      if (!groups.has(key)) groups.set(key, { ...Object.fromEntries(fields.map(field => [field,row[field]])), _sum: { amount: new Prisma.Decimal(0) }, _count: { _all: 0 } });
      const aggregate = groups.get(key);
      aggregate._sum.amount = aggregate._sum.amount.plus(row.amount);
      aggregate._count._all++;
    }
    return [...groups.values()];
  }
  const cashGroups = group(cash,['type']), paymentGroups = group(payments,['method','status']);
  const requests = [];
  const client = {
    organization: { findFirst: async () => ({ id: 'benchmark-org', timezone: 'UTC', currency: 'XAF' }) },
    cashDrawerTransaction: {
      findMany: async args => { requests.push({ lane:'cash',kind:'findMany',args }); return args.select ? cash : []; },
      groupBy: async args => { requests.push({ lane:'cash',kind:'groupBy',args }); return cashGroups; },
    },
    payment: {
      findMany: async args => { requests.push({ lane:'payment',kind:'findMany',args }); return args.select ? payments : []; },
      groupBy: async args => { requests.push({ lane:'payment',kind:'groupBy',args }); return paymentGroups; },
    },
  };
  const input = { organizationId:'benchmark-org', actorUserId:'benchmark-actor', accessMode:'own', actorPermissions:['pos.read'], filters:{lane:'all',pageSize:50} };
  const options = { client, now:()=>now, cursorCodec:{ encode:()=>'',decode:()=>{throw new Error('No cursor in this benchmark')} } };
  const samples = { before:[],after:[] }, heaps = {before:[],after:[]}, queryCounts = {before:[],after:[]};
  for (let i=0; i<23; i++) {
    for (const label of i%2 ? ['after','before'] : ['before','after']) {
      if (global.gc) global.gc();
      const heap = process.memoryUsage().heapUsed;
      requests.length = 0;
      const start = performance.now();
      const result = await history[label].readCashPaymentHistory(input,options);
      const elapsed = performance.now()-start;
      queryCounts[label].push(requests.length);
      assert.equal(requests.length,4);
      if (label==='before') global.referenceSummary=result.summary;
      else if (global.referenceSummary) assert.deepStrictEqual(result.summary,global.referenceSummary);
      if (i>=3) { samples[label].push(elapsed); heaps[label].push(process.memoryUsage().heapUsed-heap); }
    }
  }
  const preflight = variants('services/leakage/pos-cash-shortage-production-activation-preflight.ts');
  assert.deepStrictEqual(Object.keys(preflight.after).sort(),Object.keys(preflight.before).sort());
  const definition = { checkKey:'pos.closed_shift_cash_shortage.review',version:1,workflow:'pos',moduleSlug:'pos',requiredPermission:'pos.transactions.read',enforceMode:false,metadata:{productionActivationCertified:true} };
  const fields = preflight.before.POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS;
  const all = Object.fromEntries(fields.map(field=>[field,true]));
  const inputs = [
    {definition,fragments:[{...all,activationAuthorized:false}]},
    {definition:{...definition,metadata:{}},fragments:[{...all,activationAuthorized:false}]},
    {definition:{...definition,checkKey:'wrong'},fragments:[{...all,activationAuthorized:false}]},
    {definition,fragments:[{...all,activationAuthorized:true}]},
    {definition,fragments:[]},
    ...fields.map(field=>({definition,fragments:[{...all,[field]:false,activationAuthorized:false}]})),
  ];
  const exported = Object.keys(preflight.before).filter(name=>typeof preflight.before[name]==='function' && !['composePosCashShortageProductionActivationEvidence','evaluateComposedPosCashShortageProductionActivationPreflight','evaluatePosCashShortageProductionActivationPreflight'].includes(name));
  let comparisons=0;
  for (const scenario of inputs) {
    const composed = preflight.before.evaluateComposedPosCashShortageProductionActivationPreflight(scenario);
    for (const name of exported) {
      const before = preflight.before[name](composed), after = preflight.after[name](composed);
      // Preserve property order as well as shape/value: downstream fingerprints use JSON.
      assert.equal(JSON.stringify(after),JSON.stringify(before),name);
      comparisons++;
    }
  }
  const result = {
    recordedAt:new Date().toISOString(), node:process.version,
    method:'In-process application processing only; mocked database returns precomputed groups. No SQL/network/browser timing. 100,000 cash + 100,000 payment rows; page rows empty; concurrency 1; three warmup rounds then 20 alternating trials per variant, explicit GC before trials.',
    cashHistory:{ baseline:distribution(samples.before),rewrite:distribution(samples.after), summaryRowsBefore:cash.length+payments.length,
      summaryRowsAfter:cashGroups.length+paymentGroups.length,maximumAggregateRows:cashTypes.length+methods.length*statuses.length,
      summaryEqual:true, applicationHeapDeltaBytes:Object.fromEntries(Object.entries(heaps).map(([key,values])=>{
        const stats=distribution(values); return [key,{samples:stats.samples,p50Bytes:stats.p50Ms,p95Bytes:stats.p95Ms}];
      })),
      requestsPerReadExcludingOrganization:Object.fromEntries(Object.entries(queryCounts).map(([key,values])=>[key,[...new Set(values)]])) },
    preflight:{exports:Object.keys(preflight.before).length,functionsCompared:exported.length,scenarios:inputs.length,serializedComparisons:comparisons,equal:true},
  };
  fs.writeFileSync(path.join(__dirname,'benchmark.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
