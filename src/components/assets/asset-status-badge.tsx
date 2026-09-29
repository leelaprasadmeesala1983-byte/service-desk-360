import { ASSET_STATUS_TONE } from "@/lib/constants/assets";
import { cn } from "@/lib/utils";
import type { AssetStatus } from "@/types/assets";

type AssetStatusBadgeProps = {
  status: AssetStatus | string;
  className?: string;
};

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const tone = ASSET_STATUS_TONE[status] || ASSET_STATUS_TONE.Received;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors",
        tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", tone.dot)} />
      {status}
    </span>
  );
}
