const fs = require('node:fs');
const path = require('node:path');
module.exports = class ProgressReporter {
  constructor() { this.completed = 0; this.output = path.join(__dirname, 'gate-test-progress.jsonl'); }
  record(event, details = {}) { fs.appendFileSync(this.output, JSON.stringify({ at: new Date().toISOString(), event, ...details }) + '\n'); }
  onRunStart() { this.record('run-start'); process.stderr.write('[R01] Jest run started\n'); }
  onTestFileStart(test) { this.record('suite-start', { path: test.path }); process.stderr.write(`[R01] Suite started: ${path.basename(test.path)}\n`); }
  onTestCaseStart(test, info) { this.record('case-start', { name: info.fullName || info.title }); }
  onTestCaseResult(test, result) {
    this.completed += 1;
    this.record('case-result', { name: result.fullName, duration: result.duration, status: result.status });
    if (this.completed % 25 === 0) process.stderr.write(`[R01] ${this.completed} test cases completed\n`);
  }
  onRunComplete(contexts, result) { this.record('run-complete', { passed: result.numPassedTests, failed: result.numFailedTests }); }
};
