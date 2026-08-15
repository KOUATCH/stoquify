import { CustomerActionPage } from "@/components/customers/CustomerActionPage"
import { routeByKey, withCustomersSurfaceAccess } from "../customers-route-access"

export const metadata = {
  title: "Create Customer | Stoquify",
  description: "Create a customer for POS, sales orders, receipts, and receivables.",
}

export default async function CreateCustomerPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("customers-new")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-new")
  }

  return withCustomersSurfaceAccess({
    params,
    surface,
    onAllowed: (context, locale) => (
      <CustomerActionPage mode="create" organizationId={context.orgId} locale={locale} />
    ),
  })
}
