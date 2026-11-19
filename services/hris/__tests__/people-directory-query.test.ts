import {peopleDirectoryQuerySchema, peopleDirectoryHref} from "../people-directory-query"
import {getPayrollEmployeeSourceData} from "@/services/payroll/employee.service"

it("normalizes invalid URLs and preserves filters in page navigation", () => {
  expect(peopleDirectoryQuerySchema.parse({page: "-3", status: "ADMIN", search: ["bad"]})).toEqual({page: 1, search: "", department: ""})
  const q = peopleDirectoryQuerySchema.parse({page: "3", search: "A & B", department: "RH", status: "ACTIVE"})
  const url = new URL(peopleDirectoryHref("/fr/dashboard/people",q,2),"http://localhost")
  expect(Object.fromEntries(url.searchParams)).toEqual({page: "2", search: "A & B", department: "RH", status: "ACTIVE"})
})

it("uses identical authorized predicates for scoped count and stable page rows", async () => {
  const client = {payrollEmployee: {count: jest.fn().mockResolvedValueOnce(51).mockResolvedValueOnce(200), findMany: jest.fn().mockResolvedValue([])}, auditLog: {create: jest.fn()}}
  const result = await getPayrollEmployeeSourceData({organizationId: "org", actorId: "actor", actorPermissions: ["hris.people.read"], employeeIds: ["allowed"], page: 99, limit: 25, search: "final", department: "RH", status: "ACTIVE"}, client as never)
  expect(result.pagination).toEqual({page: 3, pageSize: 25, total: 51, totalPages: 3, authorizedTotal: 200})
  const rows = client.payrollEmployee.findMany.mock.calls[0][0]
  expect(rows.where).toEqual(client.payrollEmployee.count.mock.calls[0][0].where)
  expect(rows).toMatchObject({where: {organizationId: "org", id: {in: ["allowed"]}}, skip: 50, take: 25, orderBy: [{displayName: "asc"}, {id: "asc"}]})
})

it("propagates database failure rather than reporting zero people", async () => {
  const client = {payrollEmployee: {count: jest.fn().mockRejectedValue(new Error("synthetic unavailable")), findMany: jest.fn()}}
  await expect(getPayrollEmployeeSourceData({organizationId: "org", actorPermissions: ["hris.people.read"], page: 1},client as never)).rejects.toThrow("synthetic unavailable")
  expect(client.payrollEmployee.findMany).not.toHaveBeenCalled()
})
