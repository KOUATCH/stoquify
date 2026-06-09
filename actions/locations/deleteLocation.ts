

"use server";

import { db } from "@/prisma/db";


const deleteLocation = async (id: string) => {

  try {
      const location = await db.location.findUnique({
        where: { id },
      })

      if (!location) {
        return {
          error: `Something went wrong, Location not found`,
          success: false ,
          data: null,
        };
      }
     
      const deletedLocation = await db.location.delete({
        where: {
          id,
        },
      });

      return {
        success: true,
        error: null,
        data: deletedLocation
      };

  } catch (error) {
    console.error("Error deleting Location:", error);
    return {
      error: `Something went wrong, Please try again`,
      success: true,
      data: null,
    };
  }
}
export default deleteLocation
