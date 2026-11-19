const test = require('node:test'), assert = require('node:assert/strict');
const { recoveryRedirect } = require('./artifact-http-smoke.cjs');
const record = { origin: 'https://127.0.0.1:3443' }, expected = '/en/dashboard/pos';
const destination = '/en/login?callbackUrl=%2Fen%2Fdashboard%2Fpos';
const meta = href => `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=${href}"/>`;
test('recognizes exact same-origin header and Next streamed recovery', () => {
  assert.equal(recoveryRedirect({ status: 307, headers: { location: destination }, body: '' }, record, expected).mode, 'http-redirect');
  assert.equal(recoveryRedirect({ status: 200, headers: {}, body: meta(destination) }, record, expected).mode, 'streamed-next-redirect');
});
test('does not treat an arbitrary successful shell or refresh as recovery', () => {
  assert.throws(() => recoveryRedirect({ status: 200, headers: {}, body: '<html>ordinary shell</html>' }, record, expected));
  assert.throws(() => recoveryRedirect({ status: 200, headers: {}, body: '<meta http-equiv="refresh" content="1;url=' + destination + '"/>' }, record, expected));
});
test('rejects foreign origin, wrong callback and rendered protected main', () => {
  for (const body of [meta('https://outside.invalid' + destination), meta('/en/login?callbackUrl=%2Fen%2Fdashboard%2Fother'), meta(destination) + '<main id="dashboard-main-content">private</main>']) {
    assert.throws(() => recoveryRedirect({ status: 200, headers: {}, body }, record, expected));
  }
});
test('rejects a duplicate or merely serialized metadata marker', () => {
  assert.throws(() => recoveryRedirect({ status: 200, headers: {}, body: meta(destination) + meta(destination) }, record, expected));
  assert.throws(() => recoveryRedirect({ status: 200, headers: {}, body: JSON.stringify(meta(destination)) }, record, expected));
});
