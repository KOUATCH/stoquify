"use server";

import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { db } from "@/prisma/db";
import { NotFoundError } from "@/services/_shared/action-errors";
import { LocationDTO } from "@/types/location";
import { revalidatePath } from "next/cache";

const updateLocationById = async (id: string, data: LocationDTO) => {
  try {
    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => {
      const location = await tx.location.findUnique({
        where: { id },
      });
  
      if (!location) {
        throw new NotFoundError("Location not found");
      }
      const updatedLocation = await tx.location.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code,
          type: data.type,
          address: data.address,
          phone: data.phone,
          email: data.email,
          isActive: data.isActive,
          isDefault: data.isDefault,
          managerId: data.managerId,
          allowNegativeStock: data.allowNegativeStock,
          requiresApproval: data.requiresApproval,
        }
      })
      revalidatePath("/inventory/locations");
      return {
        data: updatedLocation,
        success: true,
        error: null,
      }
     })
    } catch (error) {
      return safeSuccessActionErrorResult(error, { action: "updateLocationById" }, "Failed to update location");
    }
  }

export default updateLocationById
