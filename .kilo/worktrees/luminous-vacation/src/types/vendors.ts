export interface Vendor {
  id: string;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  createdById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface VendorRow {
  id: string;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateVendorInput {
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
}

export interface UpdateVendorInput extends CreateVendorInput {
  id: string;
}

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "createdAt" | "vendorName" | "contactPerson";
  sortOrder?: "asc" | "desc";
}

export interface VendorListResponse {
  data: VendorRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
