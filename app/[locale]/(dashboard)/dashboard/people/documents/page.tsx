import {HrisDocumentWorkspaceClient} from "@/components/hris/HrisDocumentWorkspaceClient"
import {pickLocale} from "@/i18n/routing"
export default async function EmployeeDocumentsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{employeeId?:string;documentId?:string}>}){const locale=pickLocale((await params).locale),{employeeId,documentId}=await searchParams;return <HrisDocumentWorkspaceClient locale={locale} employeeId={employeeId} documentId={documentId}/>}
