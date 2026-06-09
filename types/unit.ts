import { ApiResponse } from "./itemTypes";

export interface BriefUnitData {
  data: BriefUnitDTO[];
  pagination: Pagination;
}

export interface Pagination {
  // Units: BriefUnitDTO[];
  totalCount: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  pagination: Pagination;
  data: T[];

}



// export type BriefUnitResponse= ApiResponse<BriefUnitData[]>;
export type BriefUnitResponse = ApiResponse<BriefUnitPayload[]>;
export type UnitResponse = ApiResponse<UnitDTO[]>;

export type UnitCreateDTO = {
  id?: string;
  organizationId: string;
  createdAt?: Date;
  nameEn: string;
  nameFr?: string | null;
  symbol: string;
  type?: string;
  baseUnit?: string;
  conversionRate?: number;
}
// types/Unit.ts
export interface Unit {
  id: string; 
  organizationId: string | null;
  createdAt: Date;
  name: string;
  symbol: string;
  updatedAt: Date | string;
}

export type UnitPayload = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
};

export type UpdateUnitPayload = {
  id?: string;
  symbol?: string;
  nameEn?: string;
  nameFr?: string | null;
  createdAt?: Date;
};

export type UnitDTO = {
  id: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  nameEn: string;
  nameFr?: string | null;
  symbol: string;
  type?: string | null;
  baseUnit?: string | null;
  conversionRate?: string | null;
  isActive: boolean;
  // Helper for backwards compatibility
  name?: string; // computed from nameEn
};

export type BriefUnitDTO = {
  id: string;
  name: string;
  symbol: string;
  organizationId: string | null;
  createdAt: Date;
};

export type BriefUnitPayload = {
  id: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  symbol: string;
};
