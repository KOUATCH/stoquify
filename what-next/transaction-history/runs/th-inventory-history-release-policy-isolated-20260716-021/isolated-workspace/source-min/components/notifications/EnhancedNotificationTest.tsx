"use client"

import { Button } from "@/components/ui/button"
import { useNotifications } from "./NotificationProvider"

export function EnhancedNotificationTest() {
  const notifications = useNotifications()

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => notifications.success("Success", "Notification system is ready.")}>
        Success
      </Button>
      <Button type="button" variant="outline" onClick={() => notifications.info("Info", "Operational notification test.")}>
        Info
      </Button>
      <Button type="button" variant="outline" onClick={() => notifications.warning("Warning", "Review this notification.")}>
        Warning
      </Button>
      <Button type="button" variant="destructive" onClick={() => notifications.error("Error", "Notification error test.")}>
        Error
      </Button>
    </div>
  )
}
