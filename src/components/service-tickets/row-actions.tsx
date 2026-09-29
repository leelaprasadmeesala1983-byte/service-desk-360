"use client";

import { Download, Eye, History, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/actions/result";

type RowActionsProps = {
  onView: () => void;
  onEdit?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
  /** Provided only when the viewer may delete this record (admins). */
  deletion?: {
    label: string;
    onConfirm: () => Promise<ActionResult>;
    onDeleted: () => void;
  };
};

function RowActions({
  onView,
  onEdit,
  onHistory,
  onExport,
  deletion,
}: RowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runDelete = () => {
    if (!deletion) return;
    startTransition(async () => {
      const result = await deletion.onConfirm();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${deletion.label} deleted`);
      setConfirmOpen(false);
      deletion.onDeleted();
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="View"
        onClick={onView}
      >
        <Eye />
      </Button>

      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Edit"
          title="Edit"
          onClick={onEdit}
        >
          <Pencil />
        </Button>
      )}

      {onHistory && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Work History"
          title="Work History"
          onClick={onHistory}
        >
          <History />
        </Button>
      )}

      {onExport && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Export PDF"
          title="Export PDF"
          onClick={onExport}
        >
          <Download />
        </Button>
      )}

      {deletion && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete {deletion.label}?</DialogTitle>
                <DialogDescription>
                  This permanently removes the record. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" disabled={isPending} />}
                >
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={runDelete}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export { RowActions };
