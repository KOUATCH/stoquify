import { GET as getSecurityTxt } from "../../api/security-txt/route"

export async function GET() {
  return getSecurityTxt()
}
