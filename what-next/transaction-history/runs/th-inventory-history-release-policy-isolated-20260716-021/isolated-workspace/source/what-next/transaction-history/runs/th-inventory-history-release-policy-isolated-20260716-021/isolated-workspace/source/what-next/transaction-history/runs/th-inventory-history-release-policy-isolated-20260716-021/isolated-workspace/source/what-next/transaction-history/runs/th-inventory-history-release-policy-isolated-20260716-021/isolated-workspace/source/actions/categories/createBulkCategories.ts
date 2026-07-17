import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { CategoryCreateDTO } from "@/types/category";
import createCategory from "./createCategory";

export async function createBulkCategories(categories: CategoryCreateDTO[]) {
  try {
    for (const category of categories) {
      await createCategory(category);
    }
  } catch (error) {
    logSafeActionWarning("Bulk category creation skipped after a failed row", error, {
      action: "createBulkCategories",
    });
  }
}
