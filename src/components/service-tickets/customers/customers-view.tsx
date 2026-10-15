"use client";

import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { CustomerDetailsDialog } from "@/components/service-tickets/customers/customer-details-dialog";
import { CustomerFormDialog } from "@/components/service-tickets/customers/customer-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerListResult, CustomerRow } from "@/db/queries/customers";
import { deleteCustomer, fetchCustomers } from "@/lib/actions/customers";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type CustomersViewProps = {
  initialData: CustomerListResult;
};

export function CustomersView({ initialData }: CustomersViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [customers, setCustomers] = useState<CustomerRow[]>(
    initialData.customers,
  );
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit, setLimit] = useState(initialData.limit);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | undefined>();
  const [viewCustomer, setViewCustomer] = useState<CustomerRow | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  // Sync initialData if updated from server
  useEffect(() => {
    setCustomers(initialData.customers);
    setTotal(initialData.total);
    setPage(initialData.page);
    setLimit(initialData.limit);
    setTotalPages(initialData.totalPages);
  }, [initialData]);

  // Debounce search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const pageCount = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), pageCount);

  // Reload data
  const loadData = (
    newPage = page,
    newLimit = limit,
    newSearch = debouncedSearch,
  ) => {
    startTransition(async () => {
      try {
        const result = await fetchCustomers({
          page: newPage,
          limit: newLimit,
          search: newSearch,
        });

        if (result.ok) {
          setCustomers(result.data.customers);
          setTotal(result.data.total);
          setPage(result.data.page);
          setLimit(result.data.limit);
          setTotalPages(result.data.totalPages);
          if (
            result.data.total > 0 &&
            result.data.customers.length === 0 &&
            newPage > result.data.totalPages
          ) {
            loadData(result.data.totalPages, newLimit, newSearch);
          }
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        toast.error("Failed to load customers.");
      }
    });
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
    loadData(1, limit, debouncedSearch);
  }, [debouncedSearch]);

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    loadData(1, limit, "");
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), pageCount);
    setPage(clamped);
    loadData(clamped, limit, debouncedSearch);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadData(1, newLimit, debouncedSearch);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteCustomer({ id: deleteTarget.id });

      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }

      toast.success("Customer deleted successfully");
      setDeleteTarget(undefined);
      setDeleteError(null);
      const remainingTotal = total - 1;
      const nextTotalPages = Math.max(1, Math.ceil(remainingTotal / limit));
      const targetPage = Math.min(page, nextTotalPages);
      setPage(targetPage);
      loadData(targetPage, limit, debouncedSearch);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete customer:", err);
      setDeleteError("Failed to delete customer. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Customers"
        action={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add Customer
          </Button>
        }
      />

      {/* Stats Banner */}
      <div className="border-border bg-card/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-primary" />
          <span className="text-muted-foreground font-medium">
            Total Customers:
          </span>
          <span className="text-foreground font-bold">{total}</span>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isPending && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        <div className="relative w-full sm:max-w-xs sm:ml-auto">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email or address"
            className="h-9 rounded-md pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No</TableHead>
                <TableHead className="w-48">Customer Name</TableHead>
                <TableHead className="w-36">Mobile Number</TableHead>
                <TableHead className="w-48">Email Address</TableHead>
                <TableHead className="min-w-[200px]">Address</TableHead>
                <TableHead className="w-32">Created Date</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-12 text-center"
                  >
                    {debouncedSearch
                      ? "No customers match your search query."
                      : "No customers found. Click 'Add Customer' to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c, index) => {
                  const sNo = (safePage - 1) * limit + index + 1;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell className="text-muted-foreground text-center text-xs">
                        {sNo}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {c.customerName}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground whitespace-nowrap text-xs">
                        {c.mobileNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div className="max-w-xs truncate" title={c.address}>
                          {c.address || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(c.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View Customer"
                            title="View Customer"
                            onClick={() => setViewCustomer(c)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit Customer"
                            title="Edit Customer"
                            onClick={() => setEditCustomer(c)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete Customer"
                            title="Delete Customer"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(c);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-xs">
          Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–
          {Math.min(safePage * limit, total)} of {total} customers
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Per page:
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="border-border rounded-md px-2 py-1"
            >
              {[10, 25, 50, 100].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="border-border rounded-md px-2 py-1 text-xs disabled:opacity-50"
              disabled={safePage <= 1 || isPending}
              onClick={() => handlePageChange(Math.max(1, safePage - 1))}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(3, pageCount) }, (_, i) => {
              let pageNum = i + 1;
              if (pageCount > 3 && safePage > 2) {
                pageNum = safePage - 1 + i;
                if (pageNum > pageCount) {
                  pageNum = pageCount - 2 + i;
                }
              }
              return pageNum;
            }).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={cn(
                  "border-border rounded-md px-2 py-1 text-xs",
                  pageNum === safePage
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground",
                )}
                disabled={isPending}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              className="border-border rounded-md px-2 py-1 text-xs disabled:opacity-50"
              disabled={safePage >= pageCount || isPending}
              onClick={() =>
                handlePageChange(Math.min(pageCount, safePage + 1))
              }
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => loadData(1, limit, debouncedSearch)}
      />

      {/* Edit Modal */}
      <CustomerFormDialog
        key={editCustomer?.id ?? "edit-modal"}
        open={Boolean(editCustomer)}
        onOpenChange={(open) => !open && setEditCustomer(undefined)}
        customer={editCustomer}
        onSuccess={() => loadData(page, limit, debouncedSearch)}
      />

      {/* View Modal */}
      <CustomerDetailsDialog
        open={Boolean(viewCustomer)}
        onOpenChange={(open) => !open && setViewCustomer(undefined)}
        customer={viewCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(undefined);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {deleteTarget?.customerName}
              </strong>{" "}
              ({deleteTarget?.mobileNumber})?
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border p-3 text-xs font-medium">
              {deleteError}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              This action cannot be undone. If this customer has existing
              service requests, installations, or projects, the deletion will be
              blocked to protect your records.
            </p>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setDeleteTarget(undefined);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
