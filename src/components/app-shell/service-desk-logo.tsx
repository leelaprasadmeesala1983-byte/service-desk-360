import { Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type LogoVariant = "dark" | "light" | "admin" | "account";

interface ServiceDeskLogoProps {
  variant?: LogoVariant;
  subtitle?: string;
  className?: string;
  href?: string;
}

export function ServiceDeskLogo({
  variant = "admin",
  subtitle = "SERVICE PLATFORM",
  className,
  href = "/",
}: ServiceDeskLogoProps) {
  const isLight = variant === "light" || variant === "account";

  const content = (
    <div
      className={cn("flex min-w-0 items-center gap-2.5 sm:gap-3", className)}
    >
      <span className="bg-brand flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-xs lg:size-12">
        <Zap className="size-5 lg:size-6 text-white" />
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-extrabold",
            isLight
              ? "text-foreground text-base sm:text-lg lg:text-xl"
              : "text-shell-foreground text-sm sm:text-base lg:text-xl",
          )}
        >
          ServiceDesk 360
        </span>
        <span
          className={cn(
            "block truncate font-semibold tracking-wider uppercase",
            isLight
              ? "text-muted-foreground text-[9px] lg:text-[10px]"
              : "text-shell-muted-foreground text-[8px] lg:text-[10px]",
          )}
        >
          {subtitle}
        </span>
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex min-w-0 items-center">
        {content}
      </Link>
    );
  }

  return content;
}
