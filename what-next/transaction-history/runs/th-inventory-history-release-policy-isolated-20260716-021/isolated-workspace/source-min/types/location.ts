import z from "zod";

  
  export interface Pagination{
    // items: BriefLocationDTO[];
    totalCount: number;
    page: number;
    limit: number;
    pages: number;
  }
  

  export interface PaginatedResponse<T> {
    pagination: Pagination;
    data: T[];
    
  }

  export interface  ApiResponse<T> {
      success: boolean;
      data?: T;
      error?: string | null | undefined;
  }

  export type LocationResponse= ApiResponse<LocationDTO[]>;
  export type CompleteLocationResponse= ApiResponse<LocationDTO[]>;

  // types/item.ts
export interface Location {
    id: string ;
  name: string ;
  phone: string| null;
  address: string | null;
  organizationId: string | null;
  email: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }


export type UpdateLocationPayload = {
  id: string ;
  name: string ;
  phone: string| null;
  address: string | null;
  organizationId: string | null;
  email: string | null;
};

export type LocationApiResponse = {
  success: boolean;
  data?: any;
  error?: string | null;
};


export const LocationTypeEnum = z.enum([
  'WAREHOUSE',
  "STORE",
  'DISTRIBUTION_CENTER',
  'SUPPLIER',
  'CUSTOMER',
  'MANUFACTURING',
  'QUARANTINE',
  'DAMAGED',
  'TRANSIT',
  'VIRTUAL',
])
  
// Mutation context and data types
export interface MutationContext<T> {
  previousLocationDetail?: T | undefined
  previousLocationsList?: T[] | undefined
}

export interface UpdateModelData<T> {
  id: string
  data: T
}
export const basicInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  code: z.string(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  locationTypeId: z.string().optional(), phone: z.string().optional(),
  isActive: z.boolean(),
})

import { LocationType } from "@prisma/client";

export type LocationDTO = {
  id:string;
  name: string;
  code: string; 
  type?: LocationType;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  managerId?: string | null;
  organizationId?: string;
  organization?: { id: string; name: string} | null;
  allowNegativeStock?: boolean;
  requiresApproval?: boolean;
  createdAt: Date
};

// Type definitions
export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>
