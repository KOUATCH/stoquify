'use strict';
require('./registration-network-fence.cjs');
// Test-process instrumentation only; no application source imports this module.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const control = process.env.OWNED_ITEM_FAULT_CONTROL;
if (control) {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/stoquify_local_registration_20260906_01') throw new Error('Fault test requires owned local database');
  if (path.dirname(path.resolve(control)) !== __dirname || !path.basename(control).startsWith('item-query-control-')) throw new Error('Invalid fault control path');
  const load = Module._load, cache = new WeakMap();
  Module._load = function(name, ...args) {
    const exports = load.call(this, name, ...args);
    if (name !== '@prisma/client' || !exports.PrismaClient) return exports;
    if (!cache.has(exports)) {
      const PrismaClient = new Proxy(exports.PrismaClient, { construct(Target, args) {
        const client = Reflect.construct(Target, args);
        return client.$extends({ name: 'owned-item-query-fault', query: { item: { async findMany({ args, query }) {
          const state = JSON.parse(fs.readFileSync(control, 'utf8'));
          if (state.enabled && args.where?.organizationId === state.organizationId) {
            fs.appendFileSync(control + '.events', JSON.stringify({ at: new Date().toISOString(), organizationId: state.organizationId, operation: 'Item.findMany' }) + '\n');
            throw new Error('OWNED_ITEM_QUERY_UNAVAILABLE');
          }
          return query(args);
        } } } });
      } });
      cache.set(exports, new Proxy(exports, { get(target, key) { return key === 'PrismaClient' ? PrismaClient : Reflect.get(target, key); } }));
    }
    return cache.get(exports);
  };
}
