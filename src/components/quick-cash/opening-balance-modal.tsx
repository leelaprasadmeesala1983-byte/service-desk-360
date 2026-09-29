"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOpeningBalance } from "@/lib/actions/cash-transactions";

type OpeningBalanceModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: string;
  targetDate?: string;
};

export function OpeningBalanceModal({
  isOpen,
  onOpenChange,
  currentBalance,
  targetDate,
}: OpeningBalanceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(currentBalance);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount === "" || Number(amount) < 0) {
      setError("Please enter a valid non-negative amount");
      return;
    }

    startTransition(async () => {
      const result = await setOpeningBalance({
        amount,
        date: targetDate,
      });
      if (result.ok) {
        toast.success("Opening balance updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error || "Failed to set opening balance");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Opening Balance</DialogTitle>
          <DialogDescription>
            {targetDate
              ? `Set the opening balance for ${targetDate}.`
              : "Set the opening balance for today's active register."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opening-amount">Opening Balance (₹) *</Label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-muted-foreground">
                ₹
              </span>
              <Input
                id="opening-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-sm font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-md bg-blue-50/80 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
            💡 For normal daily flow, opening balance automatically rolls over
            from yesterday&apos;s closing balance.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 text-xs sm:text-sm"
            >
              {isPending ? "Setting..." : "Set Balance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
