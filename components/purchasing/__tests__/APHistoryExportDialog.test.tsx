import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { APHistoryExportDialog } from "../APHistoryExportDialog"
import { prepareAPHistoryExportAction } from "@/actions/purchasing/ap-history.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("lucide-react", () => ({ X: () => <svg aria-hidden="true" /> }))
jest.mock("@/actions/purchasing/ap-history.actions", () => ({ prepareAPHistoryExportAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("next-intl", () => ({ useLocale: () => "fr", useTranslations: () => (key: string) => key }))
const props = { open: true, onOpenChange: jest.fn(), organizationId: "org-1", actorId: "u1", filters: { supplierId: "s1", dateFrom: "2026-08-01" } }
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear() })
it("preserves the filter scope and requests password confirmation without persisting it", async () => {
  ;(prepareAPHistoryExportAction as jest.Mock).mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" }); (stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: false, code: "INVALID_CREDENTIALS" })
  render(<APHistoryExportDialog {...props} />); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'download',exact:true}))
  const input = await screen.findByLabelText('password'); fireEvent.change(input,{target:{value:'private-password'}}); fireEvent.click(screen.getByRole('button',{name:'verifyDownload'})); expect(await screen.findByText('passwordFailed')).toBeVisible(); expect(input).toHaveValue(''); expect(JSON.stringify(sessionStorage)).not.toContain('private-password'); expect(prepareAPHistoryExportAction).toHaveBeenCalledWith({ filters: props.filters, locale: 'fr' }); expect(prepareAPHistoryExportAction).toHaveBeenCalledTimes(1)
})
it("never translates a raw backend error as a message key and leaves retry available", async () => {
  ;(prepareAPHistoryExportAction as jest.Mock).mockRejectedValue(new Error('private database details'))
  render(<APHistoryExportDialog {...props} />); fireEvent.click(screen.getByRole('button',{name:'download',exact:true})); expect(await screen.findByText('failed')).toBeVisible(); expect(screen.queryByText(/private database/)).not.toBeInTheDocument(); expect(screen.getByRole('button',{name:'download',exact:true})).toBeEnabled()
})
it("rejects bytes returned for a different organization", async () => {
  ;(prepareAPHistoryExportAction as jest.Mock).mockResolvedValue({ success:true,data:{organizationId:'other',actorId:'u1',content:'private'} })
  render(<APHistoryExportDialog {...props} />); fireEvent.click(screen.getByRole('button',{name:'download',exact:true})); expect(await screen.findByText('denied')).toBeVisible()
})
it("discards a response after the dialog closes", async () => {
  let resolve!: (value: unknown) => void
  ;(prepareAPHistoryExportAction as jest.Mock).mockImplementation(() => new Promise(r => {resolve=r}))
  const view=render(<APHistoryExportDialog {...props} />); fireEvent.click(screen.getByRole('button',{name:'download',exact:true})); await waitFor(()=>expect(prepareAPHistoryExportAction).toHaveBeenCalled()); view.rerender(<APHistoryExportDialog {...props} open={false} />); resolve({success:false,code:'FRESH_AUTH_REQUIRED'}); await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
