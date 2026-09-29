import { z } from "zod";

import { emailField, identifierField, passwordField } from "./common";

const loginSchema = z.object({
  identifier: identifierField,
  password: z.string().min(1, "Password is required"),
});

/** Step 1: name the account by email, which must already exist. */
const forgotPasswordSchema = z.object({
  email: emailField,
});

/** Step 2: the verified email plus the new password. */
const resetPasswordSchema = z
  .object({
    email: emailField,
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export type {
  LoginValues,
  ForgotPasswordValues,
  ResetPasswordValues,
  ChangePasswordValues,
};
export {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
