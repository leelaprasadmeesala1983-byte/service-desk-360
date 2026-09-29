"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex w-full flex-1 items-center justify-center p-4">
      <div className="border-border bg-card max-w-md rounded-2xl border p-6 text-center shadow-lg sm:p-8">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-14 items-center justify-center rounded-full">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-foreground mt-4 text-xl font-bold sm:text-2xl">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          An unexpected error occurred while loading this page. You can try
          again or return to the home screen.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              className: "flex items-center justify-center",
            })}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
