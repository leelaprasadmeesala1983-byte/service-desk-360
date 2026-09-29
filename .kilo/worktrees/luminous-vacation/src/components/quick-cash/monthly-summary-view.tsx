"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatCard } from "@/components/service-tickets/stat-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CashTransactionRow,
  MonthlySummary,
} from "@/db/queries/cash-transactions";
import { exportCashTransactions } from "@/lib/actions/cash-transactions";

import { CashTransactionList } from "./transaction-list";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type MonthlySummaryViewProps = {
  summary: MonthlySummary;
  transactions: CashTransactionRow[];
  total: number;
  page: number;
  perPage: number;
  from: string;
  to: string;
  defaultFrom: string;
  defaultTo: string;
  onFilterApply: (from: string, to: string) => void;
  onFilterClear: () => void;
  onMonthChange: (year: number, month: number) => void;
  onViewTransaction: (id: string) => void;
  onEditTransaction?: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
};

export function MonthlySummaryView({
  summary,
  transactions,
  total,
  page,
  perPage,
  from,
  to,
  defaultFrom,
  defaultTo,
  onFilterApply,
  onFilterClear,
  onMonthChange,
  onViewTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: MonthlySummaryViewProps) {
  const currentYear = new Date().getFullYear();
  const availableYears = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  const [fromDateInput, setFromDateInput] = useState(from || defaultFrom);
  const [toDateInput, setToDateInput] = useState(to || defaultTo);

  useEffect(() => {
    setFromDateInput(from || defaultFrom);
    setToDateInput(to || defaultTo);
  }, [from, to, defaultFrom, defaultTo]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleApply = () => {
    if (
      fromDateInput &&
      toDateInput &&
      new Date(fromDateInput) > new Date(toDateInput)
    ) {
      toast.error("From date cannot be later than To date.");
      return;
    }
    onFilterApply(fromDateInput, toDateInput);
  };

  const handleClear = () => {
    setFromDateInput(defaultFrom);
    setToDateInput(defaultTo);
    onFilterClear();
  };

  const handlePrevMonth = () => {
    let newMonth = summary.month - 1;
    let newYear = summary.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = summary.month + 1;
    let newYear = summary.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onMonthChange(newYear, newMonth);
  };

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const result = await exportCashTransactions(
        format,
        summary.from,
        summary.to,
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Month Header & Month Navigation */}
      <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div>
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            Monthly Cash Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated performance and historical reporting for{" "}
            {summary.monthLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handlePrevMonth}
            title="Previous Month"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Month select */}
          <Select
            value={summary.month.toString()}
            onValueChange={(m) => {
              if (m) onMonthChange(summary.year, parseInt(m, 10));
            }}
          >
            <SelectTrigger className="h-8 min-w-[125px] text-xs font-semibold">
              <SelectValue placeholder={MONTH_NAMES[summary.month - 1]} />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem
                  key={name}
                  value={(i + 1).toString()}
                  className="text-xs"
                >
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year select */}
          <Select
            value={summary.year.toString()}
            onValueChange={(y) => {
              if (y) onMonthChange(parseInt(y, 10), summary.month);
            }}
          >
            <SelectTrigger className="h-8 min-w-[85px] text-xs font-semibold">
              <SelectValue placeholder={summary.year.toString()} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={yr.toString()} className="text-xs">
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleNextMonth}
            title="Next Month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* 2. Date-Wise Filter Card (Belongs ONLY to Monthly Summary) */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
            <Calendar className="size-4 text-muted-foreground" />
            <span>Date-Wise Filter</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Active range: {summary.from} to {summary.to}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="space-y-1">
            <label
              htmlFor="from-date"
              className="text-[11px] font-medium text-muted-foreground"
            >
              From Date
            </label>
            <Input
              id="from-date"
              type="date"
              className="h-8.5 w-[150px] bg-background text-xs sm:text-sm"
              value={fromDateInput}
              onChange={(e) => setFromDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="to-date"
              className="text-[11px] font-medium text-muted-foreground"
            >
              To Date
            </label>
            <Input
              id="to-date"
              type="date"
              className="h-8.5 w-[150px] bg-background text-xs sm:text-sm"
              value={toDateInput}
              onChange={(e) => setToDateInput(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8.5 px-3.5 text-xs font-semibold"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8.5 px-3.5 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Monthly Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-3.5">
        <StatCard
          label="Opening Balance"
          value={`₹${Number(summary.openingBalance).toFixed(2)}`}
          tone="default"
          icon={Wallet}
        />
        <StatCard
          label="Total Cash In"
          value={`+₹${Number(summary.totalCashIn).toFixed(2)}`}
          tone="open"
          icon={TrendingUp}
        />
        <StatCard
          label="Total Cash Out"
          value={`-₹${Number(summary.totalCashOut).toFixed(2)}`}
          tone="rejected"
          icon={TrendingDown}
        />
        <StatCard
          label="Closing Balance"
          value={`₹${Number(summary.closingBalance).toFixed(2)}`}
          tone="closed"
          icon={PiggyBank}
        />
      </div>

      {/* 4. Monthly Transactions Card */}
      <div className="border-border bg-card flex flex-col rounded-xl border shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3.5 sm:p-4.5">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm sm:text-base leading-none">
              Monthly Transactions
            </h3>
            <p className="text-xs text-muted-foreground">
              Showing records between {summary.from} and {summary.to} ({total}{" "}
              total transactions)
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8.5 items-center justify-center rounded-md border border-input bg-background px-3 text-xs sm:text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Export <FileDown className="ml-2 size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <Download className="mr-2 size-4" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
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
            onEdit={onEditTransaction || (() => {})}
            onView={onViewTransaction}
            onDelete={onDeleteTransaction}
            isReadOnly={false}
          />
        </div>
      </div>
    </div>
  );
}
