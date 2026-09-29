"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addCashTransaction,
  getCashTransaction,
  updateCashTransaction,
} from "@/lib/actions/cash-transactions";
import { formatLocalDate } from "@/lib/format";

type CashTransactionFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  closingBalance?: string;
};

export function CashTransactionForm({
  isOpen,
  onOpenChange,
  editingId,
  onEditingChange,
  closingBalance,
}: CashTransactionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "CASH_IN",
    amount: "",
    description: "",
    date: formatLocalDate(new Date()),
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch transaction data when editingId changes
  useEffect(() => {
    if (editingId && isOpen) {
      setIsLoading(true);
      getCashTransaction(editingId)
        .then((tx) => {
          if (tx) {
            setFormData({
              type: tx.type,
              amount: tx.amount,
              description: tx.description,
              date: tx.date,
            });
          }
        })
        .catch((error) => {
          console.error("Failed to fetch transaction:", error);
          toast.error("Failed to load transaction data");
        })
        .finally(() => setIsLoading(false));
    } else if (!editingId && isOpen) {
      // Reset form when adding new transaction
      setFormData({
        type: "CASH_IN",
        amount: "",
        description: "",
        date: formatLocalDate(new Date()),
      });
    }
  }, [editingId, isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const input = {
      id: editingId || undefined,
      type: formData.type,
      amount: formData.amount,
      description: formData.description,
      date: formData.date,
    };

    startTransition(async () => {
      const action = editingId ? updateCashTransaction : addCashTransaction;
      const result = await action(input);

      if (result.ok) {
        toast.success(
          editingId
            ? "Transaction updated successfully"
            : "Transaction added successfully",
        );
        onOpenChange(false);
        onEditingChange(null);
        if (!editingId && searchParams.has("page")) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("page");
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "CASH_IN" })
                    }
                    className={`flex-1 rounded-full py-2.5 px-4 font-semibold transition-all ${
                      formData.type === "CASH_IN"
                        ? "bg-green-600 text-white"
                        : "border-2 border-green-600 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    + Cash In
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "CASH_OUT" })
                    }
                    className={`flex-1 rounded-full py-2.5 px-4 font-semibold transition-all ${
                      formData.type === "CASH_OUT"
                        ? "bg-red-600 text-white"
                        : "border-2 border-red-600 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    - Cash Out
                  </button>
                </div>
              </div>

              {/* Available Balance */}
              {closingBalance && (
                <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Available Balance Today:
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    ₹{Number(closingBalance).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
                {formData.type === "CASH_OUT" &&
                  closingBalance &&
                  !editingId &&
                  Number(formData.amount) > Number(closingBalance) && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Insufficient balance. Available cash is ₹
                      {Number(closingBalance).toFixed(2)}.
                    </p>
                  )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter transaction description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEditingChange(null);
                  }}
                  disabled={isPending || isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || isLoading}
                  className="flex-1"
                >
                  {isPending
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Transaction"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
