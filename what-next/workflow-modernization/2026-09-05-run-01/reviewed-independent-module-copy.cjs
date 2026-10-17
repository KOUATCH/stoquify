const crypto = require('node:crypto'), assert = require('node:assert/strict');
const accepted = { 'messages/en.json': '923d6f692e7ed49a3e400d0d4d1c23b7b633ac4003b54e432437f7cc6dbec42f', 'messages/fr.json': 'ae0dacdc20728e3c5a96527b3560cb05f0b4e9e1a5f0713d086bd56eeaafd1a8' };
// Independent moduleComposition.experience copy added after the password browser
// run. Removing exactly this reviewed block must reproduce the earlier full
// dictionary hash; callers still verify that predecessor, never just this block.
module.exports = function reviewedModuleCopy(raw, file) {
  if (!accepted[file]) return raw;
  const match = raw.match(/  "moduleComposition": \{\r?\n(    "experience": \{\r?\n(?:      "[^\r\n]*\r?\n)+    \},\r?\n)/);
  if (!match) return raw;
  const revised = {"messages/en.json":"2fbbf2f7ac68cbccb2c3e412b51bf80ddd255d2846466307cb00d1a377a3cb0a","messages/fr.json":"57098abe8caa7720a60e8a89c690c034ab9b1caae1c77a536a4c8e5e7ba11674"};
  const observed = crypto.createHash('sha256').update(match[1]).digest('hex');
  assert.ok(observed === accepted[file] || observed === revised[file], 'Unreviewed independent module copy: ' + file);
  return raw.replace(match[1], '');
};
