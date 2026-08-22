import { EnhancedNotificationTest } from "@/components/notifications/EnhancedNotificationTest"
import { notFound } from "next/navigation"
import { routeByKey, withNotificationsDemoSurfaceAccess } from "./notifications-demo-route-access"

export default async function NotificationsDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()

  const surface = routeByKey("notifications-demo")

  if (!surface) {
    throw new Error("Missing notifications demo route surface definition: notifications-demo")
  }

  return withNotificationsDemoSurfaceAccess({
    params,
    surface,
    onAllowed: (_context, locale) => {
      void locale

      return (
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Notification System Demo</h1>
            <p className="text-muted-foreground mt-2">Test all features of the enhanced notification system</p>
          </div>
          <EnhancedNotificationTest />
        </div>
      )
    },
  })
}
