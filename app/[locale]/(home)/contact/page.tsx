import { EnquiryForm } from "@/components/landing/enquiry-form"
import { getPublicContact, publicMetadata } from "@/lib/public-site"

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ interest?: string | string[] }> }
export async function generateMetadata({ params }: Props) {
  return publicMetadata((await params).locale, "/contact", true)
}
export default async function ContactPage({ searchParams }: Props) {
  const { interest } = await searchParams
  return <EnquiryForm contact={getPublicContact()} interest={typeof interest === "string" ? interest : undefined} />
}
