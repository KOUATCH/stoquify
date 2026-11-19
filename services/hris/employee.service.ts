import {
  attachPayrollEmployeeEvidenceReferences,
  getPayrollEmployeeSourceData,
  upsertPayrollEmployeeSourceProfile,
  type AttachPayrollEmployeeEvidenceInput,
  type PayrollEmployeeProfileInput,
  type PayrollEmployeeSourceDataInput,
  type PayrollEmployeeSourceDataRecord,
  type PayrollEmployeeSourceDataResult,
} from "@/services/payroll/employee.service"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmploymentAsOf } from "./lifecycle.service"
import {
  ownHrisRecordAccessScope,
  resolveHrisPeopleAccessScope,
  type HrisPeopleAccessScope,
} from "@/services/hris/org.service"

type PayrollEmployeeClient = Parameters<typeof getPayrollEmployeeSourceData>[1]

const SELF_SERVICE_READ_PERMISSIONS = [
  "hris.self_service.read",
  "hris.people.read",
  "hris.people.manage",
] as const

export const HRIS_PEOPLE_CORE_DATA_OWNERSHIP = {
  sourceOwner: "HRIS_PEOPLE_CORE",
  compatibilityStorageModel: "PayrollEmployee",
  facade: "services/hris/employee.service",
  payrollConsumptionRule: "PAYROLL_READS_CERTIFIED_HRIS_SNAPSHOTS",
  duplicateEmployeeMasterAllowed: false,
} as const

export type HrisPeopleCoreDataOwnership = typeof HRIS_PEOPLE_CORE_DATA_OWNERSHIP
export type HrisEmployeeDirectoryInput = Omit<PayrollEmployeeSourceDataInput, "employeeId" | "employeeIds" | "userId">
export type HrisEmployeeProfileReadInput = Omit<PayrollEmployeeSourceDataInput, "employeeIds" | "userId"> & {
  employeeId: string
}
export type HrisOwnEmployeeProfileInput = Omit<
  PayrollEmployeeSourceDataInput,
  "actorId" | "employeeId" | "employeeIds" | "userId"
> & {
  actorId: string
}
export type HrisEmployeeProfileInput = PayrollEmployeeProfileInput
export type HrisEmployeeEvidenceInput = AttachPayrollEmployeeEvidenceInput
export type HrisEmployeeRecord = Omit<PayrollEmployeeSourceDataRecord, "userMapping"> & {
  userMapping: Omit<PayrollEmployeeSourceDataRecord["userMapping"], "userId">
  dataOwnership: HrisPeopleCoreDataOwnership
}
export type HrisEmployeeDirectoryResult = Omit<PayrollEmployeeSourceDataResult, "employees"> & {
  dataOwnership: HrisPeopleCoreDataOwnership
  accessScope: HrisPeopleAccessScope
  employees: HrisEmployeeRecord[]
}
export type HrisEmployeeProfileReadResult = {
  organizationId: string
  asOf: string
  employee: HrisEmployeeRecord
  redaction: PayrollEmployeeSourceDataResult["redaction"]
  dataOwnership: HrisPeopleCoreDataOwnership
  accessScope: HrisPeopleAccessScope
}
export type HrisEmployeeProfileResult = Awaited<ReturnType<typeof upsertPayrollEmployeeSourceProfile>> & {
  dataOwnership: HrisPeopleCoreDataOwnership
}
export type HrisEmployeeEvidenceResult = Awaited<ReturnType<typeof attachPayrollEmployeeEvidenceReferences>> & {
  dataOwnership: HrisPeopleCoreDataOwnership
}

function withHrisPeopleOwnership<T extends object>(value: T): T & { dataOwnership: HrisPeopleCoreDataOwnership } {
  return {
    ...value,
    dataOwnership: HRIS_PEOPLE_CORE_DATA_OWNERSHIP,
  }
}

function toHrisEmployeeRecord(employee: PayrollEmployeeSourceDataRecord): HrisEmployeeRecord {
  return {
    ...employee,
    userMapping: {
      state: employee.userMapping.state,
      userDisplayName: employee.userMapping.userDisplayName,
      userEmailMasked: employee.userMapping.userEmailMasked,
    },
    dataOwnership: HRIS_PEOPLE_CORE_DATA_OWNERSHIP,
  }
}

function toHrisEmployeeProfileResult(
  result: PayrollEmployeeSourceDataResult,
  notFoundMessage: string,
  accessScope: HrisPeopleAccessScope,
): HrisEmployeeProfileReadResult {
  const employee = result.employees[0]
  if (!employee) throw new NotFoundError(notFoundMessage)

  return {
    organizationId: result.organizationId,
    asOf: result.asOf,
    employee: toHrisEmployeeRecord(employee),
    redaction: result.redaction,
    dataOwnership: HRIS_PEOPLE_CORE_DATA_OWNERSHIP,
    accessScope,
  }
}

export async function getHrisEmployeeDirectory(
  input: HrisEmployeeDirectoryInput,
  client?: PayrollEmployeeClient,
): Promise<HrisEmployeeDirectoryResult> {
  const accessScope = await resolveHrisPeopleAccessScope({
    organizationId: input.organizationId,
    actorId: input.actorId ?? "",
    actorPermissions: input.actorPermissions,
    limit: input.limit,
    asOf: input.asOf,
  }, client)
  const result = await getPayrollEmployeeSourceData({
    ...input,
    ...(accessScope.employeeIds ? { employeeIds: accessScope.employeeIds } : {}),
  }, client)

  return {
    ...result,
    dataOwnership: HRIS_PEOPLE_CORE_DATA_OWNERSHIP,
    accessScope,
    employees: result.employees.map(toHrisEmployeeRecord),
  }
}

export async function getHrisEmployeeProfile(
  input: HrisEmployeeProfileReadInput,
  client?: PayrollEmployeeClient,
): Promise<HrisEmployeeProfileReadResult> {
  const accessScope = await resolveHrisPeopleAccessScope({
    organizationId: input.organizationId,
    actorId: input.actorId ?? "",
    actorPermissions: input.actorPermissions,
    employeeId: input.employeeId,
    limit: 1,
    asOf: input.asOf,
  }, client)
  const result = await getPayrollEmployeeSourceData(
    {
      ...input,
      employeeId: input.employeeId,
      limit: 1,
    },
    client,
  )

  const profile=toHrisEmployeeProfileResult(result, "HRIS employee profile not found", accessScope)
  if (input.asOf) {
    const projection=await getHrisEmploymentAsOf({organizationId:input.organizationId,employeeId:input.employeeId,
      actorId:input.actorId,actorPermissions:input.actorPermissions,asOf:new Date(input.asOf)},client)
    profile.employee.status=projection.state.status
    profile.employee.blockers=profile.employee.blockers.filter(code=>code!=="EMPLOYEE_NOT_ACTIVE")
    if(projection.state.status!=="ACTIVE")profile.employee.blockers.push("EMPLOYEE_NOT_ACTIVE")
    const {hireDate,terminationDate,locationId,department,jobTitle,costCenter}=projection.state
    profile.employee.employment={...profile.employee.employment,hireDate,terminationDate,locationId,department,jobTitle,costCenter}
  }
  return profile
}

export async function getOwnHrisEmployeeProfile(
  input: HrisOwnEmployeeProfileInput,
  client?: PayrollEmployeeClient,
): Promise<HrisEmployeeProfileReadResult> {
  if (!hasAnyRbacPermission(input.actorPermissions, SELF_SERVICE_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for own HRIS employee profile read.")
  }

  const result = await getPayrollEmployeeSourceData(
    {
      ...input,
      actorId: input.actorId,
      actorPermissions: Array.from(new Set([
        ...(input.actorPermissions ?? []),
        "hris.people.read",
      ])),
      userId: input.actorId,
      limit: 2,
    },
    client,
  )

  if (result.employees.length > 1) {
    throw new ConflictError("Authenticated user maps to multiple HRIS employee profiles.")
  }

  return toHrisEmployeeProfileResult(
    result,
    "No HRIS employee profile is linked to the authenticated user",
    ownHrisRecordAccessScope(input.organizationId),
  )
}

export async function upsertHrisEmployeeProfile(
  input: HrisEmployeeProfileInput,
  client?: PayrollEmployeeClient,
): Promise<HrisEmployeeProfileResult> {
  return withHrisPeopleOwnership(await upsertPayrollEmployeeSourceProfile(input, client))
}

export async function attachHrisEmployeeEvidenceReferences(
  input: HrisEmployeeEvidenceInput,
  client?: PayrollEmployeeClient,
): Promise<HrisEmployeeEvidenceResult> {
  return withHrisPeopleOwnership(await attachPayrollEmployeeEvidenceReferences(input, client))
}
