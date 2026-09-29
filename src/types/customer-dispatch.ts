export interface CustomerDispatch {
  id: string;
  seq: number;
  assetId: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  courierName: string;
  docketAwbNumber: string;
  dispatchDate: Date | string;
  numberOfPackages: number;
  dispatchRemarks: string;
  status: "DISPATCHED_TO_CUSTOMER" | "DELIVERED" | "CLOSED" | string;
  deliveryRemarks?: string | null;
  deliveredAt?: Date | string | null;
  dispatchedById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCustomerDispatchInput {
  assetId: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  courierName: string;
  docketAwbNumber: string;
  dispatchDate: Date | string;
  numberOfPackages?: number;
  dispatchRemarks?: string;
}

export interface ConfirmDeliveryInput {
  assetId: string;
  customerDispatchId?: string;
  deliveryRemarks?: string;
  deliveredAt?: Date | string;
}

export interface CustomerReturnInput {
  assetId: string;
  returnDate: Date | string;
  handedOverTo: string;
  phone: string;
  serviceCharges?: number | string;
  remarks?: string;
}
