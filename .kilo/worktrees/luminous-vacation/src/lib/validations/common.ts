import { z } from "zod";

/** Indian 10-digit mobile number, matching the reference app's rule. */
const phoneField = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit phone number");

const emailField = z.string().trim().email("Enter a valid email");

const optionalEmailField = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value;
  },
  z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
);

/** Mirrors better-auth's minPasswordLength. */
const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters");

function requiredText(label: string, min = 2) {
  return z.string().trim().min(min, `${label} is required`);
}

/** Accepts either identifier so a user can log in with whichever they know. */
const identifierField = z
  .string()
  .trim()
  .min(1, "Email or phone number is required")
  .refine(
    (value) =>
      z.string().email().safeParse(value).success || /^[6-9]\d{9}$/.test(value),
    "Enter a valid email or 10 digit phone number",
  );

/** Numeric field for amounts, prices, etc. Accepts string or number. */
const numericField = z
  .union([z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "number") return String(value);
    return value.trim();
  })
  .refine(
    (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
    "Enter a valid amount",
  )
  .transform((value) => (value === "" ? null : value));

export {
  phoneField,
  emailField,
  optionalEmailField,
  passwordField,
  requiredText,
  identifierField,
  numericField,
};
