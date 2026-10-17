// Isolated decision-support experiment. No database, network or domain commands.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const day = 86400000;
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Use an ISO date');
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw Error('Invalid date');
  return time;
}
function money(value, signed = false) {
  if (typeof value !== 'string' || !(signed ? /^-?\d+$/ : /^\d+$/).test(value)) throw Error('Use exact integer minor-unit strings');
  return BigInt(value);
}
const iso = time => new Date(time).toISOString().slice(0, 10);

export function compareScenarios(input) {
  if (input.version !== 1 || !input.assumptionVersion || !input.openingSourceRef || !input.coverageConfirmed || !/^[A-Z]{3}$/.test(input.currency) || !Number.isInteger(input.minorUnits) || input.minorUnits < 0 || input.minorUnits > 3) throw Error('Version, currency, provenance and explicit input coverage are required');
  const start = date(input.startsOn), end = start + 91 * day;
  const opening = money(input.openingCashMinor, true);
  const ids = new Set();
  for (const row of [...input.receipts, ...input.obligations, ...input.choices]) {
    if (!row.id || ids.has(row.id) || !row.sourceRef || row.currency !== input.currency) throw Error('Unique source-backed rows in one currency are required');
    ids.add(row.id); money(row.amountMinor);
    if (date(row.date) < start) throw Error('Overdue inputs require an explicit opening reconciliation');
  }
  for (const row of input.receipts) if (!['CONFIRMED', 'EXPECTED'].includes(row.certainty)) throw Error('Receipt certainty is required');
  for (const row of input.choices) {
    if (!['PURCHASE', 'TRANSFER'].includes(row.kind) || !Number.isInteger(row.leadDays) || row.leadDays < 0) throw Error('Choice kind and lead time are required');
    date(row.neededOn);
  }
  const scenarioIds = new Set();
  const scenarios = input.scenarios.map(scenario => {
    if (!scenario.id || scenarioIds.has(scenario.id) || !Number.isInteger(scenario.receiptDelayDays) || scenario.receiptDelayDays < 0) throw Error('Unique scenarios and nonnegative delay days required');
    scenarioIds.add(scenario.id);
    const selectedIds = new Set(scenario.choiceIds);
    if (selectedIds.size !== scenario.choiceIds.length || [...selectedIds].some(id => !input.choices.some(row => row.id === id))) throw Error('Unknown or duplicate choice');
    const buffer = money(scenario.bufferMinor);
    const selected = input.choices.filter(row => selectedIds.has(row.id));
    const receipts = input.receipts.map(row => ({ ...row, time: date(row.date) + (row.certainty === 'EXPECTED' ? scenario.receiptDelayDays * day : 0) }));
    const outflows = [...input.obligations, ...selected].map(row => ({ ...row, time: date(row.date) }));
    let cash = opening, firstBreach = opening < buffer ? iso(start) : null, minimum = opening;
    const weekly = [];
    // Conservative within-day convention: outflows precede receipts.
    for (let index = 0; index < 91; index++) {
      const time = start + index * day;
      cash -= outflows.filter(row => row.time === time).reduce((sum, row) => sum + money(row.amountMinor), 0n);
      if (cash < minimum) minimum = cash;
      if (cash < buffer && !firstBreach) firstBreach = iso(time);
      cash += receipts.filter(row => row.time === time).reduce((sum, row) => sum + money(row.amountMinor), 0n);
      if (index % 7 === 6) weekly.push({ week: (index + 1) / 7, endsOn: iso(time), closingMinor: cash.toString() });
    }
    return { id: scenario.id, weekly, minimumCashMinor: minimum.toString(), bufferBreachOn: firstBreach,
      beyondHorizon: [...receipts, ...outflows].filter(row => row.time >= end).map(row => row.id),
      lateChoices: selected.filter(row => date(row.date) + row.leadDays * day > date(row.neededOn)).map(row => row.id),
      proposedChoices: selected.map(row => ({ id: row.id, kind: row.kind, status: 'REQUIRES_DOMAIN_APPROVAL', sourceRef: row.sourceRef })) };
  });
  const actualWeeks = new Set();
  const actuals = input.actuals ?? [];
  for (const row of actuals) {
    if (!Number.isInteger(row.week) || row.week < 1 || row.week > 13 || actualWeeks.has(row.week) || row.currency !== input.currency || !row.sourceRef) throw Error('Unique, sourced actual weeks in the same currency required');
    actualWeeks.add(row.week); money(row.closingMinor, true);
  }
  const abs = value => value < 0n ? -value : value;
  const { actuals: _actuals, ...frozenAssumptions } = input;
  return { kind: 'PLANNING_PROTOTYPE_NOT_ACCOUNTING_FACT', assumptionVersion: input.assumptionVersion,
    assumptionHash: createHash('sha256').update(JSON.stringify(frozenAssumptions)).digest('hex'),
    inputHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'), currency: input.currency, minorUnits: input.minorUnits,
    assumptions: { dailyOrder: 'OUTFLOWS_BEFORE_RECEIPTS', uncertainty: 'EXPECTED_RECEIPTS_DELAY_ONLY', baseline: 'FROZEN_OPENING_CASH', coverageIsUserAttested: true },
    scenarios, evaluation: { observedWeeks: actuals.length, missingWeeks: 13 - actuals.length,
      baselineAbsoluteErrorSumMinor: actuals.length ? actuals.reduce((sum, row) => sum + abs(money(row.closingMinor, true) - opening), 0n).toString() : null,
      scenarioAbsoluteErrorSumMinor: scenarios.map(scenario => ({ id: scenario.id, sumMinor: actuals.length ? actuals.reduce((sum, row) => sum + abs(money(row.closingMinor, true) - BigInt(scenario.weekly[row.week - 1].closingMinor)), 0n).toString() : null })) } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const output = JSON.stringify(compareScenarios(input), null, 2) + '\n';
  if (process.argv[3]) writeFileSync(process.argv[3], output, { flag: 'wx' });
  else process.stdout.write(output);
}
