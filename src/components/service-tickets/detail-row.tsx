import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailRowProps = {
  label: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

/** One label/value pair in a details dialog. */
function DetailRow({ label, children, className, wide }: DetailRowProps) {
  return (
    <div className={cn(wide && "sm:col-span-2", className)}>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="text-foreground mt-0.5 text-sm break-words">
        {children ?? "—"}
      </div>
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>;
}

export { DetailRow, DetailGrid };
