import type * as React from "react";

import { Input } from "@/components/ui/input";

const PHONE_LENGTH = 10;

/**
 * Phone/mobile number input: strips everything except digits and caps the
 * value at 10 characters (typing and pasting). Works with react-hook-form's
 * `register()` spread since the sanitised value is written back to the DOM
 * node before the caller's `onChange` runs.
 */
function PhoneInput({
  onChange,
  readOnly,
  onKeyDown,
  onPaste,
  onDrop,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "maxLength">) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={PHONE_LENGTH}
      readOnly={readOnly}
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
      {...props}
      onChange={(event) => {
        if (readOnly) return;
        const digits = event.target.value
          .replace(/\D/g, "")
          .slice(0, PHONE_LENGTH);
        if (digits !== event.target.value) event.target.value = digits;
        onChange?.(event);
      }}
    />
  );
}

export { PhoneInput };
