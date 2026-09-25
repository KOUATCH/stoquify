import { fireEvent, render, screen } from "@testing-library/react"
import UsersPageClient from "@/app/[locale]/(dashboard)/dashboard/settings/users/UsersPageClient"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }))
jest.mock("@/actions/users/deleteUser", () => ({ deleteUser: jest.fn(async () => ({ data: { id: "member", auditId: "audit-test", sessionsRevoked: 1, pendingInvitesCancelled: 0, updatedAt: "2026-09-06T10:00:00.000Z", replayed: false } })) }))
jest.mock("@/actions/users/getOrgUsers", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/users/getOrgInvites", () => ({ getOrgInvites: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/components/dashboard/Tables/Invites", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/DataTableComponents/DataTable", () => ({ __esModule: true, default: ({ data, columns, searchPlaceholder }: any) => <div><input name="search" placeholder={searchPlaceholder} />{data.map((member: any) => <div key={member.id}>{columns.find((column: any) => column.id === "actions").cell({ row: { original: member } })}</div>)}</div> }))

it("keeps the success receipt open when refreshed rows remove the deactivation action", async () => {
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "09ba28c2-5a3a-48ae-b8c5-46e7abff3991" })
  const member: any = { id: "member", name: "Synthetic Member", email: "member@example.invalid", roles: [], roleNames: "", isActive: true, isVerified: true, createdAt: new Date("2026-09-06T09:00:00.000Z"), updatedAt: new Date("2026-09-06T09:00:00.000Z") }
  const props = { actorId: "admin", canDeactivate: true, asOf: "2026-09-06T09:00:00.000Z", invites: [], invitationAsOf: null, locale: "en" as const }
  const { rerender } = render(<UsersPageClient {...props} users={[member]} />)
  fireEvent.click(screen.getByRole("button", { name: "Deactivate Synthetic Member" }))
  fireEvent.change(screen.getByLabelText("Reason for deactivation"), { target: { value: "Member departure" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  await screen.findByRole("heading", { name: "Account deactivated" })
  rerender(<UsersPageClient {...props} asOf="2026-09-06T10:00:00.000Z" users={[{ ...member, isActive: false, updatedAt: new Date("2026-09-06T10:00:00.000Z") }]} />)
  expect(screen.queryByRole("button", { name: "Deactivate Synthetic Member" })).not.toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Account deactivated" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})
