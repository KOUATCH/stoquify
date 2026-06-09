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
        <button className="relative inline-flex items-center p-3 text-sm font-medium text-center text-white bg-transparent rounded-lg ">
          <Bell className="h-6 w-6 text-slate-700" />
          <span className="sr-only">Notifications</span>
          <div className="absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500  rounded-full -top-0 end-0 dark:border-gray-900">
            {notifications.length}
          </div>
        </button>
      </SheetTrigger>
      {notifications && notifications.length > 0 ? (
        <SheetContent side={"left"} className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 border-b pb-3">
              Notifications ({notifications.length})
            </h2>
          </SheetHeader>
          {/* CONTENT HWRE */}
          <ScrollArea className="h-[500px] w-full  p-2">
            <div className="space-y-3">
              {notifications.map((item, i) => {
                const statusClass =
                  item.status === "WARNING"
                    ? "border-yellow-500 bg-yellow-50"
                    : item.status === "DANGER"
                      ? "border-red-500 bg-red-50"
                      : "border-blue-500 bg-blue-50";

                const textClass =
                  item.status === "WARNING"
                    ? "text-yellow-600"
                    : item.status === "DANGER"
                      ? "text-red-600"
                      : "text-blue-600";

                const Icon =
                  item.status === "WARNING" || item.status === "DANGER"
                    ? AlertCircle
                    : Check;

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex justify-between gap-4 py-3 border-b-2 items-center px-3 rounded-md",
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
                            className="text-xs flex items-center text-red-500"
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
        <SheetContent side={"left"} className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 border-b pb-3">
              Notifications
            </h2>
          </SheetHeader>
          {/* CONTENT HWRE */}
          <div className="min-h-80  flex-col space-y-4 flex items-center justify-center">
            <Image
              src="/bell.png"
              width={300}
              height={300}
              alt="empty notification"
              className="w-36 h-36 object-cover"
            />
            <h2>No Notifications</h2>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
