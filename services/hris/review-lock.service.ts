import "server-only"
import { Prisma } from "@prisma/client"
import { NotFoundError } from "@/services/_shared/action-errors"
import { lockOperationalEmployeeInTx } from "./attendance-correction"

/** One lock order for review and competing native writers: employee, then source.
 * Identity-only lookups precede locks; callers reread all business facts afterward.
 */
export async function lockHrisReviewEmployeeInTx(tx:Prisma.TransactionClient,organizationId:string,employeeId:string){
  await lockOperationalEmployeeInTx(tx,organizationId,employeeId)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_employees WHERE id=${employeeId} AND "organizationId"=${organizationId} FOR UPDATE`)
}
export async function lockHrisReviewContractInTx(tx:Prisma.TransactionClient,organizationId:string,contractId:string,employeeId?:string){
  const identity=await tx.payrollContract.findFirst({where:{id:contractId,organizationId,...(employeeId?{employeeId}:{}),deletedAt:null},select:{employeeId:true}})
  if(!identity)throw new NotFoundError("Contract was not found in this employee and tenant scope.")
  await lockHrisReviewEmployeeInTx(tx,organizationId,identity.employeeId)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_contracts WHERE id=${contractId} AND "organizationId"=${organizationId} FOR UPDATE`)
}
export async function lockHrisReviewSalaryInTx(tx:Prisma.TransactionClient,organizationId:string,requestId:string,employeeId?:string){
  const identity=await tx.payrollSalaryChangeRequest.findFirst({where:{id:requestId,organizationId,...(employeeId?{employeeId}:{}),deletedAt:null},select:{employeeId:true,sourceContractId:true}})
  if(!identity)throw new NotFoundError("Salary request was not found in this tenant.")
  await lockHrisReviewEmployeeInTx(tx,organizationId,identity.employeeId)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_salary_change_requests WHERE id=${requestId} AND "organizationId"=${organizationId} FOR UPDATE`)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_contracts WHERE id=${identity.sourceContractId} AND "organizationId"=${organizationId} FOR UPDATE`)
}
export async function lockHrisReviewPaymentInTx(tx:Prisma.TransactionClient,organizationId:string,requestId:string,employeeId?:string){
  const identity=await tx.payrollPaymentDestinationChangeRequest.findFirst({where:{id:requestId,organizationId,...(employeeId?{employeeId}:{}),deletedAt:null},select:{employeeId:true}})
  if(!identity)throw new NotFoundError("Payment destination request was not found in this tenant.")
  await lockHrisReviewEmployeeInTx(tx,organizationId,identity.employeeId)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_payment_destination_change_requests WHERE id=${requestId} AND "organizationId"=${organizationId} FOR UPDATE`)
}
export async function lockHrisReviewAssignmentInTx(tx:Prisma.TransactionClient,organizationId:string,employeeId:string,assignmentId:string){
  await lockHrisReviewEmployeeInTx(tx,organizationId,employeeId)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_employee_rubrique_assignments WHERE id=${assignmentId} AND "organizationId"=${organizationId} AND "employeeId"=${employeeId} FOR UPDATE`)
  const assignment=await tx.payrollEmployeeRubriqueAssignment.findFirst({where:{id:assignmentId,organizationId,employeeId,deletedAt:null},select:{rubriqueId:true}})
  if(!assignment)throw new NotFoundError("Compensation assignment was not found in this employee scope.")
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_rubriques WHERE id=${assignment.rubriqueId} AND "organizationId"=${organizationId} FOR SHARE`)
}
