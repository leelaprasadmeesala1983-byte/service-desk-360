import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  readOnly,
  onKeyDown,
  onPaste,
  onDrop,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      readOnly={readOnly}
      aria-readonly={readOnly ? "true" : props["aria-readonly"]}
      onKeyDown={(event) => {
        if (readOnly) {
          const isCopyOrSelect =
            (event.ctrlKey || event.metaKey) &&
            (event.key === "c" || event.key === "a" || event.key === "Insert");
          const isNav = [
            "Tab",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key);
          if (!isCopyOrSelect && !isNav) {
            event.preventDefault();
          }
        }
        onKeyDown?.(event);
      }}
      onPaste={(event) => {
        if (readOnly) {
          event.preventDefault();
        }
        onPaste?.(event);
      }}
      onDrop={(event) => {
        if (readOnly) {
          event.preventDefault();
        }
        onDrop?.(event);
      }}
      className={cn(
        "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-none border bg-transparent px-2.5 py-1 text-xs transition-colors file:h-6 file:text-xs file:font-medium focus-visible:ring-1 aria-invalid:ring-1 md:text-xs file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        readOnly &&
          "cursor-not-allowed bg-muted/40 caret-transparent focus-visible:ring-0 focus-visible:border-input select-text",
        className,
      )}
      {...props}
      onChange={(event) => {
        if (readOnly) {
          event.preventDefault();
          return;
        }
        onChange?.(event);
      }}
    />
  );
}

export { Input };
