"use client"

import { EnhancedNotificationTest } from "@/components/notifications/EnhancedNotificationTest"

export default function NotificationsDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notification System Demo</h1>
        <p className="text-muted-foreground mt-2">
          Test all features of the enhanced notification system
        </p>
      </div>
      <EnhancedNotificationTest />
    </div>
  )
}