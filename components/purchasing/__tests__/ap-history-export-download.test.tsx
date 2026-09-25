import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createHash, webcrypto } from "node:crypto"
import { TextEncoder } from "node:util"
import { APHistoryExportDialog } from "../APHistoryExportDialog"
import { prepareAPHistoryExportAction } from "@/actions/purchasing/ap-history.actions"
jest.mock("@/actions/purchasing/ap-history.actions", () => ({ prepareAPHistoryExportAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }))
jest.mock("lucide-react", () => ({ X: () => <svg aria-hidden="true" /> }))
const content='\uFEFF"one","two"\r\n'
const file={organizationId:'org',actorId:'u1',contentBase64:Buffer.from(content).toString('base64'),contentHash:'',fileName:'owned.csv',mimeType:'text/csv;charset=utf-8',rowCount:1,watermarkId:'wm-owned'}
beforeEach(()=>{jest.clearAllMocks();Object.defineProperty(globalThis,'TextEncoder',{value:TextEncoder,configurable:true});Object.defineProperty(globalThis.crypto,'subtle',{value:webcrypto.subtle,configurable:true});URL.createObjectURL=jest.fn(()=> 'blob:owned');URL.revokeObjectURL=jest.fn()})
it('starts download only after validating the exact UTF-8 content hash',async()=>{
 const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});(prepareAPHistoryExportAction as jest.Mock).mockResolvedValue({success:true,data:{...file,contentHash:'sha256:'+createHash('sha256').update(content).digest('hex')}})
 render(<APHistoryExportDialog open onOpenChange={()=>{}} filters={{}} organizationId="org" actorId="u1" />);fireEvent.click(screen.getByRole('button',{name:'download',exact:true}));expect(await screen.findByText('downloadStarted')).toBeVisible();expect(click).toHaveBeenCalledTimes(1);expect(URL.createObjectURL).toHaveBeenCalledTimes(1);click.mockRestore()
})
it('does not release bytes whose content hash mismatches',async()=>{
 (prepareAPHistoryExportAction as jest.Mock).mockResolvedValue({success:true,data:{...file,contentHash:'sha256:bad'}});render(<APHistoryExportDialog open onOpenChange={()=>{}} filters={{}} organizationId="org" actorId="u1" />);fireEvent.click(screen.getByRole('button',{name:'download',exact:true}));await waitFor(()=>expect(screen.getByText('failed')).toBeVisible());expect(URL.createObjectURL).not.toHaveBeenCalled()
})
