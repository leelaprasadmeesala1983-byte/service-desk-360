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
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "maxLength">) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={PHONE_LENGTH}
      {...props}
      onChange={(event) => {
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
