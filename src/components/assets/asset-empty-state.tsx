import { Boxes, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type AssetEmptyStateProps = {
  isSearch?: boolean;
  onResetSearch?: () => void;
  emptyMessage?: string;
};

export function AssetEmptyState({
  isSearch = false,
  onResetSearch,
  emptyMessage,
}: AssetEmptyStateProps) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2.5">
          <SearchX className="size-5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          No records found
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No records match your search criteria.
        </p>
        {onResetSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetSearch}
            className="mt-3.5 h-8 text-xs cursor-pointer"
          >
            Clear Search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3 shadow-2xs">
        <Boxes className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        {emptyMessage || "No asset records yet"}
      </h3>
    </div>
  );
}
