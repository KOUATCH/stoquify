"use client";
import { HrisEmployeeImport, type ImportExecute } from "./HrisEmployeeImport";
import {
  previewEmployeeImportAction,
  commitEmployeeImportAction,
  getEmployeeImportReceiptAction,
  downloadEmployeeImportErrorsAction,
  getEmployeeImportTemplateAction,
} from "@/actions/hris/employee-import.actions";
const commands = {
  PREVIEW: previewEmployeeImportAction,
  COMMIT: commitEmployeeImportAction,
  RECEIPT: getEmployeeImportReceiptAction,
  ERRORS: downloadEmployeeImportErrorsAction,
  TEMPLATE: getEmployeeImportTemplateAction,
};
const execute: ImportExecute = (command, input) => commands[command](input);
export function HrisEmployeeImportClient({
  organizationId,
  locale,
}: {
  organizationId: string;
  locale: "en" | "fr";
}) {
  return (
    <HrisEmployeeImport
      organizationId={organizationId}
      locale={locale}
      execute={execute}
    />
  );
}
