"use client";

import { useState } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CUSTOM_DEPARTMENT_VALUE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Field } from "./form";

type DepartmentFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  departments: string[];
  required?: boolean;
};

/**
 * Department dropdown with a trailing "Custom…" entry. Picking it swaps in a
 * free-text box; the typed name is saved on submit and the action promotes it
 * to a standing option for everyone (spec §4.5.3).
 */
function DepartmentField<T extends FieldValues>({
  control,
  name,
  departments,
  required,
}: DepartmentFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const value = (field.value as string | null) ?? "";
  const knownValue = value && departments.includes(value) ? value : "";

  const [custom, setCustom] = useState(
    () => Boolean(value) && !departments.includes(value),
  );

  const items = {
    ...Object.fromEntries(departments.map((d) => [d, d])),
    [CUSTOM_DEPARTMENT_VALUE]: "Custom…",
  };

  return (
    <Field
      label="Department"
      required={required}
      error={fieldState.error?.message}
    >
      <Select
        items={items}
        value={custom ? CUSTOM_DEPARTMENT_VALUE : knownValue || null}
        onValueChange={(next) => {
          if (next === CUSTOM_DEPARTMENT_VALUE) {
            setCustom(true);
            field.onChange("");
            return;
          }
          setCustom(false);
          field.onChange(next);
        }}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full rounded-md border-border bg-transparent",
            fieldState.error && "border-destructive",
          )}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder="Select a department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_DEPARTMENT_VALUE}>Custom…</SelectItem>
        </SelectContent>
      </Select>

      {custom && (
        <Input
          autoFocus
          placeholder="Type a new department name"
          className="mt-2 h-9 rounded-md"
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
        />
      )}
    </Field>
  );
}

export { DepartmentField };
