'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createReadinessTracker } = require('./rendered-readiness.cjs');
const options = { expectedPath: '/en/dashboard/inventory/items/item-a', expectedTag: 'H1' };
const snapshot = (frameTimestamp, changes = {}) => ({ path: options.expectedPath, documentReadyState: 'interactive', frameTimestamp, total: 1, nodes: [{ tag: 'H1', visible: true, textMatches: true, hiddenAncestors: [] }], ...changes });
test('requires three distinct consecutive rendered frames', () => {
  const observe = createReadinessTracker(options);
  assert.equal(observe(snapshot(1)).ready, false);
  assert.equal(observe(snapshot(2)).ready, false);
  assert.equal(observe(snapshot(3)).ready, true);
});
test('persistent duplicate IDs fail even when only one is visible', () => {
  const observe = createReadinessTracker(options);
  for (let frame = 1; frame < 10; frame++) assert.equal(observe(snapshot(frame, { total: 2, nodes: [snapshot(0).nodes[0], { tag: 'H1', visible: false, textMatches: true, hiddenAncestors: [{ hidden: true }] }] })).ready, false);
});
test('two visible matching headings cannot pass', () => {
  const observe = createReadinessTracker(options);
  for (let frame = 1; frame < 10; frame++) assert.equal(observe(snapshot(frame, { total: 2, nodes: [snapshot(0).nodes[0], snapshot(0).nodes[0]] })).ready, false);
});
test('transient duplicate resets stability before convergence', () => {
  const observe = createReadinessTracker(options);
  observe(snapshot(1)); observe(snapshot(2));
  assert.equal(observe(snapshot(3, { total: 2 })).consecutive, 0);
  assert.equal(observe(snapshot(4)).ready, false);
  assert.equal(observe(snapshot(5)).ready, false);
  assert.equal(observe(snapshot(6)).ready, true);
});
test('wrong title, hidden heading, loading document and wrong route fail', () => {
  for (const changes of [
    { nodes: [{ tag: 'H1', visible: true, textMatches: false }] },
    { nodes: [{ tag: 'H1', visible: false, textMatches: true }] },
    { documentReadyState: 'loading' }, { path: '/en/login' }, { total: 0, nodes: [] },
  ]) {
    const observe = createReadinessTracker(options);
    for (let frame = 1; frame < 5; frame++) assert.equal(observe(snapshot(frame, changes)).ready, false);
  }
});
test('repeated frame timestamps do not establish stability', () => {
  const observe = createReadinessTracker(options);
  for (let count = 0; count < 5; count++) assert.equal(observe(snapshot(1)).ready, false);
});
test('login recovery requires actual login path and unique visible email input', () => {
  const observe = createReadinessTracker({ expectedPath: '/en/login', expectedTag: 'INPUT' });
  const login = frame => snapshot(frame, { path: '/en/login', nodes: [{ tag: 'INPUT', visible: true, textMatches: true }] });
  assert.equal(observe(snapshot(1)).ready, false);
  assert.equal(observe(login(2)).ready, false);
  assert.equal(observe(login(3)).ready, false);
  assert.equal(observe(login(4)).ready, true);
});
