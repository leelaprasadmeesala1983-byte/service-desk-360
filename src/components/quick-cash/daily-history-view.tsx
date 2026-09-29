"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  LockOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyRegisterRow } from "@/db/queries/cash-transactions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type DailyHistoryViewProps = {
  history: DailyRegisterRow[];
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onViewDate: (date: string) => void;
};

export function DailyHistoryView({
  history,
  total,
  page,
  perPage,
  onPageChange,
  onLimitChange,
  onViewDate,
}: DailyHistoryViewProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">
                Opening Balance
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">
                Cash In
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">
                Cash Out
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">
                Closing Balance
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Closed By
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    No closed daily registers recorded yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              history.map((reg) => {
                const dateObj = new Date(`${reg.date}T12:00:00Z`);
                const formatted = formatDate(dateObj);

                return (
                  <TableRow key={reg.date}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>{formatted}</span>
                        <span className="text-xs text-muted-foreground">
                          ({reg.date})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          reg.status === "CLOSED"
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                        )}
                      >
                        {reg.status === "CLOSED" ? (
                          <>
                            <Lock className="size-3" />
                            Closed
                          </>
                        ) : (
                          <>
                            <LockOpen className="size-3" />
                            Open
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹{Number(reg.openingBalance).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      +₹{Number(reg.totalCashIn).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-rose-600 dark:text-rose-400 font-medium">
                      -₹{Number(reg.totalCashOut).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                      ₹{Number(reg.closingBalance).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {reg.closedByName || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDate(reg.date)}
                        className="gap-1 text-xs"
                        title={`View transactions for ${reg.date}`}
                      >
                        <Eye className="size-3.5" />
                        <span>Transactions</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)}{" "}
            of {total} daily registers
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Rows per page:
              </span>
              <Select
                value={perPage.toString()}
                onValueChange={(val) => {
                  if (val) onLimitChange(Number(val));
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue placeholder={perPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  onClick={() => onPageChange(p)}
                  className="size-8 text-xs"
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
