"use client";

import {
  Calendar,
  CalendarDays,
  Download,
  FileDown,
  History,
  Lock,
  LockOpen,
  PiggyBank,
  Plus,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/service-tickets/stat-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CashTransactionRow,
  DailyRegisterRow,
  MonthlySummary,
} from "@/db/queries/cash-transactions";
import {
  deleteCashTransaction,
  exportCashTransactions,
} from "@/lib/actions/cash-transactions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { DailyHistoryView } from "./daily-history-view";
import { MonthlySummaryView } from "./monthly-summary-view";
import { OpeningBalanceModal } from "./opening-balance-modal";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { CashTransactionForm } from "./transaction-form";
import { CashTransactionList } from "./transaction-list";

type QuickCashViewProps = {
  initialTab?: "today" | "history" | "monthly";
  todayRegister: DailyRegisterRow;
  transactions: CashTransactionRow[];
  total: number;
  page: number;
  perPage: number;
  historyRows: DailyRegisterRow[];
  historyTotal: number;
  monthlySummary: MonthlySummary;
  selectedDate: string; // "YYYY-MM-DD"
  monthlyFrom: string;
  monthlyTo: string;
  defaultMonthlyFrom: string;
  defaultMonthlyTo: string;
};

export function QuickCashView({
  initialTab = "today",
  todayRegister,
  transactions,
  total,
  page,
  perPage,
  historyRows,
  historyTotal,
  monthlySummary,
  selectedDate,
  monthlyFrom,
  monthlyTo,
  defaultMonthlyFrom,
  defaultMonthlyTo,
}: QuickCashViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<"today" | "history" | "monthly">(
    initialTab,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<CashTransactionRow | null>(null);
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);

  const isRegisterClosed = todayRegister.status === "CLOSED";
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleTabChange = (tab: "today" | "history" | "monthly") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("page");
    if (tab === "today") {
      params.delete("from");
      params.delete("to");
      params.delete("date");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleViewDateFromHistory = (date: string) => {
    setActiveTab("today");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "today");
    params.set("date", date);
    params.delete("from");
    params.delete("to");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleMonthChange = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "monthly");
    params.set("year", year.toString());
    params.set("month", month.toString());
    params.delete("page");
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleMonthlyFilterApply = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "monthly");
    params.delete("page");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleMonthlyFilterClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "monthly");
    params.delete("page");
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleEdit = (id: string) => {
    if (isRegisterClosed) {
      toast.error(
        "This daily session is closed. Past transactions cannot be edited.",
      );
      return;
    }
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isRegisterClosed) {
      toast.error(
        "This daily session is closed. Past transactions cannot be deleted.",
      );
      return;
    }
    if (!window.confirm("Are you sure you want to delete this transaction?"))
      return;

    try {
      const result = await deleteCashTransaction(id);
      if (result.ok) {
        toast.success("Transaction deleted successfully");
        setIsDetailOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const handleFormOpen = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingId(null);
  };

  const handleViewTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setSelectedTransaction(tx);
      setIsDetailOpen(true);
    }
  };

  const handleEditFromDetail = (id: string) => {
    setIsDetailOpen(false);
    handleEdit(id);
  };

  const handleTodayExport = async (format: "csv" | "excel") => {
    try {
      const result = await exportCashTransactions(
        format,
        selectedDate,
        selectedDate,
      );

      const mimeType =
        format === "excel"
          ? "application/vnd.ms-excel;charset=utf-8;"
          : "text/csv;charset=utf-8;";

      const blob = new Blob([result.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  const formattedSelectedDate = formatDate(
    new Date(`${selectedDate}T12:00:00Z`),
  );

  return (
    <div className="space-y-4 sm:space-y-5 p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto">
      {/* 1. Header Bar with Status and Actions (No manual Close Day button) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PageHeader title="Quick Cash" />

            {/* Daily Session Status Badge */}
            {activeTab === "today" && (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-2xs",
                  isRegisterClosed
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                )}
              >
                {isRegisterClosed ? (
                  <>
                    <Lock className="size-3" />
                    <span>Closed</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="size-3" />
                    <span>Open</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action buttons for Today Tab */}
          {activeTab === "today" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpeningBalanceOpen(true)}
                disabled={isRegisterClosed}
                className="gap-1.5 h-8.5 text-xs font-semibold"
                title={
                  isRegisterClosed
                    ? "Session is closed"
                    : "Set opening cash balance"
                }
              >
                <Settings className="size-3.5" />
                Set Opening Balance
              </Button>

              <Button
                size="sm"
                onClick={() => setIsFormOpen(true)}
                disabled={isRegisterClosed}
                className="gap-1.5 h-8.5 text-xs font-semibold"
                title={
                  isRegisterClosed
                    ? "Session is closed"
                    : "Add cash in / cash out"
                }
              >
                <Plus className="size-3.5" />
                Add Transaction
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Tabs Segmented Control */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1 w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("today")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "today"
                ? "bg-card text-foreground shadow-2xs font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50",
            )}
          >
            <Calendar className="size-4 text-primary" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "history"
                ? "bg-card text-foreground shadow-2xs font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50",
            )}
          >
            <History className="size-4 text-primary" />
            <span>Daily History</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("monthly")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "monthly"
                ? "bg-card text-foreground shadow-2xs font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50",
            )}
          >
            <CalendarDays className="size-4 text-primary" />
            <span>Monthly Summary</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}

      {/* TAB 1: TODAY (Shows Today's Cash & Transactions directly) */}
      {activeTab === "today" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-3.5">
            <StatCard
              label="Opening Balance"
              value={`₹${Number(todayRegister.openingBalance).toFixed(2)}`}
              tone="default"
              icon={Wallet}
            />
            <StatCard
              label="Cash In"
              value={`+₹${Number(todayRegister.totalCashIn).toFixed(2)}`}
              tone="open"
              icon={TrendingUp}
            />
            <StatCard
              label="Cash Out"
              value={`-₹${Number(todayRegister.totalCashOut).toFixed(2)}`}
              tone="rejected"
              icon={TrendingDown}
            />
            <StatCard
              label="Closing Balance"
              value={`₹${Number(todayRegister.closingBalance).toFixed(2)}`}
              tone="closed"
              icon={PiggyBank}
            />
          </div>

          {/* Today's Transactions Table Card */}
          <div className="border-border bg-card flex flex-col rounded-xl border shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3.5 sm:p-4.5">
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm sm:text-base leading-none">
                  Today&apos;s Transactions — {formattedSelectedDate}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {total === 0
                    ? "No transactions recorded today."
                    : `Showing ${total} transaction${total > 1 ? "s" : ""}`}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-8.5 items-center justify-center rounded-md border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                  Export <FileDown className="ml-2 size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTodayExport("excel")}>
                    <Download className="mr-2 size-4" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTodayExport("csv")}>
                    <Download className="mr-2 size-4" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="p-4 sm:p-5 pt-0 sm:pt-0">
              <CashTransactionList
                transactions={transactions}
                total={total}
                page={page}
                perPage={perPage}
                totalPages={totalPages}
                onEdit={handleEdit}
                onView={handleViewTransaction}
                onDelete={handleDelete}
                isReadOnly={isRegisterClosed}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY HISTORY */}
      {activeTab === "history" && (
        <div className="border-border bg-card flex flex-col rounded-xl border p-4 sm:p-5 shadow-2xs">
          <div className="mb-4">
            <h3 className="font-semibold text-sm sm:text-base">
              Cash Register History
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete daily audit trail of closed daily sessions and preserved
              balances.
            </p>
          </div>

          <DailyHistoryView
            history={historyRows}
            total={historyTotal}
            page={page}
            perPage={perPage}
            onPageChange={(p) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", p.toString());
              router.push(`${pathname}?${params.toString()}`);
            }}
            onLimitChange={(l) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("limit", l.toString());
              params.set("page", "1");
              router.push(`${pathname}?${params.toString()}`);
            }}
            onViewDate={handleViewDateFromHistory}
          />
        </div>
      )}

      {/* TAB 3: MONTHLY SUMMARY (Contains Date-Wise Filter & Month Picker) */}
      {activeTab === "monthly" && (
        <MonthlySummaryView
          summary={monthlySummary}
          transactions={transactions}
          total={total}
          page={page}
          perPage={perPage}
          from={monthlyFrom}
          to={monthlyTo}
          defaultFrom={defaultMonthlyFrom}
          defaultTo={defaultMonthlyTo}
          onFilterApply={handleMonthlyFilterApply}
          onFilterClear={handleMonthlyFilterClear}
          onMonthChange={handleMonthChange}
          onViewTransaction={handleViewTransaction}
          onEditTransaction={handleEdit}
          onDeleteTransaction={handleDelete}
        />
      )}

      {/* MODALS */}
      <CashTransactionForm
        isOpen={isFormOpen}
        onOpenChange={handleFormOpen}
        editingId={editingId}
        onEditingChange={setEditingId}
        closingBalance={todayRegister.closingBalance}
      />

      <TransactionDetailModal
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        transaction={selectedTransaction}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />

      <OpeningBalanceModal
        isOpen={isOpeningBalanceOpen}
        onOpenChange={setIsOpeningBalanceOpen}
        currentBalance={todayRegister.openingBalance}
        targetDate={selectedDate}
      />
    </div>
  );
}
