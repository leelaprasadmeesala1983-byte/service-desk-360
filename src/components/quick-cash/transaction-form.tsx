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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addCashTransaction,
  getCashTransaction,
  updateCashTransaction,
} from "@/lib/actions/cash-transactions";
import { formatLocalDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CASH_IN_CATEGORIES = [
  { value: "SERVICE_AMOUNT", label: "Service Amount" },
  { value: "OTHERS", label: "Others" },
] as const;

const CASH_OUT_CATEGORIES = [
  { value: "COURIER_IN", label: "Courier In" },
  { value: "COURIER_OUT", label: "Courier Out" },
  { value: "PETROL_ALLOWANCE", label: "Petrol Allowance" },
  { value: "FOOD_ALLOWANCE", label: "Food Allowance" },
  { value: "OTHERS", label: "Others" },
] as const;

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
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [otherCategoryError, setOtherCategoryError] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState({
    type: "CASH_IN",
    category: "",
    otherCategory: "",
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
              category: tx.category || "",
              otherCategory: tx.otherCategory || "",
              amount: tx.amount,
              description: tx.description,
              date: tx.date,
            });
            setCategoryError(null);
            setOtherCategoryError(null);
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
        category: "",
        otherCategory: "",
        amount: "",
        description: "",
        date: formatLocalDate(new Date()),
      });
      setCategoryError(null);
      setOtherCategoryError(null);
    }
  }, [editingId, isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let hasError = false;

    if (!formData.category) {
      setCategoryError("Please select a transaction category.");
      hasError = true;
    }

    if (formData.category === "OTHERS" && !formData.otherCategory?.trim()) {
      setOtherCategoryError("Please enter a category name.");
      hasError = true;
    }

    if (hasError) {
      if (!formData.category) {
        toast.error("Please select a transaction category.");
      } else {
        toast.error("Please enter a category name.");
      }
      return;
    }

    const isOthers = formData.category === "OTHERS";
    const input: {
      id?: string;
      type: string;
      transactionType: string;
      category: string;
      transactionCategory: string;
      otherCategory?: string;
      amount: string;
      description: string;
      date: string;
    } = {
      id: editingId || undefined,
      type: formData.type,
      transactionType: formData.type,
      category: formData.category,
      transactionCategory: formData.category,
      ...(isOthers ? { otherCategory: formData.otherCategory.trim() } : {}),
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
        if (result.fieldErrors?.category?.[0]) {
          setCategoryError(result.fieldErrors.category[0]);
        }
        if (result.fieldErrors?.otherCategory?.[0]) {
          setOtherCategoryError(result.fieldErrors.otherCategory[0]);
        }
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
                    onClick={() => {
                      if (formData.type !== "CASH_IN") {
                        setFormData((prev) => ({
                          ...prev,
                          type: "CASH_IN",
                          category: "",
                          otherCategory: "",
                        }));
                        setCategoryError(null);
                        setOtherCategoryError(null);
                      }
                    }}
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
                    onClick={() => {
                      if (formData.type !== "CASH_OUT") {
                        setFormData((prev) => ({
                          ...prev,
                          type: "CASH_OUT",
                          category: "",
                          otherCategory: "",
                        }));
                        setCategoryError(null);
                        setOtherCategoryError(null);
                      }
                    }}
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

              {/* Transaction Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Transaction Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      category: val || "",
                      otherCategory: val === "OTHERS" ? prev.otherCategory : "",
                    }));
                    if (val) setCategoryError(null);
                    if (val !== "OTHERS") setOtherCategoryError(null);
                  }}
                >
                  <SelectTrigger
                    id="category"
                    className={cn(
                      "w-full",
                      categoryError &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select Transaction Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.type === "CASH_IN"
                      ? CASH_IN_CATEGORIES
                      : CASH_OUT_CATEGORIES
                    ).map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoryError && (
                  <p className="text-xs text-destructive font-medium">
                    {categoryError}
                  </p>
                )}
              </div>

              {/* Other Category (Only shown when category === "OTHERS") */}
              {formData.category === "OTHERS" && (
                <div className="space-y-2">
                  <Label htmlFor="otherCategory">Other Category *</Label>
                  <Input
                    id="otherCategory"
                    placeholder="Enter category name"
                    value={formData.otherCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, otherCategory: val }));
                      if (val.trim()) setOtherCategoryError(null);
                    }}
                    className={cn(
                      otherCategoryError &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                    required
                  />
                  {otherCategoryError && (
                    <p className="text-xs text-destructive font-medium">
                      {otherCategoryError}
                    </p>
                  )}
                </div>
              )}

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
