export type CashTransactionRow = {
  id: string;
  seq: number;
  recordId: string;
  type: "CASH_IN" | "CASH_OUT";
  category: string | null;
  amount: string;
  description: string;
  sourceRecordId: string | null;
  sourceRecordType: string | null;
  sourceRecordLabel: string | null;
  customerName: string | null;
  isAdminEntry: boolean;
  assignedTechnicianId: string | null;
  technicianName: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyRegisterRow = {
  date: string; // "YYYY-MM-DD"
  openingBalance: string;
  totalCashIn: string;
  totalCashOut: string;
  closingBalance: string;
  status: "OPEN" | "CLOSED";
  closedAt: Date | null;
  closedById: string | null;
  closedByName: string | null;
  notes: string | null;
};

export type MonthlySummary = {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  openingBalance: string;
  totalCashIn: string;
  totalCashOut: string;
  closingBalance: string;
};

export interface PaginationParams {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  userId?: string;
}
