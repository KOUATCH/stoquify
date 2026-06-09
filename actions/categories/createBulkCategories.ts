import { CategoryCreateDTO } from "@/types/category";
import createCategory from "./createCategory";

export async function createBulkCategories(categories: CategoryCreateDTO[]) {
  try {
    for (const category of categories) {
      await createCategory(category);
    }
  } catch (error) {
    console.log(error);
  }
}
