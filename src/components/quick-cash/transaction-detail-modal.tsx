"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CashTransactionRow } from "@/db/queries/cash-transactions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TransactionDetailModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CashTransactionRow | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function TransactionDetailModal({
  isOpen,
  onOpenChange,
  transaction,
  onEdit,
  onDelete,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const isEditable = transaction.isAdminEntry;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Type
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                transaction.type === "CASH_IN"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
              )}
            >
              {transaction.type === "CASH_IN" ? "+ Cash In" : "- Cash Out"}
            </span>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Transaction Category
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                (transaction.category === "Courier In" ||
                (!transaction.category && transaction.type === "CASH_IN"))
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
              )}
            >
              {transaction.category === "Courier In" ||
              transaction.category === "Courier Out"
                ? transaction.category
                : transaction.type === "CASH_IN"
                  ? "Courier In"
                  : "Courier Out"}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Amount
            </span>
            <span
              className={cn(
                "font-semibold",
                transaction.type === "CASH_IN"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {transaction.type === "CASH_IN" ? "+" : "-"}₹
              {Math.abs(Number(transaction.amount)).toFixed(2)}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Date
            </span>
            <span className="text-sm">{formatDate(transaction.createdAt)}</span>
          </div>

          {/* Service ID */}
          {transaction.sourceRecordLabel && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Service ID
              </span>
              <span className="text-sm font-mono">
                {transaction.sourceRecordLabel}
              </span>
            </div>
          )}

          {/* Customer */}
          {transaction.customerName && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Customer
              </span>
              <span className="text-sm">{transaction.customerName}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Description
            </span>
            <p className="text-sm rounded bg-muted p-2">
              {transaction.description}
            </p>
          </div>

          {/* Created By / Technician */}
          <div className="space-y-1 border-t pt-3">
            {transaction.createdByName && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Created By
                </span>
                <span className="text-sm">{transaction.createdByName}</span>
              </div>
            )}
            {transaction.technicianName && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Technician
                </span>
                <span className="text-sm">{transaction.technicianName}</span>
              </div>
            )}
            {!transaction.isAdminEntry && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Status
                </span>
                <span className="text-xs rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  Synced from Service
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            {isEditable && onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onEdit(transaction.id);
                  onOpenChange(false);
                }}
                className="flex-1 gap-2"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {isEditable && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(transaction.id);
                }}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
