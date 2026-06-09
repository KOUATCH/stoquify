"use server";
import { db } from "@/prisma/db";


 const getBriefItemById= async(id: string)=> {
  try {
    const item = await db.item.findUnique({
      where: {
        id,
      },
      select:{
        nameEn:true,
        nameFr:true,
        sku:true,
        updatedAt:true,
        id:true,
      }
    });
    const data = item ? { ...item, name: item.nameEn } : null;
    return { 
      success: true,
      data,
      error: null, 
     };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item",
    };
  }
}
 export default getBriefItemById
