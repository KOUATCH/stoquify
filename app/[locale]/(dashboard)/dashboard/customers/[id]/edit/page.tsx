import { CustomerActionPage } from "@/components/customers/CustomerActionPage"
import { routeByKey, withCustomersSurfaceAccess } from "../../customers-route-access"

interface EditCustomerPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Edit Customer | Stoquify",
  description: "Edit customer identity, contact, receivable terms, language, and active state.",
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { locale: rawLocale, id } = await params
  const surface = routeByKey("customers-edit")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-edit")
  }

  return withCustomersSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: (context, locale) => (
      <CustomerActionPage mode="edit" organizationId={context.orgId} locale={locale} customerId={id} />
    ),
  })
}
