"use client";

import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import type { CashTransactionRow } from "@/db/queries/cash-transactions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TransactionListProps = {
  transactions: CashTransactionRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete?: (id: string) => void;
  isReadOnly?: boolean;
};

export function CashTransactionList({
  transactions,
  total,
  page,
  perPage,
  totalPages,
  onEdit,
  onView,
  onDelete,
  isReadOnly = false,
}: TransactionListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", p.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const changeLimit = (newLimit: string | null) => {
    if (!newLimit) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

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
                Type / Category
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Service ID
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Added By
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-right">
                Amount
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    No transactions yet. Create one to get started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const category =
                  tx.category ||
                  (tx.type === "CASH_IN" ? "Cash In" : "Cash Out");

                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                          tx.type === "CASH_IN"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
                        )}
                      >
                        {category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {tx.sourceRecordLabel ? tx.sourceRecordLabel : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.customerName ? (
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-xs",
                            tx.isAdminEntry
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200",
                          )}
                        >
                          {tx.customerName}
                          {tx.isAdminEntry && " (Admin)"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      <span
                        className={
                          tx.type === "CASH_IN"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {tx.type === "CASH_IN" ? "+" : "-"}₹
                        {Math.abs(Number(tx.amount)).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(tx.id)}
                          title={
                            tx.isAdminEntry
                              ? "View transaction details"
                              : "View synced transaction details"
                          }
                        >
                          <Eye className="size-4" />
                        </Button>
                        {!isReadOnly && tx.isAdminEntry && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(tx.id)}
                              title="Edit manual transaction"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(tx.id)}
                                title="Delete manual transaction"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)}{" "}
          of {total} transactions
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Rows per page:
            </span>
            <Select value={perPage.toString()} onValueChange={changeLimit}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={perPage.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                onClick={() => goToPage(p)}
                className="size-8"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
