import {documentGET,documentPOST} from "@/services/hris/employee-document.http"
export const runtime="nodejs"
export async function GET(request:Request){return documentGET(request,true)}
export async function POST(request:Request){return documentPOST(request,true)}
