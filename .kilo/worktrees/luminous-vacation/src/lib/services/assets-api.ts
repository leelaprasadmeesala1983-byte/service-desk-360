import type {
  AssetDashboardSummary,
  ModuleCounts,
} from "@/types/asset-dashboard";
import type {
  Asset,
  AssetListParams,
  AssetListResponse,
  AssetStats,
  AssetStatusHistoryRow,
  CreateAssetInput,
} from "@/types/assets";
import type {
  ConfirmDeliveryInput,
  CreateCustomerDispatchInput,
} from "@/types/customer-dispatch";
import type { ReceiveFromVendorInput } from "@/types/send-to-vendor";

export class AssetsApiService {
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // use default message
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  static async listAssets(
    params: AssetListParams = {},
  ): Promise<AssetListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.status && params.status !== "ALL") {
      searchParams.set("status", params.status);
    }
    if (params.repairStatus && params.repairStatus !== "ALL") {
      searchParams.set("repairStatus", params.repairStatus);
    }

    const res = await fetch(`/api/assets?${searchParams.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return AssetsApiService.handleResponse<AssetListResponse>(res);
  }

  static async getAsset(id: string): Promise<Asset> {
    const res = await fetch(`/api/assets/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async getStats(): Promise<AssetStats> {
    const res = await fetch("/api/assets/stats", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: AssetStats;
    }>(res);
    return data.data;
  }

  static async getDashboardData(): Promise<AssetDashboardSummary> {
    const res = await fetch("/api/assets/dashboard", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: AssetDashboardSummary;
    }>(res);
    return data.data;
  }

  static async getModuleCounts(): Promise<ModuleCounts> {
    const res = await fetch("/api/assets/module-counts", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: ModuleCounts;
    }>(res);
    return data.data;
  }

  static async getAssetHistory(id: string): Promise<AssetStatusHistoryRow[]> {
    const res = await fetch(`/api/assets/${id}/history`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: AssetStatusHistoryRow[];
    }>(res);
    return data.data;
  }

  static async createAsset(input: CreateAssetInput): Promise<Asset> {
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async updateAsset(
    id: string,
    input: Partial<CreateAssetInput>,
  ): Promise<Asset> {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async deleteAsset(id: string): Promise<void> {
    const res = await fetch(`/api/assets/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    await AssetsApiService.handleResponse<{
      success: boolean;
      message?: string;
    }>(res);
  }

  static async receiveFromVendor(
    assetId: string,
    input: ReceiveFromVendorInput,
  ): Promise<Asset> {
    const res = await fetch(`/api/assets/${assetId}/receive-from-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async receiveFromVendorByDispatch(
    sendToVendorId: string,
    input: ReceiveFromVendorInput,
  ): Promise<Asset> {
    const res = await fetch(
      `/api/assets/send-to-vendor/${sendToVendorId}/receive`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async dispatchToCustomer(
    assetId: string,
    input: CreateCustomerDispatchInput,
  ): Promise<unknown> {
    const res = await fetch(`/api/assets/${assetId}/dispatch-to-customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: unknown;
    }>(res);
    return data.data;
  }

  static async confirmDelivery(
    assetId: string,
    input: ConfirmDeliveryInput,
  ): Promise<Asset> {
    const res = await fetch(`/api/assets/${assetId}/confirm-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async customerReturn(
    assetId: string,
    input: {
      returnDate: Date | string;
      handedOverTo: string;
      phone: string;
      serviceCharges?: number | string;
      remarks?: string;
    },
  ): Promise<unknown> {
    const res = await fetch(`/api/assets/${assetId}/customer-return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: unknown;
    }>(res);
    return data.data;
  }

  static async updateRepairStatus(
    assetId: string,
    repairStatus: string,
    remarks?: string,
  ): Promise<Asset> {
    const res = await fetch(`/api/assets/${assetId}/repair-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repairStatus, remarks }),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }

  static async closeAsset(assetId: string, remarks?: string): Promise<Asset> {
    const res = await fetch(`/api/assets/${assetId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks }),
    });

    const data = await AssetsApiService.handleResponse<{
      success: boolean;
      data: Asset;
    }>(res);
    return data.data;
  }
}
