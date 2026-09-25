import { getTranslations } from "next-intl/server"
import { ModuleCompositionWorkbench } from "@/components/modules/ModuleCompositionWorkbench"
import { getModuleCompositionData } from "@/services/modules/module-composition.service"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "moduleComposition" })
  return { title: `${t("title")} | Stoquify`, description: t("subtitle") }
}

export default async function SettingsRoutePage({ params }: PageProps) {
  const surface = routeByKey("settings-modules")
  if (!surface) throw new Error("Missing settings route surface definition: settings-modules")

  return withSettingsSurfaceAccess({
    params,
    surface,
    onAllowed: async context => {
      const data = await getModuleCompositionData({
        organizationId: context.orgId,
        actorId: context.userId,
        actorPermissions: context.permissions,
      })
      return <ModuleCompositionWorkbench key={`${context.orgId}:${context.userId}`} initialData={data} userId={context.userId} />
    },
  })
}