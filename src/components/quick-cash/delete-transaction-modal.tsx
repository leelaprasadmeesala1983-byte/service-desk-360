"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CashTransactionRow } from "@/db/queries/cash-transactions";
import { deleteCashTransaction } from "@/lib/actions/cash-transactions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type DeleteTransactionModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CashTransactionRow | null;
  onSuccess?: () => void;
};

export function DeleteTransactionModal({
  isOpen,
  onOpenChange,
  transaction,
  onSuccess,
}: DeleteTransactionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!transaction) return null;

  const category =
    transaction.category ||
    (transaction.type === "CASH_IN" ? "Cash In" : "Cash Out");

  const handleDelete = async () => {
    if (!transaction.id || isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await deleteCashTransaction(transaction.id);
      if (result.ok) {
        toast.success("Transaction deleted successfully");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("Failed to delete transaction. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isDeleting) {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Delete Transaction
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Compact Transaction Details Summary Card */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              Transaction Details
            </span>
            {transaction.recordId && (
              <span className="font-mono text-[11px] text-muted-foreground">
                ID: {transaction.recordId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px]">Date</span>
              <span className="font-medium text-foreground">
                {formatDate(transaction.createdAt)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px]">Type</span>
              <div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    transaction.type === "CASH_IN"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                  )}
                >
                  {transaction.type === "CASH_IN" ? "+ Cash In" : "- Cash Out"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px]">Category</span>
              <div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    transaction.type === "CASH_IN"
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
                  )}
                >
                  {category}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px]">Amount</span>
              <span
                className={cn(
                  "text-sm font-bold",
                  transaction.type === "CASH_IN"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {transaction.type === "CASH_IN" ? "+" : "-"}₹
                {Math.abs(Number(transaction.amount)).toFixed(2)}
              </span>
            </div>

            {transaction.sourceRecordLabel && (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-[11px]">Service ID</span>
                <span className="font-mono text-xs text-foreground">
                  {transaction.sourceRecordLabel}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px]">Added By</span>
              <span className="text-xs text-foreground truncate">
                {transaction.createdByName || transaction.customerName || "Admin"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
            <span className="text-muted-foreground text-[11px]">Description</span>
            <p className="text-xs text-foreground break-words line-clamp-3 bg-background/60 rounded p-1.5 border border-border/40">
              {transaction.description || "—"}
            </p>
          </div>
        </div>

        <div className="text-sm font-medium text-foreground py-1">
          Are you sure you want to delete this transaction?
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 sm:flex-initial gap-2"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
