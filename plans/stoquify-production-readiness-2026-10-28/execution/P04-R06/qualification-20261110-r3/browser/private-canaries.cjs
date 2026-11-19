'use strict';
function fixtureCanaries(bytes, users) {
  return Object.fromEntries(Object.entries(users).map(([alias, actor]) => [alias, [actor.id, actor.email, actor.organizationId].filter(value => typeof value === 'string' && value.length > 0).some(value => bytes.includes(Buffer.from(value)))]));
}
function deniedBytesClear(flags) {
  return Boolean(flags && typeof flags === 'object' && Object.keys(flags).length > 0 && Object.values(flags).every(value => value === false));
}
module.exports = { fixtureCanaries, deniedBytesClear };
