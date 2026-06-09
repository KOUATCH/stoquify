"use client";

import { notify } from "@/lib/notifications/notify"
// import { deleteSaving } from "@/actions/savings";
import { deleteUnit } from "@/actions/units/deleteUnit";
import { deleteUser } from "@/actions/users/deleteUser";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import Link from "next/link";
type ActionColumnProps = {
  row: any;
  model: any;
  editEndpoint: string;
  id: string | undefined;
  // revPath: string;
};
const ActionColumn = ({
  row,
  model,
  editEndpoint,
  id = "",
}: ActionColumnProps) => {
  const isActive = row.isActive;
  async function handleDelete() {
    try {
      if (model === "unit") {
        const res = await deleteUnit(id);
        if (res?.success) {
          window.location.reload();
        }
        notify.success(`${model} Deleted Successfully`);
      }
      // else if (model === "saving") {
      //   const res = await deleteSaving(id);
      //   if (res?.ok) {
      //     window.location.reload();
      //   }
      //   notify.success(`${model} Deleted Successfully`);
      // }
      else if (model === "user") {
        const res = await deleteUser(id);
        if (res.data) {
          window.location.reload();
        }
        notify.success(`${model} Deleted Successfully`);
      }
    } catch (error) {
      console.log(error);
      notify.error("Category Couldn't be deleted");
    }
  }
  return (
    <div className="flex items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {/* <DropdownMenuItem className="text-red-600 hover:text-red-700 transition-all duration-500 cursor-pointer">
              
            </DropdownMenuItem> */}
          <Button
            variant={"ghost"}
            size={"icon"}
            className="text-red-600 hover:text-red-700 transition-all duration-500 cursor-pointer "
          >
            <Trash className="w-4 h-4  mr-2 flex-shrink-0" />
            {/* <span>Delete</span> */}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this{" "}
              {model}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant={"destructive"} onClick={() => handleDelete()}>
              Permanently Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {editEndpoint &&
        <Button
          asChild
          variant={"ghost"}
          size={"icon"}
          className="text-green-600 hover:text-gray-700 transition-all duration-500 cursor-pointer "
        >
          <Link href={editEndpoint} className="flex item gap-2">
            <Pencil className="w-4 h-4 " />
          </Link>
        </Button>}

    </div>

  );
}


export default ActionColumn
