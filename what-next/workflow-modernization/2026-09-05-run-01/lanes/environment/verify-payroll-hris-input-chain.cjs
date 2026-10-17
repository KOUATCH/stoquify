// Owned local verification only. External document, policy and scanner inputs are
// explicitly synthetic fixtures; they are not organizational/statutory approvals.
const f = require('./statement-recipient-fixtures.cjs');
const {db, fs, path, crypto, assert, helper, root} = f;
const id = crypto.randomUUID();
const receipt = {at: new Date().toISOString(), fixtureOnly: true, stage: 'ownership', steps: []};
const files = ['services/payroll/payroll-control.service.ts', 'services/payroll/employee.service.ts', 'services/payroll/contract.service.ts', 'services/hris/employee.service.ts', 'services/hris/contract.service.ts', 'services/hris/document-evidence.service.ts', 'services/hris/time-leave.service.ts', 'services/hris/time-leave.contract.ts', 'services/hris/payroll-readiness-contract.ts', 'services/payroll/payment-evidence.service.ts', 'services/regulatory/country-packs/cameroon.ts', 'services/regulatory/country-packs/registry.ts', 'services/regulatory/country-packs/resolve.ts', 'prisma/schema.prisma'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
receipt.sourceBefore = hashes();
const load = file => require(path.join(root, file));
const control = load('services/payroll/payroll-control.service.ts');
const people = load('services/hris/employee.service.ts');
const contracts = load('services/payroll/contract.service.ts');
const activation = load('services/hris/contract.service.ts');
const documents = load('services/hris/document-evidence.service.ts');
const time = load('services/hris/time-leave.service.ts');
const destination = load('services/payroll/payment-evidence.service.ts');
const {hashBusinessPayload} = load('services/events/business-event.service.ts');
const {buildHrisPayrollReadinessExport} = load('services/hris/payroll-readiness-contract.ts');
const hash = value => 'sha256:' + hashBusinessPayload(value);
const proof = name => hash({kind: 'SYNTHETIC_TEST_INPUT_NOT_APPROVAL', id, name});

async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  process.env.PAYROLL_PAYMENT_DESTINATION_HASH_SECRET = crypto.randomBytes(32).toString('hex');
  const org = await db.organization.create({data: {name: helper.prefix + 'HRIS chain ' + id, slug: 'hris-chain-' + id, currency: 'XAF', country: 'CM'}});
  const scope = {organizationId: org.id};
  receipt.organizationId = org.id;
  const actors = [];
  for (const name of ['preparer', 'approver', 'applier']) actors.push(await db.user.create({data: {...scope, name: 'Owned HRIS ' + name, email: name + '-' + id + '@example.invalid'}}));
  const actor = index => ({...scope, actorId: actors[index].id, actorPermissions: ['hris.people.manage']});
  const now = new Date(), start = new Date(now.getTime() - 86400000), end = new Date(now.getTime() + 86400000);
  await db.organizationAccountingSettings.create({data: {...scope, payrollCnpsFamilyAllowanceSector: 'GENERAL', payrollCnpsOccupationalRiskGroup: 'A'}});
  const periodInput = {...scope, name: 'Owned HRIS period', periodStart: start, periodEnd: end, payDate: now, countryCode: 'CM', actorId: actors[0].id};
  receipt.stage = 'period country-pack gate';
  const countryGate = /CNPS pension rates requires EXPERT_REVIEWED or REGULATOR_CONFIRMED/;
  let periodError;
  await assert.rejects(control.createPayrollPeriod(periodInput, db), error => {periodError = f.safe(error); return countryGate.test(error.message);});
  assert.equal(await db.payrollPeriod.count({where: scope}), 0);
  receipt.periodCreation = {blocked: true, message: periodError, noPeriodCreated: true};
  // A raw OPEN period is only a fixture for independent HRIS attendance tests.
  // It is not evidence that the guarded period-creation workflow succeeded.
  const period = await db.payrollPeriod.create({data: {...scope, name: 'Synthetic container for HRIS verification', periodStart: start, periodEnd: end, payDate: now, countryCode: 'CM'}});
  receipt.fixturePeriodId = period.id;
  receipt.stage = 'HRIS identity';
  const employee = (await people.upsertHrisEmployeeProfile({...actor(0), employeeNumber: 'OWNED', displayName: 'Owned synthetic employee', status: 'ACTIVE', hireDate: start, countryCode: 'CM', sourceReference: {sourceSystem: 'OWNED_SYNTHETIC_FIXTURE', sourceRecordId: id, sourceHash: proof('identity')}, idempotencyKey: id + '-identity'}, db)).payrollEmployee;
  receipt.employeeId = employee.id;
  const contract = (await contracts.createPayrollContract({...scope, actorId: actors[0].id, actorPermissions: ['payroll.contracts.manage'], employeeId: employee.id, contractNumber: 'OWNED', type: 'OTHER', effectiveFrom: start, baseSalary: '100000', workingHoursPerMonth: '160', idempotencyKey: id + '-contract'}, db)).contract;
  const contractScope = {employeeId: employee.id, contractId: contract.id};
  receipt.stage = 'document approval';
  await documents.requestHrisContractDocumentEvidence({...actor(0), ...contractScope, artifactHash: proof('document'), malwareScanEvidenceHash: proof('synthetic-scan'), malwareScanProvider: 'SYNTHETIC TEST SCANNER', malwareScannedAt: now, signedAt: now, retentionPolicyCode: 'TEST_ONLY', retentionBasis: 'Owned verification fixture only', retainUntil: new Date(now.getTime() + 86400000 * 30), idempotencyKey: id + '-document'}, db);
  const documentApproval = {...contractScope, decisionReason: 'Synthetic fixture approval only', approvalEvidenceHash: proof('document-approval')};
  await assert.rejects(documents.approveHrisContractDocumentEvidence({...actor(0), ...documentApproval}, db), /own|independent|separation/i);
  await documents.approveHrisContractDocumentEvidence({...actor(1), ...documentApproval, idempotencyKey: id + '-document-approve'}, db);
  receipt.steps.push('actual document request and independent approval; self-approval denied');
  receipt.stage = 'contract activation';
  await activation.requestHrisContractActivation({...actor(0), ...contractScope, reason: 'Owned fixture activation', requestEvidenceHash: proof('contract-request'), idempotencyKey: id + '-activation'}, db);
  const contractApproval = {...contractScope, decisionReason: 'Synthetic fixture approval only', approvalEvidenceHash: proof('contract-approval')};
  await assert.rejects(activation.approveHrisContractActivation({...actor(0), ...contractApproval}, db), /own|independent|separation/i);
  await activation.approveHrisContractActivation({...actor(1), ...contractApproval, idempotencyKey: id + '-activation-approve'}, db);
  receipt.steps.push('actual contract activation with independent approval');
  receipt.stage = 'payment destination';
  const requested = await destination.requestPaymentDestinationChange({...scope, employeeId: employee.id, actorId: actors[0].id, actorPermissions: ['payroll.payment_destination.request'], paymentMethod: 'BANK_TRANSFER', bankAccountNumber: 'OWNED-SYNTHETIC-0000', requestReason: 'Owned fixture only', evidenceDocumentHash: proof('destination'), idempotencyKey: id + '-destination'}, db);
  const requestId = requested.paymentDestinationChange.id;
  await destination.approvePaymentDestinationChange({...scope, actorId: actors[1].id, actorPermissions: ['payroll.payment_destination.approve'], paymentDestinationChangeRequestId: requestId, decisionReason: 'Owned fixture only', approvalEvidenceHash: proof('destination-approval'), idempotencyKey: id + '-destination-approve'}, db);
  await destination.applyApprovedPaymentDestinationChange({...scope, actorId: actors[2].id, actorPermissions: ['payroll.payment_destination.apply'], paymentDestinationChangeRequestId: requestId, idempotencyKey: id + '-destination-apply'}, db);
  receipt.steps.push('actual destination request/approval/application with three distinct actors');
  receipt.stage = 'attendance certification';
  const totals = {scheduledMinutes: 9600, workedMinutes: 9600, overtimeMinutes: 0, absenceMinutes: 0, leaveMinutes: 0};
  const attendanceInput = {...actor(1), employeeId: employee.id, payrollPeriodId: period.id, ...totals, sourceSystem: 'OWNED_SYNTHETIC_FIXTURE', sourceRecordId: id, sourceRevision: 1, preparedById: actors[0].id, approvalEvidenceHash: proof('attendance-approval'), policy: {countryCode: 'CM', policyVersion: 'SYNTHETIC_TEST_ONLY', countryPolicyHash: proof('country-policy'), companyPolicyHash: proof('company-policy'), leavePolicyHash: proof('leave-policy'), overtimePolicyHash: proof('overtime-policy'), scheduleHash: proof('schedule'), holidayCalendarHash: proof('calendar'), effectiveFrom: start.toISOString(), effectiveTo: end.toISOString(), verificationStatus: 'REVIEWED', reviewedById: actors[2].id, reviewEvidenceHash: proof('synthetic-policy-review')}, evidence: {attendanceImportHash: proof('attendance-import'), leaveBalanceSnapshotHash: proof('leave-balance')}, unresolved: {}, idempotencyKey: id + '-attendance'};
  await assert.rejects(time.certifyHrisTimeLeaveAttendance({...attendanceInput, actorId: actors[0].id}, db), /preparer|separation/i);
  await time.certifyHrisTimeLeaveAttendance(attendanceInput, db);
  const savedEmployee = await db.payrollEmployee.findUniqueOrThrow({where: {id: employee.id}});
  const savedContract = await db.payrollContract.findUniqueOrThrow({where: {id: contract.id}});
  const savedDestination = await db.payrollPaymentDestinationChangeRequest.findUniqueOrThrow({where: {id: requestId}});
  const snapshot = await db.payrollAttendanceSnapshot.findFirstOrThrow({where: {...scope, employeeId: employee.id, payrollPeriodId: period.id}});
  const {validateHrisTimeLeaveAttendanceCertification} = load('services/hris/time-leave.contract.ts');
  const certification = validateHrisTimeLeaveAttendanceCertification({sourcePayload: snapshot.metadata.sourcePayload, approvedById: actors[1].id, countryCode: 'CM', periodStart: start, periodEnd: end, totals});
  const readiness = buildHrisPayrollReadinessExport({...scope, payrollPeriodId: period.id, countryCode: 'CM', periodStart: start.toISOString(), periodEnd: end.toISOString(), employees: [{employeeId: employee.id, employeeDisplayName: employee.displayName, employeeMetadata: savedEmployee.metadata, contract: {...savedContract, baseSalary: savedContract.baseSalary.toFixed(2), effectiveFrom: start.toISOString(), effectiveTo: null}, compensationAssignments: [], paymentDestinationHash: savedEmployee.paymentDestinationHash, paymentDestinationRequest: {...savedDestination, appliedAt: savedDestination.appliedAt.toISOString()}, attendance: {snapshotId: snapshot.id, sourceHash: snapshot.sourceHash, certificationHash: hash(certification)}}]});
  assert.equal(readiness.status, 'READY', JSON.stringify(readiness.blockers));
  assert.ok(!JSON.stringify(savedDestination).includes('OWNED-SYNTHETIC-0000'));
  receipt.hrisProof = {status: readiness.status, hash: readiness.exportHash, contractId: contract.id, attendanceSnapshotId: snapshot.id, destinationRequestId: requestId, syntheticExternalInputs: true};
  receipt.stage = 'calculation country-pack gate';
  const counts = async () => ({runs: await db.payrollRun.count({where: scope}), payslips: await db.payrollPayslip.count({where: scope}), payments: await db.payrollPaymentBatch.count({where: scope}), journals: await db.journalEntry.count({where: scope})});
  const before = await counts();
  let calculationError;
  await assert.rejects(control.calculatePayrollRun({...scope, payrollPeriodId: period.id, preparedById: actors[0].id, idempotencyKey: id + '-calculate'}, db), error => {calculationError = f.safe(error); return countryGate.test(error.message);});
  assert.deepEqual(await counts(), before);
  receipt.calculation = {blocked: true, message: calculationError, noFinancialEffects: true, calculationExecuted: false, releaseExecuted: false};
  receipt.passed = true;
}
main().catch(error => {receipt.passed = false; receipt.error = f.safe(error); process.exitCode = 1;}).finally(async () => {
  receipt.sourceAfter = hashes(); receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
  if (!receipt.sourceStable) {receipt.passed = false; process.exitCode = 1;}
  await db.$disconnect();
  const file = 'payroll-hris-input-chain-' + id + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({file, passed: receipt.passed, stage: receipt.stage, error: receipt.error}));
});
