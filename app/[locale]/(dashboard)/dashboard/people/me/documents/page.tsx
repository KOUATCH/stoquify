import {HrisDocumentWorkspaceClient} from "@/components/hris/HrisDocumentWorkspaceClient"
import {pickLocale} from "@/i18n/routing"
export default async function OwnDocumentsPage({params}:{params:Promise<{locale:string}>}){return <HrisDocumentWorkspaceClient locale={pickLocale((await params).locale)}/>}
