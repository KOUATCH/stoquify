"use client";

import { notify } from "@/lib/notifications/notify"
// import { updateNotificationStatusById } from "@/actions/pos";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTrigger
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
// import { Notification } from "@prisma/client";
import {
    AlertCircle,
    Bell,
    Check,
    Trash
} from "lucide-react";
import Image from "next/image";
;

export function NotificationMenu({
  notifications = [],
}: {
  notifications: any[];
}) {
  // console.log(cartItems);
  async function handleChangeStatus(id: string) {
    try {
      // await updateNotificationStatusById(id);
      notify.success("Notification removed successfully");
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="notification-bell-trigger relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          <div className="notification-unread-count absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none">
            {notifications.length}
          </div>
        </button>
      </SheetTrigger>
      {notifications && notifications.length > 0 ? (
        <SheetContent side={"left"} className="notification-drawer w-[400px] sm:w-[540px]">
          <SheetHeader>
            <h2 className="notification-drawer-header scroll-m-20 border-b pb-3 text-xl font-semibold tracking-tight first:mt-0">
              Notifications ({notifications.length})
            </h2>
          </SheetHeader>
          {/* CONTENT HWRE */}
          <ScrollArea className="h-[500px] w-full  p-2">
            <div className="space-y-3">
              {notifications.map((item, i) => {
                const statusClass =
                  item.status === "WARNING"
                    ? "notification-list-row notification-list-row--warning border-l-4"
                    : item.status === "DANGER"
                      ? "notification-list-row notification-list-row--error border-l-4"
                      : "notification-list-row notification-list-row--info border-l-4";

                const textClass =
                  item.status === "WARNING"
                    ? "text-[var(--dash-warning)]"
                    : item.status === "DANGER"
                      ? "text-[var(--dash-danger)]"
                      : "text-[var(--dash-info)]";

                const Icon =
                  item.status === "WARNING" || item.status === "DANGER"
                    ? AlertCircle
                    : Check;

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-lg border px-3 py-3",
                      statusClass
                    )}
                  >
                    <button className={cn(textClass)}>
                      <Icon className="w-6 h-6 flex-shrink-0" />
                    </button>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold">{item.statusText}</h2>
                        <SheetClose asChild>
                          <button
                            onClick={() => handleChangeStatus(item.id)}
                            className="flex items-center text-xs text-[var(--dash-text-soft)] transition hover:text-[var(--dash-text)]"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            <span>Mark it Read</span>
                          </button>
                        </SheetClose>
                      </div>
                      <p className="text-xs">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      ) : (
        <SheetContent side={"left"} className="notification-drawer w-[400px] sm:w-[540px]">
          <SheetHeader>
            <h2 className="notification-drawer-header scroll-m-20 border-b pb-3 text-xl font-semibold tracking-tight first:mt-0">
              Notifications
            </h2>
          </SheetHeader>
          {/* CONTENT HWRE */}
          <div className="flex min-h-80 flex-col items-center justify-center space-y-4 text-[var(--dash-text-soft)]">
            <Image
              src="/bell.png"
              width={300}
              height={300}
              alt="empty notification"
              className="h-36 w-36 object-cover opacity-80"
            />
            <h2>No Notifications</h2>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
