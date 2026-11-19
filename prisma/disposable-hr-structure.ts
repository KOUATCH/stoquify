/** Synthetic REFERENCE configuration; no HRIS authoring or approval workflow is claimed. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { ForbiddenError } from '../services/_shared/action-errors';
import { resolveHrisPeopleAccessScope } from '../services/hris/org.service';
import { getHrisEmployeeDirectory, getOwnHrisEmployeeProfile } from '../services/hris/employee.service';

type Actor = { organizationId: string; actorId: string; sessionId: string; sessionToken: string; actorPermissions: string[]; lastAuthAt: Date };
const ORGANIZATIONS = ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'];
const START = new Date('2025-11-01T00:00:00Z');
const END = new Date('2026-11-01T00:00:00Z');
const AS_OF = new Date('2026-10-28T20:00:00Z');
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const key = (org: string, kind: string, suffix: string) => `${org}_hrref_${kind}_${suffix}`;

function sameFields(label: string, actual: object, expected: object) {
  const clean = (value: object) => Object.fromEntries(Object.entries(value)
    .filter(([field]) => field !== 'createdAt' && field !== 'updatedAt')
    .sort(([left], [right]) => left.localeCompare(right)));
  if (json(clean(actual)) !== json(clean(expected))) throw new Error(`Retained synthetic HRIS ${label} differs from the expected row; no overwrite performed`);
}

function existingRows<T extends { id: string }>(label: string, actual: T[], expected: Array<{ id: string }>, requireComplete = false) {
  const byId = new Map(actual.map(row => [row.id, row]));
  const planned = new Map(expected.map(row => [row.id, row]));
  if (planned.size !== expected.length) throw new Error(`Duplicate planned HRIS ${label}`);
  if (requireComplete && actual.length !== expected.length) throw new Error(`Incomplete retained HRIS ${label}`);
  for (const row of actual) {
    const expectedRow = planned.get(row.id);
    if (!expectedRow) throw new Error(`Unexpected retained HRIS ${label}; refusing to mix overlapping reference configuration`);
    sameFields(label, row, expectedRow);
  }
  return byId;
}

function retainedDocument(directory: string, name: string, value: unknown) {
  const bytes = Buffer.from(json(value), 'utf8');
  const file = path.join(directory, `${name}.json`);
  if (existsSync(file)) {
    if (!readFileSync(file).equals(bytes)) throw new Error(`Retained synthetic HRIS document differs: ${name}`);
  } else writeFileSync(file, bytes, { flag: 'wx' });
  return { file: path.relative(path.dirname(directory), file).replace(/\\/g, '/'), sha256: sha(bytes), bytes: bytes.length };
}

function sameIds(label: string, actual: string[] | null, expected: string[]) {
  if (actual === null || json([...actual].sort()) !== json([...expected].sort())) throw new Error(`HRIS ${label} returned an unexpected employee scope`);
}

async function expectDenied(label: string, action: () => Promise<unknown>) {
  try { await action(); } catch (error) { if (error instanceof ForbiddenError) return; throw error; }
  throw new Error(`HRIS ${label} unexpectedly granted access`);
}

/** Called by the guarded disposable runner after employee activation and setup-unit creation. */
export async function seedHrisStructure(org: string, actors: Record<string, Actor>, out: string) {
  if (process.env.NODE_ENV !== 'test' || !ORGANIZATIONS.includes(org) || new Date().getTime() !== AS_OF.getTime()) {
    throw new Error('Synthetic HRIS structure requires the owned test organization and fixed dataset clock');
  }
  const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const target = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || manifest.status !== 'schema-verified'
    || !/^stoquify_replay_dataset_[a-z0-9_]{1,35}$/.test(manifest.target.database)) throw new Error('Owned local disposable database required');
  const { assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
  assertManifestTarget(target, manifest);
  const current = await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  if (current[0]?.database !== manifest.target.database) throw new Error('Connected database differs from the disposable manifest');
  for (const role of ['owner', 'manager', 'payroll_administrator']) {
    if (actors[role]?.organizationId !== org || actors[role]?.actorId !== `${org}_user_${role}`) throw new Error(`Missing same-tenant synthetic ${role} actor`);
  }
  const actorInput = (actor: Actor) => ({ organizationId: org, actorId: actor.actorId, actorPermissions: actor.actorPermissions });
  const directory = path.join(out, 'synthetic-documents');
  mkdirSync(directory, { recursive: true });

  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${org + ':synthetic-hris-reference-v1'}))::text AS lock`;
    const employees = await tx.payrollEmployee.findMany({
      where: { organizationId: org }, orderBy: { employeeNumber: 'asc' },
      select: { id: true, employeeNumber: true, organizationId: true, userId: true, status: true, hireDate: true,
        terminationDate: true, deletedAt: true, department: true, jobTitle: true, locationId: true,
        contracts: { where: { status: 'ACTIVE', deletedAt: null }, select: { id: true, organizationId: true, effectiveFrom: true, effectiveTo: true } } },
    });
    if (employees.length !== 12 || employees.some((employee, index) => employee.employeeNumber !== `EMP-${String(index + 1).padStart(3, '0')}`
      || employee.status !== 'ACTIVE' || employee.deletedAt || employee.contracts.length !== 1)) throw new Error('Expected twelve retained active synthetic employees with one active contract each');
    const owner = employees.find(employee => employee.userId === actors.owner.actorId);
    const manager = employees.find(employee => employee.userId === actors.manager.actorId);
    const delegate = employees.find(employee => employee.userId === actors.payroll_administrator.actorId);
    if (!owner || !manager || !delegate || new Set([owner.id, manager.id, delegate.id]).size !== 3) throw new Error('Distinct retained owner, manager and delegate employee links required');
    const units = await tx.hrisOrgUnit.findMany({ where: { organizationId: org } });
    const departments = new Map<string, (typeof units)[number]>();
    for (const [department, code] of [['Retail', 'SYN-RETAIL'], ['Operations', 'SYN-OPERATIONS']]) {
      const unit = units.find(item => item.code === code);
      if (!unit || unit.name !== department || unit.type !== 'DEPARTMENT' || unit.status !== 'ACTIVE'
        || unit.effectiveFrom.getTime() !== START.getTime() || unit.effectiveTo?.getTime() !== END.getTime()) throw new Error('Retained department does not match synthetic setup configuration');
      departments.set(department, unit);
    }
    const locations = await tx.location.findMany({ where: { organizationId: org, deletedAt: null, isActive: true }, select: { id: true } });
    const locationIds = new Set(locations.map(location => location.id));
    const positions = [] as Array<Prisma.HrisPositionUncheckedCreateInput & { id: string }>;
    const assignments = [] as Array<Prisma.HrisEmploymentAssignmentUncheckedCreateInput & { id: string }>;
    for (const employee of employees) {
      const department = departments.get(employee.department ?? '');
      const branch = [0, 1, 2].find(index => employee.locationId === `${org}_loc_${index}`);
      const contract = employee.contracts[0];
      if (!department || branch === undefined || !locationIds.has(employee.locationId!) || !employee.jobTitle
        || contract.organizationId !== org) throw new Error('Employee department, location, title or contract tenant differs from retained synthetic configuration');
      const positionId = key(org, 'position', `${department.code}_${branch}`);
      const position = { id: positionId, organizationId: org, orgUnitId: department.id, locationId: employee.locationId,
        code: `SYN-REF-${department.code}-${branch}`, title: employee.jobTitle, status: 'ACTIVE' as const,
        effectiveFrom: START, effectiveTo: END };
      const retainedPosition = positions.find(item => item.id === positionId);
      if (retainedPosition) sameFields('position grouping', retainedPosition, position); else positions.push(position);
      const effectiveFrom = new Date(Math.max(START.getTime(), employee.hireDate.getTime(), contract.effectiveFrom.getTime()));
      const effectiveTo = new Date(Math.min(END.getTime(), employee.terminationDate?.getTime() ?? END.getTime(), contract.effectiveTo?.getTime() ?? END.getTime()));
      if (effectiveFrom >= effectiveTo || effectiveFrom > AS_OF || effectiveTo <= AS_OF) throw new Error('Retained employment interval cannot support current synthetic assignment');
      assignments.push({ id: key(org, 'assignment', employee.employeeNumber), organizationId: org, employeeId: employee.id,
        positionId, orgUnitId: department.id, type: 'PRIMARY', status: 'ACTIVE', effectiveFrom, effectiveTo });
    }
    if (positions.length !== 6) throw new Error('Expected six retained department/location position combinations');
    const assignmentFor = (employeeId: string) => assignments.find(item => item.employeeId === employeeId)!;
    const relationshipPlans = employees.filter(employee => employee.id !== owner.id).map(employee => {
      const supervisor = employee.id === manager.id ? owner : manager;
      const supervisorAssignment = assignmentFor(supervisor.id), reportAssignment = assignmentFor(employee.id);
      return { id: key(org, 'report', employee.employeeNumber), organizationId: org, managerEmployeeId: supervisor.id,
        managerAssignmentId: supervisorAssignment.id, reportEmployeeId: employee.id, reportAssignmentId: reportAssignment.id,
        type: 'DIRECT' as const, status: 'ACTIVE' as const,
        effectiveFrom: new Date(Math.max(new Date(supervisorAssignment.effectiveFrom).getTime(), new Date(reportAssignment.effectiveFrom).getTime())),
        effectiveTo: new Date(Math.min(new Date(supervisorAssignment.effectiveTo!).getTime(), new Date(reportAssignment.effectiveTo!).getTime())),
        approvedById: actors.owner.actorId, supersedesRelationshipId: null };
    });
    // A root with one manager and a single level below it is acyclic; no employee reports to themselves.
    if (relationshipPlans.some(row => row.managerEmployeeId === row.reportEmployeeId || row.reportEmployeeId === owner.id)) throw new Error('Invalid synthetic reporting tree');
    const delegationPlan = { id: key(org, 'delegation', 'operations-read-october'), organizationId: org,
      delegatorEmployeeId: manager.id, delegateEmployeeId: delegate.id, scopeOrgUnitId: departments.get('Operations')!.id,
      authority: 'PEOPLE_READ' as const, status: 'ACTIVE' as const,
      effectiveFrom: new Date(Math.max(new Date('2026-10-01T00:00:00Z').getTime(), new Date(assignmentFor(manager.id).effectiveFrom).getTime(), new Date(assignmentFor(delegate.id).effectiveFrom).getTime())),
      effectiveTo: new Date(Math.min(END.getTime(), new Date(assignmentFor(manager.id).effectiveTo!).getTime(), new Date(assignmentFor(delegate.id).effectiveTo!).getTime())),
      approvedById: actors.owner.actorId, revokedAt: null, revocationReasonHash: null, supersedesDelegationId: null };
    if (delegate.department === 'Operations' || delegationPlan.effectiveFrom >= delegationPlan.effectiveTo) throw new Error('Delegation would include the delegate or has an empty interval');
    const reason = retainedDocument(directory, `${org}-hr-structure-reason`, {
      classification: 'SYNTHETIC_REFERENCE_CONFIGURATION', schemaVersion: 1, organizationId: org,
      purpose: 'Exercise effective reporting and Operations read coverage using retained synthetic employee profiles.',
      authority: 'User-authorized disposable dataset configuration; no real employment or legal attestation.',
      authoringServiceAvailable: false, authoringWorkflowExecuted: false, approvalWorkflowExecuted: false,
      realApprovalClaimed: false, externalAttestationClaimed: false, certificationClaimed: false,
    });
    const provenance = retainedDocument(directory, `${org}-hr-structure-provenance`, {
      classification: 'SYNTHETIC_REFERENCE_CONFIGURATION', schemaVersion: 1, organizationId: org,
      configuredAt: AS_OF.toISOString(), persistenceMethod: 'PRISMA_REFERENCE_FIXTURE_NO_AUTHORING_SERVICE',
      approvalFieldMeaning: 'Required storage references identify the synthetic owner persona and these exact fixture bytes; no approval UI, real signature or external attestation is claimed.',
      realPeopleIncluded: false, employmentProfilesChanged: false, realApprovalClaimed: false,
      authoringWorkflowExecuted: false, approvalWorkflowExecuted: false, certificationClaimed: false,
      sourceEmployees: employees, positions, assignments, reportingRelationships: relationshipPlans,
      delegation: delegationPlan, reasonDocument: reason,
    });
    const evidence = { approvalEvidenceHash: `sha256:${provenance.sha256}`, reasonHash: `sha256:${reason.sha256}` };
    const relationships = relationshipPlans.map(row => ({ ...row, ...evidence }));
    const delegations = [{ ...delegationPlan, ...evidence }];
    const oldPositions = existingRows('positions', await tx.hrisPosition.findMany({ where: { organizationId: org } }), positions);
    const oldAssignments = existingRows('assignments', await tx.hrisEmploymentAssignment.findMany({ where: { organizationId: org } }), assignments);
    const oldRelationships = existingRows('reporting relationships', await tx.hrisReportingRelationship.findMany({ where: { organizationId: org } }), relationships);
    const oldDelegations = existingRows('delegations', await tx.hrisManagerDelegation.findMany({ where: { organizationId: org } }), delegations);
    for (const row of positions) if (!oldPositions.has(row.id)) await tx.hrisPosition.create({ data: row });
    for (const row of assignments) if (!oldAssignments.has(row.id)) await tx.hrisEmploymentAssignment.create({ data: row });
    for (const row of relationships) if (!oldRelationships.has(row.id)) await tx.hrisReportingRelationship.create({ data: row });
    for (const row of delegations) if (!oldDelegations.has(row.id)) await tx.hrisManagerDelegation.create({ data: row });
    existingRows('positions after write', await tx.hrisPosition.findMany({ where: { organizationId: org } }), positions, true);
    existingRows('assignments after write', await tx.hrisEmploymentAssignment.findMany({ where: { organizationId: org } }), assignments, true);
    existingRows('relationships after write', await tx.hrisReportingRelationship.findMany({ where: { organizationId: org } }), relationships, true);
    existingRows('delegations after write', await tx.hrisManagerDelegation.findMany({ where: { organizationId: org } }), delegations, true);

    // These are existing application readers; they also append their normal scope audit logs.
    const expectedManagerIds = employees.filter(employee => employee.id !== owner.id && employee.id !== manager.id).map(employee => employee.id);
    const managerDirectory = await getHrisEmployeeDirectory({ ...actorInput(actors.manager), asOf: AS_OF, limit: 100 }, tx);
    if (managerDirectory.accessScope.authority.kind !== 'REPORTING_RELATIONSHIP') throw new Error('Manager did not resolve through durable reporting authority');
    sameIds('manager authority', managerDirectory.accessScope.employeeIds, expectedManagerIds);
    sameIds('manager directory', managerDirectory.employees.map(employee => employee.id), expectedManagerIds);
    const own = await getOwnHrisEmployeeProfile(actorInput(actors.manager), tx);
    if (own.employee.id !== manager.id || own.accessScope.authority.kind !== 'OWN_RECORD') throw new Error('Own employee reader returned an unexpected identity');
    await expectDenied('manager access to root owner', () => resolveHrisPeopleAccessScope({ ...actorInput(actors.manager), employeeId: owner.id, asOf: AS_OF }, tx));
    await expectDenied('manager access after fixture interval', () => resolveHrisPeopleAccessScope({ ...actorInput(actors.manager), asOf: END }, tx));
    const administratorScope = await resolveHrisPeopleAccessScope({ ...actorInput(actors.payroll_administrator), asOf: AS_OF }, tx);
    if (administratorScope.authority.kind !== 'TENANT_HRIS_ADMIN') throw new Error('Payroll administrator scope unexpectedly differs from actual persona permissions');
    if (!actors.payroll_administrator.actorPermissions.includes('hris.people.read')) throw new Error('Cannot form read-only projection from actual administrator capabilities');
    // Deliberately attenuate the service input only. The real persona remains a tenant HRIS administrator.
    const readProjection = { organizationId: org, actorId: actors.payroll_administrator.actorId, actorPermissions: ['hris.people.read'] };
    const delegatedScope = await resolveHrisPeopleAccessScope({ ...readProjection, asOf: AS_OF }, tx);
    const delegatedEmployeeIds = employees.filter(employee => employee.department === 'Operations' && employee.id !== manager.id && employee.id !== owner.id).map(employee => employee.id);
    if (delegatedScope.authority.kind !== 'DELEGATED_MANAGER_AUTHORITY' || delegatedScope.auditEvidence?.delegationIds[0] !== delegationPlan.id) throw new Error('Read-only service projection did not use the synthetic delegation');
    sameIds('delegated Operations read projection', delegatedScope.employeeIds, delegatedEmployeeIds);
    await expectDenied('read delegation before its start', () => resolveHrisPeopleAccessScope({ ...readProjection, asOf: new Date('2026-09-30T00:00:00Z') }, tx));
    await expectDenied('read delegation cannot decide approvals', () => resolveHrisPeopleAccessScope({ ...readProjection, asOf: AS_OF, delegationAuthority: 'APPROVAL_DECISION' }, tx));
    return { classification: 'SYNTHETIC_REFERENCE_CONFIGURATION', organizationId: org,
      records: { positions: positions.length, primaryAssignments: assignments.length, directRelationships: relationships.length, peopleReadDelegations: delegations.length },
      created: { positions: positions.length - oldPositions.size, primaryAssignments: assignments.length - oldAssignments.size,
        directRelationships: relationships.length - oldRelationships.size, peopleReadDelegations: delegations.length - oldDelegations.size },
      provenance, reason, authoringWorkflowExecuted: false, approvalWorkflowExecuted: false, browserVerified: false,
      serviceReadChecks: { managerAuthority: managerDirectory.accessScope.authority.kind, managerEmployeeIds: expectedManagerIds,
        ownEmployeeId: own.employee.id, rootOwnerDenied: true, endBoundaryDenied: true,
        actualPayrollAdministratorAuthority: administratorScope.authority.kind,
        delegatedReadProjection: { permissionAttenuationOnly: true, personaPermissionsChanged: false, employeeIds: delegatedEmployeeIds,
          authority: delegatedScope.authority.kind, beforeStartDenied: true, approvalAuthorityDenied: true } },
    };
  }, { timeout: 60000, maxWait: 10000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
