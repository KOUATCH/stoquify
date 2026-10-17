import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserDropdownMenu from '@/components/UserDropdownMenu'
import AppearanceSettingsClient from '@/app/[locale]/(dashboard)/dashboard/settings/appearance/AppearanceSettingsClient'
import JournalsLoading from '@/app/[locale]/(dashboard)/dashboard/accounting/journals/loading'

const mockSetTheme = jest.fn()
let mockPathname = '/en/dashboard/accounting/journals/new'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: jest.fn() }) }))
jest.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', resolvedTheme: 'light', systemTheme: 'light', setTheme: mockSetTheme }) }))
jest.mock('next-intl', () => ({ useTranslations: () => () => 'Open account menu', useLocale: () => mockPathname.split('/')[1] }))
jest.mock('next-intl/routing', () => ({ defineRouting: (config: unknown) => config }))
jest.mock('@/lib/auth-client', () => ({ signOut: jest.fn() }))

beforeEach(() => { mockSetTheme.mockClear(); mockPathname = '/en/dashboard/accounting/journals/new' })

it.each(['en', 'fr'])('announces pending journal navigation in %s without adding a main landmark', locale => {
  mockPathname = `/${locale}/dashboard/accounting/journals`
  render(<JournalsLoading />)
  expect(screen.getByRole('status')).toHaveTextContent(locale === 'fr' ? 'Chargement des écritures comptables' : 'Loading journal entries')
  expect(screen.queryByRole('main')).not.toBeInTheDocument()
})

it.each([
  ['en', 'Dark workspace'], ['fr', 'Espace de travail sombre'],
])('explains fixed dashboard appearance in %s without altering the saved light preference', async (locale, label) => {
  mockPathname = `/${locale}/dashboard/accounting/journals/new`
  const user = userEvent.setup()
  render(<UserDropdownMenu username="Test operator" email="test@example.test" fixedDarkAppearance />)
  await user.click(screen.getByRole('button', { name: 'Open account menu' }))
  expect(screen.getByText(label)).toBeVisible()
  expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument()
  expect(mockSetTheme).not.toHaveBeenCalled()
})

it('retains theme switching for consumers outside the fixed dashboard shell', async () => {
  mockPathname = '/en'
  const user = userEvent.setup()
  render(<UserDropdownMenu username="Test operator" email="test@example.test" />)
  await user.click(screen.getByRole('button', { name: 'Open account menu' }))
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Dark mode' }))
  expect(mockSetTheme).toHaveBeenCalledWith('dark')
})

it.each(['en', 'fr'] as const)('keeps appearance preferences usable and describes their scope in %s', async (locale) => {
  const user = userEvent.setup()
  render(<AppearanceSettingsClient locale={locale} />)
  expect(screen.getByText(locale === 'fr' ? 'Apparence du tableau de bord' : 'Dashboard appearance')).toBeVisible()
  expect(screen.getByRole('button', { name: locale === 'fr' ? 'Clair' : 'Light' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: locale === 'fr' ? 'Sombre' : 'Dark' }))
  expect(mockSetTheme).toHaveBeenCalledWith('dark')
})
