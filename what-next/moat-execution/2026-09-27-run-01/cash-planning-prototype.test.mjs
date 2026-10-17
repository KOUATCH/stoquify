import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareScenarios } from './cash-planning-prototype.mjs';
const fixture = () => JSON.parse(readFileSync(new URL('./cash-planning-synthetic-input.json', import.meta.url), 'utf8'));
test('compares 13 weeks, delay, buffer breach and supplier lead time without commands', () => {
  const result = compareScenarios(fixture());
  assert.equal(result.scenarios[0].weekly.length, 13);
  assert.equal(result.scenarios[0].weekly[12].closingMinor, '800000');
  assert.equal(result.scenarios[1].minimumCashMinor, '-300000');
  assert.deepEqual(result.scenarios[1].lateChoices, ['p1']);
  assert.equal(result.scenarios[2].minimumCashMinor, '150000');
  assert.equal(result.evaluation.baselineAbsoluteErrorSumMinor, null);
});
test('retains exact amounts beyond Number safe integer range', () => {
  const input = fixture(); input.openingCashMinor = '900719925474099300';
  assert.equal(compareScenarios(input).scenarios[0].weekly[12].closingMinor, '900719925473899300');
});
test('does not silently combine currencies, duplicate rows or accept incomplete coverage', () => {
  for (const alter of [x => x.receipts[0].currency = 'EUR', x => x.obligations[0].id = 'r1', x => x.coverageConfirmed = false, x => x.receipts[0].date = '2026-02-30', x => x.obligations[0].amountMinor = 0.1, x => x.choices[0].leadDays = -1]) {
    const input = fixture(); alter(input); assert.throws(() => compareScenarios(input));
  }
});
test('flags delayed receipts outside horizon instead of counting them as cash', () => {
  const input = fixture(); input.scenarios[0].receiptDelayDays = 100;
  const result = compareScenarios(input);
  assert.equal(result.scenarios[0].weekly[12].closingMinor, '200000');
  assert.deepEqual(result.scenarios[0].beyondHorizon, ['r1']);
});
test('freezes reproducible assumptions and evaluates actuals with explicit missing denominators', () => {
  const input = fixture(); const before = compareScenarios(input);
  assert.equal(before.inputHash, compareScenarios(input).inputHash);
  input.actuals = [{week: 1, closingMinor: '900000', currency: 'XAF', sourceRef: 'SYNTHETIC/actual'}];
  const result = compareScenarios(input);
  assert.equal(result.evaluation.observedWeeks, 1); assert.equal(result.evaluation.missingWeeks, 12);
  assert.equal(result.evaluation.baselineAbsoluteErrorSumMinor, '100000');
  assert.notEqual(before.inputHash, result.inputHash);
  assert.equal(before.assumptionHash, result.assumptionHash);
});
