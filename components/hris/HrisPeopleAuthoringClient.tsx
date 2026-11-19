"use client";
import {
  HrisPeopleAuthoring,
  type AuthoringRequest,
} from "./HrisPeopleAuthoring";
import type { PeopleAuthoringView } from "@/services/hris/people-authoring-read.service";
import { getPeopleAuthoringAction } from "@/actions/hris/people-authoring-read.actions";
import { upsertHrisEmployeeProfileAction } from "@/actions/hris/employee.actions";
import { createPayrollContractAction } from "@/actions/payroll/payroll-contract.actions";
import {
  requestHrisContractActivationAction,
  requestHrisContractDocumentAction,
} from "@/actions/hris/contract-authoring.actions";
import { decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions";
import {
  requestHrisEmployeeLifecycleAction,
  approveHrisEmployeeLifecycleAction,
  applyApprovedHrisEmployeeLifecycleAction,
} from "@/actions/hris/lifecycle.actions";
import {
  requestHrisSalaryChangeAction,
  approveHrisSalaryChangeAction,
  applyApprovedHrisSalaryChangeAction,
} from "@/actions/hris/compensation.actions";
import {
  requestHrisPaymentDestinationChangeAction,
  approveHrisPaymentDestinationChangeAction,
  applyApprovedHrisPaymentDestinationChangeAction,
} from "@/actions/hris/payment-destination.actions";

// Client dispatch only. Each existing server action independently authorizes its own operation.
const commands: Record<string, (data: any) => Promise<any>> = {
  PROFILE: upsertHrisEmployeeProfileAction,
  CONTRACT_CREATE: createPayrollContractAction,
  DOCUMENT_REQUEST: requestHrisContractDocumentAction,
  CONTRACT_REQUEST: requestHrisContractActivationAction,
  INBOX: decideHrisApprovalInboxItemAction,
  LIFECYCLE_REQUEST: requestHrisEmployeeLifecycleAction,
  LIFECYCLE_APPROVE: approveHrisEmployeeLifecycleAction,
  LIFECYCLE_APPLY: applyApprovedHrisEmployeeLifecycleAction,
  SALARY_REQUEST: requestHrisSalaryChangeAction,
  SALARY_APPROVE: approveHrisSalaryChangeAction,
  SALARY_APPLY: applyApprovedHrisSalaryChangeAction,
  PAYMENT_REQUEST: requestHrisPaymentDestinationChangeAction,
  PAYMENT_APPROVE: approveHrisPaymentDestinationChangeAction,
  PAYMENT_APPLY: applyApprovedHrisPaymentDestinationChangeAction,
};
export function HrisPeopleAuthoringClient({
  initial,
  locale,
}: {
  initial: PeopleAuthoringView;
  locale: "en" | "fr";
}) {
  return (
    <HrisPeopleAuthoring
      initial={initial}
      locale={locale}
      execute={async (request: AuthoringRequest) => {
        const operation = commands[request.operation];
        if (!operation) throw new Error("Unknown operation");
        return operation(request.data);
      }}
      reload={async (employeeId) => {
        const result = await getPeopleAuthoringAction({ employeeId });
        if (!result.success) throw Object.assign(new Error(result.error), {code: result.code});
        return result.data;
      }}
    />
  );
}
