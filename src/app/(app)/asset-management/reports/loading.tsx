import { Loader2 } from "lucide-react";

export default function ReportsLoading() {
  return (
    <div className="flex h-96 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading reports...</p>
      </div>
    </div>
  );
}
