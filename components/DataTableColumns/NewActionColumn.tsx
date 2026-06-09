"use client";

import { notify } from "@/lib/notifications/notify"
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
  // The model name for display in messages
  modelName: string;
  // The editEndpoint if editing is enabled
  editEndpoint?: string;
  // The delete function that will be called when delete is confirmed
  onDelete: () => Promise<void>;
};

const NewActionColumn = ({
  modelName,
  editEndpoint,
  onDelete
}: ActionColumnProps) => {
  
 const handleDelete=async()=> {
    try {
      await onDelete();
      notify.success(`${modelName} Deleted Successfully`,{description:`"${modelName}  deletion Successful"`});
    } catch (error) {
      console.error(error);
      notify.error(`${modelName} couldn't delete`,{description:`"Error in ${modelName} deletion ,problem encountered"`});
    }
  }

  return (
    <div className="flex items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700 transition-all duration-500 cursor-pointer"
          >
            <Trash className="w-4 h-4 mr-2 flex-shrink-0" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this{" "}
              {modelName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete}>
              Permanently Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {editEndpoint && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-green-600 hover:text-gray-700 transition-all duration-500 cursor-pointer"
        >
          <Link href={editEndpoint} className="flex item gap-2">
            <Pencil className="w-4 h-4" />
          </Link>
        </Button>
      )}
    </div>
  );
};

export default NewActionColumn;